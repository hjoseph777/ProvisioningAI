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
//
// CSS-cascade bug found and fixed here (2026-08-22, reported live by a human
// looking at the actual rendered app — the DOM-attribute check used to
// "verify" this earlier was checking the wrong signal and never caught it):
// fill/stroke/strokeWidth were being set as plain SVG presentation
// attributes (`fill={color}`). @xyflow/react's own base.css carries
// `.react-flow__minimap-node { fill: var(--xy-minimap-node-background-color,
// ...#e2e2e2); stroke: ...; stroke-width: ...; }` — every element here also
// carries that exact class (needed for the library's own hover/selected
// behavior). Presentation attributes are the LOWEST-priority style source in
// the CSS cascade — any matching stylesheet rule silently wins over them,
// with zero warning and no effect on getAttribute(), which is exactly what
// made this invisible to an attribute-only check: every node's fill
// *attribute* correctly held its real per-type color, while every node's
// *computed*, actually-painted fill was the same flat #e2e2e2 gray
// (confirmed directly via getComputedStyle before this fix — every one of 6
// differently-colored nodes computed to identical rgb(226,226,226)).
// Fixed by moving fill/stroke/strokeWidth into an inline `style` object
// instead — inline styles sit far above an external stylesheet's class
// selector in the cascade, so they render correctly regardless of what
// react-flow's own base.css sets for the same class.
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
        style={{ fill: color, stroke, strokeWidth: width_ }}
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
        style={{ fill: color, stroke, strokeWidth: width_ }}
        className={className}
      />
    );
  }

  if (type === 'group') {
    return (
      <rect
        x={x} y={y} width={width} height={height}
        rx={3} ry={3}
        style={{ fill: 'none', stroke: selected ? SELECTED_STROKE : 'rgba(255,255,255,0.25)', strokeWidth: selected ? 2 : 1 }}
        className={className}
      />
    );
  }

  // Task (default)
  return (
    <rect
      x={x} y={y} width={width} height={height}
      rx={3} ry={3}
      style={{ fill: color, stroke, strokeWidth: width_ }}
      className={className}
    />
  );
}
