import { useEffect, useRef, useState } from 'react';
import { Plus, Minus, Maximize2, Lock, Unlock, List, X, Diamond, GitMerge } from 'lucide-react';
import { PanelGroup, Panel, PanelResizeHandle } from 'react-resizable-panels';
import { useWorkflowStore } from '../store/useWorkflowStore';
import { useMermaid } from '../hooks/useMermaid';
import { gatewayStyleFor, DEFAULT_CANVAS_THEME } from '../utils/canvasThemes';
import { SHAPE_STROKE_WIDTH, SHAPE_FILL_OPACITY, SHAPE_DROP_SHADOW } from '../utils/shapeDesignTokens';
import MFlowPalette from './mflow/MFlowPalette';
import LiveTranslationView from './mflow/LiveTranslationView';

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

const getContrastColor = (hex) => {
  if (!hex) return '#ffffff';
  const cleanHex = hex.replace('#', '');
  if (cleanHex.length < 6) {
    if (cleanHex.length === 3) {
      const r = parseInt(cleanHex[0] + cleanHex[0], 16);
      const g = parseInt(cleanHex[1] + cleanHex[1], 16);
      const b = parseInt(cleanHex[2] + cleanHex[2], 16);
      const yiq = (r * 299 + g * 587 + b * 114) / 1000;
      return yiq >= 128 ? '#0f172a' : '#ffffff';
    }
    return '#ffffff';
  }
  const r = parseInt(cleanHex.substring(0, 2), 16);
  const g = parseInt(cleanHex.substring(2, 4), 16);
  const b = parseInt(cleanHex.substring(4, 6), 16);
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 128 ? '#0f172a' : '#ffffff';
};

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
  const addTransition = useWorkflowStore(s => s.addTransition);
  const updateTransition = useWorkflowStore(s => s.updateTransition);
  const deleteTransition = useWorkflowStore(s => s.deleteTransition);
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
  // requireInitial:false — this canvas's palette lets a state exist (State,
  // End State) before any one is marked Initial, and the canvas going blank
  // for that reason read as "hidden," not "empty" (confirmed: only the
  // Initial State tile ever revealed it). Studio's own call to this same
  // hook is untouched, still requires an Initial state by default — see
  // useMermaid.js's own header comment.
  const mermaidStr = useMermaid(wf, { requireInitial: false });
  const translatorMermaidStr = useMermaid(wf, { requireInitial: false, forTranslator: true });
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
  const [contextMenu, setContextMenu] = useState(null); // {x,y,type:'node'|'edge'|'comment'|'canvas',stateId,name,transId,fromName,toName,commentId}
  const [palettePinned, setPalettePinned] = useState(false);
  // Floating multi-select toolbar position, relative to .mflow-canvas-area —
  // built fresh for this canvas (real getBoundingClientRect() over the
  // selected nodes' own <g> elements), NOT a port of BPMN's NodeToolbar/
  // getNodesBounds, which are @xyflow/react-specific and have no equivalent
  // on a Mermaid-rendered SVG with its own hand-rolled pan/zoom transform —
  // same "pattern is reusable, mechanism isn't" conclusion the earlier
  // investigation reached for the magic-connector before drag-to-connect.
  const [toolbarPos, setToolbarPos] = useState(null);
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

  // ── Live translation (split-screen right panel) ──────────────────────
  // Confirmed cadence (recover.md, 2026-08-19 investigation): permanent
  // split-screen, continuous debounce (~300ms after edits stop) triggers a
  // fresh spawn-per-call CLI translation (~250ms) — no persistent warm
  // process. `translationVersion` bumps once per completed call (success OR
  // error) so LiveTranslationView can key its fade-in off a real "new
  // output landed" event rather than every keystroke.
  const [translationPlan, setTranslationPlan] = useState(null);
  const [translationError, setTranslationError] = useState(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [translationVersion, setTranslationVersion] = useState(0);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const translateSeqRef = useRef(0); // guards against an in-flight call's response arriving after a newer edit
  // Step 5, explicitly optional per the task brief — hovering a state on the
  // canvas highlights its block in LiveTranslationView's Flattened view.
  // One-directional only (left canvas -> right panel), as scoped.
  const [hoveredStateKey, setHoveredStateKey] = useState(null);

  useEffect(() => {
    if (!translatorMermaidStr) {
      translateSeqRef.current++; // invalidate any in-flight call — nothing to show it against anymore
      setTranslationPlan(null);
      setTranslationError(null);
      setIsTranslating(false);
      return;
    }
    const timer = setTimeout(() => {
      const seq = ++translateSeqRef.current;
      if (!window.workflowTranslator) {
        setTranslationError('Translator bridge unavailable — run inside Electron, not a plain browser dev session.');
        setTranslationPlan(null);
        setTranslationVersion(v => v + 1);
        return;
      }
      setIsTranslating(true);
      window.workflowTranslator.translate({ mermaid: translatorMermaidStr }).then(res => {
        if (seq !== translateSeqRef.current) return; // superseded by a newer edit — drop this stale response
        setIsTranslating(false);
        if (res?.ok) {
          setTranslationPlan(res.plan);
          setTranslationError(null);
        } else {
          setTranslationError(res?.error || 'Translation failed.');
        }
        setTranslationVersion(v => v + 1);
      });
    }, 300);
    return () => clearTimeout(timer);
  }, [translatorMermaidStr, refreshTrigger]);

  // Recomputes the floating multi-select toolbar's position from real,
  // current DOM state — a bounding box (screen coords, via
  // getBoundingClientRect(), which already accounts for pan/zoom since both
  // are applied as transforms on the rendered <svg>) over every selected
  // node's own <g>, converted to be relative to .mflow-canvas-area (the
  // toolbar's own positioned ancestor, same as the comment boxes). Hides
  // itself below 2 selected, matching BPMN's SelectedNodesToolbar visibility
  // gate exactly. Reads selectedRef (not `selected` directly) so this same
  // function stays correct when called from inside the persistent layout
  // effect's drag/pan handlers, which close over whichever render created
  // them — same reasoning every other *Ref in this file already follows.
  const updateToolbarPos = () => {
    const sel = selectedRef.current;
    const svgEl = diagRef.current?.querySelector('svg');
    const areaEl = diagRef.current?.closest('.mflow-canvas-area');
    if (sel.size < 2 || !svgEl || !areaEl) { setToolbarPos(null); return; }
    const areaRect = areaEl.getBoundingClientRect();
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity, found = false;
    svgEl.querySelectorAll('.node').forEach(n => {
      const lbl = n.querySelector('.nodeLabel,text,span')?.textContent?.trim() || '';
      if (!lbl || !sel.has(lbl)) return;
      found = true;
      const r = n.getBoundingClientRect();
      minX = Math.min(minX, r.left); minY = Math.min(minY, r.top);
      maxX = Math.max(maxX, r.right); maxY = Math.max(maxY, r.bottom);
    });
    if (!found) { setToolbarPos(null); return; }
    setToolbarPos({ left: (minX + maxX) / 2 - areaRect.left, top: minY - areaRect.top - 14 });
  };
  const updateToolbarPosRef = useRef(updateToolbarPos);
  updateToolbarPosRef.current = updateToolbarPos;

  useEffect(() => { setSelected(new Set()); setContextMenu(null); }, [activeId]);

  // Selection change and every fresh diagram render both move/hide the
  // toolbar — a fresh render swaps in a brand-new <svg> with no memory of
  // the previous one's node positions.
  useEffect(() => { updateToolbarPos(); }, [selected, mermaidStr]);

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
    updateToolbarPosRef.current(); // zoom rescales node screen positions
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
        updateToolbarPosRef.current(); // keep the toolbar glued to the selection while panning
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
    // A fresh render swaps in a brand-new svg — the old node's onmouseleave
    // isn't guaranteed to fire on removal, so drop any stale hover rather
    // than risk it sticking to a state that no longer has a live listener.
    setHoveredStateKey(null);
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
        const idToName = {}; // reverse lookup for edge hit-testing below — real states only, never the [*] marker
        let markerIndex = 0;
        svgEl.querySelectorAll('.node').forEach(n => {
          const lbl = n.querySelector('.nodeLabel,text,span')?.textContent?.trim() || '';
          // Real states key on their own sanitized name, same as always.
          // Mermaid's [*] start-marker pseudostate has no label — it used
          // to be skipped here entirely (`if (!lbl) return`), which is
          // exactly why it never moved: excluded from nodeCenters means
          // excluded from nearest()'s candidate list below, so the
          // [*]-->state edge's own fromId resolved to the only OTHER node
          // nearby — usually the state it points at — making fromId===toId
          // and getting silently dropped by that guard, never entering
          // edgeList, never redrawn. A synthetic id keeps it invisible to
          // every real-state lookup (wf.states.forEach below only ever
          // looks up sanitizeStateId(name)) while giving nearest()/
          // redrawEdge a genuine entry to resolve the marker edge against —
          // the same mechanism real states already use correctly, not a
          // new one.
          const id = lbl ? sanitizeStateId(lbl) : `__mflow_marker_${markerIndex++}__`;
          if (lbl) idToName[id] = lbl;
          const rectOrPoly = n.querySelector('rect, polygon');
          // The marker's own shape is a bare <circle>, not a rect/polygon —
          // falling through to the 80x30 default here (as this used to,
          // back when the marker was never tracked at all) would size its
          // connection point far too large for a ~7px dot.
          const bbox = rectOrPoly?.getBBox?.() ?? n.querySelector('circle')?.getBBox?.() ?? { width: 80, height: 30 };
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
        svgEl.querySelectorAll('.edgeLabel').forEach(el => { delete el.dataset.claimedByEdge; });
        const edgeList = [];
        // Each rendered path is matched to its real wf.transitions record by
        // resolved from/to NAME (not id — ids include the synthetic marker
        // id, which never has a name) — tracked with claimedTransIds so two
        // transitions sharing the same from/to pair each still get their own
        // distinct match rather than both resolving to the first one found.
        const claimedTransIds = new Set();
        svgEl.querySelectorAll('path.transition').forEach(p => {
          const len = p.getTotalLength(); if (len < 1) return;
          const s0 = p.getPointAtLength(len * 0.05), s1 = p.getPointAtLength(len * 0.95);
          const ctm = p.getScreenCTM();
          const toScreen = pt => { const sp = svgEl.createSVGPoint(); sp.x = pt.x; sp.y = pt.y; return ctm ? sp.matrixTransform(ctm) : sp; };
          const a = toScreen(s0), b = toScreen(s1);
          const fromId = nearest(a.x, a.y), toId = nearest(b.x, b.y);
          if (!fromId || !toId || fromId === toId) return;
          const fromName = idToName[fromId], toName = idToName[toId];
          const trans = (fromName && toName)
            ? wf.transitions.find(t => t.from === fromName && t.to === toName && !claimedTransIds.has(t.id))
            : undefined;
          if (trans) claimedTransIds.add(trans.id);

          // Right-click hit-testing — a real, invisible, wider-stroke sibling
          // path tracking the same `d`, matching the established precedent
          // for edge hit areas in this codebase (BPMN Standard's own
          // FlowEdge.jsx widens its interaction stroke the same way, since a
          // thin visible line is a poor mouse/Playwright target). Only real
          // transitions get one — the [*] entry marker's own edge has no
          // `trans` to delete, so no hit path, no right-click, nothing to
          // click on there.
          let hitPath = null, startHandle = null, endHandle = null;
          if (trans) {
            hitPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            hitPath.setAttribute('class', 'mflow-edge-hit');
            hitPath.setAttribute('fill', 'none');
            svgEl.appendChild(hitPath);
            hitPath.oncontextmenu = e => {
              e.preventDefault(); e.stopPropagation();
              setContextMenu({ x: e.clientX, y: e.clientY, type: 'edge', transId: trans.id, fromName, toName });
            };

            // Hover visual feedback (subtle glow & pointer cursor)
            hitPath.onmouseenter = () => {
              p.classList.add('mflow-transition-hover');
            };
            hitPath.onmouseleave = () => {
              p.classList.remove('mflow-transition-hover');
            };

            // Native hover tooltip via svg <title> element
            let titleEl = hitPath.querySelector('title');
            if (!titleEl) {
              titleEl = document.createElementNS('http://www.w3.org/2000/svg', 'title');
              hitPath.appendChild(titleEl);
            }
            const nameStr = trans.label ? `Name: ${trans.label}` : 'Unnamed Transition';
            const condStr = trans.conditions ? `\nCondition: ${trans.conditions}` : '';
            const typeStr = `\nType: ${trans.style === 'automatic' ? 'Automatic' : 'Manual'}`;
            titleEl.textContent = `${trans.from} → ${trans.to}\n${nameStr}${typeStr}${condStr}`;

            // Reconnect handles — real, dedicated circles at the edge's own
            // start/end points (not the node handle drag-to-connect already
            // has, which lives on the NODE and only ever creates a brand
            // new transition). Grabbing one of these and dropping on a
            // different state reattaches that end of THIS existing
            // transition instead. Positioned in redrawEdge below, once real
            // start/end points are known.
            startHandle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            startHandle.setAttribute('class', 'mflow-edge-endpoint');
            startHandle.setAttribute('r', '4');
            svgEl.appendChild(startHandle);
            endHandle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            endHandle.setAttribute('class', 'mflow-edge-endpoint');
            endHandle.setAttribute('r', '4');
            svgEl.appendChild(endHandle);
          }
          let labelEl = null;
          const parentG = p.closest('g.edgePath') || p.parentElement;
          if (parentG && parentG.id) {
            labelEl = svgEl.querySelector(`.edgeLabel[id="${parentG.id}"]`) || 
                      svgEl.querySelector(`.edgeLabel#${parentG.id}`) ||
                      svgEl.querySelector(`#${parentG.id}.edgeLabel`);
          }
          if (!labelEl && trans) {
            const labels = svgEl.querySelectorAll('.edgeLabel');
            for (const el of labels) {
              const text = el.textContent?.trim();
              if (text) {
                const cond = trans.conditions || '';
                const lbl = trans.label || '';
                if ((lbl && text.includes(lbl)) || (cond && text.includes(cond))) {
                  if (!el.dataset.claimedByEdge) {
                    el.dataset.claimedByEdge = trans.id;
                    labelEl = el;
                    break;
                  }
                }
              }
            }
          }
          edgeList.push({ path: p, hitPath, startHandle, endHandle, fromId, toId, transId: trans?.id, fromName, toName, labelEl });
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

        // ── Process-group backgrounds — a purely visual region behind every
        // state that currently shares a processGroupId (set via the
        // right-click/toolbar "Group" action, see handleGroupSelected — no
        // new store concept, just a field on each member state's own
        // record). Bounding box is recomputed live from real, current node
        // positions every render, same reasoning the multi-select toolbar's
        // own bounding box already uses — a group never goes stale relative
        // to wherever its members currently sit, including after a drag.
        // Inserted as the very FIRST children of the svg (via insertBefore,
        // not appendChild) so they paint behind every node and edge,
        // deliberately the opposite choice from this file's connect-handle/
        // edge-hit elements, which need to paint ON TOP.
        const groupPad = 32, groupLabelH = 18;
        const byGroup = new Map();
        wf.states.forEach(st => {
          if (!st.processGroupId) return;
          const id = sanitizeStateId(st.name);
          const c = nodeCenters[id]; if (!c) return;
          if (!byGroup.has(st.processGroupId)) byGroup.set(st.processGroupId, { name: st.processGroupName || '', members: [] });
          byGroup.get(st.processGroupId).members.push(c);
        });
        [...byGroup.values()].reverse().forEach(({ name, members }) => {
          if (!members.length) return;
          const minX = Math.min(...members.map(c => c.cx - c.hw)) - groupPad;
          const maxX = Math.max(...members.map(c => c.cx + c.hw)) + groupPad;
          const minY = Math.min(...members.map(c => c.cy - c.hh)) - groupPad - groupLabelH;
          const maxY = Math.max(...members.map(c => c.cy + c.hh)) + groupPad;
          growViewBoxToFit(svgEl, minX, minY, zoomRef.current, 10);
          growViewBoxToFit(svgEl, maxX, maxY, zoomRef.current, 10);
          const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
          rect.setAttribute('x', String(minX)); rect.setAttribute('y', String(minY));
          rect.setAttribute('width', String(maxX - minX)); rect.setAttribute('height', String(maxY - minY));
          rect.setAttribute('rx', '10');
          rect.setAttribute('class', 'mflow-group-bg');
          svgEl.insertBefore(rect, svgEl.firstChild);
          if (name) {
            const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            label.setAttribute('x', String(minX + 10)); label.setAttribute('y', String(minY + groupLabelH));
            label.setAttribute('class', 'mflow-group-label');
            label.textContent = name;
            svgEl.insertBefore(label, svgEl.firstChild.nextSibling);
          }
        });

        const redrawEdge = edge => {
          const { path, hitPath, startHandle, endHandle, fromId, toId, transId, labelEl } = edge;
          const f = nodeCenters[fromId], t = nodeCenters[toId]; if (!f || !t) return;
          const d = orthogonalPath(f, t);
          path.setAttribute('d', d);
          if (hitPath) hitPath.setAttribute('d', d);

          // Apply color and dashing style from store
          const tObj = wf?.transitions.find(x => x.id === transId);
          if (tObj) {
            // Apply Stroke Color (Line Color)
            if (tObj.color) {
              path.style.stroke = tObj.color;
            } else {
              path.style.stroke = '';
            }

            // Apply Label Background Color
            if (tObj.labelColor) {
              const rectEl = labelEl?.querySelector('rect');
              if (rectEl) {
                rectEl.style.fill = tObj.labelColor;
                rectEl.style.stroke = tObj.labelColor;
              }
              const textEl = labelEl?.querySelector('text');
              if (textEl) {
                textEl.style.fill = '#ffffff';
              }
            } else {
              const rectEl = labelEl?.querySelector('rect');
              if (rectEl) {
                rectEl.style.fill = '';
                rectEl.style.stroke = '';
              }
              const textEl = labelEl?.querySelector('text');
              if (textEl) {
                textEl.style.fill = '';
              }
            }

            // Apply Dashing (solid by default, dashed for automatic trigger mode)
            if (tObj.style === 'automatic') {
              path.style.strokeDasharray = '7,5';
            } else {
              path.style.strokeDasharray = '';
            }
          }

          // Real endpoints, read back from the path itself rather than
          // re-deriving from orthogonalPath's own internals — robust to
          // that function's routing changing later. Stashed on the edge
          // object so the reconnect drag below can anchor its live dashed
          // line to "wherever the OTHER end currently is," not a stale value.
          const len = path.getTotalLength();
          if (startHandle && endHandle && len > 0) {
            const sp = path.getPointAtLength(0), ep = path.getPointAtLength(len);
            startHandle.setAttribute('cx', String(sp.x)); startHandle.setAttribute('cy', String(sp.y));
            endHandle.setAttribute('cx', String(ep.x)); endHandle.setAttribute('cy', String(ep.y));
            edge.startPt = sp; edge.endPt = ep;
          }

          // Reposition the floating Mermaid label element to the path midpoint
          if (labelEl && len > 0) {
            const mid = path.getPointAtLength(len / 2);
            labelEl.setAttribute('transform', `translate(${mid.x}, ${mid.y})`);
          }
        };
        edgeList.forEach(redrawEdge);

        // ── Edge reconnect — grab either endpoint of a real transition and
        // drop it on a different state to reattach that end, without
        // deleting and recreating the transition. Distinct from the node
        // handle's drag-to-connect below: that one only ever makes a NEW
        // transition; this one edits an existing one's from/to in place.
        // Built fresh (Mermaid has nothing like React Flow's native
        // reconnectEdge/edgesReconnectable) — checked BPMN Standard's real
        // reconnect first (useBpmnStore.js's reconnectEdge, wired to
        // @xyflow/react's own reconnectEdge() + onReconnect/
        // edgesReconnectable), confirmed it's a React-Flow-only mechanism
        // with no Mermaid equivalent to reuse, same conclusion as
        // drag-to-connect's own check against the magic connector. ──
        const wireEndpointDrag = (edge, endKey) => {
          const handle = edge[endKey === 'from' ? 'startHandle' : 'endHandle'];
          if (!handle) return;
          handle.onmousedown = e => {
            e.stopPropagation(); e.preventDefault();
            if (lockedRef.current) return;
            const fixedPt = endKey === 'from' ? edge.endPt : edge.startPt; // the OTHER end — stays put
            const otherName = endKey === 'from' ? edge.toName : edge.fromName;

            const dragLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            dragLine.setAttribute('class', 'mflow-connect-dragline');
            dragLine.setAttribute('x1', String(fixedPt.x)); dragLine.setAttribute('y1', String(fixedPt.y));
            dragLine.setAttribute('x2', String(fixedPt.x)); dragLine.setAttribute('y2', String(fixedPt.y));
            svgEl.appendChild(dragLine);

            let targetId = null;
            const clearTargetHighlight = id => {
              const t = layoutRef.current.nodeCenters[id];
              const shape = t?.el.querySelector('rect, polygon');
              if (shape) { shape.style.stroke = ''; shape.style.strokeWidth = ''; }
            };
            const setTargetHighlight = id => {
              const t = layoutRef.current.nodeCenters[id];
              const shape = t?.el.querySelector('rect, polygon');
              if (shape) { shape.style.stroke = 'var(--green)'; shape.style.strokeWidth = '3'; }
            };

            const onMove = ev => {
              const ctm = svgEl.getScreenCTM();
              const pt = svgEl.createSVGPoint();
              pt.x = ev.clientX; pt.y = ev.clientY;
              const svgPt = ctm ? pt.matrixTransform(ctm.inverse()) : pt;
              dragLine.setAttribute('x2', String(svgPt.x));
              dragLine.setAttribute('y2', String(svgPt.y));

              const elUnder = document.elementFromPoint(ev.clientX, ev.clientY);
              const targetEl = elUnder?.closest('.node');
              const targetLbl = targetEl?.querySelector('.nodeLabel,text,span')?.textContent?.trim() || '';
              // Can't reattach an end onto the state already at the OTHER
              // end — that would make a self-loop, same rule drag-to-connect
              // already enforces for brand-new transitions.
              const newTargetId = (targetLbl && targetLbl !== otherName) ? sanitizeStateId(targetLbl) : null;
              if (newTargetId !== targetId) {
                if (targetId) clearTargetHighlight(targetId);
                targetId = newTargetId;
                if (targetId) setTargetHighlight(targetId);
              }
            };
            const onUp = () => {
              document.removeEventListener('mousemove', onMove);
              document.removeEventListener('mouseup', onUp);
              dragLine.remove();
              if (targetId) clearTargetHighlight(targetId);
              if (targetId) {
                const targetSt = wf.states.find(s => sanitizeStateId(s.name) === targetId);
                if (targetSt && targetSt.name !== (endKey === 'from' ? edge.fromName : edge.toName)) {
                  takeSnapshot();
                  updateTransition(activeId, edge.transId, { [endKey]: targetSt.name });
                }
              }
            };
            document.addEventListener('mousemove', onMove);
            document.addEventListener('mouseup', onUp);
          };
        };
        edgeList.forEach(edge => {
          if (!edge.transId) return; // the [*] marker's own edge has nothing to reconnect
          wireEndpointDrag(edge, 'from');
          wireEndpointDrag(edge, 'to');
        });

        layoutRef.current = { nodeCenters, edgeList, redrawEdge };

        // ── Click-to-select + drag-to-reposition ──
        svgEl.querySelectorAll('.node').forEach(n => {
          n.style.cursor = 'grab';
          const lbl = n.querySelector('.nodeLabel,text,span')?.textContent?.trim() || '';
          const stId = sanitizeStateId(lbl);

          // Hover-sync (Step 5, split-screen view) — keyed on the SANITIZED id,
          // not the raw label. The translator has no alias/label grammar
          // (MfilesProperties.md §3.5 — deliberate, not a gap this task fixes),
          // so a multi-word state's PlannedState.Name always comes back as this
          // same sanitized id, never the spaced label. Matching on `stId` here
          // is what makes hover-sync actually land for those states too, not
          // just single-word ones where sanitized happens to equal raw.
          if (lbl) {
            n.onmouseenter = () => setHoveredStateKey(stId);
            n.onmouseleave = () => setHoveredStateKey(prev => (prev === stId ? null : prev));
          }

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

          // ── Drag-to-connect handles — the one interaction this canvas never
          // had: Mermaid gives no native connection-handle/drag the way
          // React Flow's <Handle> does for BPMN Standard (checked its
          // "magic connector" CSS for the visual precedent — a small dot at
          // the node edge, hidden until hover — but the underlying mechanism
          // there is React Flow's own onConnect/handles, nothing to import
          // here; this is genuinely new interaction-layer code). A small
          // circle at the node's edge, visible on hover via CSS
          // (`.node:hover .mflow-connect-handle`), reusing this canvas's own
          // accent color (`--a3`, the same blue the selection highlight
          // already uses) rather than inventing a new one. Positioned as a
          // CHILD of the node's own <g> in local coordinates, so it moves
          // for free whenever the node is repositioned — no separate
          // tracking needed.
          //
          // Two handles, one per side (right — the original — and left,
          // added so a state positioned to the LEFT of its target has a
          // handle on the near side too, instead of the drag line always
          // starting from the node's far/right edge regardless of layout).
          // Both are wired through this one function, parameterized only on
          // which edge (`+hw` right, `-hw` left) — same mechanism byte-for-
          // byte otherwise, kept as one function rather than two 80-line
          // copies so the drag/hit-test/cleanup logic can't drift out of
          // sync between the two handles over time.
          const wireConnectHandle = side => {
            if (!lbl) return;
            const info = layoutRef.current.nodeCenters[stId];
            const hw = info?.hw ?? 40;
            const sign = side === 'left' ? -1 : 1;
            const handle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            handle.setAttribute('cx', String(sign * hw));
            handle.setAttribute('cy', '0');
            handle.setAttribute('r', '5');
            handle.setAttribute('class', `mflow-connect-handle mflow-connect-handle-${side}`);
            n.appendChild(handle);

            // A click that never became a drag (mousedown+mouseup on the
            // handle with no movement) would otherwise bubble as a real
            // click and hit n.onclick, toggling selection unexpectedly —
            // suppress it explicitly rather than relying on it just not
            // happening to fire.
            handle.onclick = e => e.stopPropagation();

            handle.onmousedown = e => {
              e.stopPropagation();
              e.preventDefault();
              if (lockedRef.current) return;
              const startInfo = layoutRef.current.nodeCenters[stId];
              if (!startInfo) return;

              const dragLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
              dragLine.setAttribute('class', 'mflow-connect-dragline');
              dragLine.setAttribute('x1', String(startInfo.cx + sign * startInfo.hw));
              dragLine.setAttribute('y1', String(startInfo.cy));
              dragLine.setAttribute('x2', String(startInfo.cx + sign * startInfo.hw));
              dragLine.setAttribute('y2', String(startInfo.cy));
              svgEl.appendChild(dragLine);

              let targetId = null;
              const clearTargetHighlight = id => {
                const t = layoutRef.current.nodeCenters[id];
                const shape = t?.el.querySelector('rect, polygon');
                if (shape) { shape.style.stroke = ''; shape.style.strokeWidth = ''; }
              };
              const setTargetHighlight = id => {
                const t = layoutRef.current.nodeCenters[id];
                const shape = t?.el.querySelector('rect, polygon');
                if (shape) { shape.style.stroke = 'var(--green)'; shape.style.strokeWidth = '3'; }
              };

              const onMove = ev => {
                const ctm = svgEl.getScreenCTM();
                const pt = svgEl.createSVGPoint();
                pt.x = ev.clientX; pt.y = ev.clientY;
                const svgPt = ctm ? pt.matrixTransform(ctm.inverse()) : pt;
                dragLine.setAttribute('x2', String(svgPt.x));
                dragLine.setAttribute('y2', String(svgPt.y));

                // Hit-test whatever's really under the cursor (dragLine has
                // pointer-events:none, see CSS, so it never shadows this).
                const elUnder = document.elementFromPoint(ev.clientX, ev.clientY);
                const targetEl = elUnder?.closest('.node');
                const targetLbl = targetEl?.querySelector('.nodeLabel,text,span')?.textContent?.trim() || '';
                const newTargetId = targetLbl ? sanitizeStateId(targetLbl) : null;
                const validNewTarget = (newTargetId && newTargetId !== stId) ? newTargetId : null;
                if (validNewTarget !== targetId) {
                  if (targetId) clearTargetHighlight(targetId);
                  targetId = validNewTarget;
                  if (targetId) setTargetHighlight(targetId);
                }
              };
              const onUp = () => {
                document.removeEventListener('mousemove', onMove);
                document.removeEventListener('mouseup', onUp);
                dragLine.remove();
                if (targetId) clearTargetHighlight(targetId);
                // Dropped on a real, different state — create the
                // transition. Dropped on empty canvas, the source node
                // itself, or nothing valid — clean up only, no dangling
                // transition, no partial state.
                if (targetId) {
                  const targetSt = wf.states.find(s => sanitizeStateId(s.name) === targetId);
                  if (targetSt) {
                    takeSnapshot();
                    addTransition(activeId, { from: lbl, to: targetSt.name });
                  }
                }
              };
              document.addEventListener('mousemove', onMove);
              document.addEventListener('mouseup', onUp);
            };
          };
          wireConnectHandle('right');
          wireConnectHandle('left');

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
              if (infos.length > 1) updateToolbarPosRef.current(); // keep the toolbar glued to a multi-node group-drag
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
  }, [mermaidStr, wf?.states, wf?.transitions, activeId, updateStatePosition, takeSnapshot, addTransition, updateTransition]);

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
  // Hub badge: same auto-detect mechanism as the diamond badge just above,
  // measuring the opposite direction (inbound instead of outgoing). Fully
  // independent signal — a state can be neither, either, or both (a real
  // Conformity vault state, "Control Invoices", is both simultaneously per
  // the task brief). No threshold behavior beyond >=2, matching the
  // diamond's own "2+, not =2" rule.
  const statesWithMeta = (wf?.states || []).map(s => {
    const outgoingList = s.name ? wf.transitions.filter(t => t.from === s.name) : [];
    const inboundList = s.name ? wf.transitions.filter(t => t.to === s.name) : [];
    const outgoing = outgoingList.length;
    const inbound = inboundList.length;
    const isDiamond = outgoing >= 2;
    const diamondTitle = isDiamond
      ? (inbound === 1
          ? 'Single inbound → this diamond will collapse. Its branches become direct transitions of this state — no new state is created.'
          : 'Multiple inbound → this diamond will promote to a real, separate state in the final workflow.')
      : '';
    const isHub = inbound >= 2;
    const hubTitle = isHub
      ? `${inbound} incoming from: ${inboundList.map(t => t.from || '(unnamed)').join(', ')}`
      : '';
    return { ...s, isDiamond, diamondTitle, isHub, hubTitle };
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
  // Shared by the right-click menu (contextMenuNames) AND the floating
  // multi-select toolbar (selected directly) — same reuse-over-recompute
  // discipline as statesWithMeta/panToState elsewhere in this file, so the
  // two entry points can't ever disagree about what Duplicate/Delete do.
  const duplicateNamesList = names => {
    if (!wf || !names.length) return;
    takeSnapshot();
    names.forEach(name => {
      const st = wf.states.find(s => s.name === name);
      if (st) duplicateState(activeId, st.id);
    });
  };
  // cascade:true — matches BPMN Standard's own confirmed, real behavior
  // (@xyflow/react's deleteElements/deleteNodes both auto-remove connected
  // edges, never block); Studio's own table keeps the old block-and-alert
  // behavior since it calls deleteState with no options, which still
  // defaults cascade to false.
  const deleteNamesList = names => {
    if (!wf || !names.length) return;
    takeSnapshot();
    const errors = [];
    names.forEach(name => {
      const st = wf.states.find(s => s.name === name);
      if (!st) return;
      const r = deleteState(activeId, st.id, { cascade: true });
      if (!r?.ok) errors.push(r?.error);
    });
    setSelected(new Set());
    if (errors.length) window.alert(errors.join('\n'));
  };
  const handleDuplicateSelected = () => { duplicateNamesList(contextMenuNames); setContextMenu(null); };
  const handleDeleteSelected = () => { deleteNamesList(contextMenuNames); setContextMenu(null); };
  const handleSelectAll = () => {
    setSelected(new Set((wf?.states || []).map(s => s.name).filter(Boolean)));
    setContextMenu(null);
  };
  // Edge/transition delete — the actual new capability this task adds.
  // deleteTransition needs no cascade concept of its own (a transition has
  // no downstream children to worry about), it's simply the second real
  // caller of the store action Studio's own table already used alone.
  const handleDeleteEdge = () => {
    if (contextMenu?.type === 'edge' && contextMenu.transId) { takeSnapshot(); deleteTransition(activeId, contextMenu.transId); }
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

  // ── Process groups (background highlight + label over a related set of
  // states) — deliberately NOT a new store concept. Membership lives as a
  // plain field on each member state's own record (processGroupId/
  // processGroupName), set through the existing updateState(wfId, stateId,
  // patch) call exactly the way color already is a few lines above — no new
  // action, no edit to useWorkflowStore.js. A state losing membership on
  // delete/duplicate is automatic (nothing else ever looks up a deleted
  // state's id), not a separate cleanup path. Rendering (the actual
  // background rect + label) lives entirely in the render effect below.
  const makeGroupId = () => `pg_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  const handleGroupSelected = names => {
    if (!wf || names.length < 2) { setContextMenu(null); return; }
    const name = window.prompt('Process name for this group:', '');
    if (name == null || !name.trim()) { setContextMenu(null); return; }
    const groupId = makeGroupId();
    takeSnapshot();
    names.forEach(n => {
      const st = wf.states.find(s => s.name === n);
      if (st) updateState(activeId, st.id, { processGroupId: groupId, processGroupName: name.trim() });
    });
    setContextMenu(null);
  };
  const handleUngroupSelected = names => {
    if (!wf || !names.length) { setContextMenu(null); return; }
    takeSnapshot();
    names.forEach(n => {
      const st = wf.states.find(s => s.name === n);
      if (st?.processGroupId) updateState(activeId, st.id, { processGroupId: null, processGroupName: null });
    });
    setContextMenu(null);
  };
  const selectionHasGroupedMember = contextMenuNames.some(n => wf?.states.find(s => s.name === n)?.processGroupId);

  // Transition name — a plain, purely cosmetic `label` field, same
  // rename-via-prompt() pattern as handleEditSelected above (state rename),
  // via the existing updateTransition(wfId, transId, patch) call. Distinct
  // from `conditions` (the real grammar field driving TriggerMode/dashing/
  // diamond semantics) — that stays Studio-only and untouched; this is a
  // second, independent, cosmetic field with no effect on any of that.
  const handleEditTransitionLabel = () => {
    if (!wf || contextMenu?.type !== 'edge' || !contextMenu.transId) { setContextMenu(null); return; }
    const t = wf.transitions.find(t => t.id === contextMenu.transId);
    setContextMenu(null);
    if (!t) return;
    const next = window.prompt('Transition name:', t.label || '');
    if (next != null) { takeSnapshot(); updateTransition(activeId, t.id, { label: next.trim() || null }); }
  };

  const handleEditTransitionCondition = () => {
    if (!wf || contextMenu?.type !== 'edge' || !contextMenu.transId) { setContextMenu(null); return; }
    const t = wf.transitions.find(t => t.id === contextMenu.transId);
    setContextMenu(null);
    if (!t) return;
    const next = window.prompt('Transition condition (after(3d), if(P=V), script(Name)):', t.conditions || '');
    if (next != null) {
      takeSnapshot();
      updateTransition(activeId, t.id, { conditions: next.trim() || null });
    }
  };

  const handleToggleTransitionStyle = () => {
    if (!wf || contextMenu?.type !== 'edge' || !contextMenu.transId) { setContextMenu(null); return; }
    const t = wf.transitions.find(t => t.id === contextMenu.transId);
    setContextMenu(null);
    if (!t) return;
    takeSnapshot();
    const nextStyle = t.style === 'automatic' ? 'manual' : 'automatic';
    updateTransition(activeId, t.id, { style: nextStyle });
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
    <PanelGroup direction="horizontal" className="mflow-split">
    <Panel defaultSize={55} minSize={30} className="mflow-split-left">
    <div className="mflow-shell">
      <MFlowPalette
        pinned={palettePinned}
        onTogglePinned={() => setPalettePinned(p => !p)}
        onAddState={() => { if (wf) { takeSnapshot(); addState(activeId, { name: uniqueStateName('New State'), color: stateColor }); } }}
        onAddInitialState={() => { if (wf) { takeSnapshot(); addState(activeId, { name: uniqueStateName('New Initial State'), initial: true, color: stateColor }); } }}
        onAddEndState={() => { if (wf) { takeSnapshot(); addState(activeId, { name: uniqueStateName('New End State'), terminal: true, color: stateColor }); } }}
        onAddComment={() => { if (wf) { takeSnapshot(); addComment(activeId, undefined, commentColor); } }}
        onAddDecision={() => {
          if (!wf) return;
          takeSnapshot();
          // One state, two outcomes, two real transitions — the same
          // addState/addTransition primitives every other tile already
          // uses, just five calls behind one click. The diamond on the
          // decision state is the pre-existing 2+-outgoing auto-detect
          // firing on this real data, not a new shape or a new tile type.
          const decisionName = uniqueStateName('Decision');
          addState(activeId, { name: decisionName, color: stateColor });
          const outcomeAName = uniqueStateName('Outcome A');
          addState(activeId, { name: outcomeAName, color: stateColor });
          const outcomeBName = uniqueStateName('Outcome B');
          addState(activeId, { name: outcomeBName, color: stateColor });
          addTransition(activeId, { from: decisionName, to: outcomeAName });
          addTransition(activeId, { from: decisionName, to: outcomeBName });
        }}
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
        {!wf
          ? <div className="blueprint-empty">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
              <div className="blueprint-title">No Diagram Available</div>
              <div className="blueprint-sub">Select or create a workflow in Studio's tab strip first — this canvas shares the same workflows.</div>
            </div>
          : <div className="mflow-diagram-wrap">
              {/* Always mounted the moment a workflow exists — the diagram
                  div itself (dotted-grid background) IS the visible canvas,
                  not a placeholder swapped in only once content exists. The
                  empty message below is a non-blocking overlay on top of it,
                  not a replacement, so right-click/Select All still reaches
                  the real canvas underneath even with zero states. */}
              <div className="mflow-diagram" ref={diagRef} onClick={e => { setContextMenu(null); e.stopPropagation(); }}/>
              {!mermaidStr && (
                <div className="mflow-diagram-empty">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
                  <div className="blueprint-title">No Diagram Available</div>
                  <div className="blueprint-sub">Add a state from the palette to begin.</div>
                </div>
              )}
            </div>}

        {wf && (wf.comments || []).map(c => {
          const contrast = getContrastColor(c.color);
          const mutedContrast = contrast === '#ffffff' ? 'rgba(255, 255, 255, 0.6)' : 'rgba(15, 23, 42, 0.6)';
          const borderBottomColor = contrast === '#ffffff' ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.08)';
          return (
            <div key={c.id} className="mflow-comment"
              style={{
                left: c.x,
                top: c.y,
                borderTop: '3px solid rgba(0, 0, 0, 0.15)',
                backgroundColor: c.color,
                borderColor: 'rgba(0, 0, 0, 0.12)',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
              }}
              onClick={e => { setContextMenu(null); e.stopPropagation(); }}
              onContextMenu={e => { e.preventDefault(); e.stopPropagation(); setContextMenu({ x: e.clientX, y: e.clientY, type: 'comment', commentId: c.id }); }}>
              <div className="mflow-comment-head" style={{ borderBottomColor, backgroundColor: 'transparent' }} onMouseDown={e => startCommentDrag(e, c)}>
                <input type="color" value={c.color} onChange={e => updateComment(activeId, c.id, { color: e.target.value })}/>
                <button type="button" className="mflow-comment-del" style={{ color: mutedContrast }} onClick={() => { takeSnapshot(); deleteComment(activeId, c.id); }} title="Delete">✕</button>
              </div>
              <textarea value={c.text} placeholder="Note / Remark…" style={{ color: contrast }} onChange={e => updateComment(activeId, c.id, { text: e.target.value })}/>
            </div>
          );
        })}

        {/* Right-click menu — reuses BPMN's own .bpmn-context-menu chrome
            directly (pure visual shell, not coupled to BPMN's data, so
            sharing the class is safe and avoids re-styling the same box
            twice — per the user's "don't reinvent the wheel" direction). */}
        {contextMenu && (() => {
          const menuWidth = 190;
          const menuHeight = 310;
          const left = Math.max(10, Math.min(contextMenu.x, window.innerWidth - menuWidth - 20));
          const top = Math.max(10, Math.min(contextMenu.y, window.innerHeight - menuHeight - 20));
          return (
            <div className="bpmn-context-menu" style={{ left, top }}
              onClick={e => e.stopPropagation()}>
            {contextMenu.type === 'node' ? (() => {
              const st = wf?.states.find(s => s.name === contextMenuNames[0]);
              return (
                <>
                  <div className="bpmn-context-menu-label">
                    {contextMenuNames.length > 1
                      ? `${contextMenuNames.length} states selected`
                      : (() => {
                          const meta = statesWithMeta.find(s => s.name === contextMenuNames[0]);
                          const typeLabel = meta?.isDiamond ? 'Diamond' : 'State';
                          return `${typeLabel}: ${contextMenuNames[0] || '(unnamed)'}`;
                        })()}
                  </div>
                  {contextMenu.editing === 'name' ? (
                    <input
                      className="mflow-menu-input"
                      autoFocus
                      defaultValue={st?.name || ''}
                      onClick={e => e.stopPropagation()}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          const val = e.target.value.trim();
                          if (val && st && val !== st.name) {
                            takeSnapshot();
                            renameState(activeId, st.id, val);
                          }
                          setContextMenu(null);
                        } else if (e.key === 'Escape') {
                          setContextMenu(null);
                        }
                      }}
                      onBlur={e => {
                        const val = e.target.value.trim();
                        if (val && st && val !== st.name) {
                          takeSnapshot();
                          renameState(activeId, st.id, val);
                        }
                        setContextMenu(null);
                      }}
                    />
                  ) : (
                    <button type="button" onClick={() => setContextMenu(prev => ({ ...prev, editing: 'name' }))} disabled={contextMenuNames.length !== 1}>✎ Edit Name</button>
                  )}
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
              );
            })() : contextMenu.type === 'comment' ? (
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
            ) : contextMenu.type === 'edge' ? (() => {
              const t = wf?.transitions.find(t => t.id === contextMenu.transId);
              const hasLabel = !!t?.label;
              const isAuto = t?.style === 'automatic';
              const activeTab = contextMenu.tab || 'general';
              return (
                <>
                  <div className="bpmn-context-menu-label">
                    {t?.label ? `Transition: "${t.label}"` : `Transition: ${contextMenu.fromName || '(unnamed)'} → ${contextMenu.toName || '(unnamed)'}`}
                  </div>
                  
                  {/* Tab Selector */}
                  <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: '6px' }}>
                    <button type="button" 
                      style={{
                        flex: 1, textAlign: 'center', padding: '6px 4px', fontSize: '9.5px', borderRadius: 0,
                        color: activeTab === 'general' ? 'var(--a3)' : 'var(--dim)',
                        borderBottom: activeTab === 'general' ? '2px solid var(--a3)' : '2px solid transparent',
                        background: 'none', fontWeight: activeTab === 'general' ? 'bold' : 'normal'
                      }}
                      onClick={(e) => { e.stopPropagation(); setContextMenu(prev => ({ ...prev, tab: 'general', editing: null })); }}>
                      General
                    </button>
                    <button type="button" 
                      style={{
                        flex: 1, textAlign: 'center', padding: '6px 4px', fontSize: '9.5px', borderRadius: 0,
                        color: activeTab === 'advanced' ? 'var(--a3)' : 'var(--dim)',
                        borderBottom: activeTab === 'advanced' ? '2px solid var(--a3)' : '2px solid transparent',
                        background: 'none', fontWeight: activeTab === 'advanced' ? 'bold' : 'normal'
                      }}
                      onClick={(e) => { e.stopPropagation(); setContextMenu(prev => ({ ...prev, tab: 'advanced', editing: null })); }}>
                      Advanced
                    </button>
                  </div>

                  {activeTab === 'general' ? (
                    <>
                      {contextMenu.editing === 'name' ? (
                        <input
                          className="mflow-menu-input"
                          autoFocus
                          placeholder="Transition name…"
                          defaultValue={t?.label || ''}
                          onClick={e => e.stopPropagation()}
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              const val = e.target.value.trim();
                              if (t) {
                                takeSnapshot();
                                updateTransition(activeId, t.id, { label: val || null });
                              }
                              setContextMenu(null);
                            } else if (e.key === 'Escape') {
                              setContextMenu(null);
                            }
                          }}
                          onBlur={e => {
                            const val = e.target.value.trim();
                            if (t) {
                              takeSnapshot();
                              updateTransition(activeId, t.id, { label: val || null });
                            }
                            setContextMenu(null);
                          }}
                        />
                      ) : (
                        <button type="button" onClick={() => setContextMenu(prev => ({ ...prev, editing: 'name' }))}>
                          {hasLabel ? '✎ Edit Name' : '✎ Add Name'}
                        </button>
                      )}
                      <div className="bpmn-context-menu-divider"/>
                      <div className="bpmn-context-menu-label">Transition line color</div>
                      <div className="mflow-menu-swatches">
                        {PRESET_COLORS.map(({ name, hex }) => (
                          <button type="button" key={hex} className="mflow-menu-swatch" style={{ background: hex }}
                            title={name} onClick={() => { takeSnapshot(); updateTransition(activeId, contextMenu.transId, { color: hex }); setContextMenu(null); }}/>
                        ))}
                        <button type="button" className="mflow-menu-swatch mflow-menu-swatch-clear"
                          title="Clear color" onClick={() => { takeSnapshot(); updateTransition(activeId, contextMenu.transId, { color: null }); setContextMenu(null); }}>✕</button>
                      </div>
                      <div className="bpmn-context-menu-divider"/>
                      <div className="bpmn-context-menu-label">Label background color</div>
                      <div className="mflow-menu-swatches">
                        {PRESET_COLORS.map(({ name, hex }) => (
                          <button type="button" key={hex} className="mflow-menu-swatch" style={{ background: hex }}
                            title={name} onClick={() => { takeSnapshot(); updateTransition(activeId, contextMenu.transId, { labelColor: hex }); setContextMenu(null); }}/>
                        ))}
                        <button type="button" className="mflow-menu-swatch mflow-menu-swatch-clear"
                          title="Clear label background color" onClick={() => { takeSnapshot(); updateTransition(activeId, contextMenu.transId, { labelColor: null }); setContextMenu(null); }}>✕</button>
                      </div>
                      <button type="button" onClick={handleDeleteEdge}>✕ Delete</button>
                    </>
                  ) : (
                    <>
                      {contextMenu.editing === 'condition' ? (
                        <input
                          className="mflow-menu-input"
                          autoFocus
                          placeholder="Condition: after(3d), if(P=V)…"
                          defaultValue={t?.conditions || ''}
                          onClick={e => e.stopPropagation()}
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              const val = e.target.value.trim();
                              if (t) {
                                takeSnapshot();
                                updateTransition(activeId, t.id, { conditions: val || null });
                              }
                              setContextMenu(null);
                            } else if (e.key === 'Escape') {
                              setContextMenu(null);
                            }
                          }}
                          onBlur={e => {
                            const val = e.target.value.trim();
                            if (t) {
                              takeSnapshot();
                              updateTransition(activeId, t.id, { conditions: val || null });
                            }
                            setContextMenu(null);
                          }}
                        />
                      ) : (
                        <button type="button" onClick={() => setContextMenu(prev => ({ ...prev, editing: 'condition' }))}>✎ Transition Condition</button>
                      )}
                      <button type="button" onClick={handleToggleTransitionStyle}>
                        {isAuto ? '⇎ Set to Manual (Solid)' : '⇢ Set to Automatic (Dashed)'}
                      </button>
                    </>
                  )}
                </>
              );
            })() : (
              <button type="button" onClick={handleSelectAll}>Select All</button>
            )}
            <div className="bpmn-context-menu-divider"/>
            <button type="button" onClick={() => { undo(); setContextMenu(null); }} disabled={!canUndo}>↺ Undo</button>
            <button type="button" onClick={() => { redo(); setContextMenu(null); }} disabled={!canRedo}>↻ Redo</button>
          </div>
          );
        })()}

        {/* Floating multi-select toolbar — appears once 2+ states are
            selected, matching BPMN Standard's SelectedNodesToolbar trigger
            condition exactly (selectedNodes.length < 2 → hidden). Built
            fresh for this canvas (see updateToolbarPos's own comment for
            why React Flow's NodeToolbar/getNodesBounds aren't portable
            here) — a plain positioned div, not an SVG element, since it
            needs to render real DOM buttons regardless of the diagram's own
            zoom/pan transform. */}
        {toolbarPos && selected.size > 1 && (
          <div className="mflow-selection-toolbar" style={{ left: toolbarPos.left, top: toolbarPos.top }}
            onClick={e => e.stopPropagation()} onContextMenu={e => e.preventDefault()}>
            <span className="mflow-selection-toolbar-count">{selected.size} selected</span>
            <button type="button" onClick={() => duplicateNamesList([...selected])} title="Duplicate all selected states">⧉ Duplicate</button>
            <button type="button" onClick={() => handleGroupSelected([...selected])} title="Highlight these states as one labeled process group">▭ Group</button>
            <button type="button" onClick={() => deleteNamesList([...selected])} title="Delete all selected states">✕ Delete</button>
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
                    const outgoingRows = s.name ? wf.transitions.filter(t => t.from === s.name) : [];
                    const inboundRows = s.name ? wf.transitions.filter(t => t.to === s.name) : [];
                    const outgoing = outgoingRows.length;
                    const inbound = inboundRows.length;
                    const isDiamond = outgoing >= 2;
                    const diamondTitle = isDiamond
                      ? (inbound === 1
                          ? 'Single inbound → this diamond will collapse. Its branches become direct transitions of this state — no new state is created.'
                          : 'Multiple inbound → this diamond will promote to a real, separate state in the final workflow.')
                      : '';
                    // Hub mirror — same >=2 threshold, opposite direction,
                    // fully independent of the diamond check above.
                    const isHub = inbound >= 2;
                    const hubTitle = isHub
                      ? `${inbound} incoming from: ${inboundRows.map(t => t.from || '(unnamed)').join(', ')}`
                      : '';
                    return (
                    <tr key={s.id} className={`mflow-clickable-row ${selected.has(s.name) ? 'sel-row' : ''}`.trim()}
                      onClick={() => s.name && setSelected(new Set([s.name]))}>
                      <td style={{ padding: '4px 6px', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span className="mflow-table-dot" style={{ background: s.color || 'var(--mid)' }}/>
                        {s.name || <em style={{ color: 'var(--dim)' }}>(unnamed)</em>}
                        {isDiamond && <Diamond size={10} className="mflow-diamond-badge" title={diamondTitle}/>}
                        {isHub && <GitMerge size={10} className="mflow-hub-badge" title={hubTitle}/>}
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
    </Panel>
    <PanelResizeHandle className="mflow-split-handle"/>
    <Panel defaultSize={45} minSize={20} className="mflow-split-right">
      <LiveTranslationView plan={translationPlan} error={translationError} isTranslating={isTranslating} version={translationVersion} hoveredStateKey={hoveredStateKey} onForceRefresh={() => setRefreshTrigger(v => v + 1)}/>
    </Panel>
    </PanelGroup>
  );
}
