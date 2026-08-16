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
/// Unit tests for Stage 4: object types + classes.
/// No live vault — connector and vault handle are mocked; repositories run
/// against a real in-memory SQLite context so the single-transaction/upsert
/// and ID->GUID resolution behavior is exercised for real.
/// </summary>
public sealed class ObjectTypeClassScannerTests : IDisposable
{
    private const string VaultGuid = "{008446DF-32AA-4E9C-8C43-9FEC4D0A1203}";
    private const string VaultName = "Conformity_CP1_Tergos.mfb";
    private const int ScanId = 1;

    private const string DocumentGuid = "{11111111-1111-1111-1111-111111111111}";
    private const string VendorGuid = "{22222222-2222-2222-2222-222222222222}";
    private const string InvoiceClassGuid = "{33333333-3333-3333-3333-333333333333}";

    private readonly ProvisioningAiDbContext _db;
    private readonly GenericRepository<ObjectType> _objectTypeRepo;
    private readonly GenericRepository<Class> _classRepo;
    private readonly Mock<IMFilesConnector> _connectorMock;
    private readonly Mock<IVaultHandle> _vaultHandleMock;
    private readonly ObjectTypeClassScanner _scanner;

    public ObjectTypeClassScannerTests()
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

        _objectTypeRepo = new GenericRepository<ObjectType>(_db);
        _classRepo = new GenericRepository<Class>(_db);

        _connectorMock = new Mock<IMFilesConnector>();
        _vaultHandleMock = new Mock<IVaultHandle>();
        _vaultHandleMock.SetupGet(v => v.VaultGuid).Returns(VaultGuid);
        _vaultHandleMock.SetupGet(v => v.VaultName).Returns(VaultName);
        _connectorMock
            .Setup(c => c.LogInToVaultAsync(VaultGuid, It.IsAny<CancellationToken>()))
            .ReturnsAsync(_vaultHandleMock.Object);

        _scanner = new ObjectTypeClassScanner(
            _connectorMock.Object, _db, _objectTypeRepo, _classRepo, NullLogger<ObjectTypeClassScanner>.Instance);
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

    private void SetupClasses(params ClassInfo[] classes)
        => _vaultHandleMock
            .Setup(v => v.GetClassesAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync((IReadOnlyList<ClassInfo>)classes);

    // ─── Happy path: real object types kept, value lists excluded ───────────

    [Fact]
    public async Task ScanAsync_KeepsOnlyRealObjectTypes_ResolvesClassObjectTypeGuid()
    {
        SetupValueLists(
            new ValueListInfo(0, DocumentGuid, "Document", true, "Documents"),
            new ValueListInfo(107, "{44444444-4444-4444-4444-444444444444}", "XDate", false)); // value list — must be excluded
        SetupClasses(new ClassInfo(1, InvoiceClassGuid, "Invoice", 0));

        var result = await _scanner.ScanAsync(VaultGuid, VaultName, ScanId);

        Assert.Equal(1, result.ObjectTypesScanned);
        Assert.Equal(1, result.ClassesScanned);

        var objectTypes = await _objectTypeRepo.GetAllForVaultAsync(VaultGuid);
        Assert.Single(objectTypes);
        Assert.Equal("Document", objectTypes[0].Name);
        Assert.Equal("Documents", objectTypes[0].DisplayName);

        var classes = await _classRepo.GetAllForVaultAsync(VaultGuid);
        Assert.Single(classes);
        Assert.Equal("Invoice", classes[0].Name);
        Assert.Equal(DocumentGuid, classes[0].ObjectTypeGuid); // resolved from the numeric ObjectType=0 reference
    }

    [Fact]
    public async Task ScanAsync_MultipleObjectTypesAndClasses_ResolvesEachIndependently()
    {
        SetupValueLists(
            new ValueListInfo(0, DocumentGuid, "Document", true, "Documents"),
            new ValueListInfo(106, VendorGuid, "Vendor", true, "Vendors"));
        SetupClasses(
            new ClassInfo(1, InvoiceClassGuid, "Invoice", 0),
            new ClassInfo(2, "{55555555-5555-5555-5555-555555555555}", "Acme Vendor Record", 106));

        var result = await _scanner.ScanAsync(VaultGuid, VaultName, ScanId);

        Assert.Equal(2, result.ObjectTypesScanned);
        Assert.Equal(2, result.ClassesScanned);

        var classes = await _classRepo.GetAllForVaultAsync(VaultGuid);
        Assert.Contains(classes, c => c.Name == "Invoice" && c.ObjectTypeGuid == DocumentGuid);
        Assert.Contains(classes, c => c.Name == "Acme Vendor Record" && c.ObjectTypeGuid == VendorGuid);
    }

    // ─── Data integrity: unresolvable class -> object type reference ────────

    [Fact]
    public async Task ScanAsync_ClassReferencesUnknownObjectType_ThrowsBeforeWritingAnything()
    {
        SetupValueLists(new ValueListInfo(0, DocumentGuid, "Document", true, "Documents"));
        // References ObjectType MFilesId=999, which isn't in this scan's real-object-type set.
        SetupClasses(new ClassInfo(1, InvoiceClassGuid, "Invoice", 999));

        await Assert.ThrowsAsync<InvalidOperationException>(
            () => _scanner.ScanAsync(VaultGuid, VaultName, ScanId));

        var objectTypes = await _objectTypeRepo.GetAllForVaultAsync(VaultGuid);
        var classes = await _classRepo.GetAllForVaultAsync(VaultGuid);
        Assert.Empty(objectTypes);
        Assert.Empty(classes);
    }

    [Fact]
    public async Task ScanAsync_EmptyGuid_Throws()
    {
        await Assert.ThrowsAsync<ArgumentException>(
            () => _scanner.ScanAsync("", VaultName, ScanId));
    }
}
