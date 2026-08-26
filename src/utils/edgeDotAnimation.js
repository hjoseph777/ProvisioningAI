// ── edgeDotAnimation ─────────────────────────────────────────────
// Stateless SVG animation primitive shared by both canvases — it only ever
// touches a <path> element's own SVG neighborhood, never workflow data, so
// reusing it across the M-Files canvas (Mermaid + DOM overlay) and the BPMN
// canvas (React Flow) doesn't cross the isolation boundary between
// useWorkflowStore and useBpmnStore.
//
// The two canvases render through genuinely different paradigms — imperative
// DOM post-processing vs. declarative JSX — so this exports the shared visual
// constants plus the DOM-injection function the M-Files canvas needs. The BPMN
// canvas's custom edge component (src/features/edges/FlowEdge.jsx) builds the
// equivalent markup directly as JSX rather than forcing one call site across
// both; they still render the identical <circle><animateMotion><mpath> shape.
//
// Uses native SVG <animateMotion>/<mpath> — the browser's own SMIL animation
// engine drives this, not a JS requestAnimationFrame loop, so many simultaneous
// dots don't compete for one JS timer. This is the actual answer to "does this
// degrade at scale," not just a hope — see progress.md's performance-test entry.

export const DOT_DEFAULTS = { duration: 2.2, radius: 3 };

const SVG_NS = 'http://www.w3.org/2000/svg';
const XLINK_NS = 'http://www.w3.org/1999/xlink';
let uid = 0;

// Imperative DOM version — used by the M-Files canvas's post-render pass
// (applyEdgeFlowAnimation in CommandCenter.jsx), the same category of custom
// SVG work already shipped there (applyGatewayDiamonds/applyStateAnnotations).
export function attachTravelingDot(pathEl, { color, duration = DOT_DEFAULTS.duration, radius = DOT_DEFAULTS.radius } = {}) {
  if (!pathEl || !pathEl.ownerSVGElement) return null;
  if (!pathEl.id) pathEl.id = `dot-path-${++uid}`;

  const dot = document.createElementNS(SVG_NS, 'circle');
  dot.setAttribute('r', radius);
  dot.setAttribute('class', 'edge-flow-dot');
  dot.style.fill = color;
  dot.style.color = color; // so the shared .edge-flow-dot glow (drop-shadow(currentColor)) matches this dot's own color

  const anim = document.createElementNS(SVG_NS, 'animateMotion');
  anim.setAttribute('dur', `${duration}s`);
  anim.setAttribute('repeatCount', 'indefinite');
  anim.setAttribute('rotate', 'auto');

  const mpath = document.createElementNS(SVG_NS, 'mpath');
  mpath.setAttributeNS(XLINK_NS, 'href', `#${pathEl.id}`);

  anim.appendChild(mpath);
  dot.appendChild(anim);
  pathEl.parentNode.insertBefore(dot, pathEl.nextSibling);
  return dot;
}

// Static blue circle badge at an edge's own midpoint — the visual M-Files
// Admin itself uses to mark a transition that carries real trigger/guard
// logic underneath (confirmed against a real M-Files Admin screenshot), not
// this project's own invention. Deliberately no number/text inside it: the
// actual property/condition behind the transition is a separate, harder
// decoding problem (opaque M-Files search-condition export, see
// transitionGrammar.js's AUTO-grammar comment) that this badge does not
// attempt — it only asserts "there is guard logic here," which is exactly
// what conditions/TriggerMode already know for certain once populated
// (either hand-authored in Studio or captured for real on import).
export function attachGuardBadge(pathEl, { color = '#2563eb', radius = 5, fraction = 0.5 } = {}) {
  if (!pathEl || !pathEl.ownerSVGElement || typeof pathEl.getTotalLength !== 'function') return null;
  const len = pathEl.getTotalLength();
  if (!len) return null;
  const pt = pathEl.getPointAtLength(len * fraction);

  const badge = document.createElementNS(SVG_NS, 'circle');
  badge.setAttribute('cx', pt.x);
  badge.setAttribute('cy', pt.y);
  badge.setAttribute('r', radius);
  badge.setAttribute('class', 'edge-guard-badge');
  badge.style.fill = color;
  pathEl.parentNode.insertBefore(badge, pathEl.nextSibling);
  return badge;
}

// Re-anchors an already-attached guard badge to its path's CURRENT geometry.
// attachGuardBadge only computes cx/cy once, at attach time — it never
// re-runs on its own, so any later redrawEdge (node drag, bend drag) moves
// the line out from under a badge that stays put. Call this right after
// every redrawEdge on a path that might carry a badge; it's a safe no-op
// when there isn't one. Relies on the badge being the path's immediate next
// sibling, which attachGuardBadge's own insertBefore guarantees.
export function repositionGuardBadge(pathEl, { fraction = 0.5 } = {}) {
  if (!pathEl || typeof pathEl.getTotalLength !== 'function') return;
  const badge = pathEl.nextElementSibling;
  if (!badge || !badge.classList?.contains('edge-guard-badge')) return;
  const len = pathEl.getTotalLength();
  if (!len) return;
  const pt = pathEl.getPointAtLength(len * fraction);
  badge.setAttribute('cx', pt.x);
  badge.setAttribute('cy', pt.y);
}
