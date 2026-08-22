// History slice — Phase A, step 4 of the CLAUDE.md/progress.md 2026-08-21
// architecture. Relocated/refactored out of useBpmnStore.js's own flat
// history state + undo/redo actions — already a real, working port of
// 17_undo-redo-pro-example (confirmed via this codebase's own citing
// comments before this move), not re-ported from the zip a second time.
//
// Undo/redo (Stage 3, React Flow Pro enhancements) — checked undo-redo-pro-
// example directly first. It's a snapshot-based history (push the whole
// {nodes, edges} pair before each mutating action — not a diff/reducer),
// following redux.js.org's own "implementing undo history" pattern, capped
// at MAX_HISTORY entries. Two real things the example got wrong, not
// ported: its canUndo/canRedo are inverted (`disabled={canUndo}` in its own
// App.tsx — canUndo is true when there's nothing to undo), fixed here to
// mean what the name says; and its keydown listener has no input-focus
// guard, which the demo never needed (no text fields in it) but this canvas
// has real ones (search, label edit) where Ctrl+Z should do the browser's
// own native text-undo, not blow away canvas state — that guard lives in
// BpmnCanvas.jsx's own keydown handler, unaffected by this relocation.
//
// Being a full-array snapshot rather than a diff is also why Stage 1's
// pool-relative-position model needs no special handling here (unlike
// Stage 2's helper lines, which had to actively compare coordinate spaces):
// restoring a snapshot just puts back the exact same node objects —
// parentId, relative position, extent — with no coordinate translation
// anywhere, so it's correct by construction, not by accident.
const MAX_HISTORY = 100;

export const createHistorySlice = (set) => ({
  history: { past: [], future: [] },

  // Called at the START of a mutating action (before the mutation itself),
  // exactly like the Pro example's own takeSnapshot — captures what should
  // be restored TO, not the result of the action about to happen. Called
  // from every other feature slice's own mutating actions (nodesSlice,
  // edgesSlice, saveLoadSlice, layoutSlice, ...) via get().takeSnapshot() —
  // cross-slice, but safe, since Zustand's combined store gives every
  // slice's actions access to the full state regardless of which slice
  // originally defined an action.
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
});
