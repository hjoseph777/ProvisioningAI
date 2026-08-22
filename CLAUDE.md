# Claude Project Configuration: ProvisioningAI (Connector II)

> **Maintenance rule:** this file describes the system **as built**, not as planned. Section 2 is the source of truth for what exists. If you change what exists, update section 2 in the same PR.

---

## 1. Project Overview & Core Truth

**Project Name:** ProvisioningAI

**Description:** M-Files vault automation platform. Maps vault integrations, documents them, simulates workflows, and — eventually — automates vault provisioning, reducing a two-week manual cloning process to minutes.

**Core Truth:** *"You cannot safely automate what you have not fully mapped."*

**Vaults:** Conformity (V1, simpler — the proving ground). Approbation (V2, more complex). Conformity is deliberately **not** assumed to be representative.

**Tech Stack**

- **Frontend:** React 18, Electron, TailwindCSS, Zustand, Mermaid
- **Backend:** C#/.NET 8, ASP.NET Core, Serilog, EF Core + SQLite (V1); Neo4j (V2)
- **Integration:** M-Files COM API (Interop), M-Files REST API, Claude/OpenAI/GLM APIs
- **Planned, not present:** React Flow and Framer Motion arrive with V1.5 workflow simulation. Do not introduce them earlier, and do not "correct" the working Mermaid renderer to match them.

---

## 1A. Project Arc — three stages, hard safety line

ProvisioningAI delivers in three stages. Each is independently useful
and each earns the next. The line between stage 1 and stage 3 is a
SAFETY boundary, not just a sequence.

STAGE V1 — INVESTIGATE & DOCUMENT (current)
  Connect over COM/REST, scan both tiers (Firebird vault + SQL
  dbo.Company), produce a human-reviewed mapping template per vault.
  READ-ONLY. Writes nothing to any vault or SQL database. Deliverable
  has standalone value as documentation even if V2 is never built.

STAGE V1.5 — DIFF & VERIFY
  Compare two vaults' maps and show what differs. Still READ-ONLY,
  low-risk, high-value. It is the bridge to onboarding (onboarding =
  making a clone differ from its template in exactly the
  customer-specific ways) AND it validates the GUID/mapping model
  against reality. The diff view later BECOMES the V2 plan preview —
  build it once, here.

STAGE V2 — AUTOMATE ONBOARDING (the payoff)
  M-Files' own vault copy/restore already clones the Firebird vault
  natively — structure, workflows, GUIDs, as one file-level unit. So
  onboarding is NOT vault reconstruction; it is REWIRING two known
  things on a native clone: the dbo.Company row and any vault-side
  references pointing at the old customer. This mutates real systems
  and MUST go through plan/apply: preview every change, require
  approval, write vault + SQL as one transaction, keep rollback.

THE WORD "IMPORT" HAS TWO MEANINGS — DO NOT CONFLATE:
  import-to-READ  = ingest a vault's DOCUMENTATION into the index.
                    Writes nothing. This is V1. Safe.
  import-to-PROVISION = write a new customer's vault + SQL config into
                    existence. Mutates real systems. This is V2, and
                    only ever through the plan/apply gate.

CREEP WARNING: the native clone being EASY makes the rewire the ENTIRE
risk surface, and the rewire is exactly the part that needs the safety
gate. Easy-to-do is not safe-to-do. Do not advance any writing capability
into V1 because "it's just a rewire."

ONE KNOWN EXCEPTION, ON THE RECORD: MfilesProperties.md's Decision 8 moves
the COM emitter — specifically, only that component — into V1 scope, under
four explicit conditions (Conformity-only, additive-only, dry-run-first,
rollback-plan-required). See Decision 8 for the full text and conditions;
not duplicated here. This is a narrow, conditioned carve-out for one named
component, not a reopening of the boundary above — the CREEP WARNING still
applies to everything else.

---

## 2. Current State

### 2.1 What exists and works

**Audited 2026-08-13 (Milestone 8's audit-first sub-task) — every bullet below re-verified live against the real running app, not re-asserted from memory.** Findings that changed this section are recorded here, not just in progress.md, per this file's own maintenance rule.

**Workflow Studio and Process Docs are both live, functioning sections** — Studio is no longer the *only* one. Process Docs (`src/components/BpmnCanvas.jsx`, the BPMN Standard documentation canvas) shipped 2026-08-13 as a second real `SECTIONS` entry; see §2.3. Both are treated as production code within their own stated scope.

**Confirmed still real, verified live this pass:**
- Ingestion mode UI: Manual, NLP, AI, Cacoo tabs all render and switch correctly. Manual-mode table editing verified extensively; NLP/AI/Cacoo's actual parsing paths were not independently re-run this pass (AI needs a real API key, Cacoo needs `backend/app.py` on :5000 — neither was exercised).
- Live Mermaid diagramming — genuinely live, extensively re-verified this session across the gateway-diamond, theme, and animation work.
- **Click-based** highlighting between tables and diagram (click a state/transition row → diagram node highlights via `sel`; click a diagram node → table row selects) — confirmed working, both directions.
- Command palette (`⌘K`) — opens, lists real entries (states/workflows/sections/actions), closes on Escape. Confirmed live.
- Panel collapse (left/right) and the Diagram/JSON/Stats switcher — confirmed live.

**Confirmed broken, not stale-but-harmless — a real, reproducible bug, not a matter of interpretation:** the **hover-based** half of "bidirectional highlighting" (`onMouseEnter`/`onMouseLeave` on a table row → `hoveredState`/`hoveredTransition` → a separate `useEffect` in `CommandCenter.jsx`) never actually highlights anything, on either states or transitions, and never has visibly, because it silently no-ops with zero console errors:
- State-hover looks up the diagram node via `diagRef.current.querySelector('#' + sanitizedName)` — but real Mermaid-rendered node ids are `state-Draft-15`-style (name + a numeric suffix), never the plain sanitized name. Confirmed directly against the live DOM: `#Draft` matches nothing.
- Transition-hover looks up the edge via `[class*="LS-from"][class*="LE-to"]` — but real rendered edges carry only `class="edge-thickness-normal transition"`; the `LS-`/`LE-` classes this code assumes never exist on this Mermaid version's output. Confirmed directly against the live DOM.
- Both are pre-existing, not something this session's gateway/theme/animation work introduced — they use `id`/class assumptions never true for this Mermaid version, as far as could be determined. Not fixed as part of this audit (audit-only pass, per Milestone 8's own scoping); flagged here so it isn't silently assumed to work.

**Inconclusive, not confirmed either way — flagged rather than asserted:**
- SOW/PRD markdown export: clicking Deliver → SOW produced no observable `Blob`/`URL.createObjectURL` call across three independent interception methods in headless-browser testing, with the button confirmed visible, enabled, and correctly wired in the DOM. Could be a real bug or a headless-browser-automation artifact around download-triggering APIs — not distinguished conclusively this pass. Needs a manual check in a real browser/Electron session before being called either working or broken.
- M-Files push and pull over Electron IPC: **cannot be exercised at all from this audit's testing method** — `window.mfiles`/`window.file` are Electron-preload-injected and don't exist in the plain Vite-dev-server-in-a-browser environment used for every live verification this session. Confirmed absent (`typeof window.file === 'undefined'`) in that environment, which is expected, not a finding about the real Electron build. Genuinely untested this pass, not stale-and-known-broken — needs verification inside an actual Electron session against a real M-Files server.

**Do not refactor Studio internals.** Layout, panel collapse, the Diagram/JSON/Stats switcher, Mermaid rendering, highlighting, and export all stay as they are unless a task explicitly targets them. (The hover-highlight bug above is a case where a task would need to explicitly target it — it's flagged, not fixed.)

### 2.2 What is scaffolding only

`ProvisioningAI.Discovery`, `.Documentation`, `.Copilot`, `.Core`, `.Provisioning` contain auto-generated `Class1.cs` and nothing else. Do not assume any backend behaviour exists.

`ProvisioningAI.Data` is past pure scaffolding but still has no real behavior: `Class1.cs` is gone, `Microsoft.EntityFrameworkCore.Sqlite` + `.Design` (8.0.10) are referenced, project builds clean with zero `.cs` files. No entities, no `DbContext`, no migrations yet — that's Milestone 1.2, tasks 1.2.2–1.2.6.

### 2.3 Immediate work

**Done:** shell redesign (app-section tabs, context tab strip, ingestion-mode toggle relocated, M-Files connection status chip) and **Module 1: M-Files Connectors** — `ProvisioningAI.MFilesConnectors` in C#, both COM and REST, including per-vault login (`LogInToVaultAsync` / `IVaultHandle`), not just enumeration. Verified live against a real M-Files 26.6 server, including a full connect → login → read → logout → release cycle against Conformity specifically (repeated 5x, zero COM handle growth). REST connector built to the documented contract but never live-verified (no REST/IIS endpoint reachable in this dev environment) — its search method and cookie auth were deliberately deferred as speculative.

**Done:** Milestone 1.2, SQLite/EF Core (`ProvisioningAI.Data`) — entities, `DbContext`, migrations, repositories, tests. This includes a `CanonicalGuidConverter` enforcing canonical GUID strings (`{...}`) at the EF boundary, verified to correctly fire on the query/read path.

**Done:** Phase 2.1, Discovery Engine, Stages 1-8 (vault identity, value lists, property defs, object types & classes, workflows/states/transitions, users/groups/ACLs, views, named value storage) — built, unit-tested, and live-verified against Conformity. Stage 8 hit a confirmed SDK boundary (per-app Configuration-node data is Admin-only, unreachable via COM or REST — see §4.4.2); everything else reachable was captured.

**Done:** Stages 1-8 re-run, unmodified, against Approbation (2026-07-28) — the same scanners generalized to a second, structurally different vault with zero code changes across all six re-run stages (3-8; Stages 1-2 ran in an earlier pass). Confirms the GUID-first, name-as-label design isn't tuned to Conformity's specific shape. See progress.md's "Approbation Stage N" entries for full per-stage counts and skills.md's "Approbation cross-vault check" entries for takeaways.

**Done:** two-plus sessions of ad hoc Conformity investigation (Stage A rubric checks, VAF add-on config decompilation, cross-vault integration-verification) consolidated into progress.md and skills.md, 2026-08-01. Headline reversal: §4.4.2's "VAF Custom Application Configuration is unreachable" finding is SUPERSEDED — see the correction inline in §4.4.2 below and the new §4.4.3. The full master 47-state Conformity behavior table (native action source + add-on binding per state, built from live `provisioning.db` data, not from memory) is in progress.md; the full customer-specific-value inventory across all four config-bearing VAF apps and the config-write-safety requirement (§4.5) are in skills.md. Scope of this consolidation is Conformity only — Approbation's remaining stages and the v3.0/multi-vault threads are untouched, still open.

**Done (milestone):** Conformity config-write protocol is complete enough to treat as a finished milestone, with one scaffolding item still open. Proven end-to-end: VAF add-on config read/write via NVS type 8 (`MFSystemAdminConfiguration`) under app full type-name namespaces; byte-faithful write path (no normalization/re-serialization); and one real semantic patch shipped live (`MoveToApproval` Destination Vault GUID, production Approbation `{037B0872-...}` -> dev-test Approbation `{281953C0-...}`, 7 nested Vault Toolbox locations, 7/7 replaced, 0 collateral-byte changes, independently re-verified outside the harness). Not a "finished everything" claim: functional invoice-routing proof (Scenarios A/B/C) is still pending.

**Done (milestone, 2026-08-02):** Conformity cross-vault handoff mechanism proven to the destination vault boundary. Not a phase closure — Conformity work continues (streamlining, TriggerBridge, the provisioning template all remain active). A real test invoice, driven through 10 genuine workflow transitions via COM (`CheckOut`→`SetProperty`→`CheckIn` — confirmed via SDK reflection to be the same mechanism the M-Files client itself uses; no separate "perform transition" API exists), fired M-Files Vault Toolbox's `MoveToApproval` trigger, which enqueued the move task, which reached dev Approbation's vault boundary. Along the way: found and fixed a silent-logging bug (the trigger's own error-reporting EventLog source didn't exist, so a thrown exception there would vanish without trace — environment-only fix, add-on untouched); proved the enqueue→process→writeback chain works end-to-end via a sibling trigger (`FindDuplicates` wrote back `PD.Searchcount=1` on the same test object); and confirmed a full `MFServer` restart (not just app disable/enable) is the only mechanism that reliably reloads NVS config changes — a hard requirement for the provisioning engine's future apply phase. See §4.7 for the phase-boundary rule this milestone established. Full detail in progress.md and skills.md (2026-08-02 entries) and `rollback/2026-08-01_082750_conformity-write-protocol/AUDIT_LOG.md`.

**Done (milestone, 2026-08-06):** Connection II closed for its actual mandate — the config-write-to-live-behavior mechanism (write → reload → live behavior change → object reaches the Approbation boundary via a real trigger) is proven, conclusively. Root cause found for why the cross-vault handoff has never been observed *completing*: Vault Toolbox's task processor cannot authenticate to the vault (`Authentication failed. (0x8004001A)`, confirmed live via `IVaultApplicationTaskOperations` — a fresh test object's `FindDuplicates` task, same processor infrastructure `MoveObject` uses, failed on its own internal login before doing any work), for any task type, not just `MoveObject`. This is a standalone credential/service-account issue, not a config or GUID problem — see §2.4's superseded entry below, progress.md's "Connection roadmap" and matching session entry, and skills.md's matching skill entry for full evidence. Connection II's scope is not reopened to fix this.

**Decision (2026-08-10):** Connection III re-scoped from TriggerBridge to the Workflow/Mermaid Pipeline, given priority-1 status; TriggerBridge renumbered to Connection IV (reusing the numeral vacated when the original Connection IV/Approbation-receiving-side was folded into Connection II on 2026-08-04 — same re-scoping pattern as that fold, applied visibly again here). Connection III (Mermaid Pipeline): design an M-Files workflow visually via Mermaid, refine via an interactive editor, export via COM into a real workflow — and the reverse. Chosen over the vault-template/"customize on the fly" capability (priority 2, builds on Connection I/II's SQL-consolidation and byte-faithful config-write groundwork, real but not yet scoped as its own tool) because the reference document (`MfilesProperties.md`) is mature — multiple correction passes including an independent third-party structuring audit — the architecture is designed, and a worked example is validated on paper; not yet built: the interactive editor, translator/validator, COM emitter. Full reasoning: progress.md's "Decision (2026-08-10)" entry. **Flagged, not resolved:** Connection III's COM-export step is a write to a live vault, which is a V2-class capability under this project's own §1A read-only-until-V2 arc — recording it as the near-term build priority does not resolve that tension, it's the same open category as the "Studio writes to M-Files" item below. Full-vault-import (priority 2) does NOT make workflow design (priority 1) easier — they solve different problems (replicate/adapt an existing template vs. design/modify logic itself) and should not be conflated. **SUPERSEDED in part (2026-08-11):** the translator/validator is no longer "not yet built" — see the next entry below. The interactive editor and COM emitter remain genuinely not started.

**Done (milestone, 2026-08-11 – 2026-08-12):** Connection III's translator/validator built and passing (`ProvisioningAI.Workflow/Translation/`, 24 tests, exact match against MfilesProperties.md §6.2's acceptance test), plus a companion side-by-side visualization tool (`TranslationPlanRenderer.html`, Mermaid input next to a hand-rolled M-Files-schematic rendering of the resolved plan). Both are read-only/plan-only — no COM, no vault access, no writes — staying inside V1's existing scope boundary per §1A. Building the translator surfaced three places MfilesProperties.md §3.5 itself was underspecified (the unlabeled-vs-skeleton default split, the sidecar's actual scope, and the implicit-state-discovery limitation on dangling-reference validation); all three were corrected in §3.5 itself, not left as code-only fixes. The renderer then surfaced a fourth gap — `EvaluationPriority` (§1.6) was documented in §3.5 but never implemented — which was closed the same way (implemented, tested, re-verified visually in the renderer, not just checked for absence of console errors). **Milestone 8 added:** GUI integration of these standalone tools into the existing React/Electron Workflow Studio, first sub-task an audit of Studio's actual current code state (see §2.1's diagramming/push-pull claims) before treating integration as pure addition. Full detail, evidence, and the exact §3.5 wording changes: progress.md's 2026-08-11 and 2026-08-12 entries; sub-milestone status: `V1_DEVELOPMENT_ROADMAP.md`'s Connection III table.

**Blocked:** Stage 9 (SQL / `dbo.Company`, `dbo.Conformity`, `dbo.Master_DATA_CP1`) — real SQL Server instance identified (`TERGOS-MFILES01\SQLEXPRESS`, Windows auth, domain `TERGOSCONSTRN`), `MfilesData` confirmed to exist there, but its tables have not yet been introspected. Waiting on the operator's resume signal ("Ankor") to run `INFORMATION_SCHEMA.COLUMNS` against the real schema before designing entities.

**New, distinct from the Stage 9 blocker above — do not conflate the two:** a local SQL dev environment is now live on this machine (`DESKTOP-DKCS42P`) — a fresh `MfilesData` database created locally, and Conformity's six object-type External Database Connections (Approver, Company, Conformity, CP1, Document, Vendor) repointed from `TERGOS-MFILES01\SQLEXPRESS` to this local server, connection tests passing. This does NOT resolve Stage 9: Stage 9 is specifically about introspecting the real *production* schema on `TERGOS-MFILES01\SQLEXPRESS`, still waiting on the operator's resume signal. The local `DESKTOP-DKCS42P` database is a separate dev/test target and is not a substitute for reading the real production schema. Also, despite this local setup and available test invoices, end-to-end routing Scenarios A/B/C are still blocked by programmatic object-creation marshaling (`CreateNewSFDObject`) and therefore remain unproven.

Next after Stage 9 unblocks: V1.5 workflow simulation.

**Done (2026-08-19):** M-Files Flow gained real transition deletion (edge right-click), cascade delete matching BPMN Standard's own confirmed real behavior (Studio's table keeps its original blocking guard, unchanged, via an opt-in `{cascade:true}` param — not a default flip), a floating multi-select toolbar (built fresh, not a React Flow port), edge-endpoint reconnect/attach-detach (also built fresh — checked BPMN's real `reconnectEdge`, confirmed React-Flow-only, no Mermaid equivalent), a palette rebuilt on BPMN's search/category/rail shell (hard exclusion held: still no placeable Gateway/Diamond/Hub tile anywhere), a fix for the last-workflow-can't-be-deleted gap, and — the most consequential item — **real localStorage persistence**, since nothing in this app saved anything anywhere before today. Also, report-only (nothing built): confirmed Electron can bridge to `ProvisioningAI.Workflow/Translation/` via a small CLI wrapper (no existing entry point, but `PlanFormatter.ToJson` already does the hard part), and measured real latency (~250-300ms fresh-process spawn vs ~0.04-0.1ms in-process `Translate()` — the translator itself is effectively free, the cost is entirely CLR startup). Full detail: progress.md's matching 2026-08-19 entries.

**Done (2026-08-20):** the Electron→Translator bridge scoped-but-not-built above is now built and live: `ProvisioningAI.Workflow.Cli` (new console project, exact-match-verified against §6.1/§6.2), a `workflow:translate` IPC handler/preload bridge, and a permanent 55/45 split-screen in M-Files Flow (`react-resizable-panels` **pinned to 3.0.6**, not the newest 4.x — that major renamed the whole `PanelGroup`/`Panel`/`PanelResizeHandle` API) showing a new `LiveTranslationView.jsx` panel with debounced (~300ms) spawn-per-call (~250ms) live translation, resolving the cadence question below as spawn-per-call, not a persistent warm process. `LiveTranslationView` now has four tabs — **M-Files Diagram** (new, default: an actual rendered SVG schematic, layout/render logic ported from `TranslationPlanRenderer.html`'s own §6.2 reference renderer; no diamonds, ever, matching the Flattened list's own existing rule), Flattened (unchanged, just no longer default), JSON, Validation. Hover-sync (canvas hover → highlight the matching Flattened-view block) also shipped. Also done: a second connector handle (left edge, mirroring the pre-existing right one via a shared `wireConnectHandle(side)` function). A real bug was found and fixed the same day — `MermaidParser.cs` never recognized the `ID : label` declaration line `useMermaid.js` emits, so a freshly-drawn, unconnected state was invisible to every translated view until it had a transition; fixed entirely on the M-Files Flow side (`useMermaid.js` now also emits a bare `state ID` line) without touching the shared/tested parser. A second, separate bug was found and deliberately left unfixed (operator's own call — track separately): a real SVG document-order conflict where a connect-handle can be covered by an edge's own reconnect-handle circle once that side already has a transition, affecting the original right handle equally, not something that day's left-handle addition introduced. Later the same day: a **Decision shortcut palette tile** (new "Shortcuts" category, one click → one state + two outcome states + two transitions, all via existing `addState`/`addTransition` — diamond is still the pre-existing auto-detect, no new placeable shape), plus verification (not new code) that the right-side dashed-automatic-transition rendering works with a real automatic transition and that the hub badge genuinely generalizes past 2 (tested at 4 real inbound sources). The z-order bug above was confirmed **broader** than first described — also reproduced via a *different* element, `.mflow-edge-hit`, not just `.mflow-edge-endpoint`; same root cause, wider blast radius (any handle under any edge's path/hit-area, not just "second use on an already-connected side"). Still later the same day, two more quick pieces: **process groups** (the "subgraph/grouping" feature below, now built after confirming scope with the operator first — a background region + process-name label behind a multi-selected set of states, membership a plain field on each state set through the existing `updateState` call, zero store edits, zero new selection UI — reuses the multi-select mechanism already built) and **transition names** (a separate, purely cosmetic `label` field via the existing `updateTransition` call, added to the edge right-click menu — confirmed with the operator this is distinct from, and doesn't touch, the real `conditions`/grammar field). Full detail: progress.md's six matching 2026-08-20 entries; fast-resume summary: recover.md's matching entry.

**Done (real bug found and fixed, 2026-08-20, same day):** while re-verifying the Fit button via Playwright (operator's own request, after two rounds of non-bugs — a plain-browser-tab "Translator bridge unavailable" message, and separately, stale hot-reload state in a long-running Electron window, both resolved by using the real Electron desktop build rather than a browser tab), a genuine, previously-unknown bug surfaced once test methodology was corrected (moderate live drag, no reload — reload alone already re-fits on mount and masks the bug): a live node drag could send the SVG's viewBox into runaway exponential growth (~420×120 → ~6,459×4,764 units over ~20 mousemove steps for a 650×500-screen-pixel drag), shrinking every node on screen to unreadable slivers. Root-caused via targeted diagnostic logging directly inside `growViewBoxToFit` (`src/components/MFlowCanvas.jsx`): `.mflow-diagram` is `display:flex`, and its SVG child had no `flex-shrink:0` — CSS's default `flex-shrink:1` let the flex container silently clamp the SVG's real rendered width below whatever `style.width` the drag code had just set, with `style.width` itself reading back the requested (wrong) value and no error anywhere. `getScreenCTM()`'s scale was computed from the clamped real size, so `toUserDelta()` divided by a too-small scale, inflating every subsequent drag delta, which grew the viewBox further next frame — a real, confirmed feedback loop, not a one-off glitch. Fix: one CSS line, `flex-shrink:0` on `.mflow-diagram svg` (`src/App.jsx`). Verified fixed with real Playwright evidence (before/after screenshots, moderate live drag, no reload) plus a full regression pass (both connector handles, decision tile, dashed-automatic rendering, hub badge, process groups, transition labels, edge deletion/bulk delete, all 4 tabs) — zero console errors, zero side effects. Distinct from, and unrelated to, the two non-bugs from earlier the same day. Full root-cause narrative and evidence: progress.md's matching 2026-08-20 entry; general lesson: skills.md's matching skill entry.

**Done (real bug found and fixed, follow-up session):** re-investigating the M-Files Diagram tab's dashed-automatic-transition rendering (per an operator request to check the real code path, not assume it's wired up) found the simple case already worked, but surfaced a genuine second bug specific to Gateway/hub-participating transitions: the hub declaration (`gw_i : Gateway ...` in `useMermaid.js`) never emitted the companion bare `state gw_i` line the same 2026-08-20 fix above added for ordinary states — meaning `MermaidParser.cs` never registered the hub as a real state once any other state used explicit declarations, so `gw_i` silently vanished from the translated plan's own State list and **every edge touching a hub was dropped from the M-Files Diagram tab entirely**, not just rendered solid. A second, related issue: the automatic-transition condition was attached to the hub's shared outgoing edge instead of each source's own incoming leg — wrong regardless, since a shared outgoing edge can be reached by multiple sources with different conditions. Both fixed in `useMermaid.js` (add the missing `state gw_i` line; move the label onto the incoming leg). Verified live: a hub-feeding automatic transition (`Draft --[after(3d)]--> Closed` via a shared Gateway) now appears in the translated plan and renders visibly dashed with its label, confirmed via screenshot; the simple non-hub case re-confirmed unaffected; full regression pass (handles, Decision tile, hub badge at 3+ inbound, process groups, all 4 tabs, BPMN Standard) came back clean, zero console errors.

**Decision (same follow-up session):** immediately after, the operator explicitly requested reversing the M-Files Diagram tab's solid/dashed rule entirely — every transition now renders dashed on that tab regardless of `TriggerMode`, confirmed via AskUserQuestion before implementing (ruled out "just a bug report" as the intent). `LiveTranslationView.jsx`'s `isAutomatic` conditional was removed; `strokeDasharray` is now a hardcoded `'7,5'` for every edge. **Left/authoring canvas is unaffected** — it was already uniformly solid with no per-transition distinction, unchanged. **JSON/Flattened/Validation tabs are unaffected** — `TriggerMode` values in the translated plan are still computed and displayed correctly (confirmed live: a manual and an automatic transition in the same JSON output still show `"Manual"`/`"AutomaticCriteria"` correctly); only the M-Files Diagram tab's *rendering* stopped reading that field for stroke style. Verified via screenshot: every edge on the right panel now dashed, left panel still all solid. Regression pass (handles, process groups, Flattened/Validation tabs, BPMN Standard) clean, zero console errors.

**Done (end-of-day rollup, 2026-08-20):** cross-checked a full end-of-day summary against the actual codebase rather than writing it up from an assumed list — four of the originally-reported items didn't match the real code and are recorded as open questions, not silently written up as done (see progress.md's "End-of-day summary and rollup" entry for the full breakdown). **Confirmed real, this session or earlier today:** the split-screen live translator/CLI bridge/resizable panels; the hub-feeding-automatic-transition bug fix (two entries above); the Decision shortcut tile (+3 states/+2 transitions verified); the hub badge at 3+ inbound; the left-edge connector handle; edge deletion/cascade delete/floating multi-select toolbar; the palette's search+category restructure; process-group background/labeling; the M-Files Diagram tab as default; and the solid/dashed rule's confirm-then-override sequence (two entries above). **Reported but NOT found in the current code:** a non-clickable diamond/plain palette legend (§2.4 already documents this as deferred pending the diamond-treatment decision — still true, never built); a Validation-tab "Clear action" (no such control exists in `LiveTranslationView.jsx`); Bezier-curve connectors "matching real M-Files Admin" (only the pre-existing back-edge routing uses a curve; ordinary edges are still straight lines, no M-Files Admin comparison found in code or comments); and Studio's nav entry being hidden (`sections.js` still shows `id: 'studio', enabled: true`, visible in every screenshot taken this session). These four are open questions for a follow-up session to resolve, not corrections to make now.

**Decision (2026-08-21): React Flow Pro workflow designer — full 17-example inventory and locked v1 architecture, not yet built.** A systematic pass over all 17 downloaded Pro example bundles in `React_Flow_Pro/` (distinct from, and broader than, the ad hoc single-example borrowing behind the BPMN Standard canvas above) produced an inventory, a feature matrix cross-checked against the live `reactflow.dev/examples` index, and a locked target architecture. Full detail, per-feature source picks, and the complete feature-source table: progress.md's matching 2026-08-21 entry.

**Scope clarified, same day (Phase 0 check before porting): this is a swap of the Process Docs tab's canvas internals, not a new tab or a green-field project.** The tab itself — `id: 'bpmn'`, label "Process Docs," its position in the nav (Studio | M-Files Flow | Process Docs | Discovery | Docs | Copilot), its route, `sections.js`'s registry entry — stays exactly as-is, untouched. Only what `AppShell.jsx` mounts for it (`BpmnCanvas.jsx` and its component tree) gets replaced/refactored. Confirmed a clean, isolated swap: `BpmnCanvas.jsx`/`useBpmnStore.js`/`src/components/bpmn/*`/`src/utils/{bpmnAutoLayout,bpmnModdle,bpmnPools,bpmnHelperLines}.js` share zero imports, code, or data with Studio's `CommandCenter.jsx`/`useWorkflowStore.js` or M-Files Flow's `MFlowCanvas.jsx` (grepped directly — the only cross-references anywhere are UX-decision comments, never actual imports); Discovery/Docs/Copilot are still gated placeholders. No coordination needed with any of those.

**Phase 0 also found the existing Process Docs implementation is materially more built than a fresh port would assume — reuse it where it's already correct, don't re-port it:**

- Already on `@xyflow/react@12.11.3` (matches this architecture's target package exactly; the unused `react-flow-renderer@10.3.17` legacy v11 dependency in `package.json` remains dead weight, confirmed zero imports, unrelated to this swap).
- Undo/Redo (`useBpmnStore.js`'s snapshot-based `takeSnapshot`/`undo`/`redo`/`history`) and Auto-arrange (`src/utils/bpmnAutoLayout.js`, dagre-based) are **real, working ports already**, adapted from `17_undo-redo` and `01_auto-layout` respectively (confirmed via this codebase's own citing comments) — not stubs. **These get relocated/refactored into `features/history/` and `features/layout/` respectively and converted into the locked slice pattern, not re-ported from the zip a second time.**
- Export BPMN / Import (`src/utils/bpmnModdle.js`, real `bpmn-moddle`-backed schema-validated XML read/write) has no relationship to any of the 17 examples — **relocates as-is into a new `features/bpmn-io/` folder, no rewrite, just moved and rewired to the new store shape once it exists.**
- **`useBpmnStore.js` becomes THE single store this architecture's state-management decision describes — refactored in place into one slice per feature area as each feature is relocated or ported, not stood up as a second parallel store.** The "single Zustand store, one slice per feature area" bullet below now means this store, specifically, not a fresh `store/index.ts` built from nothing.
- **No persistence exists today** — confirmed: `useBpmnStore.js`'s `nodes`/`edges` are a hardcoded starter sketch (`initialNodes`/`initialEdges`, the visible Start → Receive invoice → valid/invalid-branch → End example), no localStorage, no persist middleware, a page reload always resets to that same static starter. There is no saved user data to migrate — only the starter sketch's content itself needs re-seeding as the new store's default. **This is why save/load moves up in porting priority (see revised order below) rather than landing late: it's Process Docs' single biggest real gap today, not a nice-to-have.**
- **Caught at the start of actual porting, 2026-08-21 (same day): `BpmnPalette.jsx` is ALSO a real, working port already, not a stub.** Its own comment states it's adapted from 16_shapes' `sidebar-item.tsx`/`App.tsx` drag-drop pattern — and it's already more built than 16_shapes itself (categorized Events/Activities/Gateways/Connectors/Containers sections, search, hover-expand with pin, both drag-and-drop and click-to-add), wired into `BpmnCanvas.jsx`'s `onDrop`/`onDragOver`. Same treatment as Undo/Redo and Auto-arrange: **relocate/refactor into `features/palette/`, converting its local `useState` (search) into the slice pattern — do not re-port from the zip.** Confirmed with the operator via AskUserQuestion before proceeding, rather than silently rebuilding a worse version from `16_shapes`' bare sidebar item.

**Full re-audit, 2026-08-21 (same day, before any code was written): checking node types against the codebase caught yet another "new" item that was already real (`GatewayNode`/`TaskNode`/`EventNode`/`PoolNode`, all wired into `BpmnCanvas.jsx`'s `nodeTypes`) — the fourth in a row after palette, undo/redo, and auto-layout.** Rather than keep catching this one item at a time, did one complete pass checking every remaining architecture feature against the actual current code before writing anything. Result: **10 of the 14 architecture features already exist and are real** (palette, nodes, undo/redo, auto-layout, export/import, minimap, toolbar, grouping, helper lines, and the base edge type/connector-style switching in `FlowEdge.jsx`) — only relocation into `features/` + conversion to the slice pattern is needed, no new capability. **Only 4 things are genuinely new work:** save/load (confirmed, no persistence exists anywhere); two *additional* edge types layered onto the existing `FlowEdge` (05's draggable control points, 10's libavoid WASM routing — neither exists in any form today); collaboration; server-image export.

**Final porting order (supersedes both prior orderings above), confirmed with the operator via AskUserQuestion — refactor the 10 existing real features into the slice architecture first, THEN build save/load against the final store shape (avoids wiring save/load twice against a store that's about to change shape):**

*Phase A — relocate existing real features into `features/`, converting each into the locked slice pattern (no new capability):*

1. Palette (`BpmnPalette.jsx` → `features/palette/`)
2. Custom node types (`GatewayNode`/`TaskNode`/`EventNode`/`PoolNode` → `features/nodes/`)
3. Base edge type + connector style (`FlowEdge.jsx` → `features/edges/`)
4. Minimap → `features/minimap/`
5. Toolbar (`SelectedNodesToolbar.jsx` + `NodeToolbar`) → `features/toolbar/`
6. Grouping/Pool (`bpmnPools.js`) → `features/grouping/`
7. Helper lines (`bpmnHelperLines.js`/`HelperLines.jsx`) → `features/helper-lines/`
8. Undo/redo → `features/history/`
9. Auto-arrange (`bpmnAutoLayout.js`) → `features/layout/`
10. Export/Import BPMN (`bpmnModdle.js`) → `features/bpmn-io/`
    (`useBpmnStore.js` is refactored progressively across steps 1–10, finishing into the single composed store once the last one lands)

*Phase B — genuinely new work, built against the finished store shape:*
11. Save/load (`features/save-load/`) — now Process Docs' confirmed biggest gap, built once the refactor is done rather than mid-refactor
12. Two additional edge types layered into `features/edges/`: 05's draggable-control-point editable edge, 10's libavoid WASM obstacle-routing edge (additions alongside the existing real `FlowEdge`, not replacements)
13. Collaboration (`features/collaboration/`) — v1 feature, gated on standing up a y-websocket server first
14. Server-image export (`features/export-image/`) — v1 feature, gated on standing up the Express+Puppeteer service first

**General lesson, applies beyond this specific list — now a standing rule, not just an observation: see §3.1's "Assume existing until verified."** Three rounds of checking within this porting effort alone (toolbar in Phase 0, palette at the start of porting, then this full audit) each caught something the previous pass had assumed needed a fresh port; three more rounds since (minimap, toolbar again, and Electron itself) confirmed this isn't a one-architecture quirk — it recurs across completely unrelated parts of the project.

**Re-seed requirement:** the existing 6-node invoice starter sketch (Start → Receive invoice → Route to approver/Return to vendor → End, currently `useBpmnStore.js`'s `initialNodes`/`initialEdges`) becomes the refactored store's default/example content, so Process Docs doesn't open empty on first load post-swap.

Other locked decisions, unchanged from the original pass:

- **React version:** 18 project-wide. `02_collaborative`'s `useOptimistic` (React 19-only, confirmed load-bearing in `CheckboxNode.tsx`/`TextNode.tsx`) gets rewritten to `useState` + manual rollback-on-reject during that feature's port, rather than pulling React 19 into the project or silently downgrading the behavior.
- **Save/load:** built fresh from reactflow.dev's own free "Save and Restore" pattern (`toObject()`/`setNodes`+`setEdges`), JSON file export/import, no database — no coverage in any of the 17 (confirmed via grep — zero hits for `toObject()`, `localStorage`, or `JSON.stringify` of nodes/edges across all 17 projects).
- **Edge types:** three selectable edge types in the registry, not one "winner" — `04_dynamic-layouting`'s simple PlaceholderEdge/WorkflowEdge pair (default), `05_editable-edge`'s draggable-control-point editable edge, and `10_libavoid-edge-routing`'s WASM-based obstacle-avoiding libavoid edge. Confirmed: `10_libavoid` needs NO special bundler plugin — Vite's native `?url` asset-import suffix resolves the ~528KB `.wasm` binary to a URL at build time, and `AvoidLib.load(url)` does the async init at runtime. Only real requirements: copy the `.wasm` binary into the target project's assets, and gate the libavoid edge type behind that async init completing (it's the only edge type with an async-init gate; the other two are synchronous).
- **Collaboration & server-image-export infrastructure:** `02_collaborative` needs a running y-websocket server; `15_server-side-image-creation` needs a running Express+Puppeteer service. Both are v1 features — explicit selling points against Cacoo — not optional extras. Base app is not expected to run without them once v1 ships. This reverses progress.md's own 2026-08-14 "Deferred/rejected tracker" entries for collaboration, libavoid routing, and server-side image export; the reversal is recorded explicitly there per that tracker's own "do-not-reopen-silently" instruction, not applied quietly.

Target folder structure (feature-based, not type-based) — lives inside the existing Process Docs component tree, replacing `BpmnCanvas.jsx`'s internals; tab/route/nav registration in `sections.js`/`AppShell.jsx` is untouched:

```
src/
  app/                        BpmnCanvas.jsx (kept as the mount point) — ReactFlow canvas shell, ReactFlowProvider, panel layout
  store/                      useBpmnStore.js, refactored in place — single Zustand store composing every feature slice
  features/
    palette/                  relocated/refactored from: existing BpmnPalette.jsx (already a 16_shapes port) — not re-ported
    nodes/                    relocated/refactored from: existing GatewayNode/TaskNode/EventNode/PoolNode.jsx — not re-ported
    edges/                    base: relocated/refactored from existing FlowEdge.jsx (connector-style switching, not from any of the 17)
                               plus two NEW additions layered in: 05_editable-edge (draggable control points), 10_libavoid-edge-routing (WASM obstacle routing)
                               all selectable via edgeTypes.ts registry, not one default baked in
    minimap/                  relocated/refactored from: existing <MiniMap nodeColor=.../> usage in BpmnCanvas.jsx — not re-ported
    toolbar/                  relocated/refactored from: existing SelectedNodesToolbar.jsx + inline NodeToolbar — not re-ported
    grouping/                 relocated/refactored from: existing bpmnPools.js / groupSelectedIntoPool (Pool) — not re-ported
    helper-lines/             relocated/refactored from: existing bpmnHelperLines.js / HelperLines.jsx — not re-ported
    layout/                   relocated/refactored from: existing bpmnAutoLayout.js (originally ported from 01_auto-layout) — not re-ported
    history/                  relocated/refactored from: existing useBpmnStore.js undo/redo (originally ported from 17_undo-redo) — not re-ported
    bpmn-io/                  relocated as-is from: existing bpmnModdle.js (real bpmn-moddle Export/Import) — unrelated to the 17 examples, no rewrite
    save-load/                NEW, official pattern (reactflow.dev "Save and Restore") — built in Phase B, against the finished store shape, not mid-refactor
    collaboration/            NEW, from: 02_collaborative — v1 feature; requires a running y-websocket server
    export-image/             NEW, from: 15_server-side-image-creation — v1 feature; requires the Express+Puppeteer service
```

**Done (2026-08-22, resume session):** `05_editable-edge` and `10_libavoid-edge-routing` added as two new selectable edge types (`features/edges/EditableEdge/`, `features/edges/RoutableEdge.tsx` + `useLibavoid.ts`) alongside the existing `FlowEdge` default — a real new dependency, `libavoid-js@0.4.5`, plus its `.wasm` binary, were added for this (confirmed the version pinned in the Pro example's own bundled `.wasm` did NOT match the npm package's own bundled `.wasm` — different byte sizes/hashes — swapped to the one shipped with the installed package, which fixed a silent-forever-hang in `AvoidLib.load()`). Minimap (`features/minimap/`) then relocated the existing `<MiniMap nodeColor=...>` usage and added a new custom `MinimapNode.tsx` shape renderer (ported from `16_shapes-pro-example`, the only Pro example with one) so all four BPMN node types are shape-distinguished in the minimap, not just color-distinguished. Toolbar (`features/toolbar/`) relocated both `SelectedNodesToolbar.jsx` and the inline per-node `<NodeToolbar>` (extracted into `NodeInspectorToolbar.jsx`, with a new `toolbarSlice.js` for its cross-component-reachable visibility state) — a real, self-inflicted `ReferenceError` crash during that edit (a dropped variable declaration) took the whole Process Docs tab blank with zero console/page-error output; only found via attaching Chrome DevTools Protocol's `Runtime` domain directly. Electron (already fully wrapped — `electron/main.cjs`/`preload.cjs`, working `electron:dev`/`electron-builder` — verified live, not rebuilt) confirmed `libavoid.wasm` and RoutableEdge's obstacle avoidance both work correctly in Electron's renderer, and surfaced one real finding: Save/BPMN-Export's Blob-based download never completed to disk in Electron even though the app's own success toast fired. Operator chose to fix it immediately — `saveToFile`/`exportBpmnFile` (`saveLoadSlice.js`/`bpmnIoSlice.js`) now route through the existing `window.file.save()` IPC path (already proven by Studio's SOW export) when present, falling back to the original Blob approach in the browser unchanged; re-verified live in both environments post-fix (real files confirmed written to disk in Electron via a stubbed-native-dialog test, browser path re-confirmed unregressed). See progress.md's matching 2026-08-22 entries for full evidence both before and after the fix.

**Done (2026-08-22, same session, after committing the above):** `BpmnPalette`'s Connectors group gained an edge-type picker — new connections now default to whichever of Default/Editable/Routable is currently selected there, rather than always starting as `flowEdge` and needing a right-click afterward to become anything else. `onConnect` (`edgesSlice.js`) stamps the connection with the picker's value *at connect time*; `defaultEdgeOptions.type` was deliberately left untouched (confirmed from `@xyflow/react`'s own source that it applies to *every* untyped edge on *every* render, not just new ones — making it dynamic would have retroactively reclassified the starter sketch and anything ever imported). UI redesigned mid-task per direct operator feedback into labeled option cards with per-type color swatches (matching each type's real on-canvas default color) rather than the existing terse icon-only segmented control. Along the way, found and fixed a real synthetic-test-harness gotcha (not an app bug): a connection-drag test that computes the target's `getBoundingClientRect()` once before dragging can miss the target after layout settles, silently triggering the app's own pre-existing "drop on empty canvas → create a Task" fallback instead of connecting — fixed in the test by re-querying the target's position on every drag step. **Not yet done:** the remaining Phase A items (grouping, helper lines) plus Phase B's collaboration/server-image-export.

### 2.4 Unresolved — do not silently decide these

- **All of today's M-Files Flow work (2026-08-19 AND 2026-08-20) is uncommitted.** `App.jsx`, `ContextTabStrip.jsx`, `MFlowCanvas.jsx`, `MFlowPalette.jsx`, `useMermaid.js`, `electron/main.cjs`, `electron/preload.cjs`, `package.json`/`package-lock.json`, `provisioningai-backend/ProvisioningAI.sln` all sit as working-tree changes; `LiveTranslationView.jsx` and `provisioningai-backend/ProvisioningAI.Workflow.Cli/` are new, untracked. `useWorkflowStore.js`'s own working-tree diff predates both these sessions (last real commit 2026-08-16) — no session since has edited it, only called its existing exported actions (including, on 2026-08-20, via a localStorage-injection test technique that writes the same data shape those actions already produce — see skills.md). Don't assume any of this is shipped the way the 2026-08-16 session's commit-and-push close was.
- **Which diamond rendering treatment is real is not decided.** What's live today is full shape-replacement (a branching state's `<rect>` becomes a `<polygon>`). A design mockup (`decision_marker_side_tab.png`, project root, untracked) proposes two alternatives — a side-tab diamond outside the state's edge, or a corner badge inside it — neither built. A separate task (a non-clickable palette legend illustrating diamond-vs-plain states) is explicitly held pending this decision, per its own instruction not to build against a shape about to change.
- **SUPERSEDED (2026-08-20):** the M-Files View tab (Electron→Translator bridge) cadence question below is resolved — the split-screen was built with debounced spawn-per-call (~300ms debounce, ~250ms spawn), not a persistent warm process; that decision, and the tab, both now exist and are live-verified. See §2.3's 2026-08-20 entry. Original text kept for the record: ~~Recompute-on-open is trivially fine either way; genuinely live/debounced updates need a persistent warm process, not spawn-per-call — a real scope fork, not a default to pick silently. See progress.md's 2026-08-19 "Electron → Translator bridge" entry for the measured numbers behind this.~~
- **A real, pre-existing SVG z-order bug between a state's connect-handle and an edge's own overlay elements, found 2026-08-20 while adding the left-edge connector handle, scope confirmed broader the same day.** Confirmed precisely via `document.elementFromPoint` — a connect-handle can be covered by *either* an edge's `.mflow-edge-endpoint` reconnect circle (first found) *or* its `.mflow-edge-hit` right-click stroke (found independently later the same day) — both are appended directly to the top-level `<svg>`, always later in document order than a connect-handle nested inside its node's own early-positioned `<g>` (see skills.md's matching entry for the general SVG-stacking lesson). Affects the original right handle identically, not something the left-handle addition introduced. Broader than first characterized: any connect-handle whose screen position happens to fall under *any* rendered edge's path or hit-area is affected, not just "a handle's second use once that exact side has an edge." No functional damage — a swallowed drag is a clean no-op, recoverable by repositioning and retrying. **Operator's explicit call: track separately, do not fix as a side effect of an unrelated task.**
- **SUPERSEDED (2026-08-20):** the "subgraph/grouping" feature described below as deferred/not-started was built later the same day — see §2.3's process-groups entry, re-confirmed again in the end-of-day rollup. Original text kept for the record: ~~The "subgraph/grouping" feature (highlighting/labeling a background region covering a related set of states/transitions/nodes with a process name) is explicitly deferred to its own future task, not started — flagged when the 2026-08-20 Decision/dash/hub batch closed, per the operator's own instruction not to fold it into that batch.~~
- **Next session's plan: build complex, multi-diamond scenarios on the left authoring canvas.** Everything verified so far — including both real bugs found today — used simple, minimal examples (one diamond, one hub, a handful of states). Next session should deliberately construct a more complex workflow directly on the left canvas: several branching (diamond) states, a mix of manual and automatic transitions, and at least one hub with 3+ inbound sources, all in the same diagram — to stress-test whether the translator and the M-Files Diagram rendering hold up under real complexity rather than the isolated cases exercised individually until now. This is the first thing to pick up on resume; see recover.md.

- **Studio writes to M-Files.** The PRD scopes V1 as read-only with writes gated behind plan-then-apply. The code and the spec disagree. Do not change the push path to "fix" this; raise it.
- **GUID stability across vault clones is CONFIRMED (copy path).** A read-only probe verified that Property Definitions, Value Lists, and Object Types retain their GUIDs across a vault clone. Restore-path comparison is not testable on the current setup — the attached vaults (Conformity_CP1_Tergos, Approbation_Acomba-Construction) are independent new-identity restores with no lineage sibling to compare against. RESOLVED BY DECISION: scanner keys GUID-first and retains the name-based fallback (per §4.1) rather than collapsing to GUID-only. No probe required.
- **Second COM path.** Studio's existing push/pull still reaches COM via PowerShell scripts spawned from Electron (`scripts/*.ps1`), not through `ProvisioningAI.MFilesConnectors`. That's now a fully separate connector with its own auth implementation, more capable than Studio's path (per-vault login included). Migration is planned, not done — don't touch Studio's push/pull to "fix" this.
- **Frontend's default vault GUID is wrong.** The GUID hardcoded in Studio/scripts (`{E7E445BE-3AEF-425F-9D4D-BFCC33008C9E}`) is a vault named "acme," not "Conformity" — confirmed via M-Files Admin and `GetOnlineVaults()`. It's a test-only vault; update the default once a real production vault exists, not before.
- **Second per-vault-named database found alongside MfilesData** (Approbation_Acomba-Construction, live, TERGOS-MFILES01\SQLEXPRESS). Not yet inspected. May mean the SQL tier is partially per-vault after all, contradicting §4.4's "shared, not per-vault" model — or may be unrelated (e.g. a separate reporting/staging DB). Do not assume either way until its tables are actually opened.
- **`Company_Endpoint`/`Company_Token` properties found on Approbation (vault-side, Firebird, Stage 3).** Names match §4.4's SQL-tier-2 naming convention (`Connecteur_Endpoint_*`, `Token_*`) almost exactly, but these are vault properties, not SQL rows. Deliberately left open — not concluded as duplication, migration, or a genuine dual-tier reality. Stage 9 (SQL, blocked — see §2.3) is needed to see the other half before drawing any conclusion.
- **A custom application named `ConformityVaultApplication` is installed on BOTH Conformity and Approbation** (same `ApplicationId` GUID `{5FD4F383-1867-40BC-A9BD-7629DFCEA0D8}`, different versions — 3.3.0 on Conformity, 3.2.3 on Approbation; confirmed against the persisted DB, not assumed). Reads as a generically-named module shipped to every vault deployment rather than evidence of live cross-vault wiring. **PARTIALLY SUPERSEDED for Conformity's copy (2026-08-01):** its Configuration content is no longer unreachable — §4.4.2's boundary reversal (see below) means it's now fully read. What it actually does on Conformity is documented in progress.md's master 47-state table and skills.md (vendor-list CSV export, direct workflow-state assignment on two triggers, vendor-field text cleanup, a scheduled zero-retention purge, and ~24 other config sections present in the schema but unused). Reading it revealed vendor/company-specific bindings, not evidence of a live cross-vault call to Approbation — the cross-vault-wiring question itself remains open. **Approbation's own copy of this app is still unread** — out of scope for this pass, do not assume it matches Conformity's configuration just because the assembly is the same.
- **`DestroyDeletedObjects` (ConformityVaultApplication config, confirmed live 2026-08-01) runs a zero-retention purge** — `Enabled: true`, `NumberOfDaysToKeep: 0`, three daily triggers (06:00, 12:00, 11:59), scoped to `CL.Invoices`/`CL.Trash`/`OT.Vendor`. Needs the operator's direct confirmation this is intentional — not verifiable independently from Configuration-node data alone. Do not silently assume it's safe or a misconfiguration either way.
- **Approbation-phase entry point (2026-08-02, folded into Connection II 2026-08-04 via Philippe's training + Admin config review — see §4.7):** the cross-vault handoff reaches Approbation's vault boundary but the object never appeared there and `ToolsBoxQueryDone` never got set, confirmed empty on every test object checked (5427, 5428, 5429, 5430). **This is no longer a separate later phase or an open "unknown receiving-side cause" investigation.** It was previously scoped as Connection IV, a standalone phase after Connection II; it is now retired as a standalone phase and folded directly into Connection II (progress.md/skills.md's Connection roadmap), whose corrected goal is a full end-to-end programmatic run — intake through successful landing in Approbation — since that goal cannot succeed without the handoff completing. The task itself is a defined config-write procedure, not a bug hunt: read the target Approbation-equivalent vault's 5 destination GUIDs — `VaultGuid`, `ObjectGuid`, `ClassGuid`, `Workflow`, `WorkflowState`, all live together in `MoveToApproval`'s own `MoveObjectSettings` block — write them into Conformity's `MoveToApproval` config via the proven `SetNamedValues` NVS mechanism (§4.5), reload via a full `MFServer` restart, then verify the 14 destination property aliases (§4.4.3; the confirmed `PD.Noprojet`→`PD.Projetno` rename included) resolve against the target vault's own structure. This is Connection I's proven config-write mechanism applied to the destination coordinates, not a new mechanism. `WorkflowState` resolves, confirmed live against `provisioning.db`, to Approbation's `START` state (`{C9B5E231-...}`, `IsInitial=1`) — the entry point where the moved object lands in the destination workflow. Easy to overlook among the 5 GUIDs but essential: get it wrong and the object either fails the move or lands at the wrong point in Approbation's approval workflow. A recurring "Vault application not found (ID: {224668EF-...})" pattern in the Windows Application log was investigated as a candidate cause and found to be an unrelated, pre-existing background pattern (recurs independently of any test in this project, and also flags GUIDs of applications confirmed installed) — do NOT treat it as the confirmed blocker without new evidence directly tying it to the `MoveObject` task itself; see skills.md's "Open observation" entry (2026-08-02). Full model in skills.md's "Connection II's handoff-completion requirement" entry (2026-08-04). **SUPERSEDED framing (2026-08-06):** this bullet still correctly describes the GUID/alias config-write procedure, but that procedure is no longer the presumed remaining blocker. Root-caused: Vault Toolbox's task processor cannot authenticate to the vault at all (confirmed live, `IVaultApplicationTaskOperations`/`GetTasks`, `Authentication failed. (0x8004001A)`) — it fails before acting on ANY config, correct or not, for any task type. Writing/verifying the 5 GUIDs and 14 aliases described in this bullet remains necessary but is no longer sufficient by itself and is not the active blocker; the authentication failure is. See §2.3's 2026-08-06 milestone entry, progress.md's Connection roadmap, and skills.md's matching skill entry.

---

## 3. Agent Behavioral Guidelines & The Sweeper Protocol

These bias toward caution over speed. For trivial tasks, use judgment.

### 3.1 Think before coding

Don't assume. Don't hide confusion. Surface tradeoffs.

- State assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them — don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.
- **Assume existing until verified.** Before treating any requested work as green-field, check whether it already exists in the actual current code/config — not from memory, not from how the request was phrased. This has been wrong **six separate times** in this project alone, each independently: toolbar (Phase 0 audit), palette (start of the 2026-08-21 porting effort), a full re-audit of the remaining "new" items (same session), minimap (2026-08-22 resume), toolbar again — a second, later request that repeated the exact same false premise the Phase 0 audit had already corrected (2026-08-22), and Electron itself — a request to "wrap the app in Electron" when `electron/main.cjs`/`preload.cjs` and a working `electron:dev`/`electron-builder` setup already existed and had already been used for real testing (2026-08-22). The task description being confident that something is new is not evidence that it is. Grep/read the actual tree first; if real working code is found, the task becomes relocation/verification, not a fresh build — and don't rebuild working infrastructure (e.g. swapping a proven Electron setup for `electron-vite`) just because the request assumed there was nothing to keep.

### 3.2 Simplicity first

Minimum code that solves the problem. Nothing speculative.

- No features beyond what was asked.
- No abstractions for single-use code.
- No flexibility or configurability that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.
- Ask: *would a senior engineer call this overcomplicated?* If yes, simplify.

### 3.3 Surgical changes

Touch only what you must. Clean up only your own mess.

- Don't improve adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it — don't delete it.

**The Sweeper Protocol** — when your changes create orphans:

- Remove imports, variables, or functions that *your* changes made unused.
- Never leave commented-out code in final output. If it's not needed, delete it.
- Never leave the application broken. All functions properly called or exported.
- Don't remove pre-existing dead code unless asked.

**The test:** every changed line traces directly to the request.

### 3.4 Goal-driven execution

Transform tasks into verifiable goals:

- "Add validation" → "write tests for invalid inputs, then make them pass"
- "Fix the bug" → "write a test that reproduces it, then make it pass"
- "Refactor X" → "ensure tests pass before and after"

For multi-step tasks, state a brief plan as `[step] → verify: [check]`. Strong criteria let you loop independently; weak criteria ("make it work") require constant clarification.

### 3.5 Commenting style

Write comments as a thoughtful human developer would. Explain *why*, not *what*. Conversational, professional. Never "As an AI," "This code block does," or "Here is the implementation."

Good:

```
// Fresh server object on fallback — reusing the failed instance leaves stale COM state.
// NVS keys are case-sensitive; preserve the VAF's exact casing or the lookup misses.
// TODO: revisit once GUID stability across vault clones is confirmed.
```

### 3.6 Commit discipline

Small, sequential commits. Each one builds and passes tests. Do not batch a multi-step refactor into a single diff — especially not one touching Studio.

---

## 4. Architectural Rules & M-Files Domain Knowledge

### 4.1 Identity: GUID first, name as label, never a bare ID

**Never hardcode numeric IDs.** Property IDs and value list IDs shift between vault clones. A hardcoded ID silently writes to the wrong field — overwriting `Customer_Name` instead of `Department_Code` — with no error.

**GUID is identity.** Vaults, property definitions, value lists, classes, and workflows are keyed on GUID. Entity keys are `(vault_guid, guid)`.

**Name is a mutable display label.** Refresh it on every scan. Never use a vault name as an identifier — names differ between environments and get reused.

**Record all three** — GUID, name, and numeric ID — in the mapping template. GUID for lookup, name for human review, ID for diagnostics only.

Resolution order when writing to a vault: GUID → name, with a GUID mismatch on the name-based fallback treated as an error, not a warning. See §2.4 — GUID lookup support is unconfirmed; until it's tested, write the resolution layer so either strategy can be selected.

### 4.2 Vault scoping

Every entity table carries `vault_guid`. This holds even while only Conformity is connected — adding a tenancy column to populated tables and every query later is far more expensive than having it from the start.

Discovery **enumerates** vaults rather than being told which to scan: connect to the server, call `GetOnlineVaults()`, return name and GUID for each, let the operator choose.

### 4.3 COM connectivity

**One COM path, in C#.** All M-Files access goes through `ProvisioningAI.MFilesConnectors`. Electron reaches it over localhost HTTP (`:5000`), not by owning COM itself.

**Connector I is PowerShell — port the patterns, do not import the code.** `ClientVaultAccessMSIBuilder.ps1` is the reference implementation for:

- The nine-argument `Connect(AuthType, UserName, Password, Domain, ProtocolSequence, NetworkAddress, Endpoint, LocalComputerName, AllowAnonymousConnection)`
- AuthType values: `0` unknown, `1` logged-on Windows user (SSO), `2` specific Windows user, `3` specific M-Files user
- SSO-first with one retry after 10s, then fallback to AuthType 3 **on a fresh `MFilesServerApplication`** — never reuse the failed instance
- `Close-ComObjectSafe` release discipline

**No COM type may be referenced outside the connectors project.** Everything downstream depends on `IMFilesConnector`, which is what makes the scanner, the API layer, and their tests mockable.

**Per-vault login is a separate step from the server connect**, confirmed live against Conformity: `LogInAsUserToVault(vaultGuid, null, authType, username, password, null)`, called on the same already-connected `MFilesServerApplication`, reusing whichever identity (SSO or credential fallback) the server connect actually used — don't re-run the SSO-fallback cascade a second time for the vault login. Logout is `LogOutSilent()`. The logged-in `Vault` object's own `.GUID` property comes back **empty** — track the GUID you logged in with, never read it back from the object. Enumerating a vault (`GetOnlineVaults()`) and being able to log into it are different permission checks — a Windows account can pass one and fail the other (add the account as a Windows user, not an M-Files-type account, under that specific vault in M-Files Admin to fix it).

### 4.4 Discovery precedes provisioning — and reads TWO tiers

Do not write provisioning logic that bypasses the mapping template.
Blind hardcoded provisioning is prohibited.

CRITICAL ARCHITECTURE — the system is two data tiers plus external
systems. Earlier drafts of this file said integration config lives in
vault Named Value Storage read over COM. That is WRONG. Correct model:

  TIER 1 — Firebird vault (MetaData.fdb), one file per vault.
    Holds vault STRUCTURE: object types, classes, property defs, value
    lists, workflows, states, transitions, named ACLs, user groups,
    views, and NVS. Read over COM/REST. GUID-stable across clones
    because a vault copy is a file-level clone of this .fdb.

  TIER 2 — SQL Server integration layer (MfilesData database).
    Shared across BOTH vaults — NOT one instance per vault. Tables:
      dbo.Company    one row per company, keyed by CieCode/Dos.
      dbo.Conformity configuration rows for the Conformity vault.
      dbo.Master_DATA_CP1 and siblings — shared lookup/config data.
    Holds CUSTOMER-SPECIFIC integration config: ERP endpoints and tokens
    (Connecteur_Endpoint_Acomba, Token_Acomba,
    Connecteur_Endpoint_Procore, Token_Procore), plus SERVERNAME,
    SQLDATABASENAME, LOGIN, PASSWORD, URL1/2/3, PREFIX, PARTITIONID.
    Read over SQL (Windows auth). This is the CP1 / Compliance Kit
    layer, NOT the vault. The two vaults are NOT directly wired to each
    other — they interact THROUGH this shared SQL tier. Workflow states
    (UPD_SQL_CP1, UPD_To_CP1, WAIT_SYNCH_CSV, UPD_EXPORT_VENDORLIST,
    UPD_Learning, Contrôle Apprentissage, etc.) are TRIGGERS that
    read/write this shared SQL layer; the SQL tier is the shared state
    both vaults transact against.

  EXTERNAL — Acomba (ERP), Fusion CP1 (OCR), Info Media (cloud broker).
    Reached USING the tier-2 values. Config for these lives in the
    external systems and is NOT discoverable from either tier.

DISCOVERY THEREFORE HAS TWO SOURCES:
  - Structural stages (1-8): per vault, over COM, in dependency order:
    vault identity -> value lists -> property defs -> object types &
    classes -> workflows/states/transitions -> users/groups/ACLs ->
    views -> NVS.
  - SQL stage (9): ONCE, not per-vault. Read MfilesData (dbo.Company,
    dbo.Conformity, dbo.Master_DATA_CP1, siblings) and associate rows
    to both vaults by company. Do NOT scan it once per vault.
    Cross-vault links resolve THROUGH the shared CP1 rows in the index.
  - A final sweep cross-references captured values for sibling-vault
    GUIDs, connection strings, and URLs.

WORKFLOW STATE CLASSIFICATION: workflow states whose names match
  SQL_*, UPD_*_CP1, UPD_To_CP1, WAIT_SYNCH_CSV, UPD_EXPORT_*,
  UPD_Learning, Contrôle Apprentissage (and *_Acomba, *_Procore
  variants) are integration-touching — they trigger reads/writes
  against the shared SQL tier. Also flag learning-loop states
  (Contrôle Apprentissage, UPD_Learning = YES/NO): these sync vendor
  data via CSV through CP1. Record verbatim and flag by prefix/name.
  Do NOT parse or interpret the SQL they invoke.

The mapping template has TWO sections: vault-side (GUID-keyed) and
SQL-side (company-row-keyed). Provisioning (V2) rewrites BOTH, as a
single transaction — vault and SQL must stay consistent or a deployment
silently points at the wrong ERP.

V1 SCOPE: discover and RECORD both tiers. Classify which dbo.Company
columns are customer-specific vs static vs derived. NO WRITES anywhere.
The ERP rewiring itself, and the three connection flavours (Info Media
cloud broker / direct Swagger+Postman endpoint / token-auth endpoint),
are V2 — deferred, but the config must be CATALOGUED in V1 or V2 has
nothing to work from.

STRUCTURE NOT CONTENT: enumerate the vault's shape, never its documents.
Counts are fine; contents are not.

RESUMABLE: persist each stage as it completes. A failure at stage 7
must not cost stages 1-6.

### 4.4.1 Reference: the Conformity AP pipeline (from vendor training doc)

CONTEXT ONLY — narrows interpretation of stage 4/7 output. Does NOT
change discovery scope. Focus remains vault + ERP, per project decision.

PIPELINE (5 systems, Conformity is one stage of it):
  Mail Downloader -> Capture Point/CP1 (OCR+extraction) -> M-Files
  Conformité -> M-Files Approbation -> M-Files Archive.
  Archive may be a FOURTH VAULT, not a workflow state — noted for
  future scope, NOT in scope now (Conformity-only stands).

APPRENTISSAGE = vendor identity resolution, NOT OCR error correction.
Two sub-modes, read verbatim when encountered in stage 4:
  - Vendor learning: bind a unique ID (tax number/phone/email/name)
    from an invoice to a vendor record, once per new vendor, in CP1's
    own web UI (cloud.cp-1.io) — not purely an M-Files action.
  - Field learning: a natural-language extraction prompt for one field
    (e.g. PO Number) when it misreads even with vendor correctly
    identified. DEPENDS ON vendor learning being done first — if a
    workflow guard encodes this dependency, record it verbatim.

Company detection (multi-company projects only) is a THIRD, separate,
keyword-based mechanism, configured by the INTEGRATOR's team in the
CP1 project — NOT customer-editable. If dbo.Company or similar holds
keyword-matching columns, classify them as integrator-config, distinct
from customer-editable and static.

CP1 stores real per-document config as M-FILES PROPERTIES (discoverable
via the normal stage-3 property scan, NOT SQL-only): CP1-VendorID,
CP1-VendorName, CP1-VendorAddress, Lien CP1 (a cloud.cp-1.io URL),
Apprentissage CP1 (Oui/Non).

Structured invoice format (subtotal, taxes, optional freight, total) is
a hard requirement for automated extraction. A vendor whose invoices
don't fit this is CUSTOM DEVELOPMENT SCOPE, not a config variance —
flag distinctly if the mapping template ever needs to represent
onboarding cost.

ACOMBA/INFO MEDIA IS THE EXCEPTION, NOT THE PATTERN. Info Media exists
only because Acomba specifically won't expose an API. The default,
generalizable case is vault -> ERP direct, Swagger/Postman-validated
endpoint, token auth. Do NOT design discovery or provisioning around
a broker as if it were the common path. Record Info Media as a
documented one-vendor exception in the mapping template, not as a
second integration architecture.

### 4.4.2 Stage 8 boundary: per-app Configuration nodes are unreachable (Conformity)

M-Files Admin has a real "Other Applications -> [App] -> Configuration"
screen, confirmed live across 7 installed apps. For SQL Query Vault
Application specifically it shows structured Workflow Configurations
mapping exact workflow states to exact SQL calls (e.g. "Workflow:
Conformity, State: UPD_SQL_CP1, SQL Calls (1)") — this would directly
complete the §4.4 WORKFLOW STATE CLASSIFICATION list with what SQL those
flagged states actually execute. It is NOT extractable by this project:

  COM: confirmed unreachable via exhaustive reflection against
  Interop.MFilesApi.dll — every type name and every method name
  containing "Configuration" checked across the whole assembly. Nothing
  exists for `ICustomApplication`. `GetNamedValues(type, namespace)` has
  no "list namespaces" call; tried every installed app's ID and Name as
  namespace across all 7 `MFNamedValueType` values (56+ combinations)
  live against Conformity — all empty.

  REST: also unreachable, but NOT a fixable environment gap to
  re-check later — this Conformity deployment is STRICTLY CLIENT/SERVER
  BY DESIGN, with IIS/the REST service intentionally not running. REST
  is not a viable path for THIS vault's architecture, full stop.

CONCLUSION: Configuration-node data (SQL Query Vault Application's
workflow-to-SQL mappings, AP Extension Configurator's UI/PreConditions
JSON, Property Calculator's calculation rules, Vault Toolbox's
workflow-action mappings) is visible in M-Files Admin only. A genuine,
final boundary for Conformity's specific deployment — not an open guess
to keep chasing.

MULTI-VAULT SCOPE NOTE: this boundary is deployment-mode-specific, not
universal. If any of the other 8 vaults/ERP deployments run in
web-service mode (IIS/REST enabled) rather than strict client/server,
this boundary may not apply to them. Check per-vault deployment mode
before assuming client/server-only holds across all nine.

**SUPERSEDED 2026-08-01 — VAF Configuration data IS reachable AND
writable via COM after all.** The verdict above was reached by guessing
NVS namespaces (app IDs, app names, function names) — it never tried
the framework's actual storage convention. Decompiling the real
installed VAF assemblies (extracted read-only via
`IVaultCustomApplicationManagementOperations.DownloadCustomApplicationBlockBegin`/
`DownloadCustomApplicationBlock` — no loose `.dll` exists on disk for
any of these apps; M-Files stores installed Custom Application packages
inside the vault's own database, downloadable only through this
documented COM method) found it: every VAF app built on
`MFiles.VAF.Extensions.ConfigurableVaultApplicationBase<T>` stores its
config via `NamedValueStorageOperations.GetNamedValues`/`SetNamedValues`
at `MFNamedValueType.MFSystemAdminConfiguration` (8), namespace
`"{AppRootNamespace}.VaultApplication"`, key `"configuration"`, as
indented JSON. Confirmed live — both read and write reachable — for
all four of Conformity's config-bearing apps:
`ConformityVaultApplication.VaultApplication`,
`Docned.SQL.VaultApplication.VaultApplication` (SQL Query Vault
Application), `Docned.VaultToolbox.VaultApplication` (M-Files Vault
Toolbox), `PropertyCalculator.VaultApplication` (M-Files Property
Calculator).

**A fifth VAF app is also registered on this vault, found 2026-08-06 via
task-queue enumeration, name-only — not yet confirmed config-bearing:**
`Docned.HTTPCaller.VaultApplication` (four task queues registered, all
empty at observation time). Not decompiled, not added to the "four
config-bearing apps" count above pending confirmation it actually stores
NVS config via this same mechanism.

This changes the V2 onboarding-automation floor materially: VAF add-on
config (not just object CRUD and External DB Connection setup, §4.4)
is now a confirmed automatable read/write target via the same
`IMFilesConnector` COM path used everywhere else in this project. See
§4.4.3 below and skills.md ("MAJOR CORRECTION — VAF add-on
Configuration data IS reachable via COM after all") for the full
mechanism, decompile methodology, and per-app config content.
Credentials found in this config stay `[REDACTED]` everywhere, per the
standing rule.

What remains genuinely true from the original finding above: REST is
still unreachable on this deployment (no IIS/W3SVC), and the Admin UI's
Configuration screen still isn't driven by any *documented public* SDK
surface — the NVS convention was reverse-engineered from the
framework's own compiled code, not found in M-Files' public API
documentation. Not yet re-verified for Approbation's copies of these
apps — out of scope for this pass.

### 4.4.3 Vault tier has two layers, not one: native workflow + VAF add-on config (confirmed 2026-08-01, Conformity only)

Refines Tier 1 above — the Firebird vault carries two structurally
distinct, complementary sources of behavior, both now fully mapped for
Conformity:

  NATIVE WORKFLOW LAYER — states, transitions, guard conditions, and
  per-state actions (SetProperties, VBScript, AssignToUser, Delete),
  readable via Stage 5 (WorkflowOperations.GetWorkflowsAdmin()).

  VAF ADD-ON CONFIG LAYER — the four config-bearing custom
  applications' own JSON configuration, readable/writable via
  NamedValueStorage per §4.4.2's correction above. Bindings reference
  the native layer by state ID/name (e.g. ConformityVaultApplication's
  `ChangeWorkfow` config entry names a FromState/ToState pair
  directly).

Several states that look topologically anomalous in the native layer
alone (0 inbound transitions despite being live — e.g.
`WORKFLOW_ERREUR`, `OUT_TO_UPD_CP1`, `OUT_CREDIT`) turn out to be
DIRECT-ASSIGNMENT targets set by the add-on layer (SQL Query Vault
Application's `UpdateOnFailure.State`, ConformityVaultApplication's
`ChangeWorkfow`) — the transition graph alone cannot see these jumps.
Any future topology analysis of a workflow with config-bearing VAF apps
installed MUST cross-reference both layers before calling a 0-inbound
state dead; see progress.md's master 47-state table for the full
per-state resolution and §8 for the disabled-but-retained principle
(an inactive-looking artifact isn't automatically a bug).

ONBOARDING-VARIABLE SURFACE, BOTH LAYERS COMBINED (V2-relevant — what
must change per customer; full table in skills.md):
  - The Company object's driving properties (native, vault-side).
  - The six object-type External Database Connection strings —
    server/database/column-mapping, read+write via `IObjectTypeAdmin`
    (the External Object Type Connector finding above).
  - SQL Query Vault Application's own connection config is a DISTINCT
    second SQL connection layer (NVS-backed under
    `Docned.SQL.VaultApplication.VaultApplication`), separate from the
    six object-type connections above. Both layers must be updated per
    deployment.
  - Destination Vault GUID `{037B0872-...}` — appears 7x nested inside
    M-Files Vault Toolbox's config only (`SearchLocations[].VaultGuid`
    x2, `MoveObjectSettings.VaultGuid` x5), always traveling with a
    per-action Object/Class/Workflow/WorkflowState GUID cluster that
    must change together, not just the one GUID.
    Note: one vendor-authored action key is spelled `MoveToPackingSLip`
    (capital S/L) in config; this pre-existing spelling quirk was not
    introduced by any patch.
  - Hardcoded customer literals embedded directly in NATIVE state
    actions, not just add-on config — e.g. workflow state
    `RTE-NewDocument_+_CLEAN_PO`'s SetProperties action fixes `Company`
    to a literal lookup value "Tergos Construction" (ext ID `TERGOS`).
    This is a real onboarding-automation target the add-on-config
    inventory alone would miss.
  - Runtime SQL reference data dependencies: workflow behavior reads
    vendor/reference rows from SQL at runtime. A new customer deployment
    therefore needs reference-table population as part of onboarding;
    config rewrites alone are insufficient.
  - Live failure proof (2026-08-01, test object 5427): state 114
    (`UPD_VendorID`) executes SQL Query Vault Application's
    `Search Vendor & LearningCP1` and will redirect to
    `WORKFLOW_ERREUR` on SQL failure with
    `PD.Sqlqueryfail = "SQL ERROR : UPDATE VENDOR"`. This failure path
    is upstream of `MoveToApproval` and therefore does not invalidate
    the Destination Vault GUID patch/handoff configuration; the move
    simply never runs when the object dies at 114.
  Distinguish confirmed-hardcoded values (need a per-customer edit)
  from already-`%PROPERTY_{...}%`-parameterized ones (portable as-is)
  — see skills.md's full census; do not assume parameterization
  without checking the literal config/action content.

### 4.5 Plan/Apply

All provisioning operations generate a plan for operator approval before any COM write. Maintain rollback checkpoints. No writes without an approval record and a timestamp.

**Cross-vault reference writes need a custom validator — the VAF framework's own `Validate()` cannot cover this** (confirmed 2026-08-01 by decompiling `Docned.VaultToolbox.dll`). The Destination Vault GUID field (and its sibling Object/Class/Workflow/WorkflowState GUIDs, §4.4.3) has no format or reachability check at the framework level — `[TextEditor]` only controls the Admin UI's label/help-text. The framework's real validator, `ConfigurableVaultApplicationBase<T>.Validate()`, structurally cannot check it either: every one of its twelve reference-attribute types (`MFClass`, `MFWorkflow`, etc.) validates same-vault references only, and `Validate()` itself runs in-process on the M-Files Server with no COM/REST wrapper — unreachable from `IMFilesConnector` regardless. Any V2 write touching a cross-vault reference MUST include: (1) a GUID-format check, (2) a live reachability probe (`GetOnlineVaults()` / a login attempt against the target GUID) before the corresponding `SetNamedValues` call — the same GUID-first verification discipline as §4.1/§4.6, applied to this feature. Full detail in skills.md.

**Three confirmed platform facts about the NVS/config write path itself (2026-08-01, first real writes performed in this project — Phases 1 and 2 of the config-write protocol):**
1. **NVS writes generate zero vault event-log entries.** Confirmed twice — `EventLogOperations.GetIDRange().MaxID` was identical before and after both the Phase 1 round-trip write and the Phase 2 Destination Vault GUID patch. The vault provides no audit trail for `SetNamedValues` calls. Self-maintained audit logging (timestamp, vault GUID, namespace/key, before/after hash, intended change, human authorization) is therefore **mandatory, not optional**, for every config write the provisioning engine ever makes — there is nothing to fall back on if that logging is skipped.
2. **`SetNamedValues` is byte-faithful — it does not normalize or re-serialize.** Phase 1 (SQL Query Vault Application, 3,625 bytes) round-tripped byte-identical on the first attempt. Phase 2 (Vault Toolbox, 9,588 bytes, a 7-location surgical GUID patch) showed exactly the 7 intended byte spans changed and zero bytes changed anywhere else. The provisioning engine can rely on exact-bytes-in-exact-bytes-out at this layer — no defensive re-parse-and-diff is needed purely to guard against API-side normalization.
3. **Config changes do not take effect until app reload on this deployment.** VAF config is cached in memory during app startup (`StartOperations`) and not re-read per operation. Automatic refresh depends on a cross-server broadcast path (`BroadcastFilterMode.FromOtherServersOnly`) that cannot self-trigger on this single-server setup. Operational rule: after any config write, explicitly reload the target custom app (disable/re-enable via `IVaultCustomApplicationManagementOperations`) and verify behavior live; never assume the write is active before that check.

### 4.6 GUID foot-guns the index must defend against

Two M-Files operations can break GUID-based identity. Discovery must
detect both rather than silently corrupting the index.

CHANGE UNIQUE ID (vault properties -> General -> "Change Unique ID"):
  A one-click operation that reassigns a vault's GUID. If run on a
  vault already in the index, every row keyed to the old vault_guid
  orphans and a rescan treats it as a brand-new vault (duplicating
  everything). On rescan: if the GUID read from a vault matches no
  known vault but the NAME matches an existing one, that is the signal
  the ID was changed — flag it, do NOT create a second vault row.

NEW-IDENTITY RESTORE:
  Restoring a vault while its source still exists on the server is
  FORCED to new identity (M-Files refuses to overwrite an existing
  MetaData.fdb — error 0x8004006C). This assigns a NEW vault-level
  GUID and a new file path. Whether structural GUIDs survive a
  new-identity restore is NOT TESTABLE on the current setup — the
  attached vaults (Conformity_CP1_Tergos, Approbation_Acomba-
  Construction) are independent restores with no lineage sibling to
  compare against. RESOLVED BY DECISION: scanner keys GUID-first and
  retains the name-based fallback (per §4.1) rather than collapsing to
  GUID-only. The dual-path strategy handles both copy and restore cases
  without requiring the probe result.

IDENTITY ANCHOR: always the vault GUID from GetOnlineVaults(). Never
the file path or folder name — those change on every restore and are
implementation detail.

### 4.7 Cross-vault handoff phase boundary

A cross-vault handoff (e.g. Vault Toolbox's `MoveToApproval`) is considered **PROVEN** when the object reaches the destination vault boundary via the real trigger mechanism — a genuine workflow transition (`CheckOut`→`SetProperty`→`CheckIn`, the same mechanism the M-Files client itself uses; there is no separate "perform transition" API), enqueued and processed by the source-side app, confirmed live rather than assumed.

Receiving-side structural failures — missing destination apps, unresolved property mappings, destination-vault structure gaps — belong to the **destination vault's own phase**, not the source vault's. Do not fold receiving-side diagnosis into the source-vault milestone, and do not delay calling the source-side mechanism proven just because the destination side hasn't finished absorbing the object yet. Established 2026-08-02 after the Conformity cross-vault handoff was proven to Approbation's boundary — see §2.3's milestone entry and progress.md/skills.md's 2026-08-02 entries for the full evidence.

---

## 5. Project Structure

```
/provisioningai-frontend/electron          Electron main process & IPC bridges
/provisioningai-frontend/src/components    React UI
  ├── Studio/                              WORKING — do not refactor
  ├── Discovery/                           to build
  ├── Documentation/                       to build
  └── Copilot/                             to build
/provisioningai-backend/
  ├── ProvisioningAI.MFilesConnectors      COM + REST — the only place COM types appear
  ├── ProvisioningAI.Discovery             V1: structural scan, mapping template
  ├── ProvisioningAI.Data                  EF Core, SQLite, repositories
  ├── ProvisioningAI.Documentation         V1: SOPs, integration maps
  ├── ProvisioningAI.Copilot               V1: read-only Q&A
  ├── ProvisioningAI.Provisioning          V2: plan/apply rewiring
  └── ProvisioningAI.Core                  shared models & interfaces
/docs                                      PRD, tech stack, briefs
```

---

## 6. Build, Test, and Run

```bash
# Backend API (localhost:5000)
cd provisioningai-backend && dotnet run

# Frontend
cd provisioningai-frontend && npm start

# Tests
cd provisioningai-backend && dotnet test
cd provisioningai-frontend && npm test

# Lint
cd provisioningai-frontend && npm run lint

# EF Core migrations
cd provisioningai-backend/ProvisioningAI.Data && dotnet ef migrations add <MigrationName>
```

---

## 7. Coding Standards

**Backend (C#)** — `async`/`await` for all I/O. FluentValidation for customer input variables. Serilog with **structured** properties, not interpolated message strings:

```csharp
Log.Information("Connected to {VaultName} on {Server} in {ElapsedMs}ms", name, server, ms);
```

**Frontend (React)** — functional components and hooks. Zustand for UI state. TailwindCSS for styling. No new dependencies without asking; React Query appears in older docs but confirm it's actually in use before writing against it.

**Error handling** — never swallow errors. If an integration point can't be mapped or a provisioning step fails: throw, log, halt.

**Testing** — xUnit (backend), Jest (frontend). Mock the COM API; **no automated test may require a live vault.** Integration tests against Conformity live in a separate project excluded from the default run.

---

## 8. Known Pitfalls

- **COM objects are not garbage collected.** Every `MFilesServerApplication`, `Vault`, or vault collection must be explicitly released in a `finally`, including on the exception path. Release each item *inside* an enumeration loop, not just the collection.
- **NVS keys are case-sensitive.** Record the exact casing the VAF application uses.
- **Value list imports** — flush existing entries before importing a customer CSV, or you get duplicate IDs.
- **Permission failures look like success.** A thin result set may mean insufficient rights rather than a small vault. Surface permission-denied as a distinct exception type so the scanner can report "12 of 823 visible" instead of silently under-reporting.
- **Slow COM ≠ SSO unavailable.** Connector I retries SSO once after 10s specifically because a slow response otherwise triggers an unnecessary credential prompt.
- **Vault names are not stable.** They differ between environments and get reused. Key on GUID.
- **NVS config writes leave no event-log trail, and `SetNamedValues` is byte-faithful (no re-serialization).** See §4.5 for the full detail and evidence (Phases 1-2 of the config-write protocol, 2026-08-01) — self-maintained audit logging is mandatory for any code that writes NVS config, since the vault itself won't record it.
- **An inactive-looking script, rule, or config entry is not automatically a bug.** This project's vault maintainers disable retired logic rather than deleting it (confirmed independently at least twice: v3.0's dormant PO-validation VBScript left in place with `preconditionsVBScriptEnabled=False`; Conformity's `Sage50IMPExport` add-on binding left configured but disabled alongside its live replacement). Check whether something is disabled-but-retained before treating it as dead code or an anomaly worth chasing — full principle and examples in skills.md.
- **M-Files Admin's displayed vault name can differ from `GetOnlineVaults()`'s raw `.Name`.** Confirmed live (2026-07-26): a vault restored/attached without being renamed keeps its backup-file-derived name — e.g. `GetOnlineVaults()` returns `"Conformity_CP1_Tergos.mfb"` while Admin's UI shows a cleaned-up label. This is a genuine Admin-vs-API display discrepancy, not a parsing bug — the scanner already reads `.Name` correctly and must keep recording it verbatim, `.mfb` included. Don't strip or "clean" it in code; that would silently diverge from what the vault is actually registered as.
