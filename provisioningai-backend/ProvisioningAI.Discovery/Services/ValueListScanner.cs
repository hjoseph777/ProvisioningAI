using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using ProvisioningAI.Data;
using ProvisioningAI.Data.Models;
using ProvisioningAI.Data.Repositories;
using ProvisioningAI.MFilesConnectors;

namespace ProvisioningAI.Discovery.Services;

/// <summary>
/// Stage 2: value lists and value list items. Logs into the vault, reads
/// ValueListOperations/ValueListItemOperations verbatim, and upserts both
/// entity types as one atomic transaction — it lands completely or not at all.
///
/// GetValueListsAsync() returns both real object types (RealObjectType=true)
/// and true value lists (RealObjectType=false) — M-Files models a value list
/// as a special case of object type under the hood (confirmed live 2026-07-26).
/// Filtering to RealObjectType == false is scoping to this stage's target, not
/// interpreting the data — every field is still recorded verbatim.
///
/// RealObjectType == false ALSO includes built-in vault structure (Class,
/// Workflow, State, User, User group, etc.) that M-Files models as a value
/// list under the hood but that claude.md §4.4 assigns to its own later stage
/// — confirmed live 2026-07-26 that these sit at fixed IDs matching M-Files'
/// own MFBuiltInValueList enum (see MFilesBuiltInValueListIds). Those are
/// excluded here too, so this stage only records genuine customer-created
/// value lists.
/// </summary>
public sealed class ValueListScanner
{
    private readonly IMFilesConnector _connector;
    private readonly ProvisioningAiDbContext _context;
    private readonly IRepository<ValueList> _valueListRepository;
    private readonly IRepository<ValueListItem> _valueListItemRepository;
    private readonly ILogger<ValueListScanner> _logger;

    public ValueListScanner(
        IMFilesConnector connector,
        ProvisioningAiDbContext context,
        IRepository<ValueList> valueListRepository,
        IRepository<ValueListItem> valueListItemRepository,
        ILogger<ValueListScanner> logger)
    {
        _connector = connector;
        _context = context;
        _valueListRepository = valueListRepository;
        _valueListItemRepository = valueListItemRepository;
        _logger = logger;
    }

    /// <param name="vaultGuid">The vault GUID as returned by GetOnlineVaults() — the identity anchor.</param>
    /// <param name="vaultName">The vault's current display name, recorded verbatim into any GUID-guard failure message.</param>
    /// <param name="scanId">The DiscoveryScan row this stage's writes are stamped with (LastSeenScanId).</param>
    public async Task<ValueListScanResult> ScanAsync(
        string vaultGuid,
        string vaultName,
        int scanId,
        CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(vaultGuid))
            throw new ArgumentException("vaultGuid is required — it is the identity anchor.", nameof(vaultGuid));

        using var vault = await _connector.LogInToVaultAsync(vaultGuid, ct);

        var rawValueLists = await vault.GetValueListsAsync(ct);
        var trueValueLists = rawValueLists
            .Where(v => !v.RealObjectType)
            .Where(v => !MFilesBuiltInValueListIds.All.Contains(v.MFilesId))
            .ToList();

        var valueListRows = trueValueLists
            .Select(v => ValueList.Create(vaultGuid, vaultName, v.Guid, v.MFilesId, v.Name))
            .ToList();

        var itemRows = new List<ValueListItem>();
        foreach (var valueList in trueValueLists)
        {
            var items = await vault.GetValueListItemsAsync(valueList.MFilesId, ct);
            itemRows.AddRange(items.Select(i =>
                ValueListItem.Create(vaultGuid, vaultName, i.Guid, i.MFilesId, valueList.Guid, i.Name, i.Deleted)));
        }

        await using var transaction = await _context.Database.BeginTransactionAsync(ct);
        await _valueListRepository.UpsertManyNoTransactionAsync(valueListRows, scanId);
        await _valueListItemRepository.UpsertManyNoTransactionAsync(itemRows, scanId);
        await transaction.CommitAsync(ct);

        _logger.LogInformation(
            "Stage 2 — value lists: {ValueListCount} value lists, {ItemCount} items scanned for {VaultName} ({VaultGuid})",
            valueListRows.Count, itemRows.Count, vaultName, vaultGuid);

        return new ValueListScanResult(vaultGuid, valueListRows.Count, itemRows.Count);
    }
}
