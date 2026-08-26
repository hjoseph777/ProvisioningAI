using ProvisioningAI.Workflow.Translation;

namespace ProvisioningAI.Tests.Workflow;

/// <summary>
/// Parser-level coverage for the `ID : Label` declaration form (2026-08-25 fix) — tests
/// MermaidParser.Parse() directly rather than the full pipeline, so these pin the parser's
/// own contract (StateLabels population, no interference with existing declaration forms)
/// independent of anything TranslationPipeline/EdgeResolver does downstream.
/// </summary>
public sealed class MermaidParserTests
{
    [Fact]
    public void StateLabelLine_IsCapturedInStateLabels_NotReportedAsUnrecognized()
    {
        const string diagram = """
            stateDiagram-v2
                state StateA
                StateA : Real Display Name
            """;

        var parsed = MermaidParser.Parse(diagram);

        Assert.Equal("Real Display Name", parsed.StateLabels["StateA"]);
        Assert.DoesNotContain(parsed.ParseIssues, i => i.Code == "UNRECOGNIZED_LINE");
    }

    [Fact]
    public void StateLabelLine_DoesNotAddAnEntryToDeclaredStates()
    {
        // The `state ID` line is what registers existence; the label line is purely
        // informational and must not double-count or otherwise perturb state discovery.
        const string diagram = """
            stateDiagram-v2
                state StateA
                StateA : Real Display Name
            """;

        var parsed = MermaidParser.Parse(diagram);

        Assert.Single(parsed.DeclaredStates);
        Assert.Equal("StateA", parsed.DeclaredStates[0]);
    }

    [Fact]
    public void StateLabelLine_NeverMatchedAsAnEdge()
    {
        // A colon-only line (no `-->`) must never be mistaken for an edge — EdgeLine
        // requires the arrow literally, so this pins that the two can't collide.
        const string diagram = """
            stateDiagram-v2
                state StateA
                StateA : Real Display Name
            """;

        var parsed = MermaidParser.Parse(diagram);

        Assert.Empty(parsed.Edges);
    }

    [Fact]
    public void EdgeLineWithLabel_StillParsedAsAnEdge_NotAStateLabelLine()
    {
        // `A --> B : label` contains a colon too — confirms StateLabelDecl's generic
        // shape doesn't accidentally swallow real edges (EdgeLine is checked first and
        // requires `-->`, which this pattern can't match on its own).
        const string diagram = """
            stateDiagram-v2
                StateA --> StateB : some label
            """;

        var parsed = MermaidParser.Parse(diagram);

        Assert.Single(parsed.Edges);
        Assert.Equal("some label", parsed.Edges[0].Label);
    }

    [Fact]
    public void StateWithoutLabelLine_HasNoStateLabelsEntry()
    {
        const string diagram = """
            stateDiagram-v2
                state StateA
                StateA --> StateA
            """;

        var parsed = MermaidParser.Parse(diagram);

        Assert.False(parsed.StateLabels.ContainsKey("StateA"));
    }

    [Fact]
    public void UnsupportedConstruct_StillReportsUnrecognizedLine_AlongsideCleanLabelLines()
    {
        // The actual regression guard: prove the fix doesn't broaden tolerance generally
        // — a real unsupported line in the same diagram as several clean ID : Label lines
        // must still be the only thing flagged.
        const string diagram = """
            stateDiagram-v2
                state StateA
                StateA : StateA
                state StateB
                StateB : StateB
                StateA --> StateB
                direction TB
                this is not valid syntax at all
            """;

        var parsed = MermaidParser.Parse(diagram);

        var unrecognized = parsed.ParseIssues.Where(i => i.Code == "UNRECOGNIZED_LINE").ToList();
        Assert.Single(unrecognized);
        Assert.Contains("this is not valid syntax at all", unrecognized[0].Message);
    }
}
