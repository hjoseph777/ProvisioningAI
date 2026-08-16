using Microsoft.EntityFrameworkCore;
using ProvisioningAI.Data;

namespace ProvisioningAI.Discovery.Services;

/// <summary>
/// Resolves the raw numeric IDs Stage 5 deliberately left unresolved in
/// WorkflowState.Actions (recipient/assignee user-or-group IDs, property def IDs)
/// against what Stage 6 (users/groups) and Stage 3 (properties) have indexed.
/// This is a query-time join across already-scanned tables — it does not touch
/// or rewrite the stored verbatim JSON; it produces a human-legible VIEW on top
/// of it. MFUserOrUserGroupType: 1=UserAccount, 2=UserGroup, 3=PseudoUser (both
/// resolve against UserAccounts — pseudo-users are real entries in the Users
/// built-in value list), 4=PropertyBasedPseudoUser (no static name — the actual
/// user is determined per-object from a property value at runtime, not resolvable
/// from the index).
/// </summary>
public sealed class WorkflowActionResolver
{
    private readonly ProvisioningAiDbContext _context;

    public WorkflowActionResolver(ProvisioningAiDbContext context)
    {
        _context = context;
    }

    public async Task<string?> ResolvePrincipalNameAsync(string vaultGuid, int userOrGroupType, int userOrGroupId, CancellationToken ct = default)
    {
        return userOrGroupType switch
        {
            1 or 3 => (await _context.UserAccounts
                .FirstOrDefaultAsync(u => u.VaultGuid == vaultGuid && u.MFilesId == userOrGroupId, ct))?.LoginName,
            2 => (await _context.UserGroups
                .FirstOrDefaultAsync(g => g.VaultGuid == vaultGuid && g.MFilesId == userOrGroupId, ct))?.Name,
            _ => null,
        };
    }

    public async Task<string?> ResolvePropertyNameAsync(string vaultGuid, int propertyDefMFilesId, CancellationToken ct = default)
    {
        return (await _context.Properties
            .FirstOrDefaultAsync(p => p.VaultGuid == vaultGuid && p.MFilesId == propertyDefMFilesId, ct))?.Name;
    }
}
