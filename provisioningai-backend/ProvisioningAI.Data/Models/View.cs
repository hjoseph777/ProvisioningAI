using Microsoft.EntityFrameworkCore;

namespace ProvisioningAI.Data.Models;

[Index(nameof(VaultGuid), nameof(Guid), IsUnique = true)]
public sealed record View
{
    public int Id { get; init; }
    public required string VaultGuid { get; init; }
    public required string Guid { get; init; }
    public required int MFilesId { get; init; }
    public required string Name { get; init; }
    public required bool IsCommon { get; init; }

    /// <summary>Parent view's GUID, resolved within the same scan from the numeric Parent ID — null if this view has no parent (HasParent=false on the real COM shape).</summary>
    public string? ParentViewGuid { get; init; }

    /// <summary>
    /// The view's defining search criteria, verbatim — SearchConditions.GetAsExportedSearchString(),
    /// M-Files' own textual export, same mechanism used for Stage 5's guard conditions. Null if the
    /// view has no search conditions (e.g. an empty filter-only container).
    /// </summary>
    public string? SearchConditionsExported { get; init; }

    public int? LastSeenScanId { get; set; }

    public static View Create(
        string vaultGuid, string vaultName, string guid, int mfilesId, string name,
        bool isCommon = false, string? parentViewGuid = null, string? searchConditionsExported = null)
    {
        GuidGuard.Require(vaultGuid, $"{nameof(View)}.{nameof(VaultGuid)}", vaultName, mfilesId.ToString(), name);
        GuidGuard.Require(guid, nameof(View), vaultName, mfilesId.ToString(), name);
        return new View
        {
            VaultGuid = vaultGuid,
            Guid = guid,
            MFilesId = mfilesId,
            Name = name,
            IsCommon = isCommon,
            ParentViewGuid = parentViewGuid,
            SearchConditionsExported = searchConditionsExported,
        };
    }
}
