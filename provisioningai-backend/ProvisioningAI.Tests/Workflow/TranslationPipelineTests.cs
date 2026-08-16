using ProvisioningAI.Workflow.Translation;

namespace ProvisioningAI.Tests.Workflow;

/// <summary>
/// Acceptance test: MfilesProperties.md §6.2's worked example. If the translator's output
/// for this diagram doesn't match what §6.2/§6.3 already document, the translator is
/// wrong, not the document (per the task that commissioned this tool).
/// </summary>
public sealed class TranslationPipelineTests
{
    // Exact §6.1 Mermaid source.
    private const string Section6Diagram = """
        stateDiagram-v2
            [*] --> Draft
            Draft --> PendingReview
            PendingReview --> PendingApproval : role(Reviewer)
            PendingReview --> Rejected : if reviewer rejects
            PendingApproval --> Approved : role(Approver)+esign
            PendingApproval --> PendingReview : if(ChangesRequested=Yes)
            PendingApproval --> Escalated : after(3d)
            Escalated --> PendingApproval : script(RenotifyIfStillPending)
            Approved --> Archived : after(30d)
            Rejected --> [*]
            Archived --> [*]
        """;

    // Exact §6, Appendix B script body for script(RenotifyIfStillPending).
    private const string RenotifyScriptBody = """
        Dim daysSinceEscalated
        daysSinceEscalated = DateDiff("d", CDate(<escalation timestamp property value>), Now())

        If daysSinceEscalated >= 1 Then
            AllowStateTransition = True
        End If
        """;

    private static SidecarConfig Section6Sidecar => new()
    {
        Scripts = { ["RenotifyIfStillPending"] = RenotifyScriptBody },
    };

    private static PlannedTransition Find(TranslationPlan plan, string from, string to) =>
        plan.Transitions.Single(t => t.FromState == from && t.ToState == to);

    [Fact]
    public void Section6_2_ProducesExactlySevenStatesAndEightTransitions()
    {
        var plan = TranslationPipeline.Translate(Section6Diagram, Section6Sidecar);

        Assert.Equal(7, plan.States.Count);
        Assert.Equal(8, plan.Transitions.Count);
    }

    [Fact]
    public void AcceptanceTest_UnparsedFreeformLabel_MatchesSection6_2Skeleton_Exactly()
    {
        // The one edge §6.2/§6.4 exists specifically to demonstrate the "skeleton only"
        // import fallback: `PendingReview --> Rejected : if reviewer rejects`. Documented
        // result: TriggerMode = 0, no TriggerCriteria, no Permissions restriction.
        var plan = TranslationPipeline.Translate(Section6Diagram, Section6Sidecar);

        var t = Find(plan, "PendingReview", "Rejected");

        Assert.Equal(TriggerMode.Manual, t.TriggerMode);
        Assert.Null(t.TriggerCriteria);
        Assert.Null(t.PermissionsGroup);
        Assert.False(t.RequireElectronicSignature);
        Assert.True(t.IsSkeleton, "This edge must be flagged as a skeleton — §6.2 calls it a 'skeleton transition only'.");
        Assert.Equal("if reviewer rejects", t.OriginalLabel);
    }

    [Fact]
    public void PlainUnlabeledEdge_IsManualButNotFlaggedAsSkeleton()
    {
        // Distinct from the freeform-prose case above: §3.5's own first table row, and
        // §6.4 explicitly lists this edge among the LOSSLESS, unambiguous cases — it must
        // not be conflated with the genuine skeleton fallback.
        var plan = TranslationPipeline.Translate(Section6Diagram, Section6Sidecar);

        var t = Find(plan, "Draft", "PendingReview");

        Assert.Equal(TriggerMode.Manual, t.TriggerMode);
        Assert.Null(t.TriggerCriteria);
        Assert.Null(t.PermissionsGroup);
        Assert.False(t.IsSkeleton, "An edge with no label at all is §3.5's own defined manual-transition rule, not a fallback.");
    }

    [Fact]
    public void RoleEdge_ResolvesToManualWithRestrictedPermissions()
    {
        var plan = TranslationPipeline.Translate(Section6Diagram, Section6Sidecar);

        var t = Find(plan, "PendingReview", "PendingApproval");

        Assert.Equal(TriggerMode.Manual, t.TriggerMode);
        Assert.Equal("Reviewer", t.PermissionsGroup);
        Assert.False(t.RequireElectronicSignature);
        Assert.NotNull(t.PermissionsMethodAssumption);
    }

    [Fact]
    public void RoleEsignEdge_ResolvesToManualWithPermissionsAndSignature()
    {
        var plan = TranslationPipeline.Translate(Section6Diagram, Section6Sidecar);

        var t = Find(plan, "PendingApproval", "Approved");

        Assert.Equal(TriggerMode.Manual, t.TriggerMode);
        Assert.Equal("Approver", t.PermissionsGroup);
        Assert.True(t.RequireElectronicSignature);
        Assert.NotNull(t.ElectronicSignatureNote);
    }

    [Fact]
    public void IfEdge_ResolvesToStructuredCriteria_NotAPlainString()
    {
        var plan = TranslationPipeline.Translate(Section6Diagram, Section6Sidecar);

        var t = Find(plan, "PendingApproval", "PendingReview");

        Assert.Equal(TriggerMode.AutomaticCriteria, t.TriggerMode);
        Assert.NotNull(t.TriggerCriteria);
        Assert.Equal("ChangesRequested", t.TriggerCriteria!.Property);
        Assert.Equal("=", t.TriggerCriteria.Operator);
        Assert.Equal("Yes", t.TriggerCriteria.Value);
        Assert.Null(t.TriggerInDays);
    }

    [Fact]
    public void AfterEdges_ResolveToCriteriaAutomaticWithTriggerInDays()
    {
        var plan = TranslationPipeline.Translate(Section6Diagram, Section6Sidecar);

        var escalate = Find(plan, "PendingApproval", "Escalated");
        Assert.Equal(TriggerMode.AutomaticCriteria, escalate.TriggerMode);
        Assert.Equal(3, escalate.TriggerInDays);
        Assert.Null(escalate.TriggerCriteria);

        var archive = Find(plan, "Approved", "Archived");
        Assert.Equal(TriggerMode.AutomaticCriteria, archive.TriggerMode);
        Assert.Equal(30, archive.TriggerInDays);
    }

    [Fact]
    public void ScriptEdge_ResolvesVBScriptBodyFromSidecar_AndLeavesTriggerInDaysUnresolved()
    {
        var plan = TranslationPipeline.Translate(Section6Diagram, Section6Sidecar);

        var t = Find(plan, "Escalated", "PendingApproval");

        Assert.Equal(TriggerMode.AutomaticVBScript, t.TriggerMode);
        Assert.Equal("RenotifyIfStillPending", t.VBScriptName);
        Assert.Equal(RenotifyScriptBody, t.VBScriptBody);
        Assert.Null(t.TriggerInDays);
        Assert.Contains("unresolved", t.TriggerInDaysNote, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void StartEndPseudostates_SetInitialFlagAndProduceNoTransitions()
    {
        var plan = TranslationPipeline.Translate(Section6Diagram, Section6Sidecar);

        var draft = plan.States.Single(s => s.Name == "Draft");
        Assert.True(draft.IsInitial);

        var rejected = plan.States.Single(s => s.Name == "Rejected");
        var archived = plan.States.Single(s => s.Name == "Archived");
        Assert.True(rejected.IsTerminal);
        Assert.True(archived.IsTerminal);

        Assert.DoesNotContain(plan.Transitions, t => t.ToState == "[*]" || t.FromState == "[*]");
    }

    [Fact]
    public void MissingScriptBody_IsAHardValidationFailure_NotSilentlyIgnored()
    {
        var plan = TranslationPipeline.Translate(Section6Diagram, SidecarConfig.Empty);

        Assert.False(plan.IsValid);
        Assert.Contains(plan.ValidationIssues, i => i.Code == "UNRESOLVED_SCRIPT_REFERENCE" && i.Severity == IssueSeverity.Error);
    }

    [Fact]
    public void ScriptContainingNextStateID_ProducesWarning_NotSilentTrust()
    {
        var sidecar = new SidecarConfig
        {
            Scripts = { ["RenotifyIfStillPending"] = "NextStateID = 42" },
        };

        var plan = TranslationPipeline.Translate(Section6Diagram, sidecar);

        Assert.Contains(plan.ValidationIssues, i => i.Code == "SCRIPT_MAY_OVERRIDE_DESTINATION");
    }

    [Fact]
    public void ChoiceCollapse_SingleInbound_MatchesSection6_7()
    {
        const string diagram = """
            stateDiagram-v2
                state review_outcome <<choice>>
                PendingReview --> review_outcome
                review_outcome --> Approved : if(Decision=Approve)
                review_outcome --> Rejected : if(Decision=Reject)
            """;

        var plan = TranslationPipeline.Translate(diagram, SidecarConfig.Empty);

        Assert.Equal(3, plan.States.Count);
        Assert.DoesNotContain(plan.States, s => s.Name == "review_outcome");
        Assert.Equal(2, plan.Transitions.Count);
        Assert.Contains(plan.Transitions, t => t.FromState == "PendingReview" && t.ToState == "Approved");
        Assert.Contains(plan.Transitions, t => t.FromState == "PendingReview" && t.ToState == "Rejected");
    }

    [Fact]
    public void ChoiceCollapse_MultipleInbound_MatchesSection6_8()
    {
        const string diagram = """
            stateDiagram-v2
                state review_outcome <<choice>>
                PendingReview --> review_outcome
                Escalated --> review_outcome
                review_outcome --> Approved : if(Decision=Approve)
                review_outcome --> Rejected : if(Decision=Reject)
            """;

        var plan = TranslationPipeline.Translate(diagram, SidecarConfig.Empty);

        Assert.Equal(5, plan.States.Count);
        var reviewOutcome = plan.States.Single(s => s.Name == "review_outcome");
        Assert.True(reviewOutcome.WasCollapsedChoicePromotedToState);
        Assert.Equal(4, plan.Transitions.Count);
        Assert.Contains(plan.Transitions, t => t.FromState == "PendingReview" && t.ToState == "review_outcome");
        Assert.Contains(plan.Transitions, t => t.FromState == "Escalated" && t.ToState == "review_outcome");
    }

    [Fact]
    public void ChoiceWithNoInboundEdge_IsAValidationError()
    {
        const string diagram = """
            stateDiagram-v2
                state orphan_choice <<choice>>
                orphan_choice --> Approved : if(Decision=Approve)
            """;

        var plan = TranslationPipeline.Translate(diagram, SidecarConfig.Empty);

        Assert.False(plan.IsValid);
        Assert.Contains(plan.ValidationIssues, i => i.Code == "CHOICE_NO_INBOUND");
    }

    [Fact]
    public void ExplicitlyDeclaredStates_CatchDanglingReference()
    {
        const string diagram = """
            stateDiagram-v2
                state Draft
                state PendingReview
                Draft --> PendingRevoew
            """;

        var plan = TranslationPipeline.Translate(diagram, SidecarConfig.Empty);

        Assert.False(plan.IsValid);
        Assert.Contains(plan.ValidationIssues, i => i.Code == "DANGLING_STATE_REFERENCE" && i.Message.Contains("PendingRevoew"));
    }

    [Fact]
    public void ImplicitDiagrams_NeverProduceDanglingReferenceErrors()
    {
        // No `state X` declarations anywhere in §6.1 — matches every worked example in
        // MfilesProperties.md §6. The dangling-reference check must stay silent here.
        var plan = TranslationPipeline.Translate(Section6Diagram, Section6Sidecar);

        Assert.DoesNotContain(plan.ValidationIssues, i => i.Code == "DANGLING_STATE_REFERENCE");
    }

    [Fact]
    public void FullSection6Plan_IsValid_GivenAComputedSidecar()
    {
        var plan = TranslationPipeline.Translate(Section6Diagram, Section6Sidecar);
        Assert.True(plan.IsValid, string.Join("; ", plan.ValidationIssues.Select(i => i.Message)));
    }

    [Fact]
    public void EveryEdgeInSection6_DefaultsEvaluationPriorityTo100()
    {
        // None of §6.1's labels use +priority(N) — every resolved transition, regardless
        // of TriggerMode or IsSkeleton, must fall back to the confirmed live default (§1.6).
        var plan = TranslationPipeline.Translate(Section6Diagram, Section6Sidecar);

        Assert.All(plan.Transitions, t => Assert.Equal(100, t.EvaluationPriority));
    }

    [Fact]
    public void PrioritySuffix_OnCriteriaEdge_ParsesExplicitValue()
    {
        const string diagram = """
            stateDiagram-v2
                StateA --> StateB : if(Property=Value)+priority(50)
            """;

        var plan = TranslationPipeline.Translate(diagram, SidecarConfig.Empty);
        var t = Find(plan, "StateA", "StateB");

        Assert.Equal(50, t.EvaluationPriority);
        Assert.Equal(TriggerMode.AutomaticCriteria, t.TriggerMode);
        Assert.NotNull(t.TriggerCriteria);
        Assert.Equal("Property", t.TriggerCriteria!.Property);
        Assert.Equal("Value", t.TriggerCriteria.Value);
        // Priority suffix must not leak into the value the base grammar captured.
        Assert.DoesNotContain("priority", t.TriggerCriteria.Value, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void PrioritySuffix_Absent_DefaultsTo100()
    {
        const string diagram = """
            stateDiagram-v2
                StateA --> StateC : if(Property=Value)
            """;

        var plan = TranslationPipeline.Translate(diagram, SidecarConfig.Empty);
        var t = Find(plan, "StateA", "StateC");

        Assert.Equal(100, t.EvaluationPriority);
    }

    [Fact]
    public void PrioritySuffix_ParallelAutomaticEdgesFromSameState_ResolveIndependently()
    {
        // The real-world case §1.6 exists for: two parallel automatic edges off the same
        // state, one with an explicit override, one left at the default.
        const string diagram = """
            stateDiagram-v2
                StateA --> StateB : after(3d)+priority(50)
                StateA --> StateC : after(3d)
            """;

        var plan = TranslationPipeline.Translate(diagram, SidecarConfig.Empty);

        var toB = Find(plan, "StateA", "StateB");
        Assert.Equal(50, toB.EvaluationPriority);
        Assert.Equal(3, toB.TriggerInDays);

        var toC = Find(plan, "StateA", "StateC");
        Assert.Equal(100, toC.EvaluationPriority);
        Assert.Equal(3, toC.TriggerInDays);
    }

    [Fact]
    public void PrioritySuffix_ComposesWithRoleEsign()
    {
        // +priority(N) is a generic appendable suffix (§3.5) — it must compose with any
        // label form, not just after(...)/if(...)/script(...).
        const string diagram = """
            stateDiagram-v2
                StateA --> StateB : role(Approver)+esign+priority(25)
            """;

        var plan = TranslationPipeline.Translate(diagram, SidecarConfig.Empty);
        var t = Find(plan, "StateA", "StateB");

        Assert.Equal(25, t.EvaluationPriority);
        Assert.Equal("Approver", t.PermissionsGroup);
        Assert.True(t.RequireElectronicSignature);
    }

    [Fact]
    public void PrioritySuffix_OnUnlabeledEdge_IsImpossibleByConstruction_StaysAtDefault()
    {
        // An unlabeled edge has no text to attach a suffix to at all — confirms the
        // default still applies via the no-label branch, not just the labeled branches.
        const string diagram = """
            stateDiagram-v2
                StateA --> StateB
            """;

        var plan = TranslationPipeline.Translate(diagram, SidecarConfig.Empty);
        var t = Find(plan, "StateA", "StateB");

        Assert.Equal(100, t.EvaluationPriority);
        Assert.False(t.IsSkeleton);
    }

    [Fact]
    public void PrioritySuffix_OriginalLabel_PreservesFullTextIncludingSuffix()
    {
        // OriginalLabel is documented as "kept for human review" — it must show the
        // complete label as authored, not the priority-stripped core used for matching.
        const string diagram = """
            stateDiagram-v2
                StateA --> StateB : after(3d)+priority(50)
            """;

        var plan = TranslationPipeline.Translate(diagram, SidecarConfig.Empty);
        var t = Find(plan, "StateA", "StateB");

        Assert.Equal("after(3d)+priority(50)", t.OriginalLabel);
    }
}
