import { useMemo, useState, useEffect, useRef } from 'react';
import dagre from '@dagrejs/dagre';
import {
  RefreshCw, AlertCircle, AlertTriangle, CheckCircle2, LayoutGrid, Rows3,
  Settings, ArrowUp, ArrowRightCircle, ArrowLeft, Flag, HelpCircle, XCircle,
  Minus, Plus, Maximize2, ArrowLeftRight,
} from 'lucide-react';
import { highlightJson } from '../../utils/jsonHighlight';
import HScrollBar from '../HScrollBar';

// ── LiveTranslationView ─────────────────────────────────────────────
// Right-hand panel of M-Files Flow's split-screen: renders whatever
// TranslationPlan JSON the CLI bridge last returned (MFlowCanvas.jsx owns
// the debounce/spawn call, this component is purely a renderer over the
// result). Four views, one toggle group: M-Files Diagram (default), the
// original Flattened list, Raw JSON, Validation. Field names are PascalCase
// throughout — this is the plan exactly as
// ProvisioningAI.Workflow.Translation.PlanFormatter.ToJson() serializes it
// (System.Text.Json's default naming, no camelCase policy set), not
// remapped here.

// ── M-Files Diagram — layout + rendering, ported from
// TranslationPlanRenderer.html's `computeLayers`/`layoutPlan`/`edgeLabel`/
// `renderMFilesDiagram` (§6.2's own reference renderer), translated from
// imperative DOM-append calls into plain data + JSX. Logic kept faithful to
// that reference (same BFS layering, same back-edge shared-lane routing,
// same label-collision nudging, same skeleton/unparsed treatment) — only
// the colors changed, from that file's light-theme palette to this app's
// own dark-theme CSS variables. No diamonds, ever: this is the flattened
// M-Files truth, same rule the Flattened list view already follows —
// collapse/promote is a caption under the box, never a shape change.
function computeLayers(plan) {
  const names = plan.States.map(s => s.Name);
  const outgoing = {};
  names.forEach(n => { outgoing[n] = []; });
  plan.Transitions.forEach(t => {
    if (!outgoing[t.FromState]) outgoing[t.FromState] = [];
    outgoing[t.FromState].push(t.ToState);
  });
  const incomingCount = {};
  names.forEach(n => { incomingCount[n] = 0; });
  plan.Transitions.forEach(t => { if (incomingCount[t.ToState] !== undefined) incomingCount[t.ToState]++; });

  let roots = plan.States.filter(s => s.IsInitial).map(s => s.Name);
  if (roots.length === 0) roots = names.filter(n => incomingCount[n] === 0);
  if (roots.length === 0) roots = names.slice(0, 1);

  const layer = {};
  const visited = new Set();
  const queue = [];
  roots.forEach(r => { layer[r] = 0; visited.add(r); queue.push(r); });
  let qi = 0;
  while (qi < queue.length) {
    const cur = queue[qi++];
    (outgoing[cur] || []).forEach(to => {
      if (!visited.has(to)) { visited.add(to); layer[to] = layer[cur] + 1; queue.push(to); }
    });
  }
  // Simple BFS, visited-once — sufficient here same as the reference: a
  // cycle just produces a back-edge to an earlier layer, handled by the
  // curved shared-lane routing below rather than looping trying to optimize.
  names.forEach(n => { if (!visited.has(n)) { layer[n] = 0; visited.add(n); } });
  return layer;
}

// Returns only {pos, boxW, boxH} — node placement is this function's whole
// job. Canvas width/height and back-edge lane space are a separate, shared
// concern (computeCanvasAndLanes below) that neither layout source should
// own — baking a fixed back-edge-lane fudge factor in here was exactly what
// broke at real scale (Approbation's 47 back-edges needed far more than any
// fixed guess could reserve).
function layoutPlan(plan) {
  const layer = computeLayers(plan);
  const byLayer = {};
  plan.States.forEach(s => {
    const l = layer[s.Name];
    (byLayer[l] = byLayer[l] || []).push(s.Name);
  });
  const colWidth = 210, rowHeight = 116, boxW = 152, boxH = 52, marginX = 28, marginY = 28;
  const pos = {};
  Object.keys(byLayer).map(Number).sort((a, b) => a - b).forEach(l => {
    byLayer[l].forEach((n, i) => {
      pos[n] = {
        x: marginX + i * colWidth, y: marginY + l * rowHeight,
        cx: marginX + i * colWidth + boxW / 2, cy: marginY + l * rowHeight + boxH / 2,
      };
    });
  });
  return { pos, boxW, boxH };
}

// Auto-Layout (on-demand only, see the toggle in LiveTranslationView below) —
// same dagre pattern already proven in features/layout/bpmnAutoLayout.js,
// just returning layoutPlan's own {pos,boxW,boxH} shape instead of a React
// Flow node array, so none of MFilesDiagramView's edge-rendering code
// (back-edge detection, lane routing, label collision avoidance) needs to
// know which layout produced its positions.
function layoutPlanWithDagre(plan, { rankdir = 'TB', nodesep = 60, ranksep = 70 } = {}) {
  const boxW = 152, boxH = 52;
  const g = new dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir, nodesep, ranksep });
  // Real per-name width, not the fixed boxW — dagre's own crossing-order
  // decisions should be based on what actually renders, same reasoning
  // stateBoxWidth was built for on the render side.
  plan.States.forEach(s => g.setNode(s.Name, { width: stateBoxWidth(s.Name, boxW), height: boxH }));
  plan.Transitions.forEach(t => {
    // Self-loops can't be routed by dagre — same exclusion the back-edge
    // branch below already applies (`t.FromState !== t.ToState`).
    if (t.FromState !== t.ToState) g.setEdge(t.FromState, t.ToState);
  });
  dagre.layout(g);

  const pos = {};
  plan.States.forEach(s => {
    const n = g.node(s.Name);
    if (!n) return;
    // dagre's x/y are CENTER coordinates (confirmed against
    // bpmnAutoLayout.js's own `x - w/2` conversion) — converted back to
    // top-left using each node's OWN real width, matching what was fed in.
    const w = stateBoxWidth(s.Name, boxW);
    pos[s.Name] = { x: n.x - w / 2, y: n.y - boxH / 2, cx: n.x, cy: n.y };
  });
  return { pos, boxW, boxH };
}

// Real M-Files Admin layout, when the imported workflow has one —
// `realLayoutByName` is a Map<stateName, {x,y}> already resolved from GUIDs
// by MFlowCanvas.jsx (this function never sees a GUID). All-or-nothing: real
// M-Files canvas units aren't the same scale as this app's own computed
// dagre/BFS spacing, and mixing them for different states in one diagram
// would produce visibly inconsistent spacing with no real case observed that
// needs it (checked live: every real sample was either fully populated or
// fully empty, never partial) — so this returns null (caller falls back to
// layoutPlan) unless every single state in the plan has a real position.
function layoutFromRealData(plan, realLayoutByName, boxW, boxH) {
  if (!realLayoutByName || plan.States.length === 0) return null;
  const raw = {};
  for (const s of plan.States) {
    const p = realLayoutByName.get(s.Name);
    if (!p || Number.isNaN(p.x) || Number.isNaN(p.y)) return null;
    raw[s.Name] = p;
  }
  // M-Files Admin's own canvas has no fixed origin — real coordinates run
  // negative in both axes (confirmed live: x -956..2444, y -842..865 on
  // Conformity). Shift everything so the leftmost/topmost state lands at the
  // same margin every other layout source already starts from.
  const marginX = 28, marginY = 28;
  const minX = Math.min(...Object.values(raw).map(p => p.x));
  const minY = Math.min(...Object.values(raw).map(p => p.y));
  const offsetX = marginX - minX, offsetY = marginY - minY;

  const pos = {};
  plan.States.forEach(s => {
    const p = raw[s.Name];
    const cx = p.x + offsetX, cy = p.y + offsetY;
    pos[s.Name] = { x: cx - boxW / 2, y: cy - boxH / 2, cx, cy };
  });
  return { pos, boxW, boxH };
}

function edgeLabel(t) {
  if (t.IsSkeleton) return `⚠ unparsed: "${t.OriginalLabel || ''}"`;
  const parts = [];
  if (t.Name) parts.push(t.Name);
  if (t.TriggerCriteria) parts.push(`if(${t.TriggerCriteria.Property}=${t.TriggerCriteria.Value})`);
  else if (t.TriggerInDays != null) parts.push(`after(${t.TriggerInDays}d)`);
  else if (t.VBScriptName) parts.push(`script(${t.VBScriptName})`);
  if (t.PermissionsGroup) parts.push(`role(${t.PermissionsGroup})${t.RequireElectronicSignature ? '+esign' : ''}`);
  // Only shown when it deviates from the confirmed live default (100) — same
  // "clutter" reasoning as the reference (§1.6/§3.5).
  if (typeof t.EvaluationPriority === 'number' && t.EvaluationPriority !== 100) parts.push(`priority(${t.EvaluationPriority})`);
  return parts.join(' ');
}

function rectsOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

// Real box width for ANY state name, not tuned to any one workflow — grows
// with label length (same character-width-estimate idiom already used for
// edge labels below), capped so it never eats into the neighboring column's
// slot (both layoutPlan's colWidth-boxW and dagre's nodesep reserve ~58-60px
// of gap around boxW; +45 leaves real margin under either). `baseW` is the
// layout's own reserved slot width (layoutPlan's boxW), so this generalizes
// correctly whether the plan has 6 states or 47.
function stateBoxWidth(name, baseW) {
  return Math.max(baseW, Math.min(baseW + 45, 7 * (name || '').length + 40));
}

// Canvas size + back-edge lane assignment, computed once after layout —
// deliberately separate from layoutPlan/layoutPlanWithDagre, since neither
// node-placement algorithm should own back-edge routing space (that was
// exactly the bug at real scale: a fixed +130px fudge factor, sized for a
// handful of back-edges, silently clipped 47 of them outside the SVG's own
// viewBox on the real Approbation data).
//
// Back-edge lanes are packed via the standard greedy interval-scheduling
// algorithm ("minimum meeting rooms" — sort by span start, reuse the first
// lane whose last edge doesn't overlap this one, else open a new lane).
// This bounds total lanes to the real MAXIMUM CONCURRENT back-edges, not the
// raw count. Generic: no hardcoded names or counts, works the same whether a
// workflow has 0 back-edges or 47.
//
// `isHorizontal` (true only for the 'wide'/LR dagre layout) swaps which axis
// means "backward" and which side the shared lane sits on — a back-edge in a
// left-to-right flow goes leftward (lower cx), not upward (lower cy), and
// routing it through a lane on the right (this file's original, TB-only
// logic) doesn't correspond to anything geometrically when the flow itself
// runs sideways. Found live: without this, wide mode mis-detected ~40 extra
// forward edges as "back" (68 -> 108 on the real Approbation data) purely
// because their cy ordering didn't match dagre's actual LR rank order,
// inflating both the lane count and the canvas size well past what the
// spacing values alone would produce.
function computeCanvasAndLanes(plan, pos, boxW, boxH, isHorizontal = false) {
  const marginX = 28, marginY = 28;
  let maxRight = boxW, maxBottom = boxH;
  plan.States.forEach(s => {
    const p = pos[s.Name];
    if (!p) return;
    maxRight = Math.max(maxRight, p.x + stateBoxWidth(s.Name, boxW));
    maxBottom = Math.max(maxBottom, p.y + boxH);
  });

  const backEdges = [];
  plan.Transitions.forEach((t, i) => {
    const from = pos[t.FromState], to = pos[t.ToState];
    if (!from || !to || t.FromState === t.ToState) return;
    const backward = isHorizontal ? to.cx <= from.cx : to.cy <= from.cy;
    if (backward) {
      const a = isHorizontal ? from.cx : from.cy, b = isHorizontal ? to.cx : to.cy;
      backEdges.push({ i, start: Math.min(a, b), end: Math.max(a, b) });
    }
  });
  backEdges.sort((a, b) => a.start - b.start);
  const laneEnds = []; // laneEnds[lane] = end of the last back-edge assigned to that lane so far
  const laneOf = new Map();
  backEdges.forEach(be => {
    let lane = laneEnds.findIndex(end => end <= be.start);
    if (lane === -1) { lane = laneEnds.length; laneEnds.push(be.end); }
    else { laneEnds[lane] = be.end; }
    laneOf.set(be.i, lane);
  });
  const laneCount = laneEnds.length;

  // TB: lane axis is X (a vertical lane to the right, spanning Y).
  // LR: lane axis is Y (a horizontal lane below, spanning X) — the direct
  // 90°-rotated equivalent, same reasoning as the back-edge detection above.
  const backEdgeLaneX = isHorizontal ? 0 : maxRight + 55;
  const backEdgeLaneY = isHorizontal ? maxBottom + 55 : 0;
  const width = isHorizontal ? maxRight + marginX : (laneCount > 0 ? backEdgeLaneX + laneCount * 22 + marginX : maxRight + marginX);
  const height = isHorizontal ? (laneCount > 0 ? backEdgeLaneY + laneCount * 22 + marginY : maxBottom + marginY) : maxBottom + marginY;
  return { width, height, backEdgeLaneX, backEdgeLaneY, laneOf, isHorizontal };
}

// State icon, inferred from the state's own Name string — the only field
// that exists anywhere in this app's data model (confirmed against the real
// export JSON and the Zustand store: states carry no true M-Files
// action-type metadata, only name/initial). Prefixes match this project's
// own already-documented naming convention (CLAUDE.md §4.4's workflow-state
// classification: SQL_, UPD_*_CP1, RTE_, etc.) — an approximation grounded
// in real data, not a claim of true M-Files action metadata.
const STATE_ICON_RULES = [
  [/^sql_/i, Settings, '#64748b'],
  [/^upd_/i, RefreshCw, '#2563eb'],
  [/^(rte[-_]|rte\s)/i, ArrowUp, '#2563eb'],
  [/^in_to_/i, ArrowRightCircle, '#16a34a'],
  [/^out_to_/i, ArrowLeft, '#64748b'],
  [/^\d+-\s/, Flag, '#2563eb'],
  [/control/i, HelpCircle, '#64748b'],
  [/trash/i, XCircle, '#dc2626'],
];
function stateIcon(name) {
  for (const [re, Icon, color] of STATE_ICON_RULES) {
    if (re.test(name)) return { Icon, color };
  }
  return null; // default: plain gold square, no icon — see StateGlyph below
}

// Small white backdrop behind every glyph — a consequence of the 2026-08-25
// Studio-parity pass giving every state box a solid blue fill (matching
// Studio's own primaryColor). STATE_ICON_RULES' per-type colors (gray/blue/
// green/red) are real signal grounded in this project's own naming
// convention (see the rule comment above) and Studio has no equivalent to
// extract a replacement scheme from, so the fix keeps them as-is rather than
// flattening everything to white — the backdrop is what keeps them legible
// against the new blue, not a new color decision.
function StateGlyph({ name, x, y }) {
  const match = stateIcon(name);
  if (!match) return <rect x={x} y={y} width={11} height={11} fill="#d97706" rx={2}/>;
  const { Icon, color } = match;
  return (
    <g>
      <circle cx={x + 6} cy={y + 6} r={7} fill="#ffffff"/>
      <svg x={x} y={y} width={12} height={12} viewBox="0 0 24 24">
        <Icon size={24} color={color} strokeWidth={2.2}/>
      </svg>
    </g>
  );
}

function MFilesDiagramView({ plan, layoutMode, realLayoutByName }) {
  // Default layout is byte-identical to before this feature — same call,
  // same deps. Dagre only ever runs when its mode is actually selected, and
  // stays cached per-plan so flipping modes repeatedly after the first
  // activation doesn't recompute.
  const defaultLayout = useMemo(() => layoutPlan(plan), [plan]);
  const dagreLayout = useMemo(
    () => (layoutMode === 'auto' ? layoutPlanWithDagre(plan) : null),
    [plan, layoutMode]
  );
  // Wide: same dagre engine, left-to-right instead of top-to-bottom, with a
  // generous ranksep — in rankdir:'LR' that's the HORIZONTAL gap between
  // rank-columns (nodesep becomes the vertical one), so this is what
  // actually spreads the diagram width-wise, not a bigger canvas guess.
  const wideLayout = useMemo(
    () => (layoutMode === 'wide' ? layoutPlanWithDagre(plan, { rankdir: 'LR', nodesep: 40, ranksep: 90 }) : null),
    [plan, layoutMode]
  );
  // Real M-Files Admin layout wins by default when the imported workflow has
  // one — Auto-Layout/Wide stay purely opt-in exactly as before (still
  // override real layout when selected), computed BFS is the final fallback
  // for hand-drawn workflows or ones never arranged in M-Files Admin.
  const realLayout = useMemo(
    () => layoutFromRealData(plan, realLayoutByName, 152, 52),
    [plan, realLayoutByName]
  );
  const layout = layoutMode === 'auto' && dagreLayout ? dagreLayout
    : layoutMode === 'wide' && wideLayout ? wideLayout
    : (realLayout || defaultLayout);
  const { pos, boxW, boxH } = layout;
  const isHorizontal = layoutMode === 'wide';

  const { width, height, backEdgeLaneX, backEdgeLaneY, laneOf } = useMemo(
    () => computeCanvasAndLanes(plan, pos, boxW, boxH, isHorizontal),
    [plan, pos, boxW, boxH, isHorizontal]
  );

  // Pan/zoom/fit — ported from MFlowCanvas.jsx's own proven mechanism (the
  // only other hand-rolled-SVG canvas in this codebase; Process Docs is
  // React Flow, nothing portable there). Pan writes directly to the svg's
  // own style.transform during a drag rather than through React state, same
  // reasoning MFlowCanvas uses it for — re-rendering hundreds of paths per
  // mousemove pixel on an Approbation-scale diagram would be genuinely janky.
  const wrapRef = useRef(null);
  const svgRef = useRef(null);
  const panRef = useRef({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  // Bottom horizontal scrollbar for this panel's own diagram — same shared
  // component and adapter shape as MFlowCanvas.jsx's left canvas (HScrollBar
  // driving panRef/transform), simpler here since width/height are already
  // plain numbers (no svg.dataset parsing needed). viewportWidth comes from
  // wrapRef's own PARENT (.mflow-ltv-body), not wrapRef itself -- this wrap
  // has no fixed width of its own (overflow:auto with nothing constraining
  // it), so its clientWidth is just whatever the zoomed SVG currently is,
  // not a real viewport measurement.
  const hscrollRef = useRef(null);
  const ltvScrollMetrics = () => {
    const viewportWidth = wrapRef.current?.parentElement?.clientWidth || wrapRef.current?.clientWidth || 1;
    const contentWidth = width * zoom;
    const buffer = viewportWidth;
    const maxScroll = Math.max(contentWidth - viewportWidth, 0) + buffer;
    return { viewportWidth, virtualContentWidth: viewportWidth + maxScroll, maxScroll, centerScroll: maxScroll / 2 };
  };
  const updateLtvScrollbarPos = () => {
    const { viewportWidth, virtualContentWidth, centerScroll } = ltvScrollMetrics();
    hscrollRef.current?.setMetrics({ viewportWidth, contentWidth: virtualContentWidth, scrollLeft: centerScroll - panRef.current.x });
  };
  const updateLtvScrollbarPosRef = useRef(updateLtvScrollbarPos);
  updateLtvScrollbarPosRef.current = updateLtvScrollbarPos;
  const applyLtvPanX = newX => {
    panRef.current = { ...panRef.current, x: newX };
    if (svgRef.current) svgRef.current.style.transform = `translate3d(${panRef.current.x}px, ${panRef.current.y}px, 0)`;
    updateLtvScrollbarPosRef.current();
  };
  const onLtvHScrollChange = newScrollLeft => {
    const { centerScroll } = ltvScrollMetrics();
    applyLtvPanX(centerScroll - newScrollLeft);
  };

  useEffect(() => {
    if (!svgRef.current) return;
    // Both dimensions, not just width — this svg (unlike MFlowCanvas's,
    // which strips the width/height attributes entirely before scaling)
    // keeps them as React-rendered attributes for the base layout, so
    // scaling only one via CSS mismatches the viewBox's aspect ratio and
    // lets preserveAspectRatio silently reposition content off-view.
    svgRef.current.style.width = `${width * zoom}px`;
    svgRef.current.style.height = `${height * zoom}px`;
    updateLtvScrollbarPosRef.current();
  }, [zoom, width, height, layoutMode]);

  // Re-attaches on every layoutMode change because the wrap/svg below are
  // keyed on it (for the fade replay) and get a fresh DOM node each time —
  // an effect with stale deps would keep listening on a detached node.
  useEffect(() => {
    const el = wrapRef.current; if (!el) return;
    const PAN_THRESHOLD = 1;
    const onMouseDown = e => {
      if (e.button !== 0) return;
      const svgEl = svgRef.current; if (!svgEl) return;
      const startX = e.clientX, startY = e.clientY;
      const startPan = { ...panRef.current };
      let panning = false;
      const onMove = ev => {
        const dx = ev.clientX - startX, dy = ev.clientY - startY;
        if (!panning && Math.hypot(dx, dy) > PAN_THRESHOLD) { panning = true; el.classList.add('panning'); }
        if (!panning) return;
        panRef.current = { x: startPan.x + dx, y: startPan.y + dy };
        svgEl.style.transform = `translate3d(${panRef.current.x}px, ${panRef.current.y}px, 0)`;
        updateLtvScrollbarPosRef.current();
      };
      const onUp = () => {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        el.classList.remove('panning');
      };
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    };
    el.addEventListener('mousedown', onMouseDown);
    return () => el.removeEventListener('mousedown', onMouseDown);
  }, [layoutMode]);

  useEffect(() => {
    const el = wrapRef.current; if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => updateLtvScrollbarPosRef.current());
    ro.observe(el.parentElement || el);
    return () => ro.disconnect();
  }, [layoutMode]);

  useEffect(() => {
    const el = wrapRef.current; if (!el) return;
    const onWheel = e => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      setZoom(z => Math.min(3, Math.max(0.2, +(z + delta).toFixed(2))));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [layoutMode]);

  const fitToView = () => {
    const el = wrapRef.current, svgEl = svgRef.current;
    if (!el || !svgEl) return;
    const availW = el.clientWidth - 60, availH = el.clientHeight - 60;
    const fitScale = Math.min(1, availW / width, availH / height);
    setZoom(fitScale);
    panRef.current = { x: 0, y: 0 };
    svgEl.style.transform = 'translate3d(0px, 0px, 0)';
    updateLtvScrollbarPosRef.current();
  };

  // Auto-fit — the actual fix for "Auto-Layout looked like it did nothing":
  // a fresh diagram's initial render, and every layout-mode switch/new
  // translation, since dagre can center a narrow top rank far from the
  // panel's default (0,0) scroll position on a wide real-world graph.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fitToView(); }, [plan, layoutMode]);

  const edgeEls = [];
  const placedLabelRects = [];

  // Duplicate (FromState,ToState) pairs would otherwise draw perfectly
  // overlapping curves — give each one a small symmetric lateral offset,
  // same incrementing-offset idea as backEdgeLaneOffset above, just keyed
  // per-pair instead of globally.
  const pairTotal = {};
  plan.Transitions.forEach(t => {
    const k = `${t.FromState}→${t.ToState}`;
    pairTotal[k] = (pairTotal[k] || 0) + 1;
  });
  const pairSeen = {};
  function dupBow(fromState, toState) {
    const k = `${fromState}→${toState}`;
    const total = pairTotal[k];
    if (total <= 1) return 0;
    const occ = pairSeen[k] = (pairSeen[k] || 0) + 1;
    return (occ - (total + 1) / 2) * 24;
  }

  plan.Transitions.forEach((t, i) => {
    const from = pos[t.FromState], to = pos[t.ToState];
    if (!from || !to) return;
    const isBackEdge = isHorizontal ? to.cx <= from.cx : to.cy <= from.cy;
    // Normal-edge color now matches Studio's real measured lineColor
    // (#3A7FD5, confirmed live via getComputedStyle, 2026-08-25). The
    // skeleton/warning amber stays untouched — it's an M-Files-Diagram-only
    // honesty signal (an unparsed transition) Studio has no concept of.
    const stroke = t.IsSkeleton ? '#b45309' : '#3A7FD5';
    const marker = t.IsSkeleton ? 'url(#mflow-diagram-arrow-warn)' : 'url(#mflow-diagram-arrow)';
    // Solid = manual/human-driven, dashed = automatic (script/criteria) —
    // M-Files' own real meaning, confirmed against a live Admin screenshot.
    // Not the same thing as IsSkeleton (a parse warning); a skeleton edge
    // still follows its own real TriggerMode for dash style.
    const dashArray = t.TriggerMode === 'Manual' ? undefined : '7,5';

    let d, midX, midY;
    // Back-edges (cycles, e.g. a retry loop) route through one shared lane
    // rather than bowing out locally, same reasoning as the reference: a
    // local bow tends to cut through whichever sibling state and label
    // happen to sit nearby. TB: a vertical lane to the right, spanning Y.
    // LR (wide mode): the 90°-rotated equivalent — a horizontal lane below,
    // spanning X — since "backward" in a left-to-right flow means leftward,
    // not upward, routing it through a right-side X-lane wouldn't
    // correspond to anything geometrically.
    if (isBackEdge && t.FromState !== t.ToState) {
      // Lane looked up from the packed assignment (computeCanvasAndLanes) —
      // reused when spans don't overlap, bounded to the canvas's own real
      // size, rather than an ever-growing per-edge counter.
      const lane = laneOf.get(i) || 0;
      if (isHorizontal) {
        const laneY = backEdgeLaneY + lane * 22;
        const sx = from.cx, sy = from.cy + boxH / 2, tx = to.cx, ty = to.cy + boxH / 2;
        d = `M ${sx} ${sy} C ${sx} ${laneY}, ${tx} ${laneY}, ${tx} ${ty}`;
        midX = (sx + tx) / 2; midY = laneY;
      } else {
        const laneX = backEdgeLaneX + lane * 22;
        const sx = from.cx + stateBoxWidth(t.FromState, boxW) / 2, sy = from.cy,
              tx = to.cx + stateBoxWidth(t.ToState, boxW) / 2, ty = to.cy;
        d = `M ${sx} ${sy} C ${laneX} ${sy}, ${laneX} ${ty}, ${tx} ${ty}`;
        midX = laneX; midY = (sy + ty) / 2;
      }
    } else if (isHorizontal) {
      // Horizontal S-curve: mirrors the TB vertical S-curve with axes
      // swapped — connects right edge of source to left edge of target
      // (matching a genuinely left-to-right flow), bows vertically instead
      // of horizontally for duplicate pairs.
      const sx = from.cx + stateBoxWidth(t.FromState, boxW) / 2, sy = from.cy,
            tx = to.cx - stateBoxWidth(t.ToState, boxW) / 2, ty = to.cy;
      const mx = (sx + tx) / 2;
      const bow = dupBow(t.FromState, t.ToState);
      d = `M ${sx} ${sy} C ${mx} ${sy + bow}, ${mx} ${ty + bow}, ${tx} ${ty}`;
      midX = mx; midY = (sy + ty) / 2 + 0.75 * bow;
    } else {
      // Vertical S-curve bezier: control points pulled to the horizontal
      // midpoint between the two boxes. Degenerates to a straight vertical
      // line when sx===tx (already-aligned nodes); otherwise travels
      // smoothly down, over, and down again — never cuts diagonally through
      // an intervening row.
      const sx = from.cx, sy = from.cy + boxH / 2, tx = to.cx, ty = to.cy - boxH / 2;
      const my = (sy + ty) / 2;
      const bow = dupBow(t.FromState, t.ToState);
      d = `M ${sx} ${sy} C ${sx + bow} ${my}, ${tx + bow} ${my}, ${tx} ${ty}`;
      midX = (sx + tx) / 2 + 0.75 * bow; midY = my;
    }

    edgeEls.push(
      <path key={`e${i}`} d={d} fill="none" stroke={stroke} strokeWidth={1}
        strokeDasharray={dashArray} markerEnd={marker}/>
    );

    // Blue circle badge at the edge's own raw midpoint (before the label
    // collision-avoidance loop below can nudge midX/midY away from the
    // line) — the same visual real M-Files Admin uses to mark a transition
    // with real trigger/guard logic, gated on the identical TriggerMode
    // check dashArray above already uses, not a separate signal.
    if (t.TriggerMode !== 'Manual') {
      // White outline now matches Studio's real .edge-guard-badge CSS
      // (stroke:#fff, stroke-width:1.5px) — confirmed, not guessed.
      edgeEls.push(<circle key={`eb${i}`} cx={midX} cy={midY} r={5} fill="#2563eb" stroke="#fff" strokeWidth={1.5}/>);
    }

    const label = edgeLabel(t);
    if (label) {
      const approxW = Math.min(200, 6 * label.length) + 8;
      let labelX = midX, labelY = midY;
      for (let attempt = 0; attempt < 12; attempt++) {
        const candidate = { x: labelX - approxW / 2, y: labelY - 9, w: approxW, h: 16 };
        if (!placedLabelRects.some(r => rectsOverlap(candidate, r))) break;
        labelY += 15;
      }
      placedLabelRects.push({ x: labelX - approxW / 2, y: labelY - 9, w: approxW, h: 16 });
      edgeEls.push(
        <g key={`el${i}`}>
          <rect x={labelX - approxW / 2} y={labelY - 9} width={approxW} height={16} fill="#ffffff" stroke="#e2e8f0" opacity={0.96} rx={3}/>
          <text x={labelX} y={labelY + 3} textAnchor="middle" fontSize={10} fill={t.IsSkeleton ? '#b45309' : '#334155'} fontWeight={t.IsSkeleton ? 700 : 400}>{label}</text>
        </g>
      );
    } else if (t.IsSkeleton) {
      edgeEls.push(<text key={`ew${i}`} x={midX} y={midY + 4} textAnchor="middle" fontSize={13} fill="#b45309">⚠</text>);
    }
  });

  return (
    <div className="mflow-ltv-diagram-tab">
    <div key={layoutMode} ref={wrapRef} className="mflow-ltv-diagram-wrap mflow-ltv-fade">
      <div className="mflow-ltv-zoom-controls-wrap">
        <div className="mflow-view-controls" role="group" aria-label="Diagram view controls">
          <button type="button" onClick={() => setZoom(z => Math.max(0.2, +(z - 0.15).toFixed(2)))} title="Zoom out"><Minus size={12}/></button>
          <button type="button" onClick={() => setZoom(z => Math.min(3, +(z + 0.15).toFixed(2)))} title="Zoom in"><Plus size={12}/></button>
          <button type="button" onClick={fitToView} title="Fit diagram to view"><Maximize2 size={12}/> Fit</button>
        </div>
      </div>
      <svg ref={svgRef} width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: 'block' }}>
        <defs>
          <marker id="mflow-diagram-arrow" viewBox="0 0 10 10" refX={9} refY={5} markerWidth={7} markerHeight={7} orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#1E293B"/>
          </marker>
          <marker id="mflow-diagram-arrow-warn" viewBox="0 0 10 10" refX={9} refY={5} markerWidth={7} markerHeight={7} orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#b45309"/>
          </marker>
          <marker id="mflow-diagram-arrow-initial" viewBox="0 0 10 10" refX={9} refY={5} markerWidth={7} markerHeight={7} orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#2563eb"/>
          </marker>
        </defs>
        {edgeEls}
        {plan.States.map((s, i) => {
          const p = pos[s.Name];
          if (!p) return null;
          const isTerminal = s.IsTerminal;
          // Studio-parity fill/border (2026-08-25) — Studio uses one uniform
          // box style for every real state, no separate initial/terminal
          // color, confirmed live via getComputedStyle against the real
          // running canvas (fill rgb(58,127,213)=#3A7FD5, stroke
          // rgb(42,95,168)=#2A5FA8, both 1px). Terminal's own thicker 2.5px
          // border is an M-Files-Diagram-only distinction Studio has no
          // equivalent for, so its WIDTH stays — only the color unifies.
          const fill = '#3A7FD5';
          const stroke = '#2A5FA8';
          const myW = stateBoxWidth(s.Name, boxW);
          const myCx = p.x + myW / 2;
          const iconX = p.x + 8;
          return (
            <g key={`s${i}`}>
              <rect x={p.x} y={p.y} width={myW} height={boxH} rx={5} fill={fill} stroke={stroke} strokeWidth={isTerminal ? 2.5 : 1}/>
              {s.IsInitial && <>
                <circle cx={p.x - 13} cy={p.cy} r={4} fill="#2563eb"/>
                <path d={`M ${p.x - 8} ${p.cy} L ${p.x} ${p.cy}`} stroke="#2563eb" strokeWidth={2} markerEnd="url(#mflow-diagram-arrow-initial)"/>
              </>}
              <StateGlyph name={s.Name} x={iconX} y={p.cy - 6}/>
              <text x={iconX + 17} y={s.WasCollapsedChoicePromotedToState ? p.cy - 3 : p.cy + 4} textAnchor="start" fontSize={11} fontWeight={600} fontFamily="'JetBrains Mono',monospace" fill="#ffffff">{s.Name}</text>
              {s.WasCollapsedChoicePromotedToState && (
                <text x={myCx} y={p.cy + 14} textAnchor="middle" fontSize={8} fill="#64748b" fontStyle="italic">(promoted from &lt;&lt;choice&gt;&gt;)</text>
              )}
              {isTerminal && (
                <text x={myCx} y={p.y + boxH + 12} textAnchor="middle" fontSize={8.5} fill="#64748b" fontStyle="italic">terminal</text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
    <HScrollBar ref={hscrollRef} onScrollLeftChange={onLtvHScrollChange}/>
    </div>
  );
}

const TRIGGER_MODE_META = {
  Manual: { label: 'Manual', color: 'var(--mid)' },
  AutomaticCriteria: { label: 'Auto · criteria', color: 'var(--a3)' },
  AutomaticVBScript: { label: 'Auto · script', color: 'var(--purple)' },
};

function TriggerModeChip({ mode }) {
  const meta = TRIGGER_MODE_META[mode] || { label: mode, color: 'var(--mid)' };
  return <span className="mflow-ltv-chip" style={{ color: meta.color, borderColor: meta.color }}>{meta.label}</span>;
}

function FlattenedPlan({ plan, hoveredStateKey }) {
  return (
    <div className="mflow-ltv-flat">
      <div className="mflow-ltv-flat-label">States ({plan.States.length})</div>
      {plan.States.length === 0
        ? <div className="mflow-ltv-empty">No states yet.</div>
        : <div className="mflow-ltv-states">
            {plan.States.map(s => (
              // Every state a plain rectangle — collapse/promote is a caption
              // underneath, never a diamond shape. Matches
              // TranslationPlanRenderer.html's own proven rendering rule.
              // hoveredStateKey is already the SANITIZED id (MFlowCanvas.jsx
              // computes it that way) — plan.States[].Name is always that same
              // sanitized form too, per the translator's own no-alias-syntax
              // grammar (MfilesProperties.md §3.5), so a plain equality check
              // is correct here, not an approximation.
              <div key={s.Name} className={`mflow-ltv-state-box${s.Name === hoveredStateKey ? ' hover' : ''}`}>
                <div className="mflow-ltv-state-name">{s.Name}</div>
                <div className="mflow-ltv-state-badges">
                  {s.IsInitial && <span className="mflow-ltv-badge mflow-ltv-badge-initial">Initial</span>}
                  {s.IsTerminal && <span className="mflow-ltv-badge mflow-ltv-badge-terminal">Terminal</span>}
                </div>
                {s.WasCollapsedChoicePromotedToState && (
                  <div className="mflow-ltv-state-caption">(promoted from &lt;&lt;choice&gt;&gt;, §3.5 Decision 3)</div>
                )}
              </div>
            ))}
          </div>}

      <div className="mflow-ltv-flat-label">Transitions ({plan.Transitions.length})</div>
      {plan.Transitions.length === 0
        ? <div className="mflow-ltv-empty">No transitions yet.</div>
        : <div className="mflow-ltv-transitions">
            {plan.Transitions.map((t, i) => (
              <div key={i} className="mflow-ltv-trans-row">
                <div className="mflow-ltv-trans-path">{t.FromState} <span className="mflow-ltv-arrow">→</span> {t.ToState}{t.Name && <span className="mflow-ltv-trans-name" style={{ marginLeft: '8px', color: '#60a5fa', fontWeight: 'normal', fontSize: '0.9em' }}>"{t.Name}"</span>}</div>
                <div className="mflow-ltv-trans-meta">
                  <TriggerModeChip mode={t.TriggerMode} />
                  {t.EvaluationPriority !== 100 && <span className="mflow-ltv-chip" title="§1.6 EvaluationPriority">priority {t.EvaluationPriority}</span>}
                  {t.TriggerInDays != null && <span className="mflow-ltv-chip">{t.TriggerInDays}d</span>}
                  {t.PermissionsGroup && <span className="mflow-ltv-chip" title={t.PermissionsMethodAssumption || ''}>role({t.PermissionsGroup})</span>}
                  {t.RequireElectronicSignature && <span className="mflow-ltv-chip">e-sign</span>}
                  {t.VBScriptName && <span className="mflow-ltv-chip" title={t.VBScriptBody ? 'body found' : 'UNRESOLVED'}>script({t.VBScriptName})</span>}
                  {t.IsSkeleton && <span className="mflow-ltv-chip mflow-ltv-chip-warn" title={t.SkeletonReason || ''}>skeleton</span>}
                  {t.CriteriaUnconfirmed && <span className="mflow-ltv-chip mflow-ltv-chip-warn">criteria unconfirmed</span>}
                </div>
                <div className="mflow-ltv-trans-rule">{t.RuleApplied}</div>
              </div>
            ))}
          </div>}
    </div>
  );
}

// Real, explicit counts for both categories, always — a clean workflow must
// read as "0 warnings, 0 errors", never as blank or a vague "no issues"
// string, so the number itself is never left implicit (2026-08-25).
function countIssues(issues) {
  let warnings = 0, errors = 0;
  issues.forEach(iss => { if (iss.Severity === 'Error') errors++; else warnings++; });
  return { warnings, errors };
}

function ValidationPlan({ plan }) {
  const issues = plan.ValidationIssues || [];
  const { warnings, errors } = countIssues(issues);
  return (
    <div className="mflow-ltv-validation">
      <div className={`mflow-ltv-status-banner ${plan.IsValid ? 'ok' : 'error'}`}>
        {plan.IsValid ? <CheckCircle2 size={13}/> : <AlertCircle size={13}/>}
        {plan.IsValid ? 'VALID — no blocking errors' : 'INVALID — blocking errors present'}
      </div>
      <div className="mflow-ltv-validation-summary">{warnings} warning{warnings === 1 ? '' : 's'}, {errors} error{errors === 1 ? '' : 's'}</div>
      {issues.length === 0
        ? <div className="mflow-ltv-empty">No validation issues.</div>
        : issues.map((iss, i) => (
            <div key={i} className={`mflow-ltv-issue mflow-ltv-issue-${(iss.Severity || '').toLowerCase()}`}>
              {iss.Severity === 'Error' ? <AlertCircle size={12}/> : <AlertTriangle size={12}/>}
              <div>
                <div className="mflow-ltv-issue-head">[{iss.Severity}] {iss.Code}</div>
                <div className="mflow-ltv-issue-msg">{iss.Message}</div>
                {iss.EdgeRef && <div className="mflow-ltv-issue-edge">{iss.EdgeRef}</div>}
              </div>
            </div>
          ))}
    </div>
  );
}

export default function LiveTranslationView({ plan, error, isTranslating, version, hoveredStateKey, realLayoutByName, onForceRefresh }) {
  // 'diagram' is the default — the new M-Files Diagram tab replaces
  // Flattened as the first thing shown when the panel appears. Flattened
  // itself is untouched, just no longer first.
  const [view, setView] = useState('diagram');
  // 'default' (real M-Files layout when available, else computed BFS) |
  // 'auto' (dagre, top-to-bottom) | 'wide' (dagre, left-to-right, wide
  // spacing) — a 3-way mode rather than two independent booleans, since
  // Auto-Layout and Wide are mutually exclusive and a boolean pair would
  // allow an invalid "both on" state the UI would have to guard against.
  const [layoutMode, setLayoutMode] = useState('default');
  const tabIssueCounts = plan ? countIssues(plan.ValidationIssues || []) : null;

  return (
    <div className="mflow-ltv">
      <div className="mflow-ltv-head">
        <div className="mflow-ltv-tabs" role="tablist">
          <button type="button" role="tab" aria-selected={view === 'diagram'} className={view === 'diagram' ? 'on' : ''} onClick={() => setView('diagram')}>M-Files Diagram</button>
          <button type="button" role="tab" aria-selected={view === 'flat'} className={view === 'flat' ? 'on' : ''} onClick={() => setView('flat')}>Flattened</button>
          <button type="button" role="tab" aria-selected={view === 'json'} className={view === 'json' ? 'on' : ''} onClick={() => setView('json')}>JSON</button>
          <button type="button" role="tab" aria-selected={view === 'validation'} className={view === 'validation' ? 'on' : ''} onClick={() => setView('validation')}>
            {/* Always explicit — 0/0 must read as zero, not as an absent suffix. */}
            Validation{tabIssueCounts ? ` (${tabIssueCounts.warnings}W ${tabIssueCounts.errors}E)` : ''}
          </button>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {isTranslating && <span className="mflow-ltv-syncing"><RefreshCw size={11} className="mflow-ltv-spin"/> Translating…</span>}
          {view === 'diagram' && (
            <button type="button"
              title={layoutMode === 'auto' ? 'Auto-Layout on (dagre) — click to restore the original layout' : 'Auto-Layout off (original layout) — click to auto-arrange and reduce crossings'}
              style={{
                fontSize: '9.5px', fontFamily: 'var(--mono)', padding: '4px 8px', borderRadius: '3px',
                border: `1px solid ${layoutMode === 'auto' ? 'rgba(74,159,255,.3)' : 'var(--border)'}`,
                background: layoutMode === 'auto' ? 'rgba(74,159,255,.1)' : 'var(--s3)',
                color: layoutMode === 'auto' ? 'var(--a3)' : 'var(--mid)', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '4px', transition: 'all 0.15s'
              }}
              onClick={() => setLayoutMode(m => m === 'auto' ? 'default' : 'auto')}>
              {layoutMode === 'auto' ? <LayoutGrid size={10}/> : <Rows3 size={10}/>}
              Auto-Layout
            </button>
          )}
          {view === 'diagram' && (
            <button type="button"
              title={layoutMode === 'wide' ? 'Wide layout on (dagre, left-to-right) — click to restore the original layout' : 'Wide layout off — click to spread the diagram left-to-right for dense real-world workflows'}
              style={{
                fontSize: '9.5px', fontFamily: 'var(--mono)', padding: '4px 8px', borderRadius: '3px',
                border: `1px solid ${layoutMode === 'wide' ? 'rgba(74,159,255,.3)' : 'var(--border)'}`,
                background: layoutMode === 'wide' ? 'rgba(74,159,255,.1)' : 'var(--s3)',
                color: layoutMode === 'wide' ? 'var(--a3)' : 'var(--mid)', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '4px', transition: 'all 0.15s'
              }}
              onClick={() => setLayoutMode(m => m === 'wide' ? 'default' : 'wide')}>
              <ArrowLeftRight size={10}/>
              Wide Layout
            </button>
          )}
          <button type="button"
            title="Force rebuild translation"
            style={{
              fontSize: '9.5px', fontFamily: 'var(--mono)', padding: '4px 8px', borderRadius: '3px',
              border: '1px solid var(--border)', background: 'var(--s3)', color: 'var(--mid)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '4px', transition: 'all 0.15s'
            }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--text)'; e.currentTarget.style.borderColor = 'var(--a3)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--mid)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
            onClick={onForceRefresh}>
            <RefreshCw size={10} className={isTranslating ? 'mflow-ltv-spin' : ''}/>
            Force Refresh
          </button>
        </div>
      </div>

      {error && <div className="mflow-ltv-error">{error}</div>}

      <div className="mflow-ltv-body">
        {!plan
          ? <div className="mflow-ltv-empty mflow-ltv-empty-root">{error ? 'No plan available.' : 'Add a state to see the translated M-Files plan here.'}</div>
          // Keyed on `version` (bumped once per completed translate call, in
          // MFlowCanvas) — NOT on `view`, so switching tabs doesn't replay the
          // fade, only a genuinely new translation result does.
          : <div key={version} className={view === 'diagram' ? 'mflow-ltv-view-wrap mflow-ltv-fade' : 'mflow-ltv-fade'}>
              {view === 'diagram' && <MFilesDiagramView plan={plan} layoutMode={layoutMode} realLayoutByName={realLayoutByName}/>}
              {view === 'flat' && <FlattenedPlan plan={plan} hoveredStateKey={hoveredStateKey}/>}
              {view === 'json' && <pre className="mflow-ltv-json" dangerouslySetInnerHTML={{__html:highlightJson(plan)}}/>}
              {view === 'validation' && <ValidationPlan plan={plan}/>}
            </div>}
      </div>
    </div>
  );
}
