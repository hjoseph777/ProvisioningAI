using Microsoft.EntityFrameworkCore;

namespace ProvisioningAI.Data.Models;

[Index(nameof(VaultGuid), nameof(Guid), IsUnique = true)]
public sealed record NamedAcl
{
    public int Id { get; init; }
    public required string VaultGuid { get; init; }
    public required string Guid { get; init; }
    public required int MFilesId { get; init; }
    public required string Name { get; init; }
    
    /// <summary>
    /// Stores the serialized ACL definition verbatim — AccessControlList.GetAsBytes()
    /// (M-Files' own binary ACL serialization), Base64-encoded for JSON storage. Same
    /// mechanism as Stage 5's ActionSetPermissions capture; not decoded into
    /// individual ACEs here (that decoding, if ever needed, is provisioning-time work).
    /// </summary>
    public string? AclDefinitionJson { get; init; }

    /// <summary>Raw MFNamedACLType (Normal=1, Internal=2), verbatim.</summary>
    public int? NamedAclType { get; init; }

    public int? LastSeenScanId { get; set; }

    public static NamedAcl Create(string vaultGuid, string vaultName, string guid, int mfilesId, string name, int namedAclType, string? aclDefinitionJson)
    {
        GuidGuard.Require(vaultGuid, $"{nameof(NamedAcl)}.{nameof(VaultGuid)}", vaultName, mfilesId.ToString(), name);
        GuidGuard.Require(guid, nameof(NamedAcl), vaultName, mfilesId.ToString(), name);
        return new NamedAcl
        {
            VaultGuid = vaultGuid,
            Guid = guid,
            MFilesId = mfilesId,
            Name = name,
            NamedAclType = namedAclType,
            AclDefinitionJson = aclDefinitionJson,
        };
    }
}
