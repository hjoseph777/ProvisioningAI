import { Handle, Position } from '@xyflow/react';
import { Mail, Clock } from 'lucide-react';
import { useBpmnStore } from '../../store/useBpmnStore';

// Registered as the 'input'/'output' node types in BpmnCanvas.jsx's
// nodeTypes, replacing React Flow's built-ins — same reasoning as
// TaskNode.jsx: real typed data only (Phase A's importBpmnXml reads a real
// eventDefinitions[0].$type off imported XML into data.eventDefinition),
// never applied cosmetically to a plain Start/End drawn from the palette.
const EVENT_DEF_ICON = { message: Mail, timer: Clock };
const EVENT_DEF_LABEL = { message: 'Message event — triggered by/sends a message', timer: 'Timer event — triggered by a time condition' };

function EventLabel({ data }) {
  const businessView = useBpmnStore(s => s.businessView);
  const Icon = businessView ? null : EVENT_DEF_ICON[data?.eventDefinition];
  if (!Icon) return data?.label;
  return (
    <span className="bpmn-node-icon-row" title={EVENT_DEF_LABEL[data.eventDefinition]}>
      <Icon size={13} strokeWidth={2} />
      {data?.label}
    </span>
  );
}

export function StartEventNode({ data, isConnectable, sourcePosition = Position.Bottom }) {
  return (
    <>
      <EventLabel data={data} />
      <Handle type="source" position={sourcePosition} isConnectable={isConnectable} />
    </>
  );
}

export function EndEventNode({ data, isConnectable, targetPosition = Position.Top }) {
  return (
    <>
      <Handle type="target" position={targetPosition} isConnectable={isConnectable} />
      <EventLabel data={data} />
    </>
  );
}
