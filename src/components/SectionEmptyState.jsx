// Reuses the exact "No Diagram Available" treatment from Studio's blueprint-empty
// state so gated sections read as part of the same product, not a bolted-on placeholder.
export default function SectionEmptyState({ section }) {
  const gate = section?.gate;
  const Icon = section?.icon;
  return (
    <div className="blueprint-empty" style={{ flex: 1 }}>
      {Icon && <Icon size={72} strokeWidth={1} />}
      <div className="blueprint-title">{gate?.title || 'Not available yet'}</div>
      <div className="blueprint-sub">{gate?.body}</div>
      {gate?.milestone && <span className="gate-badge">Roadmap milestone {gate.milestone}</span>}
    </div>
  );
}
