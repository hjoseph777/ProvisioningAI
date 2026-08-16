using Microsoft.EntityFrameworkCore;
using ProvisioningAI.Data;
using ProvisioningAI.Data.Models;

namespace ProvisioningAI.Tests.Data;

public class ProvisioningAiDbContextTests
{
    private ProvisioningAiDbContext CreateContext()
    {
        var options = new DbContextOptionsBuilder<ProvisioningAiDbContext>()
            .UseSqlite("DataSource=:memory:")
            .Options;

        var context = new ProvisioningAiDbContext(options);
        context.Database.OpenConnection();
        context.Database.EnsureCreated();
        return context;
    }

    [Fact]
    public void DbContext_CanSaveAndRetrieveEntities()
    {
        // Arrange
        using var context = CreateContext();
        var vaultGuid = Guid.NewGuid().ToString();

        var vaultStructure = VaultStructure.Create(vaultGuid, "TestVault", DateTime.UtcNow);
        var objectType = ObjectType.Create(vaultGuid, "TestVault", Guid.NewGuid().ToString(), 123, "TestType", "Test Type", true);

        // Act
        context.VaultStructures.Add(vaultStructure);
        context.ObjectTypes.Add(objectType);
        context.SaveChanges();

        // Assert
        var savedVault = context.VaultStructures.Single(v => v.VaultGuid == vaultGuid);
        Assert.Equal("TestVault", savedVault.VaultName);

        var savedType = context.ObjectTypes.Single(o => o.MFilesId == 123);
        Assert.Equal("TestType", savedType.Name);
    }

    [Fact]
    public void DbContext_EnforcesUniqueConstraintOnWorkflowTransition()
    {
        // Arrange
        using var context = CreateContext();
        var vaultId = Guid.NewGuid().ToString();
        var w1 = ProvisioningAI.Data.Models.Workflow.Create(vaultId, "Test Vault", Guid.NewGuid().ToString(), 1, "W1", null);
        var s1 = WorkflowState.Create(vaultId, "Test Vault", Guid.NewGuid().ToString(), 1, w1.Guid, "S1", true, false);
        var s2 = WorkflowState.Create(vaultId, "Test Vault", Guid.NewGuid().ToString(), 2, w1.Guid, "S2", false, true);
        var s3 = WorkflowState.Create(vaultId, "Test Vault", Guid.NewGuid().ToString(), 3, w1.Guid, "S3", false, true);
        
        context.VaultStructures.Add(VaultStructure.Create(vaultId, "Test Vault", DateTime.UtcNow));
        context.Workflows.Add(w1);
        context.WorkflowStates.AddRange(s1, s2, s3);
        context.SaveChanges();

        var t1 = WorkflowTransition.Create(vaultId, "Test Vault", w1.Guid, 1, s1.Guid, s2.Guid, null, null);
        var t2 = WorkflowTransition.Create(vaultId, "Test Vault", w1.Guid, 1, s1.Guid, s3.Guid, "{\"condition\": \"reject\"}", null);

        // Act
        context.WorkflowTransitions.Add(t1);
        context.SaveChanges();

        context.WorkflowTransitions.Add(t2);

        // Assert
        Assert.Throws<DbUpdateException>(() => context.SaveChanges());
    }

    [Fact]
    public void DbContext_QueriesUsingLowercaseUnbracedGuid_ShouldSucceed()
    {
        // Arrange
        using var context = CreateContext();
        var vaultGuidRaw = "e7e445be-7777-4444-9999-abcdefabcdef";
        var vaultGuidCanonical = "{" + vaultGuidRaw.ToUpperInvariant() + "}";
        var propertyGuidRaw = "12345678-1234-1234-1234-1234567890ab";
        
        // Setup vault first to satisfy FK
        var vaultStructure = VaultStructure.Create(vaultGuidRaw, "TestVault", DateTime.UtcNow);
        context.VaultStructures.Add(vaultStructure);
        
        var property = Property.Create(vaultGuidRaw, "TestVault", propertyGuidRaw, 1, "TestProp", 1);
        context.Properties.Add(property);
        context.SaveChanges();
        
        // Clear tracker to force read from DB
        context.ChangeTracker.Clear();
        
        // Act - Query using lowercase, unbraced raw guid
        var foundProperty = context.Properties.FirstOrDefault(p => p.Guid == propertyGuidRaw);
        var foundVault = context.VaultStructures.FirstOrDefault(v => v.VaultGuid == vaultGuidRaw);
        
        // Assert
        Assert.NotNull(foundProperty);
        Assert.Equal("{" + propertyGuidRaw.ToUpperInvariant() + "}", foundProperty.Guid);
        Assert.NotNull(foundVault);
        Assert.Equal(vaultGuidCanonical, foundVault.VaultGuid);
    }
}
