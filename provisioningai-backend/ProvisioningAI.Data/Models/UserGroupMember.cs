using Microsoft.EntityFrameworkCore;

namespace ProvisioningAI.Data.Models;

/// <summary>
/// One membership entry from IUserGroup.Members (raw numeric user IDs on the COM
/// shape) — resolved here to the member's UserAccount GUID, same discipline as
/// ClassProperty resolving PropertyDef IDs to GUIDs in Task A. M-Files user groups
/// hold user members only (no nested groups on this COM shape), confirmed live.
/// </summary>
[Index(nameof(VaultGuid), nameof(UserGroupGuid), nameof(MemberUserAccountGuid), IsUnique = true)]
public sealed record UserGroupMember
{
    public int Id { get; init; }
    public required string VaultGuid { get; init; }
    public required string UserGroupGuid { get; init; }
    public required string MemberUserAccountGuid { get; init; }

    public int? LastSeenScanId { get; set; }

    public static UserGroupMember Create(string vaultGuid, string vaultName, string groupName, string userGroupGuid, string memberUserAccountGuid)
    {
        GuidGuard.Require(vaultGuid, $"{nameof(UserGroupMember)}.{nameof(VaultGuid)}", vaultName, "-", groupName);
        GuidGuard.Require(userGroupGuid, $"{nameof(UserGroupMember)}.{nameof(UserGroupGuid)}", vaultName, "-", groupName);
        GuidGuard.Require(memberUserAccountGuid, $"{nameof(UserGroupMember)}.{nameof(MemberUserAccountGuid)}", vaultName, "-", groupName);
        return new UserGroupMember
        {
            VaultGuid = vaultGuid,
            UserGroupGuid = userGroupGuid,
            MemberUserAccountGuid = memberUserAccountGuid,
        };
    }
}
