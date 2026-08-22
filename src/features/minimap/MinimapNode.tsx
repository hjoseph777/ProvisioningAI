import { useInternalNode, type MiniMapNodeProps } from '@xyflow/react';

// Ported from React_Flow_Pro/16_shapes-pro-example's minimap-node component —
// the only Pro example with a custom MiniMap nodeComponent (confirmed via the
// Phase 2 feature-matrix check before starting this file). That example
// renders each node's real on-canvas shape in the minimap (not a generic
// rect) by reading the node's actual type/data through useInternalNode().
// Adapted here to this canvas's real BPMN node types instead of 16_shapes'
// own generic shape palette (rect/diamond/circle/plus):
//   gateway        -> diamond, matching GatewayNode.jsx's own diamondPath
//   input (Start)  -> pill,    matching App.jsx's .react-flow__node-input
//   output (End)   -> pill,    matching App.jsx's .react-flow__node-output
//   group (Pool)   -> outline-only rect, no fill — a filled blob would read
//                     as a solid node, not the empty container it is
//   anything else (Task) -> rounded rect, matching App.jsx's
//                     .react-flow__node-default (border-radius:8px)
// Color is untouched by this file — <MiniMap nodeColor={minimapNodeColor}>
// (relocated as-is into minimapNodeColor.js, same folder) still does that
// job; MiniMap computes it per node and hands it down as the `color` prop
// below, exactly as before this step. Only the shape is new.
function diamondPoints(w: number, h: number) {
  return `${w / 2},0 ${w},${h / 2} ${w / 2},${h} 0,${h / 2}`;
}

const SELECTED_STROKE = '#4A9FFF';

export default function MinimapNode({ id, x, y, width, height, color, strokeColor, strokeWidth, selected }: MiniMapNodeProps) {
  const internalNode = useInternalNode(id);
  if (!internalNode) return null;

  const { type } = internalNode.internals.userNode;
  const className = selected ? 'react-flow__minimap-node selected' : 'react-flow__minimap-node';
  const stroke = selected ? SELECTED_STROKE : (strokeColor || 'none');
  const width_ = selected ? 2 : (strokeWidth || 0);

  if (type === 'gateway') {
    return (
      <polygon
        points={diamondPoints(width, height)}
        transform={`translate(${x}, ${y})`}
        fill={color}
        stroke={stroke}
        strokeWidth={width_}
        strokeLinejoin="round"
        className={className}
      />
    );
  }

  if (type === 'input' || type === 'output') {
    return (
      <rect
        x={x} y={y} width={width} height={height}
        rx={height / 2} ry={height / 2}
        fill={color}
        stroke={stroke}
        strokeWidth={width_}
        className={className}
      />
    );
  }

  if (type === 'group') {
    return (
      <rect
        x={x} y={y} width={width} height={height}
        rx={3} ry={3}
        fill="none"
        stroke={selected ? SELECTED_STROKE : 'rgba(255,255,255,0.25)'}
        strokeWidth={selected ? 2 : 1}
        className={className}
      />
    );
  }

  // Task (default)
  return (
    <rect
      x={x} y={y} width={width} height={height}
      rx={3} ry={3}
      fill={color}
      stroke={stroke}
      strokeWidth={width_}
      className={className}
    />
  );
}
