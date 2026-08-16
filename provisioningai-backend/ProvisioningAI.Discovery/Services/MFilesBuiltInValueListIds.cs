namespace ProvisioningAI.Discovery.Services;

/// <summary>
/// M-Files' own MFBuiltInValueList enum values (MFilesAPI.MFBuiltInValueList),
/// confirmed via .NET reflection against the real Interop.MFilesApi.dll
/// (26.6.16115.9) on 2026-07-26 — not guessed, not inferred from ID ranges or
/// names observed on one vault. These are fixed M-Files SDK constants, identical
/// across every M-Files installation, not customer-vault data — referencing
/// them isn't the "hardcoded numeric ID" risk claude.md §4.1 warns about (that
/// warning targets IDs that shift between vault clones; these never do).
///
/// Each of these IS a value list in the COM sense (ValueListOperations.GetValueLists()
/// returns them with RealObjectType=false, same as any customer-created value
/// list), but each is vault STRUCTURE that claude.md §4.4's dependency order
/// assigns to its own later stage — not a customer-editable value list:
///   Classes/ClassGroups          -> object types & classes stage
///   Workflows/States/StateTransitions -> workflows/states/transitions stage
///   Users/UserGroups              -> users/groups/ACLs stage
///   VersionLabels/TraditionalFolders/ExternalLocations/Sources -> other built-in
///     vault structure, not scanned by any stage yet.
/// Stage 2 (value lists) excludes all of them so it only records genuine
/// customer-created value lists, avoiding overlap with those later stages.
/// </summary>
internal static class MFilesBuiltInValueListIds
{
    /// <summary>
    /// Confirmed live (2026-07-27): IVaultWorkflowOperations.GetWorkflowsAsValueListItems()
    /// returns the exact same ValueListItems COM type Stage 2 already reads — the
    /// "Workflow" value-list entry Stage 2 excludes (id=7) IS a value-list view of
    /// these same real workflows, not an unrelated thing that happens to share a
    /// name. Used by WorkflowScanner to resolve a workflow's GUID (ItemGUID),
    /// since IWorkflow itself exposes no .GUID property.
    /// </summary>
    public const int Workflows = 7;

    /// <summary>
    /// Same reconciliation as Workflows, one level down: IState exposes no .GUID
    /// either, so WorkflowScanner resolves each state's GUID from this built-in
    /// value list (ItemGUID), matched by numeric ID against IStateAdmin.ID.
    /// </summary>
    public const int States = 8;

    /// <summary>
    /// Same reconciliation, Stage 6: IUserAccount exposes no .GUID either (unlike
    /// NamedACL, which has one directly) — UsersGroupsAclsScanner resolves each
    /// user's GUID from this built-in value list, confirmed live (2026-07-27) to
    /// include negative-ID pseudo-users ("(current user)", "(external source)",
    /// etc.) alongside real named accounts.
    /// </summary>
    public const int Users = 6;

    /// <summary>Same as Users, for IUserGroup (also no .GUID property).</summary>
    public const int UserGroups = 16;

    public static readonly HashSet<int> All =
    [
        1,  // MFBuiltInValueListClasses
        2,  // MFBuiltInValueListClassGroups
        3,  // MFBuiltInValueListVersionLabels
        4,  // MFBuiltInValueListTraditionalFolders
        5,  // MFBuiltInValueListExternalLocations
        Users,
        Workflows,
        States,
        UserGroups,
        17, // MFBuiltInValueListStateTransitions
        18, // MFBuiltInValueListSources
    ];
}
