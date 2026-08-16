using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using ProvisioningAI.Data;
using ProvisioningAI.Data.Repositories;
using ProvisioningAI.Discovery.Services;
using ProvisioningAI.MFilesConnectors;

namespace ProvisioningAI.Tests.Discovery;

/// <summary>
/// Unit tests for Stage 1: vault identity scan.
/// No live vault — connector is mocked, repository uses in-memory SQLite.
/// </summary>
public sealed class VaultIdentityScannerTests : IDisposable
{
    private const string Server = "localhost";
    private const string ConformityGuid = "{008446DF-32AA-4E9C-8C43-9FEC4D0A1203}";
    private const string ConformityName = "Conformity_CP1_Tergos.mfb";

    private readonly ProvisioningAiDbContext _db;
    private readonly VaultStructureRepository _repo;
    private readonly Mock<IMFilesConnector> _connectorMock;
    private readonly VaultIdentityScanner _scanner;

    public VaultIdentityScannerTests()
    {
        var options = new DbContextOptionsBuilder<ProvisioningAiDbContext>()
            .UseSqlite("DataSource=:memory:")
            .Options;
        _db = new ProvisioningAiDbContext(options);
        _db.Database.OpenConnection();
        _db.Database.EnsureCreated();

        _repo = new VaultStructureRepository(_db);
        _connectorMock = new Mock<IMFilesConnector>();
        _scanner = new VaultIdentityScanner(
            _connectorMock.Object,
            _repo,
            NullLogger<VaultIdentityScanner>.Instance);
    }

    public void Dispose()
    {
        _db.Database.CloseConnection();
        _db.Dispose();
    }

    private void SetupVaultList(params VaultInfo[] vaults)
    {
        _connectorMock
            .Setup(c => c.ListVaultsAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync((IReadOnlyList<VaultInfo>)vaults);
    }

    // ─── Happy path: new vault ────────────────────────────────────────────────

    [Fact]
    public async Task ScanAsync_NewVault_InsertsRowAndReturnsInserted()
    {
        SetupVaultList(new VaultInfo(ConformityGuid, ConformityName));

        var result = await _scanner.ScanAsync(ConformityGuid, Server);

        Assert.Equal(VaultIdentityAction.Inserted, result.Action);
        Assert.Equal(ConformityGuid, result.VaultGuid);
        Assert.Equal(ConformityName, result.VaultName);
        Assert.Equal(Server, result.ServerAddress);

        var row = await _repo.FindByGuidAsync(ConformityGuid);
        Assert.NotNull(row);
        Assert.Equal(ConformityName, row.VaultName);
    }

    // ─── Happy path: known vault ──────────────────────────────────────────────

    [Fact]
    public async Task ScanAsync_KnownVault_UpdatesNameAndReturnsUpdated()
    {
        SetupVaultList(new VaultInfo(ConformityGuid, ConformityName));

        // First scan seeds the row.
        await _scanner.ScanAsync(ConformityGuid, Server);

        // Simulate a vault rename visible on second scan.
        const string renamedVault = "Conformity_RENAMED.mfb";
        SetupVaultList(new VaultInfo(ConformityGuid, renamedVault));

        var result = await _scanner.ScanAsync(ConformityGuid, Server);

        Assert.Equal(VaultIdentityAction.Updated, result.Action);
        Assert.Equal(renamedVault, result.VaultName);

        var row = await _repo.FindByGuidAsync(ConformityGuid);
        Assert.NotNull(row);
        Assert.Equal(renamedVault, row.VaultName);
    }

    // ─── §4.6 foot-gun: GUID changed but name matches ────────────────────────

    [Fact]
    public async Task ScanAsync_GuidChangedButNameMatches_ReturnsWarningWithoutWrite()
    {
        // Seed index with the old GUID.
        const string oldGuid = "{AAAAAAAA-AAAA-AAAA-AAAA-AAAAAAAAAAAA}";
        SetupVaultList(new VaultInfo(oldGuid, ConformityName));
        await _scanner.ScanAsync(oldGuid, Server);

        // Now same vault presents with a new GUID (Change Unique ID or new-identity restore).
        const string newGuid = "{BBBBBBBB-BBBB-BBBB-BBBB-BBBBBBBBBBBB}";
        SetupVaultList(new VaultInfo(newGuid, ConformityName));

        var result = await _scanner.ScanAsync(newGuid, Server);

        Assert.Equal(VaultIdentityAction.GuidChangedWarning, result.Action);

        // The new GUID must NOT be written; only the old row should exist.
        var newRow = await _repo.FindByGuidAsync(newGuid);
        Assert.Null(newRow);

        var oldRow = await _repo.FindByGuidAsync(oldGuid);
        Assert.NotNull(oldRow);
    }

    // ─── Bad input: vault GUID not found in GetOnlineVaults() ────────────────

    [Fact]
    public async Task ScanAsync_VaultNotInOnlineVaults_Throws()
    {
        SetupVaultList(); // empty list — vault is offline or wrong GUID

        await Assert.ThrowsAsync<InvalidOperationException>(
            () => _scanner.ScanAsync(ConformityGuid, Server));
    }

    // ─── Bad input: empty GUID argument ──────────────────────────────────────

    [Fact]
    public async Task ScanAsync_EmptyGuid_Throws()
    {
        await Assert.ThrowsAsync<ArgumentException>(
            () => _scanner.ScanAsync("", Server));
    }
}
