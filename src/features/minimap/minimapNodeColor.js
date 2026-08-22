// Relocated from BpmnCanvas.jsx — Phase A, minimap step of the CLAUDE.md/
// progress.md 2026-08-21 architecture. Unchanged logic, just moved into its
// own feature file alongside MinimapNode.tsx, the new custom shape renderer
// this step adds (16_shapes-pro-example is the only Pro example with a
// custom minimap node component). Still wired via <MiniMap nodeColor={...}>
// in BpmnCanvas.jsx exactly as before — MinimapNode.tsx doesn't duplicate
// this table, it just reads the `color` prop MiniMap computes from it.
const GATEWAY_MINIMAP_COLOR = { exclusive: '#6E8FC1', parallel: '#8993A7', inclusive: '#C99B5B' };

export function minimapNodeColor(node) {
  if (node.type === 'input') return '#00C870';
  if (node.type === 'output') return '#F0A500';
  if (node.type === 'group') return 'transparent';
  if (node.type === 'gateway') return GATEWAY_MINIMAP_COLOR[node.data?.gatewayType] || GATEWAY_MINIMAP_COLOR.exclusive;
  return '#5878A0';
}
