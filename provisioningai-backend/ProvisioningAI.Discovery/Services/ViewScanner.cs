using Microsoft.Extensions.Logging;
using ProvisioningAI.Data.Models;
using ProvisioningAI.Data.Repositories;
using ProvisioningAI.MFilesConnectors;

namespace ProvisioningAI.Discovery.Services;

/// <summary>
/// Stage 7: views (claude.md §4.4). Simpler than Workflow/State/User/UserGroup:
/// IView has a real .GUID property directly (confirmed live, 2026-07-27), and
/// Views don't appear in MFBuiltInValueList at all — no built-in value-list
/// workaround, no Stage 2 overlap question to resolve here.
///
/// GetViewsAdmin(includeCommonViews: true, currentUserId) enumerates every
/// view regardless of hierarchy level. A view's Parent is a numeric ID (0/
/// irrelevant when HasParent=false — reading it unconditionally throws live,
/// see ViewInfo's doc comment); resolved to the parent's GUID using this
/// same scan's results, same pattern as Stage 4's Class -> ObjectType
/// resolution — throws rather than writing an unresolved reference if a
/// parent isn't found among this scan's own views.
///
/// SearchConditionsExported is the view's defining filter criteria, captured
/// verbatim via SearchConditions.GetAsExportedSearchString() — M-Files' own
/// textual export, same mechanism as Stage 5's guard conditions — not
/// interpreted here.
/// </summary>
public sealed class ViewScanner
{
    private readonly IMFilesConnector _connector;
    private readonly IRepository<View> _viewRepository;
    private readonly ILogger<ViewScanner> _logger;

    public ViewScanner(IMFilesConnector connector, IRepository<View> viewRepository, ILogger<ViewScanner> logger)
    {
        _connector = connector;
        _viewRepository = viewRepository;
        _logger = logger;
    }

    /// <param name="vaultGuid">The vault GUID as returned by GetOnlineVaults() — the identity anchor.</param>
    /// <param name="vaultName">The vault's current display name, recorded verbatim into any GUID-guard failure message.</param>
    /// <param name="scanId">The DiscoveryScan row this stage's writes are stamped with (LastSeenScanId).</param>
    public async Task<ViewScanResult> ScanAsync(
        string vaultGuid,
        string vaultName,
        int scanId,
        CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(vaultGuid))
            throw new ArgumentException("vaultGuid is required — it is the identity anchor.", nameof(vaultGuid));

        using var vault = await _connector.LogInToVaultAsync(vaultGuid, ct);

        var rawViews = await vault.GetViewsAsync(ct);
        var guidByMFilesId = rawViews.ToDictionary(v => v.MFilesId, v => v.Guid);

        var rows = new List<View>();
        foreach (var v in rawViews)
        {
            string? parentGuid = null;
            if (v.HasParent)
            {
                if (!guidByMFilesId.TryGetValue(v.ParentMFilesId, out parentGuid))
                    throw new InvalidOperationException(
                        $"View \"{v.Name}\" (MFilesId {v.MFilesId}) in vault \"{vaultName}\" references parent view " +
                        $"MFilesId {v.ParentMFilesId}, not found among this scan's views. Refusing to write an unresolved View.ParentViewGuid.");
            }

            rows.Add(View.Create(vaultGuid, vaultName, v.Guid, v.MFilesId, v.Name, v.Common, parentGuid, v.SearchConditionsExported));
        }

        await _viewRepository.UpsertManyAsync(rows, scanId);

        _logger.LogInformation(
            "Stage 7 — views: {Count} scanned for {VaultName} ({VaultGuid})",
            rows.Count, vaultName, vaultGuid);

        return new ViewScanResult(vaultGuid, rows.Count);
    }
}
