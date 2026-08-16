import { useWorkflowStore } from '../store/useWorkflowStore';
import { SECTIONS } from './sections';
import SectionNav from './SectionNav';
import VaultStatusChip from './VaultStatusChip';
import ContextTabStrip from './ContextTabStrip';
import SectionEmptyState from './SectionEmptyState';
import BpmnCanvas from './BpmnCanvas';
import MFlowCanvas from './MFlowCanvas';

// Owns tier 1 (logo/nav/vault/⌘K/reset) and tier 2 (section-supplied context
// tabs). Studio (passed as children) stays mounted at all times and is only
// hidden via CSS when another section is active, so switching sections never
// loses in-progress Studio state (unsaved paste text, zoom, open panels, etc).
export default function AppShell({ children }) {
  const activeSection = useWorkflowStore(s => s.activeSection);
  const workflows = useWorkflowStore(s => s.workflows);
  const activeId = useWorkflowStore(s => s.activeId);
  const setActive = useWorkflowStore(s => s.setActive);
  const addWorkflow = useWorkflowStore(s => s.addWorkflow);
  const deleteWorkflow = useWorkflowStore(s => s.deleteWorkflow);
  const renameWorkflow = useWorkflowStore(s => s.renameWorkflow);
  const studioResetHandler = useWorkflowStore(s => s.studioResetHandler);
  const setCmdPaletteOpen = useWorkflowStore(s => s.setCmdPaletteOpen);

  const isStudio = activeSection === 'studio';
  const isBpmn = activeSection === 'bpmn';
  const isMflow = activeSection === 'mflow';
  const gatedSection = SECTIONS.find(s => s.id === activeSection && !s.enabled);

  return (
    <div className="cc-shell">
      {/* ── TIER 1 ── */}
      <div className="cc-topbar">
        <div className="cc-logo">Provi<em>sion</em>ingAI</div>
        <SectionNav />
        <button className="cc-cmdk-hint" onClick={() => setCmdPaletteOpen(true)} title="Open command palette">⌘K</button>
        <VaultStatusChip />
        {(isStudio || isMflow) && (
          <button className="xb" onClick={() => studioResetHandler?.()} title="Reset all workflows">↺ Reset</button>
        )}
      </div>

      {/* ── TIER 2 — section-supplied, renders no row when absent. M-Files
          Flow shares Studio's workflows, so it gets the same tab strip. ── */}
      {(isStudio || isMflow) && (
        <ContextTabStrip
          items={workflows.map(w => ({ id: w.id, label: w.name, imported: w.source === 'mfiles' }))}
          activeId={activeId}
          onSelect={setActive}
          onRename={renameWorkflow}
          onDelete={deleteWorkflow}
          onAdd={addWorkflow}
          addLabel="+ Workflow"
        />
      )}

      {/* ── CONTENT ── */}
      <div className="cc-content-area">
        <div style={{ display: isStudio ? 'contents' : 'none' }}>{children}</div>
        {isBpmn && <BpmnCanvas />}
        {isMflow && <MFlowCanvas />}
        {gatedSection && <SectionEmptyState section={gatedSection} />}
      </div>
    </div>
  );
}
