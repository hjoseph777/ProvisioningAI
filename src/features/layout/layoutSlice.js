import { layoutWithDagre } from './bpmnAutoLayout';

// Layout slice — Phase A, step 5 of the CLAUDE.md/progress.md 2026-08-21
// architecture. Relocated/refactored out of BpmnCanvas.jsx's own local
// autoArrange callback (which was never a store action to begin with) —
// dagre-based, already a real working port of 01_auto-layout-pro-example
// (bpmnAutoLayout.js, moved alongside this slice into the same feature
// folder), not re-ported from the zip a second time.
//
// fitView() is NOT included here — it's a useReactFlow() hook method, only
// reachable from inside a component, the same reason toObject()/setViewport
// stayed in BpmnCanvas.jsx for save-load's slice. BpmnCanvas.jsx wraps this
// action and calls fitView() itself immediately after, preserving the exact
// prior behavior (layout, then fit the view once the new positions have
// actually painted).
export const createLayoutSlice = (set, get) => ({
  autoArrange: () => {
    get().takeSnapshot();
    set(s => ({ nodes: layoutWithDagre(s.nodes, s.edges) }));
  },
});
