import { useState, useCallback } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Panel,
  type Connection,
  Edge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { FreehandNode } from './FreehandNode';
import { Freehand } from './Freehand';
import { initialEdges, initialNodes } from './initial-elements';

const nodeTypes = {
  freehand: FreehandNode,
};

function App() {
  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [isDrawing, setIsDrawing] = useState(true);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds: Edge[]) => addEdge(params, eds)),
    [setEdges],
  );

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      nodeTypes={nodeTypes}
      panOnDrag={!isDrawing}
      zoomOnScroll={!isDrawing}
      panOnScroll={!isDrawing}
      selectNodesOnDrag={!isDrawing}
      fitView
      colorMode="system"
    >
      {isDrawing && <Freehand />}
      <Controls />
      <Background />
      <Panel position="top-left">
        <div className="xy-theme__button-group">
          <button
            className={`xy-theme__button ${isDrawing ? 'active' : ''}`}
            onClick={() => setIsDrawing(true)}
          >
            Drawing Mode
          </button>
          <button
            className={`xy-theme__button ${!isDrawing ? 'active' : ''}`}
            onClick={() => setIsDrawing(false)}
          >
            Selection Mode
          </button>
        </div>
      </Panel>
    </ReactFlow>
  );
}

export default App;
