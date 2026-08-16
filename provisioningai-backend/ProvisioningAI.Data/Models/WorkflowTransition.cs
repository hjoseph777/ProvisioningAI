namespace ProvisioningAI.Data.Models;

/// <summary>
/// A transition between two states in a workflow.
///
/// FLAGGED, NOT DECIDED: unlike ObjectType/Property/Workflow/WorkflowState,
/// there's no confirmed evidence M-Files gives transitions their own GUID —
/// the roadmap's own field list for this entity never mentions one either,
/// only FromState/ToState/guards/actions. Rather than fabricate a synthetic
/// Guid just to satisfy a blanket rule, this entity is identified by
/// (WorkflowGuid, FromStateGuid, ToStateGuid) instead. Confirm against a real
/// scan once Module 2 reads transitions from COM; revisit this shape then.
/// </summary>
public sealed class WorkflowTransition
{
    public int Id { get; init; }
    public required string VaultGuid { get; init; }
    public required string WorkflowGuid { get; init; }
    public required int MFilesId { get; init; }
    public required string FromStateGuid { get; init; }
    public required string ToStateGuid { get; init; }

    /// <summary>Structured guard conditions, JSON. Null if the transition is unconditional.</summary>
    public string? GuardConditions { get; init; }

    /// <summary>
    /// Structured actions, JSON. Confirmed live via reflection (2026-07-27) that
    /// M-Files has NO actions concept at the transition level — actions
    /// (ActionDefinitions, 9 enabled-flags + typed definitions) belong to the
    /// destination state's IStateAdmin, not the transition. This column is
    /// therefore always null in practice; kept rather than removed since the
    /// schema-hardening constraint for this stage is "confirm, don't recreate,"
    /// and a future stage may still want a transition-scoped audit note here.
    /// </summary>
    public string? Actions { get; init; }

    /// <summary>
    /// Name-based heuristic (claude.md §4.4): true if Name contains SQL_, UPD_,
    /// CP1, ACOMBA, PROCORE, APPRENTISSAGE, LEARNING, or WAIT_SYNCH_CSV
    /// (case-insensitive). Explicitly weaker than an SDK-verified check.
    /// </summary>
    public required bool IsIntegrationTouching { get; init; }

    public int? LastSeenScanId { get; set; }

    public static WorkflowTransition Create(
        string vaultGuid, string vaultName, string workflowGuid, int mfilesId, string fromStateGuid, string toStateGuid,
        string? guardConditions, string? actions, bool isIntegrationTouching = false)
    {
        GuidGuard.Require(vaultGuid, $"{nameof(WorkflowTransition)}.{nameof(VaultGuid)}", vaultName, "-", $"{fromStateGuid}->{toStateGuid}");
        GuidGuard.Require(workflowGuid, $"{nameof(WorkflowTransition)}.{nameof(WorkflowGuid)}", vaultName, "-", $"{fromStateGuid}->{toStateGuid}");
        GuidGuard.Require(fromStateGuid, $"{nameof(WorkflowTransition)}.{nameof(FromStateGuid)}", vaultName, "-", $"{fromStateGuid}->{toStateGuid}");
        GuidGuard.Require(toStateGuid, $"{nameof(WorkflowTransition)}.{nameof(ToStateGuid)}", vaultName, "-", $"{fromStateGuid}->{toStateGuid}");
        return new WorkflowTransition
        {
            VaultGuid = vaultGuid,
            WorkflowGuid = workflowGuid,
            MFilesId = mfilesId,
            FromStateGuid = fromStateGuid,
            ToStateGuid = toStateGuid,
            GuardConditions = guardConditions,
            Actions = actions,
            IsIntegrationTouching = isIntegrationTouching,
        };
    }
}
