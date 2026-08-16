using Microsoft.EntityFrameworkCore;

namespace ProvisioningAI.Data.Models;

[Index(nameof(VaultGuid), nameof(Guid), IsUnique = true)]
public sealed record Class
{
    public int Id { get; init; }
    public required string VaultGuid { get; init; }
    public required string Guid { get; init; }
    public required int MFilesId { get; init; }
    public required string Name { get; init; }
    public required string ObjectTypeGuid { get; init; }

    public int? LastSeenScanId { get; set; }

    public static Class Create(string vaultGuid, string vaultName, string guid, int mfilesId, string name, string objectTypeGuid)
    {
        GuidGuard.Require(vaultGuid, $"{nameof(Class)}.{nameof(VaultGuid)}", vaultName, mfilesId.ToString(), name);
        GuidGuard.Require(guid, nameof(Class), vaultName, mfilesId.ToString(), name);
        GuidGuard.Require(objectTypeGuid, $"{nameof(Class)}.{nameof(ObjectTypeGuid)}", vaultName, mfilesId.ToString(), name);
        return new Class
        {
            VaultGuid = vaultGuid,
            Guid = guid,
            MFilesId = mfilesId,
            Name = name,
            ObjectTypeGuid = objectTypeGuid,
        };
    }
}
