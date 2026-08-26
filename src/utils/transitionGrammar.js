// ── transitionGrammar ────────────────────────────────────────────
// Client-side mirror of the AUTOMATIC-transition subset of
// ProvisioningAI.Workflow/Translation/EdgeResolver.cs (MfilesProperties.md
// §3.5). Deliberately a separate, disconnected implementation — this does
// NOT call, import, or bridge to ProvisioningAI.Workflow/Translation/.
// "Studio-only for now, connect later" is the standing decision (see
// recover.md); this file mirrors the confirmed grammar rules in the
// frontend, it does not create the deferred cross-system connection.
//
// Scope: after(Nd), if(Property=Value), script(Name), and the appendable
// +priority(N) suffix — the automatic-transition rows only. role(...)/+esign
// (manual/permissions) are explicitly out of scope per the automatic-only
// Decision 7 addendum (2026-08-16) and are NOT parsed here.

const PRIORITY_SUFFIX = /^(.*)\+priority\((\d+)\)$/;
const AFTER = /^after\((\d+)d\)$/;
const IF = /^if\(([^=]+)=(.+)\)$/;
// [\s\S]+, not [^)]+ or a plain `.` — a real VBScript body (see
// pull-from-vault.ps1's TriggerAllowedByVBScript capture) is multi-line and
// routinely contains its own parentheses (CDate(...), SearchForProperty(21),
// DateDiff(...)) before the wrapper's own closing paren. [^)]+ stopped at
// the body's FIRST internal `)`, and a bare `.` doesn't match `\r\n` without
// the `s` flag either way — both silently failed to match ANY real
// script(...) condition with real content, falling through to 'unparsed'
// and losing TriggerMode=5 automatic status entirely (no dash, no badge, no
// tooltip — confirmed live, 2026-08-25, against real archived Conformity
// data: all 5 real script-gated transitions affected). Greedy [\s\S]+
// backtracks to the LAST `)` in the string, which is exactly the wrapper's
// own closing paren for this "script(" + body + ")" format.
const SCRIPT = /^script\(([\s\S]+)\)$/;
// Mirrors EdgeResolver.cs's own Auto regex/§3.5 Decision 6: "confirmed
// automatic, specific criteria not decoded" -- an honest fallback for a
// real M-Files property-criteria guard (TriggerMode 4 with no day count),
// which this grammar otherwise has no lossless way to represent (the real
// TriggerCriteria value is an opaque, engine-exported search-condition
// string, not a Property=Value pair a script can safely template — see the
// C# TriggerCriteriaExpression's own doc comment). Distinct from 'unparsed':
// this is a deliberate, correctly-recognized assertion, not a parse failure.
const AUTO = /^auto\((4|5)\)$/;

// Mirrors EdgeResolver.cs's ExtractPriority — stripped before matching the
// core grammars below so +priority(N) composes with any of the three.
function extractPriority(raw) {
  const m = PRIORITY_SUFFIX.exec(raw);
  if (!m) return { core: raw, priority: null };
  return { core: m[1], priority: parseInt(m[2], 10) };
}

// Parses one condition string against the automatic-only grammar subset.
// Never guesses: unparseable non-empty input returns kind:'unparsed' with
// the original text preserved — same "flag, don't fabricate or silently
// drop" philosophy as Decision 2's skeleton fallback in the real Translator.
export function parseCondition(raw) {
  const trimmed = (raw || '').trim();
  if (!trimmed) return { kind: 'empty', raw: trimmed, priority: null };

  const { core, priority } = extractPriority(trimmed);

  let m = AFTER.exec(core);
  if (m) return { kind: 'after', days: parseInt(m[1], 10), raw: trimmed, priority };

  m = IF.exec(core);
  if (m) return { kind: 'if', property: m[1].trim(), value: m[2].trim(), raw: trimmed, priority };

  m = SCRIPT.exec(core);
  if (m) return { kind: 'script', name: m[1], raw: trimmed, priority };

  m = AUTO.exec(core);
  if (m) return { kind: 'auto', triggerMode: parseInt(m[1], 10), raw: trimmed, priority };

  return { kind: 'unparsed', raw: trimmed, priority };
}

// Human-facing summary, same voice as the diamond badge's tooltip text.
export function describeCondition(parsed) {
  const p = parsed.priority != null ? `, priority ${parsed.priority}` : '';
  switch (parsed.kind) {
    case 'empty': return '';
    case 'after': return `Automatic — fires ${parsed.days} day${parsed.days === 1 ? '' : 's'} after arrival${p}.`;
    case 'if': return `Automatic — fires when ${parsed.property} = ${parsed.value}${p}.`;
    case 'script': return `Automatic — gated by script "${parsed.name}"${p}.`;
    case 'auto': return `Automatic — confirmed live, specific condition not decoded${p}.`;
    case 'unparsed': return `Unrecognized — doesn't match after(Nd) / if(Property=Value) / script(Name) / auto(4|5). Flagged, not guessed; won't appear on the diagram until fixed.`;
    default: return '';
  }
}

// Whether a parsed condition is safe to emit as a Mermaid edge label —
// only genuinely recognized grammar, never unparsed text (which could be
// arbitrary prose unsafe to drop onto the canvas, and would misrepresent
// an unresolved input as a resolved one).
export function isRenderable(parsed) {
  return parsed.kind === 'after' || parsed.kind === 'if' || parsed.kind === 'script' || parsed.kind === 'auto';
}
