namespace ProvisioningAI.Workflow.Translation;

/// <summary>
/// Entry point: Parse → Resolve → Validate. Produces a <see cref="TranslationPlan"/> a
/// human can review — this is the "Plan" half of a Plan/Apply pattern. It never touches
/// COM, a vault, or the filesystem beyond reading the two inputs it's handed; there is no
/// "Apply" here, deliberately (see MfilesProperties.md §1A — that step is V2-gated).
/// </summary>
public static class TranslationPipeline
{
    /// <summary>
    /// Translates a Mermaid diagram + sidecar into a <see cref="TranslationPlan"/>. The
    /// returned plan does not retain <paramref name="mermaidText"/> — see the doc comment
    /// on <see cref="TranslationPlan"/> for why that's intentional. Any caller that needs
    /// the source alongside the plan (rendering, review UIs, …) should hold on to its own
    /// copy of <paramref name="mermaidText"/> and pass the two around as a sibling pair,
    /// exactly as <c>TranslationPlanRenderer.html</c>'s embedded samples already do.
    /// </summary>
    public static TranslationPlan Translate(string mermaidText, SidecarConfig sidecar)
    {
        var diagram = MermaidParser.Parse(mermaidText);
        var collapsed = ChoiceCollapser.Collapse(diagram);

        var issues = new List<ValidationIssue>();
        issues.AddRange(diagram.ParseIssues);
        issues.AddRange(collapsed.Issues);

        PlanValidator.CheckDanglingReferences(collapsed, issues);

        var transitions = new List<PlannedTransition>();
        foreach (var edge in collapsed.CandidateEdges)
        {
            transitions.Add(EdgeResolver.Resolve(edge, sidecar, issues));
        }

        var states = new List<PlannedState>();
        var initialSet = new HashSet<string>(collapsed.InitialStates);
        var statesWithOutgoing = new HashSet<string>(transitions.Select(t => t.FromState));
        foreach (var name in collapsed.RealStateNames)
        {
            states.Add(new PlannedState
            {
                Name = name,
                IsInitial = initialSet.Contains(name),
                IsTerminal = !statesWithOutgoing.Contains(name),
                WasCollapsedChoicePromotedToState = collapsed.PromotedChoiceStates.Contains(name),
            });
        }

        var plan = new TranslationPlan();
        plan.States.AddRange(states);
        plan.Transitions.AddRange(transitions);
        plan.ValidationIssues.AddRange(issues);

        if (transitions.Exists(t => t.TriggerMode != TriggerMode.Manual))
        {
            plan.GlobalAssumptions.Add(
                "Every automatic (TriggerMode 4/5) edge's planned destination is treated as guaranteed. " +
                "This project's own confirmed finding (§1.3) is that a drawn arrow is only a guaranteed " +
                "destination if no VBScript on that edge reassigns NextStateID at runtime. Script bodies " +
                "present in the sidecar were scanned for the literal token \"NextStateID\" (see per-edge " +
                "flags/issues), but this cannot verify what a not-yet-built vault's future script content " +
                "will do — absence of the token here is not a platform guarantee (§1.3).");
        }

        return plan;
    }
}
