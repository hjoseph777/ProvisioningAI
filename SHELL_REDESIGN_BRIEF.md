# ProvisioningAI — Shell Redesign Brief (V1)

**For:** the coding agent working in the ProvisioningAI repo
**Type:** frontend chrome refactor. No backend work. No rewrite.
**Deliverable:** an app shell that can host four sections, with only Studio functional.

---

## 1. Context

ProvisioningAI is an Electron + React desktop app for M-Files vault work. Today it is a single working screen — the Workflow Studio — with manual/NLP/AI/Cacoo ingestion, live Mermaid diagramming with bidirectional highlighting, SOW/PRD markdown export, and M-Files push/pull over IPC. It works. Nothing about that behaviour is in question.

V1 adds three more sections: **Discovery** (full-vault structural scan), **Docs** (generated SOPs and integration maps), and **Copilot** (read-only Q&A over the scan index). Their backends do not exist yet — `ProvisioningAI.Discovery`, `.Documentation`, `.Copilot`, `.Data`, `.Core` are empty scaffolding.

This task builds the shell those sections will live in, and moves Studio into it unchanged.

---

## 2. Hard constraints — do not change

- **Visual language.** Dark navy surfaces, monospace type, blue accent, thin borders, uppercase micro-labels, collapse chevrons. Reuse the existing tokens and classes. If a mockup is referenced in conversation, it is a wireframe for structure only — its fonts and colours are not a proposal.
- **Studio internals.** The three-column layout, panel collapse behaviour, Diagram/JSON/Stats switcher, Mermaid rendering, bidirectional highlighting, export, and M-Files push/pull all stay exactly as they are. Move them; do not touch them.
- **No new dependencies.** No router library, no UI kit, no state library. Local state and conditional rendering are sufficient for four sections.
- **No dead clicks.** Every nav item either works or lands on an informative empty state. Nothing may silently do nothing.

---

## 3. The problem this fixes

The top bar currently mixes two unrelated concepts. `Manual | NLP | AI | Cacoo` sit where app-level navigation belongs, but they are not places you navigate to — they are ways of getting data into the workflow you are already editing. Adding Discovery, Docs, and Copilot next to them would make the confusion permanent.

---

## 4. Target structure — three tiers

```
Tier 1  Top bar      logo · section tabs · vault chip · ⌘K hint · reset
Tier 2  Context tabs supplied by the active section (Studio → workflows, Discovery → vaults)
Tier 3  Panel header ingestion source toggle, scoped to Studio only
        ── existing three-column layout below, untouched ──
```

Tier 2 is section-supplied, not global. Sections that provide no context tabs render no row and the layout reclaims the height. This matters: Docs and Copilot will not have a tier 2.

---

## 5. Components to extract

All of these come out of `CommandCenter.jsx`. Extraction only — behaviour is preserved.

| Component | Responsibility |
|---|---|
| `AppShell` | Owns tier 1, holds active section state, renders `{children}` |
| `SectionNav` | The four section tabs, driven by the registry in §6 |
| `VaultStatusChip` | Server/vault connection state, always visible in tier 1 |
| `ContextTabStrip` | Generic tier 2 strip; receives items, active id, and handlers as props |
| `SourceToggle` | Manual/NLP/AI/Cacoo, relocated into the left panel header |
| `SectionEmptyState` | Shared gated/empty view, driven by registry `gate` config |

**`VaultStatusChip` requires a state lift.** M-Files connection state (`mfVault`, `mfServer`, `mfAuth`) currently lives inside the Deliver panel. Lift it to `AppShell`; the Deliver panel becomes a consumer rather than the owner. Every future section depends on that connection, so it cannot stay buried in a collapsed panel.

`WorkflowTabs` becomes Studio's use of `ContextTabStrip` — do not leave it as shell-level furniture.

---

## 6. Section registry

One config object drives nav rendering, routing, and gating, so enabling a section later is a one-line change rather than a search:

```js
const SECTIONS = [
  {
    id: 'studio',
    label: 'Studio',
    icon: 'sitemap',
    enabled: true,
  },
  {
    id: 'discovery',
    label: 'Discovery',
    icon: 'radar',
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
    icon: 'file-text',
    enabled: false,
    gate: { /* … */ milestone: '5.2' },
  },
  {
    id: 'copilot',
    label: 'Copilot',
    icon: 'message',
    enabled: false,
    gate: { /* … */ milestone: '6.2' },
  },
];
```

Disabled sections still render in the nav and still route — they land on `SectionEmptyState`. They are visibly dimmer than enabled ones.

---

## 7. Empty states

Match the existing "No Diagram Available" treatment: centred icon, accent-coloured headline, muted body, generous vertical space. Not a modal, not a toast, not a grey "coming soon" box.

Each gated section states **what it will hold** and **what unblocks it**. The point is that a reader learns something about the product rather than hitting a wall.

---

## 8. Command palette

`CommandPalette.jsx` already does fuzzy search over workflows, states, and actions, with a right-aligned type badge (`WORKFLOW`, `STATE`). Add a `SECTION` result kind so "Go to Discovery" and "Go to Copilot" appear in the same list with a `SECTION` badge. Same interaction, same rendering path — no new UI.

Gated sections appear in the palette and navigate to their empty state.

---

## 9. Naming

The logo component renders **ProvisoningAI** — missing the second `i`. The window title renders **ProvisioningAI**. Correct the logo to `ProvisioningAI`, preserving the existing accent styling on the middle segment. Check for the same typo anywhere else it appears.

---

## 10. Flag, do not build

Two items are out of scope for this pass but should be raised in the PR description so they are not lost:

**Long-running scan IPC.** Discovery is a nine-stage scan taking minutes, and must be resumable. The current one-call-in-one-result-out IPC pattern will not carry it — it needs a scan id, a progress channel, and a cancel channel (`discovery:start` → id, `discovery:progress` → stage events, `discovery:cancel`). Do not implement. Note it.

**Unreviewed M-Files writes.** Studio pushes workflows to M-Files directly over IPC. The PRD scopes V1 as read-only, with writes gated behind a plan-then-apply confirmation. The code and the spec disagree. Do not change the push path in this task — flag it so it gets decided deliberately.

---

## 11. Out of scope

- Any backend or C# work
- Discovery, Docs, or Copilot functionality
- Left icon rail — top-bar tabs are the chosen pattern; revisit only if sections gain sub-navigation
- Any change to Studio behaviour, layout, or styling
- Typography changes

---

## 12. Acceptance criteria

- [ ] Studio behaves identically to before — ingestion, diagramming, highlighting, export, push/pull all unaffected
- [ ] Top bar shows four section tabs; Studio active by default
- [ ] Ingestion source toggle appears in the left panel header, not the top bar
- [ ] Workflow tabs render in tier 2 while in Studio, and nowhere else
- [ ] Vault status is visible from every section without expanding a panel
- [ ] Discovery, Docs, and Copilot each render a distinct, informative empty state
- [ ] `⌘K` offers section jumps alongside existing results
- [ ] Logo reads ProvisioningAI
- [ ] Enabling a section requires editing only the registry entry
- [ ] No new npm dependencies

---

## 13. Suggested commit sequence

1. Fix logo spelling — isolated, trivially reviewable
2. Extract `AppShell` and `SectionNav`; Studio as the only section
3. Lift M-Files connection state; add `VaultStatusChip`
4. Generalise workflow tabs into `ContextTabStrip`; Studio supplies items
5. Relocate `SourceToggle` into the left panel header
6. Add `SectionEmptyState` and the three gated sections
7. Add `SECTION` result kind to the command palette

Each step should leave the app running. Do not batch them.
