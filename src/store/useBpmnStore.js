import { create } from 'zustand';
import { applyNodeChanges, applyEdgeChanges, addEdge, reconnectEdge } from '@xyflow/react';
import { sortForHierarchy } from '../utils/bpmnPools';

// ── useBpmnStore ─────────────────────────────────────────────────
// Fully separate from useWorkflowStore, deliberately. This canvas is internal
// process documentation (the same role Cacoo serves today), not a second input
// path into the real product pipeline — it never reads or writes
// useWorkflowStore's workflows/groups/theme, and nothing in
// ProvisioningAI.Workflow/Translation/ or useExport.js ever reads this store.

// Exported — BpmnCanvas.jsx's magic-connector (Phase D) needs to mint an
// edge id for the edge it creates alongside a new node, same generator the
// store already uses for everything else.
export const makeId = () => Math.random().toString(36).slice(2, 9);

const DEFAULT_SPAWN_POSITION = { x: 40, y: 40 };
const SPAWN_STEP = 28;
const SPAWN_CLEARANCE = 24;
const SPAWN_RINGS = 12;

function clampSpawnPosition(pos) {
  return { x: Math.max(0, Math.round(pos.x)), y: Math.max(0, Math.round(pos.y)) };
}

function isPositionOccupied(nodes, pos) {
  return nodes.some(n =>
    Math.abs(n.position.x - pos.x) < SPAWN_CLEARANCE &&
    Math.abs(n.position.y - pos.y) < SPAWN_CLEARANCE
  );
}

function buildSpawnCandidates(start) {
  const candidates = [clampSpawnPosition(start)];
  for (let ring = 1; ring <= SPAWN_RINGS; ring++) {
    const d = ring * SPAWN_STEP;
    // Prefer right/down expansion first (natural reading direction), then fill
    // the remaining quadrants so duplicates don't keep marching on one line.
    candidates.push(
      clampSpawnPosition({ x: start.x + d, y: start.y }),
      clampSpawnPosition({ x: start.x, y: start.y + d }),
      clampSpawnPosition({ x: start.x + d, y: start.y + d }),
      clampSpawnPosition({ x: start.x - d, y: start.y }),
      clampSpawnPosition({ x: start.x, y: start.y - d }),
      clampSpawnPosition({ x: start.x - d, y: start.y + d }),
      clampSpawnPosition({ x: start.x + d, y: start.y - d }),
      clampSpawnPosition({ x: start.x - d, y: start.y - d }),
      clampSpawnPosition({ x: start.x + d * 2, y: start.y + d }),
      clampSpawnPosition({ x: start.x + d, y: start.y + d * 2 }),
      clampSpawnPosition({ x: start.x - d * 2, y: start.y + d }),
      clampSpawnPosition({ x: start.x + d, y: start.y - d * 2 })
    );
  }
  return candidates;
}

function findFreeSpawnPosition(nodes, start = DEFAULT_SPAWN_POSITION) {
  const candidates = buildSpawnCandidates(start);
  for (const pos of candidates) {
    if (!isPositionOccupied(nodes, pos)) return pos;
  }
  return clampSpawnPosition({ x: start.x + SPAWN_STEP * (SPAWN_RINGS + 1), y: start.y + SPAWN_STEP * (SPAWN_RINGS + 1) });
}

// A Pool is far bigger than the point-proximity check above accounts for
// (SPAWN_CLEARANCE is 24px, fine for ~150x60 task nodes) — a 420x260 pool
// can fully cover an existing node's whole footprint while still passing
// that check. Confirmed live: a freshly-added pool was landing directly on
// top of an existing task, silently eating every click meant for it —
// which is exactly what broke "drag a node into the pool, then move the
// pool" (the drag never reached the node underneath at all). This checks
// real rectangle overlap against every existing node's actual footprint,
// not a single point, and steps by the pool's own size when nudging away
// from a collision rather than the small-node SPAWN_STEP.
function rectsOverlap(a, b) {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

function findFreePoolSpawnPosition(nodes, poolWidth, poolHeight, start = DEFAULT_SPAWN_POSITION) {
  const nodeRects = nodes.map(n => ({
    x: n.position.x,
    y: n.position.y,
    width: n.measured?.width ?? n.style?.width ?? 150,
    height: n.measured?.height ?? n.style?.height ?? 60,
  }));
  const isClear = (pos) => !nodeRects.some(r => rectsOverlap({ x: pos.x, y: pos.y, width: poolWidth, height: poolHeight }, r));

  const startClamped = clampSpawnPosition(start);
  if (isClear(startClamped)) return startClamped;

  const stepX = poolWidth + 40, stepY = poolHeight + 40;
  for (let ring = 1; ring <= SPAWN_RINGS; ring++) {
    const candidates = [
      { x: start.x + stepX * ring, y: start.y },
      { x: start.x, y: start.y + stepY * ring },
      { x: start.x + stepX * ring, y: start.y + stepY * ring },
      { x: start.x - stepX * ring, y: start.y },
      { x: start.x, y: start.y - stepY * ring },
    ].map(clampSpawnPosition);
    const free = candidates.find(isClear);
    if (free) return free;
  }
  // Guaranteed-clear fallback: below everything else on the canvas.
  const maxBottom = nodeRects.length ? Math.max(...nodeRects.map(r => r.y + r.height)) : start.y;
  return clampSpawnPosition({ x: start.x, y: maxBottom + 60 });
}

// A small starter sketch — enough to show both a task node and an exclusive
// gateway in use on first load, not an empty canvas.
const initialNodes = [
  { id: 'bp-start',   type: 'input',  position: { x: 140, y: 0 },   data: { label: 'Start' } },
  { id: 'bp-intake',  position: { x: 100, y: 100 }, data: { label: 'Receive invoice' } },
  { id: 'bp-gate',    type: 'gateway', position: { x: 120, y: 220 }, data: { gatewayType: 'exclusive' } },
  { id: 'bp-approve', position: { x: 0,   y: 340 }, data: { label: 'Route to approver' } },
  { id: 'bp-reject',  position: { x: 240, y: 340 }, data: { label: 'Return to vendor' } },
  { id: 'bp-end',     type: 'output', position: { x: 140, y: 460 }, data: { label: 'End' } },
];

const initialEdges = [
  { id: 'bp-e1', source: 'bp-start',   target: 'bp-intake' },
  { id: 'bp-e2', source: 'bp-intake',  target: 'bp-gate' },
  { id: 'bp-e3', source: 'bp-gate',    target: 'bp-approve', label: 'valid' },
  { id: 'bp-e4', source: 'bp-gate',    target: 'bp-reject',  label: 'invalid' },
  { id: 'bp-e5', source: 'bp-approve', target: 'bp-end' },
  { id: 'bp-e6', source: 'bp-reject',  target: 'bp-end' },
];

// Undo/redo (Stage 3, React Flow Pro enhancements) — checked undo-redo-pro-
// example directly first. It's a snapshot-based history (push the whole
// {nodes, edges} pair before each mutating action — not a diff/reducer),
// following redux.js.org's own "implementing undo history" pattern, capped
// at maxHistorySize entries. Two real things the example got wrong, not
// ported: its canUndo/canRedo are inverted (`disabled={canUndo}` in its own
// App.tsx — canUndo is true when there's nothing to undo), fixed here to
// mean what the name says; and its keydown listener has no input-focus
// guard, which the demo never needed (no text fields in it) but this canvas
// has real ones (search, label edit) where Ctrl+Z should do the browser's
// own native text-undo, not blow away canvas state.
//
// Being a full-array snapshot rather than a diff is also why Stage 1's
// pool-relative-position model needs no special handling here (unlike
// Stage 2's helper lines, which had to actively compare coordinate spaces):
// restoring a snapshot just puts back the exact same node objects —
// parentId, relative position, extent — with no coordinate translation
// anywhere, so it's correct by construction, not by accident.
const MAX_HISTORY = 100;

export const useBpmnStore = create((set, get) => ({
  nodes: initialNodes,
  edges: initialEdges,
  history: { past: [], future: [] },
  activeEdgeToolbarId: null,

  // Called at the START of a mutating action (before the mutation itself),
  // exactly like the Pro example's own takeSnapshot — captures what should
  // be restored TO, not the result of the action about to happen. Centralized
  // inside the store's own action functions below (see addTask etc.) rather
  // than requiring every call site in BpmnCanvas.jsx to remember to call it,
  // which is how the Pro example's own App.tsx does it — a deliberate
  // adaptation to this project's store-centric structure, not a literal port.
  takeSnapshot: () => set(s => ({
    history: {
      past: [...s.history.past.slice(-(MAX_HISTORY - 1)), { nodes: s.nodes, edges: s.edges }],
      future: [], // a new action invalidates whatever redo path existed
    },
  })),

  // No canUndo/canRedo methods here on purpose — a plain function reachable
  // via get() wouldn't make a subscribed component re-render when history
  // changes (it's not itself reactive state). BpmnCanvas.jsx subscribes to
  // `history` directly and derives past.length > 0 / future.length > 0
  // inline, so the Undo/Redo buttons' disabled state actually updates.

  undo: () => set(s => {
    const prev = s.history.past[s.history.past.length - 1];
    if (!prev) return s;
    return {
      nodes: prev.nodes,
      edges: prev.edges,
      history: {
        past: s.history.past.slice(0, -1),
        future: [...s.history.future, { nodes: s.nodes, edges: s.edges }],
      },
    };
  }),

  redo: () => set(s => {
    const next = s.history.future[s.history.future.length - 1];
    if (!next) return s;
    return {
      nodes: next.nodes,
      edges: next.edges,
      history: {
        past: [...s.history.past, { nodes: s.nodes, edges: s.edges }],
        future: s.history.future.slice(0, -1),
      },
    };
  }),

  // Off by default, every load — not persisted anywhere (no localStorage, no
  // persist middleware on this store), so a real page reload always starts
  // static. Lives here rather than as component-local state because FlowEdge
  // (a custom edge component, not a child of BpmnCanvas's own JSX) needs to
  // read it without prop-drilling through React Flow's edge-rendering internals.
  animateFlow: false,
  setAnimateFlow: (animateFlow) => set({ animateFlow }),

  // Technical (default) shows Phase C's real bpmn-moddle-typed icons (Service
  // Task, Message Start Event, ...) and the inspector's ID/Type rows —
  // genuine typed data, not invented. Business hides both, same reasoning as
  // animateFlow for living in the store: TaskNode/EventNode (Phase C) read it
  // directly rather than threading it through nodeTypes' props.
  businessView: false,
  setBusinessView: (businessView) => set({ businessView }),

  // Whole-canvas edge routing style, not per-edge — same store-residency
  // reasoning as animateFlow/businessView: FlowEdge.jsx reads it directly to
  // pick which of React Flow's own path functions to call (getSmoothStepPath/
  // getStraightPath/getBezierPath — no custom routing math). Orthogonal is
  // the explicit default, matching every prior verification this session.
  connectorStyle: 'orthogonal',
  setConnectorStyle: (connectorStyle) => set({ connectorStyle }),

  // Position/selection/dimension changes flow through onNodesChange on every
  // drag frame and every measurement — snapshotting here would flood history
  // with dozens of entries per gesture. That's exactly why the Pro example
  // snapshots on onNodeDragStart instead (BpmnCanvas.jsx wires that), not
  // inside the generic change handler; setNodes/setEdges stay snapshot-free
  // for the same reason — they're low-level primitives multiple callers
  // (drag, pool reparenting, restore) use with different undo-granularity
  // needs, not a single semantic "action."
  onNodesChange: (changes) => set(s => ({ nodes: applyNodeChanges(changes, s.nodes) })),
  onEdgesChange: (changes) => set(s => ({ edges: applyEdgeChanges(changes, s.edges) })),
  onConnect: (connection) => {
    get().takeSnapshot(); // matches the Pro example's own onConnect — undoable edge creation
    set(s => ({ edges: addEdge(connection, s.edges) }));
  },
  reconnectEdge: (oldEdge, newConnection) => {
    get().takeSnapshot();
    set(s => ({ edges: reconnectEdge(oldEdge, newConnection, s.edges) }));
  },
  setActiveEdgeToolbarId: (activeEdgeToolbarId) => set({ activeEdgeToolbarId }),
  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),

  // position defaults preserve exact prior click-to-add behavior — drag-and-drop
  // (BpmnCanvas.jsx's onDrop) is the only caller that ever passes a real one.
  // Each now returns the new node's id — Phase D's magic connector needs it
  // to wire the auto-created edge; every pre-existing caller just ignores it.
  // Each also snapshots first — the magic connector calls addTask then wires
  // an edge itself (bypassing onConnect), and that one snapshot correctly
  // covers the whole "create + connect" gesture as a single undo step.
  addTask: (position = DEFAULT_SPAWN_POSITION) => {
    get().takeSnapshot();
    const id = makeId();
    set(s => {
      const spawn = findFreeSpawnPosition(s.nodes, position);
      return { nodes: [...s.nodes, { id, position: spawn, data: { label: 'New task' } }] };
    });
    return id;
  },
  addStart: (position = DEFAULT_SPAWN_POSITION) => {
    get().takeSnapshot();
    const id = makeId();
    set(s => {
      const spawn = findFreeSpawnPosition(s.nodes, position);
      return { nodes: [...s.nodes, { id, type: 'input', position: spawn, data: { label: 'Start' } }] };
    });
    return id;
  },
  addEnd: (position = DEFAULT_SPAWN_POSITION) => {
    get().takeSnapshot();
    const id = makeId();
    set(s => {
      const spawn = findFreeSpawnPosition(s.nodes, position);
      return { nodes: [...s.nodes, { id, type: 'output', position: spawn, data: { label: 'End' } }] };
    });
    return id;
  },
  addGateway: (gatewayType, position = DEFAULT_SPAWN_POSITION) => {
    get().takeSnapshot();
    const id = makeId();
    set(s => {
      const spawn = findFreeSpawnPosition(s.nodes, position);
      return { nodes: [...s.nodes, { id, type: 'gateway', position: spawn, data: { gatewayType } }] };
    });
    return id;
  },

  // Call Activity — a reference to a separate, predefined process, distinct
  // from a plain Task. Reuses TaskNode.jsx entirely unchanged (node.type
  // stays 'default'); the double-vertical-bar treatment the user asked for
  // is pure CSS keyed off className (App.jsx's .bpmn-node-callactivity), the
  // same way pool-drag-over reuses className for its own active-highlight
  // rather than a dedicated component. bpmnType is set to the real
  // bpmn-moddle type ('bpmn:CallActivity') so it round-trips correctly
  // through export/import (bpmnModdle.js's bpmnTypeForNode already falls
  // back to node.data.bpmnType for any generic node) — a deliberate, narrow
  // exception to the "palette only ever creates untyped bpmn:Task" rule
  // (Decision 7), made because this is a distinct, real BPMN element the
  // palette needs to offer directly, not an open reopening of that boundary.
  addSubProcess: (position = DEFAULT_SPAWN_POSITION) => {
    get().takeSnapshot();
    const id = makeId();
    set(s => {
      const spawn = findFreeSpawnPosition(s.nodes, position);
      return {
        nodes: [...s.nodes, {
          id,
          position: spawn,
          className: 'bpmn-node-callactivity',
          data: { label: 'New process', bpmnType: 'bpmn:CallActivity' },
        }],
      };
    });
    return id;
  },

  // Stage 1 (React Flow Pro enhancements) — a single container, per
  // parent-child-relation-pro-example's own actual scope (no multi-lane
  // subdivision exists there to copy, so none is invented here). 420x260 is
  // this project's own size choice for a usable BPMN pool, not a value taken
  // from the Pro example (which used an arbitrary 300x300 for its own demo).
  // Appended at the end like every other add* — a brand-new pool has no
  // children yet, so it can't violate the parent-before-child ordering
  // PoolNode/reparenting relies on regardless of array position.
  addPool: (position = DEFAULT_SPAWN_POSITION) => {
    get().takeSnapshot();
    const id = makeId();
    const POOL_WIDTH = 420, POOL_HEIGHT = 260;
    set(s => {
      const spawn = findFreePoolSpawnPosition(s.nodes, POOL_WIDTH, POOL_HEIGHT, position);
      return { nodes: [...s.nodes, { id, type: 'group', position: spawn, style: { width: POOL_WIDTH, height: POOL_HEIGHT }, data: { label: 'Pool' } }] };
    });
    return id;
  },

  // Inline-editable from the floating node toolbar's inspector (Phase D) —
  // scoped to the label only, per Decision 7 (no script/action bodies live
  // in this model to begin with). Deliberately does NOT snapshot here — this
  // fires on every keystroke (the inspector's <input onChange>), and
  // snapshotting per-character would make undo step back one letter at a
  // time. BpmnCanvas.jsx snapshots once, on the input's onFocus, instead —
  // one undo step per editing session, not per keystroke.
  updateNodeLabel: (id, label) => set(s => ({
    nodes: s.nodes.map(n => (n.id === id ? { ...n, data: { ...n.data, label } } : n)),
  })),

  // Edge label is real BPMN structural data (exports as SequenceFlow@name).
  // Comment is an internal annotation only and intentionally never exported.
  // Both update per keystroke, so snapshot once from UI focus, not here.
  updateEdgeLabel: (id, label) => set(s => ({
    edges: s.edges.map(e => (e.id === id ? { ...e, label } : e)),
  })),
  updateEdgeComment: (id, comment) => set(s => ({
    edges: s.edges.map(e => (e.id === id ? { ...e, comment } : e)),
  })),

  duplicateEdge: (id) => {
    get().takeSnapshot();
    const newId = makeId();
    set(s => {
      const orig = s.edges.find(e => e.id === id);
      if (!orig) return s;
      return {
        edges: [
          ...s.edges.map(e => ({ ...e, selected: false })),
          { ...orig, id: newId, selected: true },
        ],
      };
    });
    return newId;
  },

  deleteEdge: (id) => {
    get().takeSnapshot();
    set(s => ({ edges: s.edges.filter(e => e.id !== id) }));
  },

  // Clone keeps the original's data (bpmnType/gatewayType/eventDefinition
  // included) but is deliberately not selected, so the toolbar stays on the
  // original rather than jumping to the copy.
  duplicateNode: (id) => {
    get().takeSnapshot();
    const newId = makeId();
    set(s => {
      const orig = s.nodes.find(n => n.id === id);
      if (!orig) return s;
      const spawn = findFreeSpawnPosition(s.nodes, { x: orig.position.x + 30, y: orig.position.y + 30 });
      return {
        nodes: [...s.nodes, {
          ...orig,
          id: newId,
          position: spawn,
          selected: false,
          data: { ...orig.data },
        }],
      };
    });
    return newId;
  },

  // Bulk actions (SelectedNodesToolbar, ported from React_Flow_Pro's own
  // selection-grouping-pro-example) — checked that example directly first;
  // its SelectedNodesToolbar.tsx shows the pattern (a NodeToolbar keyed to
  // an ARRAY of ids, not one), but its own onGroup/detach live inline in the
  // component against local useNodesState. This app's node mutations belong
  // in the store like every other action here, so they're ported as store
  // actions instead — same store-centric adaptation already used for
  // takeSnapshot in Stage 3's undo/redo port.
  duplicateNodes: (ids) => {
    get().takeSnapshot();
    set(s => {
      let spawnPool = s.nodes;
      const clones = [];
      for (const id of ids) {
        const orig = s.nodes.find(n => n.id === id);
        if (!orig) continue;
        const spawn = findFreeSpawnPosition(spawnPool, { x: orig.position.x + 30, y: orig.position.y + 30 });
        const clone = { ...orig, id: makeId(), position: spawn, selected: false, data: { ...orig.data } };
        clones.push(clone);
        spawnPool = [...spawnPool, clone]; // each new clone also counts as "occupied" for the next one
      }
      return { nodes: [...s.nodes, ...clones] };
    });
  },

  // Same detach-before-remove logic as handleDeleteSelected/handleDetachSelected
  // in BpmnCanvas.jsx (a pool has no parent of its own in this app's
  // single-level model, so its own position is already absolute) — applied
  // across an arbitrary set of ids instead of exactly one, and cascades
  // connected edges the same way deleteElements does for the single case.
  deleteNodes: (ids) => {
    get().takeSnapshot();
    set(s => {
      const idSet = new Set(ids);
      const nextNodes = s.nodes
        .filter(n => !idSet.has(n.id))
        .map(n => {
          if (!n.parentId || !idSet.has(n.parentId)) return n;
          const parentAbs = s.nodes.find(p => p.id === n.parentId)?.position ?? { x: 0, y: 0 };
          const { parentId, extent, ...rest } = n;
          return { ...rest, position: { x: n.position.x + parentAbs.x, y: n.position.y + parentAbs.y } };
        });
      return {
        nodes: nextNodes,
        edges: s.edges.filter(e => !idSet.has(e.source) && !idSet.has(e.target)),
      };
    });
  },

  // Wraps the selected nodes in a new Pool sized to their combined bounds —
  // the same "Group selected nodes" action selection-grouping-pro-example
  // offers, adapted to this app's own Pool concept (Stage 1) rather than its
  // bare group node. bounds comes from the caller's own getNodesBounds()
  // (a useReactFlow hook, unavailable inside a plain store action).
  groupSelectedIntoPool: (ids, bounds) => {
    get().takeSnapshot();
    const groupId = makeId();
    const PADDING = 40;
    set(s => {
      const groupPos = { x: bounds.x - PADDING, y: bounds.y - PADDING };
      const groupNode = {
        id: groupId, type: 'group', position: groupPos,
        style: { width: bounds.width + PADDING * 2, height: bounds.height + PADDING * 2 },
        data: { label: 'Pool' },
      };
      const idSet = new Set(ids);
      const nextNodes = s.nodes.map(n => (idSet.has(n.id)
        ? { ...n, position: { x: n.position.x - groupPos.x, y: n.position.y - groupPos.y }, parentId: groupId, extent: 'parent', selected: false }
        : n));
      return { nodes: [groupNode, ...nextNodes].sort(sortForHierarchy) };
    });
  },

  // A reset clears history rather than snapshotting into it — "start over"
  // shouldn't leave the old diagram one Ctrl+Z away from silently
  // resurrecting, which is what treating it as just another undoable action
  // would do.
  resetAll: () => set({
    nodes: initialNodes.map(n => ({ ...n })),
    edges: initialEdges.map(e => ({ ...e })),
    history: { past: [], future: [] },
    activeEdgeToolbarId: null,
  }),
}));
