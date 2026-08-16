using Microsoft.EntityFrameworkCore;

namespace ProvisioningAI.Data.Models;

/// <summary>
/// A customer-specific configuration point (SQL connector, ERP endpoint, value
/// list, named ACL, ...). Guid is the GUID of the underlying M-Files object
/// this wraps (the property def, value list, or ACL already scanned) — not a
/// synthetic ID of our own, since the whole point is round-tripping to the
/// real object during provisioning.
/// </summary>
[Index(nameof(VaultGuid), nameof(Guid), IsUnique = true)]
public sealed class IntegrationPoint
{
    public int Id { get; init; }
    public required string VaultGuid { get; init; }
    public required string Guid { get; init; }

    public required string Name { get; init; }

    /// <summary>VAF_CONFIG, PROPERTY_DEFINITION, VALUE_LIST, or NAMED_ACL.</summary>
    public required string Type { get; init; }

    public string? CurrentValue { get; init; }

    /// <summary>Where to find/update it — path, COM lookup method, etc. JSON.</summary>
    public required string LocationJson { get; init; }

    public string? DataType { get; init; }
    public bool IsRewireable { get; init; } = true;

    public int? LastSeenScanId { get; set; }

    public static IntegrationPoint Create(
        string vaultGuid, string vaultName, string guid, string name, string type,
        string? currentValue, string locationJson, string? dataType, bool isRewireable = true)
    {
        GuidGuard.Require(vaultGuid, $"{nameof(IntegrationPoint)}.{nameof(VaultGuid)}", vaultName, guid, name);
        GuidGuard.Require(guid, nameof(IntegrationPoint), vaultName, guid, name);
        return new IntegrationPoint
        {
            VaultGuid = vaultGuid,
            Guid = guid,
            Name = name,
            Type = type,
            CurrentValue = currentValue,
            LocationJson = locationJson,
            DataType = dataType,
            IsRewireable = isRewireable,
        };
    }
}
