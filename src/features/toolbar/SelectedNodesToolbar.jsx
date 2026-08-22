import { NodeToolbar, Position, useReactFlow } from '@xyflow/react';
import { useBpmnStore } from '../../store/useBpmnStore';

// Ported from React_Flow_Pro/selection-grouping-pro-example's own
// SelectedNodesToolbar.tsx — checked directly first. Faithful to the source
// for the core idea: NodeToolbar accepts an ARRAY of node ids, not just one,
// and positions itself centered over all of them automatically — this app's
// existing per-node NodeToolbar (BpmnCanvas.jsx) never needed that since it
// only ever anchors to a single selected node.
//
// Not faithful in two ways, both deliberate: the example's own bulk action
// is "Group selected nodes" into its own bare group node; here it groups
// into this app's real Pool (Stage 1) instead, since that's the container
// concept that already exists. And Duplicate/Delete are added — the
// example's demo only has Group, but this app already offers Duplicate and
// Delete per-node (the floating NodeToolbar), so the bulk toolbar offers the
// same set for consistency, not just what the example happened to show.
export default function SelectedNodesToolbar() {
  const { getNodesBounds } = useReactFlow();
  // Subscribe to the raw, reference-stable `nodes` array (same pattern
  // BpmnCanvas.jsx itself uses) and derive the filtered list afterward in
  // plain component code — NOT inside the Zustand selector itself. A
  // selector that returns a freshly-`.filter()`-ed array every call (a new
  // reference each time even when nothing relevant changed) breaks
  // useSyncExternalStore's snapshot-caching contract underneath Zustand,
  // which is what was actually crashing the whole tree on mount (confirmed
  // by bisecting: removing just this component fixed it, with zero
  // console output either way — react's own "getSnapshot should be cached"
  // error for exactly this anti-pattern can be swallowed silently in some
  // paths, which is why nothing showed up in the console here).
  //
  // Top-level selections only (excludes a pool's own children) — same
  // exclusion the Pro example's own selector uses, so selecting stuff
  // inside a pool doesn't also try to nest that pool into a new one.
  const nodes = useBpmnStore(s => s.nodes);
  const selectedNodes = nodes.filter(n => n.selected && !n.parentId);
  const duplicateNodes = useBpmnStore(s => s.duplicateNodes);
  const deleteNodes = useBpmnStore(s => s.deleteNodes);
  const groupSelectedIntoPool = useBpmnStore(s => s.groupSelectedIntoPool);

  if (selectedNodes.length < 2) return null;

  const ids = selectedNodes.map(n => n.id);
  const hasPool = selectedNodes.some(n => n.type === 'group');
  // Swapped for the same "Wrap Workflow in Pool" action the right-click
  // pane menu offers — wraps every top-level node, not just this specific
  // selection. Still only appears once 2+ things are selected (the
  // toolbar's own visibility gate above), but the action itself no longer
  // depends on exactly what's selected, matching the pane menu's version.
  const wrappable = nodes.filter(n => !n.parentId);

  return (
    <NodeToolbar nodeId={ids} isVisible position={Position.Top} offset={14} className="bpmn-node-toolbar">
      <div className="bpmn-node-toolbar-actions">
        <span className="bpmn-bulk-count">{ids.length} selected</span>
        {!hasPool && (
          <button type="button" onClick={() => groupSelectedIntoPool(wrappable.map(n => n.id), getNodesBounds(wrappable))} title={`Wrap all ${wrappable.length} elements into one Pool`}>
            ▥ Wrap Workflow in Pool
          </button>
        )}
        <button type="button" onClick={() => duplicateNodes(ids)} title="Duplicate all selected elements">⧉ Duplicate</button>
        <button type="button" onClick={() => deleteNodes(ids)} title="Delete all selected elements">✕ Delete</button>
      </div>
    </NodeToolbar>
  );
}
