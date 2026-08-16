// ── bpmnAutoLayout ───────────────────────────────────────────────
// Layout algorithm adapted from React_Flow_Pro/auto-layout-pro-example
// (src/algorithms/dagre.ts) — Phase 1 only needs the one algorithm the BPMN
// canvas actually uses, not the Pro example's dagre/elk/d3-hierarchy switcher,
// so only the dagre path was adapted. Simplified from the Pro example's version
// in one real way: a fresh graph is built per call instead of reusing one
// module-level graph and pruning removed nodes from it — same result, no
// mutable-singleton state to get out of sync with React Flow's own state.
import dagre from '@dagrejs/dagre';

const DEFAULT_WIDTH = 140, DEFAULT_HEIGHT = 56;

export function layoutWithDagre(nodes, edges, { direction = 'TB', spacing = [50, 70] } = {}) {
  const g = new dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: direction, nodesep: spacing[0], ranksep: spacing[1] });

  nodes.forEach(node => {
    g.setNode(node.id, {
      width: node.measured?.width ?? node.width ?? DEFAULT_WIDTH,
      height: node.measured?.height ?? node.height ?? DEFAULT_HEIGHT,
    });
  });
  edges.forEach(edge => g.setEdge(edge.source, edge.target));

  dagre.layout(g);

  return nodes.map(node => {
    const { x, y } = g.node(node.id);
    const w = node.measured?.width ?? node.width ?? DEFAULT_WIDTH;
    const h = node.measured?.height ?? node.height ?? DEFAULT_HEIGHT;
    return { ...node, position: { x: x - w / 2, y: y - h / 2 } };
  });
}
