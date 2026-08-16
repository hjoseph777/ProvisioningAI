using Microsoft.EntityFrameworkCore;

namespace ProvisioningAI.Data.Models;

[Index(nameof(VaultGuid), nameof(Guid), IsUnique = true)]
public sealed record ValueList
{
    public int Id { get; init; }
    public required string VaultGuid { get; init; }
    public required string Guid { get; init; }
    public required int MFilesId { get; init; }
    public required string Name { get; init; }

    public int? LastSeenScanId { get; set; }

    public static ValueList Create(string vaultGuid, string vaultName, string guid, int mfilesId, string name)
    {
        GuidGuard.Require(vaultGuid, $"{nameof(ValueList)}.{nameof(VaultGuid)}", vaultName, mfilesId.ToString(), name);
        GuidGuard.Require(guid, nameof(ValueList), vaultName, mfilesId.ToString(), name);
        return new ValueList
        {
            VaultGuid = vaultGuid,
            Guid = guid,
            MFilesId = mfilesId,
            Name = name,
        };
    }
}
