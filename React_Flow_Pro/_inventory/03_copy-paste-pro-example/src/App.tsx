import { useCallback } from 'react';
import {
  ReactFlow,
  addEdge,
  Edge,
  Node,
  OnConnect,
  Panel,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
} from '@xyflow/react';

import useCopyPaste from './useCopyPaste';

import '@xyflow/react/dist/style.css';

const initialNodes: Node[] = [
  {
    id: 'a',
    data: { label: 'A' },
    position: { x: 0, y: 0 },
  },
  {
    id: 'b',
    data: { label: 'B' },
    position: { x: 0, y: 100 },
  },
  {
    id: 'c',
    data: { label: 'C' },
    position: { x: 0, y: 200 },
  },
];

const initialEdges: Edge[] = [
  { id: 'a->b', source: 'a', target: 'b' },
  { id: 'b->c', source: 'b', target: 'c' },
];

function ReactFlowPro() {
  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect: OnConnect = useCallback(
    (connection) => {
      setEdges((edges: Edge[]) => addEdge(connection, edges));
    },
    [setEdges],
  );

  const { cut, copy, paste, bufferedNodes } = useCopyPaste();

  const canCopy = nodes.some(({ selected }) => selected);
  const canPaste = bufferedNodes.length > 0;

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      fitView
      colorMode="system"
    >
      <Panel position="top-left">
        <button
          className="xy-theme__button"
          onClick={() => cut()}
          disabled={!canCopy}
        >
          ✂️ Cut
        </button>
        <button
          className="xy-theme__button"
          onClick={() => copy()}
          disabled={!canCopy}
        >
          📋 Copy
        </button>
        <button
          className="xy-theme__button"
          onClick={() => paste({ x: 0, y: 0 })}
          disabled={!canPaste}
        >
          📌 Paste
        </button>
      </Panel>
    </ReactFlow>
  );
}

const ReactFlowWrapper = () => {
  return (
    <ReactFlowProvider>
      <ReactFlowPro />
    </ReactFlowProvider>
  );
};

export default ReactFlowWrapper;
