import { Workflow, Radar, FileText, Lock, Shapes, Network } from 'lucide-react';

// Section registry — drives SectionNav rendering, the ⌘K "go to" entries, and
// SectionEmptyState's gate copy. Flipping a section from enabled:false to
// enabled:true (once its backend milestone lands) is the only change needed
// to light it up — no other file should need to know a section's status.
export const SECTIONS = [
  {
    id: 'studio',
    label: 'Studio',
    icon: Workflow,
    enabled: true,
  },
  {
    id: 'mflow',
    label: 'M-Files Flow',
    icon: Network,
    enabled: true,
    // Clean-slate rebuild of Studio's diagram (Mermaid-based, same
    // useWorkflowStore data) using Process Docs' palette UX as the pattern.
    // Runs alongside Studio, not replacing it, until this is proven out —
    // Studio stays untouched. See recover.md for the full build log.
    tagline: 'Same workflows as Studio — new palette-driven canvas',
  },
  {
    id: 'bpmn',
    label: 'Process Docs',
    icon: Shapes,
    enabled: true,
    // No `gate` — this is deliberately a live, built section, not a placeholder.
    // Distinct from Studio: internal BPMN process documentation (the same role
    // Cacoo serves the AP team today), never a second input path into the
    // provisioning pipeline. See BpmnCanvas's own in-canvas banner for the
    // full statement — this one line is just for the ⌘K/nav-hover surface.
    tagline: 'Documentation only — does not feed provisioning',
  },
  {
    id: 'discovery',
    label: 'Discovery',
    icon: Radar,
    enabled: false,
    gate: {
      title: 'No vault scan yet',
      body: 'Discovery enumerates object types, properties, workflows, and integration points, then emits the mapping template that provisioning reads.',
      milestone: '2.1',
    },
  },
  {
    id: 'docs',
    label: 'Docs',
    icon: FileText,
    enabled: false,
    gate: {
      title: 'No documentation generated yet',
      body: 'Docs turns a discovery scan into SOPs, onboarding guides, integration maps, and state diagrams — regenerated each time the vault changes.',
      milestone: '5.2',
    },
  },
  {
    id: 'copilot',
    label: 'Copilot',
    icon: Lock,
    enabled: false,
    gate: {
      title: 'No index to query yet',
      body: 'Copilot answers plain-language questions about vault structure, citing the discovery index for every claim. Read-only — it never changes vault data.',
      milestone: '6.2',
    },
  },
];
