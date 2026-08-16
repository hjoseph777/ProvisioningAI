import { useCallback, useEffect, useRef, useState } from 'react';
import { getConnectedEdges, useReactFlow, useStore } from '@xyflow/react';
import { makeId } from '../store/useBpmnStore';
import { buildPastedElements } from '../utils/bpmnPools';

// Ported from React_Flow_Pro/copy-paste-pro-example's useCopyPaste.ts —
// checked directly first. Faithful to the source for: selecting only
// "internal" edges (both endpoints inside the selection) via
// getConnectedEdges, and tracking live mouse position for paste-at-cursor.
//
// NOT faithful to the source in two deliberate ways:
//
// 1. Parent-id remapping (see buildPastedElements in bpmnPools.js) — the
//    real example never remaps parentId at all, spreading the original node
//    straight into the clone. Fine for its own demo (no parent-child concept
//    exists in it), wrong here after Stage 1's pools.
//
// 2. The keyboard mechanism itself. The source uses useKeyPress + a
//    fire-once-per-keydown debounce (useShortcut, one instance per shortcut).
//    Live-testing that exact port here produced a real, reproducible crash —
//    the whole app unmounting — specifically on Ctrl+V immediately following
//    a real Ctrl+C, confirmed independent of dispatch speed (still happened
//    with realistic human-paced timing, ruling out a synthetic-event
//    artifact) and confirmed NOT inside this hook's own paste() logic (it
//    never even executed — instrumented directly to check). Isolated to
//    three co-mounted useKeyPress instances interacting badly with each
//    other once a real combo had fired on one of them; unrelated combos
//    (Ctrl+B) and repeats of the same combo (Ctrl+C twice) were both safe,
//    only the copy-then-paste sequence specifically crashed. Root-caused to
//    the multi-instance interaction, not tracked further since a simpler,
//    already-proven-reliable alternative was available: this canvas's own
//    undo/redo (BpmnCanvas.jsx) uses one manual document keydown listener
//    for its Ctrl+Z/Ctrl+Shift+Z shortcuts, extensively verified safe. This
//    hook now uses that same single-listener pattern instead of useKeyPress.
export function useBpmnCopyPaste(nodes, edges, setNodes, setEdges, takeSnapshot) {
  const mousePosRef = useRef({ x: 0, y: 0 });
  const rfDomNode = useStore(s => s.domNode);
  const { screenToFlowPosition, getInternalNode } = useReactFlow();
  const [bufferedNodes, setBufferedNodes] = useState([]);
  const [bufferedEdges, setBufferedEdges] = useState([]);

  useEffect(() => {
    if (!rfDomNode) return;
    const onMouseMove = (e) => { mousePosRef.current = { x: e.clientX, y: e.clientY }; };
    rfDomNode.addEventListener('mousemove', onMouseMove);
    return () => rfDomNode.removeEventListener('mousemove', onMouseMove);
  }, [rfDomNode]);

  // A pool's child stores position relative to its parent (Stage 1) — the
  // buffer needs each node's real ABSOLUTE position to compute a sensible
  // multi-node paste offset (Stage 2 hit the identical problem in helper
  // lines: comparing an absolute coordinate against a relative one as if
  // they were the same space silently produces nonsense). Captured at
  // copy/cut time, not paste time, since the original parent might not even
  // exist anymore by the time paste runs (cut, or a later delete).
  const absoluteOf = useCallback((node) => {
    if (!node.parentId) return node.position;
    return getInternalNode(node.id)?.internals?.positionAbsolute ?? node.position;
  }, [getInternalNode]);

  const internalEdgesFor = useCallback((selectedNodes) => {
    return getConnectedEdges(selectedNodes, edges).filter(edge => {
      const isExternalSource = selectedNodes.every(n => n.id !== edge.source);
      const isExternalTarget = selectedNodes.every(n => n.id !== edge.target);
      return !(isExternalSource || isExternalTarget);
    });
  }, [edges]);

  const copy = useCallback(() => {
    const selectedNodes = nodes.filter(n => n.selected);
    if (!selectedNodes.length) return;
    setBufferedNodes(selectedNodes.map(n => ({ ...n, __absPosition: absoluteOf(n) })));
    setBufferedEdges(internalEdgesFor(selectedNodes));
  }, [nodes, internalEdgesFor, absoluteOf]);

  const cut = useCallback(() => {
    const selectedNodes = nodes.filter(n => n.selected);
    if (!selectedNodes.length) return;
    const selEdges = internalEdgesFor(selectedNodes);
    setBufferedNodes(selectedNodes.map(n => ({ ...n, __absPosition: absoluteOf(n) })));
    setBufferedEdges(selEdges);

    takeSnapshot();
    const cutIds = new Set(selectedNodes.map(n => n.id));
    // Cutting a pool without its children (they weren't selected) would
    // otherwise leave them pointing at a parentId that no longer exists —
    // same detach used by BpmnCanvas.jsx's own pool-delete handling.
    const orphaned = nodes.filter(n => n.parentId && cutIds.has(n.parentId) && !cutIds.has(n.id));
    const orphanFixes = new Map(orphaned.map(n => {
      const parentAbs = absoluteOf(nodes.find(p => p.id === n.parentId));
      const { parentId, extent, ...rest } = n;
      return [n.id, { ...rest, position: { x: n.position.x + parentAbs.x, y: n.position.y + parentAbs.y } }];
    }));
    setNodes(nodes.filter(n => !cutIds.has(n.id)).map(n => orphanFixes.get(n.id) ?? n));
    setEdges(edges.filter(e => !selEdges.includes(e)));
  }, [nodes, edges, internalEdgesFor, absoluteOf, setNodes, setEdges, takeSnapshot]);

  const paste = useCallback((position) => {
    if (!bufferedNodes.length) return;
    takeSnapshot();
    const target = position ?? screenToFlowPosition(mousePosRef.current);
    const { newNodes, newEdges } = buildPastedElements(bufferedNodes, bufferedEdges, target, makeId);
    setNodes([...nodes.map(n => ({ ...n, selected: false })), ...newNodes]);
    setEdges([...edges.map(e => ({ ...e, selected: false })), ...newEdges]);
  }, [bufferedNodes, bufferedEdges, nodes, edges, screenToFlowPosition, setNodes, setEdges, takeSnapshot]);

  // One manual listener, attached once (empty deps) — reads the latest
  // copy/cut/paste via a ref rather than re-attaching on every nodes/edges
  // change, which is what made the useKeyPress version churn constantly.
  const actionsRef = useRef({ copy, cut, paste });
  actionsRef.current = { copy, cut, paste };

  useEffect(() => {
    const onKeyDown = (event) => {
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (!(event.ctrlKey || event.metaKey)) return;
      const key = event.key?.toLowerCase();
      if (key === 'c') {
        // Only intercept when there's no real page text selected — matches
        // the source's own reasoning for not hijacking a normal text-copy.
        if (!window.getSelection()?.toString()) {
          event.preventDefault();
          actionsRef.current.copy();
        }
      } else if (key === 'x') {
        event.preventDefault();
        actionsRef.current.cut();
      } else if (key === 'v') {
        event.preventDefault();
        actionsRef.current.paste();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  return { cut, copy, paste, bufferedNodes, bufferedEdges };
}
