import { useCallback, useEffect, useRef, useState } from 'react';
import { ReactFlow, ReactFlowProvider, Background, MiniMap, ConnectionMode, SelectionMode, MarkerType, useReactFlow } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useBpmnStore, makeId } from '../store/useBpmnStore';
import GatewayNode from '../features/nodes/GatewayNode';
import TaskNode from '../features/nodes/TaskNode';
import { StartEventNode, EndEventNode } from '../features/nodes/EventNode';
import PoolNode from '../features/nodes/PoolNode';
import FlowEdge from '../features/edges/FlowEdge';
import { EditableEdgeComponent } from '../features/edges/EditableEdge/EditableEdge';
import { RoutableEdgeComponent } from '../features/edges/RoutableEdge';
import { useLibavoid } from '../features/edges/useLibavoid';
import MinimapNode from '../features/minimap/MinimapNode';
import { minimapNodeColor } from '../features/minimap/minimapNodeColor';
import BpmnPalette from '../features/palette/BpmnPalette';
import SelectedNodesToolbar from '../features/toolbar/SelectedNodesToolbar';
import NodeInspectorToolbar from '../features/toolbar/NodeInspectorToolbar';
import HelperLines from './bpmn/HelperLines';
import { getHelperLines } from '../utils/bpmnHelperLines';
import { sortForHierarchy, fitNodeIntoParent } from '../utils/bpmnPools';
import { validateBpmnModel, locateWarning } from '../features/bpmn-io/bpmnModdle';
import { exportPng, exportSvg } from '../features/export-import/exportImage';
import { useBpmnCopyPaste } from '../hooks/useBpmnCopyPaste';

// 'default'/'input'/'output' override React Flow's built-in node components
// (TaskNode/StartEventNode/EndEventNode) while node.type stays unset for
// ordinary nodes — React Flow still writes the same react-flow__node-default/
// -input/-output classes, so this is additive: real typed elements (Phase A)
// get an icon, everything else renders pixel-identical to before Phase C.
// 'group' overrides React Flow's own built-in GroupNode, which renders
// nothing at all by default (confirmed from source) — same additive pattern
// as the other three, not a risky override of real behavior.
const nodeTypes = { gateway: GatewayNode, default: TaskNode, input: StartEventNode, output: EndEventNode, group: PoolNode };
// Relocated into features/minimap/ this pass — minimapNodeColor.js (unchanged
// logic) plus the new MinimapNode.tsx custom shape renderer (ported from
// 16_shapes-pro-example, the only Pro example with a custom minimap node
// component; adapted to this canvas's real BPMN node types, not 16_shapes'
// own generic shapes). Both are still just props on the <MiniMap> below —
// there was never a wrapper component to relocate.
// FlowEdge stays default/registered first — 'editable-edge' (05_editable-edge)
// and 'routable-edge' (10_libavoid-edge-routing, added in a later pass) are
// additive selectable options, switched per-edge via the edge right-click
// menu's "Type:" entries, never a replacement for FlowEdge's BPMN-semantic
// label/comment behavior.
const edgeTypes = { flowEdge: FlowEdge, 'editable-edge': EditableEdgeComponent, 'routable-edge': RoutableEdgeComponent };
// Was unstyled — React Flow's own default (thin, low-contrast #b1b1b7, no
// arrowhead at all since markerEnd was never set). --mid is the app's existing
// muted-line color, already used for borders/dim text elsewhere.
const defaultEdgeOptions = {
  type: 'flowEdge',
  style: { stroke: 'var(--mid)', strokeWidth: 2 },
  markerEnd: { type: MarkerType.ArrowClosed, color: 'var(--mid)', width: 18, height: 18 },
};
// Explicit rather than relying on <Background/>'s own default — snapGrid below
// must match this exactly, or dragged/dropped nodes would snap to a grid that
// doesn't line up with the dots the user actually sees.
const GRID_GAP = 20;
const SNAP_GRID = [GRID_GAP, GRID_GAP];

// The real, working shortcuts on this canvas — nothing here is aspirational,
// every row matches an actual handler wired elsewhere in this file or in
// useBpmnCopyPaste.js. Kept as a flat reference list rather than grouped
// tabs/categories — six-ish rows doesn't need a taxonomy.
const SHORTCUTS = [
  { keys: ['Ctrl', 'Z'], label: 'Undo' },
  { keys: ['Ctrl', 'Shift', 'Z'], label: 'Redo' },
  { keys: ['Ctrl', 'C'], label: 'Copy' },
  { keys: ['Ctrl', 'X'], label: 'Cut' },
  { keys: ['Ctrl', 'V'], label: 'Paste' },
  { keys: ['Delete'], label: 'Delete selected' },
  { keys: ['Ctrl', 'Click'], label: 'Add to selection' },
  { keys: ['Ctrl', 'A'], label: 'Select all — then drag any of them to move the whole workflow' },
  { keys: ['Drag'], label: 'Pan canvas' },
  { keys: ['Shift', 'Drag'], label: 'Select multiple (marquee)' },
  { keys: ['Double-click'], label: 'Edit a node, edge, or label' },
];

function BpmnFlow() {
  const nodes = useBpmnStore(s => s.nodes);
  const edges = useBpmnStore(s => s.edges);
  const onNodesChange = useBpmnStore(s => s.onNodesChange);
  const onEdgesChange = useBpmnStore(s => s.onEdgesChange);
  const onConnect = useBpmnStore(s => s.onConnect);
  const reconnectExistingEdge = useBpmnStore(s => s.reconnectEdge);
  const setActiveEdgeToolbarId = useBpmnStore(s => s.setActiveEdgeToolbarId);
  const duplicateEdge = useBpmnStore(s => s.duplicateEdge);
  const deleteEdge = useBpmnStore(s => s.deleteEdge);
  const setEdgeType = useBpmnStore(s => s.setEdgeType);
  // Loads the ~528KB libavoid WASM module once on mount and keeps its router
  // in sync with the live nodes/edges thereafter (writes resolved routes
  // into each routable-edge's data.points via edgesSlice.js's
  // setEdgeRoutePoints). `ready` gates the "Type: Routable" menu entry below
  // — this is the only edge type with an async-init requirement, matching
  // the locked architecture's own note that libavoid needs an async gate
  // while the other two edge types are synchronous.
  const { ready: routableReady } = useLibavoid();
  // Synced into the store (edgesSlice.js) so BpmnPalette.jsx's edge-type
  // picker can gate its own Routable option the same way the right-click
  // menu already does below — a plain component-local value can't reach a
  // sibling component without prop-drilling through the whole tree.
  const setRoutableReady = useBpmnStore(s => s.setRoutableReady);
  useEffect(() => { setRoutableReady(routableReady); }, [routableReady, setRoutableReady]);
  const defaultEdgeType = useBpmnStore(s => s.defaultEdgeType);
  const setDefaultEdgeType = useBpmnStore(s => s.setDefaultEdgeType);
  const groupSelectedIntoPool = useBpmnStore(s => s.groupSelectedIntoPool);
  const duplicateNodes = useBpmnStore(s => s.duplicateNodes);
  const deleteNodes = useBpmnStore(s => s.deleteNodes);
  const setNodes = useBpmnStore(s => s.setNodes);
  const addTask = useBpmnStore(s => s.addTask);
  const addSubProcess = useBpmnStore(s => s.addSubProcess);
  const addStart = useBpmnStore(s => s.addStart);
  const addEnd = useBpmnStore(s => s.addEnd);
  const addGateway = useBpmnStore(s => s.addGateway);
  const addPool = useBpmnStore(s => s.addPool);
  const resetAll = useBpmnStore(s => s.resetAll);
  const animateFlow = useBpmnStore(s => s.animateFlow);
  const setAnimateFlow = useBpmnStore(s => s.setAnimateFlow);
  const setEdges = useBpmnStore(s => s.setEdges);
  const duplicateNode = useBpmnStore(s => s.duplicateNode);
  const businessView = useBpmnStore(s => s.businessView);
  const setBusinessView = useBpmnStore(s => s.setBusinessView);
  const connectorStyle = useBpmnStore(s => s.connectorStyle);
  const setConnectorStyle = useBpmnStore(s => s.setConnectorStyle);
  // Undo/redo (Stage 3) — subscribed directly (not via canUndo()/canRedo()
  // functions) so the toolbar buttons' disabled state actually re-renders
  // when history changes.
  const history = useBpmnStore(s => s.history);
  const takeSnapshot = useBpmnStore(s => s.takeSnapshot);
  const undo = useBpmnStore(s => s.undo);
  const redo = useBpmnStore(s => s.redo);
  const canUndo = history.past.length > 0;
  const canRedo = history.future.length > 0;
  const saveToFile = useBpmnStore(s => s.saveToFile);
  const loadFromFile = useBpmnStore(s => s.loadFromFile);
  const exportBpmnFile = useBpmnStore(s => s.exportBpmnFile);
  const importBpmnFileAction = useBpmnStore(s => s.importBpmnFile);
  const { fitView, zoomIn, zoomOut, screenToFlowPosition, deleteElements, getIntersectingNodes, getInternalNode, getNodesBounds, toObject, setViewport } = useReactFlow();
  const importInputRef = useRef(null);
  const saveLoadInputRef = useRef(null);
  const reconnectInProgressRef = useRef(false);
  const reconnectSucceededRef = useRef(false);
  const reconnectEdgeIdRef = useRef(null);
  const reconnectHandleTypeRef = useRef(null);
  // Smart alignment guides (Phase D) — flow-space line positions, computed
  // in handleNodesChange below as a node drags, cleared once it isn't.
  const [helperLines, setHelperLines] = useState({});
  const [interactionLocked, setInteractionLocked] = useState(false);
  // activeNodeToolbarId/inspectorOpen relocated into toolbarSlice.js
  // (features/toolbar/) — only the setters are needed here; the values
  // themselves are only ever read inside NodeInspectorToolbar.jsx now,
  // which reads them straight from the store itself.
  const setActiveNodeToolbarId = useBpmnStore(s => s.setActiveNodeToolbarId);
  const setInspectorOpen = useBpmnStore(s => s.setInspectorOpen);
  const selectedNodes = nodes.filter(n => n.selected);
  // The single-node floating toolbar only makes sense for exactly one
  // selection — with 2+, SelectedNodesToolbar (bulk actions) takes over
  // instead, so this stays undefined rather than arbitrarily anchoring to
  // whichever node .find() happens to return first. Still computed here
  // (not just inside NodeInspectorToolbar.jsx) because handleDetachSelected/
  // handleDeleteSelected/handleDuplicateSelected below all close over it and
  // need useReactFlow() hooks NodeInspectorToolbar.jsx can't call itself.
  const selectedNode = selectedNodes.length === 1 ? selectedNodes[0] : undefined;
  // Transient toast for the explicit Export/Import actions (confirms the act
  // succeeded, plus element count) — distinct from the persistent validation
  // bar below, which continuously reflects current state regardless of
  // whether the user ever clicks Export/Import.
  const [bpmnStatus, setBpmnStatus] = useState(null);
  // Persistent validation status bar (Phase E) — re-runs Phase A's real
  // validateBpmnModel() as the diagram changes, debounced so it doesn't
  // re-serialize/re-parse the whole model on every drag frame. Warnings are
  // exactly what bpmn-moddle's own fromXML reports — nothing invented.
  const [validation, setValidation] = useState({ warnings: [] });
  const [warningsExpanded, setWarningsExpanded] = useState(false);
  useEffect(() => {
    const t = setTimeout(async () => {
      try {
        const { warnings } = await validateBpmnModel(nodes, edges);
        setValidation({ warnings });
      } catch (err) {
        setValidation({ warnings: [{ message: `Validation failed: ${err.message}` }] });
      }
    }, 600);
    return () => clearTimeout(t);
  }, [nodes, edges]);
  // Manual snapshots — lowest-priority Phase E item, kept deliberately simple:
  // in-memory only (matches this store's own "no persistence, resets on
  // reload" convention), no auto-diffing, just save/restore full node+edge
  // state under a timestamp.
  const [snapshots, setSnapshots] = useState([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  // Unified Export/Import menus (2026-08-22 UX pass, operator's "Item B") —
  // one dropdown per direction replacing the previous 4 separate buttons
  // (Export BPMN / Import BPMN / Save / Load). Same open/close pattern as
  // historyOpen/shortcutsOpen above.
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [importMenuOpen, setImportMenuOpen] = useState(false);
  // Right-click menu — the report's other secondary-path gap: Edit/Duplicate/
  // Delete only ever reachable via double-click. { x, y, type: 'node'|'edge', id }
  const [contextMenu, setContextMenu] = useState(null);

  // Undo/redo/select-all keyboard shortcuts (Stage 3) — Ctrl+Z / Ctrl+Shift+Z
  // checked directly against undo-redo-pro-example's own useUndoRedo.ts
  // rather than guessed at (it's Ctrl+Shift+Z there, not Ctrl+Y). One real
  // deviation from that source: it attaches a global keydown listener with
  // no awareness of focused text inputs at all — harmless in the demo (no
  // text fields exist in it) but this canvas has real ones (search, label
  // edit), where Ctrl+Z should do the browser's own native text-undo, not
  // blow away canvas state. Guarded here for exactly that reason.
  //
  // Ctrl+A (select all) is what actually satisfies "grab the whole workflow
  // and move it as one group" — React Flow already drags an entire
  // multi-selection together when you drag any one node inside it (that's
  // native, not something built here), so the missing piece was purely a
  // fast way to select everything at once, not a new container concept.
  useEffect(() => {
    const onKeyDown = (event) => {
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (!(event.ctrlKey || event.metaKey)) return;
      const key = event.key?.toLowerCase();
      if (key === 'z') {
        event.preventDefault();
        if (event.shiftKey) redo();
        else undo();
      } else if (key === 'a') {
        event.preventDefault();
        setNodes(nodes.map(n => ({ ...n, selected: true })));
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [undo, redo, nodes, setNodes]);

  // Closes the context menu on Escape or on any click elsewhere in the
  // document — a menu that only closes via its own actions would trap the
  // user into picking one instead of just dismissing it, which is not how
  // any real context menu behaves.
  useEffect(() => {
    if (!contextMenu) return;
    const onKeyDown = (e) => { if (e.key === 'Escape') setContextMenu(null); };
    const onClick = () => setContextMenu(null);
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('click', onClick);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('click', onClick);
    };
  }, [contextMenu]);

  // Copy/cut/paste (Stage 3) — ported from copy-paste-pro-example's
  // useCopyPaste.ts, with one real fix beyond what that source does: it
  // never remaps parentId on paste at all (see useBpmnCopyPaste.js for the
  // full reasoning), which this canvas needs after Stage 1's pools.
  useBpmnCopyPaste(nodes, edges, setNodes, setEdges, takeSnapshot);

  // Auto-arrange is an explicit button, not run automatically on every change
  // (React_Flow_Pro/auto-layout-pro-example's useAutoLayout re-runs on every
  // structural change) — a documentation canvas is hand-arranged by a person
  // mid-thought, and silently relayouting under them while they work would
  // fight that. Matches the M-Files canvas's own "⟲ Auto-arrange" button pattern.
  //
  // fitView (the <ReactFlow> prop below) only runs once, on initial mount — it
  // does not re-fit after nodes move, so Auto-arrange needs its own explicit
  // fitView() call once the new positions have actually rendered (a 0-delay
  // rAF, not synchronous — dagre's output needs a paint before fitView can
  // measure real node bounds). The dagre layout + takeSnapshot themselves now
  // live in layoutSlice.js's autoArrange action (Phase A, step 5) — fitView()
  // stays here because it's a useReactFlow() hook method a plain store action
  // can't call, same reason toObject()/setViewport stayed in this component
  // for save-load.
  const autoArrangeAction = useBpmnStore(s => s.autoArrange);
  const autoArrange = useCallback(() => {
    autoArrangeAction();
    requestAnimationFrame(() => fitView({ duration: 300, padding: 0.2 }));
  }, [autoArrangeAction, fitView]);

  // Drag-and-drop from the palette — adapted from React_Flow_Pro/shapes-pro-example's
  // own App.tsx onDragOver/onDrop pair (screenToFlowPosition + setNodes on drop).
  // Click-to-add on the tiles themselves is untouched — this is an addition, not
  // a replacement, so onDrop calls the exact same add* actions click already uses,
  // just with a real drop position instead of the default {x:40,y:40}.
  const onDragOver = useCallback((e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback((e) => {
    e.preventDefault();
    const raw = e.dataTransfer.getData('application/bpmn-palette-item');
    if (!raw) return;
    const item = JSON.parse(raw);
    const position = screenToFlowPosition({ x: e.clientX, y: e.clientY });
    if (item.kind === 'gateway') addGateway(item.gatewayType, position);
    else if (item.kind === 'task') addTask(position);
    else if (item.kind === 'subprocess') addSubProcess(position);
    else if (item.kind === 'start') addStart(position);
    else if (item.kind === 'end') addEnd(position);
    else if (item.kind === 'pool') addPool(position);
  }, [screenToFlowPosition, addGateway, addTask, addSubProcess, addStart, addEnd, addPool]);

  // Smart alignment guides (Phase D) — wraps the store's own onNodesChange
  // rather than replacing it. Only a genuine single-node drag-in-progress is
  // inspected; everything else (multi-select, resize, remove, ...) passes
  // through untouched. Snapping here composes with snapToGrid below rather
  // than fighting it — React Flow applies snapToGrid to the change's
  // position before onNodesChange ever sees it, so this refines an
  // already-grid-snapped position toward a nearby node's actual edge/center.
  const handleNodesChange = useCallback((changes) => {
    const dragChange = changes.length === 1 && changes[0].type === 'position' && changes[0].dragging && changes[0].position
      ? changes[0] : null;

    if (dragChange) {
      const draggedNode = nodes.find(n => n.id === dragChange.id);
      if (draggedNode) {
        const { horizontal, vertical, snapX, snapY } = getHelperLines({ ...draggedNode, position: dragChange.position }, nodes);
        setHelperLines({ horizontal, vertical });
        if (snapX !== undefined) dragChange.position.x = snapX;
        if (snapY !== undefined) dragChange.position.y = snapY;
      }
    } else if (helperLines.horizontal !== undefined || helperLines.vertical !== undefined) {
      setHelperLines({});
    }

    onNodesChange(changes);
  }, [nodes, onNodesChange, helperLines]);

  // Snapshot once, at the very start of a drag gesture — matches the Pro
  // example's own onNodeDragStart exactly. Not inside handleNodesChange's
  // per-frame position updates (would flood history), and covers pool
  // reparenting for free: a drag that ends in onNodeDragStop reparenting a
  // node is still just one drag gesture, so one snapshot at its start is
  // the correct single undo step for the whole "moved into a pool" action.
  const onNodeDragStart = useCallback(() => {
    takeSnapshot();
  }, [takeSnapshot]);

  const handleReconnect = useCallback((oldEdge, newConnection) => {
    reconnectSucceededRef.current = true;
    reconnectExistingEdge(oldEdge, newConnection);
  }, [reconnectExistingEdge]);

  const handleReconnectStart = useCallback((_, edge, handleType) => {
    reconnectInProgressRef.current = true;
    reconnectSucceededRef.current = false;
    reconnectEdgeIdRef.current = edge?.id ?? null;
    reconnectHandleTypeRef.current = handleType ?? null;
  }, []);

  const handleReconnectEnd = useCallback((event) => {
    if (!reconnectSucceededRef.current && reconnectEdgeIdRef.current) {
      const point = 'changedTouches' in event ? event.changedTouches[0] : event;
      if (point?.clientX != null && point?.clientY != null) {
        const hit = document.elementFromPoint(point.clientX, point.clientY);
        const nodeEl = hit?.closest?.('.react-flow__node');
        const droppedNodeId = nodeEl?.getAttribute('data-id') || nodeEl?.dataset?.id || null;
        const oldEdge = edges.find(e => e.id === reconnectEdgeIdRef.current);
        if (droppedNodeId && oldEdge) {
          if (reconnectHandleTypeRef.current === 'source') {
            reconnectExistingEdge(oldEdge, { source: droppedNodeId, target: oldEdge.target });
          } else if (reconnectHandleTypeRef.current === 'target') {
            reconnectExistingEdge(oldEdge, { source: oldEdge.source, target: droppedNodeId });
          }
        }
      }
    }

    reconnectInProgressRef.current = false;
    reconnectSucceededRef.current = false;
    reconnectEdgeIdRef.current = null;
    reconnectHandleTypeRef.current = null;
  }, [edges, reconnectExistingEdge]);

  // Pool containment (Stage 1, React Flow Pro enhancements) — ported from
  // parent-child-relation-pro-example's own onNodeDrag/onNodeDragStop pair
  // (checked directly, not guessed at). onNodeDrag only toggles the
  // hovered-over pool's active-highlight className here — it deliberately
  // does NOT also reassert the dragged node's own position the way the Pro
  // example does, because handleNodesChange above already owns that (grid
  // snap + helper-line refinement); redoing it here would just fight that
  // pipeline for no benefit this canvas doesn't already have covered.
  const onNodeDrag = useCallback((_, node) => {
    if (node.type === 'group') return; // pools don't nest into other pools this stage
    const hasPools = useBpmnStore.getState().nodes.some(n => n.type === 'group');
    if (!hasPools) return;
    const targetId = getIntersectingNodes(node).find(n => n.type === 'group')?.id;
    const isNewTarget = !!targetId && node.parentId !== targetId;
    // Atomic store update: mutate only pool className from the latest state
    // at commit-time so drag position updates from onNodesChange are never
    // overwritten by a stale node-array replacement.
    useBpmnStore.setState(s => ({
      nodes: s.nodes.map(n => (
        n.type === 'group'
          ? { ...n, className: n.id === targetId && isNewTarget ? 'bpmn-pool-active' : undefined }
          : n
      )),
    }));
  }, [getIntersectingNodes]);

  // Fires once, on release — real reparenting happens here, not on every
  // drag frame. fitNodeIntoParent works off the target pool's ACTUAL
  // measured bounds (never a guessed box size); sortForHierarchy keeps the
  // pool ahead of its new child in the array, which React Flow requires.
  const onNodeDragStop = useCallback((_, node) => {
    if (node.type === 'group') return;
    const hasPools = useBpmnStore.getState().nodes.some(n => n.type === 'group');
    if (!hasPools) return;
    const groupNode = getIntersectingNodes(node).find(n => n.type === 'group');
    if (groupNode && node.parentId !== groupNode.id) {
      // Computed once, from the same node reference, so the child's new
      // relative position and the parent's (possible) new size always agree
      // — grows the pool to fit the dropped node instead of squishing it
      // into whatever size the pool already was, which was the exact
      // complaint once the pool itself stopped silently blocking drags
      // onto it in the first place.
      const { position, parentGrew, parentSize } = fitNodeIntoParent(node, groupNode);
      useBpmnStore.setState(s => ({
        nodes: s.nodes.map(n => {
          if (n.id === node.id) {
            return { ...n, position, parentId: groupNode.id, extent: 'parent' };
          }
          if (n.id === groupNode.id) {
            return {
              ...n,
              className: undefined,
              style: parentGrew ? { ...n.style, width: parentSize.width, height: parentSize.height } : n.style,
            };
          }
          return n;
        }).sort(sortForHierarchy),
      }));
    } else {
      useBpmnStore.setState(s => ({
        nodes: s.nodes.map(n => (n.type === 'group' ? { ...n, className: undefined } : n)),
      }));
    }
  }, [getIntersectingNodes]);

  // Reverses reparenting — the child's stored position is parent-relative,
  // so it has to be converted back to absolute (parent's real absolute
  // position + the child's relative one) via getInternalNode, not just the
  // parent's own .position field, which wouldn't hold for a nested pool.
  const handleDetachSelected = useCallback(() => {
    if (!selectedNode?.parentId) return;
    takeSnapshot();
    const parentAbs = getInternalNode(selectedNode.parentId)?.internals?.positionAbsolute ?? { x: 0, y: 0 };
    setNodes(nodes.map(n => {
      if (n.id !== selectedNode.id) return n;
      const { parentId, extent, ...rest } = n;
      return { ...rest, position: { x: n.position.x + parentAbs.x, y: n.position.y + parentAbs.y } };
    }));
  }, [selectedNode, nodes, setNodes, getInternalNode, takeSnapshot]);

  // "Magic connector" (Phase D) — the existing source handle IS the "+"
  // (CSS in App.jsx grows it and shows a plus glyph on node hover); dragging
  // from it and releasing on empty canvas creates a Task and connects it in
  // one motion, rather than requiring add-then-connect as two separate steps.
  // Dropping on a real handle instead completes a normal connection (onConnect,
  // wired to the store already) — connectionState.toNode is set in that case,
  // and this handler steps aside.
  const onConnectEnd = useCallback((event, connectionState) => {
    if (reconnectInProgressRef.current) return;
    if (connectionState.isValid || !connectionState.fromNode) return;

    const point = 'changedTouches' in event ? event.changedTouches[0] : event;

    // If the drag ends on a node body (not its tiny handle), treat that as a
    // valid connect target instead of falling through to auto-create.
    const hit = point?.clientX != null && point?.clientY != null
      ? document.elementFromPoint(point.clientX, point.clientY)
      : null;
    const nodeEl = hit?.closest?.('.react-flow__node');
    const droppedNodeId = nodeEl?.getAttribute('data-id') || nodeEl?.dataset?.id || null;

    if (droppedNodeId && droppedNodeId !== connectionState.fromNode.id) {
      onConnect({
        source: connectionState.fromNode.id,
        sourceHandle: connectionState.fromHandle?.id ?? undefined,
        target: droppedNodeId,
      });
      return;
    }

    const position = screenToFlowPosition({ x: point.clientX, y: point.clientY });
    const newId = addTask(position);
    setEdges([...edges, {
      id: makeId(),
      source: connectionState.fromNode.id,
      sourceHandle: connectionState.fromHandle?.id ?? undefined,
      target: newId,
    }]);
  }, [screenToFlowPosition, addTask, setEdges, edges]);

  // deleteElements has no special awareness of parentId (confirmed from
  // @xyflow/react's own source — it cascades connected EDGES but not
  // children) — deleting a pool through it directly would leave its
  // children with a dangling parentId pointing at a node that no longer
  // exists. Detach them into the pool's own absolute position first, in the
  // same state update that removes the pool, rather than orphaning them.
  const handleDeleteSelected = useCallback(() => {
    if (!selectedNode) return;
    takeSnapshot();
    if (selectedNode.type === 'group') {
      const parentAbs = selectedNode.position; // a pool itself has no parent in this stage, so its own position is already absolute
      const nextNodes = nodes
        .filter(n => n.id !== selectedNode.id)
        .map(n => {
          if (n.parentId !== selectedNode.id) return n;
          const { parentId, extent, ...rest } = n;
          return { ...rest, position: { x: n.position.x + parentAbs.x, y: n.position.y + parentAbs.y } };
        });
      setNodes(nextNodes);
      return;
    }
    deleteElements({ nodes: [{ id: selectedNode.id }] });
  }, [selectedNode, nodes, setNodes, deleteElements, takeSnapshot]);

  // Explicit edge selection keeps the edge toolbar reliable across custom
  // edge rendering layers where default pane hit-testing can be inconsistent.
  const handleEdgeClick = useCallback((event, edge) => {
    event.stopPropagation();
    setActiveNodeToolbarId(null);
    setInspectorOpen(false);
    setActiveEdgeToolbarId(null);
    setNodes(nodes.map(n => (n.selected ? { ...n, selected: false } : n)));
    setEdges(edges.map(e => ({ ...e, selected: e.id === edge.id })));
  }, [nodes, edges, setNodes, setEdges, setActiveEdgeToolbarId]);

  const handleEdgeDoubleClick = useCallback((event, edge) => {
    event.stopPropagation();
    setActiveNodeToolbarId(null);
    setInspectorOpen(false);
    setNodes(nodes.map(n => (n.selected ? { ...n, selected: false } : n)));
    setEdges(edges.map(e => ({ ...e, selected: e.id === edge.id })));
    setActiveEdgeToolbarId(edge.id);
  }, [nodes, edges, setNodes, setEdges, setActiveEdgeToolbarId]);

  // The floating toolbar now opens on the SAME click that selects a node,
  // not only after a double-click — the "Double-click a selected object to
  // edit" hint that used to live here could structurally never be seen
  // (the toolbar that would render it was itself gated behind double-click,
  // and that same double-click handler turned the hint off in one call), so
  // rather than patch around that, the toolbar's own Edit/Duplicate/Delete
  // buttons are the onboarding now — visible the instant something is
  // selected, self-explanatory without needing a separate hint string.
  const handleNodeClick = useCallback((event, node) => {
    setActiveEdgeToolbarId(null);
    setActiveNodeToolbarId(node.id);
    setInspectorOpen(false);
  }, [setActiveEdgeToolbarId]);

  const handlePaneClick = useCallback(() => {
    setActiveNodeToolbarId(null);
    setInspectorOpen(false);
    setActiveEdgeToolbarId(null);
    setEdges(edges.map(e => (e.selected ? { ...e, selected: false } : e)));
    setContextMenu(null);
  }, [edges, setEdges, setActiveEdgeToolbarId]);

  // Right-click selects the target first (matching what a left click would
  // have done, so Edit/Detach/Delete below — which all act on selectedNode —
  // resolve to the right element) then opens a small menu at the cursor.
  // preventDefault suppresses the browser's own native menu.
  const handleNodeContextMenu = useCallback((event, node) => {
    event.preventDefault();
    setActiveEdgeToolbarId(null);
    // Right-clicking a node that's already part of a 2+ multi-selection
    // keeps the whole selection intact, so the menu can offer bulk actions
    // (Group, Duplicate-all, Delete-all) on it — collapsing to a single
    // selection here would silently wipe out the very selection Group is
    // supposed to act on. Right-clicking anything else still replaces the
    // selection with just that one node, same as before.
    const alreadyInMultiSelection = node.selected && nodes.filter(n => n.selected).length > 1;
    if (!alreadyInMultiSelection) {
      setNodes(nodes.map(n => ({ ...n, selected: n.id === node.id })));
      setEdges(edges.map(e => (e.selected ? { ...e, selected: false } : e)));
    }
    setContextMenu({ x: event.clientX, y: event.clientY, type: 'node', id: node.id });
  }, [nodes, edges, setNodes, setEdges, setActiveEdgeToolbarId]);

  // React Flow overlays a `.react-flow__nodesselection-rect` element across
  // a multi-selection's whole bounding box (it's what lets you drag the
  // group from anywhere inside it, not just from a node) — that overlay
  // sits on top of the individual nodes and swallows a right-click before
  // onNodeContextMenu ever sees it, confirmed live (elementFromPoint at the
  // click coordinates returned the overlay, not the node). React Flow has
  // a dedicated callback for exactly this, onSelectionContextMenu, wired
  // here rather than trying to defeat the overlay's own hit-testing.
  const handleSelectionContextMenu = useCallback((event, selNodes) => {
    event.preventDefault();
    setContextMenu({ x: event.clientX, y: event.clientY, type: 'node', id: selNodes[0]?.id });
  }, []);

  const handleEdgeContextMenu = useCallback((event, edge) => {
    event.preventDefault();
    setActiveNodeToolbarId(null);
    setInspectorOpen(false);
    setNodes(nodes.map(n => (n.selected ? { ...n, selected: false } : n)));
    setEdges(edges.map(e => ({ ...e, selected: e.id === edge.id })));
    setContextMenu({ x: event.clientX, y: event.clientY, type: 'edge', id: edge.id });
  }, [nodes, edges, setNodes, setEdges]);

  // Right-click on empty canvas opens its own menu — deliberately does NOT
  // touch the current selection (unlike a left click on empty pane, which
  // deselects). Group needs whatever's already selected to still be
  // selected when the menu opens, or there'd be nothing for it to act on.
  const handlePaneContextMenu = useCallback((event) => {
    event.preventDefault();
    setContextMenu({ x: event.clientX, y: event.clientY, type: 'pane' });
  }, []);

  const handleDuplicateSelected = useCallback(() => {
    if (selectedNode) duplicateNode(selectedNode.id);
  }, [selectedNode, duplicateNode]);

  const handleNodeDoubleClick = useCallback((event, node) => {
    event.stopPropagation();
    setActiveEdgeToolbarId(null);
    setActiveNodeToolbarId(node.id);
    setInspectorOpen(true);
  }, [setActiveEdgeToolbarId]);

  // Click a validation warning → select + zoom to the real element it's
  // about (locateWarning maps bpmn-moddle's own element.id back to ours;
  // an unparsable-content warning has no element and correctly returns
  // null, so it renders as plain text with nothing to click).
  const handleLocateWarning = useCallback((warning) => {
    const loc = locateWarning(warning);
    if (!loc) return;
    if (loc.kind === 'node') {
      if (!nodes.some(n => n.id === loc.id)) return;
      setNodes(nodes.map(n => ({ ...n, selected: n.id === loc.id })));
      fitView({ nodes: [{ id: loc.id }], duration: 300, padding: 0.6 });
    } else {
      const edge = edges.find(e => e.id === loc.id);
      if (!edge) return;
      setNodes(nodes.map(n => ({ ...n, selected: n.id === edge.source || n.id === edge.target })));
      fitView({ nodes: [{ id: edge.source }, { id: edge.target }], duration: 300, padding: 0.6 });
    }
  }, [nodes, edges, setNodes, fitView]);

  const handleSaveSnapshot = useCallback(() => {
    setSnapshots(s => [
      { id: makeId(), at: new Date(), nodes: nodes.map(n => ({ ...n })), edges: edges.map(e => ({ ...e })) },
      ...s,
    ].slice(0, 20)); // a bare list with no cap would grow unbounded over a long session
  }, [nodes, edges]);

  const handleRestoreSnapshot = useCallback((snap) => {
    takeSnapshot(); // lets Ctrl+Z undo the restore itself, back to what was on canvas before it
    setNodes(snap.nodes.map(n => ({ ...n })));
    setEdges(snap.edges.map(e => ({ ...e })));
    requestAnimationFrame(() => fitView({ duration: 300, padding: 0.2 }));
  }, [setNodes, setEdges, fitView, takeSnapshot]);

  // Real BPMN 2.0 export via bpmn-moddle (features/bpmn-io/bpmnModdle.js) —
  // exportBpmnFile (bpmn-io slice) round-trips through fromXML first so "0
  // warnings" here means the file actually validates against the real
  // schema, not just that toXML didn't throw. No useReactFlow() hook
  // involved, so the whole thing lives in the slice; this wrapper just
  // turns the returned warnings into the toast.
  const handleExportBpmn = useCallback(async () => {
    try {
      const { warnings, cancelled } = await exportBpmnFile();
      // Electron's native Save-As dialog (window.file.save) can be
      // cancelled by the user — a real, silent no-op, not an error, same as
      // dismissing any other save dialog.
      if (cancelled) return;
      setBpmnStatus(warnings.length === 0
        ? { kind: 'ok', text: 'Exported — 0 schema warnings' }
        : { kind: 'warn', text: `Exported with ${warnings.length} schema warning(s) — see console` });
      if (warnings.length) console.warn('[bpmn-moddle] export warnings', warnings);
    } catch (err) {
      setBpmnStatus({ kind: 'error', text: `Export failed: ${err.message}` });
    }
  }, [exportBpmnFile]);

  const handleImportBpmnFile = useCallback(async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-selecting the same file next time
    if (!file) return;
    try {
      const { count, warnings } = await importBpmnFileAction(file);
      // fitView() stays here — it's a useReactFlow() hook method the slice's
      // plain store action can't call, same reason toObject()/setViewport
      // stayed in this component for save-load and fitView() stayed here
      // for autoArrange.
      requestAnimationFrame(() => fitView({ duration: 300, padding: 0.2 }));
      setBpmnStatus(warnings.length === 0
        ? { kind: 'ok', text: `Imported ${count} elements — 0 schema warnings` }
        : { kind: 'warn', text: `Imported with ${warnings.length} schema warning(s) — see console` });
      if (warnings.length) console.warn('[bpmn-moddle] import warnings', warnings);
    } catch (err) {
      setBpmnStatus({ kind: 'error', text: `Import failed: ${err.message}` });
    }
  }, [importBpmnFileAction, fitView]);

  // Save/load (Phase B, position 3) — reactflow.dev's own free "Save and
  // Restore" pattern: toObject() (only reachable here, inside the component,
  // since it's a useReactFlow() hook a plain store action can't call)
  // captures {nodes, edges, viewport}; the slice handles the actual
  // download. JSON file, no database, no auto-persistence — a plain reload
  // still starts from the starter sketch (nodesSlice/edgesSlice's own
  // initialNodes/initialEdges) unless a saved file is explicitly loaded.
  const handleSaveToFile = useCallback(async () => {
    try {
      const result = await saveToFile(toObject());
      // Electron's native Save-As dialog can be cancelled — a real, silent
      // no-op, not an error, matching handleExportBpmn's own handling.
      if (result?.cancelled) return;
      setBpmnStatus({ kind: 'ok', text: `Saved — ${nodes.length} elements` });
    } catch (err) {
      setBpmnStatus({ kind: 'error', text: `Save failed: ${err.message}` });
    }
  }, [saveToFile, toObject, nodes.length]);

  const handleLoadFromFile = useCallback(async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-selecting the same file next time
    if (!file) return;
    try {
      const viewport = await loadFromFile(file);
      // Restore the exact saved pan/zoom when the file has one (toObject()
      // always includes it); fall back to fitView for a file that doesn't
      // (e.g. hand-edited JSON), same fallback handleImportBpmnFile uses.
      if (viewport) setViewport(viewport);
      else requestAnimationFrame(() => fitView({ duration: 300, padding: 0.2 }));
      setBpmnStatus({ kind: 'ok', text: 'Loaded from file' });
    } catch (err) {
      setBpmnStatus({ kind: 'error', text: `Load failed: ${err.message}` });
    }
  }, [loadFromFile, setViewport, fitView]);

  // SVG/PNG canvas snapshot (2026-08-22, unified Export menu's third/fourth
  // format) — pure client-side via html-to-image, not the deferred
  // server-side-image-creation feature. No undo/redo entry (matches
  // handleExportBpmn/handleSaveToFile — export never touches canvas state).
  const handleExportImage = useCallback(async (format) => {
    setExportMenuOpen(false);
    try {
      await (format === 'png' ? exportPng : exportSvg)(nodes, `bpmn-standard-${Date.now()}.${format}`);
      setBpmnStatus({ kind: 'ok', text: `Exported ${format.toUpperCase()} snapshot` });
    } catch (err) {
      setBpmnStatus({ kind: 'error', text: `${format.toUpperCase()} export failed: ${err.message}` });
    }
  }, [nodes]);

  return (
    <div className="bpmn-canvas-wrap">
      <div className="bpmn-body">
        <BpmnPalette
          onAddTask={addTask}
          onAddSubProcess={addSubProcess}
          onAddStart={addStart}
          onAddEnd={addEnd}
          onAddGateway={addGateway}
          onAddPool={addPool}
          connectorStyle={connectorStyle}
          onSetConnectorStyle={setConnectorStyle}
          defaultEdgeType={defaultEdgeType}
          onSetDefaultEdgeType={setDefaultEdgeType}
          routableReady={routableReady}
        />
        <div className="bpmn-main">
          <div className="bpmn-toolbar">
            {/* Auto-arrange/Animate/Export/Import/Reset are view/document
                controls, not palette items — kept as the existing text-button
                convention, deliberately not folded into the palette sidebar. */}
            <div className="bpmn-viewport-controls" role="group" aria-label="Canvas controls">
              <button type="button" className="xb" onClick={() => zoomIn({ duration: 160 })} title="Zoom in"><span className="bpmn-tb-icon">＋</span></button>
              <button type="button" className="xb" onClick={() => zoomOut({ duration: 160 })} title="Zoom out"><span className="bpmn-tb-icon">－</span></button>
              <button type="button" className="xb" onClick={() => fitView({ duration: 220, padding: 0.2 })} title="Fit view">Fit</button>
              <button
                type="button"
                className={`xb ${interactionLocked ? 'blue' : ''}`}
                onClick={() => setInteractionLocked(v => !v)}
                title={interactionLocked ? 'Unlock canvas interactions' : 'Lock canvas interactions'}
              >
                <span className="bpmn-tb-icon">{interactionLocked ? '🔒' : '🔓'}</span>
              </button>
            </div>
            {/* Grouped by function rather than one flat 13-button row — the
                report's own finding: functional either way, but a flat row
                gets harder to scan every time a capability is added. Each
                cluster keeps a role="group" + aria-label like viewport
                controls already had, for the same reason that one did. */}
            {/* Toolbar Undo/Redo buttons removed 2026-08-22 — confirmed live
                (real right-click interactions, real state-change checks, not
                just "the menu item exists") that every object type's own
                right-click context menu (node, edge, empty canvas/pane) has
                always carried working Undo/Redo (undoRedoBtns, below), and
                Ctrl+Z/Ctrl+Shift+Z remain a fully independent third entry
                point (see the keydown handler below) — a dedicated toolbar
                pair was redundant with two entry points that already
                existed. canUndo/canRedo still drive the context-menu
                buttons' disabled state, so they're not orphaned. */}
            <div className="bpmn-toolbar-divider" style={{ marginLeft: 'auto' }} />
            <div className="bpmn-layout-controls" role="group" aria-label="Layout">
              <button type="button" className="xb" onClick={autoArrange} title="Auto-arrange via dagre (React_Flow_Pro/auto-layout-pro-example)"><span className="bpmn-tb-icon">⟲</span> Auto-arrange</button>
              <button type="button" className={`xb ${animateFlow ? 'blue' : ''}`}
                onClick={() => setAnimateFlow(!animateFlow)}
                title="Animate every sequence flow with a traveling dot — decorative only, this canvas has no automatic/manual distinction to ground it in">
                <span className="bpmn-tb-icon">▶</span> Animate
              </button>
            </div>
            <div className="bpmn-toolbar-divider" />
            <div className="bpmn-io-controls" role="group" aria-label="Import and export">
              {/* Unified Export/Import menus (2026-08-22 UX pass) — one
                  control per direction, format picked from a dropdown,
                  replacing the previous 4 separate buttons. Underlying
                  logic unchanged: JSON routes through saveToFile/
                  loadFromFile (saveLoadSlice.js), BPMN XML through
                  exportBpmnFile/importBpmnFile (bpmnIoSlice.js) — this is a
                  UI consolidation only. */}
              <div className="bpmn-export-menu" onMouseLeave={() => setExportMenuOpen(false)}>
                <button type="button" className={`xb ${exportMenuOpen ? 'blue' : ''}`} onClick={() => setExportMenuOpen(v => !v)} title="Export the diagram — JSON, BPMN XML, SVG, or PNG">
                  <span className="bpmn-tb-icon">⇩</span> Export ▾
                </button>
                {exportMenuOpen && (
                  <div className="bpmn-history-dropdown">
                    <button type="button" className="bpmn-history-item" onClick={() => { setExportMenuOpen(false); handleSaveToFile(); }} title="Full app state — nodes, edges, viewport">JSON <span className="bpmn-history-item-count">.json</span></button>
                    <button type="button" className="bpmn-history-item" onClick={() => { setExportMenuOpen(false); handleExportBpmn(); }} title="Real BPMN 2.0 XML, schema-valid (bpmn-moddle)">BPMN XML <span className="bpmn-history-item-count">.bpmn</span></button>
                    <button type="button" className="bpmn-history-item" onClick={() => handleExportImage('svg')} title="Vector snapshot of the current canvas">SVG <span className="bpmn-history-item-count">.svg</span></button>
                    <button type="button" className="bpmn-history-item" onClick={() => handleExportImage('png')} title="Raster snapshot of the current canvas">PNG <span className="bpmn-history-item-count">.png</span></button>
                  </div>
                )}
              </div>
              <div className="bpmn-export-menu" onMouseLeave={() => setImportMenuOpen(false)}>
                <button type="button" className={`xb ${importMenuOpen ? 'blue' : ''}`} onClick={() => setImportMenuOpen(v => !v)} title="Import a diagram — JSON or BPMN XML">
                  <span className="bpmn-tb-icon">⇧</span> Import ▾
                </button>
                {importMenuOpen && (
                  <div className="bpmn-history-dropdown">
                    <button type="button" className="bpmn-history-item" onClick={() => { setImportMenuOpen(false); saveLoadInputRef.current?.click(); }} title="Load a previously saved JSON file">JSON <span className="bpmn-history-item-count">.json</span></button>
                    <button type="button" className="bpmn-history-item" onClick={() => { setImportMenuOpen(false); importInputRef.current?.click(); }} title="Import a real BPMN 2.0 .bpmn/.xml file (bpmn-moddle)">BPMN XML <span className="bpmn-history-item-count">.bpmn</span></button>
                  </div>
                )}
              </div>
              <input ref={importInputRef} type="file" accept=".bpmn,.xml" style={{ display: 'none' }} onChange={handleImportBpmnFile} />
              <input ref={saveLoadInputRef} type="file" accept=".json" style={{ display: 'none' }} onChange={handleLoadFromFile} />
            </div>
            <div className="bpmn-toolbar-divider" />
            <button type="button" className={`xb ${businessView ? 'blue' : ''}`}
              onClick={() => setBusinessView(!businessView)}
              title={businessView ? 'Business view — technical BPMN subtype icons and IDs hidden. Click for Technical view.' : 'Technical view — full BPMN detail (subtype icons, IDs). Click for Business view.'}>
              Business View
            </button>
            {bpmnStatus && (
              <span className={`bpmn-status bpmn-status-${bpmnStatus.kind}`} title={bpmnStatus.text}>{bpmnStatus.text}</span>
            )}
            <div className="bpmn-toolbar-divider" />
            <div className="bpmn-reference-controls" role="group" aria-label="History and shortcuts">
              <div className="bpmn-history">
                <button type="button" className={`xb ${historyOpen ? 'blue' : ''}`} onClick={() => setHistoryOpen(v => !v)} title="Version history — manual, in-memory snapshots (not persisted across a reload)">
                  History{snapshots.length ? ` (${snapshots.length})` : ''}
                </button>
                {historyOpen && (
                  <div className="bpmn-history-dropdown">
                    <button type="button" className="bpmn-history-save" onClick={handleSaveSnapshot}>+ Save snapshot</button>
                    {snapshots.length === 0 && <div className="bpmn-pal-empty">No snapshots yet</div>}
                    {snapshots.map(snap => (
                      <button key={snap.id} type="button" className="bpmn-history-item" onClick={() => handleRestoreSnapshot(snap)} title={`Restore — ${snap.nodes.length} nodes, ${snap.edges.length} edges`}>
                        <span>{snap.at.toLocaleTimeString()}</span>
                        <span className="bpmn-history-item-count">{snap.nodes.length}n / {snap.edges.length}e</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="bpmn-shortcuts">
                <button type="button" className={`xb ${shortcutsOpen ? 'blue' : ''}`} onClick={() => setShortcutsOpen(v => !v)} title="Keyboard shortcuts reference"><span className="bpmn-tb-icon">⌨</span> Shortcuts</button>
                {shortcutsOpen && (
                  <div className="bpmn-shortcuts-dropdown" onMouseLeave={() => setShortcutsOpen(false)}>
                    {SHORTCUTS.map(({ keys, label }) => (
                      <div className="bpmn-shortcuts-row" key={label}>
                        <span>{label}</span>
                        <span className="bpmn-shortcuts-keys">
                          {keys.map(k => <kbd key={k}>{k}</kbd>)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="bpmn-toolbar-divider" />
            <button type="button" className="xb" onClick={resetAll} title="Reset to the starter example"><span className="bpmn-tb-icon">↺</span> Reset</button>
          </div>
          <div className="bpmn-flow-wrap">
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={handleNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onReconnect={handleReconnect}
              onReconnectStart={handleReconnectStart}
              onReconnectEnd={handleReconnectEnd}
              onConnectEnd={onConnectEnd}
              onNodeDragStart={onNodeDragStart}
              onNodeDrag={onNodeDrag}
              onNodeDragStop={onNodeDragStop}
              onNodeClick={handleNodeClick}
              onEdgeClick={handleEdgeClick}
              onEdgeDoubleClick={handleEdgeDoubleClick}
              onNodeDoubleClick={handleNodeDoubleClick}
              onPaneClick={handlePaneClick}
              onNodeContextMenu={handleNodeContextMenu}
              onEdgeContextMenu={handleEdgeContextMenu}
              onPaneContextMenu={handlePaneContextMenu}
              onSelectionContextMenu={handleSelectionContextMenu}
              nodeTypes={nodeTypes}
              edgeTypes={edgeTypes}
              defaultEdgeOptions={defaultEdgeOptions}
              connectionMode={ConnectionMode.Loose}
              fitView
              fitViewOptions={{ padding: 0.2 }}
              snapToGrid
              snapGrid={SNAP_GRID}
              nodesDraggable={!interactionLocked}
              nodesConnectable={!interactionLocked}
              edgesReconnectable={!interactionLocked}
              // Plain left-drag on empty canvas pans, same as it always did —
              // an earlier pass here made it marquee-select by default
              // instead (the Figma/Miro convention), which broke the
              // pan-by-drag muscle memory this app's own users actually
              // rely on. Reverted to panOnDrag={true}. Marquee-select is
              // still fully available: React Flow has its own independent
              // selectionKeyCode mechanism (default 'Shift', never
              // overridden here) that forces selection-box mode on ANY
              // drag while Shift is held, regardless of panOnDrag —
              // confirmed directly in @xyflow/react's source (Pane's
              // `isSelectionActive = (...) || selectionKeyPressed`), not
              // guessed at. So: drag = pan, Shift+drag = marquee-select,
              // Ctrl/Shift+click = add one node to the selection.
              panOnDrag={!interactionLocked}
              zoomOnScroll={!interactionLocked}
              zoomOnPinch={!interactionLocked}
              zoomOnDoubleClick={!interactionLocked}
              selectionOnDrag={!interactionLocked}
              // Full (React Flow's default) requires a node to be entirely
              // inside the drag rectangle to count — Partial is what
              // selection-grouping-pro-example itself uses, and matches the
              // far more common "just touch it" expectation from Figma/Miro.
              selectionMode={SelectionMode.Partial}
              // Windows' real default is Control, not Shift (confirmed in
              // @xyflow/react's own source) — Shift is what most design tools
              // (Figma, Miro) train people to reach for, so accept both rather
              // than making the user guess which one this app uses.
              multiSelectionKeyCode={['Shift', 'Control', 'Meta']}
              deleteKeyCode={['Backspace', 'Delete']}
              onDrop={onDrop}
              onDragOver={onDragOver}
              attributionPosition="bottom-left"
            >
              <Background gap={GRID_GAP} />
              <MiniMap
                nodeColor={minimapNodeColor}
                nodeComponent={MinimapNode}
                nodeStrokeWidth={0}
                nodeBorderRadius={3}
                maskColor="rgba(3,9,16,0.65)"
                style={{ background: 'var(--s2)' }}
                pannable
                zoomable
                position="bottom-right"
                ariaLabel="Diagram minimap — click or drag to jump around the canvas"
              />
              <HelperLines horizontal={helperLines.horizontal} vertical={helperLines.vertical} />
              <SelectedNodesToolbar />
              {/* Floating contextual toolbar (Phase D), relocated into
                  features/toolbar/NodeInspectorToolbar.jsx — Edit/Duplicate/
                  Detach/Delete on whatever node is currently selected; Edit
                  expands an inline inspector scoped to id/type (read-only) +
                  label (editable), per Decision 7 — no script/action-body
                  editing lives here. Detach/Delete stay wired through this
                  component's own handlers (useReactFlow() hooks a plain
                  child component/store action can't call), same reason
                  fitView()/toObject() stayed component-side elsewhere. */}
              <NodeInspectorToolbar onDetach={handleDetachSelected} onDelete={handleDeleteSelected} />
            </ReactFlow>
            {/* Right-click menu — a second, faster path to Edit/Duplicate/
                Delete alongside double-click, matching the secondary
                interaction every comparable tool offers. position:fixed
                so event.clientX/Y (viewport coordinates) place it exactly
                at the cursor regardless of canvas pan/zoom. */}
            {contextMenu && (() => {
              // Group acts on whatever's currently selected, not "every node
              // on the canvas" — right-click is just where the menu opens
              // from, not what it acts on. Grouping unconditionally would
              // silently merge two unrelated workflows sitting on the same
              // canvas into one Pool; requiring a real selection first means
              // the user always chose what gets grouped. Available from both
              // the empty-canvas menu AND the node menu — right-clicking
              // directly on one of several already-selected nodes is just as
              // natural a way to reach for it as right-clicking empty space.
              const groupable = nodes.filter(n => n.selected && !n.parentId);
              // Every top-level node, selected or not — "wrap the whole
              // workflow" shouldn't require selecting everything first.
              // Same underlying action as Group (groupSelectedIntoPool),
              // just applied to everything ungrouped instead of only
              // whatever happens to be selected at the moment.
              const wrappable = nodes.filter(n => !n.parentId);
              const wrapBtn = (
                <button
                  type="button"
                  disabled={wrappable.length < 2}
                  title={wrappable.length < 2 ? 'Add at least 2 elements to the canvas first' : `Wrap all ${wrappable.length} elements into one Pool`}
                  onClick={() => { groupSelectedIntoPool(wrappable.map(n => n.id), getNodesBounds(wrappable)); setContextMenu(null); }}
                >
                  ▥ Wrap Workflow in Pool
                </button>
              );
              const groupBtn = (
                <button
                  type="button"
                  disabled={groupable.length < 2}
                  title={groupable.length < 2 ? 'Select 2 or more elements first' : `Group ${groupable.length} selected elements into a Pool`}
                  onClick={() => { groupSelectedIntoPool(groupable.map(n => n.id), getNodesBounds(groupable)); setContextMenu(null); }}
                >
                  ⬚ Group selection into Pool
                </button>
              );
              const undoRedoBtns = (
                <>
                  <button type="button" disabled={!canUndo} onClick={() => { undo(); setContextMenu(null); }}>↶ Undo</button>
                  <button type="button" disabled={!canRedo} onClick={() => { redo(); setContextMenu(null); }}>↷ Redo</button>
                </>
              );
              return (
                <div
                  className="bpmn-context-menu"
                  style={{ left: contextMenu.x, top: contextMenu.y }}
                  onClick={(e) => e.stopPropagation()}
                  onContextMenu={(e) => e.preventDefault()}
                >
                  {contextMenu.type === 'node' && (
                    groupable.length > 1 && groupable.some(n => n.id === contextMenu.id) ? (
                      // Right-clicked node is part of an existing multi-
                      // selection (preserved by handleNodeContextMenu rather
                      // than collapsed to just this one) — offer the same
                      // bulk actions the pane menu and the floating
                      // multi-select toolbar do. No "Edit" here: opening one
                      // inspector for several selected elements at once
                      // doesn't mean anything.
                      <>
                        <span className="bpmn-context-menu-label">{groupable.length} selected</span>
                        <button type="button" onClick={() => { duplicateNodes(groupable.map(n => n.id)); setContextMenu(null); }}>⧉ Duplicate</button>
                        <button type="button" onClick={() => { deleteNodes(groupable.map(n => n.id)); setContextMenu(null); }}>✕ Delete</button>
                        <div className="bpmn-context-menu-divider" />
                        {groupBtn}
                        <div className="bpmn-context-menu-divider" />
                        {undoRedoBtns}
                      </>
                    ) : (
                      <>
                        <button type="button" onClick={() => { setInspectorOpen(true); setActiveNodeToolbarId(contextMenu.id); setContextMenu(null); }}>✎ Edit</button>
                        <button type="button" onClick={() => { handleDuplicateSelected(); setContextMenu(null); }}>⧉ Duplicate</button>
                        {selectedNode?.parentId && (
                          <button type="button" onClick={() => { handleDetachSelected(); setContextMenu(null); }}>⇱ Detach</button>
                        )}
                        <button type="button" onClick={() => { handleDeleteSelected(); setContextMenu(null); }}>✕ Delete</button>
                        <div className="bpmn-context-menu-divider" />
                        {groupBtn}
                        <div className="bpmn-context-menu-divider" />
                        {undoRedoBtns}
                      </>
                    )
                  )}
                  {contextMenu.type === 'edge' && (() => {
                    const menuEdgeType = edges.find(e => e.id === contextMenu.id)?.type || 'flowEdge';
                    return (
                      <>
                        <button type="button" onClick={() => { setActiveEdgeToolbarId(contextMenu.id); setContextMenu(null); }}>✎ Edit label</button>
                        <button type="button" onClick={() => { duplicateEdge(contextMenu.id); setContextMenu(null); }}>⧉ Duplicate</button>
                        <button type="button" onClick={() => { deleteEdge(contextMenu.id); setContextMenu(null); }}>✕ Delete</button>
                        <div className="bpmn-context-menu-divider" />
                        <button type="button" className={menuEdgeType === 'flowEdge' ? 'active' : ''} onClick={() => { setEdgeType(contextMenu.id, 'flowEdge'); setContextMenu(null); }}>⬌ Type: Default</button>
                        <button type="button" className={menuEdgeType === 'editable-edge' ? 'active' : ''} onClick={() => { setEdgeType(contextMenu.id, 'editable-edge'); setContextMenu(null); }} title="Draggable control points (05_editable-edge)">✥ Type: Editable</button>
                        <button
                          type="button"
                          className={menuEdgeType === 'routable-edge' ? 'active' : ''}
                          disabled={!routableReady}
                          onClick={() => { setEdgeType(contextMenu.id, 'routable-edge'); setContextMenu(null); }}
                          title={routableReady ? 'Obstacle-avoiding routing via libavoid (10_libavoid-edge-routing)' : 'Loading libavoid routing engine…'}
                        >
                          ⟿ Type: Routable{!routableReady && ' (loading…)'}
                        </button>
                        <div className="bpmn-context-menu-divider" />
                        {undoRedoBtns}
                      </>
                    );
                  })()}
                  {contextMenu.type === 'pane' && (
                    <>
                      <button type="button" disabled={nodes.length === 0} onClick={() => { setNodes(nodes.map(n => ({ ...n, selected: true }))); setContextMenu(null); }}>▦ Select All</button>
                      <div className="bpmn-context-menu-divider" />
                      {wrapBtn}
                      {groupBtn}
                      <div className="bpmn-context-menu-divider" />
                      {undoRedoBtns}
                    </>
                  )}
                </div>
              );
            })()}
          </div>
          {/* Persistent validation status bar (Phase E) — always visible,
              continuously reflects validateBpmnModel()'s real output as the
              diagram changes (debounced above), not just after an explicit
              Export click. */}
          <div className="bpmn-status-bar">
            <button
              type="button"
              className={`bpmn-status-bar-summary ${validation.warnings.length ? 'warn' : 'ok'}`}
              onClick={() => setWarningsExpanded(v => !v)}
              disabled={validation.warnings.length === 0}
            >
              {validation.warnings.length === 0
                ? 'Valid — 0 schema warnings'
                : `${validation.warnings.length} schema warning${validation.warnings.length === 1 ? '' : 's'}`}
              {validation.warnings.length > 0 && <span className="bpmn-status-bar-chevron">{warningsExpanded ? '▾' : '▸'}</span>}
            </button>
            {warningsExpanded && validation.warnings.length > 0 && (
              <div className="bpmn-status-bar-list">
                {validation.warnings.map((w, i) => {
                  const loc = locateWarning(w);
                  return (
                    <button
                      key={i}
                      type="button"
                      className={`bpmn-status-bar-item${loc ? ' clickable' : ''}`}
                      onClick={loc ? () => handleLocateWarning(w) : undefined}
                      disabled={!loc}
                      title={w.message}
                    >
                      {w.message.split('\n')[0]}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function BpmnCanvas() {
  return (
    <ReactFlowProvider>
      <BpmnFlow />
    </ReactFlowProvider>
  );
}
