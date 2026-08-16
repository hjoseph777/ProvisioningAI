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
/// Unit tests for Stage 7: views.
/// No live vault — connector and vault handle are mocked; the repository runs
/// against a real in-memory SQLite context.
/// </summary>
public sealed class ViewScannerTests : IDisposable
{
    private const string VaultGuid = "{008446DF-32AA-4E9C-8C43-9FEC4D0A1203}";
    private const string VaultName = "Conformity_CP1_Tergos.mfb";
    private const int ScanId = 1;

    private const string TopViewGuid = "{11111111-1111-1111-1111-111111111111}";
    private const string ChildViewGuid = "{22222222-2222-2222-2222-222222222222}";

    private readonly ProvisioningAiDbContext _db;
    private readonly GenericRepository<View> _viewRepo;
    private readonly Mock<IMFilesConnector> _connectorMock;
    private readonly Mock<IVaultHandle> _vaultHandleMock;
    private readonly ViewScanner _scanner;

    public ViewScannerTests()
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

        _viewRepo = new GenericRepository<View>(_db);

        _connectorMock = new Mock<IMFilesConnector>();
        _vaultHandleMock = new Mock<IVaultHandle>();
        _vaultHandleMock.SetupGet(v => v.VaultGuid).Returns(VaultGuid);
        _vaultHandleMock.SetupGet(v => v.VaultName).Returns(VaultName);
        _connectorMock
            .Setup(c => c.LogInToVaultAsync(VaultGuid, It.IsAny<CancellationToken>()))
            .ReturnsAsync(_vaultHandleMock.Object);

        _scanner = new ViewScanner(_connectorMock.Object, _viewRepo, NullLogger<ViewScanner>.Instance);
    }

    public void Dispose()
    {
        _db.Database.CloseConnection();
        _db.Dispose();
    }

    private void SetupViews(params ViewInfo[] items)
        => _vaultHandleMock.Setup(v => v.GetViewsAsync(It.IsAny<CancellationToken>())).ReturnsAsync((IReadOnlyList<ViewInfo>)items);

    [Fact]
    public async Task ScanAsync_ResolvesParentViewGuidAndCapturesSearchConditions()
    {
        SetupViews(
            new ViewInfo(5, TopViewGuid, "By Vendor", true, false, 0, "[Class]=~1"),
            new ViewInfo(6, ChildViewGuid, "By Vendor / Unpaid", false, true, 5, null));

        var result = await _scanner.ScanAsync(VaultGuid, VaultName, ScanId);

        Assert.Equal(2, result.ViewsScanned);

        var rows = await _viewRepo.GetAllForVaultAsync(VaultGuid);
        var top = Assert.Single(rows, r => r.Name == "By Vendor");
        Assert.Null(top.ParentViewGuid);
        Assert.Equal("[Class]=~1", top.SearchConditionsExported);
        Assert.True(top.IsCommon);

        var child = Assert.Single(rows, r => r.Name == "By Vendor / Unpaid");
        Assert.Equal(TopViewGuid, child.ParentViewGuid);
        Assert.Null(child.SearchConditionsExported);
    }

    [Fact]
    public async Task ScanAsync_ParentNotAmongScannedViews_ThrowsBeforeWritingAnything()
    {
        // References parent MFilesId=999, which isn't in this scan's results.
        SetupViews(new ViewInfo(6, ChildViewGuid, "Orphan view", false, true, 999, null));

        await Assert.ThrowsAsync<InvalidOperationException>(
            () => _scanner.ScanAsync(VaultGuid, VaultName, ScanId));

        Assert.Empty(await _viewRepo.GetAllForVaultAsync(VaultGuid));
    }

    [Fact]
    public async Task ScanAsync_EmptyGuid_Throws()
    {
        await Assert.ThrowsAsync<ArgumentException>(
            () => _scanner.ScanAsync("", VaultName, ScanId));
    }
}
