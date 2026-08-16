namespace ProvisioningAI.Data.Models;

/// <summary>
/// An audit entry. Not an M-Files object — carries VaultGuid for scoping
/// (claude.md §4.2; every logged action in this product is vault-scoped) but
/// has no per-row Guid of its own.
/// </summary>
public sealed class AuditLog
{
    public int AuditId { get; init; }
    public required string VaultGuid { get; init; }
    public required string VaultName { get; init; }
    public DateTime Timestamp { get; init; }
    public required string User { get; init; }

    /// <summary>DISCOVERY_SCAN, PROVISIONING_PLAN, PROVISIONING_APPLY, COPILOT_QUERY, etc.</summary>
    public required string Action { get; init; }

    public string? ResourceType { get; init; }
    public string? ResourceId { get; init; }

    /// <summary>Full context, JSON.</summary>
    public string? DetailsJson { get; init; }

    /// <summary>INFO, WARNING, ERROR, or CRITICAL.</summary>
    public required string Severity { get; init; }

    public static AuditLog Create(
        string vaultGuid, string vaultName, DateTime timestamp, string user, string action,
        string? resourceType, string? resourceId, string? detailsJson, string severity)
    {
        GuidGuard.Require(vaultGuid, nameof(AuditLog), vaultName, vaultGuid, vaultName);
        return new AuditLog
        {
            VaultGuid = vaultGuid,
            VaultName = vaultName,
            Timestamp = timestamp,
            User = user,
            Action = action,
            ResourceType = resourceType,
            ResourceId = resourceId,
            DetailsJson = detailsJson,
            Severity = severity,
        };
    }
}
