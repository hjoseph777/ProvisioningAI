import { useEffect, useRef, useState } from 'react';
import { Plus, Minus, Maximize2, Lock, Unlock, List, X, Diamond } from 'lucide-react';
import { useWorkflowStore } from '../store/useWorkflowStore';
import { useMermaid } from '../hooks/useMermaid';
import { gatewayStyleFor, DEFAULT_CANVAS_THEME } from '../utils/canvasThemes';
import { SHAPE_STROKE_WIDTH, SHAPE_FILL_OPACITY, SHAPE_DROP_SHADOW } from '../utils/shapeDesignTokens';
import MFlowPalette from './mflow/MFlowPalette';

// ── M-Files Flow ─────────────────────────────────────────────────
// Clean-slate rebuild, NOT an edit to CommandCenter.jsx (Studio). Shares
// Studio's data (same useWorkflowStore workflows/activeId) but is its own
// component, patterned after BPMN's Process Docs canvas (palette shell)
// while staying Mermaid-based per the user's explicit direction. The
// workflow model stays the minimal State+Transition shape a future
// prompt-to-workflow feature needs to translate cleanly to M-Files' own
// style (see studio_minimal_state_transition_model.md, project memory).
// Comments/status boxes are the one deliberate exception — freestanding
// canvas annotations, explicitly NOT part of the state machine.
//
// Diamond rendering here is a DELIBERATE SIMPLIFICATION of Studio's real
// mechanism, not a faithful port — flagging this so it isn't assumed
// identical later. Studio's applyGatewayDiamonds only promotes a state to a
// diamond when transitions share an explicit `group` field AND that group
// has 2+ distinct source states (a real merge-then-split point) — plain
// branching alone does NOT get a diamond there. M-Files Flow has no UI yet
// for setting `transition.group`, so this canvas uses a simpler rule
// instead: any state with 2+ distinct outgoing transitions gets a diamond.
// This matches what was actually explained to and agreed by the user
// ("a state with 2+ outgoing transitions automatically gets a diamond")
// even though it's not byte-identical to Studio's own logic. Revisit if
// `group`-based hub UI ever gets built for this canvas.

const loadMermaid = () => new Promise(res => {
  if (window.mermaid) return res(window.mermaid);
  const s = document.createElement('script');
  s.src = 'https://cdnjs.cloudflare.com/ajax/libs/mermaid/10.6.1/mermaid.min.js';
  s.onload = () => {
    // Studio's own loadMermaid already ran initialize() with these same
    // options if Studio mounted first — mermaid.initialize is idempotent.
    window.mermaid.initialize({
      startOnLoad: false, theme: 'base', state: { useMaxWidth: false },
      themeVariables: {
        primaryColor: '#3A7FD5', primaryTextColor: '#FFFFFF', primaryBorderColor: '#2A5FA8',
        lineColor: '#3A7FD5', secondaryColor: '#071828', background: '#F8FAFC',
        mainBkg: '#3A7FD5', nodeBorder: '#2A5FA8', edgeLabelBackground: '#071828',
        fontFamily: 'JetBrains Mono,monospace', fontSize: '12px',
      },
    });
    res(window.mermaid);
  };
  document.head.appendChild(s);
});

let renderCounter = 0;

const sanitizeStateId = name => (name || '').trim().replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '');

// Quick preset swatches for the right-click menu's background-color row — named
// colors, not the arbitrary picker (that's still the palette's Style
// section, for anything outside this set).
const PRESET_COLORS = [
  { name: 'Red', hex: '#ef4444' },
  { name: 'Blue', hex: '#3A7FD5' },
  { name: 'Green', hex: '#22c55e' },
  { name: 'Yellow', hex: '#eab308' },
  { name: 'Orange', hex: '#f97316' },
  { name: 'Purple', hex: '#a855f7' },
  { name: 'Gray', hex: '#6b7280' },
  { name: 'Black', hex: '#1e293b' },
];

// Right-angle-only path between two node boxes, single elbow — matches the
// "orthogonal only" routing rule (confirmed with the user, and the same
// convention theme_comparison_mockup.html already established for this
// project: "every connector is now horizontal, vertical, or a single 90°
// elbow bend — no diagonals"). Replaces a plain diagonal M...L... line,
// which is what this used to draw before the user flagged it.
function orthogonalPath(f, t) {
  const dx = t.cx - f.cx, dy = t.cy - f.cy;
  if (Math.abs(dy) >= Math.abs(dx)) {
    const sign = dy >= 0 ? 1 : -1;
    const sy = f.cy + sign * f.hh, ty = t.cy - sign * t.hh;
    const midY = (sy + ty) / 2;
    return `M ${f.cx} ${sy} L ${f.cx} ${midY} L ${t.cx} ${midY} L ${t.cx} ${ty}`;
  }
  const sign = dx >= 0 ? 1 : -1;
  const sx = f.cx + sign * f.hw, tx = t.cx - sign * t.hw;
  const midX = (sx + tx) / 2;
  return `M ${sx} ${f.cy} L ${midX} ${f.cy} L ${midX} ${t.cy} L ${tx} ${t.cy}`;
}

// Mermaid sizes the SVG's viewBox to fit only its own auto-computed layout —
// anything dragged past that box's edge gets clipped (invisible, or a chunk
// of the diagram vanishes), since SVG hides content outside its viewBox by
// default. This was missing from this canvas's drag handler entirely (Studio
// has the equivalent, this file never ported it) — that's the actual bug
// behind "part of the workflow disappears when you drag." Expands (never
// shrinks) the viewBox so a point stays inside with headroom to spare; call
// on every drag move that could cross the current boundary.
function growViewBoxToFit(svg, x, y, zoom, pad = 60) {
  const vb = svg.viewBox.baseVal;
  let [minX, minY, w, h] = [vb.x, vb.y, vb.width, vb.height];
  let changed = false;
  if (x - pad < minX) { const d = minX - (x - pad); minX -= d; w += d; changed = true; }
  if (y - pad < minY) { const d = minY - (y - pad); minY -= d; h += d; changed = true; }
  if (x + pad > minX + w) { w = (x + pad) - minX; changed = true; }
  if (y + pad > minY + h) { h = (y + pad) - minY; changed = true; }
  if (changed) {
    svg.setAttribute('viewBox', `${minX} ${minY} ${w} ${h}`);
    // Keep on-screen zoom visually correct — width in CSS px was sized off
    // the ORIGINAL viewBox width (svg.dataset.baseWidth), so growing the
    // viewBox without updating that reference would silently shrink
    // everything else on screen relative to the new, larger canvas.
    svg.dataset.baseWidth = w;
    svg.style.width = `${w * zoom}px`;
  }
}

// Collapsible section header for the table panel — reuses Studio's own
// `.cc-sec*` CSS classes directly (same "don't reinvent the wheel"
// reasoning as `.bpmn-context-menu`/`.inline-mini`: pure generic chrome,
// no coupling to Studio's own component/state). Not importing Studio's
// own `Sec` function since it isn't exported and this is small enough to
// duplicate correctly.
function Sec({ icon, title, count, isOpen, onToggle, onAdd, children }) {
  return (
    <div className="cc-sec">
      <div className="cc-sec-hd" onClick={onToggle}>
        <span className={`cc-sec-chev ${isOpen ? 'open' : ''}`}>▶</span>
        <span className="cc-sec-icon">{icon}</span>
        <span className="cc-sec-title">{title}</span>
        <span className="cc-sec-count">{count} rows</span>
        {onAdd && <button className="cc-sec-add" onClick={e => { e.stopPropagation(); onAdd(); }}>+ Add</button>}
      </div>
      {isOpen && <div>{children || <div style={{ padding: '6px 12px 8px', fontSize: 9, color: 'var(--dim)', fontStyle: 'italic' }}>No {title.toLowerCase()} yet{onAdd ? ' — click + Add' : ''}</div>}</div>}
    </div>
  );
}

export default function MFlowCanvas() {
  const getActive = useWorkflowStore(s => s.getActive);
  const activeId = useWorkflowStore(s => s.activeId);
  const addState = useWorkflowStore(s => s.addState);
  const updateState = useWorkflowStore(s => s.updateState);
  const updateStatePosition = useWorkflowStore(s => s.updateStatePosition);
  const renameState = useWorkflowStore(s => s.renameState);
  const duplicateState = useWorkflowStore(s => s.duplicateState);
  const deleteState = useWorkflowStore(s => s.deleteState);
  const addComment = useWorkflowStore(s => s.addComment);
  const updateComment = useWorkflowStore(s => s.updateComment);
  const deleteComment = useWorkflowStore(s => s.deleteComment);
  const clearWorkflow = useWorkflowStore(s => s.clearWorkflow);
  const workflows = useWorkflowStore(s => s.workflows); // subscribed so this re-renders when states/transitions/comments change
  // Users/Properties/Business Rules are GLOBAL in this store (not scoped to
  // one workflow — same as Studio), so no `wf`/`activeId` needed for these.
  // Unlike states, these have no other home in M-Files Flow at all (no
  // canvas representation, no palette tile) — the table panel is their
  // only editing surface here, so it's fully editable, not read-only like
  // the States/Transitions reference view.
  const users = useWorkflowStore(s => s.users);
  const addUser = useWorkflowStore(s => s.addUser);
  const updateUser = useWorkflowStore(s => s.updateUser);
  const deleteUser = useWorkflowStore(s => s.deleteUser);
  const properties = useWorkflowStore(s => s.properties);
  const addProperty = useWorkflowStore(s => s.addProperty);
  const updateProperty = useWorkflowStore(s => s.updateProperty);
  const deleteProperty = useWorkflowStore(s => s.deleteProperty);
  const rules = useWorkflowStore(s => s.rules);
  const addRule = useWorkflowStore(s => s.addRule);
  const updateRule = useWorkflowStore(s => s.updateRule);
  const deleteRule = useWorkflowStore(s => s.deleteRule);
  const takeSnapshot = useWorkflowStore(s => s.takeSnapshot);
  const undo = useWorkflowStore(s => s.undo);
  const redo = useWorkflowStore(s => s.redo);
  // Subscribed directly (not via canUndo()/canRedo() functions) so the menu
  // items' disabled state actually re-renders when history changes — same
  // reasoning useBpmnStore.js's own history subscription uses.
  const history = useWorkflowStore(s => s.history);
  const canUndo = history.past.length > 0;
  const canRedo = history.future.length > 0;

  const wf = getActive();
  const mermaidStr = useMermaid(wf);
  const diagRef = useRef(null);
  const layoutRef = useRef({}); // id -> {el,cx,cy,hw,hh} — rebuilt every render, read by drag handlers
  // Free-pan offset — NOT native scroll. A scroll-based pan only moves
  // anything when the diagram is bigger than its container, which is rarely
  // true since it auto-fits by default — dragging would correctly do
  // nothing in that case, which read as "the hand isn't moving the canvas."
  // BPMN's React Flow canvas pans freely regardless of content size; this
  // matches that by translating the SVG directly instead of scrolling.
  const panRef = useRef({ x: 0, y: 0 });
  // Multi-select set of state NAMES (not ids) — matches every other lookup
  // in this file, which already keys off the Mermaid-rendered label.
  const [selected, setSelected] = useState(new Set());
  const selectedRef = useRef(selected); // read inside DOM event handlers (right-click), same reasoning as lockedRef
  selectedRef.current = selected;
  const [contextMenu, setContextMenu] = useState(null); // {x,y,type:'node'|'canvas',stateId,name}
  const [palettePinned, setPalettePinned] = useState(false);
  // Live states/transitions table — the canvas is the only view of this
  // data otherwise (no JSON/Stats view like Studio has); collapsed by
  // default to keep the canvas-first feel, expand-on-demand via the
  // toolbar toggle, per the user's own "a tab to expand it and hide" idea.
  const [tablePanelOpen, setTablePanelOpen] = useState(false);
  // Per-section collapse state within the table panel — states/transitions
  // start open (the primary content), Users/Properties/Business Rules
  // start closed (secondary, global-not-per-workflow data), matching a
  // reasonable "start focused" default rather than a wall of empty tables.
  const [openSections, setOpenSections] = useState({ states: true, transitions: true, users: false, properties: false, rules: false });
  const toggleSection = key => setOpenSections(s => ({ ...s, [key]: !s[key] }));
  const [commentColor, setCommentColor] = useState('#e07b1a');
  const [stateColor, setStateColor] = useState('#3A7FD5');
  const [zoom, setZoom] = useState(1);
  const [locked, setLocked] = useState(false);
  const lockedRef = useRef(locked); // read inside DOM event handlers, which close over the render that created them
  lockedRef.current = locked;
  const zoomRef = useRef(1); // read inside the drag handler, for growViewBoxToFit's CSS-width math
  zoomRef.current = zoom;

  useEffect(() => { setSelected(new Set()); setContextMenu(null); }, [activeId]);

  // Ctrl/Cmd+A — select every named state. Skipped while focus is in a real
  // text field (comment textarea, filter inputs elsewhere in the app) so it
  // doesn't hijack normal text select-all.
  useEffect(() => {
    const onKeyDown = e => {
      const tag = document.activeElement?.tagName;
      const inField = tag === 'INPUT' || tag === 'TEXTAREA';
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') {
        if (inField) return;
        e.preventDefault();
        setSelected(new Set((wf?.states || []).map(s => s.name).filter(Boolean)));
      }
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'z') {
        if (inField) return; // let the browser's own text-undo happen in real fields
        e.preventDefault(); undo();
      }
      if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'y' || (e.shiftKey && e.key.toLowerCase() === 'z'))) {
        if (inField) return;
        e.preventDefault(); redo();
      }
      if (e.key === 'Escape') { setSelected(new Set()); setContextMenu(null); }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [wf]);

  // Close the context menu on any click elsewhere.
  useEffect(() => {
    if (!contextMenu) return;
    const close = () => setContextMenu(null);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [contextMenu]);

  // Applies `zoom` to whatever SVG is currently rendered, independent of the
  // full render effect — so +/- buttons don't need to re-run mermaid.render().
  // baseWidth/baseHeight (the diagram's natural, unscaled size) are stashed
  // on the svg's dataset the first time it's built, in the main effect below.
  useEffect(() => {
    const svgEl = diagRef.current?.querySelector('svg'); if (!svgEl) return;
    const baseWidth = parseFloat(svgEl.dataset.baseWidth); if (!baseWidth) return;
    svgEl.style.width = `${baseWidth * zoom}px`;
  }, [zoom, mermaidStr]);

  // Click-drag empty canvas to pan — free transform on the SVG itself, NOT
  // native scroll (see panRef's own comment for why scroll doesn't work
  // here). Always pannable regardless of whether the diagram is bigger or
  // smaller than the container, matching BPMN's canvas.
  //
  // Compared directly against Process Docs (BPMN) per the user's request —
  // that canvas is the point of truth, left untouched, this file changed
  // to get closer to its feel. BPMN uses React Flow's own native
  // `panOnDrag`/`zoomOnScroll` props (`BpmnCanvas.jsx`), i.e. D3-zoom's
  // built-in drag behavior: it engages the instant the pointer moves, no
  // dead zone. This file's own threshold was 5px, an intentional-but-
  // noticeable delay before panning kicked in. Reduced to 1px — enough to
  // still tell a genuine zero-movement click from a drag (click-to-
  // deselect is a separate React `onClick` handler, unaffected either
  // way), but no longer a perceptible lag.
  useEffect(() => {
    const el = diagRef.current; if (!el) return;
    const PAN_THRESHOLD = 1;
    const onMouseDown = e => {
      if (e.target.closest('.node') || e.button !== 0) return;
      const svgEl = el.querySelector('svg'); if (!svgEl) return;
      const startX = e.clientX, startY = e.clientY;
      const startPan = { ...panRef.current };
      let panning = false;
      const onMove = ev => {
        const dx = ev.clientX - startX, dy = ev.clientY - startY;
        if (!panning && Math.hypot(dx, dy) > PAN_THRESHOLD) { panning = true; el.classList.add('panning'); }
        if (!panning) return;
        panRef.current = { x: startPan.x + dx, y: startPan.y + dy };
        svgEl.style.transform = `translate3d(${panRef.current.x}px, ${panRef.current.y}px, 0)`;
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
  }, [mermaidStr]);

  // Scroll-wheel zoom — BPMN's canvas has this via React Flow's
  // `zoomOnScroll` prop; this canvas had no scroll-wheel handling at all
  // (hovering and scrolling did nothing, a real felt gap next to BPMN).
  // `{ passive: false }` is required to call preventDefault() on wheel.
  useEffect(() => {
    const el = diagRef.current; if (!el) return;
    const onWheel = e => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      setZoom(z => Math.min(3, Math.max(0.2, +(z + delta).toFixed(2))));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [mermaidStr]);

  // Selection highlight — the diagram itself gave no visual feedback for
  // selection before (only the status-line text changed), which read as
  // "selecting does nothing." Runs on every mermaidStr/selected change since
  // a fresh mermaidStr render replaces the SVG wholesale (clearing any
  // previous highlight) and a selection change needs to move the highlight
  // without waiting for an unrelated re-render.
  useEffect(() => {
    const svgEl = diagRef.current?.querySelector('svg'); if (!svgEl) return;
    svgEl.querySelectorAll('.node').forEach(n => {
      const lbl = n.querySelector('.nodeLabel,text,span')?.textContent?.trim() || '';
      const shape = n.querySelector('rect,circle,polygon');
      if (!shape) return;
      if (lbl && selected.has(lbl)) {
        shape.style.stroke = '#4A9FFF'; shape.style.strokeWidth = '3';
        n.style.filter = 'drop-shadow(0 0 7px rgba(74,159,255,.8))';
      } else {
        shape.style.stroke = ''; shape.style.strokeWidth = ''; n.style.filter = '';
      }
    });
  }, [selected, mermaidStr]);

  useEffect(() => {
    if (!mermaidStr) {
      if (diagRef.current) diagRef.current.innerHTML = '';
      return;
    }
    let dead = false;
    (async () => {
      const m = await loadMermaid();
      renderCounter++;
      const id = `mflow${renderCounter}`;
      try {
        const { svg } = await m.render(id, mermaidStr);
        if (dead || !diagRef.current) return;
        diagRef.current.innerHTML = svg;
        const svgEl = diagRef.current.querySelector('svg');
        if (!svgEl) return;
        svgEl.removeAttribute('width'); svgEl.removeAttribute('height'); svgEl.style.maxWidth = 'none';
        // Every fresh render creates a brand-new svg element with no
        // transform of its own — reapply whatever pan offset was already
        // in place so a re-render (e.g. from renaming a state) doesn't
        // silently snap the view back to center.
        svgEl.style.transform = `translate3d(${panRef.current.x}px, ${panRef.current.y}px, 0)`;

        // Arrowhead markers were resolving to fill:white (Mermaid's scoped
        // theme CSS not landing the color this render pipeline expects) —
        // invisible against this canvas's light diagram background. Force
        // a visible, on-theme color directly rather than chasing Mermaid's
        // own CSS scoping.
        svgEl.querySelectorAll('marker path').forEach(mp => mp.setAttribute('fill', '#2A5FA8'));

        // ── Fit-to-view — the diagram was rendering at Mermaid's natural
        // size with no scale constraint at all, so anything bigger than the
        // viewport (most real workflows) left only 1-2 nodes visible without
        // manual scrolling, and made drag/click targets land off-screen.
        // Stash the natural size once, then compute a scale that fits the
        // current container on first paint — same role Studio's zoom/
        // auto-arrange combo plays, simplified to "always fit on load." ──
        const vb = svgEl.viewBox?.baseVal;
        const naturalW = vb?.width || svgEl.getBBox().width || 800;
        const naturalH = vb?.height || svgEl.getBBox().height || 600;
        svgEl.dataset.baseWidth = String(naturalW);
        svgEl.dataset.baseHeight = String(naturalH);
        const containerEl = diagRef.current.parentElement;
        const availW = (containerEl?.clientWidth || naturalW) - 60;
        const availH = (containerEl?.clientHeight || naturalH) - 60;
        const fitScale = Math.min(1, availW / naturalW, availH / naturalH);
        svgEl.style.width = `${naturalW * fitScale}px`;
        setZoom(fitScale);

        // ── Diamond rendering (simplified — see file header) ──
        const outCount = {};
        wf.transitions.forEach(t => { const f = (t.from || '').trim(); if (f) outCount[f] = (outCount[f] || 0) + 1; });
        const style = gatewayStyleFor(DEFAULT_CANVAS_THEME, 'decision') || { fill: '#eef0ff', stroke: '#7c8cff' };
        // Sized to fit a real two-word state name (e.g. "Under Review") at
        // the diamond's widest point, not Studio's icon-only 20x20 — this
        // canvas keeps the state's own label as the diamond's label
        // (there's no separate hub node here, see the file header), so it
        // needs real room for text, not just an icon.
        const HW = 46, HH = 34;
        svgEl.querySelectorAll('.node').forEach(n => {
          const lbl = n.querySelector('.nodeLabel,text,span')?.textContent?.trim() || '';
          if ((outCount[lbl] || 0) < 2) return;
          const rect = n.querySelector('rect'); if (!rect) return;
          const poly = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
          poly.setAttribute('points', `0,${-HH} ${HW},0 0,${HH} ${-HW},0`);
          poly.setAttribute('fill', style.fill);
          poly.setAttribute('fill-opacity', String(SHAPE_FILL_OPACITY));
          poly.setAttribute('stroke', style.stroke);
          poly.setAttribute('stroke-width', String(SHAPE_STROKE_WIDTH));
          poly.style.filter = SHAPE_DROP_SHADOW;
          rect.replaceWith(poly);
          n.querySelectorAll('.nodeLabel,text').forEach(t => { t.style.fontSize = '9px'; });
          n.dataset.gwHw = String(HW); n.dataset.gwHh = String(HH);
        });

        // ── Resolve every edge's real fromId/toId geometrically (Mermaid's
        // path order isn't guaranteed to match the source text order) ──
        const nodeCenters = {};
        svgEl.querySelectorAll('.node').forEach(n => {
          const lbl = n.querySelector('.nodeLabel,text,span')?.textContent?.trim() || ''; if (!lbl) return;
          const id = sanitizeStateId(lbl);
          const rectOrPoly = n.querySelector('rect, polygon');
          const bbox = rectOrPoly?.getBBox?.() ?? { width: 80, height: 30 };
          const hw = n.dataset.gwHw ? parseFloat(n.dataset.gwHw) : bbox.width / 2;
          const hh = n.dataset.gwHh ? parseFloat(n.dataset.gwHh) : bbox.height / 2;
          const mt = /translate\(\s*([-\d.]+)[,\s]+([-\d.]+)\s*\)/.exec(n.getAttribute('transform') || '');
          nodeCenters[id] = { el: n, cx: mt ? parseFloat(mt[1]) : 0, cy: mt ? parseFloat(mt[2]) : 0, hw, hh };
        });
        const screenCenters = Object.entries(nodeCenters).map(([id, c]) => {
          const r = c.el.getBoundingClientRect();
          return { id, cx: r.left + r.width / 2, cy: r.top + r.height / 2 };
        });
        const nearest = (x, y) => {
          let best = null, bestD = Infinity;
          screenCenters.forEach(c => { const d = (c.cx - x) ** 2 + (c.cy - y) ** 2; if (d < bestD) { bestD = d; best = c.id; } });
          return best;
        };
        const edgeList = [];
        svgEl.querySelectorAll('path.transition').forEach(p => {
          const len = p.getTotalLength(); if (len < 1) return;
          const s0 = p.getPointAtLength(len * 0.05), s1 = p.getPointAtLength(len * 0.95);
          const ctm = p.getScreenCTM();
          const toScreen = pt => { const sp = svgEl.createSVGPoint(); sp.x = pt.x; sp.y = pt.y; return ctm ? sp.matrixTransform(ctm) : sp; };
          const a = toScreen(s0), b = toScreen(s1);
          const fromId = nearest(a.x, a.y), toId = nearest(b.x, b.y);
          if (!fromId || !toId || fromId === toId) return;
          edgeList.push({ path: p, fromId, toId });
        });

        // ── Apply any stored manual positions, then redraw every edge to match ──
        // Every fresh render starts from Mermaid's own natural viewBox, which
        // has no idea about stored positions from a previous drag — without
        // re-growing it here too, a node dragged outside that box would only
        // stay visible for the live drag frames and vanish again the instant
        // the position-update at drag-end triggers this re-render (the actual
        // bug behind "part of the workflow disappears when you drag").
        wf.states.forEach(st => {
          const id = sanitizeStateId(st.name);
          const c = nodeCenters[id]; if (!c) return;
          if (st.x != null && st.y != null) {
            c.cx = st.x; c.cy = st.y;
            c.el.setAttribute('transform', `translate(${c.cx},${c.cy})`);
            growViewBoxToFit(svgEl, c.cx, c.cy, zoomRef.current);
          }
        });
        const redrawEdge = ({ path, fromId, toId }) => {
          const f = nodeCenters[fromId], t = nodeCenters[toId]; if (!f || !t) return;
          path.setAttribute('d', orthogonalPath(f, t));
        };
        edgeList.forEach(redrawEdge);

        layoutRef.current = { nodeCenters, edgeList, redrawEdge };

        // ── Click-to-select + drag-to-reposition ──
        svgEl.querySelectorAll('.node').forEach(n => {
          n.style.cursor = 'grab';
          const lbl = n.querySelector('.nodeLabel,text,span')?.textContent?.trim() || '';
          const stId = sanitizeStateId(lbl);

          n.onclick = e => {
            e.stopPropagation();
            if (!lbl) return;
            if (e.ctrlKey || e.metaKey || e.shiftKey) {
              setSelected(prev => {
                const next = new Set(prev);
                next.has(lbl) ? next.delete(lbl) : next.add(lbl);
                return next;
              });
            } else {
              setSelected(new Set([lbl]));
            }
          };

          // Right-click selects (if not already part of a multi-selection —
          // same convention BPMN's own node context menu uses: right-clicking
          // a node that's already selected keeps the whole selection, so
          // Duplicate/Delete act on all of it) and opens the menu.
          n.oncontextmenu = e => {
            e.preventDefault(); e.stopPropagation();
            if (!lbl) return;
            if (!selectedRef.current.has(lbl)) setSelected(new Set([lbl]));
            setContextMenu({ x: e.clientX, y: e.clientY, type: 'node', name: lbl });
          };

          n.onmousedown = e => {
            e.stopPropagation();
            if (lockedRef.current) return; // canvas locked — selection still works via onclick, dragging doesn't
            const startClientX = e.clientX, startClientY = e.clientY;
            // Group drag — matches BPMN's own established convention
            // ("Select all — then drag any of them to move the whole
            // workflow"), which this canvas never had at all before: if the
            // dragged node is part of a multi-selection, every selected
            // node moves together, not just the one under the cursor.
            const groupIds = (selectedRef.current.has(lbl) && selectedRef.current.size > 1)
              ? [...selectedRef.current].map(sanitizeStateId)
              : [stId];
            const infos = groupIds
              .map(id => ({ id, info: layoutRef.current.nodeCenters[id] }))
              .filter(x => x.info)
              .map(x => ({ ...x, startCx: x.info.cx, startCy: x.info.cy }));
            if (!infos.length) return;
            let dragging = false;
            const toUserDelta = (dxScreen, dyScreen) => {
              const ctm = svgEl.getScreenCTM();
              if (!ctm) return { dx: dxScreen, dy: dyScreen };
              return { dx: dxScreen / ctm.a, dy: dyScreen / ctm.d };
            };
            const onMove = ev => {
              const dxS = ev.clientX - startClientX, dyS = ev.clientY - startClientY;
              // Snapshot once, right as a real drag begins (not on every
              // move frame, which would flood history — same reasoning
              // useBpmnStore.js's own onNodeDragStart snapshot uses).
              if (!dragging && Math.hypot(dxS, dyS) > 4) { dragging = true; n.style.cursor = 'grabbing'; takeSnapshot(); }
              if (!dragging) return;
              const { dx, dy } = toUserDelta(dxS, dyS);
              const touchedIds = new Set();
              infos.forEach(({ id, info, startCx, startCy }) => {
                info.cx = startCx + dx; info.cy = startCy + dy;
                growViewBoxToFit(svgEl, info.cx, info.cy, zoomRef.current);
                info.el.setAttribute('transform', `translate(${info.cx},${info.cy})`);
                touchedIds.add(id);
              });
              layoutRef.current.edgeList.forEach(e => { if (touchedIds.has(e.fromId) || touchedIds.has(e.toId)) layoutRef.current.redrawEdge(e); });
            };
            const onUp = () => {
              document.removeEventListener('mousemove', onMove);
              document.removeEventListener('mouseup', onUp);
              n.style.cursor = 'grab';
              if (dragging) {
                infos.forEach(({ id, info }) => {
                  const st = wf.states.find(s => sanitizeStateId(s.name) === id);
                  if (st) updateStatePosition(activeId, st.id, info.cx, info.cy);
                });
              }
            };
            document.addEventListener('mousemove', onMove);
            document.addEventListener('mouseup', onUp);
          };
        });
      } catch { if (!dead && diagRef.current) diagRef.current.innerHTML = '<div style="color:var(--red);font-size:11px;padding:16px">Diagram error</div>'; }
    })();
    return () => { dead = true; };
  }, [mermaidStr, wf?.states, activeId, updateStatePosition, takeSnapshot]);

  // New states need a real default name, not blank — a blank-named state is
  // deliberately invisible in the diagram (useMermaid.js: `if (!name)
  // return`, matching Studio's own "+ Add" convention), which from the
  // palette read as "clicking State does nothing," unlike Status (comments
  // have no such exclusion). Matches BPMN's own palette convention instead
  // (`addTask` labels a fresh node "New task" immediately, never blank).
  // Names are the lookup key everywhere in this shared data model (Mermaid
  // rendering, selection, transitions), so this has to be unique or two
  // same-named states would collide.
  const uniqueStateName = base => {
    const existing = new Set((wf?.states || []).map(s => s.name));
    if (!existing.has(base)) return base;
    let n = 2;
    while (existing.has(`${base} ${n}`)) n++;
    return `${base} ${n}`;
  };

  const selectedState = selected.size === 1 ? wf?.states.find(s => s.name === [...selected][0]) : null;

  // Live states list for the palette's Layers section — same "2+ outgoing"
  // diamond rule and collapse/promote wording as the table panel's badge
  // (MfilesProperties.md §3.5 Decision 3), computed independently here since
  // this task's own scope is the palette list, not a refactor of the
  // already-working table code.
  const statesWithMeta = (wf?.states || []).map(s => {
    const outgoing = s.name ? wf.transitions.filter(t => t.from === s.name).length : 0;
    const inbound = s.name ? wf.transitions.filter(t => t.to === s.name).length : 0;
    const isDiamond = outgoing >= 2;
    const diamondTitle = isDiamond
      ? (inbound === 1
          ? 'Single inbound → this diamond will collapse. Its branches become direct transitions of this state — no new state is created.'
          : 'Multiple inbound → this diamond will promote to a real, separate state in the final workflow.')
      : '';
    return { ...s, isDiamond, diamondTitle };
  });

  // Palette "Layers" list click — select (same `selected` Set the table panel
  // and diagram-click already share, so highlighting stays in sync everywhere)
  // and pan the canvas so the node's real on-screen center lands on the
  // viewport's center, same DOM-lookup-by-label-text approach the selection-
  // highlight effect above already uses. Studio's own table has no pan/center
  // behavior (checked — CommandCenter.jsx's row click only calls setSel, no
  // scroll/pan of the diagram itself), so there's no established pattern to
  // match here; this is new, scoped to what this task asked for.
  const panToState = (name) => {
    if (!name) return;
    setSelected(new Set([name]));
    const containerEl = diagRef.current;
    const svgEl = containerEl?.querySelector('svg');
    if (!containerEl || !svgEl) return;
    let target = null;
    svgEl.querySelectorAll('.node').forEach(n => {
      const lbl = n.querySelector('.nodeLabel,text,span')?.textContent?.trim() || '';
      if (lbl === name) target = n;
    });
    if (!target) return;
    const nodeRect = target.getBoundingClientRect();
    const containerRect = containerEl.getBoundingClientRect();
    const dx = (containerRect.left + containerRect.width / 2) - (nodeRect.left + nodeRect.width / 2);
    const dy = (containerRect.top + containerRect.height / 2) - (nodeRect.top + nodeRect.height / 2);
    panRef.current = { x: panRef.current.x + dx, y: panRef.current.y + dy };
    svgEl.style.transform = `translate3d(${panRef.current.x}px, ${panRef.current.y}px, 0)`;
  };

  // ── Context menu actions — Edit/Duplicate/Delete act on the whole current
  // selection when it has more than one member (matching BPMN's own node
  // context menu convention), not just the single right-clicked node. ──
  const contextMenuNames = contextMenu?.type === 'node'
    ? (selected.size > 1 ? [...selected] : [contextMenu.name])
    : [];
  const handleEditSelected = () => {
    if (!wf || contextMenuNames.length !== 1) { setContextMenu(null); return; }
    const st = wf.states.find(s => s.name === contextMenuNames[0]);
    setContextMenu(null);
    if (!st) return;
    const next = window.prompt('Rename state:', st.name);
    if (next != null && next.trim() && next.trim() !== st.name) { takeSnapshot(); renameState(activeId, st.id, next.trim()); }
  };
  const handleDuplicateSelected = () => {
    if (!wf) { setContextMenu(null); return; }
    takeSnapshot();
    const newIds = [];
    contextMenuNames.forEach(name => {
      const st = wf.states.find(s => s.name === name);
      if (st) { const id = duplicateState(activeId, st.id); if (id) newIds.push(id); }
    });
    setContextMenu(null);
  };
  const handleDeleteSelected = () => {
    if (!wf) { setContextMenu(null); return; }
    takeSnapshot();
    const errors = [];
    contextMenuNames.forEach(name => {
      const st = wf.states.find(s => s.name === name);
      if (!st) return;
      const r = deleteState(activeId, st.id);
      if (!r?.ok) errors.push(r?.error);
    });
    setContextMenu(null);
    setSelected(new Set());
    if (errors.length) window.alert(errors.join('\n'));
  };
  const handleSelectAll = () => {
    setSelected(new Set((wf?.states || []).map(s => s.name).filter(Boolean)));
    setContextMenu(null);
  };
  // Quick preset swatches on the right-click menu — a faster path than
  // opening the palette's Style section (still there, for arbitrary
  // colors). Applies to the whole current selection, same convention as
  // Duplicate/Delete.
  const handleSetColorSelected = color => {
    if (!wf) { setContextMenu(null); return; }
    takeSnapshot();
    contextMenuNames.forEach(name => {
      const st = wf.states.find(s => s.name === name);
      if (st) updateState(activeId, st.id, { color });
    });
    setContextMenu(null);
  };
  // Same right-click background-color concept as states, applied to a
  // Status/comment box — user's explicit request to keep this consistent
  // rather than comments being the one object type without it.
  const handleSetCommentColorSelected = color => {
    if (contextMenu?.type === 'comment') { takeSnapshot(); updateComment(activeId, contextMenu.commentId, { color }); }
    setContextMenu(null);
  };

  // ── Comment/status-box drag (simple, local — container-relative pixels,
  // not SVG user-space, since these overlay the diagram wrapper directly
  // rather than living inside the SVG). ──
  const startCommentDrag = (e, comment) => {
    e.stopPropagation();
    takeSnapshot();
    const startX = e.clientX, startY = e.clientY, startCx = comment.x, startCy = comment.y;
    const onMove = ev => {
      updateComment(activeId, comment.id, { x: startCx + (ev.clientX - startX), y: startCy + (ev.clientY - startY) });
    };
    const onUp = () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  return (
    <div className="mflow-shell">
      <MFlowPalette
        pinned={palettePinned}
        onTogglePinned={() => setPalettePinned(p => !p)}
        onAddState={() => { if (wf) { takeSnapshot(); addState(activeId, { name: uniqueStateName('New State'), color: stateColor }); } }}
        onAddInitialState={() => { if (wf) { takeSnapshot(); addState(activeId, { name: uniqueStateName('New Initial State'), initial: true, color: stateColor }); } }}
        onAddEndState={() => { if (wf) { takeSnapshot(); addState(activeId, { name: uniqueStateName('New End State'), terminal: true, color: stateColor }); } }}
        onAddComment={() => { if (wf) { takeSnapshot(); addComment(activeId, undefined, commentColor); } }}
        stateColor={stateColor}
        onSetStateDefaultColor={setStateColor}
        selectedState={selectedState}
        onSetStateColor={(stateId, color) => updateState(activeId, stateId, { color })}
        commentColor={commentColor}
        onSetCommentColor={setCommentColor}
        states={statesWithMeta}
        selectedNames={selected}
        onSelectState={panToState}
      />
      <div className="mflow-canvas-area" onClick={() => setSelected(new Set())}
        onContextMenu={e => { e.preventDefault(); setContextMenu({ x: e.clientX, y: e.clientY, type: 'canvas' }); }}>
        <div className="mflow-status-line">
          <span>
            {selected.size > 1 ? `${selected.size} states selected`
              : selected.size === 1 ? `State — ${[...selected][0]}`
              : wf ? wf.name : 'No workflow'}
          </span>
          <div className="mflow-view-controls" role="group" aria-label="Canvas view controls">
            <button type="button" onClick={e => { e.stopPropagation(); setZoom(z => Math.max(0.2, +(z - 0.15).toFixed(2))); }} title="Zoom out">
              <Minus size={12}/>
            </button>
            <button type="button" onClick={e => { e.stopPropagation(); setZoom(z => Math.min(3, +(z + 0.15).toFixed(2))); }} title="Zoom in">
              <Plus size={12}/>
            </button>
            <button type="button" onClick={e => {
              e.stopPropagation();
              const svgEl = diagRef.current?.querySelector('svg'); if (!svgEl) return;
              const baseWidth = parseFloat(svgEl.dataset.baseWidth), baseHeight = parseFloat(svgEl.dataset.baseHeight);
              const containerEl = diagRef.current.parentElement;
              const availW = (containerEl?.clientWidth || baseWidth) - 60, availH = (containerEl?.clientHeight || baseHeight) - 60;
              setZoom(Math.min(1, availW / baseWidth, availH / baseHeight));
              panRef.current = { x: 0, y: 0 };
              svgEl.style.transform = 'translate3d(0px, 0px, 0)';
            }} title="Fit diagram to view (also recenters pan)">
              <Maximize2 size={12}/> Fit
            </button>
            <button type="button" className={locked ? 'on' : ''} onClick={e => { e.stopPropagation(); setLocked(l => !l); }}
              title={locked ? 'Unlock canvas (allow dragging states)' : 'Lock canvas (prevent accidentally moving states)'}>
              {locked ? <Lock size={12}/> : <Unlock size={12}/>}
            </button>
            <button type="button" className={tablePanelOpen ? 'on' : ''} onClick={e => { e.stopPropagation(); setTablePanelOpen(o => !o); }}
              title={tablePanelOpen ? 'Hide states/transitions list' : 'Show states/transitions list'}>
              <List size={12}/>
            </button>
          </div>
          {wf && (wf.states.length > 0 || wf.transitions.length > 0 || (wf.comments || []).length > 0) && (
            <button type="button" className="mflow-clear-btn"
              onClick={e => { e.stopPropagation(); if (window.confirm(`Clear all states, transitions, and comments from "${wf.name}"?`)) { takeSnapshot(); clearWorkflow(activeId); } }}
              title="Remove every state, transition, and comment from this workflow (undoable)">
              Clear Canvas
            </button>
          )}
        </div>
        {!mermaidStr
          ? <div className="blueprint-empty">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
              <div className="blueprint-title">No Diagram Available</div>
              <div className="blueprint-sub">{wf ? 'Add at least one state and mark it Initial from the palette to begin.' : 'Select or create a workflow in Studio\'s tab strip first — this canvas shares the same workflows.'}</div>
            </div>
          : <div className="mflow-diagram" ref={diagRef} onClick={e => e.stopPropagation()}/>}

        {wf && (wf.comments || []).map(c => (
          <div key={c.id} className="mflow-comment" style={{ left: c.x, top: c.y, borderTopColor: c.color }}
            onClick={e => e.stopPropagation()}
            onContextMenu={e => { e.preventDefault(); e.stopPropagation(); setContextMenu({ x: e.clientX, y: e.clientY, type: 'comment', commentId: c.id }); }}>
            <div className="mflow-comment-head" onMouseDown={e => startCommentDrag(e, c)}>
              <input type="color" value={c.color} onChange={e => updateComment(activeId, c.id, { color: e.target.value })}/>
              <button type="button" className="mflow-comment-del" onClick={() => { takeSnapshot(); deleteComment(activeId, c.id); }} title="Delete">✕</button>
            </div>
            <textarea value={c.text} placeholder="Comment…" onChange={e => updateComment(activeId, c.id, { text: e.target.value })}/>
          </div>
        ))}

        {/* Right-click menu — reuses BPMN's own .bpmn-context-menu chrome
            directly (pure visual shell, not coupled to BPMN's data, so
            sharing the class is safe and avoids re-styling the same box
            twice — per the user's "don't reinvent the wheel" direction). */}
        {contextMenu && (
          <div className="bpmn-context-menu" style={{ left: contextMenu.x, top: contextMenu.y }}
            onClick={e => e.stopPropagation()}>
            {contextMenu.type === 'node' ? (
              <>
                {contextMenuNames.length > 1 && (
                  <div className="bpmn-context-menu-label">{contextMenuNames.length} states</div>
                )}
                {(() => {
                  // Informational/navigation only — never creates anything. The
                  // diamond exists purely because this state already has 2+ real
                  // outgoing transitions (Decision 5); this block just surfaces
                  // that pre-existing, auto-detected fact. Reuses statesWithMeta's
                  // already-computed isDiamond/diamondTitle rather than
                  // recomputing a third time, per the task's own instruction.
                  // Matches BPMN's own precedent (the Detach button) for content
                  // that doesn't apply here — omitted entirely, not shown disabled.
                  if (contextMenuNames.length !== 1) return null;
                  const meta = statesWithMeta.find(s => s.name === contextMenuNames[0]);
                  if (!meta?.isDiamond) return null;
                  const branches = wf.transitions.filter(t => t.from === meta.name);
                  return (
                    <>
                      <div className="bpmn-context-menu-label"><Diamond size={9} className="mflow-diamond-badge"/> Diamond (auto-detected)</div>
                      <div className="mflow-menu-diamond-info">{meta.diamondTitle}</div>
                      {branches.length > 0 && (
                        <>
                          <div className="bpmn-context-menu-label">Branches</div>
                          {branches.map(t => (
                            <button type="button" key={t.id} onClick={() => { panToState(t.to); setContextMenu(null); }}>
                              → {t.to || '(unnamed)'}
                            </button>
                          ))}
                        </>
                      )}
                      <div className="bpmn-context-menu-divider"/>
                    </>
                  );
                })()}
                <button type="button" onClick={handleEditSelected} disabled={contextMenuNames.length !== 1}>✎ Edit</button>
                <button type="button" onClick={handleDuplicateSelected}>⧉ Duplicate</button>
                <div className="bpmn-context-menu-divider"/>
                <div className="bpmn-context-menu-label">Background color</div>
                <div className="mflow-menu-swatches">
                  {PRESET_COLORS.map(({ name, hex }) => (
                    <button type="button" key={hex} className="mflow-menu-swatch" style={{ background: hex }}
                      title={name} onClick={() => handleSetColorSelected(hex)}/>
                  ))}
                  <button type="button" className="mflow-menu-swatch mflow-menu-swatch-clear"
                    title="Clear background color" onClick={() => handleSetColorSelected(null)}>✕</button>
                </div>
                <div className="bpmn-context-menu-divider"/>
                <button type="button" onClick={handleDeleteSelected}>✕ Delete</button>
              </>
            ) : contextMenu.type === 'comment' ? (
              <>
                <div className="bpmn-context-menu-label">Background color</div>
                <div className="mflow-menu-swatches">
                  {PRESET_COLORS.map(({ name, hex }) => (
                    <button type="button" key={hex} className="mflow-menu-swatch" style={{ background: hex }}
                      title={name} onClick={() => handleSetCommentColorSelected(hex)}/>
                  ))}
                </div>
                <div className="bpmn-context-menu-divider"/>
                <button type="button" onClick={() => { takeSnapshot(); deleteComment(activeId, contextMenu.commentId); setContextMenu(null); }}>✕ Delete</button>
              </>
            ) : (
              <button type="button" onClick={handleSelectAll}>Select All</button>
            )}
            <div className="bpmn-context-menu-divider"/>
            <button type="button" onClick={() => { undo(); setContextMenu(null); }} disabled={!canUndo}>↺ Undo</button>
            <button type="button" onClick={() => { redo(); setContextMenu(null); }} disabled={!canRedo}>↻ Redo</button>
          </div>
        )}
      </div>

      {/* Live data panel — mirrors Studio's full left panel (States,
          Transitions, Users, Properties, Business Rules), per the user's
          own screenshot of it and "go for it, do the best implementation
          ever." Reuses Studio's exact chrome directly: `Sec` (this file's
          own copy, see its header comment) for the collapsible headers,
          `.inline-mini` for every table's rows. States/Transitions stay
          READ-ONLY (a reference view — the palette/canvas/right-click menu
          are still the only way to change those); Users/Properties/Rules
          are fully editable here since they have no other home in
          M-Files Flow at all (no canvas representation, no palette tile —
          this table IS their editing surface, same as it is in Studio). */}
      {tablePanelOpen && (
        <div className="mflow-table-panel">
          <div className="mflow-table-panel-head">
            <span>Workflow Data</span>
            <button type="button" onClick={() => setTablePanelOpen(false)} title="Hide"><X size={12}/></button>
          </div>
          <div className="mflow-table-panel-body">
            <Sec icon="○" title="States" count={wf?.states.length || 0} isOpen={openSections.states} onToggle={() => toggleSection('states')}>
              {wf?.states.length > 0 && <table className="inline-mini">
                <thead><tr><th>Name</th><th style={{ width: 20 }}>Initial</th></tr></thead>
                <tbody>
                  {wf.states.map(s => {
                    // Live branching check — mirrors the same "2+ outgoing" rule
                    // this canvas already uses to auto-render a diamond (see file
                    // header comment). Collapse-vs-promote wording matches
                    // MfilesProperties.md §3.5 Decision 3 exactly: the dividing
                    // line is the diamond's own INBOUND edge count, not its
                    // outgoing branches.
                    const outgoing = s.name ? wf.transitions.filter(t => t.from === s.name).length : 0;
                    const inbound = s.name ? wf.transitions.filter(t => t.to === s.name).length : 0;
                    const isDiamond = outgoing >= 2;
                    const diamondTitle = isDiamond
                      ? (inbound === 1
                          ? 'Single inbound → this diamond will collapse. Its branches become direct transitions of this state — no new state is created.'
                          : 'Multiple inbound → this diamond will promote to a real, separate state in the final workflow.')
                      : '';
                    return (
                    <tr key={s.id} className={`mflow-clickable-row ${selected.has(s.name) ? 'sel-row' : ''}`.trim()}
                      onClick={() => s.name && setSelected(new Set([s.name]))}>
                      <td style={{ padding: '4px 6px', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span className="mflow-table-dot" style={{ background: s.color || 'var(--mid)' }}/>
                        {s.name || <em style={{ color: 'var(--dim)' }}>(unnamed)</em>}
                        {isDiamond && <Diamond size={10} className="mflow-diamond-badge" title={diamondTitle}/>}
                      </td>
                      <td style={{ textAlign: 'center' }}>{s.initial ? '●' : ''}</td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>}
            </Sec>

            <Sec icon="→" title="Transitions" count={wf?.transitions.length || 0} isOpen={openSections.transitions} onToggle={() => toggleSection('transitions')}>
              {wf?.transitions.length > 0 && <table className="inline-mini">
                <thead><tr><th>From</th><th>To</th><th title="Read-only — edit in Studio's Transitions table; this view inherits it live via the shared store.">Condition</th></tr></thead>
                <tbody>
                  {wf.transitions.map(t => (
                    <tr key={t.id}>
                      <td style={{ padding: '4px 6px' }}>{t.from || '—'}</td>
                      <td style={{ padding: '4px 6px' }}>{t.to || '—'}</td>
                      <td style={{ padding: '4px 6px', fontSize: 9 }}>{t.conditions || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>}
            </Sec>

            <Sec icon="i" title="Users" count={users.length} isOpen={openSections.users} onToggle={() => toggleSection('users')} onAdd={addUser}>
              {users.length > 0 && <table className="inline-mini">
                <thead><tr><th>Name</th><th>Role</th><th style={{ width: 36 }}>CM</th><th style={{ width: 22 }}/></tr></thead>
                <tbody>{users.map(u => (<tr key={u.id}>
                  <td><input value={u.name} placeholder="Full name…" onChange={e => updateUser(u.id, { name: e.target.value })}/></td>
                  <td><input value={u.role} placeholder="e.g. CEO" onChange={e => updateUser(u.id, { role: e.target.value })}/></td>
                  <td><div className="mini-check"><input type="checkbox" checked={!!u.isCM} onChange={e => updateUser(u.id, { isCM: e.target.checked })}/></div></td>
                  <td><button className="mini-del" onClick={() => deleteUser(u.id)}>✕</button></td>
                </tr>))}</tbody>
              </table>}
            </Sec>

            <Sec icon="=" title="Properties" count={properties.length} isOpen={openSections.properties} onToggle={() => toggleSection('properties')} onAdd={addProperty}>
              {properties.length > 0 && <table className="inline-mini">
                <thead><tr><th>Field Name</th><th style={{ width: 70 }}>Type</th><th style={{ width: 32 }}>Req.</th><th style={{ width: 22 }}/></tr></thead>
                <tbody>{properties.map(p => (<tr key={p.id}>
                  <td><input value={p.name} placeholder="Field name…" onChange={e => updateProperty(p.id, { name: e.target.value })}/></td>
                  <td><select value={p.type} onChange={e => updateProperty(p.id, { type: e.target.value })}>{['Text', 'Integer', 'Decimal', 'Date', 'Lookup', 'Boolean'].map(t => <option key={t}>{t}</option>)}</select></td>
                  <td><div className="mini-check"><input type="checkbox" checked={!!p.required} onChange={e => updateProperty(p.id, { required: e.target.checked })}/></div></td>
                  <td><button className="mini-del" onClick={() => deleteProperty(p.id)}>✕</button></td>
                </tr>))}</tbody>
              </table>}
            </Sec>

            <Sec icon="§" title="Business Rules" count={rules.length} isOpen={openSections.rules} onToggle={() => toggleSection('rules')} onAdd={addRule}>
              {rules.length > 0 && <table className="inline-mini">
                <thead><tr><th>Rule</th><th style={{ width: 22 }}/></tr></thead>
                <tbody>{rules.map(r => (<tr key={r.id}>
                  <td><input value={r.text} placeholder="Business rule…" onChange={e => updateRule(r.id, e.target.value)}/></td>
                  <td><button className="mini-del" onClick={() => deleteRule(r.id)}>✕</button></td>
                </tr>))}</tbody>
              </table>}
            </Sec>
          </div>
        </div>
      )}
    </div>
  );
}
