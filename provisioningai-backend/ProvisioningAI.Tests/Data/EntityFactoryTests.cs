using ProvisioningAI.Data.Models;

namespace ProvisioningAI.Tests.Data;

// One representative test per distinct entity SHAPE, not all 10 entities individually —
// ObjectType/Property/Workflow all validate identically (VaultGuid + Guid), so covering
// ObjectType proves the pattern; same reasoning for WorkflowState (adds a parent GUID),
// WorkflowTransition (the one entity without its own Guid — see its file for why), and
// MappingTemplate (our own generated artifact, VaultGuid-only scoping, no per-row Guid).
public class EntityFactoryTests
{
    private static string NewGuid() => Guid.NewGuid().ToString("B"); // "{xxxxxxxx-xxxx-...}" — matches M-Files' braced format

    [Fact]
    public void ObjectType_Create_ValidGuid_Succeeds()
    {
        var guid = NewGuid();
        var ot = ObjectType.Create(NewGuid(), "Conformity", guid, 1, "Document", "Documents", true);

        Assert.Equal(guid, ot.Guid);
        Assert.Equal("Document", ot.Name);
    }

    [Fact]
    public void ObjectType_Create_EmptyGuid_ThrowsWithDiagnosticContext()
    {
        var ex = Assert.Throws<InvalidGuidException>(() => ObjectType.Create(NewGuid(), "Conformity", "", 1, "Document", null, true));

        Assert.Contains("ObjectType", ex.Message);
        Assert.Contains("Conformity", ex.Message);
        Assert.Contains("Document", ex.Message);
    }

    [Fact]
    public void ObjectType_Create_EmptyVaultGuid_ThrowsEvenWhenObjectGuidIsValid()
    {
        var ex = Assert.Throws<InvalidGuidException>(() => ObjectType.Create("", "Conformity", NewGuid(), 1, "Document", null, true));

        Assert.Contains("VaultGuid", ex.Message);
    }

    [Fact]
    public void WorkflowState_Create_EmptyWorkflowGuid_ThrowsEvenWhenStateGuidIsValid()
    {
        // The parent reference is just as much an identity as the state's own GUID.
        var ex = Assert.Throws<InvalidGuidException>(() =>
            WorkflowState.Create(NewGuid(), "Conformity", NewGuid(), 1, workflowGuid: "", name: "Draft", isInitial: true, isFinal: false));

        Assert.Contains("WorkflowGuid", ex.Message);
    }

    [Fact]
    public void WorkflowTransition_Create_HasNoOwnGuidButValidatesAllThreeReferences()
    {
        var vaultGuid = "{44444444-4444-4444-4444-444444444444}";
        var workflowGuid = "{11111111-1111-1111-1111-111111111111}";
        var s1 = "{22222222-2222-2222-2222-222222222222}";
        var s2 = "{33333333-3333-3333-3333-333333333333}";

        var transition = WorkflowTransition.Create(
            vaultGuid, "Test Vault", workflowGuid, 1, s1, s2, null, null);

        Assert.Equal(s1, transition.FromStateGuid);
        Assert.Equal(s2, transition.ToStateGuid);

        Assert.Throws<InvalidGuidException>(() =>
            WorkflowTransition.Create(vaultGuid, "Test Vault",
            workflowGuid: "", mfilesId: 1, fromStateGuid: s1, toStateGuid: s2, null, null));
    }

    [Fact]
    public void MappingTemplate_Create_OnlyValidatesVaultGuid_NoPerRowGuid()
    {
        var template = MappingTemplate.Create("{277BA46A-7F72-4ADD-B992-C90C270430E5}", "Conformity", DateTime.UtcNow, "{}", 1, "DRAFT");

        Assert.Equal("Conformity", template.VaultName);

        Assert.Throws<InvalidGuidException>(() =>
            MappingTemplate.Create("", "Conformity", DateTime.UtcNow, "{}", 1, "DRAFT"));
    }
}
