namespace ProvisioningAI.MFilesConnectors;

/// <summary>
/// A vault available on an M-Files server. Guid is identity — it is stable
/// across environments and is what every other operation must key off.
/// Name is a display label only; it changes between a template vault and its
/// clones, so it must never be used to select or identify a vault.
/// </summary>
public sealed record VaultInfo(string Guid, string Name);

/// <summary>
/// A logged-in session against one specific vault. Deterministically released
/// (log out, then release the COM handle) via Dispose — same discipline as the
/// server-level connection. VaultGuid is the value the caller logged in with,
/// not read back from the session object: the real Vault.GUID property comes
/// back empty on a live server, confirmed 2026-07-26 against Conformity.
/// </summary>
/// <summary>
/// One entry from ValueListOperations.GetValueLists() — confirmed live (2026-07-26)
/// that this COM call returns BOTH real object types (RealObjectType=true, e.g.
/// Document, Vendor) and true value lists (RealObjectType=false, e.g. Class,
/// Workflow, State) in the same collection; M-Files models value lists as a
/// special case of object type under the hood. Name comes from NameSingular —
/// there is no plain .Name property on this COM shape. NamePlural is optional
/// (defaulted) so existing positional call sites that predate Stage 4 keep
/// compiling unchanged; Stage 4 uses it as ObjectType's display name.
/// RealObjectType==true was empirically reconciled against the dedicated
/// ObjectTypeOperations.GetObjectTypes() call (2026-07-26, exact match on
/// Conformity) — it is a complete signal, not just "not a known value list."
/// </summary>
public sealed record ValueListInfo(int MFilesId, string Guid, string Name, bool RealObjectType, string? NamePlural = null);

/// <summary>
/// One entry from ValueListItemOperations.GetValueListItems() for a given value
/// list. Guid comes from .ItemGUID — there is no plain .GUID property on this
/// COM shape (confirmed live 2026-07-26). IDs can be negative for built-in items.
/// </summary>
public sealed record ValueListItemInfo(int MFilesId, string Guid, string Name, bool Deleted);

/// <summary>
/// One entry from PropertyDefOperations.GetPropertyDefs(). Confirmed live
/// (2026-07-26) that this COM shape has NO "Required"/"IsRequired" property —
/// required-ness is a per-class setting (which class requires which property),
/// not an attribute of the property definition itself. DataType is the raw
/// MFDataType enum value (e.g. MFDatatypeText, MFDatatypeLookup) — recorded
/// verbatim, not decoded here.
/// </summary>
public sealed record PropertyDefInfo(int MFilesId, string Guid, string Name, int DataType);

/// <summary>
/// One entry from ClassOperations.GetAllObjectClasses(). Confirmed live
/// (2026-07-26): Guid comes from .ItemGUID, NOT .GUID (blank on this shape —
/// same gotcha as ValueListItemInfo). ObjectTypeMFilesId is the owning object
/// type's NUMERIC ID (M-Files' .ObjectType property), not its GUID — the
/// caller must resolve it to a GUID using the same scan's object-type results
/// (claude.md §4.1: never store a bare numeric ID as identity). No
/// Required-type member exists on this shape either — required-ness lives one
/// level down, in AssociatedProperties.
/// </summary>
public sealed record ClassInfo(
    int MFilesId,
    string Guid,
    string Name,
    int ObjectTypeMFilesId,
    IReadOnlyList<ClassPropertyAssociationInfo>? AssociatedProperties = null);

/// <summary>
/// One entry from an IObjectClass's AssociatedPropertyDefs collection —
/// confirmed live via .NET reflection against the installed
/// Interop.MFilesApi.dll (26.6.16115.9), 2026-07-26: IObjectClass (the same
/// shape ClassOperations.GetAllObjectClasses() already returns) exposes
/// .AssociatedPropertyDefs, a collection of IAssociatedPropertyDef, each with
/// .PropertyDef (the property definition's NUMERIC ID, not GUID) and
/// .Required (bool). No separate COM call is needed — this is read off the
/// same class object Stage 4 already enumerates.
/// </summary>
public sealed record ClassPropertyAssociationInfo(int PropertyDefMFilesId, bool Required);

/// <summary>
/// One workflow's structural definition from WorkflowOperations.GetWorkflowsAdmin() —
/// states and transitions, guard data verbatim off the COM shape. No GUID here:
/// IWorkflow exposes no .GUID property (confirmed live, 2026-07-27) — the caller
/// resolves it from the Workflows built-in value list (MFBuiltInValueList.Workflows=7)
/// instead, matched by numeric ID, same two-source pattern Stage 4 used for
/// Class -> ObjectType resolution.
/// </summary>
public sealed record WorkflowAdminInfo(
    int MFilesId,
    string Name,
    string? Description,
    IReadOnlyList<WorkflowStateAdminInfo> States,
    IReadOnlyList<WorkflowTransitionAdminInfo> Transitions);

/// <summary>One recipient/assignee entry from IUserOrUserGroupIDs — raw numeric IDs, verbatim. Resolving these to actual user/group names is Stage 6 (users/groups/ACLs) territory, not this one.</summary>
public sealed record WorkflowActionPrincipalInfo(int UserOrGroupType, int UserOrGroupId);

/// <summary>ActionSendNotificationDefinition (IActionSendNotification), verbatim.</summary>
public sealed record WorkflowSendNotificationActionInfo(string? Subject, string? Message, IReadOnlyList<WorkflowActionPrincipalInfo> Recipients);

/// <summary>
/// ActionAssignToUserDefinition / ActionCreateSeparateAssignmentDefinition — both are
/// the same IActionCreateAssignment shape. ObjectClassMFilesId is the assignment's own
/// class as a raw numeric ID — not resolved to a GUID here (Stage 4 already scanned
/// classes; cross-stage resolution is left to whichever consumer needs it next).
/// </summary>
public sealed record WorkflowAssignmentActionInfo(
    string? Title, string? Description, bool HasDeadline, int DeadlineInDays, int ObjectClassMFilesId,
    IReadOnlyList<WorkflowActionPrincipalInfo> AssignedTo, IReadOnlyList<WorkflowActionPrincipalInfo> MonitoredBy);

/// <summary>
/// One entry from ActionSetPropertiesDefinition.Properties (IDefaultProperties).
/// PropertyDefMFilesId is the raw numeric property ID (Stage 3 already resolves these
/// to GUIDs; not re-resolved here). FixedValueJson comes from calling
/// DataFixedValueValue.ToJSON() — M-Files' own serialization of the fixed value,
/// only populated when Type is MFDefaultPropertyTypeFixedValue.
/// </summary>
public sealed record WorkflowSetPropertyActionInfo(int PropertyDefMFilesId, int DefaultPropertyType, string? FixedValueJson);

/// <summary>ActionConvertToPDFDefinition (IActionConvertToPDF), verbatim — all four fields are plain booleans on the real COM shape.</summary>
public sealed record WorkflowConvertToPdfActionInfo(bool PdfA1b, bool StoreAsSeparateFile, bool OverwriteExistingFile, bool FailOnUnsupportedSourceFiles);

/// <summary>
/// A state's full action configuration from IStateAdmin — confirmed live via
/// reflection (2026-07-27) that M-Files exposes 9 enabled-flags plus a typed
/// "definition" object per action kind (this is the real payload Stage 5 exists to
/// capture: what a state's SQL_/UPD_/CP1 name actually DOES, not just that it's
/// integration-touching by name). AclBase64 fields come from
/// AccessControlList.GetAsBytes() — M-Files' own binary serialization of the ACL,
/// Base64-encoded for JSON storage, not decoded into individual ACEs here; that
/// decoding is Stage 6 (users/groups/ACLs) territory. All fields default so
/// existing call sites (tests) that don't care about actions keep compiling.
/// </summary>
public sealed record WorkflowStateActionsInfo(
    bool ActionSetPermissions = false, bool ActionDelete = false, bool ActionMarkForArchiving = false,
    bool ActionAssignToUser = false, bool ActionSendNotification = false, bool ActionSetProperties = false,
    bool ActionRunVBScript = false, bool ActionConvertToPDF = false, bool ActionCreateSeparateAssignment = false,
    string? RunVBScriptText = null,
    WorkflowSendNotificationActionInfo? SendNotification = null,
    WorkflowAssignmentActionInfo? AssignToUser = null,
    WorkflowAssignmentActionInfo? CreateSeparateAssignment = null,
    IReadOnlyList<WorkflowSetPropertyActionInfo>? SetProperties = null,
    string? SetPermissionsAclBase64 = null,
    bool SetPermissionsDiscardsAutomatic = false,
    WorkflowConvertToPdfActionInfo? ConvertToPdf = null);

/// <summary>
/// A state's Preconditions/Postconditions (IStateConditions) — same verbatim-export
/// discipline as WorkflowTransitionAdminInfo's TriggerCriteria: the *PropertyExported
/// fields come from SearchConditions.GetAsExportedSearchString(), the *VBScript
/// fields are plain script text. All fields default so existing call sites keep compiling.
/// </summary>
public sealed record WorkflowStateGuardInfo(
    bool PreconditionsPropertyEnabled = false, string? PreconditionsPropertyExported = null,
    bool PreconditionsVBScriptEnabled = false, string? PreconditionsVBScript = null,
    bool PostconditionsPropertyEnabled = false, string? PostconditionsPropertyExported = null,
    bool PostconditionsVBScriptEnabled = false, string? PostconditionsVBScript = null);

/// <summary>
/// One state, from IWorkflowAdmin.States (StatesAdmin of IStateAdmin). Confirmed
/// live via exhaustive .NET reflection against Interop.MFilesApi.dll (26.6.16115.9,
/// 2026-07-27): no Initial/Final/Start/Terminal concept exists anywhere on this
/// COM shape (MFStateFlags only has None/TechnicalState) — the caller derives
/// IsInitial/IsFinal structurally from the transition graph instead, a heuristic,
/// not an SDK-confirmed fact. Guard and Actions carry the real per-state guard/action
/// data (see WorkflowStateGuardInfo / WorkflowStateActionsInfo) — both default to
/// null so existing call sites that predate this data keep compiling; the caller
/// treats a null as "nothing set" (all-disabled defaults), not "unknown."
/// </summary>
public sealed record WorkflowStateAdminInfo(int MFilesId, string Name, WorkflowStateGuardInfo? Guard = null, WorkflowStateActionsInfo? Actions = null);

/// <summary>
/// One transition, from IWorkflowAdmin.StateTransitions (IStateTransition).
/// FromState/ToState are numeric state IDs (caller resolves to GUIDs using this
/// same scan's state results). TriggerMode/TriggerInDays/TriggerAllowedByVBScript/
/// TriggerCriteriaExported are the transition's own automatic-trigger guard —
/// TriggerCriteriaExported comes from calling TriggerCriteria.GetAsExportedSearchString(),
/// M-Files' own textual export of its condition object (verbatim, not our
/// interpretation), null if TriggerCriteria is empty. Confirmed live there is NO
/// Actions concept at the transition level — actions belong to the destination
/// state's IStateAdmin, not the transition — so WorkflowTransition.Actions is
/// always null downstream; a verified fact, not an omission.
/// </summary>
public sealed record WorkflowTransitionAdminInfo(
    int MFilesId,
    int FromStateMFilesId,
    int ToStateMFilesId,
    string? Name,
    int TriggerMode,
    int TriggerInDays,
    string? TriggerAllowedByVBScript,
    string? TriggerCriteriaExported);

/// <summary>
/// One entry from VaultUserOperations.GetUserAccounts() — confirmed live (2026-07-27)
/// that IUserAccount has no .GUID property (unlike NamedACL, which has one); the
/// caller resolves GUID from the Users built-in value list (MFBuiltInValueList.Users=6)
/// instead, matched by numeric ID, same pattern as Workflow/State in Stage 5.
/// VaultRoles is the raw MFUserAccountVaultRole bitmask, verbatim.
/// </summary>
public sealed record UserAccountInfo(int MFilesId, string LoginName, int VaultRoles, bool InternalUser, bool Enabled);

/// <summary>
/// One entry from VaultUserGroupOperations.GetUserGroupsAdmin() — IUserGroup also has
/// no .GUID property (same gotcha), resolved via the UserGroups built-in value list
/// (MFBuiltInValueList.UserGroups=16). MemberMFilesIds are raw numeric user IDs from
/// IUserGroup.Members — M-Files groups hold user members only (no nested groups on
/// this COM shape, confirmed live) — resolved to UserAccount GUIDs by the caller.
/// </summary>
public sealed record UserGroupAdminInfo(int MFilesId, string Name, bool Predefined, IReadOnlyList<int> MemberMFilesIds);

/// <summary>
/// One entry from VaultNamedACLOperations.GetNamedACLsAdmin() — unlike User/UserGroup,
/// NamedACL has a real .GUID property directly (confirmed live), no value-list
/// workaround needed. AclBase64 comes from AccessControlListForNamedACL.GetAsBytes()
/// — M-Files' own binary ACL serialization, same mechanism as Stage 5's
/// ActionSetPermissions capture, not decoded into individual ACEs here.
/// </summary>
public sealed record NamedAclAdminInfo(int MFilesId, string Guid, string Name, int NamedAclType, string? AclBase64);

/// <summary>
/// One entry from ViewOperations.GetViewsAdmin(includeCommonViews: true, currentUserId) —
/// confirmed live (2026-07-27): unlike Workflow/State/User/UserGroup, IView HAS a
/// real .GUID property directly, no built-in value-list workaround needed (Views
/// also don't appear in MFBuiltInValueList at all — no Stage 2 overlap question
/// here). ParentMFilesId is the parent view's numeric ID (0/irrelevant when
/// HasParent is false) — the caller resolves it to a GUID within the same scan,
/// same pattern as Stage 4's Class -> ObjectType resolution. SearchConditionsExported
/// comes from SearchConditions.GetAsExportedSearchString() — M-Files' own textual
/// export, verbatim, same mechanism as Stage 5's guard conditions.
///
/// REAL GOTCHA (confirmed live, 2026-07-26/27): IView.Parent throws COMException
/// 0x80040001 ("The parameter is incorrect") when HasParent is false — reading it
/// unconditionally looked exactly like a broken GetViewsAdmin() call (identical
/// error even after trying GetViews(), different parameters, and classic
/// Type.InvokeMember late-binding instead of `dynamic`) until isolated by testing
/// the same GetViewsAdmin() call with identical arguments via raw PowerShell COM
/// automation, which succeeded — proving the enumeration call itself was never the
/// problem. VaultHandle.GetViewsAsync only reads .Parent when .HasParent is true.
/// </summary>
public sealed record ViewInfo(
    int MFilesId, string Guid, string Name, bool Common, bool HasParent, int ParentMFilesId, string? SearchConditionsExported);

/// <summary>One key/value pair from a NamedValues bag — ValueText is a best-effort ToString() of whatever VARIANT type the value actually is (usually a string in practice; NamedValues.Value is typed as a plain Object on the real COM shape, so this is not a lossless round-trip for non-string values).</summary>
public sealed record NamedValueEntryInfo(string Key, string? ValueText);

/// <summary>
/// One installed server-side custom/VAF application, from
/// VaultCustomApplicationManagementOperations.GetCustomApplicationsEx2() plus
/// GetCustomApplicationLicenseStatus(). CORRECTED 2026-07-27: the real element
/// type is ICustomApplication (ID, Name, Version, Publisher, Enabled, ...) —
/// an earlier version of this DTO wrongly assumed IPluginInfo (which is
/// actually returned by IMFilesServerApplication.GetAuthenticationPlugins*(),
/// a completely different subsystem for authentication plugins, not VAF apps)
/// and a ".Configuration" field that does not exist on the real type at all;
/// caught live when the first real run threw "does not contain a definition
/// for 'ConfigurationScope'".
///
/// LicenseStatus is the raw MFApplicationLicenseStatus enum value, verbatim
/// (1=NotNeeded, 2=NotInstalled, 4=Valid, etc.) — not interpreted here.
/// </summary>
public sealed record CustomApplicationInfo(string ApplicationId, string Name, string Version, string Publisher, bool Enabled, int ApplicationType, int LicenseStatus);

public interface IVaultHandle : IDisposable
{
    string VaultGuid { get; }
    string VaultName { get; }

    /// <summary>Read-only. Returns everything ValueListOperations.GetValueLists() returns, unfiltered — see ValueListInfo's RealObjectType for the caller to distinguish value lists from real object types.</summary>
    Task<IReadOnlyList<ValueListInfo>> GetValueListsAsync(CancellationToken cancellationToken = default);

    /// <summary>Read-only. Returns everything ValueListItemOperations.GetValueListItems() returns for the given value list, including deleted items (Deleted tells you which).</summary>
    Task<IReadOnlyList<ValueListItemInfo>> GetValueListItemsAsync(int valueListId, CancellationToken cancellationToken = default);

    /// <summary>Read-only. Returns everything PropertyDefOperations.GetPropertyDefs() returns, unfiltered.</summary>
    Task<IReadOnlyList<PropertyDefInfo>> GetPropertyDefsAsync(CancellationToken cancellationToken = default);

    /// <summary>Read-only. Returns everything ClassOperations.GetAllObjectClasses() returns, unfiltered.</summary>
    Task<IReadOnlyList<ClassInfo>> GetClassesAsync(CancellationToken cancellationToken = default);

    /// <summary>Read-only. Returns everything WorkflowOperations.GetWorkflowsAdmin() returns — every workflow's full state/transition definition, guard data verbatim.</summary>
    Task<IReadOnlyList<WorkflowAdminInfo>> GetWorkflowsAdminAsync(CancellationToken cancellationToken = default);

    /// <summary>Read-only. Returns everything VaultUserOperations.GetUserAccounts() returns, including pseudo-users.</summary>
    Task<IReadOnlyList<UserAccountInfo>> GetUserAccountsAsync(CancellationToken cancellationToken = default);

    /// <summary>Read-only. Returns everything VaultUserGroupOperations.GetUserGroupsAdmin() returns.</summary>
    Task<IReadOnlyList<UserGroupAdminInfo>> GetUserGroupsAdminAsync(CancellationToken cancellationToken = default);

    /// <summary>Read-only. Returns everything VaultNamedACLOperations.GetNamedACLsAdmin() returns.</summary>
    Task<IReadOnlyList<NamedAclAdminInfo>> GetNamedAclsAdminAsync(CancellationToken cancellationToken = default);

    /// <summary>Read-only. Returns every normal view via ViewOperations.GetViews(MFViewCategoryNormal, allViews: true, 0).</summary>
    Task<IReadOnlyList<ViewInfo>> GetViewsAsync(CancellationToken cancellationToken = default);

    /// <summary>Read-only. Returns every installed server-side application via CustomApplicationManagementOperations.GetCustomApplicationsEx2(), with each one's license status.</summary>
    Task<IReadOnlyList<CustomApplicationInfo>> GetCustomApplicationsAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// Read-only. Wraps NamedValueStorageOperations.GetNamedValues(namedValueType, namespaceName) —
    /// confirmed live (2026-07-27) this generic vault-level store has no "list namespaces" call;
    /// the caller must already know the namespace. Returns an empty list (not an error) if the
    /// namespace holds no values, which is the confirmed real result for every installed
    /// application's ID tried as a namespace against all 7 MFNamedValueType values in Conformity —
    /// this stage's own "Configuration" node (workflow-state/SQL-call mappings, etc.) is not
    /// reachable through this or any other public COM/REST API found; see NamedValueStorageScanner.
    /// </summary>
    Task<IReadOnlyList<NamedValueEntryInfo>> GetNamedValuesAsync(int namedValueType, string namespaceName, CancellationToken cancellationToken = default);
}

/// <summary>
/// Transport-agnostic surface every M-Files connector implements. Consumers
/// (the future Discovery scanner, the API layer, their tests) depend on this
/// interface only — no COM type is visible outside MFilesComConnector, and no
/// HttpClient type is visible outside MFilesRestConnector. That is what keeps
/// everything above this project mockable without a live vault.
/// </summary>
public interface IMFilesConnector
{
    /// <summary>
    /// Lists the vaults available on the configured server. Requires only a
    /// server-level connection — no vault GUID, since the caller doesn't have
    /// one yet at this point; this is how they get one.
    /// </summary>
    Task<IReadOnlyList<VaultInfo>> ListVaultsAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// Logs into one specific vault, using the connector's configured identity
    /// (same SSO-first/fallback credentials as the server-level connect).
    /// This is connectivity, not content — every Discovery stage needs a vault
    /// session before it can read anything; that's why it lives in Module 1
    /// rather than being reinvented by whatever consumes this connector first.
    /// </summary>
    Task<IVaultHandle> LogInToVaultAsync(string vaultGuid, CancellationToken cancellationToken = default);
}
