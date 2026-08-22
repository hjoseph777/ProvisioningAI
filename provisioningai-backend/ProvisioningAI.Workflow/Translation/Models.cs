namespace ProvisioningAI.Workflow.Translation;

/// <summary>
/// The real, stored M-Files field (MfilesProperties.md §1.1). 0 = manual (solid line,
/// human-initiated). 4 = automatic, criteria-based (dashed line, engine-evaluated).
/// 5 = automatic, VBScript-gated (dashed line, engine-evaluated). Line style is a
/// rendering signal, not the source of truth (§1.1) — this enum is the source of truth.
/// </summary>
public enum TriggerMode
{
    Manual = 0,
    AutomaticCriteria = 4,
    AutomaticVBScript = 5,
}

/// <summary>
/// Structured stand-in for TriggerCriteria. §1.1/§3.5: the real TriggerCriteria field is
/// an opaque, engine-exported search-condition string (SearchConditions.GetAsExportedSearchString()) —
/// never a plain string a tool can construct by templating. This type exists so nothing in
/// this codebase pretends a "Property=Value" string is the final form; a real emitter must
/// resolve this through M-Files' actual search-condition object model.
/// </summary>
public sealed record TriggerCriteriaExpression(string Property, string Operator, string Value);

public enum IssueSeverity
{
    Warning,
    Error,
}

/// <summary>
/// One entry in the Validate stage's report. Validation collects every issue found — it
/// does not stop at the first (per this project's own instruction: a planning tool must
/// give the human the complete picture before they decide what to fix).
/// </summary>
public sealed record ValidationIssue(IssueSeverity Severity, string Code, string Message, string? EdgeRef = null);

public sealed class PlannedState
{
    public required string Name { get; init; }

    /// <summary>Set when a `[*] --&gt; X` start pseudo-edge targets this state (§6.4 point 2).</summary>
    public bool IsInitial { get; set; }

    /// <summary>
    /// Computed after all transitions are built: true when this state has zero outgoing
    /// transitions in the final plan. This is the native M-Files terminal-state shape
    /// (§3's "End event" row); it is derived structurally, never parsed as its own flag.
    /// </summary>
    public bool IsTerminal { get; set; }

    /// <summary>
    /// True when this state exists in the plan only because a `&lt;&lt;choice&gt;&gt;`
    /// pseudostate had 2+ inbound edges and could not collapse (§3.5 Decision 3). Purely
    /// informational — it changes nothing about how the state is planned, it just tells a
    /// human reviewer *why* a state they didn't draw as a normal box showed up here.
    /// </summary>
    public bool WasCollapsedChoicePromotedToState { get; set; }
}

public sealed class PlannedTransition
{
    public required string FromState { get; init; }
    public required string ToState { get; init; }

    /// <summary>Cosmetic transition name, purely for visualization on the canvas.</summary>
    public string? Name { get; init; }

    /// <summary>Human-readable name of the §3.5 rule (or lack of one) that produced this entry.</summary>
    public required string RuleApplied { get; init; }

    public required TriggerMode TriggerMode { get; init; }

    /// <summary>
    /// The server's evaluation order among parallel automatic transitions on the same
    /// state — lower number, higher priority (§1.6, confirmed live default 100). Parsed
    /// from an appended `+priority(N)` label suffix (§3.5); defaults to 100 when the
    /// label carries none, including on unlabeled/manual edges, because the real M-Files
    /// field is present on every transition regardless of TriggerMode.
    /// </summary>
    public required int EvaluationPriority { get; init; }

    public int? TriggerInDays { get; init; }

    /// <summary>
    /// Explains what TriggerInDays == null means for this specific edge — "default" (the
    /// M-Files UI's own stored default applies, §1.2) and "unresolved" (§6.4's genuinely
    /// open question for mode-5 edges) are different claims and must not be conflated.
    /// </summary>
    public string? TriggerInDaysNote { get; init; }

    public TriggerCriteriaExpression? TriggerCriteria { get; init; }
    public string? TriggerCriteriaNote { get; init; }

    public string? VBScriptName { get; init; }
    public string? VBScriptBody { get; init; }

    public string? PermissionsGroup { get; init; }

    /// <summary>
    /// role(X) cannot distinguish M-Files' three real Permissions selection methods
    /// (§2.3: direct / metadata-based / prior-transition-based). This records which one
    /// was assumed, so it reads as a flagged assumption, not an asserted fact.
    /// </summary>
    public string? PermissionsMethodAssumption { get; init; }

    public bool RequireElectronicSignature { get; init; }
    public string? ElectronicSignatureNote { get; init; }

    /// <summary>
    /// True only for the "no §3.5 grammar matched" fallback (freeform/prose label) —
    /// NOT true for a genuinely unlabeled edge, which is §3.5's own first table row and a
    /// deliberate, lossless result (§6.4 lists the plain manual edge among the lossless
    /// cases). Conflating the two was this implementation's first real ambiguity — see the
    /// accompanying report.
    /// </summary>
    public bool IsSkeleton { get; init; }

    public string? SkeletonReason { get; init; }

    /// <summary>
    /// True only for `auto(4)`/`auto(5)` — a deliberate author assertion that TriggerMode
    /// is confirmed automatic, paired with an honest admission that the specific criteria
    /// behind it is not known. Categorically distinct from <see cref="IsSkeleton"/>: a
    /// skeleton is what the importer produces when it CANNOT tell what an unparseable label
    /// meant, and it defaults toward Manual as the smaller-blast-radius guess (§3.5 Decision
    /// 2). That default is wrong here — real captured M-Files data can confirm TriggerMode
    /// on its own, independent of ever decoding TriggerCriteria (this project's own
    /// `provisioning.db` queries do exactly this routinely), so falling back to Manual would
    /// assert a fact this project already knows to be false, not just omit a detail it
    /// doesn't have. See §3.5 Decision 6.
    /// </summary>
    public bool CriteriaUnconfirmed { get; init; }

    /// <summary>The raw text after the `:` in the Mermaid source, if any — kept for human review.</summary>
    public string? OriginalLabel { get; init; }

    public List<string> Flags { get; init; } = new();
}

/// <summary>
/// The resolved output of the Translate stage — every field on this type is derived,
/// resolved data, never raw passthrough. <strong>Deliberately excludes the source Mermaid
/// text</strong>, by design, not oversight: a caller that needs to display or re-derive
/// the original diagram alongside this plan (e.g. a renderer) already has the
/// <c>mermaidText</c> string in scope, since that's what it just passed to
/// <see cref="TranslationPipeline.Translate"/> to get this plan back — it costs that
/// caller nothing to keep its own copy and pass the two around together as a sibling
/// pair. Adding a <c>SourceMermaidText</c> field here would make this the one field on
/// the type that isn't resolved output, and would introduce a staleness class that
/// doesn't otherwise exist: a plan re-resolved from edited text would need its embedded
/// copy updated in lockstep, or silently go stale. See
/// <c>TranslationPlanRenderer.html</c> for the pattern this formalizes — it already
/// carries `{mermaid, plan}` pairs as sibling values with no changes needed here.
/// </summary>
public sealed class TranslationPlan
{
    public List<PlannedState> States { get; init; } = new();
    public List<PlannedTransition> Transitions { get; init; } = new();
    public List<ValidationIssue> ValidationIssues { get; init; } = new();
    public List<string> GlobalAssumptions { get; init; } = new();

    /// <summary>
    /// False when any Error-severity issue is present. Warnings do not block the plan —
    /// they are still surfaced for human review, per this being a planning tool, not a gate
    /// that silently drops information.
    /// </summary>
    public bool IsValid => !ValidationIssues.Exists(i => i.Severity == IssueSeverity.Error);
}
