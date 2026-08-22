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
    private static readonly Regex NameConditionSplit = new(@"^(.*)\[(.*)\]$", RegexOptions.Compiled);

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

        string? name = null;
        string? condition = null;

        if (!string.IsNullOrEmpty(label))
        {
            var splitMatch = NameConditionSplit.Match(label);
            if (splitMatch.Success)
            {
                name = splitMatch.Groups[1].Value.Trim();
                condition = splitMatch.Groups[2].Value.Trim();

                if (string.IsNullOrEmpty(name)) name = null;
                if (string.IsNullOrEmpty(condition)) condition = null;
            }
            else
            {
                // Legacy fallback: treat the entire label as the condition.
                condition = label;
            }
        }

        // --- No logical condition: either no label at all, or a purely cosmetic transition name.
        // Both encode a manual transition — NOT a fallback.
        if (string.IsNullOrEmpty(condition))
        {
            return new PlannedTransition
            {
                FromState = edge.From,
                ToState = edge.To,
                Name = name,
                RuleApplied = string.IsNullOrEmpty(name)
                    ? "Manual transition (§3.5 table row 1 — no label)"
                    : $"Manual transition with name \"{name}\" (§3.5)",
                TriggerMode = TriggerMode.Manual,
                EvaluationPriority = evaluationPriority,
                OriginalLabel = rawLabel,
                IsSkeleton = false,
            };
        }

        var esignMatch = RoleEsign.Match(condition);
        if (esignMatch.Success)
        {
            var group = esignMatch.Groups[1].Value;
            return new PlannedTransition
            {
                FromState = edge.From,
                ToState = edge.To,
                Name = name,
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

        var roleMatch = Role.Match(condition);
        if (roleMatch.Success)
        {
            var group = roleMatch.Groups[1].Value;
            return new PlannedTransition
            {
                FromState = edge.From,
                ToState = edge.To,
                Name = name,
                RuleApplied = "Restricted-permission (human) transition (§3.5)",
                TriggerMode = TriggerMode.Manual,
                EvaluationPriority = evaluationPriority,
                PermissionsGroup = group,
                PermissionsMethodAssumption = PermissionsMethodAssumptionText,
                OriginalLabel = rawLabel,
                IsSkeleton = false,
            };
        }

        var afterMatch = After.Match(condition);
        if (afterMatch.Success)
        {
            var days = int.Parse(afterMatch.Groups[1].Value);
            return new PlannedTransition
            {
                FromState = edge.From,
                ToState = edge.To,
                Name = name,
                RuleApplied = "Time-based automatic (§3.5)",
                TriggerMode = TriggerMode.AutomaticCriteria,
                EvaluationPriority = evaluationPriority,
                TriggerInDays = days,
                OriginalLabel = rawLabel,
                IsSkeleton = false,
            };
        }

        var ifMatch = If.Match(condition);
        if (ifMatch.Success)
        {
            var property = ifMatch.Groups[1].Value.Trim();
            var value = ifMatch.Groups[2].Value.Trim();
            return new PlannedTransition
            {
                FromState = edge.From,
                ToState = edge.To,
                Name = name,
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

        var autoMatch = Auto.Match(condition);
        if (autoMatch.Success)
        {
            var mode = int.Parse(autoMatch.Groups[1].Value);
            var triggerMode = mode == 5 ? TriggerMode.AutomaticVBScript : TriggerMode.AutomaticCriteria;
            return new PlannedTransition
            {
                FromState = edge.From,
                ToState = edge.To,
                Name = name,
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

        var scriptMatch = Script.Match(condition);
        if (scriptMatch.Success)
        {
            var nameVal = scriptMatch.Groups[1].Value;
            if (!sidecar.Scripts.TryGetValue(nameVal, out var body))
            {
                issues.Add(new ValidationIssue(
                    IssueSeverity.Error,
                    "UNRESOLVED_SCRIPT_REFERENCE",
                    $"script({nameVal}) on edge {edgeRef} has no matching body in the sidecar file. " +
                    "A diagram with script(...) labels but no matching sidecar entry is incomplete for " +
                    "import — the importer has no source for TriggerAllowedByVBScript (§3.5).",
                    edgeRef));

                return new PlannedTransition
                {
                    FromState = edge.From,
                    ToState = edge.To,
                    Name = name,
                    RuleApplied = "VBScript-gated (§3.5) — UNRESOLVED, script body missing from sidecar",
                    TriggerMode = TriggerMode.AutomaticVBScript,
                    EvaluationPriority = evaluationPriority,
                    VBScriptName = nameVal,
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
                issues.Add(new ValidationIssue(
                    IssueSeverity.Warning,
                    "SCRIPT_MAY_OVERRIDE_DESTINATION",
                    $"script({nameVal}) on edge {edgeRef} contains \"NextStateID\" — per §1.3, this script may " +
                    "redirect the object to a state other than the diagram-drawn destination at runtime. " +
                    $"The planned destination ({edge.To}) is not a guaranteed outcome.",
                    edgeRef));
                flags.Add("Script body references NextStateID — drawn destination is not guaranteed (§1.3).");
            }

            return new PlannedTransition
            {
                FromState = edge.From,
                ToState = edge.To,
                Name = name,
                RuleApplied = "VBScript-gated (§3.5)",
                TriggerMode = TriggerMode.AutomaticVBScript,
                EvaluationPriority = evaluationPriority,
                VBScriptName = nameVal,
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

        // --- Present, non-empty condition that matched none of §3.5's grammars:
        return new PlannedTransition
        {
            FromState = edge.From,
            ToState = edge.To,
            Name = name,
            RuleApplied = "UNRECOGNIZED CONDITION — does not match any §3.5 grammar",
            TriggerMode = TriggerMode.Manual,
            EvaluationPriority = evaluationPriority,
            OriginalLabel = rawLabel,
            IsSkeleton = true,
            SkeletonReason =
                $"Condition \"{condition}\" is prose, not the if(Property=Value)/after(Nd)/script(Name)/role(X) " +
                "grammar. Per §3.5/§6.2/§6.4: a strict importer refuses to guess and produces a bare " +
                "skeleton (TriggerMode=0, no TriggerCriteria, no Permissions restriction). The intended " +
                "semantic is silently dropped and must be resolved by a human, not guessed by this tool.",
        };
    }
}
