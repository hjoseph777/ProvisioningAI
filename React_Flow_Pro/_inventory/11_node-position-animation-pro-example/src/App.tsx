import { useCallback, useRef, useState } from 'react';
import {
  ReactFlow,
  applyEdgeChanges,
  applyNodeChanges,
  ReactFlowProvider,
  MiniMap,
  Background,
  OnNodesChange,
  OnEdgesChange,
  Edge,
  Controls,
  Node,
  Panel,
} from '@xyflow/react';

import '@xyflow/react/dist/style.css';

import { nodes as initialNodes } from './initialElements';
import { layouts } from './layouts';
import useAnimatedNodes from './useAnimatedNodes';

const proOptions = { account: 'paid-pro', hideAttribution: true };

function LayoutAnimationFlow() {
  const layoutIndex = useRef(0);
  const [nodes, setNodes] = useState<Node[]>(initialNodes);
  const [edges, setEdges] = useState<Edge[]>([]);

  const animatedNodes = useAnimatedNodes(nodes, {
    animationDuration: 300,
  });

  const onNodesChange: OnNodesChange = useCallback(
    (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
    []
  );
  const onEdgesChange: OnEdgesChange = useCallback(
    (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  );

  const onUpdateNodePositions = useCallback(() => {
    layoutIndex.current = (layoutIndex.current + 1) % layouts.length;
    const layout = layouts[layoutIndex.current];

    setNodes((nds) => {
      return nds.map((node) => {
        const nextPosition = layout[node.id];

        return {
          ...node,
          position: nextPosition,
        };
      });
    });
  }, []);

  return (
    <ReactFlow
      fitView
      nodes={animatedNodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      proOptions={proOptions}
      nodesDraggable={false}
      nodesConnectable={false}
      zoomOnDoubleClick={false}
      elementsSelectable={false}
      colorMode="system"
    >
      <Background />
      <MiniMap />
      <Controls />
      <Panel>
        <button className="xy-theme__button" onClick={onUpdateNodePositions}>
          toggle layout
        </button>
      </Panel>
    </ReactFlow>
  );
}

function ReactFlowWrapper() {
  return (
    <ReactFlowProvider>
      <LayoutAnimationFlow />
    </ReactFlowProvider>
  );
}

export default ReactFlowWrapper;
