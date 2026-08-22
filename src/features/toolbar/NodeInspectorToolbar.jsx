import { useEffect } from 'react';
import { NodeToolbar, Position } from '@xyflow/react';
import { useBpmnStore } from '../../store/useBpmnStore';

// Relocated out of BpmnCanvas.jsx (Phase D's floating per-node toolbar) —
// Edit/Duplicate/Detach/Delete on whatever single node is selected; Edit
// expands an inline inspector scoped to id/type (read-only) + label
// (editable), per Decision 7 — no script/action-body editing lives here.
// Same relocate-not-report discipline as every prior step: this is real,
// working Phase D code, not a stub.
//
// Detach/Delete stay as props from BpmnCanvas.jsx rather than moving into
// this file or a store action — both need useReactFlow() hook methods
// (getInternalNode, deleteElements) a plain component/store action can't
// call, same reason fitView()/toObject() stayed component-side for
// auto-arrange/save-load. Duplicate needs no such hook (duplicateNode is a
// plain store action), so it's called directly here instead of threading a
// third prop for no reason.
function typeLabelFor(node) {
  if (!node) return '';
  if (node.type === 'gateway') {
    const gt = node.data?.gatewayType || 'exclusive';
    return `${gt[0].toUpperCase()}${gt.slice(1)} Gateway`;
  }
  if (node.type === 'input' || node.type === 'output') {
    const kind = node.type === 'input' ? 'Start' : 'End';
    const def = node.data?.eventDefinition;
    return def ? `${def[0].toUpperCase()}${def.slice(1)} ${kind} Event` : `${kind} Event`;
  }
  const bpmnType = node.data?.bpmnType;
  return bpmnType ? bpmnType.replace(/^bpmn:/, '').replace(/([a-z])([A-Z])/g, '$1 $2') : 'Task';
}

export default function NodeInspectorToolbar({ onDetach, onDelete }) {
  const nodes = useBpmnStore(s => s.nodes);
  const selectedNodes = nodes.filter(n => n.selected);
  // Single-selection only — SelectedNodesToolbar (bulk actions) takes over
  // at 2+, same precedent as BpmnCanvas.jsx's own original selectedNode
  // derivation.
  const selectedNode = selectedNodes.length === 1 ? selectedNodes[0] : undefined;

  const activeNodeToolbarId = useBpmnStore(s => s.activeNodeToolbarId);
  const inspectorOpen = useBpmnStore(s => s.inspectorOpen);
  const setInspectorOpen = useBpmnStore(s => s.setInspectorOpen);
  const businessView = useBpmnStore(s => s.businessView);
  const updateNodeLabel = useBpmnStore(s => s.updateNodeLabel);
  const takeSnapshot = useBpmnStore(s => s.takeSnapshot);
  const duplicateNode = useBpmnStore(s => s.duplicateNode);

  // Reset whenever the selection changes, so the inspector doesn't stay
  // open-by-default on a newly selected node the user hasn't asked to edit.
  useEffect(() => { setInspectorOpen(false); }, [selectedNode?.id, setInspectorOpen]);

  return (
    <NodeToolbar
      nodeId={selectedNode?.id}
      isVisible={!!selectedNode && activeNodeToolbarId === selectedNode.id}
      position={Position.Top}
      offset={14}
    >
      <div className="bpmn-node-toolbar">
        <div className="bpmn-node-toolbar-actions">
          <button
            type="button"
            className={inspectorOpen ? 'active' : ''}
            onClick={() => setInspectorOpen(v => !v)}
            title="Edit this element"
          >
            ✎ Edit
          </button>
          <button type="button" onClick={() => selectedNode && duplicateNode(selectedNode.id)} title="Duplicate this element">⧉ Duplicate</button>
          {selectedNode?.parentId && (
            <button type="button" onClick={onDetach} title="Detach from its pool">⇱ Detach</button>
          )}
          <button type="button" onClick={onDelete} title="Delete this element">✕ Delete</button>
        </div>
        {inspectorOpen && selectedNode && (
          <div className="bpmn-node-inspector" onClick={(e) => e.stopPropagation()}>
            {/* Business view hides ID/Type — "technical labels/IDs" per Phase
                E's own spec — Label is what a business reader actually cares
                about and stays either way. */}
            {!businessView && (
              <>
                <div className="bpmn-node-inspector-row"><span>ID</span><code>{selectedNode.id}</code></div>
                <div className="bpmn-node-inspector-row"><span>Type</span><code>{typeLabelFor(selectedNode)}</code></div>
              </>
            )}
            <div className="bpmn-node-inspector-row">
              <span>Label</span>
              <input
                value={selectedNode.data?.label || ''}
                autoFocus
                onFocus={takeSnapshot}
                onChange={(e) => updateNodeLabel(selectedNode.id, e.target.value)}
                placeholder="(none)"
              />
            </div>
          </div>
        )}
      </div>
    </NodeToolbar>
  );
}
