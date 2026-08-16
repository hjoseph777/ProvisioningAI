using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace ProvisioningAI.Workflow.Translation;

/// <summary>
/// Renders a <see cref="TranslationPlan"/> for human review — one section per state, one
/// per transition, each showing the resolved field values, which §3.5 rule fired, and any
/// assumptions/flags. Two forms: <see cref="ToJson"/> (machine-readable, structured) and
/// <see cref="ToReadableText"/> (a plain-text table for a quick read).
/// </summary>
public static class PlanFormatter
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        WriteIndented = true,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
        Converters = { new JsonStringEnumConverter() },
    };

    public static string ToJson(TranslationPlan plan) => JsonSerializer.Serialize(plan, JsonOptions);

    public static string ToReadableText(TranslationPlan plan)
    {
        var sb = new StringBuilder();

        sb.AppendLine("=== TRANSLATION PLAN ===");
        sb.AppendLine(plan.IsValid ? "Status: VALID (no blocking errors)" : "Status: INVALID — blocking errors present");
        sb.AppendLine();

        if (plan.GlobalAssumptions.Count > 0)
        {
            sb.AppendLine("-- Global assumptions --");
            foreach (var a in plan.GlobalAssumptions) sb.AppendLine($"  * {a}");
            sb.AppendLine();
        }

        sb.AppendLine($"-- States ({plan.States.Count}) --");
        foreach (var s in plan.States)
        {
            var flags = new List<string>();
            if (s.IsInitial) flags.Add("INITIAL");
            if (s.IsTerminal) flags.Add("TERMINAL (no outgoing transitions)");
            if (s.WasCollapsedChoicePromotedToState) flags.Add("PROMOTED FROM <<choice>> (multiple inbound, §3.5 Decision 3)");
            sb.AppendLine($"  {s.Name}" + (flags.Count > 0 ? $"  [{string.Join(", ", flags)}]" : string.Empty));
        }
        sb.AppendLine();

        sb.AppendLine($"-- Transitions ({plan.Transitions.Count}) --");
        foreach (var t in plan.Transitions)
        {
            sb.AppendLine($"  {t.FromState} -> {t.ToState}");
            sb.AppendLine($"    Rule applied:       {t.RuleApplied}");
            sb.AppendLine($"    TriggerMode:        {(int)t.TriggerMode} ({t.TriggerMode})");
            if (t.EvaluationPriority != 100) sb.AppendLine($"    EvaluationPriority:  {t.EvaluationPriority} (non-default, §1.6)");
            if (t.TriggerInDays is not null) sb.AppendLine($"    TriggerInDays:       {t.TriggerInDays}");
            if (t.TriggerInDaysNote is not null) sb.AppendLine($"    TriggerInDays note:  {t.TriggerInDaysNote}");
            if (t.TriggerCriteria is not null) sb.AppendLine($"    TriggerCriteria:     {t.TriggerCriteria.Property} {t.TriggerCriteria.Operator} {t.TriggerCriteria.Value}");
            if (t.TriggerCriteriaNote is not null) sb.AppendLine($"    TriggerCriteria note:{t.TriggerCriteriaNote}");
            if (t.VBScriptName is not null) sb.AppendLine($"    VBScript:            {t.VBScriptName} ({(t.VBScriptBody is null ? "UNRESOLVED" : "body found")})");
            if (t.PermissionsGroup is not null) sb.AppendLine($"    Permissions:         restricted to {t.PermissionsGroup}");
            if (t.PermissionsMethodAssumption is not null) sb.AppendLine($"    Permissions note:    {t.PermissionsMethodAssumption}");
            if (t.RequireElectronicSignature) sb.AppendLine("    Electronic Signature: required = true");
            if (t.ElectronicSignatureNote is not null) sb.AppendLine($"    E-Signature note:   {t.ElectronicSignatureNote}");
            if (t.IsSkeleton) sb.AppendLine($"    ** SKELETON **:      {t.SkeletonReason}");
            if (t.CriteriaUnconfirmed) sb.AppendLine($"    ** CRITERIA UNCONFIRMED **: TriggerMode {(int)t.TriggerMode} is confirmed; specific criteria not decoded (§3.5 Decision 6, not a skeleton).");
            if (t.OriginalLabel is not null) sb.AppendLine($"    Original label:      {t.OriginalLabel}");
            foreach (var f in t.Flags) sb.AppendLine($"    Flag:                {f}");
            sb.AppendLine();
        }

        sb.AppendLine($"-- Validation issues ({plan.ValidationIssues.Count}) --");
        if (plan.ValidationIssues.Count == 0)
        {
            sb.AppendLine("  (none)");
        }
        else
        {
            foreach (var issue in plan.ValidationIssues)
            {
                sb.AppendLine($"  [{issue.Severity}] {issue.Code}: {issue.Message}");
            }
        }

        return sb.ToString();
    }
}
