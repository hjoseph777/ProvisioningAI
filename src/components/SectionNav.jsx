import { Lock } from 'lucide-react';
import { SECTIONS } from './sections';
import { useWorkflowStore } from '../store/useWorkflowStore';

// Disabled sections still render and still route — they land on
// SectionEmptyState — so there is never a dead click, only an honest one.
export default function SectionNav() {
  const activeSection = useWorkflowStore(s => s.activeSection);
  const setActiveSection = useWorkflowStore(s => s.setActiveSection);
  return (
    <div className="cc-section-tabs">
      {SECTIONS.map(sec => {
        const Icon = sec.icon;
        return (
          <button
            key={sec.id}
            className={`cc-section-tab ${activeSection === sec.id ? 'active' : ''} ${sec.enabled ? '' : 'gated'}`}
            onClick={() => setActiveSection(sec.id)}
            title={sec.enabled ? (sec.tagline ? `${sec.label} — ${sec.tagline}` : sec.label) : `${sec.label} — roadmap milestone ${sec.gate?.milestone}`}
          >
            <Icon size={13} strokeWidth={2} />
            {sec.label}
            {/* "Not yet built" marker — driven by the same enabled flag every
                gated section already has, not by which icon happened to get
                picked for it. Previously only Copilot signaled this (its own
                tab icon is Lock), while Discovery/Docs — equally unbuilt —
                only had the dimmer .gated text color, a much subtler cue. */}
            {!sec.enabled && <Lock size={9} strokeWidth={2} className="cc-section-tab-lock"/>}
          </button>
        );
      })}
    </div>
  );
}
