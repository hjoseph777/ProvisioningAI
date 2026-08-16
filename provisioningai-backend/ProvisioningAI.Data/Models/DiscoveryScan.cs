namespace ProvisioningAI.Data.Models;

/// <summary>
/// Metadata for one structural scan run. Not an M-Files object — carries
/// VaultGuid for scoping (claude.md §4.2) but has no per-row Guid of its own.
/// Per claude.md §4.4, a scan is long-running and resumable: this row's
/// Status/CompletedAt track exactly how far it got, so a failure at a later
/// stage doesn't cost the stages already persisted.
/// </summary>
public sealed class DiscoveryScan
{
    public int ScanId { get; init; }
    public required string VaultGuid { get; init; }
    public required string VaultName { get; init; }
    public DateTime StartedAt { get; init; }
    public DateTime? CompletedAt { get; init; }
    public int ObjectsFound { get; init; }
    public int IntegrationsFound { get; init; }

    /// <summary>Detected issues (orphaned classes, circular workflows, etc.), JSON.</summary>
    public string? ConflictsDetectedJson { get; init; }

    /// <summary>RUNNING, COMPLETED, or FAILED.</summary>
    public required string Status { get; init; }

    public long ScanDurationMs { get; init; }

    public static DiscoveryScan Create(string vaultGuid, string vaultName, DateTime startedAt, string status)
    {
        GuidGuard.Require(vaultGuid, nameof(DiscoveryScan), vaultName, vaultGuid, vaultName);
        return new DiscoveryScan { VaultGuid = vaultGuid, VaultName = vaultName, StartedAt = startedAt, Status = status };
    }
}
