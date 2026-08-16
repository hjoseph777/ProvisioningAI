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
const SCRIPT = /^script\(([^)]+)\)$/;

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
    case 'unparsed': return `Unrecognized — doesn't match after(Nd) / if(Property=Value) / script(Name). Flagged, not guessed; won't appear on the diagram until fixed.`;
    default: return '';
  }
}

// Whether a parsed condition is safe to emit as a Mermaid edge label —
// only genuinely recognized grammar, never unparsed text (which could be
// arbitrary prose unsafe to drop onto the canvas, and would misrepresent
// an unresolved input as a resolved one).
export function isRenderable(parsed) {
  return parsed.kind === 'after' || parsed.kind === 'if' || parsed.kind === 'script';
}
