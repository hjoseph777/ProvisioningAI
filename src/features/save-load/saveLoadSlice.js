// Save/load slice — Phase B, position 3 of the CLAUDE.md/progress.md
// 2026-08-21 architecture, moved up ahead of the remaining Phase A
// relocations (operator decision) since Process Docs has zero persistence
// today (Phase 0 finding) and nodes/edges are already in their final slice
// shape, so there's no risk of wiring this twice.
//
// Follows reactflow.dev's own free "Save and Restore" pattern: toObject()
// captures {nodes, edges, viewport} from the live ReactFlow instance
// (called in BpmnCanvas.jsx, the only place useReactFlow() is reachable —
// a plain Zustand action can't call a React hook), setNodes/setEdges
// restore it. JSON file download/open, no database, no localStorage
// auto-persistence — every reload still starts from the starter sketch
// (nodesSlice.js/edgesSlice.js's own initialNodes/initialEdges) unless the
// operator explicitly loads a saved file.
export const createSaveLoadSlice = (set, get) => ({
  // window.file.save (Electron only — exposed by preload.cjs) routes through
  // a real native Save-As dialog + fs.writeFile in the main process, the
  // same mechanism Studio's own SOW export already uses successfully.
  // Needed because the Blob + <a download> path below (still used for the
  // browser) was confirmed, live, to never complete inside Electron: the
  // download's own DownloadItem gets created and receives the full byte
  // content but never reaches a "completed" state, even when bypassing
  // Electron's native Save-As dialog entirely with an explicit
  // item.setSavePath() — see progress.md's 2026-08-22 "WORKSTREAM 1 —
  // Electron" entry for the full diagnosis. Returns { ok, filePath } |
  // { ok:false, cancelled:true } either way, so the caller (BpmnCanvas.jsx)
  // can distinguish a real cancel from a real save without guessing.
  saveToFile: async (flow) => {
    const json = JSON.stringify(flow, null, 2);
    const defaultName = `process-docs-${Date.now()}.json`;
    if (window.file?.save) {
      return window.file.save({
        content: json,
        defaultName,
        filters: [{ name: 'JSON', extensions: ['json'] }, { name: 'All Files', extensions: ['*'] }],
      });
    }
    const blob = new Blob([json], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = defaultName;
    a.click();
    URL.revokeObjectURL(a.href);
    return { ok: true };
  },

  // Undoable — matches handleImportBpmnFile's own precedent ("before
  // replacing the canvas, so an unwanted import is one Ctrl+Z away from
  // undone"), not resetAll's history-clearing behavior, since loading a
  // saved file replaces current content rather than starting over.
  // Returns the saved viewport so the caller (which alone has access to
  // useReactFlow().setViewport) can restore pan/zoom; a component-level
  // fallback (fitView) covers older save files with no viewport recorded.
  loadFromFile: async (file) => {
    const text = await file.text();
    const flow = JSON.parse(text);
    get().takeSnapshot();
    get().setNodes(flow.nodes || []);
    get().setEdges(flow.edges || []);
    return flow.viewport;
  },
});
