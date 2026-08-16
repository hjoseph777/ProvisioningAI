namespace ProvisioningAI.Workflow.Translation;

/// <summary>
/// A candidate transition edge after `[*]` handling and choice-collapse — ready for the
/// Resolve stage. Not yet a <see cref="PlannedTransition"/> because its label hasn't been
/// matched against §3.5's grammar yet.
/// </summary>
public sealed record CandidateEdge(string From, string To, string? Label, int SourceLine);

public sealed class CollapsedDiagram
{
    public List<string> RealStateNames { get; } = new();
    public HashSet<string> PromotedChoiceStates { get; } = new();
    public List<CandidateEdge> CandidateEdges { get; } = new();
    public List<string> InitialStates { get; } = new();
    public List<ValidationIssue> Issues { get; } = new();

    /// <summary>Carried through from <see cref="ParsedDiagram"/> so the Validate stage knows
    /// whether the dangling-reference check has anything real to check against.</summary>
    public bool UsesExplicitDeclarations { get; init; }
}

/// <summary>
/// Implements MfilesProperties.md §3.5 Decision 3: a `&lt;&lt;choice&gt;&gt;` pseudostate
/// with exactly one inbound edge collapses away entirely — its outgoing branches become
/// direct outgoing transitions of the one real predecessor, and no new M-Files state is
/// created. A `&lt;&lt;choice&gt;&gt;` with two or more inbound edges is a true
/// merge-then-split point and cannot collapse into any single predecessor — it becomes a
/// real, named state, because M-Files transitions are strictly state-to-state.
/// </summary>
public static class ChoiceCollapser
{
    public static CollapsedDiagram Collapse(ParsedDiagram diagram)
    {
        var result = new CollapsedDiagram { UsesExplicitDeclarations = diagram.UsesExplicitDeclarations };
        result.RealStateNames.AddRange(diagram.StateNames);

        var edgesByChoiceInbound = diagram.Edges
            .Where(e => diagram.ChoiceStateNames.Contains(e.To))
            .ToLookup(e => e.To);
        var edgesByChoiceOutbound = diagram.Edges
            .Where(e => diagram.ChoiceStateNames.Contains(e.From))
            .ToLookup(e => e.From);

        var droppedEdges = new HashSet<RawEdge>();
        var extraEdges = new List<CandidateEdge>();

        // Fork/join pseudostates are rejected outright (MermaidParser already raised
        // SYNCHRONIZATION_UNSUPPORTED) — drop every edge touching one so it can't also
        // auto-discover as an ordinary real state and produce a plausible-looking OR-join
        // plan alongside the blocking error. No rerouting: there is no valid M-Files
        // translation to reroute to.
        foreach (var edge in diagram.Edges)
        {
            if (diagram.SynchronizationStateNames.ContainsKey(edge.From) ||
                diagram.SynchronizationStateNames.ContainsKey(edge.To))
            {
                droppedEdges.Add(edge);
            }
        }

        foreach (var choiceId in diagram.ChoiceStateNames)
        {
            var inbound = edgesByChoiceInbound[choiceId].ToList();
            var outbound = edgesByChoiceOutbound[choiceId].ToList();

            if (inbound.Count == 1)
            {
                // Single inbound: collapse away. The diamond never becomes a plan entry;
                // its branches become direct outgoing transitions of the real predecessor.
                var predecessor = inbound[0].From;
                foreach (var ob in outbound)
                {
                    extraEdges.Add(new CandidateEdge(predecessor, ob.To, ob.Label, ob.SourceLine));
                }
                droppedEdges.Add(inbound[0]);
                foreach (var ob in outbound) droppedEdges.Add(ob);
            }
            else if (inbound.Count >= 2)
            {
                // Multiple inbound: a true merge-then-split point. M-Files transitions are
                // strictly state-to-state, so this cannot collapse into any single
                // predecessor — it becomes a real, addressable state. Inbound/outbound
                // edges pass through unchanged (handled as ordinary candidate edges below).
                if (!result.RealStateNames.Contains(choiceId))
                {
                    result.RealStateNames.Add(choiceId);
                }
                result.PromotedChoiceStates.Add(choiceId);
            }
            else
            {
                // Zero inbound: §3.5 Decision 3 only defines single-inbound (collapse) and
                // multiple-inbound (promote) — a choice pseudostate with no predecessor at
                // all is undefined by that rule and structurally nonsensical (a decision
                // node nothing ever reaches). Flagged rather than silently guessed at.
                result.Issues.Add(new ValidationIssue(
                    IssueSeverity.Error,
                    "CHOICE_NO_INBOUND",
                    $"<<choice>> state '{choiceId}' has no inbound edge. §3.5 Decision 3 defines only the " +
                    "single-inbound (collapse) and multiple-inbound (promote to real state) cases — zero " +
                    "inbound is undefined. Its outbound edges were not planned.",
                    EdgeRef: choiceId));
                foreach (var ob in outbound) droppedEdges.Add(ob);
            }
        }

        foreach (var edge in diagram.Edges)
        {
            if (droppedEdges.Contains(edge)) continue;

            if (edge.From == ParsedDiagram.StartEndPseudostate)
            {
                // `[*] --> X` sets a state property (Initial), never a transition (§6.4 point 2).
                result.InitialStates.Add(edge.To);
                continue;
            }

            if (edge.To == ParsedDiagram.StartEndPseudostate)
            {
                // `X --> [*]` is a translator convention for "terminal", not an M-Files
                // field — terminal-ness is derived structurally from the final transition
                // list (§3 End event row; §6.4 point 2), so this produces no plan entry.
                continue;
            }

            result.CandidateEdges.Add(new CandidateEdge(edge.From, edge.To, edge.Label, edge.SourceLine));
        }

        result.CandidateEdges.AddRange(extraEdges);

        if (result.InitialStates.Distinct().Count() > 1)
        {
            result.Issues.Add(new ValidationIssue(
                IssueSeverity.Error,
                "MULTIPLE_INITIAL_STATES",
                "More than one distinct state is targeted by a `[*] -->` start edge: " +
                string.Join(", ", result.InitialStates.Distinct()) +
                ". Only one state can be first on the workflow's States list (§2.6)."));
        }

        return result;
    }
}
