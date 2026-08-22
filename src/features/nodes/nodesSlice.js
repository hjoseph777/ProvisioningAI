import { applyNodeChanges } from '@xyflow/react';
import { makeId } from '../../store/makeId';

// Nodes slice — Phase A, step 2 of the CLAUDE.md/progress.md 2026-08-21
// architecture. Relocated/refactored out of useBpmnStore.js's own flat
// nodes state + node CRUD actions — GatewayNode.jsx/TaskNode.jsx/
// EventNode.jsx/PoolNode.jsx were already real, working node type
// components (not a fresh port from 16_shapes-pro-example's ShapeNode.tsx,
// per the full re-audit finding), so this step relocates their supporting
// store state, not the components' own rendering logic.
//
// Scope note: groupSelectedIntoPool (wrapping an existing selection into a
// new Pool) stays in useBpmnStore.js for now — that's grouping-feature
// interaction, not node creation, and is scoped for its own later
// relocation step (features/grouping/). addPool itself (creating one plain
// empty pool node) is ordinary node creation and belongs here, same as
// addTask/addGateway/etc.

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
// gateway in use on first load, not an empty canvas. Exported so
// useBpmnStore.js's resetAll (a cross-cutting whole-store action, not moved
// here) can still reset back to it.
export const initialNodes = [
  { id: 'bp-start',   type: 'input',  position: { x: 140, y: 0 },   data: { label: 'Start' } },
  { id: 'bp-intake',  position: { x: 100, y: 100 }, data: { label: 'Receive invoice' } },
  { id: 'bp-gate',    type: 'gateway', position: { x: 120, y: 220 }, data: { gatewayType: 'exclusive' } },
  { id: 'bp-approve', position: { x: 0,   y: 340 }, data: { label: 'Route to approver' } },
  { id: 'bp-reject',  position: { x: 240, y: 340 }, data: { label: 'Return to vendor' } },
  { id: 'bp-end',     type: 'output', position: { x: 140, y: 460 }, data: { label: 'End' } },
];

export const createNodesSlice = (set, get) => ({
  nodes: initialNodes,

  // Position/selection/dimension changes flow through onNodesChange on every
  // drag frame and every measurement — snapshotting here would flood history
  // with dozens of entries per gesture. BpmnCanvas.jsx snapshots once, on
  // onNodeDragStart, instead; setNodes stays snapshot-free for the same
  // reason — it's a low-level primitive multiple callers (drag, pool
  // reparenting, restore) use with different undo-granularity needs, not a
  // single semantic "action."
  onNodesChange: (changes) => set(s => ({ nodes: applyNodeChanges(changes, s.nodes) })),
  setNodes: (nodes) => set({ nodes }),

  // position defaults preserve exact prior click-to-add behavior — drag-and-drop
  // (BpmnCanvas.jsx's onDrop) is the only caller that ever passes a real one.
  // Each returns the new node's id — Phase D's magic connector needs it to
  // wire the auto-created edge; every pre-existing caller just ignores it.
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
  // Reads/writes s.edges directly even though edges themselves haven't been
  // relocated into their own slice yet (Phase A step 3) — Zustand's combined
  // store means every slice's set()/get() sees the full state regardless of
  // which slice defines an action, so this is safe and doesn't need to wait.
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
});
