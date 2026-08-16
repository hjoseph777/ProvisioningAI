using Microsoft.EntityFrameworkCore.Storage.ValueConversion;

namespace ProvisioningAI.Data.Converters;

/// <summary>
/// Enforces the canonical braced, uppercase GUID format: {277BA46A-7F72-4ADD-B992-C90C270430E5}.
/// Normalizes strings on write so that unique indices and comparisons always match correctly.
/// </summary>
public class CanonicalGuidConverter : ValueConverter<string, string>
{
    public CanonicalGuidConverter() 
        : base(
            v => NormalizeGuid(v),
            v => v // Reading from DB is already in canonical format due to the write normalization
        )
    {
    }

    private static string NormalizeGuid(string input)
    {
        if (string.IsNullOrWhiteSpace(input)) return input; // Let DB constraints or Required properties handle null/empty

        // Parse to ensure it's a valid GUID, then format as "B" (braces, hyphens, uppercase logic later)
        if (Guid.TryParse(input, out var parsedGuid))
        {
            return parsedGuid.ToString("B").ToUpperInvariant();
        }

        return input; // If invalid, just return it and let the database CHECK constraint throw
    }
}
