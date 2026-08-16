using Microsoft.Extensions.Logging;
using ProvisioningAI.Data.Models;
using ProvisioningAI.Data.Repositories;
using ProvisioningAI.MFilesConnectors;

namespace ProvisioningAI.Discovery.Services;

/// <summary>
/// Stage 1: vault identity. Reads one VaultInfo from GetOnlineVaults(), upserts
/// it into VaultStructures, and applies the §4.6 name-cross-check.
///
/// Reads only — no COM vault login required for this stage. The GUID comes from
/// GetOnlineVaults(), never from Vault.GUID on a logged-in handle (that property
/// comes back empty on a live server; confirmed 2026-07-26 against Conformity).
/// </summary>
public sealed class VaultIdentityScanner
{
    private readonly IMFilesConnector _connector;
    private readonly VaultStructureRepository _repository;
    private readonly ILogger<VaultIdentityScanner> _logger;

    public VaultIdentityScanner(
        IMFilesConnector connector,
        VaultStructureRepository repository,
        ILogger<VaultIdentityScanner> logger)
    {
        _connector = connector;
        _repository = repository;
        _logger = logger;
    }

    /// <summary>
    /// Scans vault identity for one specific vault (by GUID).
    ///
    /// Why take the GUID as input rather than scanning all vaults? The scanner
    /// is per-vault — the caller (a future coordinator) chooses which vault to
    /// target after letting the operator select from ListVaultsAsync(). This
    /// method does exactly stage 1 for that one vault.
    /// </summary>
    /// <param name="vaultGuid">
    /// The vault GUID as returned by GetOnlineVaults() — braced, uppercase,
    /// canonical form. This is the identity anchor; never pass a file path or
    /// folder name.
    /// </param>
    /// <param name="serverAddress">
    /// The server address used to connect (for recording in the index).
    /// </param>
    public async Task<VaultIdentityResult> ScanAsync(
        string vaultGuid,
        string serverAddress,
        CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(vaultGuid))
            throw new ArgumentException("vaultGuid is required — it is the identity anchor.", nameof(vaultGuid));

        // GetOnlineVaults() is the canonical source of vault identity.
        var vaults = await _connector.ListVaultsAsync(ct);
        var vaultInfo = vaults.FirstOrDefault(v => v.Guid == vaultGuid)
            ?? throw new InvalidOperationException(
                $"Vault {vaultGuid} not found in GetOnlineVaults(). " +
                "The vault may be offline, or the GUID was taken from a non-canonical source.");

        var scannedAt = DateTime.UtcNow;

        // §4.6 foot-gun check: GUID unknown, but name matches a known vault.
        // This signals "Change Unique ID" was run or a new-identity restore
        // happened over a previously-indexed vault.
        var existingByGuid = await _repository.FindByGuidAsync(vaultGuid, ct);
        if (existingByGuid is null)
        {
            var existingByName = await _repository.FindByNameAsync(vaultInfo.Name, ct);
            if (existingByName is not null)
            {
                _logger.LogWarning(
                    "Vault GUID changed: vault named {VaultName} was previously indexed as " +
                    "{OldGuid} but is now presenting as {NewGuid}. " +
                    "This indicates 'Change Unique ID' was run or a new-identity restore occurred. " +
                    "The index row has NOT been updated — resolve the conflict before rescanning.",
                    vaultInfo.Name, existingByName.VaultGuid, vaultGuid);

                return new VaultIdentityResult(
                    vaultGuid, vaultInfo.Name, serverAddress, scannedAt,
                    VaultIdentityAction.GuidChangedWarning);
            }
        }

        var action = existingByGuid is null
            ? VaultIdentityAction.Inserted
            : VaultIdentityAction.Updated;

        var row = VaultStructure.Create(vaultGuid, vaultInfo.Name, scannedAt);
        await _repository.UpsertAsync(row, ct);

        _logger.LogInformation(
            "Stage 1 — vault identity: {Action} {VaultName} ({VaultGuid}) from {Server} at {ScannedAt}",
            action, vaultInfo.Name, vaultGuid, serverAddress, scannedAt);

        return new VaultIdentityResult(vaultGuid, vaultInfo.Name, serverAddress, scannedAt, action);
    }
}
