using System.Text.RegularExpressions;

namespace ProvisioningAI.Workflow.Translation;

/// <summary>
/// The Resolve stage: turns one <see cref="CandidateEdge"/>'s label into the exact
/// M-Files field values §3.5 says it should produce. Every branch below is traceable to a
/// specific row or sentence in MfilesProperties.md §3.5 — see the inline references.
/// </summary>
public static class EdgeResolver
{
    private static readonly Regex RoleEsign = new(@"^role\(([^)]+)\)\+esign$", RegexOptions.Compiled);
    private static readonly Regex Role = new(@"^role\(([^)]+)\)$", RegexOptions.Compiled);
    private static readonly Regex After = new(@"^after\((\d+)d\)$", RegexOptions.Compiled);
    private static readonly Regex If = new(@"^if\(([^=]+)=(.+)\)$", RegexOptions.Compiled);
    private static readonly Regex Script = new(@"^script\(([^)]+)\)$", RegexOptions.Compiled);

    // §3.5 Decision 6: TriggerMode confirmed automatic, TriggerCriteria specifically not
    // decoded. Argument is the real stored TriggerMode integer (4 or 5) — a structured,
    // unambiguous token, deliberately NOT a prose phrase like "criteria unconfirmed": every
    // other row in this grammar keys off a real field value, never a description of intent,
    // and a free-text trigger here would inherit the exact fragility (any reasonable
    // paraphrase silently missing the parse and falling to the skeleton default) that this
    // row exists to avoid in the first place.
    private static readonly Regex Auto = new(@"^auto\((4|5)\)$", RegexOptions.Compiled);

    // §3.5's appendable suffix, e.g. `if(Property=Value)+priority(50)`. Stripped off
    // before the label is matched against the grammars above so `+priority(N)` can
    // compose with any of them (including `role(...)+esign`) without each regex above
    // needing to know about it.
    private static readonly Regex PrioritySuffix = new(@"^(.*)\+priority\((\d+)\)$", RegexOptions.Compiled);

    // §1.6, confirmed live via screenshot: every real M-Files transition carries this
    // field regardless of TriggerMode, defaulted to 100. Applies uniformly here too —
    // including to unlabeled/manual edges — because the real field's presence isn't
    // conditional on how (or whether) the edge is labeled.
    private const int DefaultEvaluationPriority = 100;

    private const string PermissionsMethodAssumptionText =
        "Permissions selection method assumed as \"direct\" (§2.3 method 1, named users/groups). " +
        "role(...) cannot distinguish direct / metadata-based (pseudo-user) / prior-transition-based " +
        "(§2.3, §3.5) — this is a flagged assumption, not a fact read from the diagram.";

    private static (string? CoreLabel, int Priority) ExtractPriority(string? rawLabel)
    {
        if (string.IsNullOrEmpty(rawLabel))
        {
            return (rawLabel, DefaultEvaluationPriority);
        }

        var match = PrioritySuffix.Match(rawLabel);
        if (!match.Success)
        {
            return (rawLabel, DefaultEvaluationPriority);
        }

        return (match.Groups[1].Value, int.Parse(match.Groups[2].Value));
    }

    public static PlannedTransition Resolve(CandidateEdge edge, SidecarConfig sidecar, List<ValidationIssue> issues)
    {
        var rawLabel = edge.Label?.Trim();
        var (label, evaluationPriority) = ExtractPriority(rawLabel);
        var edgeRef = $"{edge.From} --> {edge.To}";

        // --- No label at all: §3.5's own first table row (`StateA --> StateB`, no label),
        // a deliberate, lossless encoding of a manual transition — NOT a fallback. §6.4
        // explicitly lists the plain unlabeled edge among the "lossless, unambiguous"
        // cases, distinct from the freeform-prose fallback below. See the accompanying
        // report: conflating these two was this implementation's first real ambiguity.
        if (string.IsNullOrEmpty(label))
        {
            return new PlannedTransition
            {
                FromState = edge.From,
                ToState = edge.To,
                RuleApplied = "Manual transition (§3.5 table row 1 — no label)",
                TriggerMode = TriggerMode.Manual,
                EvaluationPriority = evaluationPriority,
                OriginalLabel = rawLabel,
                IsSkeleton = false,
            };
        }

        var esignMatch = RoleEsign.Match(label);
        if (esignMatch.Success)
        {
            var group = esignMatch.Groups[1].Value;
            return new PlannedTransition
            {
                FromState = edge.From,
                ToState = edge.To,
                RuleApplied = "Restricted-permission transition + Electronic Signature (§3.5, §2.1)",
                TriggerMode = TriggerMode.Manual,
                EvaluationPriority = evaluationPriority,
                PermissionsGroup = group,
                PermissionsMethodAssumption = PermissionsMethodAssumptionText,
                RequireElectronicSignature = true,
                ElectronicSignatureNote =
                    "Signature-meaning text (predefined reason/meaning or custom description) has no " +
                    "defined default under this convention (§6.2/§6.5) — must be supplied or explicitly " +
                    "deferred before this could be built for real.",
                OriginalLabel = rawLabel,
                IsSkeleton = false,
            };
        }

        var roleMatch = Role.Match(label);
        if (roleMatch.Success)
        {
            var group = roleMatch.Groups[1].Value;
            return new PlannedTransition
            {
                FromState = edge.From,
                ToState = edge.To,
                RuleApplied = "Restricted-permission (human) transition (§3.5)",
                TriggerMode = TriggerMode.Manual,
                EvaluationPriority = evaluationPriority,
                PermissionsGroup = group,
                PermissionsMethodAssumption = PermissionsMethodAssumptionText,
                OriginalLabel = rawLabel,
                IsSkeleton = false,
            };
        }

        var afterMatch = After.Match(label);
        if (afterMatch.Success)
        {
            var days = int.Parse(afterMatch.Groups[1].Value);
            return new PlannedTransition
            {
                FromState = edge.From,
                ToState = edge.To,
                RuleApplied = "Time-based automatic (§3.5)",
                TriggerMode = TriggerMode.AutomaticCriteria,
                EvaluationPriority = evaluationPriority,
                TriggerInDays = days,
                OriginalLabel = rawLabel,
                IsSkeleton = false,
            };
        }

        var ifMatch = If.Match(label);
        if (ifMatch.Success)
        {
            var property = ifMatch.Groups[1].Value.Trim();
            var value = ifMatch.Groups[2].Value.Trim();
            return new PlannedTransition
            {
                FromState = edge.From,
                ToState = edge.To,
                RuleApplied = "Criteria-based automatic (§3.5)",
                TriggerMode = TriggerMode.AutomaticCriteria,
                EvaluationPriority = evaluationPriority,
                TriggerCriteria = new TriggerCriteriaExpression(property, "=", value),
                TriggerCriteriaNote =
                    "Structured stand-in only — the real TriggerCriteria field is an opaque, engine-exported " +
                    "search-condition string (§1.1: SearchConditions.GetAsExportedSearchString()), never a " +
                    "plain string. A real emitter must resolve this through M-Files' own search-condition " +
                    "object model, not string-template this expression.",
                TriggerInDays = null,
                TriggerInDaysNote = "Not specified by the source diagram; the M-Files UI's own stored default applies (§1.2).",
                OriginalLabel = rawLabel,
                IsSkeleton = false,
            };
        }

        var autoMatch = Auto.Match(label);
        if (autoMatch.Success)
        {
            var mode = int.Parse(autoMatch.Groups[1].Value);
            var triggerMode = mode == 5 ? TriggerMode.AutomaticVBScript : TriggerMode.AutomaticCriteria;
            return new PlannedTransition
            {
                FromState = edge.From,
                ToState = edge.To,
                RuleApplied = "Automatic transition, mechanism confirmed — specific criteria not decoded (§3.5 Decision 6)",
                TriggerMode = triggerMode,
                EvaluationPriority = evaluationPriority,
                TriggerCriteria = null,
                TriggerCriteriaNote =
                    $"TriggerMode {mode} is a confirmed fact (author-declared via auto({mode}), not guessed), " +
                    "but the specific TriggerCriteria condition behind it was never decoded from captured data. " +
                    "This is deliberately left null rather than fabricated — see CriteriaUnconfirmed.",
                CriteriaUnconfirmed = true,
                OriginalLabel = rawLabel,
                IsSkeleton = false,
            };
        }

        var scriptMatch = Script.Match(label);
        if (scriptMatch.Success)
        {
            var name = scriptMatch.Groups[1].Value;
            if (!sidecar.Scripts.TryGetValue(name, out var body))
            {
                issues.Add(new ValidationIssue(
                    IssueSeverity.Error,
                    "UNRESOLVED_SCRIPT_REFERENCE",
                    $"script({name}) on edge {edgeRef} has no matching body in the sidecar file. " +
                    "A diagram with script(...) labels but no matching sidecar entry is incomplete for " +
                    "import — the importer has no source for TriggerAllowedByVBScript (§3.5).",
                    edgeRef));

                return new PlannedTransition
                {
                    FromState = edge.From,
                    ToState = edge.To,
                    RuleApplied = "VBScript-gated (§3.5) — UNRESOLVED, script body missing from sidecar",
                    TriggerMode = TriggerMode.AutomaticVBScript,
                    EvaluationPriority = evaluationPriority,
                    VBScriptName = name,
                    VBScriptBody = null,
                    TriggerInDaysNote =
                        "Unresolved — §6.4 point 3 leaves TriggerInDays on mode-5 (VBScript-gated) edges as a " +
                        "genuinely open question (whether it governs script re-evaluation cadence the same " +
                        "way it does for mode-4 criteria edges is not established); not asserted here either.",
                    OriginalLabel = rawLabel,
                    IsSkeleton = false,
                    Flags = { "Plan generation stopped for this edge's script body — see validation issues." },
                };
            }

            var flags = new List<string>();
            if (body.Contains("NextStateID", StringComparison.Ordinal))
            {
                // §1.3, confirmed finding: a drawn arrow is a guaranteed destination only if
                // no VBScript on that edge reassigns NextStateID. This tool can at least
                // check the script text it was given for that literal token — it cannot
                // simulate what a not-yet-built vault's script will do at runtime.
                issues.Add(new ValidationIssue(
                    IssueSeverity.Warning,
                    "SCRIPT_MAY_OVERRIDE_DESTINATION",
                    $"script({name}) on edge {edgeRef} contains \"NextStateID\" — per §1.3, this script may " +
                    "redirect the object to a state other than the diagram-drawn destination at runtime. " +
                    $"The planned destination ({edge.To}) is not a guaranteed outcome.",
                    edgeRef));
                flags.Add("Script body references NextStateID — drawn destination is not guaranteed (§1.3).");
            }

            return new PlannedTransition
            {
                FromState = edge.From,
                ToState = edge.To,
                RuleApplied = "VBScript-gated (§3.5)",
                TriggerMode = TriggerMode.AutomaticVBScript,
                EvaluationPriority = evaluationPriority,
                VBScriptName = name,
                VBScriptBody = body,
                TriggerCriteriaNote = "Not applicable — TriggerMode 5 uses the script body, not a search condition (§1.1).",
                TriggerInDaysNote =
                    "Unresolved — §6.4 point 3 leaves TriggerInDays on mode-5 (VBScript-gated) edges as a " +
                    "genuinely open question (whether it governs script re-evaluation cadence the same way " +
                    "it does for mode-4 criteria edges is not established); not asserted here either.",
                OriginalLabel = rawLabel,
                IsSkeleton = false,
                Flags = flags,
            };
        }

        // --- Present, non-empty label that matched none of §3.5's grammars: this is the
        // genuine "freeform Mermaid can only produce a structural skeleton" case (§3.5,
        // §6.2's `if reviewer rejects` edge, §6.4 point 1). Distinct from the no-label case
        // above — this one really is a fallback, and the original text is preserved so a
        // human can decide which of the plausible real configurations was intended.
        return new PlannedTransition
        {
            FromState = edge.From,
            ToState = edge.To,
            RuleApplied = "UNRECOGNIZED LABEL — does not match any §3.5 grammar",
            TriggerMode = TriggerMode.Manual,
            EvaluationPriority = evaluationPriority,
            OriginalLabel = rawLabel,
            IsSkeleton = true,
            SkeletonReason =
                $"Label \"{rawLabel}\" is prose, not the if(Property=Value)/after(Nd)/script(Name)/role(X) " +
                "grammar. Per §3.5/§6.2/§6.4: a strict importer refuses to guess and produces a bare " +
                "skeleton (TriggerMode=0, no TriggerCriteria, no Permissions restriction). The intended " +
                "semantic is silently dropped and must be resolved by a human, not guessed by this tool.",
        };
    }
}
