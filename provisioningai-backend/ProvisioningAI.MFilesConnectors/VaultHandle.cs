namespace ProvisioningAI.MFilesConnectors;

/// <summary>
/// Wraps a logged-in Vault COM object. LogOutSilent() is called before the COM
/// handle is released — confirmed the real method name against a live server
/// (2026-07-26); best-effort or not, both steps run even if logout itself
/// throws, since Dispose must never leave the COM object un-released.
/// </summary>
public sealed class VaultHandle : IVaultHandle
{
    private readonly object _vault;

    public string VaultGuid { get; }
    public string VaultName { get; }

    internal VaultHandle(object vault, string vaultGuid, string vaultName)
    {
        _vault = vault;
        VaultGuid = vaultGuid;
        VaultName = vaultName;
    }

    public void Dispose()
    {
        try
        {
            dynamic vault = _vault;
            vault.LogOutSilent();
        }
        catch
        {
            // Logout failing doesn't excuse us from releasing the COM handle below.
        }
        finally
        {
            _vault.CloseComObjectSafe();
        }
    }

    public Task<IReadOnlyList<ValueListInfo>> GetValueListsAsync(CancellationToken cancellationToken = default)
        => Task.Run(() =>
        {
            dynamic vault = _vault;
            object valueLists = vault.ValueListOperations.GetValueLists();
            var result = new List<ValueListInfo>();
            try
            {
                foreach (dynamic vl in (System.Collections.IEnumerable)valueLists)
                {
                    try
                    {
                        result.Add(new ValueListInfo((int)vl.ID, (string)vl.GUID, (string)vl.NameSingular, (bool)vl.RealObjectType, (string)vl.NamePlural));
                    }
                    finally
                    {
                        ((object)vl).CloseComObjectSafe();
                    }
                }
            }
            finally
            {
                valueLists.CloseComObjectSafe();
            }
            return (IReadOnlyList<ValueListInfo>)result;
        }, cancellationToken);

    public Task<IReadOnlyList<ValueListItemInfo>> GetValueListItemsAsync(int valueListId, CancellationToken cancellationToken = default)
        => Task.Run(() =>
        {
            dynamic vault = _vault;
            // Second arg's exact meaning is unconfirmed against docs (both true/false returned
            // the same count in the one live sample tested, 2026-07-26) — true used deliberately
            // as the safer "don't silently exclude anything" choice; Deleted on each item is what
            // actually distinguishes live vs. removed entries.
            object items = vault.ValueListItemOperations.GetValueListItems(valueListId, true);
            var result = new List<ValueListItemInfo>();
            try
            {
                foreach (dynamic item in (System.Collections.IEnumerable)items)
                {
                    try
                    {
                        result.Add(new ValueListItemInfo((int)item.ID, (string)item.ItemGUID, (string)item.Name, (bool)item.Deleted));
                    }
                    finally
                    {
                        ((object)item).CloseComObjectSafe();
                    }
                }
            }
            finally
            {
                items.CloseComObjectSafe();
            }
            return (IReadOnlyList<ValueListItemInfo>)result;
        }, cancellationToken);

    public Task<IReadOnlyList<PropertyDefInfo>> GetPropertyDefsAsync(CancellationToken cancellationToken = default)
        => Task.Run(() =>
        {
            dynamic vault = _vault;
            object propertyDefs = vault.PropertyDefOperations.GetPropertyDefs();
            var result = new List<PropertyDefInfo>();
            try
            {
                foreach (dynamic pd in (System.Collections.IEnumerable)propertyDefs)
                {
                    try
                    {
                        result.Add(new PropertyDefInfo((int)pd.ID, (string)pd.GUID, (string)pd.Name, (int)pd.DataType));
                    }
                    finally
                    {
                        ((object)pd).CloseComObjectSafe();
                    }
                }
            }
            finally
            {
                propertyDefs.CloseComObjectSafe();
            }
            return (IReadOnlyList<PropertyDefInfo>)result;
        }, cancellationToken);

    public Task<IReadOnlyList<ClassInfo>> GetClassesAsync(CancellationToken cancellationToken = default)
        => Task.Run(() =>
        {
            dynamic vault = _vault;
            object classes = vault.ClassOperations.GetAllObjectClasses();
            var result = new List<ClassInfo>();
            try
            {
                foreach (dynamic c in (System.Collections.IEnumerable)classes)
                {
                    try
                    {
                        var associatedProperties = new List<ClassPropertyAssociationInfo>();
                        object associations = c.AssociatedPropertyDefs;
                        try
                        {
                            foreach (dynamic assoc in (System.Collections.IEnumerable)associations)
                            {
                                try
                                {
                                    associatedProperties.Add(new ClassPropertyAssociationInfo((int)assoc.PropertyDef, (bool)assoc.Required));
                                }
                                finally
                                {
                                    ((object)assoc).CloseComObjectSafe();
                                }
                            }
                        }
                        finally
                        {
                            associations.CloseComObjectSafe();
                        }

        result.Add(new ClassInfo((int)c.ID, (string)c.ItemGUID, (string)c.Name, (int)c.ObjectType, associatedProperties));
                    }
                    finally
                    {
                        ((object)c).CloseComObjectSafe();
                    }
                }
            }
            finally
            {
                classes.CloseComObjectSafe();
            }
            return (IReadOnlyList<ClassInfo>)result;
        }, cancellationToken);

    public Task<IReadOnlyList<WorkflowAdminInfo>> GetWorkflowsAdminAsync(CancellationToken cancellationToken = default)
        => Task.Run(() =>
        {
            dynamic vault = _vault;
            object workflowsAdmin = vault.WorkflowOperations.GetWorkflowsAdmin();
            var result = new List<WorkflowAdminInfo>();
            try
            {
                foreach (dynamic wfAdmin in (System.Collections.IEnumerable)workflowsAdmin)
                {
                    try
                    {
                        dynamic workflow = wfAdmin.Workflow;
                        int workflowId;
                        string workflowName;
                        string? workflowDescription;
                        try
                        {
                            workflowId = (int)workflow.ID;
                            workflowName = (string)workflow.Name;
                            workflowDescription = (string?)workflow.Description;
                        }
                        finally
                        {
                            ((object)workflow).CloseComObjectSafe();
                        }

                        var states = new List<WorkflowStateAdminInfo>();
                        object statesAdmin = wfAdmin.States;
                        try
                        {
                            foreach (dynamic st in (System.Collections.IEnumerable)statesAdmin)
                            {
                                try
                                {
                                    var guard = ReadStateGuard(st);
                                    var actions = ReadStateActions(st);
                                    states.Add(new WorkflowStateAdminInfo((int)st.ID, (string)st.Name, guard, actions));
                                }
                                finally
                                {
                                    ((object)st).CloseComObjectSafe();
                                }
                            }
                        }
                        finally
                        {
                            statesAdmin.CloseComObjectSafe();
                        }

                        var transitions = new List<WorkflowTransitionAdminInfo>();
                        object stateTransitions = wfAdmin.StateTransitions;
                        try
                        {
                            foreach (dynamic tr in (System.Collections.IEnumerable)stateTransitions)
                            {
                                try
                                {
                                    string? triggerCriteriaExported = null;
                                    dynamic criteria = tr.TriggerCriteria;
                                    try
                                    {
                                        if ((int)criteria.Count > 0)
                                            triggerCriteriaExported = (string)criteria.GetAsExportedSearchString(0);
                                    }
                                    finally
                                    {
                                        ((object)criteria).CloseComObjectSafe();
                                    }

                                    transitions.Add(new WorkflowTransitionAdminInfo(
                                        (int)tr.ID,
                                        (int)tr.FromState,
                                        (int)tr.ToState,
                                        (string)tr.Name,
                                        (int)tr.TriggerMode,
                                        (int)tr.TriggerInDays,
                                        (string?)tr.TriggerAllowedByVBScript,
                                        triggerCriteriaExported));
                                }
                                finally
                                {
                                    ((object)tr).CloseComObjectSafe();
                                }
                            }
                        }
                        finally
                        {
                            stateTransitions.CloseComObjectSafe();
                        }

                        result.Add(new WorkflowAdminInfo(workflowId, workflowName, workflowDescription, states, transitions));
                    }
                    finally
                    {
                        ((object)wfAdmin).CloseComObjectSafe();
                    }
                }
            }
            finally
            {
                workflowsAdmin.CloseComObjectSafe();
            }
            return (IReadOnlyList<WorkflowAdminInfo>)result;
        }, cancellationToken);

    public Task<IReadOnlyList<UserAccountInfo>> GetUserAccountsAsync(CancellationToken cancellationToken = default)
        => Task.Run(() =>
        {
            dynamic vault = _vault;
            object accounts = vault.UserOperations.GetUserAccounts();
            var result = new List<UserAccountInfo>();
            try
            {
                foreach (dynamic a in (System.Collections.IEnumerable)accounts)
                {
                    try
                    {
                        result.Add(new UserAccountInfo(
                            (int)a.ID, (string)a.LoginName, (int)a.VaultRoles, (bool)a.InternalUser, (bool)a.Enabled));
                    }
                    finally
                    {
                        ((object)a).CloseComObjectSafe();
                    }
                }
            }
            finally
            {
                accounts.CloseComObjectSafe();
            }
            return (IReadOnlyList<UserAccountInfo>)result;
        }, cancellationToken);

    public Task<IReadOnlyList<UserGroupAdminInfo>> GetUserGroupsAdminAsync(CancellationToken cancellationToken = default)
        => Task.Run(() =>
        {
            dynamic vault = _vault;
            object groupsAdmin = vault.UserGroupOperations.GetUserGroupsAdmin();
            var result = new List<UserGroupAdminInfo>();
            try
            {
                foreach (dynamic ga in (System.Collections.IEnumerable)groupsAdmin)
                {
                    try
                    {
                        dynamic group = ga.UserGroup;
                        try
                        {
                            var members = new List<int>();
                            object memberIds = group.Members;
                            try
                            {
                                foreach (var memberId in (System.Collections.IEnumerable)memberIds)
                                    members.Add((int)memberId);
                            }
                            finally
                            {
                                memberIds.CloseComObjectSafe();
                            }

                            result.Add(new UserGroupAdminInfo((int)group.ID, (string)group.Name, (bool)group.Predefined, members));
                        }
                        finally
                        {
                            ((object)group).CloseComObjectSafe();
                        }
                    }
                    finally
                    {
                        ((object)ga).CloseComObjectSafe();
                    }
                }
            }
            finally
            {
                groupsAdmin.CloseComObjectSafe();
            }
            return (IReadOnlyList<UserGroupAdminInfo>)result;
        }, cancellationToken);

    public Task<IReadOnlyList<NamedAclAdminInfo>> GetNamedAclsAdminAsync(CancellationToken cancellationToken = default)
        => Task.Run(() =>
        {
            dynamic vault = _vault;
            object aclsAdmin = vault.NamedACLOperations.GetNamedACLsAdmin();
            var result = new List<NamedAclAdminInfo>();
            try
            {
                foreach (dynamic aa in (System.Collections.IEnumerable)aclsAdmin)
                {
                    try
                    {
                        dynamic namedAcl = aa.NamedACL;
                        int mfilesId;
                        string guid;
                        string name;
                        int aclType;
                        try
                        {
                            mfilesId = (int)namedAcl.ID;
                            guid = (string)namedAcl.GUID;
                            name = (string)namedAcl.Name;
                            aclType = (int)namedAcl.NamedACLType;
                        }
                        finally
                        {
                            ((object)namedAcl).CloseComObjectSafe();
                        }

                        string? aclBase64 = null;
                        dynamic acl = aa.AccessControlListForNamedACL;
                        try
                        {
                            byte[] aclBytes = (byte[])acl.GetAsBytes();
                            aclBase64 = Convert.ToBase64String(aclBytes);
                        }
                        finally
                        {
                            ((object)acl).CloseComObjectSafe();
                        }

                        result.Add(new NamedAclAdminInfo(mfilesId, guid, name, aclType, aclBase64));
                    }
                    finally
                    {
                        ((object)aa).CloseComObjectSafe();
                    }
                }
            }
            finally
            {
                aclsAdmin.CloseComObjectSafe();
            }
            return (IReadOnlyList<NamedAclAdminInfo>)result;
        }, cancellationToken);

    public Task<IReadOnlyList<ViewInfo>> GetViewsAsync(CancellationToken cancellationToken = default)
        => Task.Run(() =>
        {
            dynamic vault = _vault;
            int currentUserId = (int)vault.CurrentLoggedInUserID;
            object views = vault.ViewOperations.GetViewsAdmin(true, currentUserId);
            var result = new List<ViewInfo>();
            try
            {
                foreach (dynamic v in (System.Collections.IEnumerable)views)
                {
                    try
                    {
                        string? searchConditionsExported = null;
                        object criteria = v.SearchConditions;
                        if (criteria is not null)
                        {
                            dynamic dynamicCriteria = criteria;
                            try
                            {
                                if ((int)dynamicCriteria.Count > 0)
                                    searchConditionsExported = (string)dynamicCriteria.GetAsExportedSearchString(0);
                            }
                            finally
                            {
                                ((object)dynamicCriteria).CloseComObjectSafe();
                            }
                        }

                        // IView.Parent throws COMException 0x80040001 ("The parameter is
                        // incorrect") when HasParent is false — confirmed live (2026-07-27)
                        // by isolating this from GetViewsAdmin's own arguments (proved fine
                        // via a raw PowerShell COM repro with identical values). Reading
                        // .Parent unconditionally, not the enclosing call, was the fault —
                        // never read it without checking HasParent first.
                        bool hasParent = (bool)v.HasParent;
                        int parentMFilesId = hasParent ? (int)v.Parent : 0;

                        result.Add(new ViewInfo(
                            (int)v.ID, (string)v.GUID, (string)v.Name, (bool)v.Common, hasParent, parentMFilesId, searchConditionsExported));
                    }
                    finally
                    {
                        ((object)v).CloseComObjectSafe();
                    }
                }
            }
            finally
            {
                views.CloseComObjectSafe();
            }
            return (IReadOnlyList<ViewInfo>)result;
        }, cancellationToken);

    public Task<IReadOnlyList<CustomApplicationInfo>> GetCustomApplicationsAsync(CancellationToken cancellationToken = default)
        => Task.Run(() =>
        {
            dynamic vault = _vault;
            const int mfCustomApplicationTypeServer = 2;
            const int mfExtApplicationPlatformNone = 0;
            object apps = vault.CustomApplicationManagementOperations.GetCustomApplicationsEx2(mfCustomApplicationTypeServer, mfExtApplicationPlatformNone);
            var result = new List<CustomApplicationInfo>();
            try
            {
                foreach (dynamic app in (System.Collections.IEnumerable)apps)
                {
                    try
                    {
                        string appId = (string)app.ID;
                        int licenseStatus = (int)vault.CustomApplicationManagementOperations.GetCustomApplicationLicenseStatus(appId);

                        result.Add(new CustomApplicationInfo(
                            appId, (string)app.Name, (string)app.Version, (string)app.Publisher,
                            (bool)app.Enabled, (int)app.ApplicationType, licenseStatus));
                    }
                    finally
                    {
                        ((object)app).CloseComObjectSafe();
                    }
                }
            }
            finally
            {
                apps.CloseComObjectSafe();
            }
            return (IReadOnlyList<CustomApplicationInfo>)result;
        }, cancellationToken);

    public Task<IReadOnlyList<NamedValueEntryInfo>> GetNamedValuesAsync(int namedValueType, string namespaceName, CancellationToken cancellationToken = default)
        => Task.Run(() =>
        {
            dynamic vault = _vault;
            dynamic namedValues = vault.NamedValueStorageOperations.GetNamedValues(namedValueType, namespaceName);
            var result = new List<NamedValueEntryInfo>();
            try
            {
                object names = namedValues.Names;
                try
                {
                    foreach (string name in (System.Collections.IEnumerable)names)
                    {
                        object? value = namedValues.Value(name);
                        result.Add(new NamedValueEntryInfo(name, value?.ToString()));
                    }
                }
                finally
                {
                    names.CloseComObjectSafe();
                }
            }
            finally
            {
                ((object)namedValues).CloseComObjectSafe();
            }
            return (IReadOnlyList<NamedValueEntryInfo>)result;
        }, cancellationToken);

    private static IReadOnlyList<WorkflowActionPrincipalInfo> ReadPrincipals(object idsObj)
    {
        dynamic ids = idsObj;
        var result = new List<WorkflowActionPrincipalInfo>();
        try
        {
            foreach (dynamic id in (System.Collections.IEnumerable)ids)
            {
                try
                {
                    result.Add(new WorkflowActionPrincipalInfo((int)id.UserOrGroupType, (int)id.UserOrGroupID));
                }
                finally
                {
                    ((object)id).CloseComObjectSafe();
                }
            }
        }
        finally
        {
            ((object)ids).CloseComObjectSafe();
        }
        return result;
    }

    /// <summary>Preconditions/Postconditions off a state — same verbatim-export discipline as transition TriggerCriteria.</summary>
    private static WorkflowStateGuardInfo ReadStateGuard(dynamic stateAdmin)
    {
        bool preEnabled, preVBEnabled, postEnabled, postVBEnabled;
        string? preExported = null, preVB, postExported = null, postVB;

        dynamic pre = stateAdmin.Preconditions;
        try
        {
            preEnabled = (bool)pre.PropertyConditions;
            preVBEnabled = (bool)pre.VBScript;
            preVB = (string?)pre.VBScriptDefinition;
            if (preEnabled)
            {
                dynamic preConds = pre.PropertyConditionsDefinition;
                try
                {
                    if ((int)preConds.Count > 0)
                        preExported = (string)preConds.GetAsExportedSearchString(0);
                }
                finally
                {
                    ((object)preConds).CloseComObjectSafe();
                }
            }
        }
        finally
        {
            ((object)pre).CloseComObjectSafe();
        }

        dynamic post = stateAdmin.Postconditions;
        try
        {
            postEnabled = (bool)post.PropertyConditions;
            postVBEnabled = (bool)post.VBScript;
            postVB = (string?)post.VBScriptDefinition;
            if (postEnabled)
            {
                dynamic postConds = post.PropertyConditionsDefinition;
                try
                {
                    if ((int)postConds.Count > 0)
                        postExported = (string)postConds.GetAsExportedSearchString(0);
                }
                finally
                {
                    ((object)postConds).CloseComObjectSafe();
                }
            }
        }
        finally
        {
            ((object)post).CloseComObjectSafe();
        }

        return new WorkflowStateGuardInfo(preEnabled, preExported, preVBEnabled, preVB, postEnabled, postExported, postVBEnabled, postVB);
    }

    /// <summary>
    /// A state's 9 action-enabled flags plus each enabled action's typed definition,
    /// read only when its flag is true (COM always returns a valid-but-default object
    /// otherwise — reading it unconditionally would just capture noise).
    /// </summary>
    private static WorkflowStateActionsInfo ReadStateActions(dynamic stateAdmin)
    {
        bool actSetPerm = (bool)stateAdmin.ActionSetPermissions;
        bool actDelete = (bool)stateAdmin.ActionDelete;
        bool actArchive = (bool)stateAdmin.ActionMarkForArchiving;
        bool actAssign = (bool)stateAdmin.ActionAssignToUser;
        bool actNotify = (bool)stateAdmin.ActionSendNotification;
        bool actSetProps = (bool)stateAdmin.ActionSetProperties;
        bool actVBScript = (bool)stateAdmin.ActionRunVBScript;
        bool actPdf = (bool)stateAdmin.ActionConvertToPDF;
        bool actSeparateAssign = (bool)stateAdmin.ActionCreateSeparateAssignment;

        string? runVBScriptText = actVBScript ? (string?)stateAdmin.ActionRunVBScriptDefinition : null;

        WorkflowSendNotificationActionInfo? sendNotification = null;
        if (actNotify)
        {
            dynamic def = stateAdmin.ActionSendNotificationDefinition;
            try
            {
                object recipients = def.Recipients;
                sendNotification = new WorkflowSendNotificationActionInfo(
                    (string?)def.Subject, (string?)def.Message, ReadPrincipals(recipients));
            }
            finally
            {
                ((object)def).CloseComObjectSafe();
            }
        }

        static WorkflowAssignmentActionInfo ReadAssignment(dynamic def)
        {
            object assignedTo = def.AssignedToUsers;
            object monitoredBy = def.MonitoredByUsers;
            return new WorkflowAssignmentActionInfo(
                (string?)def.Title, (string?)def.Description, (bool)def.Deadline, (int)def.DeadlineInDays,
                (int)def.Class, ReadPrincipals(assignedTo), ReadPrincipals(monitoredBy));
        }

        WorkflowAssignmentActionInfo? assignToUser = null;
        if (actAssign)
        {
            dynamic def = stateAdmin.ActionAssignToUserDefinition;
            try { assignToUser = ReadAssignment(def); }
            finally { ((object)def).CloseComObjectSafe(); }
        }

        WorkflowAssignmentActionInfo? createSeparateAssignment = null;
        if (actSeparateAssign)
        {
            dynamic def = stateAdmin.ActionCreateSeparateAssignmentDefinition;
            try { createSeparateAssignment = ReadAssignment(def); }
            finally { ((object)def).CloseComObjectSafe(); }
        }

        List<WorkflowSetPropertyActionInfo>? setProperties = null;
        if (actSetProps)
        {
            dynamic def = stateAdmin.ActionSetPropertiesDefinition;
            try
            {
                object properties = def.Properties;
                setProperties = new List<WorkflowSetPropertyActionInfo>();
                try
                {
                    foreach (dynamic prop in (System.Collections.IEnumerable)properties)
                    {
                        try
                        {
                            var type = (int)prop.Type;
                            string? fixedValueJson = null;
                            if (type == 1) // MFDefaultPropertyTypeFixedValue
                            {
                                dynamic fixedValue = prop.DataFixedValueValue;
                                try { fixedValueJson = (string)fixedValue.ToJSON(); }
                                finally { ((object)fixedValue).CloseComObjectSafe(); }
                            }
                            setProperties.Add(new WorkflowSetPropertyActionInfo((int)prop.PropertyDefID, type, fixedValueJson));
                        }
                        finally
                        {
                            ((object)prop).CloseComObjectSafe();
                        }
                    }
                }
                finally
                {
                    ((object)properties).CloseComObjectSafe();
                }
            }
            finally
            {
                ((object)def).CloseComObjectSafe();
            }
        }

        string? setPermissionsAclBase64 = null;
        bool setPermissionsDiscardsAutomatic = false;
        if (actSetPerm)
        {
            dynamic def = stateAdmin.ActionSetPermissionsDetailedDefinition;
            try
            {
                setPermissionsDiscardsAutomatic = (bool)def.DiscardsAutomaticPermissions;
                dynamic acl = def.Permissions;
                try
                {
                    byte[] aclBytes = (byte[])acl.GetAsBytes();
                    setPermissionsAclBase64 = Convert.ToBase64String(aclBytes);
                }
                finally
                {
                    ((object)acl).CloseComObjectSafe();
                }
            }
            finally
            {
                ((object)def).CloseComObjectSafe();
            }
        }

        WorkflowConvertToPdfActionInfo? convertToPdf = null;
        if (actPdf)
        {
            dynamic def = stateAdmin.ActionConvertToPDFDefinition;
            try
            {
                convertToPdf = new WorkflowConvertToPdfActionInfo(
                    (bool)def.PDFA1b, (bool)def.StoreAsSeparateFile, (bool)def.OverwriteExistingFile, (bool)def.FailOnUnsupportedSourceFiles);
            }
            finally
            {
                ((object)def).CloseComObjectSafe();
            }
        }

        return new WorkflowStateActionsInfo(
            actSetPerm, actDelete, actArchive, actAssign, actNotify, actSetProps, actVBScript, actPdf, actSeparateAssign,
            runVBScriptText, sendNotification, assignToUser, createSeparateAssignment, setProperties,
            setPermissionsAclBase64, setPermissionsDiscardsAutomatic, convertToPdf);
    }
}
