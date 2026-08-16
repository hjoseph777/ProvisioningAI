using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using ProvisioningAI.Data;
using ProvisioningAI.Data.Models;
using ProvisioningAI.Data.Repositories;
using ProvisioningAI.MFilesConnectors;

namespace ProvisioningAI.Discovery.Services;

/// <summary>
/// Rebuilds the required/optional fact dropped from Property in Stage 3
/// (Property has no Required member on the real COM shape — required-ness
/// is a per-class setting). Confirmed live via .NET reflection against the
/// installed Interop.MFilesApi.dll (26.6.16115.9): IObjectClass — the same
/// shape ClassOperations.GetAllObjectClasses() already returns for Stage 4 —
/// exposes .AssociatedPropertyDefs, each entry giving a property definition's
/// numeric ID and a Required flag. No separate COM call needed; VaultHandle's
/// existing GetClassesAsync() was extended to carry this data through
/// (ClassInfo.AssociatedProperties) rather than adding a second enumeration
/// of the same class collection.
///
/// PropertyDef MFilesId -> Guid resolution follows the same pattern as
/// Stage 4's Class -> ObjectType resolution: build the map from THIS scan's
/// live property-definition read, and throw rather than write an unresolved
/// reference if a class associates a property this scan didn't see.
/// </summary>
public sealed class ClassPropertyScanner
{
    private readonly IMFilesConnector _connector;
    private readonly ProvisioningAiDbContext _context;
    private readonly IRepository<ClassProperty> _classPropertyRepository;
    private readonly ILogger<ClassPropertyScanner> _logger;

    public ClassPropertyScanner(
        IMFilesConnector connector,
        ProvisioningAiDbContext context,
        IRepository<ClassProperty> classPropertyRepository,
        ILogger<ClassPropertyScanner> logger)
    {
        _connector = connector;
        _context = context;
        _classPropertyRepository = classPropertyRepository;
        _logger = logger;
    }

    /// <param name="vaultGuid">The vault GUID as returned by GetOnlineVaults() — the identity anchor.</param>
    /// <param name="vaultName">The vault's current display name, recorded verbatim into any GUID-guard failure message.</param>
    /// <param name="scanId">The DiscoveryScan row this stage's writes are stamped with (LastSeenScanId).</param>
    public async Task<ClassPropertyScanResult> ScanAsync(
        string vaultGuid,
        string vaultName,
        int scanId,
        CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(vaultGuid))
            throw new ArgumentException("vaultGuid is required — it is the identity anchor.", nameof(vaultGuid));

        using var vault = await _connector.LogInToVaultAsync(vaultGuid, ct);

        var propertyDefs = await vault.GetPropertyDefsAsync(ct);
        var propertyGuidByMFilesId = propertyDefs.ToDictionary(p => p.MFilesId, p => p.Guid);

        var classes = await vault.GetClassesAsync(ct);

        var rows = new List<ClassProperty>();
        foreach (var c in classes)
        {
            foreach (var assoc in c.AssociatedProperties ?? Array.Empty<ClassPropertyAssociationInfo>())
            {
                if (!propertyGuidByMFilesId.TryGetValue(assoc.PropertyDefMFilesId, out var propertyGuid))
                {
                    throw new InvalidOperationException(
                        $"Class \"{c.Name}\" (MFilesId {c.MFilesId}) in vault \"{vaultName}\" associates property definition " +
                        $"MFilesId {assoc.PropertyDefMFilesId}, which was not found among this scan's property definitions. " +
                        "Refusing to write an unresolved ClassProperty.PropertyGuid reference.");
                }

                rows.Add(ClassProperty.Create(vaultGuid, vaultName, c.Name, c.Guid, propertyGuid, assoc.Required));
            }
        }

        await using var transaction = await _context.Database.BeginTransactionAsync(ct);
        await _classPropertyRepository.UpsertManyNoTransactionAsync(rows, scanId);
        await transaction.CommitAsync(ct);

        _logger.LogInformation(
            "Class<->Property associations: {Count} scanned for {VaultName} ({VaultGuid})",
            rows.Count, vaultName, vaultGuid);

        return new ClassPropertyScanResult(vaultGuid, rows.Count);
    }
}
