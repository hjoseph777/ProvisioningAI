import { ReactFlow, Background } from '@xyflow/react';

import '@xyflow/react/dist/style.css';

import { nodes, edges } from './initialElements';

/**
 * This example demonstrates how you can remove the attribution from the React Flow renderer.
 */

const proOptions = { hideAttribution: true };

function ReactFlowPro() {
  return (
    <ReactFlow
      proOptions={proOptions}
      defaultNodes={nodes}
      defaultEdges={edges}
      fitView
      colorMode="system"
    >
      <Background />
    </ReactFlow>
  );
}

export default ReactFlowPro;
