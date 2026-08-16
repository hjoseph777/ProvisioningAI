using ProvisioningAI.Workflow.Translation;

namespace ProvisioningAI.Tests.Workflow;

/// <summary>
/// §3.5 Decision 6: `auto(4)`/`auto(5)` — TriggerMode confirmed automatic, TriggerCriteria
/// specifically not decoded. Distinct from the freeform-skeleton fallback, which defaults
/// TriggerMode to Manual — a real regression when the automatic mechanism itself is known
/// (see the real-data test below, which is the actual gap this row was built to close).
/// </summary>
public sealed class Decision6AutoUnconfirmedCriteriaTests
{
    private static PlannedTransition ResolveSingleEdge(string mermaid) =>
        TranslationPipeline.Translate(mermaid, new SidecarConfig()).Transitions.Single();

    [Fact]
    public void Auto4_ResolvesToAutomaticCriteria_NullCriteria_CriteriaUnconfirmedTrue()
    {
        var t = ResolveSingleEdge("stateDiagram-v2\n    StateA --> StateB : auto(4)");

        Assert.Equal(TriggerMode.AutomaticCriteria, t.TriggerMode);
        Assert.Null(t.TriggerCriteria);
        Assert.True(t.CriteriaUnconfirmed);
        Assert.False(t.IsSkeleton, "This is a confident assertion, not a parse failure — must not be flagged as a skeleton.");
        Assert.Equal("auto(4)", t.OriginalLabel);
    }

    [Fact]
    public void Auto5_ResolvesToAutomaticVBScript_NullCriteria_CriteriaUnconfirmedTrue()
    {
        var t = ResolveSingleEdge("stateDiagram-v2\n    StateA --> StateB : auto(5)");

        Assert.Equal(TriggerMode.AutomaticVBScript, t.TriggerMode);
        Assert.Null(t.TriggerCriteria);
        Assert.True(t.CriteriaUnconfirmed);
        Assert.False(t.IsSkeleton);
    }

    [Fact]
    public void Auto4_ComposesWithPrioritySuffix()
    {
        var t = ResolveSingleEdge("stateDiagram-v2\n    StateA --> StateB : auto(4)+priority(10)");

        Assert.Equal(TriggerMode.AutomaticCriteria, t.TriggerMode);
        Assert.Equal(10, t.EvaluationPriority);
        Assert.True(t.CriteriaUnconfirmed);
    }

    [Fact]
    public void PlainOrdinaryEdges_AreUnaffected_CriteriaUnconfirmedFalse()
    {
        var plan = TranslationPipeline.Translate(
            "stateDiagram-v2\n    StateA --> StateB\n    StateB --> StateC : if(Property=Value)",
            new SidecarConfig());

        Assert.All(plan.Transitions, t => Assert.False(t.CriteriaUnconfirmed));
    }

    /// <summary>
    /// Real-data regression check: the exact redacted Mermaid source used for Slice 1's
    /// "RouteToCategoryB" edge (the real, messy-vault verification task) — a genuine
    /// production transition confirmed TriggerMode=4, real-but-undecoded criteria. Before
    /// this row existed, the only honest encoding (a freeform prose label) produced
    /// TriggerMode: Manual — a factually wrong result, not just an incomplete one, since
    /// automatic was the one thing this project's own captured data already confirmed.
    /// This test is the actual regression check the gap-finding task called for.
    /// </summary>
    [Fact]
    public void RealDataRegression_FormerlyMisresolvedAutomaticEdge_NowResolvesCorrectly()
    {
        const string redactedRealSlice = """
            stateDiagram-v2
                [*] --> IntakeCheckA
                state classification_choice <<choice>>
                IntakeCheckA --> ClassificationHub : after(365d)
                ClassificationHub --> classification_choice
                classification_choice --> RouteToCategoryB : auto(4)
            """;

        var plan = TranslationPipeline.Translate(redactedRealSlice, new SidecarConfig());
        var t = plan.Transitions.Single(x => x.ToState == "RouteToCategoryB");

        // Before Decision 6: this resolved to TriggerMode.Manual (wrong — the real vault
        // confirms TriggerMode 4) via the freeform-skeleton fallback. Now:
        Assert.Equal(TriggerMode.AutomaticCriteria, t.TriggerMode);
        Assert.True(t.CriteriaUnconfirmed);
        Assert.False(t.IsSkeleton);
        Assert.Null(t.TriggerCriteria);
    }
}
