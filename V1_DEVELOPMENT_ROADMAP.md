# ProvisioningAI V1 Development Prompt: Divide & Conquer

**Phase:** V1 (Discovery + Documentation + Workflow Engine + Structured Index)  
**Approach:** Modular, parallel development with clear integration points  
**Language:** C#/.NET (Backend) + React (Frontend)  
**Timeline:** 3-4 months  
**Git Strategy:** Feature branches, merge to develop, deploy to staging

---

## Current Active Priority (2026-08-10) — read this before the Phase 1-8 plan below

**Reconciliation note, stated plainly rather than silently merged in:** everything
below this section (Phase 1-8, the Module list, the "~10 weeks / ~40 tasks"
summary) is this project's original aspirational planning template. It predates,
and was never reconciled with, the Connection-based operational roadmap
(Connections I-IV) that actually emerged from real M-Files discovery work and is
tracked in progress.md and skills.md. The two use different vocabularies (Phase/
Milestone here vs. Connection there) and this document's checkmarks (✓) are
template placeholders, not a real completion record — progress.md is the
authoritative status source. This section is the bridge between them, added
2026-08-10; a full reconciliation of the two structures is not attempted here.

**Update (2026-08-13) — where actual build effort has gone, stated plainly so the
table below doesn't read as stale.** Today's real work was the two-canvas GUI
implementation — M-Files Flow (decision/automatic-hub gateway diamonds, the
Neutral/Cacoo/Hub-accent theme selector, and opt-in animated flow indicators on
both canvases) and standing up BPMN Standard (the Process Docs section) — not
Connection III's remaining Priority-1 items below (interactive editor, COM
emitter, first build test). This is not a re-prioritization decision reversing
2026-08-10's Priority 1/Priority 2 ordering; it's a record of where hands-on-
keyboard effort actually went, so a reader scanning this table sees the real
current state rather than an untouched 2026-08-10 snapshot. See the COM
emitter's own row below and progress.md's 2026-08-13 entries for full detail.

**Priority 1 — Connection III: Workflow/Mermaid Pipeline.** Design an M-Files
workflow visually via Mermaid (hand-drawn or AI-drafted from a plain-language
description), refine it through an interactive editor, and export it into a real
M-Files workflow via COM — and the reverse (read an existing M-Files workflow out
as a Mermaid diagram). Sub-milestones:

| Sub-milestone | Status |
|---|---|
| Property reference (MfilesProperties.md) | ✅ Done — multiple correction passes, including an independent third-party (Qwen) structuring audit |
| BPMN↔Mermaid mapping (§3, §3.5 labeling convention) | ✅ Done |
| Worked example, end-to-end on paper (§6) | ✅ Done |
| Interactive click-to-edit popup UI | ⬜ Not started — sub-deliverable spec'd 2026-08-12: a palette hover-preview showing both collapse and promote outcomes side by side, reusing existing verified sample JSON (§6.7/§6.8/§6.10/§6.11/§6.12 — all already run through the real Translator/Validator, not hand-authored). Buildable now, no new verification needed. Distinct from the live post-drop preview (see the Milestone 8 row below), which needs either a running Translator/Validator service or a scoped client-side reimplementation and is blocked on Milestone 8's audit-first sub-task — do not conflate the two. **Whoever builds this: both the collapse and promote sides of the preview render as a plain rectangle, never a diamond — see MfilesProperties.md's 2026-08-16 clarifying addendum to Decisions 3/5, confirmed directly against `TranslationPlanRenderer.html`'s own rendering code.** |
| Translator / validator (+ TranslationPlanRenderer.html) | ✅ Done (2026-08-11 – 2026-08-12) — `ProvisioningAI.Workflow/Translation/`, 24 tests passing, §6.2 acceptance test exact-match. Building it surfaced three §3.5 design-doc gaps (unlabeled/skeleton split, sidecar scope, implicit-state-discovery limitation), all folded back into MfilesProperties.md §3.5 itself. The renderer (side-by-side Mermaid + M-Files-schematic visualization) then surfaced and closed the `EvaluationPriority` gap. Full detail: progress.md's two 2026-08-11/2026-08-12 dated entries. |
| COM emitter | ⏸ Paused, not abandoned (2026-08-13) — the V1/V2 scope gate below is **now resolved**: MfilesProperties.md's Decision 8 (filed 2026-08-13) formally moves the emitter into V1 scope and lifts CLAUDE.md §1A's read-only boundary for it specifically, under four explicit conditions (Conformity-only, additive-only, dry-run-first, rollback-plan-required). It is paused for a different, ordinary reason: active build effort has shifted to the two-canvas GUI implementation (M-Files Flow + BPMN Standard — see the 2026-08-13 update note above), not because it's still blocked. Resumes, scope-clear, whenever priority is redirected back to it. |
| First real build test (against a disposable vault) | ⬜ Not started |
| **Milestone 8 — GUI integration into the existing Workflow Studio (React/Electron)** | ⬜ Not started — new, added 2026-08-12. The standalone Connection III tools (translator, renderer, eventual click-to-edit editor) need to become real features of the actual application, not remain separate HTML/test artifacts. **First sub-task: audit Workflow Studio's actual current code state** (CLAUDE.md §2.1 claims live Mermaid diagramming + bidirectional M-Files push/pull already work — confirm what's real/viable vs. stale/assumed before treating this as pure addition). See progress.md's 2026-08-12 entry. |

Architecture as currently stated (six layers; flagged here since no prior design
document for it was found anywhere in this project during a full-text search —
recorded from the priority-decision conversation, not independently verified):
Mermaid (unmodified) → sidecar config → style/edit layer → translator/validator
→ COM emitter → vault. Full reasoning for why this is priority 1: progress.md's
"Decision (2026-08-10)" entry.

**The COM emitter specifically — not the translator/validator, not the renderer, not Milestone 8's Studio-integration work — was the row gated on this project's open V1/V2 scope question.** CLAUDE.md §1A's read-only-until-V2 safety arc and §2.4's flagged "Studio writes to M-Files" tension both applied directly to an emitter that writes a real workflow into a vault via COM. The translator/validator and renderer are pure read/plan-only tools (no vault access, no writes) and were never gated by this question at all — building and testing them required no resolution of it, and none was attempted.

**Resolved 2026-08-13 — MfilesProperties.md's Decision 8.** The V1/V2 scope question above is no longer open for the emitter: Decision 8 formally moves it into V1 scope and lifts CLAUDE.md §1A's read-only boundary for it specifically, under four explicit conditions carried in the decision itself, not separable from it — target vault Conformity only, additive-only, dry-run-first, and an explicit rollback plan required before any real write. This citation (Decision 8) is kept alongside CLAUDE.md §1A/§2.4, not in place of it — §1A/§2.4 remain the correct citation for *what boundary exists and why it exists project-wide*; Decision 8 is the correct citation for *the specific, conditioned exception carved out of it*. Decision 8 does not reopen or resolve CLAUDE.md §1A's broader V1/V2 framing — it authorizes exactly what its four conditions say, nothing beyond. See MfilesProperties.md's Decision 8 for the full text and its own provenance note (filed on direct, present-tense operator instruction — not a retroactive record of a prior agreement, since checking this project's actual session history found no such prior agreement before the decision was made).

**Paused (2026-08-13), deliberately and reversibly — not dropped, and no longer blocked.** Before Decision 8, this row was waiting on an open scope question; now it's waiting only on effort allocation. Active build effort has moved to the two-canvas GUI work (M-Files Flow's gateway diamonds/theming/animation, and standing up BPMN Standard) rather than toward the emitter. This pause is a statement about where hands-on-keyboard time is going right now, not a decision to cut it, and not a re-opening of the question Decision 8 just closed. It resumes, scope-clear under Decision 8's four conditions, whenever priority is redirected back to it.

**A second, distinct sub-deliverable — the live post-drop preview (a real-time preview that updates as a diagram is edited, not the static palette hover-preview logged in the interactive-editor row above) — is logged here as a forward dependency on Milestone 8, not absorbed into Milestone 8's own audit task.** It needs either a running Translator/Validator service reachable from the browser, or a scoped client-side reimplementation of the same collapse/promote logic — neither exists yet, and building either is explicitly blocked on Milestone 8's audit-first sub-task (the table row above) confirming what of Workflow Studio's current code is real vs. stale before any new capability is layered on top of it. Spec'd 2026-08-12; deliberately not scoped in further detail here — doing so before the audit lands would be planning against an unconfirmed foundation.

**Priority 2 — Vault template / "customize on the fly" (deprioritized, not
dropped).** Import an existing vault's full structure (SQL schema, ACLs, class/
property definitions, object-type connections) as a reusable template, then
rapidly customize it for a new customer/deployment, rather than repeating the
full manual discovery-and-build process each time. Builds on Connection I/II
groundwork already proven live — SQL consolidation, object-type connection
repointing, the byte-faithful NVS config-write mechanism (see progress.md's
Connection I/II entries and skills.md for that evidence, not re-derived here).
Status: real findings, not yet scoped as its own defined tool/spec — that
scoping work is itself still to be done, on top of the build work that would
follow. Has no Connection number of its own.

**These are different capabilities, not one bigger than the other:** the
workflow pipeline solves "design or modify logic itself"; the vault template
solves "replicate and adapt something that already exists." **Full-vault-import
does NOT make workflow design easier — it's the wrong tool for inventing a new
process from nothing. It's the right tool for onboarding a new customer onto a
proven, existing template.** Stated this plainly because this session's own
conversation initially conflated the two before the distinction was clarified.

Relationship to Phase 4 below ("Workflow Engine" / "Workflow Visualization
(Static, No Animation)"): possibly related to Connection III, not confirmed
either way in this pass — flagged for a future reconciliation session rather
than silently assumed to be the same effort or silently assumed unrelated.

**M-Files Flow GUI enhancements — built 2026-08-13, Studio's own canvas, not a
Connection III deliverable.** Ports worked_example_mockup.html's decision/
automatic-hub diamond concept and theme_comparison_mockup.html's three canvas
themes directly into Studio's existing data model and Mermaid renderer — no
connection to the Translator, `ProvisioningAI.Workflow/Translation/` untouched.

| Sub-milestone | Status |
|---|---|
| Decision/automatic-hub gateway diamonds (`transition.group`, `wf.groups`) | ✅ Done — collapse case regression-verified byte-identical to baseline before the promote case was built; both verified live. See progress.md's 2026-08-13 entry. |
| Canvas theme selector (Neutral default / Cacoo / Hub-accent) | ✅ Done — Neutral verified as a genuine no-op (no `classDef` injected), not just visually similar |
| Cosmetic annotations (`state.color`, `state.badge`/`badgeColor`, `state.markerType`) | ✅ Done — lowest priority, built after the theme selector was solid, per original sequencing |
| Opt-in animated flow indicators | ✅ Done — off by default, independent of BPMN's own toggle, grounded in gateway-group `'automatic'` type as an explicit, flagged substitute for the literal (non-existent) `TriggerMode` field; performance-verified at real 47-state/64-transition scale (60 simultaneous animated edges, zero console errors) |
| Connector-style routing (orthogonal/straight/curved) | 🚫 Confirmed unsupported by both `stateDiagram-v2` and Studio's own `redrawEdge` — stays cut, not a gap |

**⚠ FOLLOW-UP — `--gold` left intentionally unused in the animated flow indicators
above.** The app's theme reserves both `--green`/`--gold` for this feature, but
only `--green` has a real data distinction to justify it (gateway-group
`'automatic'` type). Using `--gold` decoratively with no second real signal
behind it would be the same honesty problem the feature exists to avoid — left
unused rather than forced in. Resolves itself if/when the TriggerMode follow-up
below is picked up (a real `4` vs. `5` split would give `--gold` a genuine job).

**⚠ FOLLOW-UP — `scripts/pull-from-vault.ps1` does not capture `TriggerMode`.**
Confirmed this session: Studio's transition schema has never carried
`TriggerMode` (0/4/5) — it exists only in
`ProvisioningAI.Workflow/Translation/Models.cs`, and the real M-Files pull
script's transitions only ever return `from`/`to`/`label`. The animated flow
indicators above use gateway-group `'automatic'` type as an honest substitute
signal. Extending `pull-from-vault.ps1` to also read and return each
transition's real `TriggerMode` would let the M-Files animation signal (and any
future feature needing it) use the literal field instead of that substitute.
Not started; no code changes made toward this yet.

**BPMN documentation canvas (Process Docs section) — current status (refreshed 2026-08-14),
no Connection number of its own.** Internal BPMN process documentation, the same
role Cacoo serves the AP team today — deliberately never produces a
`TranslationPlan` and never calls `ProvisioningAI.Workflow/Translation/`.
Confirmed to remain isolated from Studio's `useWorkflowStore` except shared app shell chrome.

| Sub-milestone | Status |
|---|---|
| Navigation placement (new `SECTIONS` entry vs. second tab inside Studio) | ✅ Done |
| Isolated store + persistent documentation-only banner | ✅ Done |
| Node/edge styling baseline + fit-view behavior | ✅ Done |
| Palette v1 surfaced full core set (Task/Start/End + Exclusive/Inclusive/Parallel + Pool) | ✅ Done |
| Drag-and-drop from palette + snap-to-grid | ✅ Done |
| MiniMap `NaN` crash fix (parameter-shadowing root cause) | ✅ Done |
| `bpmn-moddle` integration (real BPMN 2.0 export/import/validation) | ✅ Done |
| Left sidebar redesign (categorized palette + search) | ✅ Done |
| Sidebar hover-expand model (44px/240px), hover-out delay, pin toggle | ✅ Done |
| Pill edge labels + orthogonal routing baseline | ✅ Done |
| Business/Technical view toggle | ✅ Done |
| Persistent validation status bar | ✅ Done |
| Version history (manual snapshots, in-memory) | ✅ Done |
| Gateway sticker-effect parity (type-colored glow, handle behavior) | ✅ Done |
| Connector-style picker (Orthogonal/Straight/Curved) | ✅ Done |
| Pool container Stage 1 (with explicit export exclusion boundary) | ✅ Done |
| Helper-lines corrected for pool-relative coordinate model | ✅ Done |
| Pool lanes/multi-lane subdivision | ⬜ Deferred |
| Full pool export (collaboration/participant model restructuring) | ⬜ Deferred |
| COM emitter / write path | N/A — BPMN Standard is documentation-only by design |

**Tracked open dispatch (sent, awaiting completion report):**

- Gateway parity check (duplicate/edit/delete behavior)
- Edge-insert-node (`+` on edge) + sticky-note comment nodes
- Stage 3 verification pass (undo/redo + copy/paste)
- Command-palette investigation (reuse existing palette path before any new overlay)

**Durably deferred/rejected in this stream (do not silently reopen):**

- Collaboration features
- React Flow attribution removal
- Sidebar stuffing with every capability (command-overlay approach preferred)
- libavoid obstacle-avoid edge routing
- Server-side image export

**⚠ OUTSTANDING — React Flow Pro (xyflow) license needs to be purchased.** The
gateway shapes and auto-layout above were built referencing Pro example bundles
(`React_Flow_Pro/`, specifically `shapes-pro-example` and
`auto-layout-pro-example`) ahead of a confirmed-active paid subscription — the
license bundled with those examples (`xyflow Pro License v1.0`) conditions its
grant on "maintaining a valid subscription," and one was not verified active
before this work proceeded. Built on the user's explicit, informed instruction
after this was raised directly during scoping — **this is a real, unresolved
compliance action, not a formality.** Purchase (or otherwise confirm an active
subscription) before this project ships or is distributed further. Full
reasoning: progress.md's 2026-08-13 entry.

---

## V1 Scope (What We're Building)

```
ProvisioningAI V1 (Discovery + Documentation + Workflow Analysis)
├── BACKEND MODULES
│   ├── Module 1: M-Files Connectors (COM + REST)
│   ├── Module 2: Discovery Engine (Scans vault)
│   ├── Module 3: Structured Index (SQLite storage)
│   ├── Module 4: Workflow Engine (Parse workflows)
│   ├── Module 5: Documentation Engine (Generate SOPs)
│   ├── Module 6: AI Copilot Service (Q&A)
│   ├── Module 7: Audit Service (Logging)
│   └── Module 8: REST API (Expose all services)
│
├── FRONTEND MODULES
│   ├── Module 1: Discovery Scanner Dashboard
│   ├── Module 2: Workflow Visualization (Static, no animation yet)
│   ├── Module 3: Documentation Viewer
│   ├── Module 4: AI Copilot Chat Interface
│   └── Module 5: Main Layout & Navigation
│
└── NOT IN V1
    ├── ❌ Workflow Simulation/Animation (V1.5)
    ├── ❌ Provisioning Engine (V2)
    └── ❌ Knowledge Graph/Neo4j (V2)
```

---

## Development Strategy: Divide & Conquer

### Principle 1: Independent Modules
Each module can be developed in parallel with clear contracts (interfaces/APIs)

### Principle 2: Testable in Isolation
Each module has unit tests, mocks for dependencies

### Principle 3: Integration Points (Checkpoints)
Specific milestones where modules are integrated and tested together

### Principle 4: Progressive Delivery
Each milestone produces a working feature, not just code

---

## Phase 1: Foundation (Week 1-2)

### **MILESTONE 1.1: M-Files COM/REST Connectors**

**Goal:** Stable, tested connectivity to M-Files vault

**Backend Tasks:**
```
1.1.1 Create ProvisioningAI.MFilesConnectors project
      └─ Reference: Connector I (ClientVaultAccessMSIBuilder) code
      
1.1.2 Implement MFilesComConnector.cs
      ├─ 9-arg Connect() (from Connector I, proven)
      ├─ SSO-first authentication
      ├─ Connection pooling
      ├─ Close-ComObjectSafe() cleanup
      └─ Test: Can connect to Conformity vault
      
1.1.3 Implement MFilesRestConnector.cs
      ├─ HTTP client for vault searches
      ├─ Authentication (token + cookie)
      ├─ Retry logic (exponential backoff)
      └─ Test: Can search objects in Conformity vault
      
1.1.4 Create ConnectorFactory.cs
      ├─ Returns appropriate connector (COM or REST)
      ├─ Dependency injection pattern
      └─ Test: Factory produces working connectors

1.1.5 Unit Tests
      ├─ ConnectorFactoryTests.cs
      ├─ MFilesComConnectorTests.cs (with mocks)
      └─ MFilesRestConnectorTests.cs (with mocks)
```

**Frontend Tasks:** (None yet, wait for API)

**Checkpoint:** ✅ Can connect to M-Files and retrieve data

**Definition of Done:**
- Both connectors tested + working
- Connection pooling works
- Cleanup on disconnect
- Retry logic for REST calls
- All tests pass
- Ready for Discovery Engine to use

---

### **MILESTONE 1.2: SQLite Database Schema & EF Core**

**Goal:** Structured storage for discovered vault data

**Backend Tasks:**
```
1.2.1 Create ProvisioningAI.Data project
      └─ Entity Framework Core + SQLite
      
1.2.2 Define Core Entities (Models)
      ├─ VaultStructure.cs
      ├─ ObjectType.cs
      ├─ Property.cs
      ├─ Workflow.cs
      ├─ WorkflowState.cs
      ├─ WorkflowTransition.cs
      ├─ IntegrationPoint.cs
      ├─ MappingTemplate.cs
      ├─ AuditLog.cs
      └─ DiscoveryScan.cs
      
1.2.3 Create DbContext
      ├─ ProvisioningAiDbContext.cs
      ├── Define DbSets for all entities
      ├── Configure relationships
      └── Configure indexes (for performance)
      
1.2.4 Create EF Core Migrations
      ├─ Initial migration (create all tables)
      └─ Seed initial data (empty vault structure)
      
1.2.5 Create Repository Pattern
      ├─ IRepository<T> interface
      ├─ GenericRepository<T> (CRUD)
      ├─ Specific repositories:
      │   ├─ IVaultStructureRepository
      │   ├─ IMappingTemplateRepository
      │   ├─ IAuditLogRepository
      │   └─ IDiscoveryScanRepository
      
1.2.6 Unit Tests
      ├─ DbContext Tests (with in-memory SQLite)
      ├─ Repository Tests (CRUD operations)
      └─ Migration Tests (schema validates)
```

**Frontend Tasks:** (None yet)

**Checkpoint:** ✅ Database schema created, EF Core working, repositories ready

**Definition of Done:**
- SQLite database creates on first run
- All migrations pass
- Repositories CRUD working
- In-memory database tests pass
- Ready for Discovery Engine to store data

---

## Phase 2: Discovery Engine (Week 2-4)

### **MILESTONE 2.1: Vault Scanner (Object Types & Properties)**

**Goal:** Read all object types and properties from M-Files

**Backend Tasks:**
```
2.1.1 Create ProvisioningAI.Discovery project
      
2.1.2 Implement ObjectTypeScanner.cs
      ├─ Use COM API: vault.GetObjectTypes()
      ├─ For each object type:
      │   ├─ Read: ID, GUID, Name, Class
      │   ├─ Read all properties used by this type
      │   ├─ Store: ObjectType entity + relationships
      │   └─ Log: What was found
      ├─ Handle errors (missing ACL, etc.)
      └─ Test: Scan Conformity, verify all object types captured
      
2.1.3 Implement PropertyScanner.cs
      ├─ Use COM API: vault.GetPropertyDefs()
      ├─ For each property:
      │   ├─ Read: ID, GUID, Name, DataType, Required
      │   ├─ Read associated object types
      │   ├─ Store: Property entity + relationships
      │   └─ Log: What was found
      ├─ Capture validation rules (if available)
      └─ Test: Scan Conformity, verify all properties captured
      
2.1.4 Implement DiscoveryScanCoordinator.cs (Orchestrator)
      ├─ Runs scanners in sequence
      ├─ ObjectTypeScanner first
      ├─ PropertyScanner second
      ├─ Creates DiscoveryScan record (metadata)
      ├─ Logs progress and errors
      ├─ Returns DiscoveryScanResult
      └─ Test: Full scan of Conformity vault
      
2.1.5 Unit Tests
      ├─ ObjectTypeScannerTests.cs (mock COM API)
      ├─ PropertyScannerTests.cs (mock COM API)
      └─ DiscoveryScanCoordinatorTests.cs (orchestration)
```

**Frontend Tasks:** (None yet, wait for API)

**Checkpoint:** ✅ Can discover all object types and properties

**Definition of Done:**
- Scan completes without errors
- All object types stored in database
- All properties stored in database
- Relationships correct (property → object type)
- GUIDs captured for all
- Ready for next discovery module

---

### **MILESTONE 2.2: Workflow Scanner**

**Goal:** Read all workflows, states, transitions from M-Files

**Backend Tasks:**
```
2.2.1 Implement WorkflowScanner.cs
      ├─ Use COM API: vault.GetWorkflows()
      ├─ For each workflow:
      │   ├─ Read: ID, GUID, Name, Description
      │   ├─ Store: Workflow entity
      │   └─ Log: Found workflow
      
2.2.2 Implement WorkflowStateScanner.cs
      ├─ For each workflow, get states
      ├─ For each state:
      │   ├─ Read: StateID, Name, IsInitial, IsFinal
      │   ├─ Read: Custom document title (if set)
      │   ├─ Read: User prompts (properties user must fill)
      │   ├─ Store: WorkflowState entity
      │   └─ Log: Found state
      
2.2.3 Implement WorkflowTransitionScanner.cs
      ├─ For each workflow, get transitions
      ├─ For each transition:
      │   ├─ Read: FromStateID, ToStateID
      │   ├─ Read: Guard conditions (guardConditionAsString)
      │   ├─ Read: Actions (action type, target property, value)
      │   ├─ Parse: Extract property names from guards
      │   ├─ Parse: Extract property names from actions
      │   ├─ Store: WorkflowTransition entity
      │   └─ Log: Found transition
      
2.2.4 Implement WorkflowMetadataExtractor.cs
      ├─ For each state:
      │   ├─ Extract properties used (from guards + actions)
      │   ├─ Extract user prompts
      │   ├─ Extract permissions
      │   └─ Build PropertiesInState list
      ├─ For each transition:
      │   ├─ Extract guard conditions (structured)
      │   ├─ Extract actions (structured)
      │   └─ Store parsed metadata
      └─ Test: Parse complex guard conditions
      
2.2.5 Add to DiscoveryScanCoordinator
      ├─ After property scanner
      ├─ Run workflow scanner
      ├─ Run metadata extractor
      
2.2.6 Unit Tests
      ├─ WorkflowScannerTests.cs
      ├─ WorkflowStateScannerTests.cs
      ├─ WorkflowTransitionScannerTests.cs
      ├─ WorkflowMetadataExtractorTests.cs
      └─ Full workflow scan test
```

**Frontend Tasks:** (None yet)

**Checkpoint:** ✅ Can discover all workflows + states + transitions + metadata

**Definition of Done:**
- All workflows discovered
- All states + transitions stored
- Metadata extracted (properties, guards, actions)
- Relationships correct
- Ready for integration points discovery

---

### **MILESTONE 2.3: Integration Points Scanner**

**Goal:** Find customer-specific configurations (SQL, ERP, APIs, ACLs, etc.)

**Backend Tasks:**
```
2.3.1 Implement IntegrationPointFinder.cs
      ├─ Look for SQL configs
      │   ├─ Property named "SQL*" or "Connection*"
      │   ├─ VAF config in "SQL_*" modules
      │   └─ Capture current value + storage location
      │
      ├─ Look for ERP configs
      │   ├─ Property containing "ERP" or "API"
      │   ├─ VAF config for ERP modules
      │   └─ Capture current value + storage location
      │
      ├─ Look for HTTP/API configs
      │   ├─ Property for "Endpoint", "URL", "Token"
      │   ├─ VAF config for HTTP modules
      │   └─ Capture current value + storage location
      │
      ├─ Look for Value Lists
      │   ├─ Which value lists change per customer? (Vendors, etc.)
      │   ├─ Capture current entries count
      │   └─ Mark as customer-specific
      │
      └─ Look for Named ACLs
          ├─ Which ACLs have customer-specific AD groups?
          ├─ Capture current members
          └─ Mark as customer-specific
      
2.3.2 Implement SqlIntegrationScanner.cs
      ├─ Stage: SQL Integration Config (dbo.Company)
      ├─ Read-only SELECT against MfilesData.dbo.Company and sibling tables (Windows auth)
      ├─ Record integration columns: ERP endpoints, tokens, SERVERNAME/DB/LOGIN/PASSWORD, URLs, PREFIX, PARTITIONID
      ├─ Classify each column: customer / static / derived
      ├─ Emit into the SQL-side section of the mapping template (company-row-keyed)
      └─ NO writes. Rewiring is V2
      
2.3.3 Implement ConfigurationLocationDetector.cs
      ├─ For each integration point:
      │   ├─ Determine: Is it in a Property? VAF? Config object?
      │   ├─ Get: GUID, ID, Path, COM API call to update
      │   ├─ Validate: Can we query + update it?
      │   └─ Store: StorageLocation entity
      
2.3.4 Create IntegrationPoint Entities
      ├─ IntegrationPoint.cs
      │   ├─ ID, Name, Type (VAF_CONFIG, PROPERTY, VALUE_LIST, NAMED_ACL, SQL_CONFIG)
      │   ├─ CurrentValue
      │   ├─ StorageLocation (JSON)
      │   ├─ DataType, ValidationRules
      │   ├─ CustomerSpecific (bool)
      │   └─ UpdateMethod (how to change it programmatically)
      
2.3.5 Add to DiscoveryScanCoordinator
      ├─ After workflow scanner
      ├─ Run integration point finder
      ├─ Run SQL integration scanner
      ├─ Store all findings
      
2.3.6 Unit Tests
      ├─ IntegrationPointFinderTests.cs
      ├─ SqlIntegrationScannerTests.cs
      └─ ConfigurationLocationDetectorTests.cs
```

**Frontend Tasks:** (None yet)

**Checkpoint:** ✅ Can identify all customer-specific integration points

**Definition of Done:**
- All integration points discovered
- Storage locations identified + verified
- Current values captured
- Ready for mapping template generation

---

### **MILESTONE 2.4: Mapping Template Generator**

**Goal:** Generate JSON mapping template from discovered data

**Backend Tasks:**
```
2.4.1 Implement MappingTemplateGenerator.cs
      ├─ Input: DiscoveryScan + all discovered entities
      ├─ Output: MappingTemplate (JSON structure)
      │
      ├─ Build template structure:
      │   ├─ vault: Conformity
      │   ├─ generatedAt: timestamp
      │   ├─ version: 1.0
      │   ├─ summary: counts (object types, properties, workflows, integrations)
      │   ├─ integrationPoints: [array of all integration points]
      │   ├─ valueListDetails: [array of value lists]
      │   ├─ workflowDetails: [array of workflows + their touch points]
      │   └─ validateMetadata: [validation rules for each integration]
      │
      ├─ For each integration point:
      │   ├─ id: unique identifier
      │   ├─ name: human-readable
      │   ├─ type: VAF_CONFIG, PROPERTY_DEFINITION, VALUE_LIST, NAMED_ACL
      │   ├─ currentValue: what it is now
      │   ├─ location: {type, path, guid, com_path}
      │   ├─ dataType: string, url, connection_string, etc.
      │   ├─ validation: rules for validating new value
      │   ├─ businessFunction: what it's used for
      │   ├─ replacementPriority: HIGH, MEDIUM, LOW
      │   └─ notes: context for provisioning
      │
      └─ Export: Write to JSON file + database
      
2.4.2 Create MappingTemplate Entity
      ├─ TemplateId
      ├─ VaultName
      ├─ GeneratedAt
      ├─ IntegrationPointsJson (full JSON)
      ├─ Version
      ├─ Status (DRAFT, VALIDATED, PRODUCTION)
      └─ CreatedBy
      
2.4.3 Unit Tests
      ├─ MappingTemplateGeneratorTests.cs
      └─ JSON structure validation
      
2.4.4 Manual Testing
      ├─ Generate mapping for Conformity vault
      ├─ Inspect JSON output
      ├─ Verify all integrations included
      └─ Validate JSON schema
```

**Frontend Tasks:** (Wait for API)

**Checkpoint:** ✅ Mapping template generated + validated

**Definition of Done:**
- Mapping template JSON created
- All integration points included
- All GUIDs captured
- Schema correct
- Ready for Discovery API endpoint

---

## Phase 2 — Decision Gate: Single-Vault-Deep vs. Multi-Vault-Wide

Before scanning additional vaults, STOP and evaluate:

- Has Conformity's IsIntegrationTouching flag (or equivalent) cleanly
  separated "stable across deployments" from "varies per ERP"?
- Scan ONE additional vault fully. Diff its non-integration-touching
  structure against Conformity's.
- Confirmed match -> proceed to "narrow scan" mode for remaining
  vaults (see Phase 2B below).
- Mismatch found -> the stability hypothesis needs revision before
  scaling. Do not proceed to narrow-scan mode until resolved.

This gate exists because full-depth scanning of 9 vaults is expensive
and mostly redundant IF the hypothesis holds. It's cheap to verify on
vault 2; expensive to discover it was wrong on vault 9.

---

## Phase 2B — Narrow Scan (vaults 3 through 9, IF Decision Gate confirms)

Scope, per vault:

- dbo.Company row for this vault's company/companies.
- ONLY the states/transitions flagged IsIntegrationTouching in the
  template comparison (typically ~15-20 states, not all ~47).
- Skip: object types, classes, class-property associations, non-ERP
  workflow states — inherited from the Conformity template, already
  proven stable in Phase 2's decision gate.

This is what "work smarter, not harder" means concretely for this
project: the template gets proven once (Phase 2, Conformity + vault 2
confirmation), and every subsequent vault only needs its DELTA
documented, not its whole structure re-discovered.

Depends on: the diff tool from the Decision Gate. If that tool doesn't
exist yet in usable form, build a minimal version first (compare two
vaults' WorkflowStates by name, flag differences) — this is effectively
pulling a small piece of V1.5 (Diff & Verify) earlier because it's now
required infrastructure, not a nice-to-have.

---

## Phase 3: Discovery API & Frontend (Week 4-6)

### **MILESTONE 3.1: Discovery REST API Endpoints**

**Goal:** Expose Discovery Engine via REST API

**Backend Tasks:**
```
3.1.1 Create DiscoveryController.cs
      ├─ POST /api/v1/discovery/scan
      │   └─ Start new vault scan
      │   └─ Returns: scanId + status
      │
      ├─ GET /api/v1/discovery/scan/{scanId}
      │   └─ Get scan status (running/completed/failed)
      │   └─ Returns: progress %
      │
      ├─ GET /api/v1/discovery/scan/{scanId}/results
      │   └─ Get scan results (after complete)
      │   └─ Returns: ObjectTypes, Workflows, IntegrationPoints
      │
      ├─ GET /api/v1/discovery/mapping-template
      │   └─ Get latest mapping template
      │   └─ Returns: Mapping template JSON
      │
      ├─ GET /api/v1/discovery/integrations
      │   └─ List all discovered integrations
      │   └─ Returns: Integration points + metadata
      │
      └─ GET /api/v1/discovery/conflicts
          └─ Get detected issues (orphaned classes, circular workflows, etc.)
          └─ Returns: Conflict list
      
3.1.2 Implement DiscoveryService (Business Logic)
      ├─ Coordinates all scanners
      ├─ Manages scan state + progress
      ├─ Handles errors + retries
      ├─ Updates database
      └─ Logs everything
      
3.1.3 Add HostedService for Background Scans
      ├─ Run discovery on schedule (daily?)
      ├─ Or on-demand via API
      └─ Track scan history
      
3.1.4 Integration Tests
      ├─ Scan Conformity vault (end-to-end)
      ├─ Verify all data stored
      ├─ Verify API responses correct
      └─ Test error handling
```

**Frontend Tasks:** (Wait for working API)

**Checkpoint:** ✅ Discovery API working, can trigger scans

**Definition of Done:**
- All endpoints implemented
- Scan logic working
- Database updates during scan
- Error handling robust
- Integration tests pass
- Ready for frontend

---

### **MILESTONE 3.2: Discovery Scanner Dashboard (Frontend)**

**Goal:** UI to view discovery results

**Frontend Tasks:**
```
3.2.1 Create Discovery Scanner Page
      ├─ Discovery/DiscoveryScannerDashboard.tsx
      │   ├─ [Trigger Scan] button
      │   ├─ Scan progress indicator (%)
      │   ├─ Status messages
      │   ├─ Scan history (previous scans)
      │   └─ [View Results] button
      
3.2.2 Create Discovery Results View
      ├─ Discovery/DiscoveryResultsViewer.tsx
      │   ├─ Tabs: ObjectTypes | Workflows | Integrations | Summary
      │   │
      │   ├─ ObjectTypes Tab:
      │   │   └─ Table of all object types
      │   │       ├─ Name, GUID, ID, Property count
      │   │       └─ [View Properties] (expandable)
      │   │
      │   ├─ Workflows Tab:
      │   │   └─ Table of all workflows
      │   │       ├─ Name, GUID, State count, Transition count
      │   │       └─ [View Details] (expandable)
      │   │
      │   ├─ Integrations Tab:
      │   │   └─ Table of all integration points
      │   │       ├─ Name, Type, Current Value, Storage Location
      │   │       └─ [View Details] (expandable)
      │   │
      │   └─ Summary Tab:
      │       └─ Statistics
      │           ├─ Total object types
      │           ├─ Total properties
      │           ├─ Total workflows
      │           ├─ Total integrations
      │           └─ Scan duration
      
3.2.3 Create Mapping Template Viewer
      ├─ Discovery/MappingTemplateViewer.tsx
      │   ├─ Display mapping template JSON
      │   ├─ Format: Structured tree view or JSON
      │   ├─ [Download] button (export JSON)
      │   └─ [Copy] button (copy to clipboard)
      
3.2.4 Create API Hooks
      ├─ src/api/useDiscovery.ts
      │   ├─ useStartScan()
      │   ├─ useScanStatus()
      │   ├─ useScanResults()
      │   ├─ useGetMappingTemplate()
      │   └─ useGetIntegrations()
      
3.2.5 Create Zustand Store
      ├─ src/stores/discoveryStore.ts
      │   ├─ currentScan (state)
      │   ├─ scanResults
      │   ├─ mappingTemplate
      │   ├─ startScan (action)
      │   ├─ updateScanProgress (action)
      │   └─ setScanResults (action)
      
3.2.6 Styling
      ├─ Use Tailwind + shadcn/ui
      ├─ Dark theme consistent
      ├─ Responsive layout
      └─ Progress indicators + loading states
      
3.2.7 Unit Tests
      ├─ DiscoveryScannerDashboard.test.tsx
      ├─ DiscoveryResultsViewer.test.tsx
      ├─ MappingTemplateViewer.test.tsx
      ├─ useDiscovery hooks tests
      └─ discoveryStore tests
```

**Backend Tasks:** (None new, API already done)

**Checkpoint:** ✅ Can view discovery results in UI

**Definition of Done:**
- Dashboard renders properly
- Scan trigger works
- Results display correctly
- Tables sortable + filterable
- Download mapping template works
- All tests pass

---

## Phase 4: Workflow Engine (Week 5-7)

### **MILESTONE 4.1: Workflow Engine Core**

**Goal:** Parse workflows into structured state graphs

**Backend Tasks:**
```
4.1.1 Implement StateGraphBuilder.cs
      ├─ Input: Workflow entity (from discovery)
      ├─ Output: StateGraph (structured representation)
      │
      ├─ Build graph:
      │   ├─ Create nodes for each state
      │   ├─ Create edges for each transition
      │   ├─ Attach metadata to edges (guards, actions)
      │   ├─ Validate: No orphaned states
      │   └─ Validate: At least one initial state
      │
      ├─ StateGraph entity:
      │   ├─ WorkflowId
      │   ├─ States: { stateId, name, isInitial, isFinal, properties[] }
      │   ├─ Edges: { fromStateId, toStateId, guards, actions }
      │   └─ Metadata: { title, description, totalStates, totalTransitions }
      
4.1.2 Implement GuardConditionParser.cs
      ├─ Parse guard condition string (from M-Files)
      ├─ Example: "approver_name != NULL AND approval_required == true"
      ├─ Extract: Property names, operators, values
      ├─ Return: Structured GuardCondition[] array
      │
      ├─ Handle:
      │   ├─ Property comparisons
      │   ├─ AND/OR logic
      │   ├─ Complex expressions
      │   └─ Special M-Files functions (if any)
      
4.1.3 Implement ActionSequenceBuilder.cs
      ├─ Parse actions from transitions
      ├─ For each action:
      │   ├─ Type: SendEmail, SetProperty, etc.
      │   ├─ Target: Which property gets updated?
      │   ├─ Value: What value is set?
      │   └─ SideEffects: What else happens?
      │
      ├─ Build ActionSequence:
      │   └─ Ordered list of actions for transition
      
4.1.4 Implement CycleDetector.cs
      ├─ Check for circular workflows
      ├─ Example: Draft → Submitted → Draft (cycle)
      ├─ Return: Cycle paths (if any)
      ├─ Use: DFS (Depth-First Search) algorithm
      
4.1.5 Unit Tests
      ├─ StateGraphBuilderTests.cs
      ├─ GuardConditionParserTests.cs
      ├─ ActionSequenceBuilderTests.cs
      └─ CycleDetectorTests.cs
```

**Frontend Tasks:** (None yet, wait for API)

**Checkpoint:** ✅ Workflow engine parses workflows into structures

**Definition of Done:**
- StateGraph structure created
- Guards parsed correctly
- Actions identified
- Cycles detected
- All tests pass

---

### **MILESTONE 4.2: Workflow Visualization (Static, No Animation)**

**Goal:** Display workflow as static diagram (M-Files style + pretty)

**Frontend Tasks:**
```
4.2.1 Create Workflow Visualization Component
      ├─ Simulation/WorkflowSimulationTabs.tsx
      │   ├─ Tab 1: Animation View (placeholder, shows message "Coming in V1.5")
      │   ├─ Tab 2: M-Files View ← THIS IS V1
      │   ├─ Tab 3: Metadata View ← THIS IS V1
      │   └─ Tab 4: JSON Raw
      
4.2.2 Implement M-Files View Tab
      ├─ Simulation/MFilesOriginalView.tsx
      │   ├─ Display original M-Files workflow structure
      │   ├─ Tree view:
      │   │   ├─ Workflow name + GUID
      │   │   ├─ States:
      │   │   │   ├─ State name, ID, isInitial, isFinal
      │   │   │   └─ [Expand] to see properties/prompts
      │   │   │
      │   │   └─ Transitions:
      │   │       ├─ From → To
      │   │       ├─ Guard condition (raw string)
      │   │       └─ Actions (raw)
      │   │
      │   └─ Collapsible sections (not overwhelming)
      
4.2.3 Implement Metadata View Tab
      ├─ Simulation/MetadataView.tsx
      │   ├─ Display structured workflow metadata
      │   ├─ Properties Per State:
      │   │   └─ Table: Property, Type, Usage, Required
      │   │
      │   ├─ Guard Conditions:
      │   │   └─ Parsed guards with property references
      │   │
      │   ├─ Actions:
      │   │   └─ Structured action list
      │   │
      │   ├─ User Prompts:
      │   │   └─ Which properties must user fill?
      │   │
      │   └─ Permissions:
      │       └─ Who can act in each state?
      
4.2.4 Implement JSON Raw Tab
      ├─ Simulation/JsonRawView.tsx
      │   ├─ Pretty-print JSON (use react-json-view library)
      │   ├─ Collapsible sections
      │   ├─ Copy to clipboard button
      │   └─ Download button
      
4.2.5 Create API Hooks
      ├─ src/api/useWorkflow.ts
      │   ├─ useGetWorkflow(workflowId)
      │   ├─ useGetWorkflowDetails(workflowId)
      │   └─ useGetWorkflowMetadata(workflowId)
      
4.2.6 Create Zustand Store
      ├─ src/stores/simulationStore.ts
      │   ├─ currentWorkflow
      │   ├─ workflowDetails
      │   ├─ setCurrentWorkflow
      │   └─ setWorkflowDetails
      
4.2.7 Integration with Dashboard
      ├─ Add "View Workflow" link from Discovery results
      ├─ Navigate to Workflow Simulation component
      ├─ Load selected workflow
      ├─ Display all tabs
      
4.2.8 Unit Tests
      ├─ WorkflowSimulationTabs.test.tsx
      ├─ MFilesOriginalView.test.tsx
      ├─ MetadataView.test.tsx
      ├─ JsonRawView.test.tsx
      └─ useWorkflow hooks tests
```

**Backend Tasks:**
```
4.2.1 Create WorkflowController.cs
      ├─ GET /api/v1/workflow/{workflowId}
      │   └─ Get workflow definition (M-Files structure)
      │
      ├─ GET /api/v1/workflow/{workflowId}/details
      │   └─ Get state graph + metadata
      │
      ├─ GET /api/v1/workflow/{workflowId}/metadata
      │   └─ Get properties, guards, actions (detailed)
      │
      └─ GET /api/v1/workflow/{workflowId}/raw
          └─ Get complete JSON
      
4.2.2 Create WorkflowService
      ├─ Retrieves workflow from database
      ├─ Builds state graph
      ├─ Extracts metadata
      └─ Returns formatted responses
```

**Checkpoint:** ✅ Can view workflows in 4 different ways

**Definition of Done:**
- All tabs render correctly
- M-Files view matches original structure
- Metadata view is clear + readable
- JSON raw is pretty-printed
- All tests pass
- Ready for Documentation Engine

---

## Phase 5: Documentation Engine (Week 6-7)

### **MILESTONE 5.1: Documentation Generator (Backend)**

**Goal:** Generate SOPs and guides from discovered vault structure

**Backend Tasks:**
```
5.1.1 Create DocumentationEngine project

5.1.2 Implement SOPGenerator.cs
      ├─ For each workflow:
      │   ├─ Generate SOP (step-by-step procedure)
      │   ├─ Include: States, transitions, guards, actions
      │   ├─ Format: Markdown
      │   └─ Store: In database
      │
      ├─ Example output:
      │   ```
      │   # Document Approval Procedure
      │   
      │   ## Step 1: Initial Submission (Draft → Submitted)
      │   - Document must be in Draft state
      │   - User must be the document author
      │   - Action: Set submission_date = TODAY()
      │   
      │   ## Step 2: Manager Review (Submitted → Approved/Rejected)
      │   - Guards: Manager must be assigned to document
      │   - Manager reviews document
      │   - Manager clicks: Approve or Reject
      │   - Action: Send email to requester
      │   ```
      
5.1.3 Implement OnboardingGuideGenerator.cs
      ├─ Create human-friendly onboarding guide
      ├─ For business users (non-technical)
      ├─ Include: Workflow overview, common tasks
      ├─ Format: Markdown + HTML
      
5.1.4 Implement IntegrationMapGenerator.cs
      ├─ Generate documentation of all integrations
      ├─ For each integration point:
      │   ├─ What it does
      │   ├─ Which workflows use it
      │   ├─ Where to find it in M-Files
      │   └─ How to configure it
      
5.1.5 Implement StateFlowDiagramGenerator.cs
      ├─ Generate Mermaid diagram of workflow states
      ├─ Example Mermaid output:
      │   ```
      │   stateDiagram-v2
      │       [*] --> Draft
      │       Draft --> Submitted: Submit
      │       Submitted --> Approved: Approve
      │       Submitted --> Draft: Reject
      │       Approved --> Published: Publish
      │       Published --> [*]
      │   ```
      ├─ Render in frontend as SVG
      
5.1.6 Create Documentation Entities
      ├─ Documentation.cs
      │   ├─ DocId
      │   ├─ Title
      │   ├─ Type (SOP, Onboarding, IntegrationMap, etc.)
      │   ├─ Content (Markdown)
      │   ├─ GeneratedAt
      │   └─ ScanId (which discovery scan created this)
      
5.1.7 Unit Tests
      ├─ SOPGeneratorTests.cs
      ├─ OnboardingGuideGeneratorTests.cs
      ├─ IntegrationMapGeneratorTests.cs
      └─ StateFlowDiagramGeneratorTests.cs
```

**Frontend Tasks:** (Wait for API)

**Checkpoint:** ✅ Can generate documentation from workflows

**Definition of Done:**
- SOPs generated correctly
- Onboarding guides readable
- Integration maps complete
- Diagrams render properly
- All tests pass

---

### **MILESTONE 5.2: Documentation Viewer (Frontend)**

**Goal:** Display generated documentation in UI

**Frontend Tasks:**
```
5.2.1 Create Documentation Viewer Component
      ├─ Components/Documentation/DocumentationViewer.tsx
      │   ├─ Sidebar: List of all documents
      │   ├─ Main area: Display selected document
      │   ├─ Content rendered as HTML (from Markdown)
      │   ├─ [Download PDF] button
      │   ├─ [Print] button
      │   └─ Search function
      
5.2.2 Implement Document List
      ├─ Components/Documentation/DocumentList.tsx
      │   ├─ Filter by type (SOP, Onboarding, etc.)
      │   ├─ Search by keyword
      │   ├─ Sort by date
      │   └─ Click to view
      
5.2.3 Implement Document Renderer
      ├─ Components/Documentation/DocumentRenderer.tsx
      │   ├─ Convert Markdown to HTML
      │   ├─ Syntax highlighting for code blocks
      │   ├─ Responsive layout
      │   └─ Dark mode support
      
5.2.4 Implement Diagram Renderer
      ├─ Components/Documentation/DiagramViewer.tsx
      │   ├─ Render Mermaid diagrams as SVG
      │   ├─ Allow zoom/pan
      │   ├─ Download as SVG
      │   └─ Use: mermaid library
      
5.2.5 Create API Hooks
      ├─ src/api/useDocumentation.ts
      │   ├─ useGetDocuments()
      │   ├─ useGetDocument(docId)
      │   └─ useDownloadDocumentPDF(docId)
      
5.2.6 Create Zustand Store
      ├─ src/stores/documentationStore.ts
      │   ├─ documents[]
      │   ├─ currentDocument
      │   ├─ setDocuments
      │   └─ setCurrentDocument
      
5.2.7 Integration with Main Layout
      ├─ Add "Documentation" menu item
      ├─ Navigate to Documentation Viewer
      
5.2.8 Unit Tests
      ├─ DocumentationViewer.test.tsx
      ├─ DocumentRenderer.test.tsx
      ├─ DiagramViewer.test.tsx
      └─ useDocumentation hooks tests
```

**Backend Tasks:**
```
5.2.1 Create DocumentationController.cs
      ├─ GET /api/v1/documentation/docs
      │   └─ List all documentation
      │
      ├─ GET /api/v1/documentation/doc/{docId}
      │   └─ Get specific document
      │
      ├─ GET /api/v1/documentation/doc/{docId}/pdf
      │   └─ Download as PDF
      │
      ├─ GET /api/v1/documentation/sops
      │   └─ Get all SOPs
      │
      ├─ GET /api/v1/documentation/onboarding-guide
      │   └─ Get onboarding guide
      │
      └─ GET /api/v1/documentation/integration-map
          └─ Get integration map
      
5.2.2 Create DocumentationService
      ├─ Retrieves documents from database
      ├─ Formats responses
      └─ Handles PDF generation
```

**Checkpoint:** ✅ Can view generated documentation

**Definition of Done:**
- All documents display correctly
- Markdown renders properly
- Diagrams render as SVG
- Download works
- All tests pass

---

## Phase 6: AI Copilot (Week 7-8)

### **MILESTONE 6.1: Copilot Service (Backend)**

**Goal:** Q&A interface over vault structure

**Backend Tasks:**
```
6.1.1 Create ProvisioningAI.Copilot project

6.1.2 Implement ContextRetriever.cs
      ├─ Input: User question (natural language)
      ├─ Retrieve relevant vault data:
      │   ├─ Related object types
      │   ├─ Related properties
      │   ├─ Related workflows
      │   ├─ Related integrations
      │   └─ Related documentation
      ├─ Build context: Structured summary of relevant info
      ├─ Use: Full-text search or semantic search
      └─ Return: Context for AI model
      
6.1.3 Implement PromptBuilder.cs
      ├─ Input: User question + context
      ├─ Build system prompt:
      │   ```
      │   You are an expert M-Files vault consultant.
      │   You answer questions about the Conformity vault.
      │   Here is relevant vault structure information:
      │   [context]
      │   
      │   User question: [question]
      │   
      │   Provide clear, concise answer.
      │   Cite specific vault elements (workflows, properties, etc).
      │   ```
      ├─ Return: System prompt + user prompt
      
6.1.4 Implement AI Provider Abstraction
      ├─ IAiProvider.cs (interface)
      │   └─ SendQuery(systemPrompt, userPrompt): Task<response>
      │
      ├─ ClaudeProvider.cs (Anthropic SDK)
      │   ├─ Call claude-sonnet-4-6 via API
      │   ├─ Handle tokens, rate limits
      │   └─ Return response + token count
      │
      ├─ OpenAiProvider.cs (OpenAI SDK)
      │   ├─ Call GPT-4 via API
      │   └─ Handle tokens, rate limits
      │
      └─ GlmProvider.cs (Baidu GLM)
          ├─ Custom HTTP client (GLM API)
          └─ Handle responses
      
6.1.5 Implement ResponseValidator.cs
      ├─ Check: Does response cite vault elements?
      ├─ Check: Are citations accurate?
      ├─ Check: Does response answer the question?
      ├─ Return: ValidationResult (score 0-100)
      ├─ If low score: Return error + ask AI to try again
      
6.1.6 Implement PermissionChecker.cs
      ├─ Input: User, Question, Response
      ├─ Check: Can this user see these vault elements?
      ├─ Example: User doesn't have access to Finance_Access ACL
      │   → Don't show those details in response
      ├─ Enforce: User can only see what they have permission for
      
6.1.7 Create Copilot Entities
      ├─ CopilotQuery.cs
      │   ├─ QueryId
      │   ├─ UserId
      │   ├─ Question
      │   ├─ RetrievedContext
      │   ├─ CreatedAt
      │   └─ Status (pending, answered, failed)
      │
      ├─ CopilotResponse.cs
      │   ├─ ResponseId
      │   ├─ QueryId
      │   ├─ Response (answer)
      │   ├─ Citations (vault elements referenced)
      │   ├─ ConfidenceScore
      │   ├─ AiProvider (Claude, OpenAI, GLM)
      │   ├─ TokensUsed
      │   └─ CreatedAt
      
6.1.8 Unit Tests
      ├─ ContextRetrieverTests.cs (mock database)
      ├─ PromptBuilderTests.cs
      ├─ ResponseValidatorTests.cs
      ├─ PermissionCheckerTests.cs
      └─ AI Provider Tests (with mocks)
```

**Frontend Tasks:** (Wait for API)

**Checkpoint:** ✅ Copilot service ready

**Definition of Done:**
- Context retrieval works
- Prompt building works
- AI providers callable
- Response validation works
- Permission checking works
- All tests pass

---

### **MILESTONE 6.2: Copilot Chat Interface (Frontend)**

**Goal:** Chat UI for asking vault questions

**Frontend Tasks:**
```
6.2.1 Create Copilot Chat Component
      ├─ Components/Copilot/ChatInterface.tsx
      │   ├─ Chat history (messages)
      │   ├─ Input field (user types question)
      │   ├─ [Send] button
      │   ├─ Message bubbles (user + AI)
      │   ├─ Loading indicator
      │   └─ Error messages
      
6.2.2 Implement Message Display
      ├─ Components/Copilot/ResponseDisplay.tsx
      │   ├─ AI response text
      │   ├─ Citations (references to vault elements)
      │   ├─ Confidence score
      │   ├─ [View Details] link (links to vault elements)
      │   └─ [Copy] button (copy response to clipboard)
      
6.2.3 Implement Citation Viewer
      ├─ Components/Copilot/CitationViewer.tsx
      │   ├─ When user clicks citation:
      │   │   ├─ Show vault element details
      │   │   ├─ Example: Click "Document Approval workflow" →
      │   │   │   Show workflow structure + states + transitions
      │   │   └─ Example: Click "approver_name property" →
      │   │       Show property definition + usage
      │   └─ Modal or side panel
      
6.2.4 Create API Hooks
      ├─ src/api/useCopilot.ts
      │   ├─ useSubmitQuery(question)
      │   ├─ useGetQueryStatus(queryId)
      │   ├─ useGetResponse(queryId)
      │   └─ useChatHistory()
      
6.2.5 Create Zustand Store
      ├─ src/stores/copilotStore.ts
      │   ├─ messages[] (chat history)
      │   ├─ isLoading
      │   ├─ currentQuery
      │   ├─ addMessage
      │   ├─ updateMessage
      │   └─ clearHistory
      
6.2.6 Styling
      ├─ Chat bubble styling (user vs AI)
      ├─ Typing indicator animation
      ├─ Citation links (highlighted)
      ├─ Responsive layout (mobile-friendly)
      └─ Dark mode support
      
6.2.7 Integration with Main Layout
      ├─ Add "Copilot" menu item
      ├─ Navigate to Chat Interface
      ├─ Display chat history
      
6.2.8 Unit Tests
      ├─ ChatInterface.test.tsx
      ├─ ResponseDisplay.test.tsx
      ├─ CitationViewer.test.tsx
      ├─ useCopilot hooks tests
      └─ copilotStore tests
```

**Backend Tasks:**
```
6.2.1 Create CopilotController.cs
      ├─ POST /api/v1/copilot/query
      │   ├─ Input: { question }
      │   └─ Returns: { queryId, status }
      │
      ├─ GET /api/v1/copilot/query/{queryId}
      │   └─ Get query status (pending/answered/failed)
      │
      ├─ GET /api/v1/copilot/query/{queryId}/response
      │   └─ Get response (answer + citations)
      │
      ├─ GET /api/v1/copilot/history
      │   └─ Get chat history
      │
      └─ DELETE /api/v1/copilot/history
          └─ Clear chat history
      
6.2.2 Create CopilotService
      ├─ Orchestrates query → response flow
      ├─ Manages query state
      ├─ Calls ContextRetriever
      ├─ Calls PromptBuilder
      ├─ Calls AI Provider
      ├─ Calls ResponseValidator
      ├─ Checks Permissions
      └─ Stores in database
```

**Checkpoint:** ✅ Can ask vault questions + get AI answers

**Definition of Done:**
- Chat interface works
- Send question → get answer
- Citations work and are clickable
- Chat history persists
- Error handling robust
- All tests pass

---

## Phase 7: Integration & Testing (Week 8-9)

### **MILESTONE 7.1: End-to-End Integration**

**Goal:** All modules working together

**Tasks:**
```
7.1.1 Integration Testing
      ├─ Discovery → Database
      ├─ Discovery → Mapping Template
      ├─ Database → Workflow Engine
      ├─ Workflow Engine → Visualization
      ├─ Workflow Engine → Documentation
      ├─ Database → Copilot Context
      └─ Copilot → AI Providers
      
7.1.2 Full Workflow Test
      ├─ 1. Run discovery on Conformity
      ├─ 2. Verify all data in database
      ├─ 3. View discovery results in UI
      ├─ 4. View mapping template
      ├─ 5. View workflow simulation (M-Files + Metadata tabs)
      ├─ 6. Read generated documentation
      ├─ 7. Ask copilot a question
      ├─ 8. Verify answer + citations
      └─ Each step must succeed
      
7.1.3 Performance Testing
      ├─ Discovery scan time (target: < 5 min for Conformity)
      ├─ Database query times (target: < 500ms)
      ├─ API response times (target: < 1 sec)
      └─ AI response times (target: < 30 sec)
      
7.1.4 Error Handling Testing
      ├─ Vault offline → graceful error
      ├─ API timeout → retry + user message
      ├─ AI provider failure → fallback or error message
      ├─ Database failure → error message
      └─ Invalid input → validation + user message
```

**Checkpoint:** ✅ All systems integrated and working

**Definition of Done:**
- Full workflow succeeds
- All error cases handled
- Performance acceptable
- UI responsive
- No crashes

---

### **MILESTONE 7.2: Performance Optimization**

**Goal:** Fast, responsive application

**Tasks:**
```
7.2.1 Database Optimization
      ├─ Add indexes (frequently queried columns)
      ├─ Query optimization (LINQ to SQL best practices)
      ├─ Connection pooling tuned
      └─ Measured: Before/after query times
      
7.2.2 Frontend Optimization
      ├─ Code splitting (lazy load pages)
      ├─ Image optimization
      ├─ Bundle size analysis + reduction
      ├─ Measured: Before/after bundle size
      
7.2.3 API Optimization
      ├─ Response caching (react-query)
      ├─ Pagination (for large result sets)
      ├─ Compression (gzip)
      └─ Measured: Before/after response times
      
7.2.4 Discovery Optimization
      ├─ Parallel scanning (where possible)
      ├─ Incremental updates (only changed objects)
      └─ Measured: Before/after scan time
```

**Checkpoint:** ✅ Application is fast + responsive

**Definition of Done:**
- All pages load < 2 seconds
- Database queries < 500ms
- API responses < 1 second
- Smooth animations + transitions
- No jank or stuttering

---

## Phase 8: Documentation & Deployment (Week 9-10)

### **MILESTONE 8.1: Internal Documentation**

**Tasks:**
```
8.1.1 Developer Documentation
      ├─ Setup guide (how to run locally)
      ├─ Architecture overview (module interactions)
      ├─ API documentation (Swagger/OpenAPI)
      ├─ Database schema documentation
      ├─ Configuration guide
      └─ Troubleshooting guide
      
8.1.2 Code Documentation
      ├─ Inline comments for complex logic
      ├─ XML doc comments for public APIs
      ├─ README files in each project
      └─ Example code snippets
```

**Checkpoint:** ✅ Developer can onboard easily

---

### **MILESTONE 8.2: User Documentation**

**Tasks:**
```
8.2.1 User Guide
      ├─ Getting started
      ├─ Feature overview
      ├─ How to use Discovery
      ├─ How to view workflows
      ├─ How to read documentation
      ├─ How to use Copilot
      └─ FAQ + troubleshooting
      
8.2.2 Video Tutorials (Optional)
      ├─ 2-minute overview
      ├─ Discovery walkthrough
      ├─ Workflow visualization walkthrough
      └─ Copilot usage walkthrough
```

**Checkpoint:** ✅ User can use ProvisioningAI without help

---

### **MILESTONE 8.3: Deployment**

**Tasks:**
```
8.3.1 Local Development Environment
      ├─ Docker compose (backend + database)
      ├─ React dev server
      ├─ Electron dev mode
      └─ All services running locally
      
8.3.2 Staging Environment
      ├─ Deploy backend to staging server
      ├─ Deploy frontend to staging
      ├─ Test against staging M-Files vault
      ├─ Performance testing
      └─ User acceptance testing
      
8.3.3 Production Environment
      ├─ Final code review
      ├─ Security audit
      ├─ Performance verification
      ├─ Deploy to production
      └─ Monitor + gather feedback
```

**Checkpoint:** ✅ ProvisioningAI V1 live and working

---

## Summary: V1 Development Roadmap

```
Phase 1 (Wk 1-2): Foundation
├─ M-Files Connectors ✓
└─ SQLite Database ✓

Phase 2 (Wk 2-4): Discovery Engine
├─ Vault Scanner ✓
├─ Workflow Scanner ✓
├─ Integration Points Finder ✓
└─ Mapping Template Generator ✓

Phase 3 (Wk 4-6): Discovery API + Frontend
├─ Discovery REST API ✓
└─ Discovery Dashboard ✓

Phase 4 (Wk 5-7): Workflow Engine
├─ Workflow Engine Core ✓
└─ Workflow Visualization (Static) ✓

Phase 5 (Wk 6-7): Documentation Engine
├─ Documentation Generator ✓
└─ Documentation Viewer ✓

Phase 6 (Wk 7-8): AI Copilot
├─ Copilot Service ✓
└─ Copilot Chat Interface ✓

Phase 7 (Wk 8-9): Integration & Testing
├─ End-to-End Integration ✓
└─ Performance Optimization ✓

Phase 8 (Wk 9-10): Documentation & Deployment
├─ Developer Documentation ✓
├─ User Documentation ✓
└─ Deployment ✓

TOTAL: ~10 weeks, ~40 tasks
```

---

## Using This Roadmap: Divide & Conquer Approach

### Strategy 1: Sequential (One Task at a Time)
```
Start with Phase 1, Task 1
↓ (when done)
Move to Phase 1, Task 2
↓ (when done)
Move to Phase 2, Task 1
... etc
```

**Pros:** Simple, no context switching, clear progress  
**Cons:** Longer total time (sequential)  

### Strategy 2: Parallel (Multiple Tasks Simultaneously)
```
Frontend Developer:
├─ Phase 3: Discovery Dashboard (Wk 4-6)
└─ Phase 4: Workflow Visualization (Wk 5-7)

Backend Developer 1:
├─ Phase 2: Discovery Engine (Wk 2-4)
└─ Phase 3: Discovery API (Wk 4-6)

Backend Developer 2:
├─ Phase 4: Workflow Engine (Wk 5-7)
└─ Phase 5: Documentation Engine (Wk 6-7)

Backend Developer 3:
├─ Phase 6: AI Copilot (Wk 7-8)
└─ Phase 7: Integration (Wk 8-9)
```

**Pros:** Faster total time (parallel), team stays busy  
**Cons:** More coordination needed, integration risks  

**RECOMMENDED:** Hybrid approach
```
Phase 1 + Phase 2: Sequential (foundation must be solid)
Phase 3, 4, 5, 6: Parallel (with integration checkpoints)
Phase 7, 8: Sequential (integration + deployment)
```

---

## Next Step: Choose Your Development Team

**What we need:**

```
Minimum (1 team, 6-month timeline):
├─ 1 Full-stack developer (C# + React)
│   └─ Handles everything (slower, but thorough)

Recommended (2 teams, 3-month timeline):
├─ 1 Backend developer (C#/.NET)
│   ├─ Phase 1-2-3: Discovery Engine + API
│   ├─ Phase 4: Workflow Engine
│   └─ Phase 6: Copilot Service
│
└─ 1 Frontend developer (React)
    ├─ Phase 3: Discovery Dashboard
    ├─ Phase 4: Workflow Visualization
    ├─ Phase 5: Documentation Viewer
    └─ Phase 6: Copilot Chat

Ideal (4 teams, 2-3 month timeline):
├─ 1 Backend Lead (Architecture + M-Files)
├─ 2 Backend Developers (Discovery + Workflow/Copilot)
├─ 1 Frontend Developer (UI/UX)
└─ 1 QA/Tester (Testing + performance)
```

---

## Ready to Start?

**When you're ready to begin:**

1. ✅ Review this roadmap with your team
2. ✅ Decide on team structure
3. ✅ Assign tasks to developers
4. ✅ Start with Phase 1, Milestone 1.1
5. ✅ Use this roadmap as your sprint backlog

**Each milestone has:**
- Clear tasks
- Definitions of done
- Testing criteria
- Integration checkpoints

**This is your development blueprint.** 🚀

Ready to build ProvisioningAI V1?
