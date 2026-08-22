// ── bpmnModdle ───────────────────────────────────────────────────
// Real BPMN 2.0 conversion via bpmn-moddle, the same moddle descriptor
// bpmn-js itself uses (compiled from OMG's normative BPMN20.xsd). This is
// what actually earns the "BPMN 2.0" label — before this, nothing in
// BPMN Standard read or wrote real BPMN XML, it was a lookalike canvas.
//
// Scope, deliberately: node/edge <-> bpmn:Definitions conversion, XML
// export/import, and validation via round-trip re-parsing. No bridge to
// ProvisioningAI.Workflow/Translation/ — BPMN Standard stays isolated from
// the M-Files pipeline, per the project's own documented boundary.
import { BpmnModdle } from 'bpmn-moddle';

const moddle = new BpmnModdle();

// bpmn:ID is xsd:NCName — cannot start with a digit, and our makeId()
// (Math.random().toString(36)) can. Stable prefixes sidestep that instead
// of special-casing every id at creation time.
const bpmnNodeId = (id) => `Node_${id}`;
const bpmnFlowId = (id) => `Flow_${id}`;
const unprefix = (prefix, id) => (id.startsWith(prefix) ? id.slice(prefix.length) : id);

const GATEWAY_TYPE_TO_BPMN = {
  exclusive: 'bpmn:ExclusiveGateway',
  inclusive: 'bpmn:InclusiveGateway',
  parallel: 'bpmn:ParallelGateway',
};
const BPMN_TO_GATEWAY_TYPE = {
  'bpmn:ExclusiveGateway': 'exclusive',
  'bpmn:InclusiveGateway': 'inclusive',
  'bpmn:ParallelGateway': 'parallel',
};
const GATEWAY_LABEL = { exclusive: 'Exclusive', inclusive: 'Inclusive', parallel: 'Parallel' };

// The only two EventDefinition types Phase A confirmed present in
// bpmn-moddle's schema and worth distinguishing on the canvas — not a guess
// at the full set (there are more: Signal, Error, Escalation, ...), just the
// two this project has actually verified and named.
const EVENT_DEF_TO_BPMN = { message: 'bpmn:MessageEventDefinition', timer: 'bpmn:TimerEventDefinition' };
const BPMN_TO_EVENT_DEF = { 'bpmn:MessageEventDefinition': 'message', 'bpmn:TimerEventDefinition': 'timer' };

// Static per-type sizes for the BPMNDI shapes — this is what makes the
// exported file visually round-trippable in a real BPMN viewer, not just
// structurally valid. Values approximate this canvas's own rendered sizes
// (confirmed live: default nodes ~146x60/146x41, gateway diamond 56x56).
// Exported — Phase D's helper-lines alignment (bpmnHelperLines.js) reuses
// this as its fallback for not-yet-measured nodes, rather than keeping a
// second, driftable copy of the same numbers.
export const dimsFor = (node) =>
  node.type === 'gateway' ? { w: 56, h: 56 }
  : node.type === 'input' || node.type === 'output' ? { w: 150, h: 42 }
  : { w: 150, h: 60 };

function bpmnTypeForNode(node) {
  if (node.type === 'gateway') return GATEWAY_TYPE_TO_BPMN[node.data?.gatewayType] || 'bpmn:ExclusiveGateway';
  if (node.type === 'input') return 'bpmn:StartEvent';
  if (node.type === 'output') return 'bpmn:EndEvent';
  // Any node data may already carry a real bpmn-moddle type from a prior
  // import (Phase C's typing) — round-trip it faithfully instead of
  // collapsing every activity back down to a generic Task.
  return node.data?.bpmnType || 'bpmn:Task';
}

/** Build a real bpmn:Definitions model (process + BPMNDI diagram) from BPMN Standard's nodes/edges. */
export function toBpmnDefinitions(nodes, edges) {
  const created = new Map(); // our node id -> moddle element
  const flowElements = [];
  const shapeInfo = [];

  for (const node of nodes) {
    // Pool ('group' type, Stage 1 React Flow Pro enhancements) is a canvas-
    // only containment/visual feature for now — a real BPMN Pool is
    // structurally a bpmn:Participant wrapping its own bpmn:Process inside a
    // bpmn:Collaboration, which would mean restructuring this exporter's
    // single-flat-Process model. That's a genuinely separate, bigger
    // decision than "enable containment from the palette," so it's
    // deliberately not done here — skipping (not mis-exporting as bpmn:Task,
    // which bpmnTypeForNode's fallback would otherwise silently do) is the
    // honest choice until that's explicitly decided, the same way dangling
    // edges are skipped rather than exported broken.
    if (node.type === 'group') continue;
    const $type = bpmnTypeForNode(node);
    const label = node.data?.gatewayType ? (node.data?.label || GATEWAY_LABEL[node.data.gatewayType]) : node.data?.label;
    const el = moddle.create($type, { id: bpmnNodeId(node.id), name: label || undefined });
    // Round-trip a typed Start/End event's eventDefinition (Phase C) — only
    // written when the node actually carries one, so a plain Start/End stays
    // a plain <bpmn:startEvent/> with no empty eventDefinitions array.
    const eventDefType = (node.type === 'input' || node.type === 'output') && EVENT_DEF_TO_BPMN[node.data?.eventDefinition];
    if (eventDefType) el.eventDefinitions = [moddle.create(eventDefType, {})];
    created.set(node.id, el);
    flowElements.push(el);
    shapeInfo.push({ el, node });
  }

  const flowsInfo = [];
  for (const edge of edges) {
    const sourceRef = created.get(edge.source);
    const targetRef = created.get(edge.target);
    // Dangling edges shouldn't exist in a well-formed canvas state, but a
    // model export is the wrong place to first discover that — skip rather
    // than throw, so export always reflects what's actually renderable.
    if (!sourceRef || !targetRef) continue;
    const flow = moddle.create('bpmn:SequenceFlow', {
      id: bpmnFlowId(edge.id),
      sourceRef,
      targetRef,
      name: edge.label || undefined,
    });
    flowElements.push(flow);
    flowsInfo.push({ flow, edge });
  }

  const process = moddle.create('bpmn:Process', {
    id: 'Process_BpmnStandard',
    isExecutable: false,
    flowElements,
  });

  const planeElements = [];
  for (const { el, node } of shapeInfo) {
    const { w, h } = dimsFor(node);
    const bounds = moddle.create('dc:Bounds', { x: node.position.x, y: node.position.y, width: w, height: h });
    planeElements.push(moddle.create('bpmndi:BPMNShape', { id: `Shape_${el.id}`, bpmnElement: el, bounds }));
  }
  for (const { flow, edge } of flowsInfo) {
    const sourceNode = nodes.find(n => n.id === edge.source);
    const targetNode = nodes.find(n => n.id === edge.target);
    const sd = dimsFor(sourceNode), td = dimsFor(targetNode);
    const waypoint = [
      moddle.create('dc:Point', { x: sourceNode.position.x + sd.w / 2, y: sourceNode.position.y + sd.h / 2 }),
      moddle.create('dc:Point', { x: targetNode.position.x + td.w / 2, y: targetNode.position.y + td.h / 2 }),
    ];
    planeElements.push(moddle.create('bpmndi:BPMNEdge', { id: `Edge_${flow.id}`, bpmnElement: flow, waypoint }));
  }

  const plane = moddle.create('bpmndi:BPMNPlane', { bpmnElement: process, planeElement: planeElements });
  const diagram = moddle.create('bpmndi:BPMNDiagram', { plane });

  return moddle.create('bpmn:Definitions', {
    targetNamespace: 'http://provisioningai/bpmn/process-docs',
    rootElements: [process],
    diagrams: [diagram],
  });
}

/** Serialize nodes/edges to real, formatted BPMN 2.0 XML. */
export async function exportBpmnXml(nodes, edges) {
  const definitions = toBpmnDefinitions(nodes, edges);
  const { xml } = await moddle.toXML(definitions, { format: true });
  return xml;
}

/**
 * Round-trip validation: export, then re-parse the result through
 * bpmn-moddle's own schema-driven reader. Any structural problem — an
 * unknown property, a bad reference, a malformed expression — surfaces as
 * a warning here, which is the real, non-invented signal Phase E's status
 * bar is meant to display.
 */
export async function validateBpmnModel(nodes, edges) {
  const xml = await exportBpmnXml(nodes, edges);
  const { warnings } = await moddle.fromXML(xml);
  return { xml, warnings };
}

/** Parse real BPMN 2.0 XML back into BPMN Standard's node/edge shape. */
export async function importBpmnXml(xml) {
  const { rootElement, warnings } = await moddle.fromXML(xml);
  const process = rootElement.rootElements?.find(e => e.$type === 'bpmn:Process');
  if (!process) throw new Error('No bpmn:Process found in the imported file.');

  const plane = rootElement.diagrams?.[0]?.plane;
  const boundsById = new Map();
  for (const el of plane?.planeElement ?? []) {
    if (el.$type === 'bpmndi:BPMNShape' && el.bpmnElement) boundsById.set(el.bpmnElement.id, el.bounds);
  }

  const nodes = [];
  const edges = [];
  const flowElements = process.flowElements ?? [];

  for (const el of flowElements) {
    if (el.$type === 'bpmn:SequenceFlow') continue;
    const id = unprefix('Node_', el.id);
    const bounds = boundsById.get(el.id);
    const position = bounds ? { x: bounds.x, y: bounds.y } : { x: 40, y: 40 };

    // Only the two EventDefinition types Phase A confirmed and Phase C
    // renders (message/timer) are surfaced — an unrecognized definition
    // (Signal, Error, ...) leaves eventDefinition undefined rather than
    // guessing, and the node still renders as a plain Start/End.
    const eventDef = BPMN_TO_EVENT_DEF[el.eventDefinitions?.[0]?.$type];

    if (el.$type === 'bpmn:StartEvent') {
      nodes.push({ id, type: 'input', position, data: { label: el.name || 'Start', eventDefinition: eventDef } });
    } else if (el.$type === 'bpmn:EndEvent') {
      nodes.push({ id, type: 'output', position, data: { label: el.name || 'End', eventDefinition: eventDef } });
    } else if (BPMN_TO_GATEWAY_TYPE[el.$type]) {
      nodes.push({ id, type: 'gateway', position, data: { gatewayType: BPMN_TO_GATEWAY_TYPE[el.$type] } });
    } else {
      // Any Task subtype (Task/ServiceTask/UserTask/ScriptTask/...) — real
      // bpmn-moddle-confirmed typing (Phase A), rendered as a distinct icon
      // by TaskNode.jsx (Phase C) rather than collapsed down to plain Task.
      nodes.push({ id, position, data: { label: el.name || 'Task', bpmnType: el.$type } });
    }
  }

  for (const el of flowElements) {
    if (el.$type !== 'bpmn:SequenceFlow') continue;
    // A dangling sourceRef/targetRef (edited-by-hand file pointing at a
    // deleted/misspelled id) leaves the reference unresolved — moddle
    // already reports this as one of the warnings above; skip the edge
    // here rather than crashing the whole import on el.sourceRef.id.
    if (!el.sourceRef || !el.targetRef) continue;
    edges.push({
      id: unprefix('Flow_', el.id),
      source: unprefix('Node_', el.sourceRef.id),
      target: unprefix('Node_', el.targetRef.id),
      label: el.name || undefined,
    });
  }

  return { nodes, edges, warnings };
}

/**
 * Maps a real bpmn-moddle warning back to one of BPMN Standard's own node/edge
 * ids, for Phase E's validation status bar (click a warning → locate the
 * element it's about). Confirmed live against bpmn-moddle's actual warning
 * shape: a resolvable one carries `element: {id, $type}`; an unparsable-
 * content warning carries only `{message, error}` — no element, nothing to
 * locate, and this correctly returns null rather than guessing.
 */
export function locateWarning(warning) {
  const id = warning.element?.id;
  if (!id) return null;
  if (id.startsWith('Flow_')) return { kind: 'edge', id: unprefix('Flow_', id) };
  if (id.startsWith('Node_')) return { kind: 'node', id: unprefix('Node_', id) };
  return null;
}
