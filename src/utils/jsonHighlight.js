// highlightJson: renders a value as syntax-colored JSON HTML — keys, strings,
// numbers, booleans, and null each get their own class, reusing color tokens
// already established elsewhere in the app (--a3 for keys matches the
// diagram's own accent-blue selection color; --green/--gold/--purple match
// the Stats view's own per-metric colors) rather than inventing a new palette.
//
// Safe against injection: escapes &/</> in the FULL stringified JSON first,
// then tokenizes the already-escaped text — so a workflow field containing
// something like a raw "<" (a state name, a condition string) can never
// break out of the <span> wrappers, since by the time the regex runs, there
// is no unescaped "<" or ">" left anywhere in the string to match against.
// Shared by Studio's JSON tab (CommandCenter.jsx) and M-Files Flow's own
// JSON tab (LiveTranslationView.jsx) — one tokenizer, not two copies that
// could drift.
export function highlightJson(value) {
  const json = JSON.stringify(value, null, 2);
  const escaped = json
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  return escaped.replace(
    /("(?:\\u[0-9a-fA-F]{4}|\\[^u]|[^\\"])*"(\s*:)?|\btrue\b|\bfalse\b|\bnull\b|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/g,
    match => {
      let cls = 'jn'; // number, default
      if (/^"/.test(match)) cls = /:$/.test(match) ? 'jk' : 'js';
      else if (match === 'true' || match === 'false') cls = 'jb';
      else if (match === 'null') cls = 'jz';
      return `<span class="${cls}">${match}</span>`;
    }
  );
}
