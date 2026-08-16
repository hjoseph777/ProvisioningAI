// ── bpmnPools ────────────────────────────────────────────────────
// Ported from React_Flow_Pro/parent-child-relation-pro-example (utils.ts) —
// the real reference for React Flow's group/parentId containment mechanic,
// checked directly before building anything here. That example demonstrates
// generic single-container parent-child grouping via node.type === 'group'
// (React Flow's own built-in type) plus onNodeDrag/onNodeDragStop +
// getIntersectingNodes — it does NOT contain any lane-divider or multi-lane
// subdivision concept, so none is invented here either; "Pool" in this stage
// is a single container, matching what the example actually does.
//
// Both functions are dimension-agnostic — they read node.measured (React
// Flow's own post-render size), never a hardcoded box size — same discipline
// already applied to GatewayNode.jsx's real 56x56 geometry check.

/** Parent nodes must precede their children in the nodes array (React Flow's own requirement). */
export function sortForHierarchy(a, b) {
  if ((a.type === 'group') === (b.type === 'group')) return 0;
  return a.type === 'group' ? -1 : 1;
}

const POOL_FIT_PADDING = 24;

/**
 * Computes a dropped node's new parent-relative position, growing the pool
 * to fit it instead of clamping/squishing it into the pool's existing size
 * — "drag a node in and it doesn't fit" was a real complaint once the pool
 * itself stopped silently blocking the drag (see onNodeDragStop). Only
 * grows rightward/downward: a node dropped above/left of the pool's
 * current bounds still clamps inward, since growing that direction would
 * mean shifting the pool's own origin and re-offsetting every existing
 * child too — a bigger change than "make it fit" calls for.
 */
export function fitNodeIntoParent(node, groupNode) {
  const nodeWidth = node.measured?.width ?? 0;
  const nodeHeight = node.measured?.height ?? 0;
  const groupWidth = groupNode.measured?.width ?? 0;
  const groupHeight = groupNode.measured?.height ?? 0;

  const relX = Math.max(0, node.position.x - groupNode.position.x);
  const relY = Math.max(0, node.position.y - groupNode.position.y);

  const neededWidth = relX + nodeWidth + POOL_FIT_PADDING;
  const neededHeight = relY + nodeHeight + POOL_FIT_PADDING;
  const parentSize = {
    width: Math.max(groupWidth, neededWidth),
    height: Math.max(groupHeight, neededHeight),
  };

  return {
    position: { x: relX, y: relY },
    parentGrew: parentSize.width > groupWidth || parentSize.height > groupHeight,
    parentSize,
  };
}

/**
 * Stage 3's copy/paste fix, factored out as a pure function so it's
 * independently testable — this project's node-position dragging can't be
 * driven through a headless harness (confirmed repeatedly this session), so
 * establishing a real pool+child relationship to test paste against live
 * drag isn't possible; this function can be exercised directly with
 * manufactured node arrays instead.
 *
 * bufferedNodes must already carry __absPosition (each node's real absolute
 * position, captured at copy time via getInternalNode — see
 * useBpmnCopyPaste.js) alongside its normal fields. Returns the new node/edge
 * arrays to append (not merged with the existing canvas — the caller does
 * that), already sorted parent-before-child.
 */
export function buildPastedElements(bufferedNodes, bufferedEdges, targetPosition, makeId) {
  const minX = Math.min(...bufferedNodes.map(n => n.__absPosition.x));
  const minY = Math.min(...bufferedNodes.map(n => n.__absPosition.y));
  const bufferedIds = new Set(bufferedNodes.map(n => n.id));
  const idMap = new Map(bufferedNodes.map(n => [n.id, makeId()]));

  const newNodes = bufferedNodes.map(node => {
    const { __absPosition, ...rest } = node;
    const newId = idMap.get(node.id);
    const parentCopied = node.parentId && bufferedIds.has(node.parentId);

    if (parentCopied) {
      // Parent is being pasted too — keep the exact relative position; it
      // rides along with wherever the new parent lands.
      return { ...rest, id: newId, parentId: idMap.get(node.parentId), selected: true, data: { ...node.data } };
    }
    // Standalone, or a child whose parent wasn't copied — detach and place
    // at an absolute position offset from the paste target. The real
    // copy-paste-pro-example never handles this at all (it has no
    // parent-child concept in its own demo) — left unhandled, the clone
    // would keep pointing at the ORIGINAL pool's id, either silently
    // re-parenting into a pool it wasn't copied with, or (if that pool was
    // cut) pointing at nothing.
    return {
      ...rest,
      id: newId,
      parentId: undefined,
      extent: undefined,
      position: { x: targetPosition.x + (__absPosition.x - minX), y: targetPosition.y + (__absPosition.y - minY) },
      selected: true,
      data: { ...node.data },
    };
  }).sort(sortForHierarchy);

  const newEdges = bufferedEdges.map(edge => ({
    ...edge,
    id: makeId(),
    source: idMap.get(edge.source) ?? edge.source,
    target: idMap.get(edge.target) ?? edge.target,
    selected: false,
  }));

  return { newNodes, newEdges };
}
