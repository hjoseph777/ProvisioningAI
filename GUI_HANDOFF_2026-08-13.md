# GUI/Canvas Handoff — ProvisioningAI Workflow Studio
**Handoff window:** now until 5:00 PM today
**Scope:** GUI and canvas work only — frontend React Flow Pro + supporting backend, nothing else

---

## 0. Read this first — scope boundary

You are being handed **only** the GUI/canvas work. Do not touch, investigate, or make decisions about:
- `ProvisioningAI.Workflow/Translation/` (the Mermaid Translator/Validator/Renderer) — separate system, currently paused, out of scope entirely.
- The COM emitter or anything vault-related.
- Anything not visually/interactively part of Workflow Studio's two canvases.

If a task seems to require touching either of those, stop and flag it rather than proceeding.

---

## 1. The two-canvas architecture — the single most important fact

There are **two fully isolated canvases** inside Workflow Studio. This isolation is deliberate, load-bearing, and non-negotiable.

| | **M-Files Flow** (Studio) | **BPMN Standard** (Process Docs) |
|---|---|---|
| Purpose | The real product — feeds actual M-Files provisioning | Documentation only, Cacoo replacement — **never feeds provisioning** |
| Rendering | Mermaid.js + hand-built custom SVG overlay | `@xyflow/react` (React Flow, current package — **not** the deprecated `react-flow-renderer`) |
| State | `useWorkflowStore.js` | `useBpmnStore.js` — fully separate |
| Data model | States/transitions/groups, feeds toward the real Translator eventually (deferred) | `bpmn-moddle`-validated, real BPMN 2.0 XML export/import |

**Hard rule, checked at the end of every single task all session: zero shared state, schema, or code path between them beyond the app shell.** Every task report must confirm M-Files Flow is unaffected using **real values**, not just "it still works" — e.g. `stateFill: rgb(58,127,213)`, `nodeCount: 13`, exact gateway diamond path/fill/stroke. Counting nodes is not sufficient verification — a real bug today (Task/Start/End nodes silently landing at `NaN` position) passed a node-count check and was only caught by inspecting actual rendered coordinates.

**This handoff is BPMN Standard / React Flow Pro work only**, unless explicitly told otherwise.

---

## 2. Hard restrictions — do not violate these

1. **No TypeScript conversion, no CSS modules, no new testing framework.** The real codebase is plain JS/JSX. An external AI-generated spec assumed TypeScript/Vitest/CSS-modules at one point today — that assumption is wrong; do not follow it.
2. **Check `React_Flow_Pro/` examples before building anything custom.** 17 example bundles exist at `C:\Users\Owner\Xerox\ProvisioningAI\React_Flow_Pro`. License is real and active (confirmed via `LICENSE.md`, perpetual right to use/adapt once under a valid subscription). If a bundle exists for what you're building, open and read it directly — do not assume what it contains from its filename. Today's work found the Pool example was *thinner* than its name implied (no lane-divider concept at all) — scope to what's actually there, state that plainly if it's less than expected.
3. **Do not build things that don't fit their category.** A palette holds draggable node types. Undo/redo, copy/paste, helper lines, animations are canvas behaviors/toolbar actions — they do not belong in the palette UI, no matter how tempting it is to list them there for visibility.
4. **Never claim something is verified live without actually testing it.** If real drag-and-drop can't be tested (React Flow's `XYDrag` uses real pointer-capture that synthetic events can't replicate — confirmed repeatedly, this is a real environment limitation, not a skill issue), say so explicitly and describe what *was* actually verified instead (usually: rigorous pure-function/algorithm testing with real hand-computed values).
5. **Regression checks need real numbers, not pass/fail assertions.** Quote the actual color hex, the actual node count, the actual path `d` attribute. "Still works" is not acceptable phrasing on its own.
6. **Reuse existing UI patterns, don't invent competing ones.** Icon glyphs → `lucide-react` (already a dependency). Tooltips → native `title=""` for simple cases; only introduce a new tooltip component if genuinely richer content is needed, and make it a reusable primitive, not one-off. Sidebar collapse behavior → match `CommandCenter.jsx`'s existing `cc-left` panel convention.

---

## 3. Explicitly deferred or rejected — do not build these without a fresh, explicit decision

- **Collaborative editing** — deferred, not now.
- **Removing the React Flow attribution link** — declined; a separate Pro feature never authorized.
- **Pool/Lane multi-lane subdivision** — Pool container itself is now real (Stage 1, today); lane dividers within a pool are not, and there's no reference implementation for them in the Pro examples to build from.
- **Pool export to real BPMN XML** — pool nodes are currently *excluded* from export (correctly, not mis-tagged). Real export would require restructuring the exporter's single-flat-`Process` model into `bpmn:Participant`/`bpmn:Collaboration` — a genuinely bigger change, needs its own explicit go-ahead.
- **libavoid obstacle-avoiding edge routing** — real bundle exists (compiled WASM), feasibility not yet checked. Don't assume it's simple.
- **Server-side image export** — would require real backend infrastructure that doesn't currently exist. Not a checkbox item.
- **Stuffing the sidebar with every possible React Flow Pro capability** — explicitly rejected today in favor of a searchable command-overlay approach (see open item below) once/if one is warranted. The sidebar stays curated to what people actually drag onto the canvas.
- **Auto-gateway-insertion "for BPMN compliance"** — an external critique claimed conditions can't attach directly to a Task without a gateway. This was empirically disproven: a real `conditionExpression` was built directly off a plain `bpmn:Task`, round-tripped through `bpmn-moddle`'s real schema with zero warnings. There is no such rule. Do not build this.

---

## 4. What's built and verified today, in order

1. **Gateway diamonds** (Exclusive, Inclusive, Parallel) — real shapes, per-type colors matching M-Files Flow's hub colors exactly (`#7c8cff` blue / `#9aa2b8` gray / amber for inclusive), per-type colored glow (not a universal color), handles hidden by default and color-matched per type on hover/selection.
2. **Design tokens spec** (`shapeDesignTokens.js`, `gateway-diamond-design-tokens.md`) — six documented values with provenance, applied to M-Files Flow's gateway diamond. BPMN's gateway diamond deliberately uses its own separate values (different size, 56×56 vs 40×40) — not reconciled to the same tokens, checked and found not warranted beyond the shared glow-color pattern.
3. **`bpmn-moddle` integration** — real BPMN 2.0 XML export/import, schema validation, round-trip tested against both self-produced and independently hand-written `.bpmn` files.
4. **Left sidebar palette** — collapsible (44px collapsed / 240px expanded, 450ms hover-out delay with cancel-on-re-enter, pin/lock toggle), categorized (Events, Activities, Gateways, Connectors, Containers), search (matches both item names and category names).
5. **Node/edge styling** — dark-canvas-native cards for Task/Start/End, pill-style edge labels, connector-style picker (Orthogonal/Straight/Curved, wired to React Flow's real path functions, not custom routing math).
6. **Magic connector** — hover a node's edge, `+` appears, drag to create+connect the next node.
7. **Persistent validation status bar** — real, re-runs `bpmn-moddle` validation on every change, click-to-locate-and-zoom.
8. **Version history** — minimal manual snapshot/restore, in-memory only.
9. **Pool container** (Stage 1 of the Pro-catalog rollout) — single generic container, real clamping/sorting math ported from the actual Pro example, cascade-delete fixed for children, excluded from BPMN export (correctly).
10. **Helper lines / snap guides** — built in an earlier phase, re-verified and fixed today for Pool's relative-position model (a pool's child stores position relative to its parent, not canvas-absolute — this broke the original guide-line math until caught).

---

## 5. In flight — awaiting reports, do not duplicate this work

- **Stage 3: undo/redo + copy/paste — COMPLETE.** Ctrl+Z/Ctrl+Shift+Z, verified across task/gateway/pool/edge operations. Copy/paste correctly remaps `parentId` on pasted pool children (real gap found and fixed — `buildPastedElements` in `bpmnPools.js`). A real crash bug (app unmount on Ctrl+V immediately after Ctrl+C, caused by three co-mounted keyboard-listener instances) was found and fixed — replaced with a single manual listener, matching the pattern already used for undo/redo in the same file. Regression confirmed: M-Files Flow/Studio unaffected.
- **Dev server is already running on port 3000** — left up intentionally for continuity. Do not start a second instance; check it's live before assuming you need to launch one.
- **Next up: Stage 4 — selection-grouping + expand/collapse.** Same discipline as every prior stage: check `React_Flow_Pro/` for real example bundles first, port faithfully but don't blindly trust the source (Stage 3 found the reference example's own `canUndo`/`canRedo` logic was inverted, and had no input-focus guard for an app with real text fields — both fixed, not ported as-is). Report after this stage, don't chain into Stage 5 automatically.
- **Gateway parity check** (duplicate/edit/delete on gateways vs. Task nodes) — sent earlier, status unknown, check for a report before redoing it.
- **Edge-insert node + sticky-note comments** — sent earlier, status unknown, check for a report before redoing it.
- **Command palette investigation** — sent earlier, status unknown, check for a report before redoing it.
- **`progress.md`/`V1_DEVELOPMENT_ROADMAP.md` update** — sent to bring the docs current through everything up to (but not including) Stage 3. Status unknown to this handoff. **Check whether it landed before doing anything else** — if it didn't, that's arguably the highest-priority first action, since the docs are the durable record and are now significantly behind actual progress.

**Check for real status on all five of the above before starting new work in the same areas — don't assume any of them are either done or not done.**

---

## 6. Working discipline — how tasks get done here

This project runs on a specific verification standard, applied without exception all day:

1. **Check the real code/example before assuming.** Multiple times today, external AI-generated critiques and specs contained confident, specific, wrong claims (a fabricated BPMN rule, an unverified pixel width, a `TypeScript`/backend assumption that didn't match the real stack). Every one was caught by checking, not by trusting confident phrasing.
2. **Report before continuing to the next stage.** No multi-part task should be done as one giant delivery — stage it, report, get confirmation, continue.
3. **State honest verification gaps plainly.** Several real limitations exist in this environment (synthetic events can't trigger real pointer-capture drags or CSS `:hover`) — when something can't be tested end-to-end, say so and describe what *was* actually proven instead. This has never been treated as a failure in this project — vague overclaiming would be.
4. **Flag bugs found outside a task's own scope rather than silently fixing or ignoring them.** Several real bugs were caught this way today (a MiniMap `NaN` crash, a dangling-edge import crash, a parameter-shadowing position bug) — none were in-scope for the task that found them, all were reported and fixed as their own explicit step.

---

## 6a. Token efficiency — don't re-solve what's already settled

Given the 5:00 PM window, budget matters. Apply this on every task:

- **Reference established facts by name, don't re-derive or re-explain them.** If a task says "per the isolation rule in Section 1," that's sufficient — no need to re-justify why isolation matters or re-walk through the reasoning.
- **Don't re-verify things that haven't changed since they were last confirmed.** If M-Files Flow's `stateFill`/`nodeCount` were confirmed unchanged two tasks ago and nothing since has touched anything outside BPMN Standard, a quick confirmation is enough — a full fresh re-derivation of the isolation argument isn't needed every single time.
- **Don't refactor working code without being asked.** If a file is open for one specific change, make that change — don't "clean up" or restructure adjacent code that wasn't part of the task, even if it looks improvable. That's a separate decision, not a freebie.
- **Don't re-investigate questions already answered in this document.** The Pool example's real scope, the TypeScript/stack mismatch, the pointer-capture testing limitation — these are settled facts, not things to re-check from scratch each time they're relevant.
- **When reporting back, lead with the outcome and only include verification detail proportional to risk.** A one-line CSS color change doesn't need the same depth of regression narrative as a new data-model field. Match the report's length to the task's actual risk, not a fixed template.

The goal is real, verified work — not less rigor, just no repeated motion on ground already covered.

---

## 7. Where to find more context if needed

- `progress.md` and `V1_DEVELOPMENT_ROADMAP.md` — the durable project record. Check these for anything not covered above.
- `CLAUDE.md` — architectural decisions and boundaries (Decision 7 specifically covers what BPMN Standard is and isn't for).
- `gateway-diamond-design-tokens.md` — M-Files Flow's shape design spec, if BPMN reconciliation ever comes up again.

---

**End of handoff. Scope: GUI/canvas improvement, React Flow Pro frontend + supporting backend only, until 5:00 PM.**
