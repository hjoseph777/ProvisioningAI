import { useCallback, useMemo, useRef } from 'react';
import {
  BaseEdge,
  useStore,
  type Edge,
  type EdgeProps,
  type XYPosition,
} from '@xyflow/react';

import { useBpmnStore } from '../../../store/useBpmnStore';
import { ControlPoint, type ControlPointData } from './ControlPoint';
import { getPath, getControlPoints } from './path';
import { Algorithm, COLORS } from './constants';
import { ControlAnchor } from './ControlAnchor';
import {
  getPointsBasedOnNodePositions,
  getStepInitialPoints,
  OFFSET,
} from './path/step';

// Ported from React_Flow_Pro/05_editable-edge-pro-example, adapted for this
// app's controlled-ReactFlow architecture: the example calls
// useReactFlow().setEdges(updater) directly, which only works when React
// Flow owns edge state internally. Here nodes/edges are controlled props
// sourced from useBpmnStore (BpmnCanvas.jsx passes them in every render), so
// an internal setEdges() call would get silently overwritten on the very
// next render by the store's own (unchanged) edges array. setControlPoints
// below calls edgesSlice.js's updateEdgeControlPoints store action instead —
// same updater-function contract ControlPoint/ControlAnchor already expect,
// just backed by the real state owner. No second Zustand store was
// introduced for this (the original example's own tiny store.ts, used only
// for the free-draw-while-connecting connectionLinePath, was deliberately
// not ported — see the edges relocation notes).

const useIdsForInactiveControlPoints = (points: ControlPointData[]) => {
  const ids = useRef<string[]>([]);

  if (ids.current.length === points.length) {
    return points.map((point, i) =>
      point.id ? point : { ...point, id: ids.current[i] }
    );
  } else {
    ids.current = [];

    return points.map((point, i) => {
      if (!point.id) {
        const id = window.crypto.randomUUID();
        ids.current[i] = id;
        return { ...point, id: id };
      } else {
        ids.current[i] = point.id;
        return point;
      }
    });
  }
};

export type EditableEdge = Edge<{
  algorithm?: Algorithm;
  points: ControlPointData[];
}>;

export function EditableEdgeComponent({
  id,
  selected,
  source,
  sourceX,
  sourceY,
  sourcePosition,
  target,
  targetX,
  targetY,
  targetPosition,
  markerEnd,
  markerStart,
  style,
  data = { points: [] },
  ...delegated
}: EdgeProps<EditableEdge>) {
  const sourceOrigin: XYPosition = { x: sourceX, y: sourceY };
  const targetOrigin: XYPosition = { x: targetX, y: targetY };
  const color = COLORS[data.algorithm ?? Algorithm.BezierCatmullRom];

  const updateEdgeControlPoints = useBpmnStore((s) => s.updateEdgeControlPoints);

  const shouldShowPoints = useStore((store) => {
    const sourceNode = store.nodeLookup.get(source)!;
    const targetNode = store.nodeLookup.get(target)!;

    return selected || sourceNode?.selected || targetNode?.selected;
  });

  const initialStepPoints = useMemo(
    () =>
      getStepInitialPoints({
        source: { x: sourceX, y: sourceY },
        target: { x: targetX, y: targetY },
        offset: OFFSET,
        sourcePosition,
        targetPosition,
      }).map((point, index) => ({ ...point, id: `${index}` })),
    [sourcePosition, sourceX, sourceY, targetPosition, targetX, targetY]
  );

  const isStepAlgorithm = data.algorithm === Algorithm.Step;

  /**
   * We calculate the modified points based on the node's movement using getPointsBasedOnNodePositions in case
   * of a step edge.
   */
  const updatedPointsBasedOnNodeMovement = useMemo(() => {
    if (!isStepAlgorithm) return data.points;
    return getPointsBasedOnNodePositions({
      points: data.points,
      source: { x: sourceX, y: sourceY },
      target: { x: targetX, y: targetY },
      sides: { fromSide: sourcePosition, toSide: targetPosition },
    });
  }, [
    isStepAlgorithm,
    data.points,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  ]);

  /**
   * We assign these modified points to a ref and then use that ref inside setControlPoints instead of directly using updatedPointsBasedOnNodeMovement
   * to avoid unnecessary reinitializations of setControlPoints + other places where it is being used.
   * */
  const updatedPointsRef = useRef<ControlPointData[]>([]);
  updatedPointsRef.current = updatedPointsBasedOnNodeMovement;

  const setControlPoints = useCallback(
    (update: (points: ControlPointData[]) => ControlPointData[]) => {
      updateEdgeControlPoints(id, (storePoints: ControlPointData[]) => {
        const points = isStepAlgorithm ? updatedPointsRef.current : storePoints;
        return update(points);
      });
    },
    [updateEdgeControlPoints, id, isStepAlgorithm]
  );

  const pathPoints = [
    sourceOrigin,
    ...updatedPointsBasedOnNodeMovement,
    targetOrigin,
  ];
  const controlPoints = getControlPoints({
    points: pathPoints,
    algorithm: data.algorithm,
    sides: {
      fromSide: sourcePosition,
      toSide: targetPosition,
    },
    initialStepPoints,
  });
  const path = getPath({
    points: pathPoints,
    algorithm: data.algorithm,
    sides: {
      fromSide: sourcePosition,
      toSide: targetPosition,
    },
    initialStepPoints,
  });

  const controlPointsWithIds = useIdsForInactiveControlPoints(controlPoints);

  return (
    <>
      <BaseEdge
        id={id}
        path={path}
        {...delegated}
        markerStart={markerStart}
        markerEnd={markerEnd}
        style={{
          ...style,
          strokeWidth: 2,
          stroke: color,
        }}
      />

      {shouldShowPoints &&
        !isStepAlgorithm &&
        controlPointsWithIds.map((point, index) => (
          <ControlPoint
            key={point.id}
            index={index}
            setControlPoints={setControlPoints}
            color={color}
            {...point}
          />
        ))}

      {/* Step Edge requires different logic for control point addition/movement/deletion so have made a seperate component for this */}
      {shouldShowPoints &&
        isStepAlgorithm &&
        controlPointsWithIds.map((point, index) => (
          <ControlAnchor
            key={point.id}
            index={index}
            setControlPoints={setControlPoints}
            color={color}
            direction={point.direction}
            initialStepPoints={
              initialStepPoints as unknown as ControlPointData[]
            }
            {...point}
          />
        ))}
    </>
  );
}
