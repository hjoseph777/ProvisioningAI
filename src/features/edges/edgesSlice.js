import { applyEdgeChanges, addEdge, reconnectEdge as xyReconnectEdge } from '@xyflow/react';
import { makeId } from '../../store/makeId';
import { Algorithm } from './EditableEdge/constants';

// Edges slice — Phase A, step 3 of the CLAUDE.md/progress.md 2026-08-21
// architecture. Relocated/refactored out of useBpmnStore.js's own flat
// edges state + edge CRUD actions — FlowEdge.jsx is a real, BPMN-semantic
// edge (its `label` round-trips to bpmn:SequenceFlow.name via
// bpmnModdle.js, confirmed by reading that file directly before this move),
// not a fresh port from 04_dynamic-layouting-pro-example's generic edge
// pair. This step relocates FlowEdge's supporting store state; 05's
// editable-edge and 10's libavoid routing get ADDED as additional
// selectable edge types alongside FlowEdge in a later pass — not a
// replacement.
//
// Scope note: animateFlow/setAnimateFlow and connectorStyle/setConnectorStyle
// stay in useBpmnStore.js's root for now, even though FlowEdge.jsx (the
// component this slice supports) reads both directly — same precedent as
// nodesSlice.js leaving businessView in the root despite TaskNode/EventNode
// reading it directly. Both are whole-canvas display-mode toggles, not
// edge-array state, and BpmnPalette's connector-style picker also depends
// on connectorStyle — moving them isn't needed for this pass.
export const initialEdges = [
  { id: 'bp-e1', source: 'bp-start',   target: 'bp-intake' },
  { id: 'bp-e2', source: 'bp-intake',  target: 'bp-gate' },
  { id: 'bp-e3', source: 'bp-gate',    target: 'bp-approve', label: 'valid' },
  { id: 'bp-e4', source: 'bp-gate',    target: 'bp-reject',  label: 'invalid' },
  { id: 'bp-e5', source: 'bp-approve', target: 'bp-end' },
  { id: 'bp-e6', source: 'bp-reject',  target: 'bp-end' },
];

export const createEdgesSlice = (set, get) => ({
  edges: initialEdges,
  activeEdgeToolbarId: null,

  onEdgesChange: (changes) => set(s => ({ edges: applyEdgeChanges(changes, s.edges) })),
  onConnect: (connection) => {
    get().takeSnapshot(); // matches the Pro example's own onConnect — undoable edge creation
    set(s => ({ edges: addEdge(connection, s.edges) }));
  },
  reconnectEdge: (oldEdge, newConnection) => {
    get().takeSnapshot();
    set(s => ({ edges: xyReconnectEdge(oldEdge, newConnection, s.edges) }));
  },
  setActiveEdgeToolbarId: (activeEdgeToolbarId) => set({ activeEdgeToolbarId }),
  setEdges: (edges) => set({ edges }),

  // Edge label is real BPMN structural data (exports as SequenceFlow@name,
  // confirmed directly in bpmnModdle.js's toBpmnDefinitions: `name: edge.label
  // || undefined`). Comment is an internal annotation only and intentionally
  // never read anywhere in bpmnModdle.js — confirmed absent from its export
  // path after this move, not just assumed carried over. Both update per
  // keystroke, so snapshot once from UI focus (FlowEdge.jsx), not here.
  updateEdgeLabel: (id, label) => set(s => ({
    edges: s.edges.map(e => (e.id === id ? { ...e, label } : e)),
  })),
  updateEdgeComment: (id, comment) => set(s => ({
    edges: s.edges.map(e => (e.id === id ? { ...e, comment } : e)),
  })),

  // Additive edge-type switching (05_editable-edge, 10_libavoid-edge-routing)
  // — FlowEdge stays the default; this only fires from the edge right-click
  // menu's "Edge type" submenu. Seeds the data shape each new type expects
  // the first time an edge switches to it, so EditableEdge/RoutableEdge
  // never render against undefined data. Switching back to flowEdge leaves
  // any prior points/algorithm data in place, unused — harmless, and lets a
  // round-trip back to editable-edge restore the same control points.
  setEdgeType: (id, type) => {
    get().takeSnapshot();
    set(s => ({
      edges: s.edges.map(e => {
        if (e.id !== id || e.type === type) return e;
        let data = e.data;
        if (type === 'editable-edge' && !data?.points) {
          data = { ...data, points: [], algorithm: Algorithm.BezierCatmullRom };
        }
        return { ...e, type, data };
      }),
    }));
  },

  // EditableEdge's own state-mutation contract (ControlPoint.tsx/
  // ControlAnchor.tsx call this with an updater function, not a value) —
  // backs the same `setControlPoints` shape the ported 05_editable-edge
  // example built around useReactFlow().setEdges, just against this store
  // instead. Not undo-snapshotted per drag frame (would spam history);
  // matches this app's existing convention of snapshotting once at drag
  // start elsewhere (onNodeDragStart), not on every pointermove.
  updateEdgeControlPoints: (id, computePoints) => set(s => ({
    edges: s.edges.map(e => (e.id === id
      ? { ...e, data: { ...e.data, points: computePoints(e.data?.points ?? []) } }
      : e)),
  })),

  // useLibavoid.ts's own routing pass, applied in one batch (it recomputes
  // every routable-edge's path together per libavoid's own transaction
  // model, not edge-by-edge) — takes a Map<edgeId, points[]>, same imperative
  // getState()-call pattern as the rest of that hook's store access since it
  // runs inside a useEffect, not a render.
  setEdgeRoutePoints: (routesById) => set(s => ({
    edges: s.edges.map(e => (routesById.has(e.id)
      ? { ...e, data: { ...e.data, points: routesById.get(e.id) } }
      : e)),
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
});
