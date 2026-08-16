using Microsoft.EntityFrameworkCore;

namespace ProvisioningAI.Data.Models;

/// <summary>A state within a workflow. WorkflowGuid is the parent's GUID, not its numeric ID — resolves across clones the same way the workflow itself does.</summary>
[Index(nameof(VaultGuid), nameof(Guid), IsUnique = true)]
public sealed class WorkflowState
{
    public int Id { get; init; }
    public required string VaultGuid { get; init; }
    public required string Guid { get; init; }

    /// <summary>Diagnostics only — never used for lookup (claude.md §4.1).</summary>
    public int MFilesId { get; init; }

    public required string WorkflowGuid { get; init; }
    public required string Name { get; init; }

    /// <summary>
    /// No Initial/Final property exists anywhere on the real COM state shape
    /// (confirmed via exhaustive reflection against Interop.MFilesApi.dll,
    /// 26.6.16115.9, 2026-07-27 — MFStateFlags only has None/TechnicalState).
    /// IsInitial has an AUTHORITATIVE signal instead, found live against
    /// Conformity the same day: a transition with FromState MFilesId=0 is
    /// M-Files' own "workflow entry" marker, and its ToState is the real
    /// starting state — stronger than guessing from the graph (a
    /// no-incoming-edge heuristic would have gotten Conformity's real entry
    /// state wrong, since it DOES have one incoming edge: the entry marker
    /// itself). IsFinal has no equivalent confirmed marker (no ToState=0 was
    /// observed in Conformity) — derived via the no-outgoing-edge heuristic,
    /// falling back to the same heuristic for IsInitial too on any workflow
    /// that turns out to have no entry marker at all. See WorkflowScanner.
    /// </summary>
    public required bool IsInitial { get; init; }
    public required bool IsFinal { get; init; }

    /// <summary>
    /// Name-based heuristic (claude.md §4.4): true if Name contains SQL_, UPD_,
    /// CP1, ACOMBA, PROCORE, APPRENTISSAGE, LEARNING, or WAIT_SYNCH_CSV
    /// (case-insensitive). Explicitly weaker than an SDK-verified check — flags
    /// a state as integration-touching (triggers reads/writes against the
    /// shared SQL tier), not a guarantee.
    /// </summary>
    public required bool IsIntegrationTouching { get; init; }

    /// <summary>
    /// Structured guard conditions (Preconditions/Postconditions), JSON, verbatim —
    /// same discipline as WorkflowTransition.GuardConditions. Confirmed live
    /// (2026-07-27) via IStateAdmin.Preconditions/Postconditions (IStateConditions).
    /// </summary>
    public string? GuardConditions { get; init; }

    /// <summary>
    /// Structured actions, JSON, verbatim. This is the real payload Stage 5 exists
    /// to capture: what a state's name (e.g. UPD_To_CP1) actually DOES, not just
    /// that it's integration-touching by name. Confirmed live that M-Files has NO
    /// actions concept at the transition level (WorkflowTransition.Actions is
    /// always null) — actions live here, on the destination state's IStateAdmin.
    /// </summary>
    public string? Actions { get; init; }

    public int? LastSeenScanId { get; set; }

    public static WorkflowState Create(
        string vaultGuid, string vaultName, string guid, int mfilesId, string workflowGuid, string name,
        bool isInitial, bool isFinal, bool isIntegrationTouching = false,
        string? guardConditions = null, string? actions = null)
    {
        GuidGuard.Require(vaultGuid, $"{nameof(WorkflowState)}.{nameof(VaultGuid)}", vaultName, mfilesId.ToString(), name);
        GuidGuard.Require(guid, nameof(WorkflowState), vaultName, mfilesId.ToString(), name);
        GuidGuard.Require(workflowGuid, $"{nameof(WorkflowState)}.{nameof(WorkflowGuid)}", vaultName, mfilesId.ToString(), name);
        return new WorkflowState
        {
            VaultGuid = vaultGuid,
            Guid = guid,
            MFilesId = mfilesId,
            WorkflowGuid = workflowGuid,
            Name = name,
            IsInitial = isInitial,
            IsFinal = isFinal,
            IsIntegrationTouching = isIntegrationTouching,
            GuardConditions = guardConditions,
            Actions = actions,
        };
    }
}
