using ProvisioningAI.Data.Models;

namespace ProvisioningAI.Tests.Data;

public class GuidGuardTests
{
    [Fact]
    public void Require_ValidGuid_ReturnsItUnchanged()
    {
        var result = GuidGuard.Require("{277BA46A-7F72-4ADD-B992-C90C270430E5}", "ObjectType", "Conformity", "42", "Document");

        Assert.Equal("{277BA46A-7F72-4ADD-B992-C90C270430E5}", result);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData("not-a-guid")]
    [InlineData("{00000000-0000-0000-0000-000000000000}")] // all-zero — explicitly rejected, not just malformed
    public void Require_InvalidGuid_Throws(string? guid)
    {
        var ex = Assert.Throws<InvalidGuidException>(
            () => GuidGuard.Require(guid, "ObjectType", "Conformity", "42", "Document"));

        // Message must be immediately diagnosable — entity type, vault, object id, and name.
        Assert.Contains("ObjectType", ex.Message);
        Assert.Contains("Conformity", ex.Message);
        Assert.Contains("42", ex.Message);
        Assert.Contains("Document", ex.Message);
    }

    [Fact]
    public void Require_NoNameFallback_ThrowsEvenWhenNameIsPerfectlyValid()
    {
        // The point of this rule: a valid, human-readable name must never rescue an invalid GUID.
        var ex = Record.Exception(() => GuidGuard.Require("", "Property", "Conformity", "7", "SQL_Connection"));

        Assert.IsType<InvalidGuidException>(ex);
    }
}
