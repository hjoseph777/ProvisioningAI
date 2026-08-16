using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using ProvisioningAI.Data;
using ProvisioningAI.Data.Models;
using ProvisioningAI.Data.Repositories;
using ProvisioningAI.MFilesConnectors;

namespace ProvisioningAI.Discovery.Services;

/// <summary>
/// Stage 6: users, groups, named ACLs (claude.md §4.4). Three complementary COM
/// sources, confirmed live (2026-07-27):
///   - User/UserGroup GUIDs: neither IUserAccount nor IUserGroup exposes a .GUID
///     property directly. Both resolve via their respective built-in value lists
///     (MFBuiltInValueList.Users=6, UserGroups=16) — confirmed live that these
///     carry real GUIDs per entry, same reconciliation pattern as Workflow/State
///     in Stage 5. Includes negative-ID pseudo-users verbatim (e.g. "(current
///     user)") — they are real, resolvable recipients in ACLs and workflow actions.
///   - NamedACL GUIDs come directly off INamedACL.GUID — no value-list workaround
///     needed, unlike User/UserGroup.
///   - Structure: GetUserAccounts(), GetUserGroupsAdmin(), GetNamedACLsAdmin().
///
/// UserGroup membership (IUserGroup.Members, raw numeric user IDs) is resolved to
/// UserAccount GUIDs within this same scan and stored as UserGroupMember rows —
/// same discipline as ClassProperty resolving PropertyDef IDs in Task A.
///
/// ACL data (AccessControlListForNamedACL) is captured verbatim via
/// AccessControlList.GetAsBytes(), Base64-encoded — M-Files' own binary
/// serialization, not decoded into individual ACEs here.
///
/// This is also the natural completion of what Stage 5 deliberately deferred:
/// the raw recipient/assignee IDs captured in WorkflowState.Actions can now be
/// resolved against UserAccount/UserGroup (see WorkflowActionResolver).
/// </summary>
public sealed class UsersGroupsAclsScanner
{
    private readonly IMFilesConnector _connector;
    private readonly ProvisioningAiDbContext _context;
    private readonly IRepository<UserAccount> _userAccountRepository;
    private readonly IRepository<UserGroup> _userGroupRepository;
    private readonly IRepository<UserGroupMember> _userGroupMemberRepository;
    private readonly IRepository<NamedAcl> _namedAclRepository;
    private readonly ILogger<UsersGroupsAclsScanner> _logger;

    public UsersGroupsAclsScanner(
        IMFilesConnector connector,
        ProvisioningAiDbContext context,
        IRepository<UserAccount> userAccountRepository,
        IRepository<UserGroup> userGroupRepository,
        IRepository<UserGroupMember> userGroupMemberRepository,
        IRepository<NamedAcl> namedAclRepository,
        ILogger<UsersGroupsAclsScanner> logger)
    {
        _connector = connector;
        _context = context;
        _userAccountRepository = userAccountRepository;
        _userGroupRepository = userGroupRepository;
        _userGroupMemberRepository = userGroupMemberRepository;
        _namedAclRepository = namedAclRepository;
        _logger = logger;
    }

    /// <param name="vaultGuid">The vault GUID as returned by GetOnlineVaults() — the identity anchor.</param>
    /// <param name="vaultName">The vault's current display name, recorded verbatim into any GUID-guard failure message.</param>
    /// <param name="scanId">The DiscoveryScan row this stage's writes are stamped with (LastSeenScanId).</param>
    public async Task<UsersGroupsAclsScanResult> ScanAsync(
        string vaultGuid,
        string vaultName,
        int scanId,
        CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(vaultGuid))
            throw new ArgumentException("vaultGuid is required — it is the identity anchor.", nameof(vaultGuid));

        using var vault = await _connector.LogInToVaultAsync(vaultGuid, ct);

        var userGuidItems = await vault.GetValueListItemsAsync(MFilesBuiltInValueListIds.Users, ct);
        var groupGuidItems = await vault.GetValueListItemsAsync(MFilesBuiltInValueListIds.UserGroups, ct);
        var userGuidByMFilesId = userGuidItems.ToDictionary(i => i.MFilesId, i => i.Guid);
        var groupGuidByMFilesId = groupGuidItems.ToDictionary(i => i.MFilesId, i => i.Guid);

        var rawAccounts = await vault.GetUserAccountsAsync(ct);
        var userRows = new List<UserAccount>();
        foreach (var acc in rawAccounts)
        {
            if (!userGuidByMFilesId.TryGetValue(acc.MFilesId, out var userGuid))
                throw new InvalidOperationException(
                    $"User \"{acc.LoginName}\" (MFilesId {acc.MFilesId}) in vault \"{vaultName}\" has no matching entry " +
                    "in the Users built-in value list — cannot resolve its GUID.");

            userRows.Add(UserAccount.Create(vaultGuid, vaultName, userGuid, acc.MFilesId, acc.LoginName, acc.VaultRoles, acc.InternalUser, acc.Enabled));
        }

        var rawGroups = await vault.GetUserGroupsAdminAsync(ct);
        var groupRows = new List<UserGroup>();
        var membershipRows = new List<UserGroupMember>();
        foreach (var grp in rawGroups)
        {
            if (!groupGuidByMFilesId.TryGetValue(grp.MFilesId, out var groupGuid))
                throw new InvalidOperationException(
                    $"User group \"{grp.Name}\" (MFilesId {grp.MFilesId}) in vault \"{vaultName}\" has no matching entry " +
                    "in the UserGroups built-in value list — cannot resolve its GUID.");

            groupRows.Add(UserGroup.Create(vaultGuid, vaultName, groupGuid, grp.MFilesId, grp.Name, grp.Predefined));

            foreach (var memberId in grp.MemberMFilesIds)
            {
                if (!userGuidByMFilesId.TryGetValue(memberId, out var memberGuid))
                    throw new InvalidOperationException(
                        $"User group \"{grp.Name}\" (MFilesId {grp.MFilesId}) in vault \"{vaultName}\" has member MFilesId {memberId}, " +
                        "not found among this scan's users. Refusing to write an unresolved UserGroupMember reference.");

                membershipRows.Add(UserGroupMember.Create(vaultGuid, vaultName, grp.Name, groupGuid, memberGuid));
            }
        }

        var rawAcls = await vault.GetNamedAclsAdminAsync(ct);
        var aclRows = rawAcls
            .Select(a => NamedAcl.Create(vaultGuid, vaultName, a.Guid, a.MFilesId, a.Name, a.NamedAclType, a.AclBase64))
            .ToList();

        await using var transaction = await _context.Database.BeginTransactionAsync(ct);
        await _userAccountRepository.UpsertManyNoTransactionAsync(userRows, scanId);
        await _userGroupRepository.UpsertManyNoTransactionAsync(groupRows, scanId);
        await _userGroupMemberRepository.UpsertManyNoTransactionAsync(membershipRows, scanId);
        await _namedAclRepository.UpsertManyNoTransactionAsync(aclRows, scanId);
        await transaction.CommitAsync(ct);

        _logger.LogInformation(
            "Stage 6 — users/groups/ACLs: {UserCount} users, {GroupCount} groups, {MembershipCount} memberships, {AclCount} named ACLs scanned for {VaultName} ({VaultGuid})",
            userRows.Count, groupRows.Count, membershipRows.Count, aclRows.Count, vaultName, vaultGuid);

        return new UsersGroupsAclsScanResult(vaultGuid, userRows.Count, groupRows.Count, membershipRows.Count, aclRows.Count);
    }
}
