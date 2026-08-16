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
/// Unit tests for Stage 8: Named Value Storage.
/// No live vault — connector and vault handle are mocked; the repository runs
/// against a real in-memory SQLite context.
/// </summary>
public sealed class NamedValueStorageScannerTests : IDisposable
{
    private const string VaultGuid = "{008446DF-32AA-4E9C-8C43-9FEC4D0A1203}";
    private const string VaultName = "Conformity_CP1_Tergos.mfb";
    private const int ScanId = 1;
    private const string AppId = "{58E4F21F-A933-417D-9C9D-DCC7EA170EE3}";

    private readonly ProvisioningAiDbContext _db;
    private readonly NamedValueStorageRepository _repo;
    private readonly Mock<IMFilesConnector> _connectorMock;
    private readonly Mock<IVaultHandle> _vaultHandleMock;
    private readonly NamedValueStorageScanner _scanner;

    public NamedValueStorageScannerTests()
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

        _repo = new NamedValueStorageRepository(_db);

        _connectorMock = new Mock<IMFilesConnector>();
        _vaultHandleMock = new Mock<IVaultHandle>();
        _vaultHandleMock.SetupGet(v => v.VaultGuid).Returns(VaultGuid);
        _vaultHandleMock.SetupGet(v => v.VaultName).Returns(VaultName);
        _connectorMock
            .Setup(c => c.LogInToVaultAsync(VaultGuid, It.IsAny<CancellationToken>()))
            .ReturnsAsync(_vaultHandleMock.Object);

        // Default: GetNamedValuesAsync returns empty for any (type, namespace) — matches the
        // confirmed real behavior against Conformity (every app/type combination is empty).
        _vaultHandleMock
            .Setup(v => v.GetNamedValuesAsync(It.IsAny<int>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((IReadOnlyList<NamedValueEntryInfo>)[]);

        _scanner = new NamedValueStorageScanner(_connectorMock.Object, _repo, NullLogger<NamedValueStorageScanner>.Instance);
    }

    public void Dispose()
    {
        _db.Database.CloseConnection();
        _db.Dispose();
    }

    private void SetupApps(params CustomApplicationInfo[] apps)
        => _vaultHandleMock.Setup(v => v.GetCustomApplicationsAsync(It.IsAny<CancellationToken>())).ReturnsAsync((IReadOnlyList<CustomApplicationInfo>)apps);

    private void SetupNamedValues(int namedValueType, string namespaceName, params NamedValueEntryInfo[] entries)
        => _vaultHandleMock
            .Setup(v => v.GetNamedValuesAsync(namedValueType, namespaceName, It.IsAny<CancellationToken>()))
            .ReturnsAsync((IReadOnlyList<NamedValueEntryInfo>)entries);

    [Fact]
    public async Task ScanAsync_RecordsApplicationInventoryVerbatim_DefaultsToUnclassified()
    {
        SetupApps(new CustomApplicationInfo(AppId, "M-Files Compliance Kit", "1.2.3", "M-Files", true, 2, 4));

        var result = await _scanner.ScanAsync(VaultGuid, VaultName, ScanId);

        Assert.Equal(1, result.ApplicationsScanned);
        Assert.Equal(6, result.EntriesScanned); // ApplicationId, Version, Publisher, Enabled, ApplicationType, LicenseStatus

        var rows = await _repo.GetAllForVaultAsync(VaultGuid);
        Assert.Equal(6, rows.Count);
        Assert.Contains(rows, r => r.Module == "M-Files Compliance Kit" && r.Key == "LicenseStatus" && r.Value == "4" && r.Classification == "unclassified");
        Assert.Contains(rows, r => r.Module == "M-Files Compliance Kit" && r.Key == "Enabled" && r.Value == "True");
    }

    [Fact]
    public async Task ScanAsync_IncludesAnyRealNamedValueStorageEntriesFound()
    {
        SetupApps(new CustomApplicationInfo(AppId, "SQL Query Vault Application", "1.0", "M-Files", true, 2, 1));
        SetupNamedValues(3, AppId, new NamedValueEntryInfo("SomeKey", "SomeValue"));

        var result = await _scanner.ScanAsync(VaultGuid, VaultName, ScanId);

        Assert.Equal(7, result.EntriesScanned); // 6 inventory rows + 1 real NVS entry found

        var rows = await _repo.GetAllForVaultAsync(VaultGuid);
        Assert.Contains(rows, r => r.Key == "[NVT3] SomeKey" && r.Value == "SomeValue");
    }

    [Fact]
    public async Task ScanAsync_RescanPreservesHumanAssignedClassification()
    {
        SetupApps(new CustomApplicationInfo(AppId, "M-Files Compliance Kit", "1.2.3", "M-Files", true, 2, 4));
        await _scanner.ScanAsync(VaultGuid, VaultName, ScanId);

        // Simulate a human classifying the LicenseStatus row as "static" after the first scan.
        var existing = (await _repo.GetAllForVaultAsync(VaultGuid)).Single(r => r.Key == "Version");
        _db.Entry(existing).CurrentValues["Classification"] = "static";
        await _db.SaveChangesAsync();

        // Rescan with a changed version — classification must survive.
        SetupApps(new CustomApplicationInfo(AppId, "M-Files Compliance Kit", "1.3.0", "M-Files", true, 2, 4));
        await _scanner.ScanAsync(VaultGuid, VaultName, ScanId + 1);

        var rows = await _repo.GetAllForVaultAsync(VaultGuid);
        var versionRow = rows.Single(r => r.Key == "Version");
        Assert.Equal("static", versionRow.Classification);
        Assert.Equal("1.3.0", versionRow.Value);
    }

    [Fact]
    public async Task ScanAsync_NoApplications_ScansZero()
    {
        SetupApps();

        var result = await _scanner.ScanAsync(VaultGuid, VaultName, ScanId);

        Assert.Equal(0, result.ApplicationsScanned);
        Assert.Equal(0, result.EntriesScanned);
    }

    [Fact]
    public async Task ScanAsync_EmptyGuid_Throws()
    {
        await Assert.ThrowsAsync<ArgumentException>(
            () => _scanner.ScanAsync("", VaultName, ScanId));
    }
}
