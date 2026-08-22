// Palette slice — Phase A, step 1 of the CLAUDE.md/progress.md 2026-08-21
// architecture. Relocated/refactored from BpmnPalette.jsx's own local
// `useState(search)` and BpmnCanvas.jsx's own local `palettePinned` state
// (previously prop-drilled in as `pinned`/`onTogglePinned`) — not a fresh
// port from 16_shapes-pro-example, since BpmnPalette.jsx was already a real,
// working port of it.
//
// Composed into useBpmnStore.js alongside the other feature slices as they're
// relocated (Phase A), same slice-combination pattern React_Flow_Pro's own
// 02_collaborative-pro-example uses for its multi-slice store.
export const createPaletteSlice = (set) => ({
  // Default is unpinned — a 44px icon rail that overlays a 240px panel on
  // hover, so it doesn't cost canvas width just sitting there. Pinning is an
  // explicit opt-in for staying expanded, not the default.
  palettePinned: false,
  togglePalettePinned: () => set(s => ({ palettePinned: !s.palettePinned })),

  paletteSearch: '',
  setPaletteSearch: (paletteSearch) => set({ paletteSearch }),
});
