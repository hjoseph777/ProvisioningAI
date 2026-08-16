using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using ProvisioningAI.Data;
using ProvisioningAI.Data.Models;
using ProvisioningAI.Data.Repositories;
using ProvisioningAI.MFilesConnectors;

namespace ProvisioningAI.Discovery.Services;

/// <summary>
/// Stage 4: object types and classes. Reuses GetValueListsAsync() filtered to
/// RealObjectType==true for object types — the same COM collection Stage 2
/// reads for value lists, partitioned by the same already-verified flag,
/// rather than a separate ObjectTypeOperations.GetObjectTypes() call. This
/// was empirically validated (2026-07-26): the two retrieval paths return
/// an exact 12/12 match with zero GUID mismatches on Conformity, so one
/// COM collection can't silently drift from the other the way Stage 2's
/// original built-in-list bug could have gone undetected.
///
/// Classes reference their owning object type by NUMERIC ID on the COM
/// side (ClassInfo.ObjectTypeMFilesId) — resolved here to the object type's
/// GUID using this same scan's object-type results (claude.md §4.1: never
/// store a bare numeric ID as identity). A class whose object type isn't
/// among this scan's real object types is a data-integrity problem, not a
/// case to silently skip — it throws rather than writing an unresolved
/// reference.
///
/// Both entity types are upserted inside ONE transaction (same
/// UpsertManyNoTransactionAsync pattern as Stage 2) — it lands completely
/// or not at all.
/// </summary>
public sealed class ObjectTypeClassScanner
{
    private readonly IMFilesConnector _connector;
    private readonly ProvisioningAiDbContext _context;
    private readonly IRepository<ObjectType> _objectTypeRepository;
    private readonly IRepository<Class> _classRepository;
    private readonly ILogger<ObjectTypeClassScanner> _logger;

    public ObjectTypeClassScanner(
        IMFilesConnector connector,
        ProvisioningAiDbContext context,
        IRepository<ObjectType> objectTypeRepository,
        IRepository<Class> classRepository,
        ILogger<ObjectTypeClassScanner> logger)
    {
        _connector = connector;
        _context = context;
        _objectTypeRepository = objectTypeRepository;
        _classRepository = classRepository;
        _logger = logger;
    }

    /// <param name="vaultGuid">The vault GUID as returned by GetOnlineVaults() — the identity anchor.</param>
    /// <param name="vaultName">The vault's current display name, recorded verbatim into any GUID-guard failure message.</param>
    /// <param name="scanId">The DiscoveryScan row this stage's writes are stamped with (LastSeenScanId).</param>
    public async Task<ObjectTypeClassScanResult> ScanAsync(
        string vaultGuid,
        string vaultName,
        int scanId,
        CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(vaultGuid))
            throw new ArgumentException("vaultGuid is required — it is the identity anchor.", nameof(vaultGuid));

        using var vault = await _connector.LogInToVaultAsync(vaultGuid, ct);

        var rawValueLists = await vault.GetValueListsAsync(ct);
        var realObjectTypes = rawValueLists.Where(v => v.RealObjectType).ToList();

        var objectTypeRows = realObjectTypes
            .Select(v => ObjectType.Create(vaultGuid, vaultName, v.Guid, v.MFilesId, v.Name, v.NamePlural, true))
            .ToList();

        var objectTypeGuidByMFilesId = realObjectTypes.ToDictionary(v => v.MFilesId, v => v.Guid);

        var rawClasses = await vault.GetClassesAsync(ct);
        var classRows = rawClasses
            .Select(c =>
            {
                if (!objectTypeGuidByMFilesId.TryGetValue(c.ObjectTypeMFilesId, out var objectTypeGuid))
                {
                    throw new InvalidOperationException(
                        $"Class \"{c.Name}\" (MFilesId {c.MFilesId}) in vault \"{vaultName}\" references object type " +
                        $"MFilesId {c.ObjectTypeMFilesId}, which was not found among this scan's real object types. " +
                        "Refusing to write an unresolved Class.ObjectTypeGuid reference.");
                }
                return Class.Create(vaultGuid, vaultName, c.Guid, c.MFilesId, c.Name, objectTypeGuid);
            })
            .ToList();

        await using var transaction = await _context.Database.BeginTransactionAsync(ct);
        await _objectTypeRepository.UpsertManyNoTransactionAsync(objectTypeRows, scanId);
        await _classRepository.UpsertManyNoTransactionAsync(classRows, scanId);
        await transaction.CommitAsync(ct);

        _logger.LogInformation(
            "Stage 4 — object types & classes: {ObjectTypeCount} object types, {ClassCount} classes scanned for {VaultName} ({VaultGuid})",
            objectTypeRows.Count, classRows.Count, vaultName, vaultGuid);

        return new ObjectTypeClassScanResult(vaultGuid, objectTypeRows.Count, classRows.Count);
    }
}
