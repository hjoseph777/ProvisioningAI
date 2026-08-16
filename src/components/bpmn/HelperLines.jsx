import { useStore } from '@xyflow/react';

// Rendered as a <ReactFlow> child (screen-space overlay, same layer as
// <Controls>/<MiniMap>), so line positions are converted from flow
// coordinates to screen pixels by hand via the live [x,y,zoom] transform —
// there's no viewport-transformed slot exposed to plain children the way
// there is for nodes/edges.
export default function HelperLines({ horizontal, vertical }) {
  const [x, y, zoom] = useStore(s => s.transform);
  if (horizontal === undefined && vertical === undefined) return null;

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 5 }}>
      {horizontal !== undefined && (
        <div style={{ position: 'absolute', top: horizontal * zoom + y, left: 0, width: '100%', height: 1, background: 'var(--a3)' }} />
      )}
      {vertical !== undefined && (
        <div style={{ position: 'absolute', left: vertical * zoom + x, top: 0, width: 1, height: '100%', background: 'var(--a3)' }} />
      )}
    </div>
  );
}
