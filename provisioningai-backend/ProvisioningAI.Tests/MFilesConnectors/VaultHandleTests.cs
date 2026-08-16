using ProvisioningAI.MFilesConnectors;

namespace ProvisioningAI.Tests.MFilesConnectors;

public class VaultHandleTests
{
    // Plain CLR doubles matching the ValueListOperations/ValueListItemOperations COM shape
    // confirmed live against Conformity (2026-07-26) — same dynamic-dispatch test-double
    // pattern as MFilesComConnectorTests. Must be public for the same reason documented there.
    public sealed class FakeVault
    {
        public FakeValueListOperations ValueListOperations { get; } = new();
        public FakeValueListItemOperations ValueListItemOperations { get; } = new();
        public FakePropertyDefOperations PropertyDefOperations { get; } = new();
        public FakeClassOperations ClassOperations { get; } = new();
        public FakeWorkflowOperations WorkflowOperations { get; } = new();
        public FakeUserOperations UserOperations { get; } = new();
        public FakeUserGroupOperations UserGroupOperations { get; } = new();
        public FakeNamedAclOperations NamedACLOperations { get; } = new();
        public FakeViewOperations ViewOperations { get; } = new();
        public int CurrentLoggedInUserID { get; set; } = 1;
        public FakeCustomApplicationManagementOperations CustomApplicationManagementOperations { get; } = new();
        public FakeNamedValueStorageOperations NamedValueStorageOperations { get; } = new();
        public void LogOutSilent() { }
    }

    // Shaped like IVaultCustomApplicationManagementOperations — confirmed live (2026-07-27)
    // GetCustomApplicationsEx2's real element type is ICustomApplication, NOT IPluginInfo
    // (that was a wrong earlier guess; IPluginInfo is actually for authentication plugins).
    public sealed class FakeCustomApplicationManagementOperations
    {
        public List<FakeCustomApplicationEntry> Entries { get; set; } = [];
        public Dictionary<string, int> LicenseStatusByAppId { get; set; } = new();
        public List<FakeCustomApplicationEntry> GetCustomApplicationsEx2(int type, int platform) => Entries;
        public int GetCustomApplicationLicenseStatus(string applicationId) => LicenseStatusByAppId.GetValueOrDefault(applicationId, 0);
    }

    // Shaped like ICustomApplication — confirmed live: no Configuration-related members exist.
    public sealed class FakeCustomApplicationEntry
    {
        public string ID { get; set; } = "";
        public string Name { get; set; } = "";
        public string Version { get; set; } = "";
        public string Publisher { get; set; } = "";
        public bool Enabled { get; set; } = true;
        public int ApplicationType { get; set; }
    }

    // Shaped like IVaultNamedValueStorageOperations — confirmed live: GetNamedValues(type,
    // namespace) has no "list namespaces" call; empty for every real (app, type) combination
    // tried in Conformity, but the mechanism itself is real and general-purpose.
    public sealed class FakeNamedValueStorageOperations
    {
        public Dictionary<(int Type, string Namespace), FakeNamedValues> ValuesByTypeAndNamespace { get; set; } = new();
        public FakeNamedValues GetNamedValues(int namedValueType, string namespaceName) =>
            ValuesByTypeAndNamespace.TryGetValue((namedValueType, namespaceName), out var nv) ? nv : new FakeNamedValues();
    }

    // Shaped like INamedValues — Names is a Strings collection, Value(name) is an
    // indexed getter returning a plain Object (VARIANT), confirmed live.
    public sealed class FakeNamedValues
    {
        public Dictionary<string, object?> Entries { get; set; } = new();
        public List<string> Names => Entries.Keys.ToList();
        public object? Value(string name) => Entries.TryGetValue(name, out var v) ? v : null;
    }

    public sealed class FakeViewOperations
    {
        public List<FakeViewEntry> Entries { get; set; } = [];
        public List<FakeViewEntry> GetViewsAdmin(bool includeCommonViews, int userId) => Entries;
    }

    // Shaped like IView — confirmed live (2026-07-27): unlike Workflow/State/User/UserGroup, this HAS a real .GUID directly.
    public sealed class FakeViewEntry
    {
        public int ID { get; set; }
        public string GUID { get; set; } = "";
        public string Name { get; set; } = "";
        public bool Common { get; set; }
        public bool HasParent { get; set; }
        public int Parent { get; set; }
        public FakeSearchConditions? SearchConditions { get; set; } = new();
    }

    public sealed class FakeUserOperations
    {
        public List<FakeUserAccountEntry> Entries { get; set; } = [];
        public List<FakeUserAccountEntry> GetUserAccounts() => Entries;
    }

    // Shaped like IUserAccount — confirmed live (2026-07-27): no .GUID property.
    public sealed class FakeUserAccountEntry
    {
        public int ID { get; set; }
        public string LoginName { get; set; } = "";
        public int VaultRoles { get; set; }
        public bool InternalUser { get; set; }
        public bool Enabled { get; set; } = true;
    }

    public sealed class FakeUserGroupOperations
    {
        public List<FakeUserGroupAdminEntry> Entries { get; set; } = [];
        public List<FakeUserGroupAdminEntry> GetUserGroupsAdmin() => Entries;
    }

    public sealed class FakeUserGroupAdminEntry
    {
        public FakeUserGroupEntry UserGroup { get; set; } = new();
    }

    // Shaped like IUserGroup — confirmed live (2026-07-27): no .GUID property either.
    public sealed class FakeUserGroupEntry
    {
        public int ID { get; set; }
        public string Name { get; set; } = "";
        public bool Predefined { get; set; }
        public List<int> Members { get; set; } = [];
    }

    public sealed class FakeNamedAclOperations
    {
        public List<FakeNamedAclAdminEntry> Entries { get; set; } = [];
        public List<FakeNamedAclAdminEntry> GetNamedACLsAdmin() => Entries;
    }

    public sealed class FakeNamedAclAdminEntry
    {
        public FakeNamedAclEntry NamedACL { get; set; } = new();
        public FakeAccessControlList AccessControlListForNamedACL { get; set; } = new();
    }

    // Shaped like INamedACL — confirmed live (2026-07-27): unlike User/UserGroup, this DOES have a real .GUID.
    public sealed class FakeNamedAclEntry
    {
        public int ID { get; set; }
        public string GUID { get; set; } = "";
        public string Name { get; set; } = "";
        public int NamedACLType { get; set; }
    }

    // Shaped like IVaultWorkflowOperations.GetWorkflowsAdmin() — confirmed live via
    // .NET reflection against Interop.MFilesApi.dll (26.6.16115.9, 2026-07-27):
    // IWorkflowAdmin.Workflow gives ID/Name/Description, .States/.StateTransitions
    // nest per workflow directly (no separate per-workflow COM calls needed).
    public sealed class FakeWorkflowOperations
    {
        public List<FakeWorkflowAdminEntry> Entries { get; set; } = [];
        public List<FakeWorkflowAdminEntry> GetWorkflowsAdmin() => Entries;
    }

    public sealed class FakeWorkflowAdminEntry
    {
        public FakeWorkflowEntry Workflow { get; set; } = new();
        public List<FakeStateAdminEntry> States { get; set; } = [];
        public List<FakeStateTransitionEntry> StateTransitions { get; set; } = [];
    }

    // IWorkflow has no .GUID — same gotcha as Class/ValueListItem needing ItemGUID.
    public sealed class FakeWorkflowEntry
    {
        public int ID { get; set; }
        public string Name { get; set; } = "";
        public string? Description { get; set; }
    }

    // IStateAdmin has no Initial/Final concept — confirmed live (2026-07-27).
    // All action flags default false and both condition sets default "nothing
    // enabled" so existing tests that only set ID/Name keep working unchanged —
    // VaultHandle only reads a definition object when its enabled-flag is true.
    public sealed class FakeStateAdminEntry
    {
        public int ID { get; set; }
        public string Name { get; set; } = "";
        public FakeStateConditions Preconditions { get; set; } = new();
        public FakeStateConditions Postconditions { get; set; } = new();
        public bool ActionSetPermissions { get; set; }
        public bool ActionDelete { get; set; }
        public bool ActionMarkForArchiving { get; set; }
        public bool ActionAssignToUser { get; set; }
        public bool ActionSendNotification { get; set; }
        public bool ActionSetProperties { get; set; }
        public bool ActionRunVBScript { get; set; }
        public bool ActionConvertToPDF { get; set; }
        public bool ActionCreateSeparateAssignment { get; set; }
        public string? ActionRunVBScriptDefinition { get; set; }
        public FakeActionSendNotification ActionSendNotificationDefinition { get; set; } = new();
        public FakeActionCreateAssignment ActionAssignToUserDefinition { get; set; } = new();
        public FakeActionCreateAssignment ActionCreateSeparateAssignmentDefinition { get; set; } = new();
        public FakeActionSetProperties ActionSetPropertiesDefinition { get; set; } = new();
        public FakeActionSetPermissionsDetailed ActionSetPermissionsDetailedDefinition { get; set; } = new();
        public FakeActionConvertToPdf ActionConvertToPDFDefinition { get; set; } = new();
    }

    // Shaped like IStateConditions — Preconditions/Postconditions on a state.
    public sealed class FakeStateConditions
    {
        public bool PropertyConditions { get; set; }
        public bool VBScript { get; set; }
        public FakeSearchConditions PropertyConditionsDefinition { get; set; } = new();
        public string? VBScriptDefinition { get; set; }
    }

    // Shaped like IUserOrUserGroupID — raw type+id pair, no name resolution.
    public sealed class FakeUserOrGroupId
    {
        public int UserOrGroupType { get; set; }
        public int UserOrGroupID { get; set; }
    }

    public sealed class FakeActionSendNotification
    {
        public string? Subject { get; set; }
        public string? Message { get; set; }
        public List<FakeUserOrGroupId> Recipients { get; set; } = [];
    }

    public sealed class FakeActionCreateAssignment
    {
        public string? Title { get; set; }
        public string? Description { get; set; }
        public bool Deadline { get; set; }
        public int DeadlineInDays { get; set; }
        public int Class { get; set; }
        public List<FakeUserOrGroupId> AssignedToUsers { get; set; } = [];
        public List<FakeUserOrGroupId> MonitoredByUsers { get; set; } = [];
    }

    public sealed class FakeActionSetProperties
    {
        public List<FakeDefaultProperty> Properties { get; set; } = [];
    }

    // Shaped like IDefaultProperty — DataFixedValueValue.ToJSON() is M-Files' own
    // serialization of a TypedValue, confirmed real via reflection.
    public sealed class FakeDefaultProperty
    {
        public int PropertyDefID { get; set; }
        public int Type { get; set; }
        public FakeTypedValue DataFixedValueValue { get; set; } = new();
    }

    public sealed class FakeTypedValue
    {
        public string Json { get; set; } = "";
        public string ToJSON() => Json;
    }

    public sealed class FakeActionSetPermissionsDetailed
    {
        public bool DiscardsAutomaticPermissions { get; set; }
        public FakeAccessControlList Permissions { get; set; } = new();
    }

    // Shaped like IAccessControlList — GetAsBytes() is M-Files' own binary ACL
    // serialization, confirmed real via reflection (no params, returns byte[]).
    public sealed class FakeAccessControlList
    {
        public byte[] Bytes { get; set; } = [];
        public byte[] GetAsBytes() => Bytes;
    }

    public sealed class FakeActionConvertToPdf
    {
        public bool PDFA1b { get; set; }
        public bool StoreAsSeparateFile { get; set; }
        public bool OverwriteExistingFile { get; set; }
        public bool FailOnUnsupportedSourceFiles { get; set; }
    }

    public sealed class FakeStateTransitionEntry
    {
        public int ID { get; set; }
        public int FromState { get; set; }
        public int ToState { get; set; }
        public string Name { get; set; } = "";
        public int TriggerMode { get; set; }
        public int TriggerInDays { get; set; }
        public string? TriggerAllowedByVBScript { get; set; }
        public FakeSearchConditions TriggerCriteria { get; set; } = new();
    }

    // Shaped like ISearchConditions — Count + GetAsExportedSearchString(flags),
    // M-Files' own textual export, confirmed live.
    public sealed class FakeSearchConditions
    {
        public int Count { get; set; }
        public string ExportedText { get; set; } = "";
        public string GetAsExportedSearchString(int flags) => ExportedText;
    }

    public sealed class FakeClassOperations
    {
        public List<FakeClassEntry> Entries { get; set; } = [];
        public List<FakeClassEntry> GetAllObjectClasses() => Entries;
    }

    // Confirmed live: .GUID is blank on this shape — the real GUID comes from .ItemGUID.
    // .ObjectType is the owning object type's numeric ID, not its GUID.
    public sealed class FakeClassEntry
    {
        public int ID { get; set; }
        public string ItemGUID { get; set; } = "";
        public string Name { get; set; } = "";
        public int ObjectType { get; set; }
        public List<FakeAssociatedPropertyDef> AssociatedPropertyDefs { get; set; } = [];
    }

    // Shaped like IAssociatedPropertyDef — confirmed live via .NET reflection against
    // Interop.MFilesApi.dll (26.6.16115.9): .PropertyDef is the numeric property def ID
    // (not GUID), .Required is the per-class required/optional flag.
    public sealed class FakeAssociatedPropertyDef
    {
        public int PropertyDef { get; set; }
        public bool Required { get; set; }
    }

    public sealed class FakePropertyDefOperations
    {
        public List<FakePropertyDefEntry> Entries { get; set; } = [];
        public List<FakePropertyDefEntry> GetPropertyDefs() => Entries;
    }

    // Shaped like the real PropertyDef COM object — confirmed live: no Required/IsRequired
    // member exists on this shape (required-ness is a per-class setting, not a property-def one).
    public sealed class FakePropertyDefEntry
    {
        public int ID { get; set; }
        public string GUID { get; set; } = "";
        public string Name { get; set; } = "";
        public int DataType { get; set; }
    }

    public sealed class FakeValueListOperations
    {
        public List<FakeValueListEntry> Entries { get; set; } = [];
        public List<FakeValueListEntry> GetValueLists() => Entries;
    }

    // Shaped like ObjectType, not a plain value list — no .Name, .NameSingular instead
    // (confirmed live: GetValueLists() mixes real object types and true value lists).
    public sealed class FakeValueListEntry
    {
        public int ID { get; set; }
        public string GUID { get; set; } = "";
        public string NameSingular { get; set; } = "";
        public string NamePlural { get; set; } = "";
        public bool RealObjectType { get; set; }
    }

    public sealed class FakeValueListItemOperations
    {
        public Dictionary<int, List<FakeValueListItemEntry>> ItemsByListId { get; set; } = new();
        public List<FakeValueListItemEntry> GetValueListItems(int valueListId, bool flag)
            => ItemsByListId.TryGetValue(valueListId, out var items) ? items : [];
    }

    public sealed class FakeValueListItemEntry
    {
        public int ID { get; set; }
        public string ItemGUID { get; set; } = "";
        public string Name { get; set; } = "";
        public bool Deleted { get; set; }
    }

    [Fact]
    public async Task GetValueListsAsync_MapsComShapeVerbatim_IncludingRealObjectTypes()
    {
        var fakeVault = new FakeVault();
        fakeVault.ValueListOperations.Entries =
        [
            new() { ID = 1, GUID = "{CLASS}", NameSingular = "Class", NamePlural = "Classes", RealObjectType = false },
            new() { ID = 2, GUID = "{DOC}", NameSingular = "Document", NamePlural = "Documents", RealObjectType = true },
        ];
        using var handle = new VaultHandle(fakeVault, "{VAULT}", "Conformity");

        var result = await handle.GetValueListsAsync();

        Assert.Equal(2, result.Count);
        Assert.Contains(result, v => v.MFilesId == 1 && v.Guid == "{CLASS}" && v.Name == "Class" && !v.RealObjectType);
        Assert.Contains(result, v => v.MFilesId == 2 && v.Guid == "{DOC}" && v.Name == "Document" && v.RealObjectType && v.NamePlural == "Documents");
    }

    [Fact]
    public async Task GetValueListItemsAsync_MapsComShapeVerbatim_IncludingDeletedAndNegativeIds()
    {
        var fakeVault = new FakeVault();
        fakeVault.ValueListItemOperations.ItemsByListId[1] =
        [
            new() { ID = -3, ItemGUID = "{BUILTIN}", Name = "Built-in item", Deleted = false },
            new() { ID = 7, ItemGUID = "{ITEM}", Name = "Acme Corp", Deleted = true },
        ];
        using var handle = new VaultHandle(fakeVault, "{VAULT}", "Conformity");

        var result = await handle.GetValueListItemsAsync(1);

        Assert.Equal(2, result.Count);
        Assert.Contains(result, i => i.MFilesId == -3 && i.Guid == "{BUILTIN}" && !i.Deleted);
        Assert.Contains(result, i => i.MFilesId == 7 && i.Guid == "{ITEM}" && i.Name == "Acme Corp" && i.Deleted);
    }

    [Fact]
    public async Task GetValueListItemsAsync_UnknownValueListId_ReturnsEmpty()
    {
        var fakeVault = new FakeVault();
        using var handle = new VaultHandle(fakeVault, "{VAULT}", "Conformity");

        var result = await handle.GetValueListItemsAsync(999);

        Assert.Empty(result);
    }

    [Fact]
    public async Task GetPropertyDefsAsync_MapsComShapeVerbatim()
    {
        var fakeVault = new FakeVault();
        fakeVault.PropertyDefOperations.Entries =
        [
            new() { ID = 0, GUID = "{NAME}", Name = "Name or title", DataType = 1 },
            new() { ID = 107, GUID = "{CUSTOM}", Name = "Invoice Number", DataType = 1 },
        ];
        using var handle = new VaultHandle(fakeVault, "{VAULT}", "Conformity");

        var result = await handle.GetPropertyDefsAsync();

        Assert.Equal(2, result.Count);
        Assert.Contains(result, p => p.MFilesId == 0 && p.Guid == "{NAME}" && p.Name == "Name or title" && p.DataType == 1);
        Assert.Contains(result, p => p.MFilesId == 107 && p.Guid == "{CUSTOM}" && p.Name == "Invoice Number" && p.DataType == 1);
    }

    [Fact]
    public async Task GetClassesAsync_MapsComShapeVerbatim_UsingItemGuidNotGuid()
    {
        var fakeVault = new FakeVault();
        fakeVault.ClassOperations.Entries =
        [
            new() { ID = 15, ItemGUID = "{APPROVER}", Name = "Approver", ObjectType = 116 },
            new() { ID = -100, ItemGUID = "{ASSIGNMENT}", Name = "Assignment", ObjectType = 10 },
        ];
        using var handle = new VaultHandle(fakeVault, "{VAULT}", "Conformity");

        var result = await handle.GetClassesAsync();

        Assert.Equal(2, result.Count);
        Assert.Contains(result, c => c.MFilesId == 15 && c.Guid == "{APPROVER}" && c.Name == "Approver" && c.ObjectTypeMFilesId == 116);
        Assert.Contains(result, c => c.MFilesId == -100 && c.Guid == "{ASSIGNMENT}" && c.ObjectTypeMFilesId == 10);
    }

    [Fact]
    public async Task GetClassesAsync_MapsAssociatedPropertyDefs_IncludingRequiredFlag()
    {
        var fakeVault = new FakeVault();
        fakeVault.ClassOperations.Entries =
        [
            new()
            {
                ID = 15, ItemGUID = "{APPROVER}", Name = "Approver", ObjectType = 116,
                AssociatedPropertyDefs =
                [
                    new() { PropertyDef = 106, Required = true },
                    new() { PropertyDef = 107, Required = false },
                ],
            },
        ];
        using var handle = new VaultHandle(fakeVault, "{VAULT}", "Conformity");

        var result = await handle.GetClassesAsync();

        var approver = Assert.Single(result);
        Assert.NotNull(approver.AssociatedProperties);
        Assert.Equal(2, approver.AssociatedProperties!.Count);
        Assert.Contains(approver.AssociatedProperties, a => a.PropertyDefMFilesId == 106 && a.Required);
        Assert.Contains(approver.AssociatedProperties, a => a.PropertyDefMFilesId == 107 && !a.Required);
    }

    [Fact]
    public async Task GetWorkflowsAdminAsync_MapsComShapeVerbatim_IncludingExportedTriggerCriteria()
    {
        var fakeVault = new FakeVault();
        fakeVault.WorkflowOperations.Entries =
        [
            new()
            {
                Workflow = new() { ID = 1, Name = "Conformity", Description = "AP workflow" },
                States =
                [
                    new() { ID = 10, Name = "Draft" },
                    new() { ID = 11, Name = "SQL_Ready" },
                ],
                StateTransitions =
                [
                    new()
                    {
                        ID = 100, FromState = 10, ToState = 11, Name = "Submit",
                        TriggerMode = 4, TriggerInDays = 0, TriggerAllowedByVBScript = null,
                        TriggerCriteria = new FakeSearchConditions { Count = 1, ExportedText = "[Vendor]=~1" },
                    },
                ],
            },
        ];
        using var handle = new VaultHandle(fakeVault, "{VAULT}", "Conformity");

        var result = await handle.GetWorkflowsAdminAsync();

        var wf = Assert.Single(result);
        Assert.Equal(1, wf.MFilesId);
        Assert.Equal("Conformity", wf.Name);
        Assert.Equal("AP workflow", wf.Description);
        Assert.Equal(2, wf.States.Count);
        Assert.Contains(wf.States, s => s.MFilesId == 11 && s.Name == "SQL_Ready");

        var transition = Assert.Single(wf.Transitions);
        Assert.Equal(10, transition.FromStateMFilesId);
        Assert.Equal(11, transition.ToStateMFilesId);
        Assert.Equal(4, transition.TriggerMode);
        Assert.Equal("[Vendor]=~1", transition.TriggerCriteriaExported);
    }

    [Fact]
    public async Task GetWorkflowsAdminAsync_EmptyTriggerCriteria_ExportsNull()
    {
        var fakeVault = new FakeVault();
        fakeVault.WorkflowOperations.Entries =
        [
            new()
            {
                Workflow = new() { ID = 1, Name = "Conformity" },
                States = [new() { ID = 10, Name = "Draft" }, new() { ID = 11, Name = "Approved" }],
                StateTransitions =
                [
                    new()
                    {
                        ID = 100, FromState = 10, ToState = 11, Name = "Approve",
                        TriggerCriteria = new FakeSearchConditions { Count = 0 },
                    },
                ],
            },
        ];
        using var handle = new VaultHandle(fakeVault, "{VAULT}", "Conformity");

        var result = await handle.GetWorkflowsAdminAsync();

        Assert.Null(result[0].Transitions[0].TriggerCriteriaExported);
    }

    [Fact]
    public async Task GetWorkflowsAdminAsync_MapsStateGuardAndActionsVerbatim()
    {
        var fakeVault = new FakeVault();
        fakeVault.WorkflowOperations.Entries =
        [
            new()
            {
                Workflow = new() { ID = 1, Name = "Conformity" },
                States =
                [
                    new()
                    {
                        ID = 142, Name = "UPD_CP1",
                        Preconditions = new FakeStateConditions
                        {
                            PropertyConditions = true,
                            PropertyConditionsDefinition = new FakeSearchConditions { Count = 1, ExportedText = "[Status]=~2" },
                            VBScript = true,
                            VBScriptDefinition = "return true",
                        },
                        ActionSendNotification = true,
                        ActionSendNotificationDefinition = new FakeActionSendNotification
                        {
                            Subject = "CP1 export ready",
                            Message = "Sent to CP1",
                            Recipients = [new() { UserOrGroupType = 0, UserOrGroupID = 5 }],
                        },
                        ActionAssignToUser = true,
                        ActionAssignToUserDefinition = new FakeActionCreateAssignment
                        {
                            Title = "Review export", Description = "Check CP1 export", Deadline = true, DeadlineInDays = 2, Class = 118,
                            AssignedToUsers = [new() { UserOrGroupType = 0, UserOrGroupID = 7 }],
                        },
                        ActionSetProperties = true,
                        ActionSetPropertiesDefinition = new FakeActionSetProperties
                        {
                            Properties =
                            [
                                new FakeDefaultProperty { PropertyDefID = 106, Type = 1, DataFixedValueValue = new FakeTypedValue { Json = "{\"value\":\"CP1\"}" } },
                            ],
                        },
                        ActionRunVBScript = true,
                        ActionRunVBScriptDefinition = "MsgBox(\"done\")",
                        ActionConvertToPDF = true,
                        ActionConvertToPDFDefinition = new FakeActionConvertToPdf { PDFA1b = true, StoreAsSeparateFile = true },
                        ActionSetPermissions = true,
                        ActionSetPermissionsDetailedDefinition = new FakeActionSetPermissionsDetailed
                        {
                            DiscardsAutomaticPermissions = true,
                            Permissions = new FakeAccessControlList { Bytes = [1, 2, 3] },
                        },
                    },
                ],
                StateTransitions = [],
            },
        ];
        using var handle = new VaultHandle(fakeVault, "{VAULT}", "Conformity");

        var result = await handle.GetWorkflowsAdminAsync();

        var state = Assert.Single(result[0].States);
        Assert.NotNull(state.Guard);
        Assert.True(state.Guard!.PreconditionsPropertyEnabled);
        Assert.Equal("[Status]=~2", state.Guard.PreconditionsPropertyExported);
        Assert.True(state.Guard.PreconditionsVBScriptEnabled);
        Assert.Equal("return true", state.Guard.PreconditionsVBScript);

        Assert.NotNull(state.Actions);
        var actions = state.Actions!;
        Assert.True(actions.ActionSendNotification);
        Assert.Equal("CP1 export ready", actions.SendNotification!.Subject);
        Assert.Equal(5, actions.SendNotification.Recipients[0].UserOrGroupId);

        Assert.True(actions.ActionAssignToUser);
        Assert.Equal("Review export", actions.AssignToUser!.Title);
        Assert.Equal(118, actions.AssignToUser.ObjectClassMFilesId);
        Assert.Equal(7, actions.AssignToUser.AssignedTo[0].UserOrGroupId);

        Assert.True(actions.ActionSetProperties);
        Assert.Equal(106, actions.SetProperties![0].PropertyDefMFilesId);
        Assert.Equal("{\"value\":\"CP1\"}", actions.SetProperties[0].FixedValueJson);

        Assert.Equal("MsgBox(\"done\")", actions.RunVBScriptText);

        Assert.True(actions.ActionConvertToPDF);
        Assert.True(actions.ConvertToPdf!.PdfA1b);
        Assert.True(actions.ConvertToPdf.StoreAsSeparateFile);

        Assert.True(actions.SetPermissionsDiscardsAutomatic);
        Assert.Equal(Convert.ToBase64String([1, 2, 3]), actions.SetPermissionsAclBase64);
    }

    [Fact]
    public async Task GetWorkflowsAdminAsync_NoActionsEnabled_AllDefinitionsNull()
    {
        var fakeVault = new FakeVault();
        fakeVault.WorkflowOperations.Entries =
        [
            new() { Workflow = new() { ID = 1, Name = "Conformity" }, States = [new() { ID = 10, Name = "Draft" }], StateTransitions = [] },
        ];
        using var handle = new VaultHandle(fakeVault, "{VAULT}", "Conformity");

        var result = await handle.GetWorkflowsAdminAsync();

        var actions = result[0].States[0].Actions!;
        Assert.Null(actions.SendNotification);
        Assert.Null(actions.AssignToUser);
        Assert.Null(actions.CreateSeparateAssignment);
        Assert.Null(actions.SetProperties);
        Assert.Null(actions.SetPermissionsAclBase64);
        Assert.Null(actions.ConvertToPdf);
        Assert.Null(actions.RunVBScriptText);
    }

    [Fact]
    public async Task GetUserAccountsAsync_MapsComShapeVerbatim_IncludingPseudoUsers()
    {
        var fakeVault = new FakeVault();
        fakeVault.UserOperations.Entries =
        [
            new() { ID = -100, LoginName = "(current user)", VaultRoles = 0, InternalUser = false, Enabled = true },
            new() { ID = 50, LoginName = "Harry joseph", VaultRoles = 3078, InternalUser = true, Enabled = true },
        ];
        using var handle = new VaultHandle(fakeVault, "{VAULT}", "Conformity");

        var result = await handle.GetUserAccountsAsync();

        Assert.Equal(2, result.Count);
        Assert.Contains(result, u => u.MFilesId == -100 && u.LoginName == "(current user)");
        Assert.Contains(result, u => u.MFilesId == 50 && u.LoginName == "Harry joseph" && u.VaultRoles == 3078 && u.InternalUser);
    }

    [Fact]
    public async Task GetUserGroupsAdminAsync_MapsComShapeVerbatim_IncludingMembers()
    {
        var fakeVault = new FakeVault();
        fakeVault.UserGroupOperations.Entries =
        [
            new() { UserGroup = new() { ID = 1, Name = "All internal users", Predefined = true, Members = [50, 45] } },
        ];
        using var handle = new VaultHandle(fakeVault, "{VAULT}", "Conformity");

        var result = await handle.GetUserGroupsAdminAsync();

        var group = Assert.Single(result);
        Assert.Equal("All internal users", group.Name);
        Assert.True(group.Predefined);
        Assert.Equal([50, 45], group.MemberMFilesIds);
    }

    [Fact]
    public async Task GetNamedAclsAdminAsync_MapsComShapeVerbatim_UsingRealGuidProperty()
    {
        var fakeVault = new FakeVault();
        fakeVault.NamedACLOperations.Entries =
        [
            new()
            {
                NamedACL = new() { ID = 12, GUID = "{FINANCE-ACL}", Name = "Finance_Access", NamedACLType = 1 },
                AccessControlListForNamedACL = new FakeAccessControlList { Bytes = [9, 8, 7] },
            },
        ];
        using var handle = new VaultHandle(fakeVault, "{VAULT}", "Conformity");

        var result = await handle.GetNamedAclsAdminAsync();

        var acl = Assert.Single(result);
        Assert.Equal("{FINANCE-ACL}", acl.Guid);
        Assert.Equal("Finance_Access", acl.Name);
        Assert.Equal(1, acl.NamedAclType);
        Assert.Equal(Convert.ToBase64String([9, 8, 7]), acl.AclBase64);
    }

    [Fact]
    public async Task GetViewsAsync_MapsComShapeVerbatim_UsingRealGuidAndExportedSearchConditions()
    {
        var fakeVault = new FakeVault();
        fakeVault.ViewOperations.Entries =
        [
            new()
            {
                ID = 5, GUID = "{VIEW-1}", Name = "By Vendor", Common = true, HasParent = false,
                SearchConditions = new FakeSearchConditions { Count = 1, ExportedText = "[Class]=~1" },
            },
            new()
            {
                ID = 6, GUID = "{VIEW-2}", Name = "By Vendor / Unpaid", Common = false, HasParent = true, Parent = 5,
                SearchConditions = new FakeSearchConditions { Count = 0 },
            },
        ];
        using var handle = new VaultHandle(fakeVault, "{VAULT}", "Conformity");

        var result = await handle.GetViewsAsync();

        Assert.Equal(2, result.Count);
        var top = result.Single(v => v.MFilesId == 5);
        Assert.Equal("{VIEW-1}", top.Guid);
        Assert.True(top.Common);
        Assert.False(top.HasParent);
        Assert.Equal("[Class]=~1", top.SearchConditionsExported);

        var child = result.Single(v => v.MFilesId == 6);
        Assert.True(child.HasParent);
        Assert.Equal(5, child.ParentMFilesId);
        Assert.Null(child.SearchConditionsExported);
    }

    [Fact]
    public async Task GetCustomApplicationsAsync_MapsComShapeVerbatim_IncludingLicenseStatus()
    {
        var fakeVault = new FakeVault();
        fakeVault.CustomApplicationManagementOperations.Entries =
        [
            new() { ID = "{58E4F21F-A933-417D-9C9D-DCC7EA170EE3}", Name = "M-Files Compliance Kit", Version = "1.2.3", Publisher = "M-Files", Enabled = true, ApplicationType = 2 },
        ];
        fakeVault.CustomApplicationManagementOperations.LicenseStatusByAppId["{58E4F21F-A933-417D-9C9D-DCC7EA170EE3}"] = 4; // Valid
        using var handle = new VaultHandle(fakeVault, "{VAULT}", "Conformity");

        var result = await handle.GetCustomApplicationsAsync();

        var app = Assert.Single(result);
        Assert.Equal("{58E4F21F-A933-417D-9C9D-DCC7EA170EE3}", app.ApplicationId);
        Assert.Equal("M-Files Compliance Kit", app.Name);
        Assert.Equal("1.2.3", app.Version);
        Assert.True(app.Enabled);
        Assert.Equal(4, app.LicenseStatus);
    }

    [Fact]
    public async Task GetCustomApplicationsAsync_NoApplications_ReturnsEmpty()
    {
        var fakeVault = new FakeVault();
        using var handle = new VaultHandle(fakeVault, "{VAULT}", "Conformity");

        var result = await handle.GetCustomApplicationsAsync();

        Assert.Empty(result);
    }

    [Fact]
    public async Task GetNamedValuesAsync_MapsComShapeVerbatim()
    {
        var fakeVault = new FakeVault();
        fakeVault.NamedValueStorageOperations.ValuesByTypeAndNamespace[(3, "{APP-ID}")] = new FakeNamedValues
        {
            Entries = new Dictionary<string, object?>
            {
                ["Connecteur_Endpoint_Acomba"] = "https://acomba.example.local/api",
                ["RetryCount"] = 3,
            },
        };
        using var handle = new VaultHandle(fakeVault, "{VAULT}", "Conformity");

        var result = await handle.GetNamedValuesAsync(3, "{APP-ID}");

        Assert.Equal(2, result.Count);
        Assert.Contains(result, e => e.Key == "Connecteur_Endpoint_Acomba" && e.ValueText == "https://acomba.example.local/api");
        Assert.Contains(result, e => e.Key == "RetryCount" && e.ValueText == "3");
    }

    [Fact]
    public async Task GetNamedValuesAsync_UnknownNamespace_ReturnsEmpty()
    {
        var fakeVault = new FakeVault();
        using var handle = new VaultHandle(fakeVault, "{VAULT}", "Conformity");

        var result = await handle.GetNamedValuesAsync(3, "{UNKNOWN}");

        Assert.Empty(result);
    }
}
