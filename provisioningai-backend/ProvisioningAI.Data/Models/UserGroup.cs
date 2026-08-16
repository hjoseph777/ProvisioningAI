using Microsoft.EntityFrameworkCore;

namespace ProvisioningAI.Data.Models;

[Index(nameof(VaultGuid), nameof(Guid), IsUnique = true)]
public sealed record UserGroup
{
    public int Id { get; init; }
    public required string VaultGuid { get; init; }
    public required string Guid { get; init; }
    public required int MFilesId { get; init; }
    public required string Name { get; init; }
    public required bool IsPredefined { get; init; }

    public int? LastSeenScanId { get; set; }

    public static UserGroup Create(string vaultGuid, string vaultName, string guid, int mfilesId, string name, bool isPredefined)
    {
        GuidGuard.Require(vaultGuid, $"{nameof(UserGroup)}.{nameof(VaultGuid)}", vaultName, mfilesId.ToString(), name);
        GuidGuard.Require(guid, nameof(UserGroup), vaultName, mfilesId.ToString(), name);
        return new UserGroup
        {
            VaultGuid = vaultGuid,
            Guid = guid,
            MFilesId = mfilesId,
            Name = name,
            IsPredefined = isPredefined,
        };
    }
}
