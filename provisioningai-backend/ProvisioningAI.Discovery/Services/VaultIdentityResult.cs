namespace ProvisioningAI.Discovery.Services;

/// <summary>
/// Result of scanning vault identity (Stage 1). Carries what was read from
/// GetOnlineVaults() and what action the scanner took on the index.
/// </summary>
public sealed record VaultIdentityResult(
    string VaultGuid,
    string VaultName,
    string ServerAddress,
    DateTime ScannedAt,
    VaultIdentityAction Action);

public enum VaultIdentityAction
{
    /// <summary>New vault — first time we have seen this GUID.</summary>
    Inserted,

    /// <summary>Known vault — GUID matched an existing index row; name/timestamp refreshed.</summary>
    Updated,

    /// <summary>
    /// §4.6 foot-gun: GUID matched no existing row, but the NAME matched one.
    /// Signals "Change Unique ID" was run or this is a new-identity restore over
    /// a previously-indexed vault. The row was NOT written; the operator must
    /// resolve the conflict before the index accepts this vault.
    /// </summary>
    GuidChangedWarning
}
