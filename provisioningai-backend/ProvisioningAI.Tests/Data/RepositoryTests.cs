using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using ProvisioningAI.Data;
using ProvisioningAI.Data.Models;
using ProvisioningAI.Data.Repositories;
using Xunit;

namespace ProvisioningAI.Tests.Data;

public class RepositoryTests
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
    public async Task GenericRepository_Upsert_WorksAsExpected()
    {
        using var context = CreateContext();
        var vaultGuid = "{AAAAAAAA-1111-2222-3333-BBBBBBBBBBBB}";
        var vault = VaultStructure.Create(vaultGuid, "Test", DateTime.UtcNow);
        
        var scan = DiscoveryScan.Create(vaultGuid, "Test", DateTime.UtcNow, "completed");
        
        context.VaultStructures.Add(vault);
        context.DiscoveryScans.Add(scan);
        await context.SaveChangesAsync();
        
        var scanId = scan.ScanId;
        
        var repo = new GenericRepository<Property>(context);
        
        var propGuid = "{11111111-2222-3333-4444-555555555555}";
        var p1 = Property.Create(vaultGuid, "Test", propGuid, 1, "P1", 1);

        await repo.UpsertAsync(p1, scanId);

        var saved = await context.Properties.SingleAsync();
        Assert.Equal("P1", saved.Name);
        Assert.Equal(scanId, saved.LastSeenScanId);

        // Act: Upsert with new Name and same Guid
        var scan2 = DiscoveryScan.Create(vaultGuid, "Test", DateTime.UtcNow, "completed");
        context.DiscoveryScans.Add(scan2);
        await context.SaveChangesAsync();

        var p2 = Property.Create(vaultGuid, "Test", propGuid, 1, "P2", 1);
        await repo.UpsertAsync(p2, scan2.ScanId);

        // Assert
        saved = await context.Properties.SingleAsync();
        Assert.Equal("P2", saved.Name);
        Assert.Equal(scan2.ScanId, saved.LastSeenScanId);
    }
    
    [Fact]
    public async Task NamedValueStorageRepository_PreservesClassification()
    {
        using var context = CreateContext();
        var vaultGuid = "{AAAAAAAA-1111-2222-3333-BBBBBBBBBBBB}";
        context.VaultStructures.Add(VaultStructure.Create(vaultGuid, "Test", DateTime.UtcNow));
        var scan1 = DiscoveryScan.Create(vaultGuid, "Test", DateTime.UtcNow, "completed");
        var scan2 = DiscoveryScan.Create(vaultGuid, "Test", DateTime.UtcNow, "completed");
        context.DiscoveryScans.AddRange(scan1, scan2);
        await context.SaveChangesAsync();
        
        var repo = new NamedValueStorageRepository(context);
        
        var nvs1 = new NamedValueStorage 
        {
            VaultGuid = vaultGuid, Module = "mod1", Key = "key1", Value = "v1", Classification = "static"
        };
        
        await repo.UpsertAsync(nvs1, 1);
        
        var saved = await context.NamedValueStorages.SingleAsync();
        Assert.Equal("static", saved.Classification);
        Assert.Null(saved.ValueChangedAt);
        
        // Update value with incoming having "unclassified" (default), should preserve "static"
        var nvs2 = new NamedValueStorage 
        {
            VaultGuid = vaultGuid, Module = "mod1", Key = "key1", Value = "v2", Classification = "unclassified"
        };
        
        await repo.UpsertAsync(nvs2, 2);
        
        saved = await context.NamedValueStorages.SingleAsync();
        Assert.Equal("v2", saved.Value);
        Assert.Equal("static", saved.Classification); // PRESERVED
        Assert.NotNull(saved.ValueChangedAt); // SIGNALED
    }
    
    [Fact]
    public async Task GenericRepository_DeleteUnseen_RemovesStaleRows()
    {
        using var context = CreateContext();
        var vaultGuid = "{AAAAAAAA-1111-2222-3333-BBBBBBBBBBBB}";
        context.VaultStructures.Add(VaultStructure.Create(vaultGuid, "Test", DateTime.UtcNow));
        var scan1 = DiscoveryScan.Create(vaultGuid, "Test", DateTime.UtcNow, "completed");
        var scan2 = DiscoveryScan.Create(vaultGuid, "Test", DateTime.UtcNow, "completed");
        context.DiscoveryScans.AddRange(scan1, scan2);
        await context.SaveChangesAsync();
        
        var repo = new GenericRepository<UserGroup>(context);
        
        var u1 = new UserGroup { VaultGuid = vaultGuid, Guid = "{11111111-1111-1111-1111-111111111111}", MFilesId = 1, Name = "G1", IsPredefined = false };
        var u2 = new UserGroup { VaultGuid = vaultGuid, Guid = "{22222222-2222-2222-2222-222222222222}", MFilesId = 2, Name = "G2", IsPredefined = false };
        
        await repo.UpsertAsync(u1, 1);
        await repo.UpsertAsync(u2, 2);
        
        // Run sweep for current scan ID = 2
        await repo.DeleteUnseenAsync(vaultGuid, 2);
        
        var remaining = await context.UserGroups.ToListAsync();
        Assert.Single(remaining);
        Assert.Equal("G2", remaining.First().Name);
    }
}
