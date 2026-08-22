import { Handle, Position } from '@xyflow/react';
import { Settings, User, Code2, Hand, ListChecks, Send, Inbox } from 'lucide-react';
import { useBpmnStore } from '../../store/useBpmnStore';

// Registered as the 'default' node type in BpmnCanvas.jsx's nodeTypes, so
// every task-shaped node keeps rendering through .react-flow__node-default's
// existing CSS (React Flow still writes that class — node.type stays
// undefined for generic tasks, same as before this file existed).
//
// The icon only ever appears for a real, bpmn-moddle-confirmed Task subtype
// (Phase A's importBpmnXml sets data.bpmnType from actual imported XML).
// The palette (Phase B) only ever creates generic bpmn:Task, per Decision 7's
// boundary — so a freshly-drawn task has no bpmnType and renders exactly as
// it always has, plain label, no icon. This is real typed data driving the
// visual, not a cosmetic pass applied ahead of the schema work.
const TASK_TYPE_ICON = {
  'bpmn:ServiceTask': Settings,
  'bpmn:UserTask': User,
  'bpmn:ScriptTask': Code2,
  'bpmn:ManualTask': Hand,
  'bpmn:BusinessRuleTask': ListChecks,
  'bpmn:SendTask': Send,
  'bpmn:ReceiveTask': Inbox,
};
const TASK_TYPE_LABEL = {
  'bpmn:ServiceTask': 'Service Task — automated, system-performed',
  'bpmn:UserTask': 'User Task — performed by a person via a UI',
  'bpmn:ScriptTask': 'Script Task — an automated script runs',
  'bpmn:ManualTask': 'Manual Task — performed without any system',
  'bpmn:BusinessRuleTask': 'Business Rule Task — a decision/rule engine runs',
  'bpmn:SendTask': 'Send Task — sends a message',
  'bpmn:ReceiveTask': 'Receive Task — waits for a message',
};

export default function TaskNode({ data, isConnectable, targetPosition = Position.Top, sourcePosition = Position.Bottom }) {
  const businessView = useBpmnStore(s => s.businessView);
  // Business view hides the BPMN-subtype icon — real typed data (Phase A/C),
  // just not vocabulary a business stakeholder needs to see. Technical view
  // (default) shows it, matching every prior verification this session.
  const Icon = businessView ? null : TASK_TYPE_ICON[data?.bpmnType];
  return (
    <>
      <Handle type="target" position={targetPosition} isConnectable={isConnectable} />
      {Icon ? (
        <span className="bpmn-node-icon-row" title={TASK_TYPE_LABEL[data.bpmnType]}>
          <Icon size={14} strokeWidth={2} />
          {data?.label}
        </span>
      ) : data?.label}
      <Handle type="source" position={sourcePosition} isConnectable={isConnectable} />
    </>
  );
}
