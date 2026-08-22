import { useEffect, useRef, useState } from 'react';
import type { ShapeRef, ConnRef, Router } from 'libavoid-js';
import { AvoidLib } from 'libavoid-js';
import { type Node, type Edge } from '@xyflow/react';
import { useNodesInitialized, useStore } from '@xyflow/react';

import { useBpmnStore } from '../../store/useBpmnStore';

// Libavoid will attempt to load the WASM blob using a relative path from the
// package's entry module by default. In development with vite this will work, as
// dependencies aren't bundled, but when building for production vite loses the
// ability to "see" where that WASM blob is and include it in the final bundle.
//
// Because libavoid-js defines an explicit `exports` map in its package.json, we
// can't import it directly. To work around this we have to vendor the blob and
// import it as a URL using vite's `?url` import suffix: this instructs vite to
// keep the asset and generate a deterministic URL for it in the final bundle.
//
// Confirmed against this project's own vite.config.js (plain @vitejs/plugin-react,
// no extra plugins) — the ?url suffix resolves the ~528KB binary to a build-time
// URL with zero additional bundler configuration, exactly as the original example
// documents.
import wasmUrl from '../../assets/libavoid.wasm?url';

// ADAPTATION NOTE (vs. React_Flow_Pro/10_libavoid-edge-routing-pro-example):
// The original example's own ExampleNode assigns every handle an explicit,
// positive-integer string id (`"1"`, `"2"`, ...) up front specifically so it
// can pass `Number(handle.id)` straight through to libavoid as the pin's
// class id. This app's real BPMN nodes (TaskNode/EventNode: one unlabeled
// source + one unlabeled target handle, id === null; GatewayNode: four
// handles keyed by side, id === 'top'/'right'/'bottom'/'left'; PoolNode: no
// handles) were never built around that constraint, and reworking their
// <Handle> markup to add numeric ids would risk existing edges' stored
// sourceHandle/targetHandle references — out of scope for an additive edge
// type. Libavoid's pin class ids only need to be unique *within a shape*
// (confirmed from the original example itself: its own generated ids restart
// at 1 for every node), so instead this hook mints its own small per-node
// pin ids and keeps a side-map from (nodeId, handle type, real handle id) to
// that minted pin id — used both when creating each shape's pins and when
// resolving an edge's ConnEnd. The one known limitation this introduces:
// connectionMode="loose" (set on this canvas) lets a user drop a connection
// onto either a source- or target-declared handle regardless of the edge's
// own semantic direction; when a node has same-id (null) handles of both
// types — true for TaskNode/EventNode — resolvePinId's same-type-first,
// other-type-fallback lookup resolves the common case correctly but can't
// distinguish a deliberately "backwards" loose-mode connection from a normal
// one. Not a concern for GatewayNode (source-only, side-keyed ids never
// collide) or the overwhelmingly common straightforward-connection case.
function handleKey(type: 'source' | 'target', id: string | null | undefined) {
  return `${type}:${id ?? ''}`;
}

function resolvePinId(
  handlePinIds: Map<string, Map<string, number>>,
  nodeId: string,
  handleId: string | null | undefined,
  preferredType: 'source' | 'target',
): number | undefined {
  const map = handlePinIds.get(nodeId);
  if (!map) return undefined;
  const preferred = map.get(handleKey(preferredType, handleId));
  if (preferred !== undefined) return preferred;
  const otherType = preferredType === 'source' ? 'target' : 'source';
  return map.get(handleKey(otherType, handleId));
}

export function useLibavoid() {
  const [router, setRouter] = useState<Router | null>(null);

  // Libavoid ids must always be positive numbers, but React Flow node ids are
  // arbitrary strings. To bridge this gap we maintain an atomic counter for all
  // nodes, and a mapping from React Flow node ids to libavoid shape ids.
  const shapeIds = useRef<Map<string, number>>(new Map());
  const nextShapeId = useRef(1);

  // Per-node map of (handle type + real handle id) -> minted libavoid pin
  // class id. See the ADAPTATION NOTE above — this replaces the original
  // example's `Number(handle.id)`.
  const handlePinIds = useRef<Map<string, Map<string, number>>>(new Map());

  const shapes = useRef<Map<number, ShapeRef>>(new Map());
  const connections = useRef<Map<string, ConnRef>>(new Map());

  const nodesInitialized = useNodesInitialized();
  const elements = useStore(
    (state) => ({ nodes: state.nodes, edges: state.edges }),
    compareElements,
  );

  // The `nodeLookup` is a internal mutable map that React Flow uses to store
  // various node internals. We're using it in this hook to get access to the
  // calculated handle positions so we can feed those into libavoid as "pins" that
  // edges connect to.
  const nodeLookup = useStore((state) => state.nodeLookup);

  // React triggers effects twice during development to identify bugs around side
  // effects and hook dependencies. In our case we definitely only want to load
  // the libavoid WASM module exactly once, so we use a ref to track whether that's
  // in progress or not.
  const loading = useRef(false);

  useEffect(() => {
    if (!nodesInitialized || loading.current) return;
    if (!router) {
      loading.current = true;

      AvoidLib.load(wasmUrl)
        .then(() => {
          const instance = AvoidLib.getInstance();
          const router = new instance.Router(instance.OrthogonalRouting);

          // The libavoid router can be configured with a number of different
          // parameters and options. You can find documentation for all of them
          // by taking a look at the original c++ reference:
          //
          // https://www.adaptagrams.org/documentation/namespaceAvoid.html#a8a0154ae39129e7737d98e5a83daed19
          //
          // Below we've configured some options that you'll typically want to
          // set up when working with React Flow.

          // You can think of this option as the "padding" around shapes that
          // means edges wont run directly along the side of a shape. Be mindful
          // that if it is impossible for libavoid to find a path that respects
          // this buffer, no route wlil be produced at all and a straight diagonal
          // line from source to target will be rendered.
          router.setRoutingParameter(instance.shapeBufferDistance, 10);

          // If the previous option is padding around nodes, this option helps apply
          // padding around edges. This stops edges from being too bunched together
          // and can make it easier to read flows with many edges with similar
          // paths.
          router.setRoutingParameter(instance.idealNudgingDistance, 10);

          // Libavoid has a number of heuristics it applies to nudge edge paths
          // to produce better-looking diagrams. This one will move edges slightly
          // apart from one another if they end at the same point, but in React
          // Flow we want our edges to all end exactly on the handle they're
          // connected to, so we disable this heuristic.
          router.setRoutingOption(
            instance.nudgeSharedPathsWithCommonEndPoint,
            false,
          );

          // This option can improve the quality of libavoid's other nudging
          // heuristics by identifying paths that can be unified before running
          // the other nudging steps. This comes at a performance cost, so make
          // sure you're taking that into account for large flows with many edges.
          router.setRoutingOption(
            instance.performUnifyingNudgingPreprocessingStep,
            true,
          );

          setRouter(router);
        })
        .finally(() => {
          loading.current = false;
        });

      return;
    }

    const instance = AvoidLib.getInstance();

    // First, delete and clean up any nodes that no longer exist. Because libavoid
    // is a WASM module, we have to carefully manage memory to avoid leaks!
    const activeShapeIds = new Set(
      elements.nodes.flatMap((node) => shapeIds.current.get(node.id) ?? []),
    );
    for (const [id, shapeRef] of shapes.current) {
      if (!activeShapeIds.has(id)) {
        router.deleteShape(shapeRef);
        shapes.current.delete(id);
      }
    }

    // Next up we need to create or update shapes for each node in the flow: shapes
    // are how libavoid represents obstacles that edges need to route around.
    for (const node of elements.nodes) {
      const width = node.measured?.width ?? 0;
      const height = node.measured?.height ?? 0;

      const topLeft = new instance.Point(node.position.x, node.position.y);
      const bottomRight = new instance.Point(
        node.position.x + width,
        node.position.y + height,
      );

      // If this node is new then we won't have a libavoid shape id for it yet.
      // In that case we take the value of our atomic counter and then bump it
      // for the next new node.
      if (!shapeIds.current.has(node.id)) {
        shapeIds.current.set(node.id, nextShapeId.current++);
      }

      const id = shapeIds.current.get(node.id)!;
      const box = new instance.Rectangle(topLeft, bottomRight);

      // If we already have a shape allocated for this node, we can just move it
      // to its new position. As the shape moves around existing pins are moved
      // along with it, so we don't need to worry about any additional updates.
      //
      // Note: this won't detect additional handles added *after* a node is
      // created (e.g. a gateway that gains a new outgoing side) — matches the
      // original example's own documented limitation. None of this canvas's
      // node types add handles post-creation today.
      if (shapes.current.has(id)) {
        router.moveShape(shapes.current.get(id)!, box);
      } else {
        // In libavoid there's no concept of a "node," instead there are only
        // shapes that edges must be routed around and "pins" that edges can
        // connect to.
        const shape = new instance.ShapeRef(router, box);

        const handles = nodeLookup.get(node.id)?.internals.handleBounds;
        const sourceHandles = handles?.source ?? [];
        const targetHandles = handles?.target ?? [];
        const pinMap = new Map<string, number>();
        let nextPinId = 1;

        const addPin = (handle: (typeof sourceHandles)[number], type: 'source' | 'target') => {
          const pinId = nextPinId++;
          pinMap.set(handleKey(type, handle.id), pinId);

          const pin = new instance.ShapeConnectionPin(
            shape,
            pinId,
            handle.x + handle.width / 2,
            handle.y + handle.height / 2,
            // When `true` libavoid will place this pin relative to the shape's
            // bounding box, with the previous two arguments expected to be numbers
            // between 0 and 1. Because we know the exact position of our handles,
            // we can set this to `false` and provide the absolute coordinates
            // instead.
            false,
            0,
            // libavoid-js doesn't expose these enum values in the generated
            // TypeScript types, but you can find them in the original c++ reference:
            //
            // https://www.adaptagrams.org/documentation/namespaceAvoid.html#abe35ded63bcd354b31e69f6a5414f610
            handle.position === 'top'
              ? instance.ConnDirUp
              : handle.position === 'bottom'
                ? instance.ConnDirDown
                : handle.position === 'left'
                  ? instance.ConnDirLeft
                  : instance.ConnDirRight,
          );

          pin.setExclusive(false);
        };

        for (const handle of sourceHandles) addPin(handle, 'source');
        for (const handle of targetHandles) addPin(handle, 'target');
        handlePinIds.current.set(node.id, pinMap);

        shapes.current.set(id, shape);
      }

      // Clean up the temporary box we created to work with this shape.
      instance.destroy(box);
      instance.destroy(bottomRight);
      instance.destroy(topLeft);
    }

    // As with the nodes, remove any edges from the router that no longer exist
    // in the flow.
    const edgeIds = new Set(elements.edges.map((e) => e.id));
    for (const [id, connRef] of connections.current) {
      if (!edgeIds.has(id)) {
        router.deleteConnector(connRef);
        connections.current.delete(id);
      }
    }

    for (const edge of elements.edges) {
      const sourceShapeId = shapeIds.current.get(edge.source);
      const targetShapeId = shapeIds.current.get(edge.target);

      if (!sourceShapeId || !targetShapeId) continue;

      const sourceShape = shapes.current.get(sourceShapeId);
      const targetShape = shapes.current.get(targetShapeId);

      if (!sourceShape || !targetShape) continue;

      const sourcePinId = resolvePinId(handlePinIds.current, edge.source, edge.sourceHandle, 'source');
      const targetPinId = resolvePinId(handlePinIds.current, edge.target, edge.targetHandle, 'target');

      // A node with no handles at all (PoolNode) has no pins to connect to —
      // skip rather than pass an undefined class id into libavoid.
      if (sourcePinId === undefined || targetPinId === undefined) continue;

      const source = new instance.ConnEnd(sourceShape, sourcePinId);
      const target = new instance.ConnEnd(targetShape, targetPinId);

      if (connections.current.has(edge.id)) {
        const connection = connections.current.get(edge.id)!;
        connection.setSourceEndpoint(source);
        connection.setDestEndpoint(target);
      } else {
        const connection = new instance.ConnRef(router, source, target);
        connections.current.set(edge.id, connection);
      }

      instance.destroy(source);
      instance.destroy(target);
    }

    // The actual edge routing is batched for the entire flow and performed in a
    // transaction. It is possible to only process certain edges by calling
    // `connection.processTransaction()` directly on a connection, but that's out
    // of scope for this example.
    router.processTransaction();

    // ADAPTATION: the original example calls useReactFlow().setEdges(updater)
    // here, which only reaches real state because its own nodes/edges are
    // owned by React Flow's internal store. This app's edges are owned by
    // useBpmnStore and passed in as controlled props, so writing through
    // useReactFlow() would get silently overwritten on the next render by
    // the store's unchanged edges array (same issue EditableEdge.tsx hit).
    // setEdgeRoutePoints (edgesSlice.js) applies the computed routes to the
    // real store directly, imperative getState()/action call rather than a
    // subscribed hook value since this runs inside an effect, not render.
    const routes = new Map<string, { x: number; y: number }[]>();
    for (const edge of elements.edges) {
      const connection = connections.current.get(edge.id);
      if (!connection) continue;

      // Finally, calling `displayRoute()` actually gives us the array of points
      // we can pass to our `<RoutableEdge />` component.
      const route = connection.displayRoute();
      const numPoints = route.size();
      const points: { x: number; y: number }[] = [];

      // Note how we're excluding the first and last points here. Those positions
      // are already handled by the source/target positions passed to the edge
      // component so we don't need to duplicate them here.
      for (let i = 1; i < numPoints - 1; i++) {
        const point = route.get_ps(i);
        points.push({ x: point.x, y: point.y });
      }

      routes.set(edge.id, points);
    }
    if (routes.size > 0) {
      useBpmnStore.getState().setEdgeRoutePoints(routes);
    }
  }, [router, nodesInitialized, elements, nodeLookup]);

  return { ready: router !== null };
}

type Elements = {
  nodes: Array<Node>;
  edges: Array<Edge>;
};

function compareElements(xs: Elements, ys: Elements) {
  return compareNodes(xs.nodes, ys.nodes) && compareEdges(xs.edges, ys.edges);
}

function compareNodes(xs: Array<Node>, ys: Array<Node>) {
  // the number of nodes changed, so we already know that the nodes are not equal
  if (xs.length !== ys.length) return false;

  for (let i = 0; i < xs.length; i++) {
    const x = xs[i];
    const y = ys[i];

    if (!y) return false;

    if (
      x.measured?.width !== y.measured?.width ||
      x.measured?.height !== y.measured?.height
    ) {
      return false;
    }

    if (x.position.x !== y.position.x || x.position.y !== y.position.y) {
      return false;
    }
  }

  return true;
}

function compareEdges(xs: Array<Edge>, ys: Array<Edge>) {
  if (xs.length !== ys.length) return false;

  for (let i = 0; i < xs.length; i++) {
    const x = xs[i];
    const y = ys[i];

    if (x.source !== y.source || x.target !== y.target) return false;
    if (x?.sourceHandle !== y?.sourceHandle) return false;
    if (x?.targetHandle !== y?.targetHandle) return false;
  }

  return true;
}
