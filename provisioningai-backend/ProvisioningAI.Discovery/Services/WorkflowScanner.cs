using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using ProvisioningAI.Data;
using ProvisioningAI.Data.Models;
using ProvisioningAI.Data.Repositories;
using ProvisioningAI.MFilesConnectors;

namespace ProvisioningAI.Discovery.Services;

/// <summary>
/// Stage 5: workflows, states, transitions — the vault's actual AP business
/// logic (claude.md §4.4). Two complementary COM sources, confirmed live
/// (2026-07-27) rather than assumed:
///   - GUIDs: the Workflows (id=7) and States (id=8) built-in value lists
///     (MFilesBuiltInValueListIds), read via the same GetValueListItemsAsync()
///     Stage 2 already uses. Confirmed via reflection that
///     GetWorkflowsAsValueListItems() returns the exact same ValueListItems
///     type — this is a value-list VIEW of the same real workflows, not a
///     coincidence, so the Stage 2 "Workflow" entry (id=7) and this stage's
///     data are the same underlying objects, not a duplicate to reconcile.
///   - Structure: WorkflowOperations.GetWorkflowsAdmin(), which nests states
///     and transitions per workflow directly (IWorkflowAdmin.States /
///     .StateTransitions) — no separate per-workflow calls needed.
///
/// GuardConditions is stored VERBATIM, not interpreted, on BOTH transitions and
/// states: TriggerCriteria / PropertyConditionsDefinition are exported via
/// M-Files' own GetAsExportedSearchString() (its own textual serialization,
/// not ours), *VBScript fields are the raw script text. WorkflowTransition.
/// Actions is always null — confirmed live there is no Actions concept at the
/// transition level at all; the real action data (9 enabled-flags plus a
/// typed definition per action kind — send notification, create assignment,
/// set properties, set permissions, convert to PDF, run VBScript) lives on
/// the destination STATE's IStateAdmin instead, and WorkflowState.Actions
/// captures it verbatim as JSON (ACLs and property values are captured via
/// their own COM-native serializations — AccessControlList.GetAsBytes()
/// Base64-encoded, TypedValue.ToJSON() — not decoded into names here; that
/// decoding is Stage 6 territory).
///
/// IsInitial/IsFinal are a structural heuristic, not SDK-confirmed (no such
/// concept exists anywhere in the real COM shape — confirmed via exhaustive
/// reflection): a state with no incoming transition is treated as initial, one
/// with no outgoing transition as final, per this same scan's transition
/// graph. IsIntegrationTouching is a name-based heuristic (claude.md §4.4),
/// explicitly weaker than the SDK-verified checks used elsewhere in this
/// project (e.g. Stage 4's RealObjectType reconciliation).
/// </summary>
public sealed class WorkflowScanner
{
    private static readonly string[] IntegrationTouchingSubstrings =
    [
        "SQL_", "UPD_", "CP1", "ACOMBA", "PROCORE", "APPRENTISSAGE", "LEARNING", "WAIT_SYNCH_CSV",
    ];

    private readonly IMFilesConnector _connector;
    private readonly ProvisioningAiDbContext _context;
    private readonly IRepository<Workflow> _workflowRepository;
    private readonly IRepository<WorkflowState> _workflowStateRepository;
    private readonly IRepository<WorkflowTransition> _workflowTransitionRepository;
    private readonly ILogger<WorkflowScanner> _logger;

    public WorkflowScanner(
        IMFilesConnector connector,
        ProvisioningAiDbContext context,
        IRepository<Workflow> workflowRepository,
        IRepository<WorkflowState> workflowStateRepository,
        IRepository<WorkflowTransition> workflowTransitionRepository,
        ILogger<WorkflowScanner> logger)
    {
        _connector = connector;
        _context = context;
        _workflowRepository = workflowRepository;
        _workflowStateRepository = workflowStateRepository;
        _workflowTransitionRepository = workflowTransitionRepository;
        _logger = logger;
    }

    private static bool IsIntegrationTouchingName(string? name)
    {
        if (string.IsNullOrEmpty(name)) return false;
        return IntegrationTouchingSubstrings.Any(s => name.Contains(s, StringComparison.OrdinalIgnoreCase));
    }

    /// <param name="vaultGuid">The vault GUID as returned by GetOnlineVaults() — the identity anchor.</param>
    /// <param name="vaultName">The vault's current display name, recorded verbatim into any GUID-guard failure message.</param>
    /// <param name="scanId">The DiscoveryScan row this stage's writes are stamped with (LastSeenScanId).</param>
    public async Task<WorkflowScanResult> ScanAsync(
        string vaultGuid,
        string vaultName,
        int scanId,
        CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(vaultGuid))
            throw new ArgumentException("vaultGuid is required — it is the identity anchor.", nameof(vaultGuid));

        using var vault = await _connector.LogInToVaultAsync(vaultGuid, ct);

        var workflowGuidItems = await vault.GetValueListItemsAsync(MFilesBuiltInValueListIds.Workflows, ct);
        var stateGuidItems = await vault.GetValueListItemsAsync(MFilesBuiltInValueListIds.States, ct);
        var workflowGuidByMFilesId = workflowGuidItems.ToDictionary(i => i.MFilesId, i => i.Guid);
        var stateGuidByMFilesId = stateGuidItems.ToDictionary(i => i.MFilesId, i => i.Guid);

        var workflowsAdmin = await vault.GetWorkflowsAdminAsync(ct);

        var workflowRows = new List<Workflow>();
        var stateRows = new List<WorkflowState>();
        var transitionRows = new List<WorkflowTransition>();

        foreach (var wf in workflowsAdmin)
        {
            if (!workflowGuidByMFilesId.TryGetValue(wf.MFilesId, out var workflowGuid))
                throw new InvalidOperationException(
                    $"Workflow \"{wf.Name}\" (MFilesId {wf.MFilesId}) in vault \"{vaultName}\" has no matching entry " +
                    "in the Workflows built-in value list — cannot resolve its GUID. Refusing to write an unresolved Workflow.Guid.");

            workflowRows.Add(Workflow.Create(vaultGuid, vaultName, workflowGuid, wf.MFilesId, wf.Name, wf.Description));

            // FromState/ToState MFilesId=0 are M-Files' own entry/exit markers, not real
            // states — confirmed live against Conformity (2026-07-27): transition
            // MFilesId=177 has FromState=0, ToState=115 ("RTE-NewDocument_+_CLEAN_PO"),
            // and 115 has no other incoming edge. This is an AUTHORITATIVE signal for the
            // workflow's real starting state, stronger than the no-incoming-edge
            // heuristic (which this exact case would get WRONG, since 115 does have one
            // incoming edge — from the entry marker). No ToState=0 was observed in this
            // vault, but the same convention is assumed symmetric for "exit" until proven
            // otherwise. Neither kind is a real state-to-state edge, so neither gets a
            // WorkflowTransition row — they inform IsInitial/IsFinal only.
            var realTransitions = wf.Transitions.Where(t => t.FromStateMFilesId != 0 && t.ToStateMFilesId != 0).ToList();
            var entryTransitions = wf.Transitions.Where(t => t.FromStateMFilesId == 0).ToList();
            var exitTransitions = wf.Transitions.Where(t => t.ToStateMFilesId == 0 && t.FromStateMFilesId != 0).ToList();

            var authoritativeInitialIds = entryTransitions.Select(t => t.ToStateMFilesId).ToHashSet();
            var authoritativeFinalIds = exitTransitions.Select(t => t.FromStateMFilesId).ToHashSet();

            // Fallback heuristic (flagged, not SDK-confirmed) for workflows with no
            // entry/exit marker at all — see class doc comment.
            var toStateIds = realTransitions.Select(t => t.ToStateMFilesId).ToHashSet();
            var fromStateIds = realTransitions.Select(t => t.FromStateMFilesId).ToHashSet();

            var stateGuidByLocalId = new Dictionary<int, string>();
            foreach (var st in wf.States)
            {
                if (!stateGuidByMFilesId.TryGetValue(st.MFilesId, out var stateGuid))
                    throw new InvalidOperationException(
                        $"State \"{st.Name}\" (MFilesId {st.MFilesId}) in workflow \"{wf.Name}\" in vault \"{vaultName}\" " +
                        "has no matching entry in the States built-in value list — cannot resolve its GUID.");

                stateGuidByLocalId[st.MFilesId] = stateGuid;

                var isInitial = authoritativeInitialIds.Count > 0
                    ? authoritativeInitialIds.Contains(st.MFilesId)
                    : !toStateIds.Contains(st.MFilesId);
                var isFinal = authoritativeFinalIds.Count > 0
                    ? authoritativeFinalIds.Contains(st.MFilesId)
                    : !fromStateIds.Contains(st.MFilesId);
                var isIntegrationTouching = IsIntegrationTouchingName(st.Name);

                var guard = st.Guard ?? new WorkflowStateGuardInfo();
                var guardConditions = JsonSerializer.Serialize(new
                {
                    preconditionsPropertyEnabled = guard.PreconditionsPropertyEnabled,
                    preconditionsPropertyExported = guard.PreconditionsPropertyExported,
                    preconditionsVBScriptEnabled = guard.PreconditionsVBScriptEnabled,
                    preconditionsVBScript = guard.PreconditionsVBScript,
                    postconditionsPropertyEnabled = guard.PostconditionsPropertyEnabled,
                    postconditionsPropertyExported = guard.PostconditionsPropertyExported,
                    postconditionsVBScriptEnabled = guard.PostconditionsVBScriptEnabled,
                    postconditionsVBScript = guard.PostconditionsVBScript,
                });

                var actions = st.Actions ?? new WorkflowStateActionsInfo();
                var actionsJson = JsonSerializer.Serialize(new
                {
                    actionSetPermissions = actions.ActionSetPermissions,
                    actionDelete = actions.ActionDelete,
                    actionMarkForArchiving = actions.ActionMarkForArchiving,
                    actionAssignToUser = actions.ActionAssignToUser,
                    actionSendNotification = actions.ActionSendNotification,
                    actionSetProperties = actions.ActionSetProperties,
                    actionRunVBScript = actions.ActionRunVBScript,
                    actionConvertToPDF = actions.ActionConvertToPDF,
                    actionCreateSeparateAssignment = actions.ActionCreateSeparateAssignment,
                    runVBScriptText = actions.RunVBScriptText,
                    sendNotification = actions.SendNotification,
                    assignToUser = actions.AssignToUser,
                    createSeparateAssignment = actions.CreateSeparateAssignment,
                    setProperties = actions.SetProperties,
                    setPermissionsAclBase64 = actions.SetPermissionsAclBase64,
                    setPermissionsDiscardsAutomatic = actions.SetPermissionsDiscardsAutomatic,
                    convertToPdf = actions.ConvertToPdf,
                });

                stateRows.Add(WorkflowState.Create(
                    vaultGuid, vaultName, stateGuid, st.MFilesId, workflowGuid, st.Name, isInitial, isFinal, isIntegrationTouching,
                    guardConditions, actionsJson));
            }

            foreach (var tr in realTransitions)
            {
                if (!stateGuidByLocalId.TryGetValue(tr.FromStateMFilesId, out var fromStateGuid))
                    throw new InvalidOperationException(
                        $"Transition \"{tr.Name}\" (MFilesId {tr.MFilesId}) in workflow \"{wf.Name}\" in vault \"{vaultName}\" " +
                        $"references FromState MFilesId {tr.FromStateMFilesId}, not found among this workflow's states.");
                if (!stateGuidByLocalId.TryGetValue(tr.ToStateMFilesId, out var toStateGuid))
                    throw new InvalidOperationException(
                        $"Transition \"{tr.Name}\" (MFilesId {tr.MFilesId}) in workflow \"{wf.Name}\" in vault \"{vaultName}\" " +
                        $"references ToState MFilesId {tr.ToStateMFilesId}, not found among this workflow's states.");

                var guardConditions = JsonSerializer.Serialize(new
                {
                    triggerMode = tr.TriggerMode,
                    triggerInDays = tr.TriggerInDays,
                    triggerAllowedByVBScript = tr.TriggerAllowedByVBScript,
                    triggerCriteria = tr.TriggerCriteriaExported,
                });

                var isIntegrationTouching = IsIntegrationTouchingName(tr.Name);

                transitionRows.Add(WorkflowTransition.Create(
                    vaultGuid, vaultName, workflowGuid, tr.MFilesId, fromStateGuid, toStateGuid,
                    guardConditions, actions: null, isIntegrationTouching));
            }
        }

        await using var transaction = await _context.Database.BeginTransactionAsync(ct);
        await _workflowRepository.UpsertManyNoTransactionAsync(workflowRows, scanId);
        await _workflowStateRepository.UpsertManyNoTransactionAsync(stateRows, scanId);
        await _workflowTransitionRepository.UpsertManyNoTransactionAsync(transitionRows, scanId);
        await transaction.CommitAsync(ct);

        _logger.LogInformation(
            "Stage 5 — workflows/states/transitions: {WorkflowCount} workflows, {StateCount} states, {TransitionCount} transitions scanned for {VaultName} ({VaultGuid})",
            workflowRows.Count, stateRows.Count, transitionRows.Count, vaultName, vaultGuid);

        return new WorkflowScanResult(
            vaultGuid,
            workflowRows.Count,
            stateRows.Count,
            transitionRows.Count,
            stateRows.Count(s => s.IsIntegrationTouching),
            transitionRows.Count(t => t.IsIntegrationTouching));
    }
}
