using System.Reflection;
using Microsoft.EntityFrameworkCore;
using ProvisioningAI.Data;

namespace ProvisioningAI.Tests.Data;

/// <summary>
/// Architecture convention test — closes the recurring gap where a new entity
/// ships with a bare "Guid" property (identifying one specific M-Files object)
/// but no Create() factory to run it through GuidGuard at ingest. Found after
/// the fact three times in a row (Class before Stage 4, UserGroup/NamedAcl
/// before Stage 6) and a fourth time while writing this very test (View, before
/// Stage 7) — each time discovered only when a scanner needed the entity, not
/// when the entity was written. A shared base class doesn't fit here (every
/// Create() takes a different parameter list), so this test is the enforcement
/// mechanism instead: it turns "forgot Create()" into a failing build the
/// moment a new entity ships, rather than a silent gap rediscovered later.
///
/// Deliberately scoped to entities with a bare "Guid" property, not every
/// "*Guid"-suffixed property — VaultStructure (identified by VaultGuid itself)
/// and WorkflowTransition/ClassProperty/UserGroupMember (identified by a
/// composite of *Guid foreign keys, no entity of their own) already have their
/// own Create() factories independent of this rule; NamedValueStorage
/// genuinely has no M-Files GUID identity at all (keyed by Module+Key) and is
/// correctly not flagged.
/// </summary>
public sealed class EntityCreateFactoryConventionTests
{
    [Fact]
    public void EveryEntityWithAGuidProperty_HasAPublicStaticCreateFactory()
    {
        var options = new DbContextOptionsBuilder<ProvisioningAiDbContext>()
            .UseSqlite("DataSource=:memory:")
            .Options;
        using var db = new ProvisioningAiDbContext(options);

        var entityTypes = db.Model.GetEntityTypes().Select(e => e.ClrType).Distinct();

        var missing = new List<string>();
        foreach (var type in entityTypes)
        {
            var guidProperty = type.GetProperty("Guid", BindingFlags.Public | BindingFlags.Instance);
            if (guidProperty is null || guidProperty.PropertyType != typeof(string))
                continue;

            var createMethod = type.GetMethod("Create", BindingFlags.Public | BindingFlags.Static);
            if (createMethod is null)
                missing.Add(type.Name);
        }

        Assert.True(missing.Count == 0,
            "These entities have a bare 'Guid' property but no public static Create() factory " +
            "(so GuidGuard never runs at ingest for them): " + string.Join(", ", missing));
    }
}
