using Microsoft.EntityFrameworkCore;

namespace ProvisioningAI.Data.Models;

/// <summary>An M-Files object type, scoped to the vault it was discovered in.</summary>
[Index(nameof(VaultGuid), nameof(Guid), IsUnique = true)]
public sealed class ObjectType
{
    public int Id { get; init; }
    public required string VaultGuid { get; init; }
    public required string Guid { get; init; }

    /// <summary>Diagnostics only — never used for lookup. Numeric IDs shift between vault clones (claude.md §4.1).</summary>
    public int MFilesId { get; init; }

    public required string Name { get; init; }
    public string? DisplayName { get; init; }
    public bool RealObjectType { get; init; }
    public int? LastSeenScanId { get; set; }

    public static ObjectType Create(string vaultGuid, string vaultName, string guid, int mfilesId, string name, string? displayName, bool realObjectType)
    {
        GuidGuard.Require(vaultGuid, $"{nameof(ObjectType)}.{nameof(VaultGuid)}", vaultName, mfilesId.ToString(), name);
        GuidGuard.Require(guid, nameof(ObjectType), vaultName, mfilesId.ToString(), name);
        return new ObjectType
        {
            VaultGuid = vaultGuid,
            Guid = guid,
            MFilesId = mfilesId,
            Name = name,
            DisplayName = displayName,
            RealObjectType = realObjectType,
        };
    }
}
