namespace ProvisioningAI.Data.Models;

/// <summary>
/// A GUID that is missing or all-zero at ingest, silently written as null or
/// dropped in favor of a name lookup, corrupts provisioning later — the exact
/// failure mode claude.md §4.1 warns about (a stale ID overwriting the wrong
/// field with no error). There is no fallback here on purpose.
/// </summary>
public sealed class InvalidGuidException : Exception
{
    public InvalidGuidException(string message) : base(message) { }
}

/// <summary>
/// Enforced at ingest, not at the database layer: by the time a row exists,
/// its GUID was already validated. This exists so every entity's Create()
/// factory calls one shared check instead of six copies of the same regex.
/// </summary>
public static class GuidGuard
{
    /// <summary>
    /// Throws InvalidGuidException if guid is null, empty, whitespace, not a
    /// well-formed GUID, or all-zero. Returns the guid unchanged otherwise, so
    /// callers can inline it: `Guid = GuidGuard.Require(guid, ...)`.
    /// </summary>
    public static string Require(string? guid, string entityType, string vaultName, string objectId, string objectName)
    {
        if (string.IsNullOrWhiteSpace(guid) || !Guid.TryParse(guid, out var parsed) || parsed == Guid.Empty)
        {
            throw new InvalidGuidException(
                $"{entityType} has an invalid GUID (\"{guid}\") in vault \"{vaultName}\" " +
                $"(object ID \"{objectId}\", name \"{objectName}\"). " +
                "GUID is required identity — there is no name-based fallback.");
        }
        return guid;
    }
}
