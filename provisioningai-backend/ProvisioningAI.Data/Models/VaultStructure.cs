using Microsoft.EntityFrameworkCore;

namespace ProvisioningAI.Data.Models;

/// <summary>
/// One row per scanned vault — this IS the vault's own identity record, not an
/// object scoped to a vault, so it carries VaultGuid directly rather than a
/// separate Guid + VaultGuid pair.
/// </summary>
[Index(nameof(VaultGuid), IsUnique = true)]
public sealed class VaultStructure
{
    public int Id { get; init; }
    public required string VaultGuid { get; init; }

    /// <summary>Display label only — refresh on every scan, never use to identify the vault. See claude.md §4.1.</summary>
    public required string VaultName { get; init; }

    public DateTime LastScannedAt { get; init; }

    public static VaultStructure Create(string vaultGuid, string vaultName, DateTime lastScannedAt)
    {
        GuidGuard.Require(vaultGuid, nameof(VaultStructure), vaultName, vaultGuid, vaultName);
        return new VaultStructure { VaultGuid = vaultGuid, VaultName = vaultName, LastScannedAt = lastScannedAt };
    }
}
