using Microsoft.EntityFrameworkCore;
using ProvisioningAI.Data;
using ProvisioningAI.Data.Models;
using ProvisioningAI.Discovery.Services;

namespace ProvisioningAI.Tests.Discovery;

/// <summary>
/// Unit tests for the Stage 5/6 completion: resolving raw recipient/assignee/
/// property IDs captured verbatim in WorkflowState.Actions against the
/// UserAccount/UserGroup/Property tables Stage 6 and Stage 3 already indexed.
/// Query-time resolution only — the stored JSON itself is never rewritten.
/// </summary>
public sealed class WorkflowActionResolverTests : IDisposable
{
    private const string VaultGuid = "{008446DF-32AA-4E9C-8C43-9FEC4D0A1203}";
    private const string VaultName = "Conformity_CP1_Tergos.mfb";

    private readonly ProvisioningAiDbContext _db;
    private readonly WorkflowActionResolver _resolver;

    public WorkflowActionResolverTests()
    {
        var options = new DbContextOptionsBuilder<ProvisioningAiDbContext>()
            .UseSqlite("DataSource=:memory:")
            .Options;
        _db = new ProvisioningAiDbContext(options);
        _db.Database.OpenConnection();
        _db.Database.EnsureCreated();

        _db.VaultStructures.Add(VaultStructure.Create(VaultGuid, VaultName, DateTime.UtcNow));
        _db.Add(UserAccount.Create(VaultGuid, VaultName, "{11111111-1111-1111-1111-111111111111}", 50, "Harry joseph", 3078, true, true));
        _db.Add(UserGroup.Create(VaultGuid, VaultName, "{22222222-2222-2222-2222-222222222222}", 1, "All internal users", true));
        _db.Add(Property.Create(VaultGuid, VaultName, "{33333333-3333-3333-3333-333333333333}", 106, "Vendor Name", 1));
        _db.SaveChanges();

        _resolver = new WorkflowActionResolver(_db);
    }

    public void Dispose()
    {
        _db.Database.CloseConnection();
        _db.Dispose();
    }

    [Fact]
    public async Task ResolvePrincipalNameAsync_UserAccountType_ResolvesLoginName()
    {
        var name = await _resolver.ResolvePrincipalNameAsync(VaultGuid, userOrGroupType: 1, userOrGroupId: 50);
        Assert.Equal("Harry joseph", name);
    }

    [Fact]
    public async Task ResolvePrincipalNameAsync_PseudoUserType_AlsoResolvesAgainstUserAccounts()
    {
        var name = await _resolver.ResolvePrincipalNameAsync(VaultGuid, userOrGroupType: 3, userOrGroupId: 50);
        Assert.Equal("Harry joseph", name);
    }

    [Fact]
    public async Task ResolvePrincipalNameAsync_UserGroupType_ResolvesGroupName()
    {
        var name = await _resolver.ResolvePrincipalNameAsync(VaultGuid, userOrGroupType: 2, userOrGroupId: 1);
        Assert.Equal("All internal users", name);
    }

    [Fact]
    public async Task ResolvePrincipalNameAsync_PropertyBasedPseudoUser_ReturnsNull()
    {
        var name = await _resolver.ResolvePrincipalNameAsync(VaultGuid, userOrGroupType: 4, userOrGroupId: 999);
        Assert.Null(name);
    }

    [Fact]
    public async Task ResolvePrincipalNameAsync_UnknownId_ReturnsNull()
    {
        var name = await _resolver.ResolvePrincipalNameAsync(VaultGuid, userOrGroupType: 1, userOrGroupId: 12345);
        Assert.Null(name);
    }

    [Fact]
    public async Task ResolvePropertyNameAsync_ResolvesPropertyName()
    {
        var name = await _resolver.ResolvePropertyNameAsync(VaultGuid, propertyDefMFilesId: 106);
        Assert.Equal("Vendor Name", name);
    }
}
