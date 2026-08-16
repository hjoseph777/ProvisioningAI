using Microsoft.Extensions.Logging;
using ProvisioningAI.Data.Models;
using ProvisioningAI.Data.Repositories;
using ProvisioningAI.MFilesConnectors;

namespace ProvisioningAI.Discovery.Services;

/// <summary>
/// Stage 3: property definitions. Logs into the vault, reads
/// PropertyDefOperations.GetPropertyDefs() verbatim, and upserts every entry —
/// built-in property defs (Name or title, Created, Last modified, etc.) and
/// customer-created ones alike. Unlike Stage 2's value lists, there is no
/// known overlap with a later discovery stage here: property definitions are
/// their own single stage in claude.md §4.4's dependency order, so nothing is
/// filtered out.
///
/// Property.IsRequired was removed from the schema (2026-07-26): confirmed
/// live that PropertyDefOperations.GetPropertyDefs() has no Required/
/// IsRequired member — required-ness is a per-class setting (which classes
/// require which properties), not an attribute of the property definition
/// itself. That association belongs to the classes stage, not this one.
/// </summary>
public sealed class PropertyDefScanner
{
    private readonly IMFilesConnector _connector;
    private readonly IRepository<Property> _propertyRepository;
    private readonly ILogger<PropertyDefScanner> _logger;

    public PropertyDefScanner(
        IMFilesConnector connector,
        IRepository<Property> propertyRepository,
        ILogger<PropertyDefScanner> logger)
    {
        _connector = connector;
        _propertyRepository = propertyRepository;
        _logger = logger;
    }

    /// <param name="vaultGuid">The vault GUID as returned by GetOnlineVaults() — the identity anchor.</param>
    /// <param name="vaultName">The vault's current display name, recorded verbatim into any GUID-guard failure message.</param>
    /// <param name="scanId">The DiscoveryScan row this stage's writes are stamped with (LastSeenScanId).</param>
    public async Task<PropertyDefScanResult> ScanAsync(
        string vaultGuid,
        string vaultName,
        int scanId,
        CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(vaultGuid))
            throw new ArgumentException("vaultGuid is required — it is the identity anchor.", nameof(vaultGuid));

        using var vault = await _connector.LogInToVaultAsync(vaultGuid, ct);

        var propertyDefs = await vault.GetPropertyDefsAsync(ct);
        var rows = propertyDefs
            .Select(pd => Property.Create(vaultGuid, vaultName, pd.Guid, pd.MFilesId, pd.Name, pd.DataType))
            .ToList();

        await _propertyRepository.UpsertManyAsync(rows, scanId);

        _logger.LogInformation(
            "Stage 3 — property definitions: {Count} scanned for {VaultName} ({VaultGuid})",
            rows.Count, vaultName, vaultGuid);

        return new PropertyDefScanResult(vaultGuid, rows.Count);
    }
}
