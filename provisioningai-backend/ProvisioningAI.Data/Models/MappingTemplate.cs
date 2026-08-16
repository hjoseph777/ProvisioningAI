namespace ProvisioningAI.Data.Models;

/// <summary>
/// Generated output, not an M-Files object — carries VaultGuid for scoping
/// (claude.md §4.2) but has no separate per-row Guid of its own; TemplateId
/// (the surrogate key) is this record's identity.
/// </summary>
public sealed class MappingTemplate
{
    public int TemplateId { get; init; }
    public required string VaultGuid { get; init; }
    public required string VaultName { get; init; }
    public DateTime GeneratedAt { get; init; }

    /// <summary>Full mapping template, JSON.</summary>
    public required string IntegrationPointsJson { get; init; }

    public int Version { get; init; }

    /// <summary>DRAFT, VALIDATED, or PRODUCTION.</summary>
    public required string Status { get; init; }

    public static MappingTemplate Create(string vaultGuid, string vaultName, DateTime generatedAt, string integrationPointsJson, int version, string status)
    {
        GuidGuard.Require(vaultGuid, nameof(MappingTemplate), vaultName, vaultGuid, vaultName);
        return new MappingTemplate
        {
            VaultGuid = vaultGuid,
            VaultName = vaultName,
            GeneratedAt = generatedAt,
            IntegrationPointsJson = integrationPointsJson,
            Version = version,
            Status = status,
        };
    }
}
