using Microsoft.EntityFrameworkCore;

namespace ProvisioningAI.Data.Models;

/// <summary>
/// Rebuilds the required/optional fact dropped from Property in Stage 3
/// (migration DropPropertyIsRequired) as its own Class&lt;-&gt;Property
/// association, matching M-Files' own model: required-ness is a per-class
/// setting, read from IObjectClass.AssociatedPropertyDefs, not an attribute
/// of the property definition itself.
/// </summary>
[Index(nameof(VaultGuid), nameof(ClassGuid), nameof(PropertyGuid), IsUnique = true)]
public sealed record ClassProperty
{
    public int Id { get; init; }
    public required string VaultGuid { get; init; }
    public required string ClassGuid { get; init; }
    public required string PropertyGuid { get; init; }
    public required bool IsRequired { get; init; }

    public int? LastSeenScanId { get; set; }

    public static ClassProperty Create(string vaultGuid, string vaultName, string className, string classGuid, string propertyGuid, bool isRequired)
    {
        GuidGuard.Require(vaultGuid, $"{nameof(ClassProperty)}.{nameof(VaultGuid)}", vaultName, "-", className);
        GuidGuard.Require(classGuid, $"{nameof(ClassProperty)}.{nameof(ClassGuid)}", vaultName, "-", className);
        GuidGuard.Require(propertyGuid, $"{nameof(ClassProperty)}.{nameof(PropertyGuid)}", vaultName, "-", className);
        return new ClassProperty
        {
            VaultGuid = vaultGuid,
            ClassGuid = classGuid,
            PropertyGuid = propertyGuid,
            IsRequired = isRequired,
        };
    }
}
