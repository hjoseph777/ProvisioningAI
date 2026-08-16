namespace ProvisioningAI.Workflow.Translation;

/// <summary>
/// The Validate stage. This is the gate, not an afterthought: every check below runs to
/// completion and every issue found is reported — nothing stops at the first failure,
/// because a planning tool has to hand the human the complete picture before they decide
/// what to fix.
/// </summary>
public static class PlanValidator
{
    /// <summary>
    /// "Every state referenced by an edge (fromState/toState) exists in the parsed state
    /// list." With an implicit-declaration diagram (no `state X` lines — every example in
    /// MfilesProperties.md §6 is written this way) this check is structurally vacuous: the
    /// state list IS derived from edge endpoints, so nothing can ever be "dangling" against
    /// it. It only has real teeth once a diagram pre-declares its states with `state X`
    /// lines — then an edge naming something never declared is a genuine typo/dangling
    /// reference, and this is where it's caught. See the accompanying report.
    /// </summary>
    public static void CheckDanglingReferences(CollapsedDiagram collapsed, List<ValidationIssue> issues)
    {
        if (!collapsed.UsesExplicitDeclarations) return;

        var known = new HashSet<string>(collapsed.RealStateNames);
        foreach (var edge in collapsed.CandidateEdges)
        {
            if (edge.From != ParsedDiagram.StartEndPseudostate && !known.Contains(edge.From))
            {
                issues.Add(new ValidationIssue(
                    IssueSeverity.Error,
                    "DANGLING_STATE_REFERENCE",
                    $"Edge \"{edge.From} --> {edge.To}\" (line {edge.SourceLine}) references source state " +
                    $"\"{edge.From}\", which was never declared with a `state {edge.From}` line.",
                    $"{edge.From} --> {edge.To}"));
            }

            if (edge.To != ParsedDiagram.StartEndPseudostate && !known.Contains(edge.To))
            {
                issues.Add(new ValidationIssue(
                    IssueSeverity.Error,
                    "DANGLING_STATE_REFERENCE",
                    $"Edge \"{edge.From} --> {edge.To}\" (line {edge.SourceLine}) references destination state " +
                    $"\"{edge.To}\", which was never declared with a `state {edge.To}` line.",
                    $"{edge.From} --> {edge.To}"));
            }
        }
    }
}
