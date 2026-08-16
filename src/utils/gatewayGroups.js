// ── gatewayGroups ────────────────────────────────────────────────
// Mirrors ProvisioningAI.Workflow/Translation/ChoiceCollapser.cs's collapse/promote
// rule (§3.5 Decision 3) for Studio's own transition.group field: a group shared by
// exactly one distinct source state can't be anything but that source's own ordinary
// fan-out (no diamond); a group shared by 2+ distinct source states is a genuine
// merge-then-split point that can't collapse into a single predecessor, so it promotes
// to a real hub node. This file is the one place that rule is computed — useMermaid.js
// (diagram string) and CommandCenter.jsx (diamond rendering + the Gateways list) both
// call it so the two never disagree about which groups are promoted.

export function computeGatewayGroups(transitions) {
  const byGroup = new Map();
  (transitions || []).forEach(t => {
    const g = (t.group || '').trim();
    const from = (t.from || '').trim();
    const to = (t.to || '').trim();
    if (!g || !from || !to) return; // incomplete rows never participate (matches useMermaid's own from/to guard)
    if (!byGroup.has(g)) byGroup.set(g, { sources: new Set(), targets: new Set() });
    const entry = byGroup.get(g);
    entry.sources.add(from);
    entry.targets.add(to);
  });

  const promoted = [];
  byGroup.forEach((entry, id) => {
    if (entry.sources.size >= 2) {
      promoted.push({ id, sources: [...entry.sources], targets: [...entry.targets] });
    }
  });
  return promoted;
}

// The Mermaid label text declared for a hub node — CommandCenter.jsx matches this
// exact string back against each rendered node's text to find which ones are hubs,
// so useMermaid.js and CommandCenter.jsx must always agree on this format. No colon
// in the text: stateDiagram-v2 uses `id : label`, and a colon inside label risks
// confusing the parser about where the label starts.
export const gatewayLabel = (groupId) => `Gateway ${groupId}`;
