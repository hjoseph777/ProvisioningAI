import { validateBpmnModel, importBpmnXml } from './bpmnModdle';

// BPMN import/export slice — Phase A, step 6 of the CLAUDE.md/progress.md
// 2026-08-21 architecture (operator direction moved this ahead of the
// remaining relocations, right after edges). Relocated out of
// BpmnCanvas.jsx's own handleExportBpmn/handleImportBpmnFile —
// bpmnModdle.js (real bpmn-moddle-backed schema-validated XML read/write)
// moved alongside this slice, unchanged, into the same feature folder.
//
// Blob download / file.text() read live here, same as saveToFile/
// loadFromFile in save-load's slice — neither needs a useReactFlow() hook.
// Only fitView()'s post-import viewport reset stays in BpmnCanvas.jsx, same
// reason autoArrange's fitView() call stayed there for layoutSlice.
export const createBpmnIoSlice = (set, get) => ({
  // Round-trips through fromXML first (validateBpmnModel, not exportBpmnXml)
  // so "0 warnings" back in the component means the file actually validates
  // against the real schema, not just that toXML didn't throw — same
  // guarantee handleExportBpmn always made.
  //
  // window.file.save (Electron only) routes through the same native Save-As
  // + fs.writeFile path saveToFile uses, for the same reason: the Blob + <a
  // download> path below (still the browser fallback) was confirmed, live,
  // to never complete inside Electron — see saveLoadSlice.js's matching
  // comment and progress.md's 2026-08-22 Electron entry for the full
  // diagnosis. Return shape changed from a bare `warnings` array to
  // { warnings, cancelled } so the caller can tell a real Save-As cancel
  // apart from a real export.
  exportBpmnFile: async () => {
    const { nodes, edges } = get();
    const { xml, warnings } = await validateBpmnModel(nodes, edges);
    const defaultName = `bpmn-standard-${Date.now()}.bpmn`;
    if (window.file?.save) {
      const result = await window.file.save({
        content: xml,
        defaultName,
        filters: [{ name: 'BPMN 2.0 XML', extensions: ['bpmn', 'xml'] }, { name: 'All Files', extensions: ['*'] }],
      });
      return { warnings, cancelled: !!result.cancelled };
    }
    const blob = new Blob([xml], { type: 'application/xml' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = defaultName;
    a.click();
    URL.revokeObjectURL(a.href);
    return { warnings, cancelled: false };
  },

  // Undoable — matches the prior component handler's own precedent ("before
  // replacing the canvas, so an unwanted import is one Ctrl+Z away from
  // undone"), same as save-load's loadFromFile.
  importBpmnFile: async (file) => {
    const text = await file.text();
    const { nodes: importedNodes, edges: importedEdges, warnings } = await importBpmnXml(text);
    get().takeSnapshot();
    get().setNodes(importedNodes);
    get().setEdges(importedEdges);
    return { count: importedNodes.length, warnings };
  },
});
