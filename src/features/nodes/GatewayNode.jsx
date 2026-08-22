import { Handle, Position } from '@xyflow/react';
import { SHAPE_FILL_OPACITY } from '../../utils/shapeDesignTokens';

// generatePath/diamondPath/plusPath: adapted from React_Flow_Pro/shapes-pro-example
// (src/components/shape/types/utils.ts, diamond.tsx, plus.tsx) — the diamond outline
// and "+" glyph paths are the Pro bundle's own shape-generation technique, reused
// directly rather than re-derived from scratch, per this task's scope.
function generatePath(points) {
  return `M${points.map(([x, y]) => `${x},${y}`).join(' L')} Z`;
}

function diamondPath(w, h) {
  return generatePath([[0, h / 2], [w / 2, 0], [w, h / 2], [w / 2, h]]);
}

function plusPath(w, h) {
  return generatePath([
    [w / 3, 0], [w * (2 / 3), 0], [w * (2 / 3), h / 3],
    [w, h / 3], [w, h * (2 / 3)],
    [w * (2 / 3), h * (2 / 3)], [w * (2 / 3), h],
    [w / 3, h], [w / 3, h * (2 / 3)],
    [0, h * (2 / 3)], [0, h / 3], [w / 3, h / 3],
  ]);
}

// BPMN gateway semantics, not M-Files ones — this canvas is documentation-only and
// deliberately uses real BPMN vocabulary/glyphs so it reads correctly to anyone who
// knows BPMN, unlike the M-Files flow canvas's decision/automatic-hub framing.
//
// glow: was the shared shapeDesignTokens.js SHAPE_DROP_SHADOW (plain black,
// rgba(0,0,0,.22)) — that constant is explicitly shared with M-Files Flow's
// gateway diamonds and state-annotation backgrounds (CommandCenter.jsx), so
// it can't be changed here without changing that canvas too. A flat black
// shadow on a near-white fill against this app's dark canvas is exactly what
// reads as a floating sticker rather than an integrated element — the fix is
// a colored glow, and it has to be per-type (each type's own stroke, at ~60%
// alpha via the 8-digit hex suffix) or the exclusive/parallel/inclusive
// color-coding — independently cross-verified against M-Files Flow's own hub
// colors — would collapse into one shared, uncoded color. Fill/stroke
// themselves are untouched, per this task's explicit scope.
const GATEWAY_STYLE = {
  exclusive: { stroke: '#6E8FC1', fill: '#0E2038', glow: 'drop-shadow(0 0 4px #6E8FC144)', label: 'Exclusive gateway (XOR) — exactly one outgoing branch is taken' },
  parallel:  { stroke: '#8993A7', fill: '#0E2038', glow: 'drop-shadow(0 0 4px #8993A744)', label: 'Parallel gateway (AND) — every outgoing branch is taken' },
  inclusive: { stroke: '#C99B5B', fill: '#0E2038', glow: 'drop-shadow(0 0 4px #C99B5B44)', label: 'Inclusive gateway (OR) — one or more outgoing branches taken, by condition' },
};

const HANDLE_POSITIONS = [Position.Top, Position.Right, Position.Bottom, Position.Left];
const SIZE = 56;
const SELECT_RING_SCALE = 1.05;

// type="source" on every handle, matching the Pro shapes example's own approach —
// BpmnCanvas sets connectionMode={ConnectionMode.Loose} at the <ReactFlow> level
// (also the Pro example's own choice) so any handle can still accept an incoming
// connection despite the declared type. A gateway is a genuine flow-through node —
// it needs both directions, not just outgoing.
export default function GatewayNode({ data, selected }) {
  const type = data?.gatewayType || 'exclusive';
  const style = GATEWAY_STYLE[type] || GATEWAY_STYLE.exclusive;
  const glyph = SIZE * 0.34;
  const gx = (SIZE - glyph) / 2, gy = (SIZE - glyph) / 2;

  return (
    <div title={style.label} className="bpmn-gateway-node" style={{ width: SIZE, height: SIZE, position: 'relative' }}>
      <svg width={SIZE} height={SIZE}>
        {selected && (
          <path
            d={diamondPath(SIZE, SIZE)}
            fill="none"
            stroke="#79A5DC"
            strokeWidth={1.8}
            className="bpmn-gateway-ring"
            transform={`translate(${(SIZE * (1 - SELECT_RING_SCALE)) / 2}, ${(SIZE * (1 - SELECT_RING_SCALE)) / 2}) scale(${SELECT_RING_SCALE})`}
            strokeLinejoin="round"
          />
        )}
        <path d={diamondPath(SIZE, SIZE)} fill={style.fill} fillOpacity={SHAPE_FILL_OPACITY} stroke={style.stroke} strokeWidth={1.4} strokeLinejoin="round" style={{ filter: style.glow }} className="bpmn-gateway-shape" />
        {type === 'exclusive' && (
          <g stroke={style.stroke} strokeWidth={1.8} strokeLinecap="round" className="bpmn-gateway-glyph">
            <line x1={gx} y1={gy} x2={gx + glyph} y2={gy + glyph} />
            <line x1={gx + glyph} y1={gy} x2={gx} y2={gy + glyph} />
          </g>
        )}
        {type === 'parallel' && (
          <path d={plusPath(glyph, glyph)} transform={`translate(${gx},${gy})`} fill={style.stroke} className="bpmn-gateway-glyph" />
        )}
        {type === 'inclusive' && (
          <circle cx={SIZE / 2} cy={SIZE / 2} r={glyph / 2} fill="none" stroke={style.stroke} strokeWidth={1.8} className="bpmn-gateway-glyph" />
        )}
      </svg>
      {/* Visibility (hidden by default, shown on node hover/selection) is CSS-driven
          (App.jsx, .react-flow__node-gateway .react-flow__handle) since opacity
          doesn't vary per type — only color does, and that has to be inline
          because it depends on which gateway instance this is. React Flow's own
          default handle border (white, from --xy-handle-border-color-default)
          would otherwise mismatch the type-colored fill; borderColor here makes
          the whole dot one solid color instead of a white-rimmed one. */}
      {HANDLE_POSITIONS.map(pos => (
        <Handle key={pos} id={pos} type="source" position={pos} style={{ background: style.stroke, borderColor: style.stroke, width: 8, height: 8 }} />
      ))}
    </div>
  );
}
