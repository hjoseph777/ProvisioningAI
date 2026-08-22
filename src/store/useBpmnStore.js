import { create } from 'zustand';
import { sortForHierarchy } from '../utils/bpmnPools';
import { createPaletteSlice } from '../features/palette/paletteSlice';
import { createNodesSlice, initialNodes } from '../features/nodes/nodesSlice';
import { createEdgesSlice, initialEdges } from '../features/edges/edgesSlice';
import { createSaveLoadSlice } from '../features/save-load/saveLoadSlice';
import { createHistorySlice } from '../features/history/historySlice';
import { createLayoutSlice } from '../features/layout/layoutSlice';
import { createBpmnIoSlice } from '../features/bpmn-io/bpmnIoSlice';
import { createToolbarSlice } from '../features/toolbar/toolbarSlice';
import { makeId } from './makeId';

// ── useBpmnStore ─────────────────────────────────────────────────
// Fully separate from useWorkflowStore, deliberately. This canvas is internal
// process documentation (the same role Cacoo serves today), not a second input
// path into the real product pipeline — it never reads or writes
// useWorkflowStore's workflows/groups/theme, and nothing in
// ProvisioningAI.Workflow/Translation/ or useExport.js ever reads this store.

// Re-exported from ./makeId (moved there so feature slices can import it
// without a circular dependency back on this module) — BpmnCanvas.jsx's
// magic-connector (Phase D) needs to mint an edge id for the edge it creates
// alongside a new node, same generator the store already uses for everything
// else, and its existing `import { useBpmnStore, makeId } from
// '../store/useBpmnStore'` keeps working unchanged.
export { makeId };

export const useBpmnStore = create((set, get) => ({
  // Feature slices, composed in as each one is relocated (Phase A of the
  // 2026-08-21 architecture) — same slice-combination pattern
  // 02_collaborative-pro-example uses for its own multi-slice store.
  ...createPaletteSlice(set, get),
  ...createNodesSlice(set, get),
  ...createEdgesSlice(set, get),
  ...createSaveLoadSlice(set, get),
  ...createHistorySlice(set, get),
  ...createLayoutSlice(set, get),
  ...createBpmnIoSlice(set, get),
  ...createToolbarSlice(set, get),

  // Off by default, every load — not persisted anywhere (no localStorage, no
  // persist middleware on this store), so a real page reload always starts
  // static. Lives here rather than as component-local state because FlowEdge
  // (a custom edge component, not a child of BpmnCanvas's own JSX) needs to
  // read it without prop-drilling through React Flow's edge-rendering internals.
  //
  // Stays in the root store, not edgesSlice.js, even though FlowEdge.jsx
  // reads it directly — same precedent as nodesSlice.js leaving businessView
  // here despite TaskNode/EventNode reading it directly. A whole-canvas
  // display toggle, not edge-array state.
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

  // Wraps the selected nodes in a new Pool sized to their combined bounds —
  // the same "Group selected nodes" action selection-grouping-pro-example
  // offers, adapted to this app's own Pool concept (Stage 1) rather than its
  // bare group node. bounds comes from the caller's own getNodesBounds()
  // (a useReactFlow hook, unavailable inside a plain store action).
  //
  // Not yet relocated into features/grouping/ — that's Phase A, step 6 of the
  // 2026-08-21 architecture. Left as-is here until then; addPool (creating a
  // single plain pool node) moved to nodesSlice.js in step 2, but wrapping an
  // existing selection into a pool is grouping-feature interaction, not node
  // creation, so it stays put for now.
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
