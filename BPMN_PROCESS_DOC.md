# BPMN Process Documentation (Process Docs Canvas)

## 1. Purpose
This document defines how BPMN process modeling works in ProvisioningAI's Process Docs canvas.

Process Docs is for internal process documentation (Cacoo-replacement role), not provisioning execution.

## 2. Scope Boundary
The BPMN canvas is documentation-only.

It must never:
- Feed provisioning directly
- Share workflow state/schema with M-Files Flow
- Invoke Translator/Validator/Emitter paths
- Introduce vault-side write behavior

## 3. Two-Canvas Isolation Rule
ProvisioningAI has two separate canvases:
- M-Files Flow (Studio): Mermaid + custom SVG overlay, store: useWorkflowStore
- BPMN Standard (Process Docs): React Flow, store: useBpmnStore

Hard rule: zero shared state/schema/data path between the two canvases beyond app shell/navigation chrome.

## 4. Current BPMN Functional Surface
The Process Docs canvas currently supports:

- Node types:
  - Start event
  - End event
  - Task
  - Sub-Process / Call Activity (double vertical-bar marker, exports as real bpmn:CallActivity)
  - Gateways: Exclusive, Inclusive, Parallel
  - Pool container (single generic pool, resizable via React Flow's NodeResizer, auto-grows to fit a node dropped in that doesn't currently fit)

- Selection and navigation:
  - Marquee/drag-select (SelectionMode.Partial — touch-to-select, not full-containment)
  - Ctrl/Shift+click to add to selection
  - Ctrl+A select-all
  - Plain drag pans the canvas (not select — this is intentional, confirmed by the user after an earlier pass briefly swapped it to Figma-style drag-to-select and broke expected muscle memory); Shift+drag is what marquee-selects instead
  - MiniMap (bottom-right, themed, node-colored by type)
  - Right-click context menus: node, edge, and empty-canvas (pane) variants, each with Undo/Redo; node menu also offers Group when the right-clicked node is part of a multi-selection
  - Floating multi-select toolbar (2+ selected): Wrap Workflow in Pool / Duplicate / Delete
  - "Wrap Workflow in Pool" — one-click, wraps every top-level node (regardless of what's selected) into a single Pool sized to fit all of them; available from the pane right-click menu, the node right-click menu (when part of a multi-selection), and the floating multi-select toolbar
  - "Group selection into Pool" — the selection-scoped sibling action (only groups whatever's currently selected, not everything) — deliberately kept as a separate, narrower option so two unrelated workflows on the same canvas can't get merged by accident; available from the pane and node right-click menus only (not the floating toolbar, which was swapped to Wrap Workflow per the user's explicit request)
  - Keyboard shortcuts reference panel (⌨ Shortcuts button in toolbar)

- Edge and layout behaviors:
  - Connector styles: Orthogonal, Straight, Curved
  - Snap-to-grid
  - Helper/snap alignment lines
  - Auto-arrange
  - Magic connector (drag from a node's handle onto empty canvas to create + connect a task in one motion)
  - Edge/node hover and selection now have real visual feedback (accent-blue glow) — React Flow's own default selected-state was a near-invisible 0.5px outline on this dark canvas

- Editing and history:
  - Undo/redo (toolbar buttons, Ctrl+Z/Ctrl+Shift+Z, and from any right-click context menu)
  - Copy/paste/cut (Ctrl+C/X/V)
  - Parent remap for pasted pool children
  - Version history snapshots (in-memory)
  - Inline double-click-to-edit for node labels and edge/branch labels (input opens already focused — no separate "Edit" button click needed first)
  - Edge comments now show a small badge on the edge itself (previously saved but invisible on canvas)

- Validation and data interchange:
  - Real BPMN 2.0 export/import
  - bpmn-moddle schema validation
  - Persistent validation status bar

## 5. Explicitly Out of Scope (Until Re-approved)
Do not implement without explicit approval:

- Collaboration features
- Removing React Flow attribution
- Pool/lane multi-lane subdivision
- Full Pool export to collaboration/participant model
- libavoid obstacle-avoiding routing
- Server-side image export
- Auto-gateway insertion for "BPMN compliance"

## 6. Known BPMN Truths Recorded in This Project
Canonical recorded finding:

- A condition can be attached directly to a plain Task sequence flow.
- The claim "conditions must originate from a gateway" is not valid in this project context.
- This was empirically validated through bpmn-moddle round-trip with zero warnings.

## 7. Operator Workflow (How to Use Process Docs)
1. Open Process Docs section.
2. Use categorized palette to place nodes.
3. Connect nodes with preferred connector style.
4. Use snap-grid/helper lines for clean geometry.
5. Auto-arrange when needed.
6. Validate continuously using the status bar.
7. Export BPMN 2.0 when documentation is ready.

## 8. Development Discipline for BPMN Changes
For each BPMN task:

1. Check existing Pro example(s) before custom implementation.
2. Keep changes JS/JSX only (no TypeScript conversion, no CSS modules, no new test framework unless approved).
3. Reuse established UI patterns.
4. Report verification with concrete values/evidence.
5. Confirm M-Files Flow remains unaffected after each BPMN change.

## 9. Current Open Work Queue (At Time of This Doc)
Open/investigation items:
- Gateway parity check (duplicate/edit/delete parity vs Task)
- Edge-insert node plus sticky-note comments
- Command-palette extension decision for BPMN actions
- Stage 4 selection grouping plus expand/collapse (partially superseded — see Session Log below; Ctrl+A + Wrap Workflow in Pool now cover most of what this was meant to solve)
- Real multi-Participant/Message-Flow BPMN model for Pool (currently Pool is canvas-only containment; export still skips Pool nodes rather than emitting bpmn:Participant/Collaboration — documented, deliberate limitation, not a bug)

## 10. Session Log

### 2026-08-14 — UX review + implementation pass, plus real bugs found and fixed
Full report (findings + fix list) published as an artifact; then implemented nearly all of it live, verified via browser automation after each change. Two genuinely severe bugs were found and fixed along the way, not just polish:

1. **Selection was completely broken** — neither marquee-drag nor Shift/Ctrl+click added a second node to a selection. Root-caused to `panOnDrag={true}` (the literal boolean) silently disabling React Flow's own `selectionOnDrag`, confirmed directly in `@xyflow/react`'s source. Fixed, then a later pass swapped drag to select-by-default (Figma convention) — the user flagged this broke expected pan-by-drag behavior, so it was reverted; Shift+drag now covers marquee-select instead, using React Flow's own independent `selectionKeyCode` mechanism.
2. **New Pool spawned directly on top of existing nodes**, silently blocking every click meant for them — this is what looked like "dragging a node into the pool then moving the pool doesn't work." The spawn-collision check was built for small ~150x60 nodes (24px point-proximity) and never accounted for a 420x260 Pool being able to fully cover something while still passing that check. Fixed with a real rectangle-overlap check sized to the Pool's actual footprint.

Also shipped: MiniMap, right-click context menus (node/edge/pane), a floating multi-select toolbar, keyboard shortcuts panel, inline double-click-to-edit labels, Pool resizing (React Flow's built-in NodeResizer), Pool auto-grow-to-fit on drop, "Wrap Workflow in Pool" (one-click, wraps everything regardless of selection) added to all three surfaces and swapped in as the floating toolbar's primary action per the user's explicit request, and a visual polish pass (hover/selection glow on nodes and edges, toolbar regrouped into labeled clusters).

**Resume codeword: "word"** — note this codeword is already bound to the unrelated Conformity/M-Files investigation thread in memory (`conformity_ii_session_codeword.md`). If the user says "word" next session, check which thread they actually mean from context before assuming — don't silently default to one.

## 11. Primary References
- GUI_HANDOFF_2026-08-13.md
- progress.md
- V1_DEVELOPMENT_ROADMAP.md
- CLAUDE.md
