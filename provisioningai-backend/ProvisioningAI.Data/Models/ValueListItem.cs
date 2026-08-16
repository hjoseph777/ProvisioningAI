using Microsoft.EntityFrameworkCore;

namespace ProvisioningAI.Data.Models;

[Index(nameof(VaultGuid), nameof(Guid), IsUnique = true)]
public sealed record ValueListItem
{
    public int Id { get; init; }
    public required string VaultGuid { get; init; }
    public required string Guid { get; init; }
    public required int MFilesId { get; init; }
    public required string ValueListGuid { get; init; }
    public required string Name { get; init; }
    public required bool IsDeleted { get; init; }

    public int? LastSeenScanId { get; set; }

    public static ValueListItem Create(string vaultGuid, string vaultName, string guid, int mfilesId, string valueListGuid, string name, bool isDeleted)
    {
        GuidGuard.Require(vaultGuid, $"{nameof(ValueListItem)}.{nameof(VaultGuid)}", vaultName, mfilesId.ToString(), name);
        GuidGuard.Require(guid, nameof(ValueListItem), vaultName, mfilesId.ToString(), name);
        GuidGuard.Require(valueListGuid, $"{nameof(ValueListItem)}.{nameof(ValueListGuid)}", vaultName, mfilesId.ToString(), name);
        return new ValueListItem
        {
            VaultGuid = vaultGuid,
            Guid = guid,
            MFilesId = mfilesId,
            ValueListGuid = valueListGuid,
            Name = name,
            IsDeleted = isDeleted,
        };
    }
}
