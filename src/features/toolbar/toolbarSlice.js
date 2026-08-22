// Toolbar slice — Phase A, toolbar step of the CLAUDE.md/progress.md
// 2026-08-21 architecture. Relocated out of BpmnCanvas.jsx's own local
// `useState` pair (activeNodeToolbarId, inspectorOpen) — moved into the
// store for the same reason activeEdgeToolbarId already lives here: both
// are read/written from multiple places across BpmnCanvas.jsx (click,
// double-click, context-menu, pane-click, edge-click handlers), not just
// from the toolbar's own JSX, so a plain component-local useState can't be
// reached by the newly-extracted NodeInspectorToolbar.jsx without prop
// threading through every one of those call sites.
export const createToolbarSlice = (set) => ({
  activeNodeToolbarId: null,
  setActiveNodeToolbarId: (activeNodeToolbarId) => set({ activeNodeToolbarId }),

  // Same dual updater-or-value signature as React's own setState, since the
  // toolbar's Edit button calls this with an updater (`v => !v`) — preserving
  // that call site unchanged rather than rewriting it to pass an explicit
  // boolean.
  inspectorOpen: false,
  setInspectorOpen: (updater) => set((s) => ({
    inspectorOpen: typeof updater === 'function' ? updater(s.inspectorOpen) : updater,
  })),
});
