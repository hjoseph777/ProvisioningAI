using System.Text.RegularExpressions;

namespace ProvisioningAI.Workflow.Translation;

/// <summary>A single `A --&gt; B` or `A --&gt; B : label` line, before any choice-collapse or resolution.</summary>
public sealed record RawEdge(string From, string To, string? Label, int SourceLine);

public sealed class ParsedDiagram
{
    public const string StartEndPseudostate = "[*]";

    /// <summary>States named via an explicit `state X` line. Empty if the diagram never pre-declares states.</summary>
    public List<string> DeclaredStates { get; } = new();

    /// <summary>
    /// The usable state list: <see cref="DeclaredStates"/> when the diagram uses explicit
    /// declarations, otherwise auto-discovered from edge endpoints (real Mermaid's own
    /// permissive default, and how every example in MfilesProperties.md §6 is written).
    /// See <see cref="UsesExplicitDeclarations"/> — this decides whether the Validate
    /// stage's dangling-reference check has anything to check against at all.
    /// </summary>
    public List<string> StateNames { get; } = new();

    public bool UsesExplicitDeclarations => DeclaredStates.Count > 0;

    public HashSet<string> ChoiceStateNames { get; } = new();

    /// <summary>
    /// States declared `&lt;&lt;fork&gt;&gt;` or `&lt;&lt;join&gt;&gt;` — real Mermaid
    /// pseudostate types this project's grammar does not support, keyed by the type used.
    /// M-Files has no AND-split/AND-join construct (an object occupies exactly one state at
    /// a time, and a state becomes current the moment any single inbound transition fires),
    /// so these can never be translated, not just "not yet". See §6.4's blocking-error
    /// worked example. Recognizing the exact pseudostate name (rather than letting it fall
    /// through to the generic unrecognized-line warning) matters specifically because these
    /// are real, valid Mermaid syntax — someone following this project's own
    /// `&lt;&lt;choice&gt;&gt;` convention could reasonably reach for `&lt;&lt;join&gt;&gt;`
    /// next, and without this check the edges into/out of it would silently auto-discover
    /// as an ordinary state and produce a plausible-looking OR-join plan instead — a worse
    /// failure than a loud rejection.
    /// </summary>
    public Dictionary<string, string> SynchronizationStateNames { get; } = new();

    public List<RawEdge> Edges { get; } = new();

    public List<ValidationIssue> ParseIssues { get; } = new();
}

/// <summary>
/// Parses the narrow subset of Mermaid `stateDiagram-v2` this project's §3.5 convention
/// actually uses: `A --&gt; B`, `A --&gt; B : label`, `[*]` start/end pseudostates, plain
/// `state X` pre-declarations, and `state X &lt;&lt;choice&gt;&gt;` declarations. Anything
/// else (notes, classDef, direction, composite states, …) is out of scope and reported as
/// a Warning rather than crashing — this tool reads text, it does not need to be a general
/// Mermaid engine.
/// </summary>
public static class MermaidParser
{
    private static readonly Regex ChoiceDecl = new(@"^state\s+(\S+)\s+<<choice>>$", RegexOptions.Compiled);
    private static readonly Regex SynchronizationDecl = new(@"^state\s+(\S+)\s+<<(fork|join)>>$", RegexOptions.Compiled);
    private static readonly Regex StateDecl = new(@"^state\s+(\S+)$", RegexOptions.Compiled);
    private static readonly Regex EdgeLine = new(@"^(\S+)\s*-->\s*(\S+)\s*(?::\s*(.+))?$", RegexOptions.Compiled);

    public static ParsedDiagram Parse(string mermaidText)
    {
        var diagram = new ParsedDiagram();
        var lines = mermaidText.Replace("\r\n", "\n").Split('\n');
        var declaredSeen = new HashSet<string>();
        var discoveredSeen = new HashSet<string>();
        var autoDiscovered = new List<string>();

        for (var i = 0; i < lines.Length; i++)
        {
            var lineNo = i + 1;
            var line = lines[i].Trim();

            if (line.Length == 0) continue;
            if (line.Equals("stateDiagram-v2", StringComparison.OrdinalIgnoreCase)) continue;
            if (line.StartsWith("%%", StringComparison.Ordinal)) continue; // Mermaid comment

            var choiceMatch = ChoiceDecl.Match(line);
            if (choiceMatch.Success)
            {
                diagram.ChoiceStateNames.Add(choiceMatch.Groups[1].Value);
                continue;
            }

            var syncMatch = SynchronizationDecl.Match(line);
            if (syncMatch.Success)
            {
                var syncName = syncMatch.Groups[1].Value;
                var syncType = syncMatch.Groups[2].Value;
                diagram.SynchronizationStateNames[syncName] = syncType;
                diagram.ParseIssues.Add(new ValidationIssue(
                    IssueSeverity.Error,
                    "SYNCHRONIZATION_UNSUPPORTED",
                    $"Line {lineNo}: '{syncName}' is declared `<<{syncType}>>`. M-Files has no synchronized-join " +
                    "construct — an object occupies exactly one state at a time, and a state becomes current the " +
                    "moment any single inbound transition fires, so there is no way to require multiple paths to " +
                    "complete before a state is reached. This diagram cannot be automatically translated. " +
                    "Redesign the workflow to avoid requiring multiple paths to complete before a state is " +
                    "reached (see MfilesProperties.md §6.4).",
                    EdgeRef: syncName));
                continue;
            }

            var stateDeclMatch = StateDecl.Match(line);
            if (stateDeclMatch.Success)
            {
                var name = stateDeclMatch.Groups[1].Value;
                if (declaredSeen.Add(name)) diagram.DeclaredStates.Add(name);
                continue;
            }

            var edgeMatch = EdgeLine.Match(line);
            if (edgeMatch.Success)
            {
                var from = edgeMatch.Groups[1].Value;
                var to = edgeMatch.Groups[2].Value;
                var label = edgeMatch.Groups[3].Success ? edgeMatch.Groups[3].Value.Trim() : null;

                diagram.Edges.Add(new RawEdge(from, to, label, lineNo));

                if (from != ParsedDiagram.StartEndPseudostate && discoveredSeen.Add(from)) autoDiscovered.Add(from);
                if (to != ParsedDiagram.StartEndPseudostate && discoveredSeen.Add(to)) autoDiscovered.Add(to);

                continue;
            }

            diagram.ParseIssues.Add(new ValidationIssue(
                IssueSeverity.Warning,
                "UNRECOGNIZED_LINE",
                $"Line {lineNo} did not match any supported syntax (edge, `[*]` edge, `state X`, or `state X <<choice>>`) and was ignored: \"{line}\"."));
        }

        // Choice ids are pseudostates, not real states, however they were first noticed.
        autoDiscovered.RemoveAll(diagram.ChoiceStateNames.Contains);
        diagram.DeclaredStates.RemoveAll(diagram.ChoiceStateNames.Contains);

        // Same treatment for fork/join ids — never a real state, and specifically must not
        // be allowed to fall back to ordinary auto-discovery, or the SYNCHRONIZATION_UNSUPPORTED
        // error above would sit next to a plan that otherwise looks complete and valid.
        autoDiscovered.RemoveAll(diagram.SynchronizationStateNames.ContainsKey);
        diagram.DeclaredStates.RemoveAll(diagram.SynchronizationStateNames.ContainsKey);

        diagram.StateNames.AddRange(diagram.UsesExplicitDeclarations ? diagram.DeclaredStates : autoDiscovered);

        return diagram;
    }
}
