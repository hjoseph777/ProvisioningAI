using Microsoft.Extensions.Logging;
using ProvisioningAI.Data.Models;
using ProvisioningAI.Data.Repositories;
using ProvisioningAI.MFilesConnectors;

namespace ProvisioningAI.Discovery.Services;

/// <summary>
/// Stage 8: Named Value Storage (claude.md §4.4).
///
/// CONFIRMED BOUNDARY (2026-07-27, exhaustive investigation, not a guess left
/// unresolved): M-Files Admin's "Other Applications -> [App] -> Configuration"
/// UI — which for e.g. SQL Query Vault Application shows real, structured,
/// high-value data (workflow-state -> SQL-call mappings, directly completing
/// Stage 5's IsIntegrationTouching-flagged states with what SQL they actually
/// execute) — is NOT reachable through any API this project can use:
///   - Searched every type and every method name containing "Configuration" in
///     the entire Interop.MFilesApi.dll. Nothing exists for ICustomApplication.
///   - The only "Configuration" fields anywhere (IPluginInfo.Configuration/
///     ConfigurationScope/ConfigurationSource) belong to a different subsystem
///     entirely — authentication plugins (IMFilesServerApplication.
///     GetAuthenticationPlugins*()), not VAF/custom applications. An earlier
///     version of this stage wrongly assumed IPluginInfo was the right type;
///     caught live when GetCustomApplicationsEx2()'s real elements
///     (ICustomApplication) threw "does not contain a definition for
///     'ConfigurationScope'" — confirmed via reflection this element type has
///     no configuration-related members at all.
///   - IVaultNamedValueStorageOperations.GetNamedValues(type, namespace) has no
///     "list namespaces" call. Tried every installed application's ID and Name
///     as the namespace, across all 7 MFNamedValueType values (56 combinations)
///     plus several guessed generic namespace strings — all empty, live,
///     against the real Conformity vault.
///   - The REST API was also checked as an alternative and ruled out for this
///     environment: no IIS/W3SVC service running, no port 80/443 listening.
/// Working conclusion: M-Files Admin likely reads this through each VAF
/// module's own private storage mechanism, not the public COM/REST SDK.
///
/// SCOPE, GIVEN THAT BOUNDARY: this stage records what IS reachable —
///   1. The installed server-side application inventory itself
///      (GetCustomApplicationsEx2 -> ICustomApplication: ID, Name, Version,
///      Publisher, Enabled, ApplicationType) plus each one's real license
///      status (GetCustomApplicationLicenseStatus) — genuine, useful
///      structural facts (which VAF apps exist, whether they're licensed).
///   2. A best-effort generic NamedValueStorage probe per (application ID,
///      MFNamedValueType) — confirmed empty for every app in Conformity today,
///      but a legitimate general-purpose read; kept rather than removed in
///      case a future vault or application actually populates it there.
/// The rich per-app Configuration content (SQL-call mappings, UI/precondition
/// rules, calculation formulas, etc.) is NOT captured — it remains visible
/// only in M-Files Admin, and stays an open item pending a different access
/// mechanism (see progress.md).
/// </summary>
public sealed class NamedValueStorageScanner
{
    /// <summary>MFNamedValueType — confirmed via reflection (26.6.16115.9). Tried against every installed application's ID as namespace; all empty in Conformity.</summary>
    private static readonly int[] NamedValueTypes = [3, 4, 5, 6, 7, 8, 9]; // MFConfigurationValue..MFPrivateUserDefinedValue

    private readonly IMFilesConnector _connector;
    private readonly IRepository<NamedValueStorage> _repository;
    private readonly ILogger<NamedValueStorageScanner> _logger;

    public NamedValueStorageScanner(IMFilesConnector connector, IRepository<NamedValueStorage> repository, ILogger<NamedValueStorageScanner> logger)
    {
        _connector = connector;
        _repository = repository;
        _logger = logger;
    }

    /// <param name="vaultGuid">The vault GUID as returned by GetOnlineVaults() — the identity anchor.</param>
    /// <param name="vaultName">Unused for GuidGuard here (NamedValueStorage has no GUID identity) — kept for signature consistency with every other scanner.</param>
    /// <param name="scanId">The DiscoveryScan row this stage's writes are stamped with (LastSeenScanId).</param>
    public async Task<NamedValueStorageScanResult> ScanAsync(
        string vaultGuid,
        string vaultName,
        int scanId,
        CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(vaultGuid))
            throw new ArgumentException("vaultGuid is required — it is the identity anchor.", nameof(vaultGuid));

        using var vault = await _connector.LogInToVaultAsync(vaultGuid, ct);

        var apps = await vault.GetCustomApplicationsAsync(ct);

        NamedValueStorage NvsRow(string module, string key, string value) => new()
        {
            VaultGuid = vaultGuid,
            Module = module,
            Key = key,
            Value = value,
            Classification = "unclassified",
        };

        var rows = new List<NamedValueStorage>();
        foreach (var app in apps)
        {
            rows.Add(NvsRow(app.Name, "ApplicationId", app.ApplicationId));
            rows.Add(NvsRow(app.Name, "Version", app.Version));
            rows.Add(NvsRow(app.Name, "Publisher", app.Publisher));
            rows.Add(NvsRow(app.Name, "Enabled", app.Enabled.ToString()));
            rows.Add(NvsRow(app.Name, "ApplicationType", app.ApplicationType.ToString()));
            rows.Add(NvsRow(app.Name, "LicenseStatus", app.LicenseStatus.ToString()));

            foreach (var namedValueType in NamedValueTypes)
            {
                var entries = await vault.GetNamedValuesAsync(namedValueType, app.ApplicationId, ct);
                foreach (var entry in entries)
                    rows.Add(NvsRow(app.Name, $"[NVT{namedValueType}] {entry.Key}", entry.ValueText ?? ""));
            }
        }

        await _repository.UpsertManyAsync(rows, scanId);

        _logger.LogInformation(
            "Stage 8 — Named Value Storage: {AppCount} applications, {EntryCount} entries scanned for {VaultName} ({VaultGuid})",
            apps.Count, rows.Count, vaultName, vaultGuid);

        return new NamedValueStorageScanResult(vaultGuid, apps.Count, rows.Count);
    }
}
