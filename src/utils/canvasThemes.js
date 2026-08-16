// ── canvasThemes ─────────────────────────────────────────────────
// Workflow-level canvas color theme (theme_comparison_mockup.html), stored the same
// way as gatewayGroups.js's group-type concept: a small piece of workflow state, not
// per-node. 'neutral' is deliberately a no-op everywhere in this file — it means "the
// diagram already looks like this without any injected classDef," i.e. today's shipped
// look, not a restatement of the same values that could drift out of sync with it.

export const DEFAULT_CANVAS_THEME = 'neutral';

export const CANVAS_THEMES = [
  { id: 'neutral',      label: 'Neutral',       description: "Today's canvas, unchanged — white background, color reserved for meaning only." },
  { id: 'cacoo',        label: 'Cacoo',         description: 'Tan states, solid olive gateway diamonds — matches the AP team’s existing Cacoo drawings.' },
  { id: 'hub-accent',   label: 'Hub-accent',    description: 'Extends the gateway diamonds’ blue/gray pairing to every state on the canvas.' },
];

// Ambient fill/stroke/text applied to every ordinary state box. No 'neutral' entry —
// its absence is what tells useMermaid.js to skip injecting a classDef at all.
const STATE_STYLE = {
  cacoo:        { fill: '#eee5c8', stroke: '#8a7f5a', text: '#222' },
  'hub-accent': { fill: '#eef0f7', stroke: '#9aa2b8', text: '#222' },
};

export function stateStyleFor(theme) {
  return STATE_STYLE[theme] || null;
}

// Gateway diamond fill/stroke/icon-tint. 'cacoo' deliberately collapses decision vs
// automatic to one uniform olive look (the icon glyph still differs, only the color
// doesn't) — matches "solid olive diamonds" rather than the two-tone blue/gray split.
// Every other theme, including 'hub-accent', reuses the exact colors the gateway work
// already shipped: 'hub-accent' extends that pairing outward to ordinary states, it
// doesn't change what the diamonds themselves look like.
export function gatewayStyleFor(theme, type) {
  if (theme === 'cacoo') {
    return { fill: '#8a7f5a', stroke: '#8a7f5a', iconVariant: 'mono' };
  }
  return type === 'automatic'
    ? { fill: '#eef0f7', stroke: '#9aa2b8', iconVariant: 'accent' }
    : { fill: '#eef0ff', stroke: '#7c8cff', iconVariant: 'accent' };
}
