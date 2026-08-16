using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using ProvisioningAI.Data;
using ProvisioningAI.Data.Models;
using ProvisioningAI.Data.Repositories;
using ProvisioningAI.Discovery.Services;
using ProvisioningAI.MFilesConnectors;

namespace ProvisioningAI.Tests.Discovery;

/// <summary>
/// Unit tests for Stage 6: users, groups, named ACLs.
/// No live vault — connector and vault handle are mocked; repositories run
/// against a real in-memory SQLite context.
/// </summary>
public sealed class UsersGroupsAclsScannerTests : IDisposable
{
    private const string VaultGuid = "{008446DF-32AA-4E9C-8C43-9FEC4D0A1203}";
    private const string VaultName = "Conformity_CP1_Tergos.mfb";
    private const int ScanId = 1;

    private const string CurrentUserGuid = "{11111111-1111-1111-1111-111111111111}";
    private const string HarryGuid = "{22222222-2222-2222-2222-222222222222}";
    private const string InternalGroupGuid = "{33333333-3333-3333-3333-333333333333}";
    private const string FinanceAclGuid = "{44444444-4444-4444-4444-444444444444}";

    private readonly ProvisioningAiDbContext _db;
    private readonly GenericRepository<UserAccount> _userAccountRepo;
    private readonly GenericRepository<UserGroup> _userGroupRepo;
    private readonly UserGroupMemberRepository _userGroupMemberRepo;
    private readonly GenericRepository<NamedAcl> _namedAclRepo;
    private readonly Mock<IMFilesConnector> _connectorMock;
    private readonly Mock<IVaultHandle> _vaultHandleMock;
    private readonly UsersGroupsAclsScanner _scanner;

    public UsersGroupsAclsScannerTests()
    {
        var options = new DbContextOptionsBuilder<ProvisioningAiDbContext>()
            .UseSqlite("DataSource=:memory:")
            .Options;
        _db = new ProvisioningAiDbContext(options);
        _db.Database.OpenConnection();
        _db.Database.EnsureCreated();

        _db.VaultStructures.Add(VaultStructure.Create(VaultGuid, VaultName, DateTime.UtcNow));
        _db.DiscoveryScans.Add(new DiscoveryScan { ScanId = ScanId, VaultGuid = VaultGuid, VaultName = VaultName, StartedAt = DateTime.UtcNow, Status = "RUNNING" });
        _db.SaveChanges();

        _userAccountRepo = new GenericRepository<UserAccount>(_db);
        _userGroupRepo = new GenericRepository<UserGroup>(_db);
        _userGroupMemberRepo = new UserGroupMemberRepository(_db);
        _namedAclRepo = new GenericRepository<NamedAcl>(_db);

        _connectorMock = new Mock<IMFilesConnector>();
        _vaultHandleMock = new Mock<IVaultHandle>();
        _vaultHandleMock.SetupGet(v => v.VaultGuid).Returns(VaultGuid);
        _vaultHandleMock.SetupGet(v => v.VaultName).Returns(VaultName);
        _connectorMock
            .Setup(c => c.LogInToVaultAsync(VaultGuid, It.IsAny<CancellationToken>()))
            .ReturnsAsync(_vaultHandleMock.Object);

        _scanner = new UsersGroupsAclsScanner(
            _connectorMock.Object, _db, _userAccountRepo, _userGroupRepo, _userGroupMemberRepo, _namedAclRepo, NullLogger<UsersGroupsAclsScanner>.Instance);
    }

    public void Dispose()
    {
        _db.Database.CloseConnection();
        _db.Dispose();
    }

    private void SetupUserGuids(params ValueListItemInfo[] items)
        => _vaultHandleMock.Setup(v => v.GetValueListItemsAsync(6, It.IsAny<CancellationToken>())).ReturnsAsync((IReadOnlyList<ValueListItemInfo>)items);

    private void SetupGroupGuids(params ValueListItemInfo[] items)
        => _vaultHandleMock.Setup(v => v.GetValueListItemsAsync(16, It.IsAny<CancellationToken>())).ReturnsAsync((IReadOnlyList<ValueListItemInfo>)items);

    private void SetupUserAccounts(params UserAccountInfo[] items)
        => _vaultHandleMock.Setup(v => v.GetUserAccountsAsync(It.IsAny<CancellationToken>())).ReturnsAsync((IReadOnlyList<UserAccountInfo>)items);

    private void SetupUserGroups(params UserGroupAdminInfo[] items)
        => _vaultHandleMock.Setup(v => v.GetUserGroupsAdminAsync(It.IsAny<CancellationToken>())).ReturnsAsync((IReadOnlyList<UserGroupAdminInfo>)items);

    private void SetupNamedAcls(params NamedAclAdminInfo[] items)
        => _vaultHandleMock.Setup(v => v.GetNamedAclsAdminAsync(It.IsAny<CancellationToken>())).ReturnsAsync((IReadOnlyList<NamedAclAdminInfo>)items);

    [Fact]
    public async Task ScanAsync_ResolvesUsersGroupsAndMembershipAndAcls()
    {
        SetupUserGuids(
            new ValueListItemInfo(-100, CurrentUserGuid, "(current user)", false),
            new ValueListItemInfo(50, HarryGuid, "Harry joseph", false));
        SetupGroupGuids(new ValueListItemInfo(1, InternalGroupGuid, "All internal users", false));
        SetupUserAccounts(
            new UserAccountInfo(-100, "(current user)", 0, false, true),
            new UserAccountInfo(50, "Harry joseph", 3078, true, true));
        SetupUserGroups(new UserGroupAdminInfo(1, "All internal users", true, [50]));
        SetupNamedAcls(new NamedAclAdminInfo(12, FinanceAclGuid, "Finance_Access", 1, "AQID"));

        var result = await _scanner.ScanAsync(VaultGuid, VaultName, ScanId);

        Assert.Equal(2, result.UserAccountsScanned);
        Assert.Equal(1, result.UserGroupsScanned);
        Assert.Equal(1, result.MembershipsScanned);
        Assert.Equal(1, result.NamedAclsScanned);

        var users = await _userAccountRepo.GetAllForVaultAsync(VaultGuid);
        Assert.Contains(users, u => u.Guid == HarryGuid && u.LoginName == "Harry joseph");

        var memberships = await _userGroupMemberRepo.GetAllForVaultAsync(VaultGuid);
        var membership = Assert.Single(memberships);
        Assert.Equal(InternalGroupGuid, membership.UserGroupGuid);
        Assert.Equal(HarryGuid, membership.MemberUserAccountGuid);

        var acls = await _namedAclRepo.GetAllForVaultAsync(VaultGuid);
        var acl = Assert.Single(acls);
        Assert.Equal("Finance_Access", acl.Name);
        Assert.Equal("AQID", acl.AclDefinitionJson);
    }

    [Fact]
    public async Task ScanAsync_UserNotInBuiltInValueList_ThrowsBeforeWritingAnything()
    {
        SetupUserGuids(); // empty
        SetupGroupGuids();
        SetupUserAccounts(new UserAccountInfo(50, "Harry joseph", 0, true, true));
        SetupUserGroups();
        SetupNamedAcls();

        await Assert.ThrowsAsync<InvalidOperationException>(() => _scanner.ScanAsync(VaultGuid, VaultName, ScanId));
        Assert.Empty(await _userAccountRepo.GetAllForVaultAsync(VaultGuid));
    }

    [Fact]
    public async Task ScanAsync_GroupMemberNotAmongScannedUsers_ThrowsBeforeWritingAnything()
    {
        SetupUserGuids(new ValueListItemInfo(50, HarryGuid, "Harry joseph", false));
        SetupGroupGuids(new ValueListItemInfo(1, InternalGroupGuid, "All internal users", false));
        SetupUserAccounts(new UserAccountInfo(50, "Harry joseph", 0, true, true));
        // Group references member 999, which isn't among this scan's users.
        SetupUserGroups(new UserGroupAdminInfo(1, "All internal users", true, [999]));
        SetupNamedAcls();

        await Assert.ThrowsAsync<InvalidOperationException>(() => _scanner.ScanAsync(VaultGuid, VaultName, ScanId));
        Assert.Empty(await _userGroupMemberRepo.GetAllForVaultAsync(VaultGuid));
    }

    [Fact]
    public async Task ScanAsync_EmptyGuid_Throws()
    {
        await Assert.ThrowsAsync<ArgumentException>(() => _scanner.ScanAsync("", VaultName, ScanId));
    }
}
