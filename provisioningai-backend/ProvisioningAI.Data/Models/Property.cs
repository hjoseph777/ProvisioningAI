using Microsoft.EntityFrameworkCore;

namespace ProvisioningAI.Data.Models;

/// <summary>An M-Files property definition, scoped to the vault it was discovered in.</summary>
[Index(nameof(VaultGuid), nameof(Guid), IsUnique = true)]
public sealed class Property
{
    public int Id { get; init; }
    public required string VaultGuid { get; init; }
    public required string Guid { get; init; }

    /// <summary>Diagnostics only — never used for lookup (claude.md §4.1).</summary>
    public int MFilesId { get; init; }

    public required string Name { get; init; }

    /// <summary>Raw MFDataType enum value    /// Maps to M-Files TypedValue.DataType (e.g. MFDatatypeText, MFDatatypeLookup)
    /// </summary>
    public required int DataType { get; init; }

    public int? LastSeenScanId { get; set; }

    public static Property Create(string vaultGuid, string vaultName, string guid, int mfilesId, string name, int dataType)
    {
        GuidGuard.Require(vaultGuid, $"{nameof(Property)}.{nameof(VaultGuid)}", vaultName, mfilesId.ToString(), name);
        GuidGuard.Require(guid, nameof(Property), vaultName, mfilesId.ToString(), name);
        return new Property
        {
            VaultGuid = vaultGuid,
            Guid = guid,
            MFilesId = mfilesId,
            Name = name,
            DataType = dataType,
        };
    }
}
