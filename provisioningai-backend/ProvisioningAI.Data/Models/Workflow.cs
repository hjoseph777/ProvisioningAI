using Microsoft.EntityFrameworkCore;

namespace ProvisioningAI.Data.Models;

/// <summary>An M-Files workflow, scoped to the vault it was discovered in. Workflows are explicitly GUID-keyed per claude.md §4.1.</summary>
[Index(nameof(VaultGuid), nameof(Guid), IsUnique = true)]
public sealed class Workflow
{
    public int Id { get; init; }
    public required string VaultGuid { get; init; }
    public required string Guid { get; init; }

    /// <summary>Diagnostics only — never used for lookup (claude.md §4.1).</summary>
    public int MFilesId { get; init; }

    public required string Name { get; init; }
    public string? Description { get; init; }
    
    public int? LastSeenScanId { get; set; }

    public static Workflow Create(string vaultGuid, string vaultName, string guid, int mfilesId, string name, string? description)
    {
        GuidGuard.Require(vaultGuid, $"{nameof(Workflow)}.{nameof(VaultGuid)}", vaultName, mfilesId.ToString(), name);
        GuidGuard.Require(guid, nameof(Workflow), vaultName, mfilesId.ToString(), name);
        return new Workflow
        {
            VaultGuid = vaultGuid,
            Guid = guid,
            MFilesId = mfilesId,
            Name = name,
            Description = description,
        };
    }
}
