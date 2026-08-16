using Microsoft.EntityFrameworkCore;

namespace ProvisioningAI.Data.Models;

/// <summary>
/// An M-Files user account (or pseudo-user, e.g. "(current user)") — confirmed live
/// (2026-07-27): IUserAccount itself has no .GUID property, but the Users built-in
/// value list (MFBuiltInValueList.Users=6) DOES carry a real GUID per entry, matched
/// here by numeric ID — same reconciliation pattern as Workflow/State in Stage 5.
/// Includes negative-ID pseudo-users verbatim (e.g. "(current user)", "(external
/// source)") — they are real, resolvable recipients in workflow actions/ACLs.
/// </summary>
[Index(nameof(VaultGuid), nameof(Guid), IsUnique = true)]
public sealed record UserAccount
{
    public int Id { get; init; }
    public required string VaultGuid { get; init; }
    public required string Guid { get; init; }
    public required int MFilesId { get; init; }
    public required string LoginName { get; init; }

    /// <summary>Raw MFUserAccountVaultRole bitmask, verbatim — not decoded into named roles here.</summary>
    public required int VaultRoles { get; init; }
    public required bool InternalUser { get; init; }
    public required bool Enabled { get; init; }

    public int? LastSeenScanId { get; set; }

    public static UserAccount Create(
        string vaultGuid, string vaultName, string guid, int mfilesId, string loginName,
        int vaultRoles, bool internalUser, bool enabled)
    {
        GuidGuard.Require(vaultGuid, $"{nameof(UserAccount)}.{nameof(VaultGuid)}", vaultName, mfilesId.ToString(), loginName);
        GuidGuard.Require(guid, nameof(UserAccount), vaultName, mfilesId.ToString(), loginName);
        return new UserAccount
        {
            VaultGuid = vaultGuid,
            Guid = guid,
            MFilesId = mfilesId,
            LoginName = loginName,
            VaultRoles = vaultRoles,
            InternalUser = internalUser,
            Enabled = enabled,
        };
    }
}
