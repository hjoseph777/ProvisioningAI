import { useMemo } from 'react';
import { computeGatewayGroups, gatewayLabel } from '../utils/gatewayGroups';
import { stateStyleFor } from '../utils/canvasThemes';
import { SHAPE_FILL_OPACITY } from '../utils/shapeDesignTokens';
import { parseCondition, isRenderable } from '../utils/transitionGrammar';

// ── useMermaid ─────────────────────────────────────────────────
// Transforms a workflow object into a valid stateDiagram-v2 string.
// Returns null if there are no states or no initial state (canvas stays blank).
//
// DEFENSIVE NOTE — dependency design:
// We derive a stable string key from the actual data instead of depending on
// the workflow object reference. This prevents two known bugs:
//   1. Stale memo: object reference unchanged but content has changed
//   2. Frozen diagram after Reset: useMemo skips recompute if reference
//      equality passes even though data was cleared
// Zustand's resetAll() creates new object references via JSON.parse/stringify
// so reference equality usually works, but the string key is a belt-and-suspenders
// guard for edge cases (e.g. same workflow ID reused after reset).
export const useMermaid = (workflow, options = {}) => {
  // requireInitial defaults to true, preserving the original behavior for
  // every existing call site (Studio) untouched — M-Files Flow is the only
  // caller that opts out, since its palette lets a state exist before any
  // one of them is marked Initial and the canvas shouldn't stay hidden for
  // that reason alone (see MFlowCanvas.jsx's own call site comment).
  const { requireInitial = true } = options;

  // Derive a stable cache key from the actual content — not the object reference
  const workflowKey = workflow?.id || workflow?.name || '';
  const stateKey = workflow?.states.map(s => `${s.name}:${s.initial}:${s.terminal}:${s.color || ''}`).join('|') ?? '';
  const transKey = workflow?.transitions.map(t => `${t.from}→${t.to}→${t.group || ''}→${t.conditions || ''}`).join('|') ?? '';
  const themeKey = workflow?.theme || '';

  return useMemo(() => {
    if (!workflow) return null;
    const { states, transitions } = workflow;
    if (!states.length) return null;
    if (requireInitial && !states.some(s => s.initial)) return null;

    let d = 'stateDiagram-v2\n';

    // Declare every state node explicitly so isolated states still appear
    const stateIds = [];
    const coloredStates = []; // { id, color } — a state's own explicit override, independent of theme
    states.forEach(s => {
      const name = (s.name || '').trim();
      if (!name) return;
      const id = name.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '');
      stateIds.push(id);
      // Bare `state ID` line, IN ADDITION to the `ID : name` label line below.
      // The label line alone is invisible to ProvisioningAI.Workflow's
      // MermaidParser — it only discovers a state's existence from edge
      // endpoints or this exact `state X` form (MfilesProperties.md §3.5's
      // own documented "explicit declaration" convention). Without it, a
      // freshly placed state with zero transitions yet never reaches the
      // Live Translating Split-Screen View's output at all — confirmed live
      // via the translator returning fewer states than the diagram actually
      // has. This line changes nothing about rendering (Mermaid tolerates a
      // bare declaration alongside a label line for the same id, confirmed
      // live); it exists purely so the translator's own supported grammar
      // sees every state immediately, not just connected ones.
      d += `  state ${id}\n`;
      d += `  ${id} : ${name}\n`;
      if (s.initial) d += `  [*] --> ${id}\n`;
      // Mermaid's own native end-marker syntax — no custom SVG needed, unlike
      // the gateway diamonds, since stateDiagram-v2 already renders `--> [*]`
      // as a distinct ringed-circle "end" mark matching the start circle.
      if (s.terminal) d += `  ${id} --> [*]\n`;
      if (s.color) coloredStates.push({ id, color: s.color });
    });

    // Canvas theme (canvasThemes.js) — 'neutral' has no stateStyleFor entry, so this
    // is a no-op and the diagram falls through to Mermaid's own already-shipped base
    // theme untouched, exactly like today. A state with its own explicit color (the
    // "Fermé pattern" — a state colored as its own identity) is excluded from the
    // ambient bulk class and gets its own dedicated classDef instead, so there's never
    // ambiguity about which one wins.
    const themeStyle = stateStyleFor(workflow.theme);
    const coloredIds = new Set(coloredStates.map(c => c.id));
    if (themeStyle) {
      const ambientIds = stateIds.filter(id => !coloredIds.has(id));
      if (ambientIds.length) {
        d += `  classDef gwTheme fill:${themeStyle.fill},stroke:${themeStyle.stroke},color:${themeStyle.text};\n`;
        d += `  class ${ambientIds.join(',')} gwTheme\n`;
      }
    }
    coloredStates.forEach(({ id, color }) => {
      // fill-opacity: token #2 (shapeDesignTokens.js) — same softened-fill treatment
      // as the gateway diamonds, was fully opaque.
      d += `  classDef sc_${id} fill:${color},fill-opacity:${SHAPE_FILL_OPACITY},stroke:${color},color:#fff;\n`;
      d += `  class ${id} sc_${id}\n`;
    });

    // Decision/automatic-hub diamonds — mirrors ChoiceCollapser.cs's collapse/promote
    // rule (§3.5 Decision 3), applied to Studio's own transition.group field instead
    // of a <<choice>> pseudostate: a group with exactly one distinct source state
    // can't be anything but that source's own ordinary fan-out, so it declares no hub
    // and every row below falls straight through to the unchanged plain-edge branch.
    // A group with 2+ distinct sources is a real merge-then-split point that can't
    // collapse into a single predecessor, so it gets a real declared state (the
    // diamond CommandCenter.jsx draws over it) and every row that shares it routes
    // through that state instead of a direct edge.
    const promotedGroups = computeGatewayGroups(transitions);
    const promotedIds = new Set(promotedGroups.map(g => g.id));
    const hubDeclId = new Map();
    promotedGroups.forEach((g, i) => {
      const id = `gw_${i}`;
      hubDeclId.set(g.id, id);
      // Bare `state ID` line, same reason as every ordinary state above: the
      // `ID : label` line alone is invisible to MermaidParser's DeclaredStates —
      // once ANY state in the diagram uses explicit declarations, the parser
      // stops auto-discovering entirely, so a hub missing this line vanishes
      // from the translated plan's own State list even though its edges still
      // parse. Every edge touching it (both into and out of the hub) then fails
      // MFilesDiagramView's `pos[state]` lookup and is silently dropped — not
      // just undashed, missing outright. Confirmed live: an automatic
      // transition feeding a 2+-source Gateway hub never appeared on the
      // M-Files Diagram tab at all until this line was added.
      d += `  state ${id}\n`;
      d += `  ${id} : ${gatewayLabel(g.id)}\n`;
    });

    // Declare transitions (skip any with empty from/to)
    const emittedHubEdges = new Set();
    transitions.forEach(t => {
      const from = (t.from || '').trim();
      const toName = (t.to || '').trim();
      if (!from || !toName) return;
      const f  = from.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '');
      const to = toName.replace(/\s+/g,   '_').replace(/[^a-zA-Z0-9_]/g, '');

      // Condition label — only genuinely recognized grammar ever reaches the
      // diagram (transitionGrammar.js's isRenderable). Unparsed/prose text
      // stays visible in the editing table only, never silently rendered as
      // if it had resolved to something real (mirrors Decision 2's skeleton
      // philosophy: flag, don't fabricate).
      const parsedCondition = parseCondition(t.conditions);
      const labelSuffix = isRenderable(parsedCondition) ? ` : ${parsedCondition.raw}` : '';

      const g = (t.group || '').trim();
      if (g && promotedIds.has(g)) {
        const hubId = hubDeclId.get(g);
        // The condition belongs to THIS source's own leg into the hub — it governs
        // when this particular incoming transition fires, not the hub's shared
        // downstream fan-out (which can be reached via multiple sources with
        // different, even conflicting, conditions). Previously labelSuffix was
        // attached to the outgoing hub->target edge instead, which silently
        // dropped every incoming automatic condition (dedup key ignores it anyway,
        // `${hubId} --> ${to}`) and could misattribute one source's condition onto
        // a shared edge every other source also uses.
        const inEdge = `${f} --> ${hubId}${labelSuffix}`, outEdge = `${hubId} --> ${to}`;
        if (!emittedHubEdges.has(inEdge))  { d += `  ${inEdge}\n`;  emittedHubEdges.add(inEdge); }
        if (!emittedHubEdges.has(outEdge)) { d += `  ${outEdge}\n`; emittedHubEdges.add(outEdge); }
        return;
      }

      d += `  ${f} --> ${to}${labelSuffix}\n`;
    });

    return d;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workflowKey, stateKey, transKey, themeKey, requireInitial]); // includes workflow identity to avoid cross-tab memo reuse
};
