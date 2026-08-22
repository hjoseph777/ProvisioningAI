import { useEffect, useState } from 'react';
import { BaseEdge, EdgeLabelRenderer, getSmoothStepPath, getStraightPath, getBezierPath } from '@xyflow/react';
import { MessageSquare } from 'lucide-react';
import { useBpmnStore } from '../../store/useBpmnStore';
import { DOT_DEFAULTS } from '../../utils/edgeDotAnimation';

// Whole-canvas connector-style picker (Connectors group, palette) — these are
// React Flow's own exported path-generator functions, the same ones its
// built-in 'step'/'straight'/'bezier' edge types use internally. Switching
// which one FlowEdge calls, rather than switching to those built-in edge
// types directly, is what keeps the pill label (labelBg* below) and the
// animated flow dot working under Straight/Curved too — the built-ins don't
// know about either. All three return the same [path, labelX, labelY, ...]
// tuple shape, so the destructure below needs no per-style branching.
const PATH_FN = { orthogonal: getSmoothStepPath, straight: getStraightPath, curved: getBezierPath };
const ORTHO_INTERACTION_CHORD = 140;
const LABEL_INTERACTION_WIDTH = 96;
const LABEL_INTERACTION_HEIGHT = 44;

// No TriggerMode-equivalent concept exists on this canvas at all (documentation-
// only, no engine behind it) — so unlike the M-Files canvas, there's no honest
// automatic/manual distinction to draw between edges; animateFlow stays purely
// decorative in that sense, not a claim BPMN Standard makes about any edge.
//
// The dot's COLOR, added 2026-08-22, is a separate thing: it reads the edge's
// own real `label` text (the same free-text field the right-click menu's
// "transition name" sets — e.g. this canvas's own starter sketch already
// ships "valid"/"invalid" on its two branch edges) rather than inventing new
// data. Confirmed with the operator this should key off branch-outcome
// wording specifically, not edge type or a distinct-color-per-path scheme.
// Since the label is free text, not an enum, this is necessarily a keyword
// match, not an exhaustive classification — anything that doesn't match
// falls back to the same green every dot used before this change, so an
// unlabeled or non-outcome-worded edge (most of them, on most diagrams)
// looks exactly as it did previously.
function branchDotColor(label) {
  const text = (typeof label === 'string' ? label : '').toLowerCase();
  if (/\b(invalid|reject|rejected|denied?|fail(ed)?|no)\b/.test(text)) return 'var(--red)';
  if (/\b(valid|approve[d]?|accept(ed)?|yes|ok)\b/.test(text)) return 'var(--green)';
  return 'var(--green)';
}

export default function FlowEdge({ id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, style, markerEnd, label, selected }) {
  const animateFlow = useBpmnStore(s => s.animateFlow);
  const connectorStyle = useBpmnStore(s => s.connectorStyle);
  const updateEdgeLabel = useBpmnStore(s => s.updateEdgeLabel);
  const updateEdgeComment = useBpmnStore(s => s.updateEdgeComment);
  const duplicateEdge = useBpmnStore(s => s.duplicateEdge);
  const deleteEdge = useBpmnStore(s => s.deleteEdge);
  const activeEdgeToolbarId = useBpmnStore(s => s.activeEdgeToolbarId);
  const takeSnapshot = useBpmnStore(s => s.takeSnapshot);
  const comment = useBpmnStore(s => s.edges.find(e => e.id === id)?.comment || '');
  const [panel, setPanel] = useState(null); // null | 'edit' | 'comment'

  useEffect(() => {
    if (!selected) setPanel(null);
  }, [selected]);
  // Report finding: editing a branch label took select -> double-click ->
  // click "Edit" -> type — 4 clicks before you could type a single
  // character. activeEdgeToolbarId only ever becomes this edge's id via a
  // double-click (BpmnCanvas.jsx's handleEdgeDoubleClick), so reacting to
  // that directly collapses it to double-click -> type, matching bpmn.io/
  // Camunda Modeler's own "double-click the label" convention. The manual
  // ✎ Edit / 💬 Comment toggle buttons below are untouched — this only
  // changes what's already open the instant the toolbar appears.
  useEffect(() => {
    if (activeEdgeToolbarId === id) setPanel('edit');
  }, [activeEdgeToolbarId, id]);
  // labelX/labelY were being discarded — BaseEdge's label prop needs them to
  // know where to draw the label, so the "valid"/"invalid" branch labels were
  // never actually rendering at all (confirmed: 0 label elements in the live
  // DOM), not just poorly styled.
  const pathFn = PATH_FN[connectorStyle] || getSmoothStepPath;
  const [path, labelX, labelY] = pathFn({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition });

  return (
    <>
      {connectorStyle === 'orthogonal' && (
        <>
          <path
            d={`M${sourceX},${sourceY} L${targetX},${targetY}`}
            fill="none"
            stroke="transparent"
            strokeWidth={ORTHO_INTERACTION_CHORD}
            className="react-flow__edge-interaction"
          />
          <path
            d={`M${Math.min(sourceX, targetX)},${(sourceY + targetY) / 2} L${Math.max(sourceX, targetX)},${(sourceY + targetY) / 2}`}
            fill="none"
            stroke="transparent"
            strokeWidth={ORTHO_INTERACTION_CHORD}
            className="react-flow__edge-interaction"
          />
        </>
      )}
      {label && (
        <path
          d={`M${labelX - LABEL_INTERACTION_WIDTH / 2},${labelY} L${labelX + LABEL_INTERACTION_WIDTH / 2},${labelY}`}
          fill="none"
          stroke="transparent"
          strokeWidth={LABEL_INTERACTION_HEIGHT}
          className="react-flow__edge-interaction"
        />
      )}
      {/* labelBgBorderRadius/labelBgPadding are BaseEdge's own built-in
          customization points (forwarded straight to its internal EdgeText
          rect) — a pill badge, not a custom label component, matching the
          rounded-pill treatment already used on Start/End nodes and status
          badges elsewhere in the app. Long lines existed partly to make room
          for floating text; pills let nodes sit closer together. */}
      <BaseEdge
        id={id}
        path={path}
        markerEnd={markerEnd}
        style={style}
        label={label}
        labelX={labelX}
        labelY={labelY}
        labelBgPadding={[8, 4]}
        labelBgBorderRadius={20}
        interactionWidth={60}
      />
      {comment && (
        <EdgeLabelRenderer>
          <div
            className="nodrag nopan bpmn-edge-comment-badge"
            style={{ transform: `translate(-50%, -100%) translate(${labelX}px,${labelY - (label ? 20 : 8)}px)` }}
            title={comment}
          >
            <MessageSquare size={10} strokeWidth={2.2} />
          </div>
        </EdgeLabelRenderer>
      )}
      {selected && activeEdgeToolbarId === id && (
        <EdgeLabelRenderer>
          <div
            className="nodrag nopan bpmn-edge-toolbar"
            style={{ transform: `translate(-50%, -100%) translate(${labelX}px,${labelY - 14}px)` }}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bpmn-node-toolbar">
              <div className="bpmn-node-toolbar-actions">
                <button type="button" className={panel === 'edit' ? 'active' : ''} onClick={() => setPanel(panel === 'edit' ? null : 'edit')} title="Edit structural condition label">✎ Edit</button>
                <button type="button" className={panel === 'comment' ? 'active' : ''} onClick={() => setPanel(panel === 'comment' ? null : 'comment')} title="Edit internal comment (not exported)">💬 Comment</button>
                <button type="button" onClick={() => duplicateEdge(id)} title="Duplicate edge between same source and target">⧉ Duplicate</button>
                <button type="button" onClick={() => deleteEdge(id)} title="Delete edge">✕ Delete</button>
              </div>
              {panel === 'edit' && (
                <div className="bpmn-node-inspector">
                  <div className="bpmn-node-inspector-row">
                    <span>Label</span>
                    <input
                      value={label || ''}
                      autoFocus
                      onFocus={takeSnapshot}
                      onChange={(e) => updateEdgeLabel(id, e.target.value)}
                      placeholder="Condition label"
                    />
                  </div>
                </div>
              )}
              {panel === 'comment' && (
                <div className="bpmn-node-inspector">
                  <div className="bpmn-node-inspector-row">
                    <span>Comment</span>
                    <input
                      value={comment}
                      onFocus={takeSnapshot}
                      onChange={(e) => updateEdgeComment(id, e.target.value)}
                      placeholder="Internal note (excluded from BPMN XML)"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </EdgeLabelRenderer>
      )}
      {animateFlow && (() => {
        const dotColor = branchDotColor(label);
        return (
          <circle r={DOT_DEFAULTS.radius} className="edge-flow-dot" fill={dotColor} style={{ color: dotColor }}>
            <animateMotion dur={`${DOT_DEFAULTS.duration}s`} repeatCount="indefinite" rotate="auto">
              <mpath href={`#${id}`} />
            </animateMotion>
          </circle>
        );
      })()}
    </>
  );
}
