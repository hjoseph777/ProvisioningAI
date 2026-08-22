import { NodeResizer } from '@xyflow/react';

// Registered as the 'group' node type (BpmnCanvas.jsx's nodeTypes) — React
// Flow's own built-in GroupNode renders nothing at all (confirmed from
// @xyflow/react's source: `function GroupNode() { return null; }`), so
// overriding it is the framework's own intended customization path, not a
// risky override of real built-in behavior.
//
// Sizing is NOT owned here — node.style.width/height (set by addPool in
// nodesSlice.js) is applied by React Flow directly to the outer
// .react-flow__node wrapper; this component only fills that box (100%),
// matching how the Pro example's own group node is sized purely via style,
// with nothing rendered inside it at all by default.
//
// The vertical left-edge label strip is real BPMN Pool convention (bpmn.io
// renders pool/lane names the same way), not an invented layout — chosen
// over a top header bar specifically because this canvas already states it
// "deliberately uses real BPMN vocabulary" elsewhere (GatewayNode.jsx).
//
// NodeResizer is React Flow's own built-in resize-handle component (not
// custom-built) — a Pool was created at a fixed 420x260 with no way to grow
// it, so a workflow that didn't fit simply couldn't fit. Only shown while
// selected, matching the component's own documented convention (an
// always-visible resize frame on an unselected node reads as noise).
// minWidth/minHeight keep it from shrinking below room for one task node.
// Manual resize is the direct-control half of "make it fit"; the other
// half — a Pool auto-growing when a node is dragged in that doesn't
// currently fit — lives in BpmnCanvas.jsx's onNodeDragStop, not here.
export default function PoolNode({ data, selected }) {
  return (
    <>
      <NodeResizer
        minWidth={160}
        minHeight={120}
        isVisible={selected}
        handleClassName="bpmn-pool-resize-handle"
        lineClassName="bpmn-pool-resize-line"
      />
      <div className="bpmn-pool">
        <div className="bpmn-pool-label">
          <span>{data?.label || 'Pool'}</span>
        </div>
      </div>
    </>
  );
}
