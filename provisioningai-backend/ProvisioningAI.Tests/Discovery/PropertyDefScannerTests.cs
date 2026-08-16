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
/// Unit tests for Stage 3: property definitions.
/// No live vault — connector and vault handle are mocked (plain interfaces);
/// the repository runs against a real in-memory SQLite context.
/// </summary>
public sealed class PropertyDefScannerTests : IDisposable
{
    private const string VaultGuid = "{008446DF-32AA-4E9C-8C43-9FEC4D0A1203}";
    private const string VaultName = "Conformity_CP1_Tergos.mfb";
    private const int ScanId = 1;

    private const string NameOrTitleGuid = "{11111111-1111-1111-1111-111111111111}";
    private const string CreatedGuid = "{22222222-2222-2222-2222-222222222222}";
    private const string CustomGuid = "{33333333-3333-3333-3333-333333333333}";

    private readonly ProvisioningAiDbContext _db;
    private readonly GenericRepository<Property> _propertyRepo;
    private readonly Mock<IMFilesConnector> _connectorMock;
    private readonly Mock<IVaultHandle> _vaultHandleMock;
    private readonly PropertyDefScanner _scanner;

    public PropertyDefScannerTests()
    {
        var options = new DbContextOptionsBuilder<ProvisioningAiDbContext>()
            .UseSqlite("DataSource=:memory:")
            .Options;
        _db = new ProvisioningAiDbContext(options);
        _db.Database.OpenConnection();
        _db.Database.EnsureCreated();

        _db.VaultStructures.Add(VaultStructure.Create(VaultGuid, VaultName, DateTime.UtcNow));
        _db.DiscoveryScans.Add(new DiscoveryScan { ScanId = ScanId, VaultGuid = VaultGuid, VaultName = VaultName, StartedAt = DateTime.UtcNow, Status = "RUNNING" });
        _db.DiscoveryScans.Add(new DiscoveryScan { ScanId = ScanId + 1, VaultGuid = VaultGuid, VaultName = VaultName, StartedAt = DateTime.UtcNow, Status = "RUNNING" });
        _db.SaveChanges();

        _propertyRepo = new GenericRepository<Property>(_db);

        _connectorMock = new Mock<IMFilesConnector>();
        _vaultHandleMock = new Mock<IVaultHandle>();
        _vaultHandleMock.SetupGet(v => v.VaultGuid).Returns(VaultGuid);
        _vaultHandleMock.SetupGet(v => v.VaultName).Returns(VaultName);
        _connectorMock
            .Setup(c => c.LogInToVaultAsync(VaultGuid, It.IsAny<CancellationToken>()))
            .ReturnsAsync(_vaultHandleMock.Object);

        _scanner = new PropertyDefScanner(_connectorMock.Object, _propertyRepo, NullLogger<PropertyDefScanner>.Instance);
    }

    public void Dispose()
    {
        _db.Database.CloseConnection();
        _db.Dispose();
    }

    private void SetupPropertyDefs(params PropertyDefInfo[] defs)
        => _vaultHandleMock
            .Setup(v => v.GetPropertyDefsAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync((IReadOnlyList<PropertyDefInfo>)defs);

    // ─── Happy path: built-in and custom property defs both recorded ────────

    [Fact]
    public async Task ScanAsync_RecordsBuiltInAndCustomPropertyDefsAlike()
    {
        SetupPropertyDefs(
            new PropertyDefInfo(0, NameOrTitleGuid, "Name or title", 1),
            new PropertyDefInfo(20, CreatedGuid, "Created", 7),
            new PropertyDefInfo(107, CustomGuid, "Invoice Number", 1));

        var result = await _scanner.ScanAsync(VaultGuid, VaultName, ScanId);

        Assert.Equal(3, result.PropertyDefsScanned);

        var rows = await _propertyRepo.GetAllForVaultAsync(VaultGuid);
        Assert.Equal(3, rows.Count);
        Assert.Contains(rows, p => p.Name == "Name or title" && p.DataType == 1);
        Assert.Contains(rows, p => p.Name == "Created" && p.DataType == 7);
        Assert.Contains(rows, p => p.Name == "Invoice Number" && p.MFilesId == 107);
        Assert.All(rows, p => Assert.Equal(ScanId, p.LastSeenScanId));
    }

    [Fact]
    public async Task ScanAsync_RescansSameVault_UpsertsRatherThanDuplicating()
    {
        SetupPropertyDefs(new PropertyDefInfo(107, CustomGuid, "Invoice Number", 1));
        await _scanner.ScanAsync(VaultGuid, VaultName, ScanId);

        SetupPropertyDefs(new PropertyDefInfo(107, CustomGuid, "Invoice Number Renamed", 1));
        await _scanner.ScanAsync(VaultGuid, VaultName, ScanId + 1);

        var rows = await _propertyRepo.GetAllForVaultAsync(VaultGuid);
        Assert.Single(rows);
        Assert.Equal("Invoice Number Renamed", rows[0].Name);
        Assert.Equal(ScanId + 1, rows[0].LastSeenScanId);
    }

    // ─── GUID hardening: bad GUID throws before anything is written ─────────

    [Fact]
    public async Task ScanAsync_InvalidGuid_ThrowsBeforeWritingAnything()
    {
        SetupPropertyDefs(new PropertyDefInfo(107, "not-a-guid", "Invoice Number", 1));

        await Assert.ThrowsAsync<InvalidGuidException>(
            () => _scanner.ScanAsync(VaultGuid, VaultName, ScanId));

        var rows = await _propertyRepo.GetAllForVaultAsync(VaultGuid);
        Assert.Empty(rows);
    }

    [Fact]
    public async Task ScanAsync_EmptyGuid_Throws()
    {
        await Assert.ThrowsAsync<ArgumentException>(
            () => _scanner.ScanAsync("", VaultName, ScanId));
    }
}
