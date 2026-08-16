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
/// Unit tests for Stage 2: value lists + value list items.
/// No live vault — connector and vault handle are mocked (plain interfaces,
/// no COM dynamic-dispatch trickery needed at this layer); repositories run
/// against a real in-memory SQLite context so the single-transaction/upsert
/// behavior is exercised for real, not mocked away.
/// </summary>
public sealed class ValueListScannerTests : IDisposable
{
    private const string VaultGuid = "{008446DF-32AA-4E9C-8C43-9FEC4D0A1203}";
    private const string VaultName = "Conformity_CP1_Tergos.mfb";
    private const int ScanId = 1;

    // Guid.TryParse rejects placeholder strings like "{CLASS}" (not well-formed GUIDs), so
    // GuidGuard would throw on every fixture below unless real canonical GUIDs are used.
    private const string CustomList1Guid = "{11111111-1111-1111-1111-111111111111}";
    private const string CustomList2Guid = "{22222222-2222-2222-2222-222222222222}";
    private const string DocTypeGuid = "{33333333-3333-3333-3333-333333333333}";
    private const string Item1Guid = "{44444444-4444-4444-4444-444444444444}";
    private const string Item2Guid = "{55555555-5555-5555-5555-555555555555}";
    private const string Item3Guid = "{66666666-6666-6666-6666-666666666666}";
    private const string BuiltInClassGuid = "{77777777-7777-7777-7777-777777777777}";

    // MFilesId values 200/201 stand in for genuine customer-created value lists — anything
    // outside M-Files' own MFBuiltInValueList enum (see MFilesBuiltInValueListIds). 1 and 7 are
    // real entries in that enum (Classes, Workflows) and must be excluded regardless of name.
    private const int CustomListId1 = 200;
    private const int CustomListId2 = 201;
    private const int BuiltInClassId = 1;

    private readonly ProvisioningAiDbContext _db;
    private readonly GenericRepository<ValueList> _valueListRepo;
    private readonly GenericRepository<ValueListItem> _valueListItemRepo;
    private readonly Mock<IMFilesConnector> _connectorMock;
    private readonly Mock<IVaultHandle> _vaultHandleMock;
    private readonly ValueListScanner _scanner;

    public ValueListScannerTests()
    {
        var options = new DbContextOptionsBuilder<ProvisioningAiDbContext>()
            .UseSqlite("DataSource=:memory:")
            .Options;
        _db = new ProvisioningAiDbContext(options);
        _db.Database.OpenConnection();
        _db.Database.EnsureCreated();

        // Every entity table FKs to VaultStructures (claude.md §4.2) — Stage 2 only ever runs
        // after Stage 1 has scanned vault identity, so seed that row here too. LastSeenScanId
        // also FKs to DiscoveryScans(ScanId), so both scan IDs used across these tests need a
        // real backing row.
        _db.VaultStructures.Add(VaultStructure.Create(VaultGuid, VaultName, DateTime.UtcNow));
        _db.DiscoveryScans.Add(new DiscoveryScan { ScanId = ScanId, VaultGuid = VaultGuid, VaultName = VaultName, StartedAt = DateTime.UtcNow, Status = "RUNNING" });
        _db.DiscoveryScans.Add(new DiscoveryScan { ScanId = ScanId + 1, VaultGuid = VaultGuid, VaultName = VaultName, StartedAt = DateTime.UtcNow, Status = "RUNNING" });
        _db.SaveChanges();

        _valueListRepo = new GenericRepository<ValueList>(_db);
        _valueListItemRepo = new GenericRepository<ValueListItem>(_db);

        _connectorMock = new Mock<IMFilesConnector>();
        _vaultHandleMock = new Mock<IVaultHandle>();
        _vaultHandleMock.SetupGet(v => v.VaultGuid).Returns(VaultGuid);
        _vaultHandleMock.SetupGet(v => v.VaultName).Returns(VaultName);
        _connectorMock
            .Setup(c => c.LogInToVaultAsync(VaultGuid, It.IsAny<CancellationToken>()))
            .ReturnsAsync(_vaultHandleMock.Object);

        _scanner = new ValueListScanner(
            _connectorMock.Object, _db, _valueListRepo, _valueListItemRepo,
            NullLogger<ValueListScanner>.Instance);
    }

    public void Dispose()
    {
        _db.Database.CloseConnection();
        _db.Dispose();
    }

    private void SetupValueLists(params ValueListInfo[] lists)
        => _vaultHandleMock
            .Setup(v => v.GetValueListsAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync((IReadOnlyList<ValueListInfo>)lists);

    private void SetupItems(int valueListId, params ValueListItemInfo[] items)
        => _vaultHandleMock
            .Setup(v => v.GetValueListItemsAsync(valueListId, It.IsAny<CancellationToken>()))
            .ReturnsAsync((IReadOnlyList<ValueListItemInfo>)items);

    // ─── Happy path: mixed collection, real object types filtered out ────────

    [Fact]
    public async Task ScanAsync_FiltersOutRealObjectTypes_WritesOnlyTrueValueLists()
    {
        SetupValueLists(
            new ValueListInfo(CustomListId1, CustomList1Guid, "Currency", false),
            new ValueListInfo(2, DocTypeGuid, "Document", true)); // RealObjectType=true — must be excluded
        SetupItems(CustomListId1, new ValueListItemInfo(10, Item1Guid, "Item One", false));

        var result = await _scanner.ScanAsync(VaultGuid, VaultName, ScanId);

        Assert.Equal(1, result.ValueListsScanned);
        Assert.Equal(1, result.ValueListItemsScanned);

        var rows = await _valueListRepo.GetAllForVaultAsync(VaultGuid);
        Assert.Single(rows);
        Assert.Equal("Currency", rows[0].Name);
        Assert.Equal(ScanId, rows[0].LastSeenScanId);

        var itemRows = await _valueListItemRepo.GetAllForVaultAsync(VaultGuid);
        Assert.Single(itemRows);
        Assert.Equal("Item One", itemRows[0].Name);
        Assert.Equal(CustomList1Guid, itemRows[0].ValueListGuid);
        Assert.Equal(ScanId, itemRows[0].LastSeenScanId);
    }

    // ─── Built-in vault structure: excluded even though RealObjectType=false ─

    [Fact]
    public async Task ScanAsync_ExcludesBuiltInValueLists_EvenThoughRealObjectTypeIsFalse()
    {
        // ID 1 is MFBuiltInValueListClasses — confirmed live 2026-07-26 via reflection against
        // Interop.MFilesApi.dll. It IS RealObjectType=false (COM models it as a value list), but
        // it's vault structure claude.md §4.4 assigns to the classes stage, not this one.
        SetupValueLists(
            new ValueListInfo(BuiltInClassId, BuiltInClassGuid, "Class", false),
            new ValueListInfo(CustomListId1, CustomList1Guid, "Currency", false));
        SetupItems(BuiltInClassId, new ValueListItemInfo(1, Item1Guid, "Some Class", false));
        SetupItems(CustomListId1, new ValueListItemInfo(10, Item2Guid, "USD", false));

        var result = await _scanner.ScanAsync(VaultGuid, VaultName, ScanId);

        Assert.Equal(1, result.ValueListsScanned);
        Assert.Equal(1, result.ValueListItemsScanned);

        var rows = await _valueListRepo.GetAllForVaultAsync(VaultGuid);
        Assert.Single(rows);
        Assert.Equal("Currency", rows[0].Name);

        // GetValueListItemsAsync must never even be called for the excluded built-in list.
        _vaultHandleMock.Verify(
            v => v.GetValueListItemsAsync(BuiltInClassId, It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task ScanAsync_MultipleValueLists_ReadsItemsForEachOne()
    {
        SetupValueLists(
            new ValueListInfo(CustomListId1, CustomList1Guid, "Currency", false),
            new ValueListInfo(CustomListId2, CustomList2Guid, "Country", false));
        SetupItems(CustomListId1, new ValueListItemInfo(10, Item1Guid, "Item One", false));
        SetupItems(CustomListId2,
            new ValueListItemInfo(20, Item2Guid, "Item Two", false),
            new ValueListItemInfo(21, Item3Guid, "Item Three", true));

        var result = await _scanner.ScanAsync(VaultGuid, VaultName, ScanId);

        Assert.Equal(2, result.ValueListsScanned);
        Assert.Equal(3, result.ValueListItemsScanned);
    }

    [Fact]
    public async Task ScanAsync_RescansSameVault_UpsertsRatherThanDuplicating()
    {
        SetupValueLists(new ValueListInfo(CustomListId1, CustomList1Guid, "Currency", false));
        SetupItems(CustomListId1, new ValueListItemInfo(10, Item1Guid, "Item One", false));

        await _scanner.ScanAsync(VaultGuid, VaultName, ScanId);
        await _scanner.ScanAsync(VaultGuid, VaultName, ScanId + 1);

        var rows = await _valueListRepo.GetAllForVaultAsync(VaultGuid);
        Assert.Single(rows);
        Assert.Equal(ScanId + 1, rows[0].LastSeenScanId);

        var itemRows = await _valueListItemRepo.GetAllForVaultAsync(VaultGuid);
        Assert.Single(itemRows);
        Assert.Equal(ScanId + 1, itemRows[0].LastSeenScanId);
    }

    // ─── GUID hardening: bad GUID throws before anything is written ─────────

    [Fact]
    public async Task ScanAsync_InvalidItemGuid_ThrowsBeforeWritingAnything()
    {
        SetupValueLists(new ValueListInfo(CustomListId1, CustomList1Guid, "Currency", false));
        SetupItems(CustomListId1, new ValueListItemInfo(10, "not-a-guid", "Bad Item", false));

        await Assert.ThrowsAsync<InvalidGuidException>(
            () => _scanner.ScanAsync(VaultGuid, VaultName, ScanId));

        var rows = await _valueListRepo.GetAllForVaultAsync(VaultGuid);
        Assert.Empty(rows);
    }

    [Fact]
    public async Task ScanAsync_EmptyGuid_Throws()
    {
        await Assert.ThrowsAsync<ArgumentException>(
            () => _scanner.ScanAsync("", VaultName, ScanId));
    }
}
