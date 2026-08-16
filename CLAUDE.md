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

### 2.4 Unresolved — do not silently decide these

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
