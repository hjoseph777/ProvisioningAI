namespace ProvisioningAI.Data.Models;

// NVS needs its own table — module + key + value, case-sensitive, plus the customer/static/unclassified/artifact classification.
public sealed record NamedValueStorage
{
    public required string VaultGuid { get; init; }
    public required string Module { get; init; }
    public required string Key { get; init; }
    public required string Value { get; init; }
    public required string Classification { get; init; } = "unclassified";
    
    public int? LastSeenScanId { get; set; }
    public DateTime? ValueChangedAt { get; set; }
}
