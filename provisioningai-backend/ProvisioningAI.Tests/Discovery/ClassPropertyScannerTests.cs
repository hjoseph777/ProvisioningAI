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
/// Unit tests for the Class&lt;-&gt;Property association scan (rebuilds the
/// required/optional fact dropped from Property in Stage 3).
/// No live vault — connector and vault handle are mocked; the repository
/// runs against a real in-memory SQLite context.
/// </summary>
public sealed class ClassPropertyScannerTests : IDisposable
{
    private const string VaultGuid = "{008446DF-32AA-4E9C-8C43-9FEC4D0A1203}";
    private const string VaultName = "Conformity_CP1_Tergos.mfb";
    private const int ScanId = 1;

    private const string InvoiceClassGuid = "{33333333-3333-3333-3333-333333333333}";
    private const string VendorNameGuid = "{44444444-4444-4444-4444-444444444444}";
    private const string InvoiceNumberGuid = "{55555555-5555-5555-5555-555555555555}";

    private readonly ProvisioningAiDbContext _db;
    private readonly ClassPropertyRepository _classPropertyRepo;
    private readonly Mock<IMFilesConnector> _connectorMock;
    private readonly Mock<IVaultHandle> _vaultHandleMock;
    private readonly ClassPropertyScanner _scanner;

    public ClassPropertyScannerTests()
    {
        var options = new DbContextOptionsBuilder<ProvisioningAiDbContext>()
            .UseSqlite("DataSource=:memory:")
            .Options;
        _db = new ProvisioningAiDbContext(options);
        _db.Database.OpenConnection();
        _db.Database.EnsureCreated();

        const string DocumentTypeGuid = "{66666666-6666-6666-6666-666666666666}";

        _db.VaultStructures.Add(VaultStructure.Create(VaultGuid, VaultName, DateTime.UtcNow));
        _db.DiscoveryScans.Add(new DiscoveryScan { ScanId = ScanId, VaultGuid = VaultGuid, VaultName = VaultName, StartedAt = DateTime.UtcNow, Status = "RUNNING" });
        // ClassProperty FKs to both Class and Property — seed real rows for each,
        // same lesson as Stage 2's FK-seeding fix (skills.md): test fixtures must
        // satisfy the same constraints as production data, not shortcut them.
        _db.Add(ObjectType.Create(VaultGuid, VaultName, DocumentTypeGuid, 0, "Document", "Documents", true));
        _db.Add(Class.Create(VaultGuid, VaultName, InvoiceClassGuid, 1, "Invoice", DocumentTypeGuid));
        _db.Add(Property.Create(VaultGuid, VaultName, VendorNameGuid, 106, "Vendor Name", 1));
        _db.Add(Property.Create(VaultGuid, VaultName, InvoiceNumberGuid, 107, "Invoice Number", 1));
        _db.SaveChanges();

        _classPropertyRepo = new ClassPropertyRepository(_db);

        _connectorMock = new Mock<IMFilesConnector>();
        _vaultHandleMock = new Mock<IVaultHandle>();
        _vaultHandleMock.SetupGet(v => v.VaultGuid).Returns(VaultGuid);
        _vaultHandleMock.SetupGet(v => v.VaultName).Returns(VaultName);
        _connectorMock
            .Setup(c => c.LogInToVaultAsync(VaultGuid, It.IsAny<CancellationToken>()))
            .ReturnsAsync(_vaultHandleMock.Object);

        _scanner = new ClassPropertyScanner(_connectorMock.Object, _db, _classPropertyRepo, NullLogger<ClassPropertyScanner>.Instance);
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

    private void SetupClasses(params ClassInfo[] classes)
        => _vaultHandleMock
            .Setup(v => v.GetClassesAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync((IReadOnlyList<ClassInfo>)classes);

    // ─── Happy path: required and optional associations both recorded ───────

    [Fact]
    public async Task ScanAsync_RecordsRequiredAndOptionalAssociations()
    {
        SetupPropertyDefs(
            new PropertyDefInfo(106, VendorNameGuid, "Vendor Name", 1),
            new PropertyDefInfo(107, InvoiceNumberGuid, "Invoice Number", 1));
        SetupClasses(new ClassInfo(1, InvoiceClassGuid, "Invoice", 0,
        [
            new ClassPropertyAssociationInfo(106, true),
            new ClassPropertyAssociationInfo(107, false),
        ]));

        var result = await _scanner.ScanAsync(VaultGuid, VaultName, ScanId);

        Assert.Equal(2, result.AssociationsScanned);

        var rows = await _classPropertyRepo.GetAllForVaultAsync(VaultGuid);
        Assert.Equal(2, rows.Count);
        Assert.Contains(rows, r => r.ClassGuid == InvoiceClassGuid && r.PropertyGuid == VendorNameGuid && r.IsRequired);
        Assert.Contains(rows, r => r.ClassGuid == InvoiceClassGuid && r.PropertyGuid == InvoiceNumberGuid && !r.IsRequired);
    }

    [Fact]
    public async Task ScanAsync_ClassWithNoAssociations_ScansZero()
    {
        SetupPropertyDefs();
        SetupClasses(new ClassInfo(1, InvoiceClassGuid, "Invoice", 0, []));

        var result = await _scanner.ScanAsync(VaultGuid, VaultName, ScanId);

        Assert.Equal(0, result.AssociationsScanned);
    }

    // ─── Data integrity: unresolvable property reference ────────────────────

    [Fact]
    public async Task ScanAsync_ClassAssociatesUnknownPropertyDef_ThrowsBeforeWritingAnything()
    {
        SetupPropertyDefs(new PropertyDefInfo(106, VendorNameGuid, "Vendor Name", 1));
        // References PropertyDef MFilesId=999, which isn't in this scan's property defs.
        SetupClasses(new ClassInfo(1, InvoiceClassGuid, "Invoice", 0,
        [
            new ClassPropertyAssociationInfo(999, true),
        ]));

        await Assert.ThrowsAsync<InvalidOperationException>(
            () => _scanner.ScanAsync(VaultGuid, VaultName, ScanId));

        var rows = await _classPropertyRepo.GetAllForVaultAsync(VaultGuid);
        Assert.Empty(rows);
    }

    [Fact]
    public async Task ScanAsync_EmptyGuid_Throws()
    {
        await Assert.ThrowsAsync<ArgumentException>(
            () => _scanner.ScanAsync("", VaultName, ScanId));
    }
}
