// ── bpmnHelperLines ──────────────────────────────────────────────
// Smart alignment guides — the standard Figma-style edge/center matching
// set (left-left, hCenter-hCenter, right-right, top-top, vCenter-vCenter,
// bottom-bottom), not a full cross-product of every combination, which
// tends to fire distracting near-misses. Runs alongside BpmnCanvas.jsx's
// existing snapToGrid — grid snapping alone can't line two nodes' centers
// up unless both already sit on the grid.
import { dimsFor as staticDims } from '../features/bpmn-io/bpmnModdle';

const DISTANCE = 5;

function realDims(node) {
  if (node.measured?.width && node.measured?.height) {
    return { w: node.measured.width, h: node.measured.height };
  }
  const { w, h } = staticDims(node);
  return { w, h };
}

// Stage 1 (Pool containment) introduced the first case where node.position
// isn't canvas-absolute — a pool's child stores position relative to its
// parent. Comparing a child's relative position directly against an
// absolute-positioned node's edges would silently misalign (or misplace the
// rendered guide line, which HelperLines.jsx treats as an absolute flow
// coordinate). Not nested in this project (Stage 1's own scope), so one
// level of parentId lookup is enough — no need for a general recursive walk.
function absolutePosition(node, allNodes) {
  if (!node.parentId) return node.position;
  const parent = allNodes.find(n => n.id === node.parentId);
  if (!parent) return node.position;
  const parentAbs = absolutePosition(parent, allNodes);
  return { x: parentAbs.x + node.position.x, y: parentAbs.y + node.position.y };
}

/**
 * @param {object} node - the node being dragged, with its IN-PROGRESS position
 * @param {object[]} otherNodes - every node currently on the canvas (dragged one included, filtered out below)
 * @returns {{ horizontal?: number, vertical?: number, snapX?: number, snapY?: number }}
 *   horizontal/vertical are flow-space line positions to render; snapX/snapY,
 *   when present, are the corrected position the caller should apply — in
 *   the SAME coordinate space as node.position (relative for a pool's
 *   child), since that's what the caller feeds straight back to React Flow.
 */
export function getHelperLines(node, otherNodes, distance = DISTANCE) {
  const result = {};
  const { w, h } = realDims(node);
  const nodeAbs = absolutePosition(node, otherNodes);
  const left = nodeAbs.x, right = left + w, hCenter = left + w / 2;
  const top = nodeAbs.y, bottom = top + h, vCenter = top + h / 2;

  // Closest candidate wins, not the last one iterated — with several nodes
  // on the canvas it's common for more than one edge/center pair to fall
  // within the threshold at once, and picking whichever happened to be
  // checked last produced a visually wrong guide line (still snapped to a
  // sane position by coincidence, but pointed at the wrong node/edge).
  let bestV = Infinity, bestH = Infinity;

  for (const other of otherNodes) {
    if (other.id === node.id) continue;
    const od = realDims(other);
    const otherAbs = absolutePosition(other, otherNodes);
    const oLeft = otherAbs.x, oRight = oLeft + od.w, oHCenter = oLeft + od.w / 2;
    const oTop = otherAbs.y, oBottom = oTop + od.h, oVCenter = oTop + od.h / 2;

    // mine/theirs are both absolute here, so (theirs - mine) is an absolute
    // delta — adding it to node.position.x (whatever space that's already
    // in) yields the correct new position in that SAME space, since the
    // delta is position-independent during a drag (ancestors don't move).
    for (const [mine, theirs] of [[left, oLeft], [hCenter, oHCenter], [right, oRight]]) {
      const d = Math.abs(mine - theirs);
      if (d < distance && d < bestV) {
        bestV = d;
        result.vertical = theirs;
        result.snapX = node.position.x + (theirs - mine);
      }
    }
    for (const [mine, theirs] of [[top, oTop], [vCenter, oVCenter], [bottom, oBottom]]) {
      const d = Math.abs(mine - theirs);
      if (d < distance && d < bestH) {
        bestH = d;
        result.horizontal = theirs;
        result.snapY = node.position.y + (theirs - mine);
      }
    }
  }

  return result;
}
