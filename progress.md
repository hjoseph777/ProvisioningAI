<!-- markdownlint-disable-file -->

# ProvisioningAI V1 Development Progress

**Project:** ProvisioningAI (Vault Provisioning Automation Platform)  
**Phase:** V1 (Discovery + Documentation + Workflow Engine + Structured Index)  
**Last Updated:** 2026-08-16  
**Repository:** [REPO_LINK]  
**Team:** [TEAM_SIZE] developers  

---

## Project arc (three stages)
  V1   Investigate & Document — IN PROGRESS (read-only)
  V1.5 Diff & Verify          — planned (read-only bridge; becomes V2's
                                plan preview)
  V2   Automate Onboarding    — planned (rewire native clone via
                                plan/apply; writes gated)

## Connection roadmap (I-IV; renumbered 2026-08-10 — see note below)

RENUMBERING NOTE (2026-08-10): "Connection III" previously meant TriggerBridge
(the VAF add-on effort below). It has been renamed to Connection IV, reusing
the slot vacated when the original Connection IV (Approbation Receiving Side)
was folded into Connection II on 2026-08-04 -- no content lost, purely a label
change, applied visibly per this project's own correction discipline rather
than silently. "Connection III" now names a new, different capability: the
Workflow/Mermaid Pipeline, given priority-1 status this session (see the
dated decision entry below the four Connection write-ups). TriggerBridge's
own scope, prerequisites, and sequencing note are unchanged by this renumber
-- only the Roman numeral changed.

  Connection I  Conformity Core Mechanism — COMPLETE (milestone achieved)
    Config-write mechanism proven end-to-end: NVS config write -> reload ->
    live behavior change -> cross-vault handoff reaches the Approbation vault
    boundary. A real invoice, driven by real transitions
    (CheckOut->SetProperty->CheckIn), fired MoveToApproval, enqueued the task,
    and reached dev Approbation ({281953C0-...}).
    Milestone, not closure: Conformity work continues in Connection II.
    Existing Connection I findings remain the foundation: real-transition
    mechanism, FindDuplicates enqueue proof, silent-logging bug + EventLog
    workaround, MFServer restart/reload requirement, byte-faithful NVS writes,
    and self-maintained audit logging requirement.

  Connection II Full End-to-End Programmatic Run — COMPLETE for its actual
    mandate (2026-08-06)
    CORRECTED DEFINITION (2026-08-04) -- supersedes the "Conformity
    Refinement" scope this entry previously carried (kept below, not
    dropped). Goal: drive a real invoice programmatically through the
    ENTIRE Conformity workflow, intake through successful landing in
    Approbation -- a complete clean run, not just the mechanism proven in
    isolation. ABSORBS what was previously scoped as a separate Connection
    IV (Approbation receiving side) -- see that entry's retirement note
    below; a full end-to-end run inherently requires the handoff to
    complete, so there is no separate receiving-side phase after this one.

    CLOSURE (2026-08-06): Connection II's actual mandate -- prove the
    config-write mechanism works end-to-end (write -> reload -> live
    behavior change -> object reaches the Approbation boundary via a real
    trigger) -- is proven, conclusively (Connection I, 2026-08-02). The
    reason the handoff has never been observed COMPLETING (landing in
    Approbation) is now explained: Vault Toolbox's task processor cannot
    authenticate to the vault at all, for any task type -- a distinct
    environmental/credential failure, OUT OF SCOPE for this phase. See
    "Root-cause finding: Vault Toolbox task processor authentication
    failure (2026-08-06)" below and skills.md's matching skill entry for
    full evidence. Connection II's scope is NOT reopened to fix this --
    the authentication failure is logged as a standalone finding, not
    folded into Connection II, III, or IV.

    Two known blockers, both defined tasks, not open unknowns -- blocker
    (a) remains open; blocker (b) is now EXPLAINED (root cause identified,
    not yet fixed) rather than an open unknown:
    (a) State-114 SQL dependency. SQL Query Vault Application's OWN
        connection config still targets TERGOS-MFILES01\SQLEXPRESS -- a
        separate layer from the six object-type External DB Connections
        already repointed to local dev SQL (same underlying task as this
        entry's superseded first bullet, below). Object 5427 died at state
        114 (WORKFLOW_ERREUR, SQLQueryFAIL) because of this. A clean full
        run needs this repointed via the proven NVS config-write mechanism,
        or the vendor lookup otherwise satisfied. STILL OPEN, untouched by
        this session's finding.
    (b) Cross-vault handoff completion. Reaching Approbation's vault
        boundary is proven (Connection I); landing is not -- ToolsBoxQueryDone
        never flipped to "yes" on any test object (5427, 5428, 5429, 5430,
        5431, each individually checked and confirmed empty). Requires the 5
        destination GUIDs (Vault, Object type, Class, Workflow, Workflow
        State entry-point) and 14 destination property aliases to correctly
        resolve in the target Approbation. Conformity-side config only: read
        Approbation's real GUIDs, write them into Conformity's MoveToApproval
        config via SetNamedValues, reload, verify aliases. Approbation's
        structure is the fixed reference; Conformity is wired to point at it.
        Full model in skills.md's cross-vault handoff model entry.
        ROOT CAUSE NOW IDENTIFIED (2026-08-06): the GUID/alias config itself
        was never the problem -- Vault Toolbox's task processor fails to
        authenticate before it can act on ANY config, correct or not. Fixing
        this is a credential/service-account investigation, not a config-write
        task, and sits outside Connection II's mandate.

    Success criterion: a programmatically-created invoice traverses all
    Conformity states AND lands natively in Approbation, confirmed by
    ToolsBoxQueryDone = "yes" on the source object and the object's
    presence in Approbation. NOT YET MET end-to-end (blocker (a) still
    open, blocker (b)'s fix -- the authentication failure -- still
    undiagnosed) -- but the mechanism Connection II exists to prove is
    proven, and the obstacle to the remaining unmet criterion is now a
    named, external, out-of-scope problem rather than an open unknown.

    SUPERSEDED scope (previous Connection II definition, retained for
    record, not dropped -- revisit after the E2E run above is proven, or
    fold into Connection IV/streamlining as appropriate -- renumbered from
    "Connection III" 2026-08-10, see the roadmap renumbering note above):
    repoint SQL
    Query Vault Application's own connection config (now folded into
    blocker (a) above); sweep native state actions for hardcoded
    customer-specific literals (e.g. Company = "Tergos Construction");
    validate all six object-type External DB Connections; continue
    workflow understanding/cleanup tied to provisioning relevance.

  Connection III Workflow/Mermaid Pipeline — ACTIVE, PRIORITY 1 (2026-08-10)
    NEW this session -- first time this capability is formally recorded in
    progress.md, skills.md, CLAUDE.md, the PRD, or the roadmap; the work
    itself (MfilesProperties.md/.html, the property cross-reference,
    MFilesPropertiesMap.xlsx) predates this entry but was never previously
    cross-referenced into these five documents.
    Goal: design an M-Files workflow visually via Mermaid (hand-drawn or
    AI-drafted from a plain-language description), refine it through an
    interactive editor, and export it into a real M-Files workflow via COM
    -- and the reverse (read an existing M-Files workflow out as a Mermaid
    diagram).
    Why priority 1 over the vault-template capability (full reasoning in the
    dated decision entry immediately below this roadmap section): the
    reference document (MfilesProperties.md) is mature -- multiple
    correction/verification passes including an independent third-party
    (Qwen) structuring audit, four confirmed gaps fixed against verified
    vendor citations -- the BPMN<->Mermaid mapping and the §3.5 round-trip
    labeling convention are both written and self-consistent, and a full
    worked example (§6) has been validated on paper end-to-end.
    Architecture, as given for this recording pass -- NOT independently
    verified against a prior design document, because none was found
    anywhere in this project during a full-text search; treat as
    provisional until a real source is linked or the design is re-derived
    on its own terms:
      Mermaid (unmodified) -> sidecar config -> style/edit layer ->
      translator/validator -> COM emitter -> vault
    Six layers as stated, not seven -- the "seven-layer stack" description
    this priority call was framed with names six; flagged rather than a
    seventh layer invented to make the count match.
    Not yet built: the interactive click-to-edit popup UI, the
    translator/validator, the COM emitter. Concretely: MfilesProperties.md
    §3.5's labeling convention is the translator/validator's spec, not its
    implementation; §6's worked example is a paper trace of what the
    translator should produce, not a running program.

    SUPERSEDED (2026-08-11 -- 2026-08-12): the translator/validator is no
    longer "not yet built" -- see the dated entry below ("Translator/
    Validator + Plan Renderer built..."). Still not built as of that entry:
    the interactive click-to-edit popup UI and the COM emitter. Milestone 8
    (GUI integration into the existing Workflow Studio) was added to the
    roadmap in the same pass -- see V1_DEVELOPMENT_ROADMAP.md's Connection
    III table.

  Connection IV TriggerBridge — MAJOR MILESTONE (future)
    RENUMBERED from Connection III to Connection IV, 2026-08-10 -- see the
    renumbering note at the top of this roadmap section. No content below
    changed, only the Roman numeral.
    Build the VAF add-on that consolidates trigger/flag-setting logic and
    simplifies workflow behavior. This phase explicitly builds on Connection I's
    proven NVS config-write and VAF mechanisms.
    Target baseline: original Conformity lineage ({F542FB91-...}), not v3.0.
    Prerequisites and implementation design will be scoped at phase start.
    Sequencing note (2026-08-04): TriggerBridge IS the streamlining effort --
    the earlier Stage A rubric found only ~19% of states safely touchable in
    isolation, so the real lever is consolidating the flag-setting/
    direct-assignment logic TriggerBridge targets, not ad hoc per-state
    edits. Connection II's proven end-to-end run supplies the correctness
    baseline TriggerBridge needs to validate a consolidated version against
    -- clean baseline first (II), then streamline against it. Scope of
    this phase is otherwise unchanged by this note or by the 2026-08-10
    renumbering.

  Approbation Receiving Side (retired, formerly "Connection IV")
    Retired as a standalone phase 2026-08-04 -- folded into Connection II
    blocker (b) above -- a full end-to-end run inherently requires the
    handoff to complete, so this was no longer a separate later phase.
    NOTE (2026-08-10): this used the numeral IV until today; IV has since
    been reassigned to TriggerBridge (renumbered from III, see above) since
    this entry is retired, not active, and doesn't need to hold a live slot.
    Do not confuse this retired entry with the current Connection IV.
    Technical detail retained, not lost: the 5-GUID/14-alias handshake
    model now lives in Connection II blocker (b) and in skills.md's
    cross-vault handoff model entry. The {224668EF-...} "Vault application
    not found" lead remains logged as a separate, unrelated
    background-pattern observation, NOT a root cause (skills.md, "Open
    observation" entry, 2026-08-02) -- unaffected by this refiling.

Roadmap framing: Connection I answers the feasibility questions. Connection
II, built directly on Connection I's proven mechanism, is now CLOSED for
its actual mandate (2026-08-06) -- the config-write-to-live-behavior
mechanism is proven end-to-end; its remaining unmet success criterion
(a fully landed object in Approbation) is blocked by two named, external
issues (state-114 SQL dependency, still open; Vault Toolbox task-processor
authentication failure, root-caused but undiagnosed/unfixed), neither of
which reopens Connection II's own scope. Connection III (Workflow/Mermaid
Pipeline) is the active priority-1 near-term goal as of 2026-08-10.
Connection IV (TriggerBridge, renumbered from III) remains a real future
milestone, sequenced after III per the reasoning in the dated decision
entry below, not dropped. The vault-template/customize-on-the-fly
capability (Connections I/II groundwork -- SQL consolidation, object
connection repointing, the byte-faithful config-write mechanism) is
explicitly deprioritized behind Connection III for the reasoning in that
same entry, tracked as a real future capability, not deleted or forgotten,
and does not yet have its own Connection number -- it has not been scoped
as a defined tool/spec, only as scattered findings from Connections I/II.
The original framing below (Connection III/TriggerBridge as "both the
major-milestone streamlining phase and the natural follow-on") predates
today's renumbering and priority call and is superseded by the paragraph
above, kept for record rather than deleted:

Connection IV (TriggerBridge) is
both the major-milestone streamlining phase and the natural follow-on, now
building against a closed, proven-correct Connection II baseline.

## Decision (2026-08-10): Workflow/Mermaid pipeline is priority 1, vault template is priority 2

Two distinct future capabilities were evaluated and an explicit priority
call was made. Recorded here plainly so a future session doesn't need to
re-derive the reasoning; mirrored in roadmap.md, prd.md, skills.md, and
CLAUDE.md as of the same date.

**Priority 1 -- Workflow/Mermaid pipeline (Connection III, this session's
renumbering above).** Design an M-Files workflow visually via Mermaid
(hand-drawn or AI-drafted from a plain-language description), refine it
through an interactive editor, export it into a real M-Files workflow via
COM -- and the reverse (read an existing M-Files workflow out as Mermaid).

**Priority 2 -- Vault template / "customize on the fly" (builds on
Connections I/II).** Import an existing vault's full structure (SQL
schema, ACLs, class/property definitions, object-type connections) as a
reusable template, then rapidly customize it for a new customer/deployment
-- rather than repeating the full manual discovery-and-build process each
time.

**These are different capabilities, not one bigger than the other --
stated plainly because this session's own conversation initially conflated
them before the distinction was clarified:** the workflow pipeline solves
"design or modify logic itself"; the vault template solves "replicate and
adapt something that already exists." They share underlying mechanisms
(the proven COM/NVS config-write path from Connection I) but are separate
features with separate scopes. **Full-vault-import does NOT make workflow
design easier -- it's the wrong tool for inventing a new process from
nothing. It's the right tool for onboarding a new customer onto a proven,
existing template.**

**Why priority 1 over priority 2 -- the reasoning, not just the ranking:**
- Workflow/Mermaid pipeline is the more attainable near-term goal.
  MfilesProperties.md is mature: multiple correction/verification passes,
  including an independent third-party (Qwen) structuring audit that found
  four real gaps (G1-G4), all fixed against verified vendor citations, not
  guesses. The architecture is designed (six layers, as recorded in the
  Connection III entry above -- flagged there as not independently
  verified against a prior design document, since none was found in this
  project). A full worked example (§6) has been validated on paper,
  including where it's lossless and where it required a judgment call.
  What's missing is enumerated and small: the interactive click-to-edit
  popup UI, the translator/validator, the COM emitter.
- Vault template's groundwork is real but genuinely unscoped, not just
  "less far along." SQL consolidation, object-type connection repointing,
  and the byte-faithful NVS config-write mechanism (Connection I) are
  hard-won, live-verified facts -- but they exist as scattered findings
  across Connection I/II entries in this file and skills.md, not as a
  defined tool with its own spec, success criterion, or worked example.
  Scoping it properly is itself unstarted work, on top of the build work
  that would follow.
- This is a genuine "which is more ready to build," not "which matters
  more" -- the vault-template capability is deferred, not abandoned (see
  prd.md's Non-Goals section for the explicit "deferred, not abandoned"
  framing).

## Current state
  - Phase 1.2 complete (schema hardened, repositories, 63/63 tests).
  - Both Conformity and Approbation restored and attached in M-Files.
  - Conformity is the active first target for the scanner.
  - Architecture confirmed two-tier: Firebird vault (COM) + SQL Server
    dbo.Company integration layer (SQL). See claude.md §4.4.

## Reference material received
  Vendor training doc (Conformity AP / CP1 / Fusion) received and logged
  in claude.md §4.4.1 and skills.md. Reference only — does not change
  Phase 2.1 scope or the current stage-1 blocker (vault-login
  permissions, pending since before reboot).

## Restore-GUID probe — RESOLVED BY DECISION
  Not testable on the current setup: the attached vaults
  (Conformity_CP1_Tergos, Approbation_Acomba-Construction) are
  independent new-identity restores with no lineage sibling to
  compare against.
  DECISION: scanner keys GUID-first and retains the name-based
  fallback (per claude.md §4.1) rather than collapsing to GUID-only.
  Dual-path strategy handles both copy and restore cases without
  requiring the probe result. See claude.md §2.4 / §4.6.

## Phase 2.1 Stage 1 — Vault Identity — COMPLETE
  VaultIdentityScanner built and live-verified against Conformity.
  Real VaultStructures row written:
    Id           : 1
    VaultGuid    : {008446DF-32AA-4E9C-8C43-9FEC4D0A1203}
    VaultName    : Conformity_CP1_Tergos.mfb
    LastScannedAt: 2026-07-26T18:40:19.7584295Z
  §4.6 foot-gun check (GUID-changed name-cross-check): implemented and
  unit-tested. 68/68 tests passing.

## ".mfb" name — investigated 2026-07-26, NOT a code bug
  Re-ran stage 1 live (real MFilesComConnector + real SQLite
  ProvisioningAiDbContext, not a PowerShell mimic) against the current
  Conformity vault. Same result: VaultName = "Conformity_CP1_Tergos.mfb".
  Confirmed by reading VaultIdentityScanner.cs first: it already sources
  VaultName exclusively from GetOnlineVaults()'s .Name property (via
  IMFilesConnector.ListVaultsAsync) — there is no file-path-reading code
  anywhere in the scanner or connector. Also confirmed via a raw
  GetOnlineVaults() call outside any of our code: M-Files itself returns
  ".mfb" as this vault's real, current Name property.
  CONCLUSION: whoever attached/restored this vault in M-Files Admin left
  it registered under its backup-file-derived name. The scanner is
  faithfully recording the vault's actual name (correct behavior per
  claude.md §4.1 — Name is a mutable label, refresh on every scan, don't
  sanitize it). The only real fix is renaming the vault in M-Files Admin
  itself. §4.6 test fixture's "Conformity_CP1_Tergos.mfb" constant is
  accurate, not stale — left unchanged.

## Phase 2.1 Stage 2 — Value Lists + Value List Items — COMPLETE

  ValueListScanner built and live-verified against Conformity
  ({008446DF-32AA-4E9C-8C43-9FEC4D0A1203}). Logs into the vault via
  IVaultHandle (extended with GetValueListsAsync/GetValueListItemsAsync),
  filters ValueListOperations.GetValueLists() down to RealObjectType=false
  (it mixes real object types and true value lists in one COM collection —
  confirmed live), then reads GetValueListItems() per list. Both entity
  types are upserted inside ONE transaction (GenericRepository gained
  UpsertManyNoTransactionAsync so the scanner can open a single outer
  transaction spanning ValueLists + ValueListItems). ValueList/ValueListItem
  gained Create() factories with the same GuidGuard hardening as every
  other entity (no schema change — these are behavior, not columns).

  CORRECTED 2026-07-26 (same day, before Stage 3 started) — see below.
  Original live run reported 17 value lists / 144 items. User asked how
  ValueListScanner's RealObjectType filter relates to Stage 4's future
  object-type/class enumeration; investigating that surfaced a real bug:
  ValueListOperations.GetValueLists() also returns BUILT-IN vault
  structure (Class, Class group, Version label, Traditional folder,
  External source, User, Workflow, State, User group, State transition,
  Source) at RealObjectType=false — same flag as genuine customer value
  lists. These are claude.md §4.4's OWN LATER stages (classes; workflows/
  states/transitions; users/groups/ACLs), not value lists. Confirmed via
  .NET reflection against the real Interop.MFilesApi.dll (26.6.16115.9):
  every one of those 11 IDs matches M-Files' own MFBuiltInValueList enum
  exactly (documented, stable SDK constants, not vault-specific data).
  Fix: ValueListScanner now also excludes MFilesId values in that enum
  (MFilesBuiltInValueListIds.cs). Nothing was lost — the harness's DB was
  always a deleted temp file, never persisted, so no data migration was
  needed, just a corrected re-run.

  Real output from the CORRECTED live run:
    Value lists scanned      : 6
    Value list items scanned : 6
  All 6 rows (genuine customer-created value lists only):
    XCompany         Guid={325D065B-546D-4729-AD6F-570E6073A49D}   MFilesId=112
    crédit           Guid={4312C191-6511-4C27-98EC-319DC19CBFED}   MFilesId=120
    XDate            Guid={4BC3DDBD-C731-4187-98C5-8BF435757A0B}   MFilesId=107
    découpe          Guid={A4746FDB-0CBB-45E1-A826-B477722847A4}   MFilesId=117
    XtractLearning   Guid={E0493AA8-678C-4268-BC3A-4BFDE8F0AB84}   MFilesId=109
    XCurrency        Guid={F4AAB375-B49A-4493-91D1-D264F4033E85}   MFilesId=108
  Items: crédit has 4 (credit/crédit/note de credit/note de crédit),
  découpe has 2 (N/Y); the other four lists have 0 items.
  77/77 unit tests passing at this point (1 new: confirms a built-in ID
  like Class(1) is excluded even though RealObjectType=false, and that
  GetValueListItemsAsync is never even called for it).

  Open item carried forward, not resolved here: GetValueListItems()'s second
  boolean argument's exact meaning is still unconfirmed (both true/false gave
  identical counts in the one live sample checked) — `true` was used as the
  safer "don't silently exclude anything" default; Deleted on each item is
  what actually distinguishes live vs. removed entries.

## Phase 2.1 Stage 3 — Property Definitions — COMPLETE

  PropertyDefScanner built and live-verified against Conformity. Logs
  into the vault via IVaultHandle (extended with GetPropertyDefsAsync),
  reads PropertyDefOperations.GetPropertyDefs() verbatim — built-in defs
  (Name or title, Created, Last modified, ...) and customer-created ones
  alike, since unlike Stage 2 there's no known later-stage overlap here
  (property definitions are their own single stage in claude.md §4.4).

  Property.IsRequired REMOVED from the schema this session (migration
  DropPropertyIsRequired) — confirmed live via reflection against
  Interop.MFilesApi.dll that PropertyDef has no Required/IsRequired
  member at all; required-ness is a per-CLASS setting (which classes
  require which properties), not a property-definition attribute. Per
  user decision: dropped now, to be modeled as a Class<->Property
  association (e.g. a future ClassProperties table: ClassGuid,
  PropertyGuid, IsRequired) when the classes stage is built.

  Real output from the live run:
    Property definitions scanned: 200
  Sample (first 5 by ID — built-in):
    Name or title      Guid={3E2BB7EB-C49E-4C8C-825C-CAE0AEBA9A06}  MFilesId=0   DataType=1
    Created            Guid={EAB2B9D9-809E-49A5-9FA6-4EA5C2802F8C}  MFilesId=20  DataType=7
    Last modified      Guid={492A908E-02F7-47D1-9ECB-2C5D8F8D0142}  MFilesId=21  DataType=7
  Sample (last 5 by ID — customer-created):
    Check_Credit       Guid={B874BBDE-CA37-4D58-AE13-312D5E13661E}  MFilesId=1165 DataType=1
    SQLQueryFAIL       Guid={C066FF81-5A3A-4121-8B62-C9F022CCD492}  MFilesId=1166 DataType=1
    Projet_No          Guid={E2DAEC56-77F5-4527-B365-526F0B36AE65}  MFilesId=1167 DataType=1
  82/82 unit tests passing (5 new: 1 for VaultHandle's GetPropertyDefsAsync,
  4 for PropertyDefScanner — no live vault required for any of them).

## Phase 2.1 Stage 4 — Object Types & Classes — COMPLETE

  Before building, user asked to confirm RealObjectType==true is a
  COMPLETE and reliable signal for "real object type" (not just "not a
  known built-in value list" — a subtly weaker claim). Verified
  empirically, not just via enum lookup: fetched Conformity's real
  object types TWO independent ways —
    Set A: ValueListOperations.GetValueLists() filtered RealObjectType==true
    Set B: ObjectTypeOperations.GetObjectTypes() (the dedicated COM call)
  Result: EXACT match, 12 entries each, zero IDs in A-not-B or B-not-A,
  zero GUID mismatches (Document, Document collection, Assignment,
  Report, Share, Email, Email Conversation — built-in — plus Vendor,
  Company, Approver, CP1, Conformity — customer-created). Notably
  Vendor/Company/CP1/Conformity all have External=True (genuine
  externally-sourced object types via M-Files' external-repository
  feature) yet RealObjectType still classified them correctly — External
  and RealObjectType are independent flags. CONCLUSION: proceed with the
  shared-collection design (GetValueListsAsync() filtered true), now
  empirically validated rather than assumed. Honest scope limit: this
  reconciles against one vault with 12 real object types; can't rule out
  an edge case elsewhere, but this is the project's standard live-
  verification bar.

  ClassOperations shape confirmed live (GetAllObjectClasses(), 14 classes
  in Conformity): class entries have `.ItemGUID`, NOT `.GUID` (`.GUID` is
  blank on this shape, same gotcha pattern as ValueListItem's ItemGUID
  vs ValueList's GUID). `.ObjectType` is the owning object type's
  NUMERIC ID (e.g. 116 for Approver's class), not its GUID — the
  Class entity's ObjectTypeGuid column needs a resolution step (numeric
  ObjectType ID -> GUID) built from the same scan's object-type results,
  per claude.md §4.1's GUID-first resolution order. No `Required` concept
  visible on this shape either — same absence as PropertyDef.

  ObjectTypeClassScanner built: reuses GetValueListsAsync() filtered
  RealObjectType==true for object types (ObjectType.Create, DisplayName
  from NamePlural — ValueListInfo gained an optional NamePlural field,
  defaulted so Stage 2's existing call sites kept compiling unchanged),
  then GetClassesAsync() for classes, resolving each class's numeric
  ObjectType ID to the matching object type's GUID via a dictionary
  built from this same scan's object-type results. A class referencing
  an ObjectType ID not found in that set throws InvalidOperationException
  rather than writing an unresolved reference — refuses to guess. Both
  entity types upserted in ONE transaction (same UpsertManyNoTransactionAsync
  pattern as Stage 2). Class.cs gained a Create() factory (GuidGuard on
  VaultGuid, Guid, AND ObjectTypeGuid) — it had none before, same gap as
  ValueList/ValueListItem before Stage 2.

  Real output from the live run:
    Object types scanned: 12
    Classes scanned: 14
  All 12 object types (built-in + customer, GUIDs verbatim):
    Document (Documents)        MFilesId=0
    Document collection         MFilesId=9
    Assignment                  MFilesId=10
    Report                      MFilesId=15
    Share                       MFilesId=19
    Email                       MFilesId=20
    Email Conversation          MFilesId=21
    Vendor (Vendors)            MFilesId=106
    Company                     MFilesId=114
    Approver (Approvers)        MFilesId=116
    CP1 (CP1s)                  MFilesId=118
    Conformity                  MFilesId=119
  All 14 classes resolved correctly, e.g. under Document (Guid=
  {53F0C8FD-0BF0-47C4-8FA6-4C2D0DADB650}): Document, Invoices, Other
  document, Trash — 4 classes correctly sharing one ObjectTypeGuid.
  87/87 unit tests passing (5 new: 1 for VaultHandle.GetClassesAsync,
  4 for ObjectTypeClassScanner including the unresolvable-reference
  throw case — no live vault required for any of them).

## Task A — ClassProperty (required/optional rebuild) — COMPLETE (2026-07-27)

  Rebuilt the required/optional fact dropped from Property in Stage 3
  (migration DropPropertyIsRequired) as a Class<->Property association,
  per the plan noted when IsRequired was dropped.

  COM API confirmed via .NET reflection against the installed
  Interop.MFilesApi.dll (26.6.16115.9) BEFORE writing any code — no
  new COM entry point needed. IObjectClass (the same shape
  ClassOperations.GetAllObjectClasses() already returns for Stage 4)
  exposes .AssociatedPropertyDefs, a collection of IAssociatedPropertyDef,
  each with .PropertyDef (numeric property def ID, not GUID) and
  .Required (bool). VaultHandle.GetClassesAsync() was extended to read
  this off the same class COM object already being enumerated
  (ClassInfo gained an optional AssociatedProperties field, defaulted
  so Stage 4's existing call sites kept compiling unchanged) — no
  second COM collection walk.

  New entity ClassProperty (VaultGuid, ClassGuid, PropertyGuid,
  IsRequired), unique index on (VaultGuid, ClassGuid, PropertyGuid), FK
  to both Classes(VaultGuid, Guid) and Properties(VaultGuid, Guid).
  ClassPropertyRepository overrides GenericRepository's MatchEntity
  (same pattern as WorkflowTransitionRepository) since the natural key
  isn't (VaultGuid, Guid). Migration AddClassProperty generated clean —
  schema matches the model exactly.

  ClassPropertyScanner: reads PropertyDefOperations.GetPropertyDefs()
  fresh (same scan) to build a PropertyDef MFilesId->Guid map, then
  resolves each class's AssociatedProperties against it — same
  "refuse to guess" pattern as Stage 4's Class->ObjectType resolution:
  throws InvalidOperationException rather than writing an unresolved
  PropertyGuid if a class associates a property this scan didn't see.

  Test fixture note (same lesson as Stage 2's FK-seeding fix): since
  ClassProperty FKs to both Class and Property, the in-memory-SQLite
  test had to seed real ObjectType + Class + Property rows, not just
  VaultStructure + DiscoveryScan — hit a generic "FOREIGN KEY constraint
  failed" until those were added.

  92/92 unit tests passing (5 new: 4 for ClassPropertyScanner, 1 for
  VaultHandle.GetClassesAsync mapping AssociatedPropertyDefs).

  LIVE-VERIFIED against Conformity ({008446DF-32AA-4E9C-8C43-9FEC4D0A1203})
  via a throwaway console harness (re-ran Stages 1, 3, 4, then Task A in
  sequence against the real persisted provisioning.db — not a mimic),
  deleted after capturing output:
    Stage 1: Updated Conformity_CP1_Tergos.mfb
    Stage 3: 200 property definitions scanned
    Stage 4: 12 object types, 14 classes scanned
    Task A: 242 class<->property associations scanned
  Sample — Invoices class ({72EF6D66-7C2E-4113-B6CA-0AC89C68894E}):
    REQUIRED: Single file, Last modified, Object changed, Last modified
      by, Size on server (all/this version), Marked for archiving,
      DocName, Status changed, Created by, Created
    optional (49 total): Vendor, Purchase Order, Invoice No, CP1-VendorName,
      CP1-VendorID, CP1-VendorAddress, CP1-Learning, CP1-DocumentLink,
      Company, Conformity, Check_Credit, Invoice Date, Total, and more
  Sample — Vendor class ({4DAF2164-B7DD-4BDB-BA34-AD9CA2091EED}):
    REQUIRED: VendorName, VendorID (plus the standard built-ins)
    optional: VendorAddress, VendorCity, VendorZipCode, VendorDisplayName,
      Découpe_Automatique, Automatic conformity ( If yes Bypass )

## Task B — Stage 5: Workflows, States, Transitions — COMPLETE (2026-07-27)

  Overlap question resolved BEFORE writing any scanner code, per
  explicit instruction: confirmed via .NET reflection that
  IVaultWorkflowOperations.GetWorkflowsAsValueListItems() returns the
  exact same ValueListItems COM type Stage 2 already reads. The
  Stage 2 "Workflow" value-list entry (id=7, RealObjectType=false) IS
  a value-list VIEW of the same real workflows — not a duplicate to
  reconcile, since Stage 2 already excludes all built-in IDs (including
  Workflows=7, States=8) and never wrote them to ValueList/ValueListItem.
  Same reconciliation applies to States (id=8). These two built-in
  value lists are how Stage 5 resolves Workflow/State GUIDs — IWorkflow
  and IState expose no .GUID property at all (same gotcha as Class
  needing .ItemGUID). Structure (states, transitions, guard data) comes
  from a separate, complementary source: WorkflowOperations.GetWorkflowsAdmin().

  BLOCKING FINDING, surfaced and resolved before coding (mirrors the
  Property.IsRequired precedent from Stage 3): WorkflowState.IsInitial/
  IsFinal are required non-nullable booleans, but exhaustive reflection
  against the entire Interop.MFilesApi.dll found no Initial/Final/Start/
  Terminal concept anywhere in the COM model (MFStateFlags only has
  None/TechnicalState). Unlike IsRequired, this is a real, undisputed
  fact about any workflow that the SDK simply doesn't expose a flag
  for — user decision: derive it structurally from the transition graph
  scanned in this same stage (no incoming edge = initial, no outgoing
  edge = final), explicitly flagged as heuristic-derived, not
  SDK-confirmed, same honesty standard as IsIntegrationTouching.

  LIVE DATA IMPROVED ON THE HEURISTIC MID-IMPLEMENTATION: user asked
  to check, once real transition data was in, whether Conformity's
  workflow has any transition looping back to its own start state (which
  would misfire the no-incoming-edge heuristic). It does: live run
  surfaced transition MFilesId=56, "Control Duplicate" ->
  "RTE-NewDocument_+_CLEAN_PO" ("1-Fix Value and Restart") — a genuine
  cycle back to the real start state. Investigating this ALSO surfaced
  something stronger than the heuristic: transition MFilesId=177 has
  FromState MFilesId=0, ToState=115 (RTE-NewDocument_+_CLEAN_PO) —
  M-Files' own "workflow entry" marker (M-Files reserves ID 0 as a
  pseudo-state meaning "no state yet"), confirmed by being the ONLY
  transition with FromState=0 in the vault and its target having no
  other prior claim to being "initial." This is authoritative, not a
  guess — used as the PRIMARY signal for IsInitial (falling back to
  the no-incoming-edge heuristic only if a workflow has no such marker
  at all). No ToState=0 (a hypothetical symmetric "exit" marker) was
  observed in this vault, so IsFinal remains heuristic-only. Neither
  marker gets a WorkflowTransition row (no real state to reference on
  one side) — they inform IsInitial/IsFinal only.

  GUARD CONDITIONS STORED VERBATIM, PER THE HARD REQUIREMENT: JSON per
  transition = {triggerMode, triggerInDays, triggerAllowedByVBScript,
  triggerCriteria}. triggerCriteria comes from calling
  SearchConditions.GetAsExportedSearchString(0) — M-Files' OWN textual
  export of its condition object (confirmed real via reflection:
  ISearchConditions.GetAsExportedSearchString(MFSearchFlags)), not our
  interpretation. Real sample output is an opaque encoded string (e.g.
  "04002000001000000R00000100000AG4000..."), not human-readable — exactly
  what "store verbatim, don't interpret" means in practice.

  ACTIONS ARE ALWAYS NULL FOR TRANSITIONS — A VERIFIED FACT, NOT AN
  OMISSION: confirmed live via reflection that M-Files has NO actions
  concept at the transition level at all. Actions (ActionDefinitions,
  9 enabled-flags, typed definitions like ActionSendNotification/
  ActionSetProperties/ActionCreateAssignment) live on the DESTINATION
  STATE's IStateAdmin, not the transition. WorkflowState has no schema
  column to hold this (nor does it have one for Preconditions/
  Postconditions, the real per-state guard data) — flagged as an open
  item pending a schema decision, not captured this stage, consistent
  with the "no new schema beyond what this stage needs" constraint.

  IsIntegrationTouching (NEW column, both WorkflowState and
  WorkflowTransition — the one legitimately new piece of schema this
  stage needed, distinct from the guard/action columns which already
  existed): name-based heuristic, case-insensitive substring match on
  SQL_, UPD_, CP1, ACOMBA, PROCORE, APPRENTISSAGE, LEARNING,
  WAIT_SYNCH_CSV (claude.md §4.4's full list, superset of the task
  brief's own summary).

  101/101 unit tests passing (9 new: 6 for WorkflowScanner's happy
  path/entry-marker-override/integration-flag/error cases, 3 for
  VaultHandle.GetWorkflowsAdminAsync mapping including the exported
  trigger-criteria path).

  LIVE-VERIFIED against Conformity ({008446DF-32AA-4E9C-8C43-9FEC4D0A1203})
  via a throwaway console harness (Stage 1 + Stage 5, real persisted
  provisioning.db), deleted after capturing output:
    Workflows scanned:    1 (Conformity, {476935FC-5926-4BFE-B30F-7A19554E3F3A})
    States scanned:       47
    Transitions scanned:  64
    Integration-touching states:      18
    Integration-touching transitions: 3
  Initial state correctly resolved: RTE-NewDocument_+_CLEAN_PO
    (via the FromState=0 entry marker, overriding what the
    no-incoming-edge heuristic alone would have gotten wrong given the
    real cycle back to it from Control Duplicate).
  Sample verbatim guard conditions (3 of 5 captured):
    RTE_Duplicate -> RTE_NotDuplicate:
      {"triggerMode":4,"triggerInDays":365,"triggerAllowedByVBScript":"",
       "triggerCriteria":"04002000001000000R00000100000AG40000200000000
       00000000000000000800000200000100000000G0000"}
    RTE_NotDuplicate -> Control Invoices:
      {"triggerMode":4,"triggerInDays":365,"triggerAllowedByVBScript":"",
       "triggerCriteria":null}
    RTE_CP1 -> UPD_Learning = YES (IntegrationTouching=true):
      {"triggerMode":4,"triggerInDays":365,"triggerAllowedByVBScript":"",
       "triggerCriteria":"04004000001000000R00000100000UG4000020000000
       000000000000000000800000200000400000000G4000003000000G000000000
       0000000002000000G00001000000004"}
  Integration-touching states (18, name-flagged): UPD_VendorID,
    UPD_DUPLICATE, RTE_CP1, UPD_Learning = YES, UPD_Learning = NO,
    UPD_EXPORT_VENDORLIST, UPD_DUPLICATE2, UPD_To CP1, UPD_CP1,
    WAIT_SYNCH_CSV, Contrôle Apprentissage, UPD_SQL_CP1,
    Fin_UPD_SQL_CP1, UPD__Decoupe_Auto, IN_TO_UPD_CP1, OUT_TO_UPD_CP1,
    RTE_CP1_, WAIT_SQL_RETRY.
  Integration-touching transitions (3): RTE_CP1 -> UPD_Learning = YES,
    RTE_CP1 -> UPD_Learning = NO, Contrôle Apprentissage ->
    RTE_Duplicate2.

## Stage 5 follow-up — WorkflowState guard/actions closed, not left as a gap (2026-07-27)

  User declined to accept the state-level guard/action gap as a
  documented open item: "without action data, the scanner knows a
  state name suggests 'this calls Acomba' but has captured nothing
  about what that call actually contains — the more important half of
  the business-logic evidence Stage 5 exists to gather." Closed in the
  same session, same delivery standard as the rest of Stage 5.

  CONFIRMED STRUCTURED, NOT OPAQUE: IStateAdmin exposes 9 boolean
  action-enabled flags (ActionSetPermissions, ActionDelete,
  ActionMarkForArchiving, ActionAssignToUser, ActionSendNotification,
  ActionSetProperties, ActionRunVBScript, ActionConvertToPDF,
  ActionCreateSeparateAssignment) plus a typed "Definition" object per
  kind (IActionSendNotification, IActionCreateAssignment,
  IActionSetProperties, IActionSetPermissions, IActionConvertToPDF).
  New schema added (WorkflowState.GuardConditions, WorkflowState.Actions,
  both string? JSON, same discipline as WorkflowTransition's columns) —
  migration AddWorkflowStateGuardAndActions.

  EVERY SUB-OBJECT CAPTURED VERBATIM VIA M-FILES' OWN SERIALIZATION,
  NOT OURS: TypedValue.ToJSON() for ActionSetProperties fixed values,
  AccessControlList.GetAsBytes() (Base64-encoded) for
  ActionSetPermissions, SearchConditions.GetAsExportedSearchString()
  for Preconditions/Postconditions property conditions (same as
  transition TriggerCriteria), plain VBScript text fields verbatim.
  Recipient/assignee/property-def IDs recorded as raw numeric IDs, not
  resolved to names — that resolution is Stage 6 (users/groups/ACLs)
  territory, kept out of scope here per the same stage-boundary
  discipline used throughout claude.md §4.4.

  Only read a Definition object when its enabled-flag is true (COM
  always returns a valid-but-default object otherwise; reading it
  unconditionally would just capture noise).

  104/104 unit tests passing (3 new: full guard+every-action-kind
  capture, no-actions-enabled defaults-to-null, scanner-level JSON
  persistence check).

  LIVE-VERIFIED against Conformity — this is the real payload the
  fix was for. Real examples pulled straight from the vault:
    - RTE-NewDocument_+_CLEAN_PO: ActionRunVBScript=true, real script
      text cleaning a Purchase Order value and stamping creation-date
      properties for dashboard reporting (French comments, real
      property IDs).
    - RTE_InvoicesWithoutPO / RTE_InvoicesPO / RTE_PackingSlip:
      Preconditions.VBScriptEnabled=true, real approver/vendor/total
      validation script — resolves property aliases (PD.VendorList,
      PD.InvoiceDate, PD.Total, PD.PurchaseOrder, PD.DeliveryNumber),
      raises MFScriptCancel with real French error messages
      ("Vérifier fournisseur", "Vérifier totale facture") when a
      required field is empty or a total is zero.
    - Contrôle Apprentissage: ActionAssignToUser=true (creates a real
      M-Files assignment) AND ActionSetProperties=true with a fixed
      lookup value referencing "Sélection de Découpe Automatique dans
      la fiche Fournisseur" — i.e., the actual Apprentissage/vendor-
      learning step this project has referenced structurally since
      claude.md §4.4.1, now visible as a real, stored action.
    - END: ActionDelete=true — confirms this is genuinely a terminal
      cleanup state, not just named "END".
    - Multiple states' SetProperties captured real vendor lookups by
      GUID+name (e.g. "Tergos Construction", ext ID "TERGOS").
  Totals: 23 of 47 states have at least one action enabled; 6 have a
  non-trivial guard condition (property-based or VBScript).

## Decision — multi-vault discovery strategy (post-Stage 5)

Stage 5's IsIntegrationTouching flag changed the plan. It gives an
empirical, per-state answer to "what varies between vaults" instead of
a guess — 18 of Conformity's 47 states, 3 of 64 transitions, are
ERP-touching. Everything else (object types, classes, class-property
associations, non-ERP workflow logic) is candidate-for-shared across
all nine deployments, not candidate-for-rescan.

DECISION: Do not run the full 10-stage scanner against all 9 vaults.

New plan:

  1. Finish Conformity's remaining stages (6-10) as the proven template.
  2. Fully scan ONE additional vault (next target, TBD).
  3. Build a minimal diff tool: compare the two vaults' WorkflowStates
     by name. Confirm empirically that only IsIntegrationTouching
     states differ.
  4. IF confirmed: remaining 7 vaults get a NARROW scan — just the
     integration-touching states + dbo.Company row — not a full scan.
  5. IF NOT confirmed (something outside the flagged set differs):
     that's a real finding, investigate before scaling to vault 3.

This is the empirical test of the "Conformity is stable, only ERP
varies" hypothesis that's been informing the project since night one.
Vault 2 either confirms it or corrects it — either outcome is useful,
and it's cheaper to find out on vault 2 than vault 9.

## Stage 5 gut-check — 23/47 actions vs 6/47 guards (2026-07-27)

  Confirmed against the already-captured real data, no new scan
  needed: the 6 states with a non-trivial guard are exactly the RTE_*
  routing/validation checkpoints (RTE_InvoicesWithoutPO, RTE_InvoicesPO,
  RTE_PackingSlip, RTE_Statement, Rte_OtherDoc, UPD__Decoupe_Auto) —
  each has a real VBScript precondition validating required fields
  before letting a document proceed. The 23 states with actions are
  mostly UPD_*/Control_* housekeeping states (set a property, stamp a
  date, run a cleanup script) that fire unconditionally on entry — no
  gate needed because nothing should block them. Plausible and
  consistent with a real AP pipeline: automation is common, hard
  validation checkpoints are deliberately few. Matches expected
  Conformity behavior.

## Phase 2.1 Stage 6 — Users, Groups, Named ACLs — COMPLETE (2026-07-27)

  Three complementary COM sources, each confirmed live before coding:
    - IUserAccount and IUserGroup BOTH lack a .GUID property (confirmed
      via reflection) — resolved via their respective built-in value
      lists (MFBuiltInValueList.Users=6, UserGroups=16), same
      reconciliation pattern as Workflow/State in Stage 5. Live-checked
      first: both value lists DO carry real GUIDs per entry (8 Users
      entries including pseudo-users like "(current user)"; 2
      UserGroups entries).
    - INamedACL, unlike User/UserGroup, HAS a real .GUID directly — no
      value-list workaround needed there.
    - Structure: GetUserAccounts(), GetUserGroupsAdmin(),
      GetNamedACLsAdmin().

  New entities: UserAccount (VaultGuid, Guid, MFilesId, LoginName,
  VaultRoles [raw bitmask], InternalUser, Enabled), UserGroupMember
  (resolves IUserGroup.Members' raw numeric user IDs to UserAccount
  GUIDs within the same scan — same discipline as ClassProperty
  resolving PropertyDef IDs in Task A). UserGroup and NamedAcl both
  gained Create() factories (both had none — third+ time this exact
  "sibling entity built without one" gap has recurred: ValueList/
  ValueListItem before Stage 2, Class before Stage 4, now these two).
  NamedAcl gained NamedAclType (raw MFNamedACLType, verbatim) and its
  AclDefinitionJson is now actually populated, via
  AccessControlList.GetAsBytes() Base64-encoded — same mechanism as
  Stage 5's ActionSetPermissions capture. Migration AddUsersGroupsAcls.

  STAGE 5 COMPLETION, AS REQUESTED: built WorkflowActionResolver — a
  query-time service (not a schema change, not a rewrite of Stage 5's
  stored JSON) that resolves a raw UserOrGroupType+ID against
  UserAccount/UserGroup (MFUserOrUserGroupType: 1=UserAccount and
  3=PseudoUser both resolve against UserAccounts — pseudo-users are
  real Users-value-list entries; 2=UserGroup; 4=PropertyBasedPseudoUser
  has no static name, returns null — the actual user is determined
  per-object from a property value at runtime, not resolvable from the
  index) and a raw PropertyDefMFilesId against Properties.

  117/117 unit tests passing (13 new: 6 VaultHandle mapping tests
  [UserAccounts incl. pseudo-users, UserGroups incl. members, NamedACLs
  using the real GUID], 4 scanner tests [happy path, unresolved-user
  throws, unresolved-group-member throws, empty-guid throws], 6
  resolver tests [UserAccount/PseudoUser/UserGroup/PropertyBasedPseudo/
  unknown-ID/property-name resolution]).

  LIVE-VERIFIED against Conformity:
    Users scanned: 2 (both real accounts — TERGOSCONSTRN\xerox,
      DESKTOP-DKCS42P\owner; VaultRoles=3079 both, Internal=true,
      Enabled=true)
    Groups scanned: 2 (both predefined: "All internal users", "All
      internal and external users")
    Memberships scanned: 0
    Named ACLs scanned: 4 ("Only for me", "Read access for external
      users, full control for internal users", "Read access for
      internal users, full control for me", "Full control for all
      internal users" — all Type=1/Normal)

  HONEST FINDING, NOT A BUG: GetUserAccounts() returns only the 2 real
  named accounts — pseudo-users ("(current user)", "(external
  source)", etc.) appear in the Users(6) value list but NOT in
  GetUserAccounts()'s admin-facing list, confirming these are two
  genuinely different surfaces, not one reconciled view. Separately,
  BOTH of Conformity's real groups are predefined with EMPTY
  IUserGroup.Members collections — M-Files computes "All internal
  users" / "All internal and external users" membership implicitly
  from user-type flags, not from an explicit stored member list. This
  means Conformity has no live example of a resolvable group
  membership to show; the resolution code path itself is verified via
  unit tests with realistic mock data, not a live example, because
  this vault's real data doesn't populate that field. Also notable:
  the Users value list's display Name ("Harry joseph" for MFilesId=50)
  differs from GetUserAccounts()'s LoginName for the same MFilesId
  ("DESKTOP-DKCS42P\owner") — a display name vs. login name, not a
  conflict.

  RESOLVER EXAMPLES, REAL DATA (raw ID next to resolved name), pulled
  from Stage 5's already-stored Actions JSON on state
  "RTE-NewDocument_+_CLEAN_PO":
    raw PropertyDefMFilesId=1066 -> resolved name: SearchCount
    raw PropertyDefMFilesId=1146 -> resolved name: Decoupe_message
    raw PropertyDefMFilesId=1153 -> resolved name: Conformity
    raw PropertyDefMFilesId=1079 -> resolved name: SQL Ready
    raw PropertyDefMFilesId=1165 -> resolved name: Check_Credit

## KNOWN GAP — UserGroupMember: schema/code complete, LIVE VERIFICATION PENDING

  Conformity's real data cannot exercise this code path: both of its
  real groups ("All internal users", "All internal and external
  users") are predefined with EMPTY IUserGroup.Members collections —
  M-Files computes their membership implicitly rather than storing an
  explicit list. Zero UserGroupMember rows have ever been written by a
  live scan. The entity, repository, GUID-resolution logic, and FK
  wiring are all built and covered by unit tests, but those tests use
  INVENTED membership data (mock COM objects), not something a real
  vault produced. This is a real, tracked gap, not a bug — correctness
  of the resolution logic on ACTUAL non-empty membership data is
  unconfirmed.

  WHY THIS MATTERS FOR THE MULTI-VAULT PLAN SPECIFICALLY: per the
  "Decision — multi-vault discovery strategy" above, vault 2 is the
  next real scan target. If it (or any of the other 8) has a custom
  (non-predefined) group with actual explicit members, that scan is
  the FIRST live exercise of this code path ever, on the first vault
  ever to hit it. Do not assume it works because it passed on
  Conformity — Conformity never actually ran it. Watch this specific
  path closely (row counts, GUID resolution success, no thrown
  "member not found among this scan's users" errors) the first time
  any vault's UsersGroupsAclsScanner run reports MembershipsScanned > 0,
  and treat that run as the real first-time validation it is.

## Architecture convention — Create() factory enforcement test (2026-07-27)

  This is the THIRD time a new entity shipped without a Create()
  factory and was only caught when a scanner needed it (Class before
  Stage 4, UserGroup/NamedAcl before Stage 6). User asked to fix the
  template rather than keep patching individual entities. A shared
  base class doesn't fit — every Create() takes a different parameter
  list, there's no common signature to inherit. Added
  EntityCreateFactoryConventionTests instead: reflects over
  ProvisioningAiDbContext.Model.GetEntityTypes(), flags any entity with
  a bare "Guid" property (VaultStructure/WorkflowTransition/
  ClassProperty/UserGroupMember are correctly exempt — identified by
  VaultGuid itself or composite *Guid FKs, not a bare Guid property;
  NamedValueStorage is correctly exempt — no M-Files GUID identity at
  all, keyed by Module+Key) that has no public static Create() method.
  Converts "forgot Create()" from a silent gap into a failing build.

  SANITY CHECK CONFIRMED THE PATTERN WAS ALREADY RECURRING A FOURTH
  TIME: View.cs — the entity Stage 7 was about to consume — already
  had no Create() factory when this test was written, exactly as
  predicted. Fixed before running the new test for the first time, so
  the baseline check passes clean for all 21 existing entities.

## Phase 2.1 Stage 7 — Views — COMPLETE (2026-07-27)

  Simpler than Workflow/State/User/UserGroup: IView has a real .GUID
  property directly (confirmed live) — no built-in value-list
  workaround needed, and Views don't appear in MFBuiltInValueList at
  all, so there was no Stage 2 overlap question to resolve here either.

  New View columns: IsCommon, ParentViewGuid (self-referencing FK,
  resolved within the same scan from the numeric Parent ID — same
  pattern as Stage 4's Class -> ObjectType resolution), and
  SearchConditionsExported (the view's defining filter criteria,
  captured verbatim via SearchConditions.GetAsExportedSearchString() —
  same mechanism as Stage 5's guard conditions). Migration
  AddViewHierarchyAndSearchConditions.

  REAL LIVE BUG FOUND AND FIXED, WORTH RECORDING IN DETAIL: the first
  live run threw COMException 0x80040001 ("The parameter is
  incorrect") on the very first call, from deep inside M-Files' own
  CoView.cpp. Tried GetViews() vs GetViewsAdmin(), different parameter
  values (0/-1 for ParentView, current-user-ID vs 0 for UserID),
  splitting chained dynamic member access into separate statements —
  identical error every time, same internal file/line. Isolated the
  real cause by testing the EXACT SAME GetViewsAdmin() call, same
  server, same vault, same session type, same argument values, via raw
  PowerShell COM automation instead of our C# connector — and it
  succeeded (47 views). That proved the enumeration call itself was
  never broken; the actual fault was one line further down:
  IView.Parent throws when HasParent is false (an inapplicable-
  property access, not a bad argument to the method that returned the
  collection). Fixed by reading .Parent only when .HasParent is true.
  Also tried a classic Type.InvokeMember late-binding workaround before
  finding the real cause — confirmed unnecessary afterward and removed,
  keeping the code on the same `dynamic`-dispatch pattern as everywhere
  else in this file.
  TAKEAWAY: an identical low-level COM error across multiple different
  method calls and parameter combinations is a strong signal the fault
  is downstream of the call that appears in the stack trace, not the
  call itself — reproducing the SAME call outside our code (a
  different client entirely) is what actually isolated it, the same
  discipline this project already uses for verifying COM behavior
  independent of our own code.

  122/122 unit tests passing (5 new: view mapping including the
  Parent-throws-when-no-parent case, scanner happy path with parent
  resolution, unresolved-parent throws, empty-guid throws).

  LIVE-VERIFIED against Conformity: 47 views scanned. Real hierarchy
  and bilingual (French/English) business views confirmed, e.g.:
    Top-level: "1-All Task/Toute les tâches", "2-Task Invoice Control
      /Tâche Contrôle Facture", "3-Task Duplicate Invoice /Tâche
      Contrôle en double", "4-Trash/Corbeille Documents",
      "5-Deleted/Supprimer Documents", "Sys.Vendor / Sys.Fournisseur"
      — plus M-Files built-ins (By Class, Assigned to Me, Checked Out
      to Me, Favorites, Templates, Conflicts, Reports).
    Child views resolved to their parent by GUID, e.g. a view named
    "0" (Common=true) under parent "Tous les types d'objet" ("All
    object types").
  SearchConditionsExported captured verbatim (M-Files' own opaque
  encoded export format, same style as Stage 5's guard conditions) for
  every view with real filter criteria.

## Phase 2.1 Stage 8 — Named Value Storage — COMPLETE, WITH A CONFIRMED SDK BOUNDARY (2026-07-27)

  Pre-work overlap check (requested before coding, same discipline as
  Stages 2/4/5): confirmed NVS does not appear in MFBuiltInValueList,
  no Stage-2-style duplication. Found a genuine naming collision worth
  recording: IObjectTypeAdmin/IPropertyDefAdmin.NamedValueNamespaces is
  a completely different, structurally-scoped feature (extension data
  attached to a specific object type or property def), not the
  vault-level config store this stage targets — do not conflate them.

  FIRST ATTEMPT WAS WRONG, CAUGHT LIVE: assumed
  GetCustomApplicationsEx2()'s elements exposed a `.Configuration`
  NamedValues bag directly (based on IPluginInfo, which looked
  promising via reflection). First live run threw "does not contain a
  definition for 'ConfigurationScope'" — confirmed via reflection that
  IPluginInfo is actually returned by IMFilesServerApplication.
  GetAuthenticationPlugins*() (a different subsystem — authentication
  plugins, not VAF apps) and that the REAL element type,
  ICustomApplication, has no configuration-related members at all
  (just ID, Name, Version, Publisher, Enabled, ApplicationType, etc.).

  USER FOUND THE REAL M-FILES ADMIN FEATURE, THEN AN EXHAUSTIVE SEARCH
  CONFIRMED IT'S NOT IN THE PUBLIC SDK: M-Files Admin has a genuine
  "Other Applications -> [App] -> Configuration" screen — confirmed
  across 7 installed apps, not just one. Critically, SQL Query Vault
  Application's Configuration shows structured Workflow Configurations
  mapping specific workflow states to specific SQL calls (e.g.
  "Workflow: Conformity, State: UPD_SQL_CP1, SQL Calls (1)") — this
  would directly complete Stage 5's IsIntegrationTouching-flagged
  states with what SQL they actually execute. Searched for it properly
  before giving up:
    - Tried GetNamedValues(type, namespace) with each app's ID as
      namespace across all 7 MFNamedValueType values (56 combinations,
      live against Conformity) — all empty.
    - Tried each app's Name as namespace across the same 7 types, plus
      several guessed generic namespace strings ("VAF", "Compliance
      Kit", etc.) — all empty.
    - Searched every TYPE name and every METHOD name containing
      "Configuration" across the entire Interop.MFilesApi.dll — nothing
      exists for ICustomApplication or any custom-application-adjacent
      type.
    - Checked the REST API as an alternative (per user direction) —
      confirmed still unreachable in this dev environment: no IIS/W3SVC
      service running, no port 80/443 listening. Not a stale finding;
      re-checked fresh.
  CONCLUSION (resolved by decision, same pattern as the Restore-GUID
  probe): M-Files Admin almost certainly reads this through each VAF
  module's own private storage mechanism, not the public COM/REST SDK.
  This is a confirmed boundary of what this project's discovery
  mechanism can reach — not an open guess to keep chasing.

  SIDE FINDING DURING THIS INVESTIGATION: checked HTTP Caller for
  M-Files's license status live, per the user's prod-vs-dev comparison
  (same pattern as the Property Calculator fix two nights ago). Real
  result: HTTP Caller shows LicenseStatus=NotInstalled(2) here vs
  NotNeeded on prod — confirms it's a genuine environment/licensing gap
  on this restored dev server, not app brokenness, and Enabled is
  already True at the API level (nothing stuck-disabled to fix via
  COM). More importantly: SQL Query Vault Application — the actual
  priority target — already reads LicenseStatus=NotNeeded(1) on this
  server, identical to prod. No license blocker on the target that
  matters.

  SCOPE SHIPPED, GIVEN THE CONFIRMED BOUNDARY: records the installed
  server-side application inventory itself (GetCustomApplicationsEx2 +
  GetCustomApplicationLicenseStatus — ID, Name, Version, Publisher,
  Enabled, ApplicationType, LicenseStatus, all real structural facts)
  plus a best-effort generic NamedValueStorage probe per (app ID,
  MFNamedValueType) — confirmed empty for all 8 real apps today, kept
  anyway since it's a legitimate general-purpose read that might
  surface real data on a future vault or a different application. Uses
  the existing NamedValueStorage schema and its existing
  NamedValueStorageRepository (already built by an earlier session,
  already correctly preserving human-assigned Classification across
  rescans) — no new entity, no migration needed.

  131/131 unit tests passing (7 new/corrected: application inventory
  mapping including license status, NamedValues mapping, scanner happy
  path, real-NVS-entries-included case, classification-preservation
  rescan, no-applications case, empty-guid throws).

  LIVE-VERIFIED against Conformity: 8 applications, 48 inventory
  entries (6 per app), 0 real per-app NamedValueStorage entries beyond
  inventory (confirms the boundary finding cleanly, not just in theory).
  Real captured data: AP Extension Configurator v4.0.5 (Xerox),
  ConformityVaultApplication v3.3.0 (no publisher set — real, verbatim),
  HTTP Caller for M-Files v3.4.2 (Groupe CT, LicenseStatus=2),
  M-Files Compliance Kit v23.6.1132.4 (M-Files Corporation,
  LicenseStatus=4/Valid), SQL Query Vault Application v3.4.2
  (Groupe CT, LicenseStatus=1/NotNeeded), M-Files Vault Toolbox v3.2.1
  (Groupe CT), M-Files OLE DB External Object Type Connector
  v26.3.15779.0, M-Files Property Calculator v26.5.74.

  OPEN ITEM, NOT RESOLVED HERE: the rich per-app Configuration content
  (SQL Query Vault Application's workflow-state -> SQL-call mappings
  specifically) remains visible only in M-Files Admin, not extractable
  by this project's discovery mechanism. If this data becomes a hard
  requirement later, the realistic options are: (a) manual
  transcription into the mapping template by a human with Admin
  access, or (b) reverse-engineering the installed VAF assembly's own
  storage convention (a real scope expansion beyond COM/REST discovery,
  not undertaken here per explicit decision).

## Phase 2.1 Stage 9 — SQL / dbo.Company — BLOCKED, not started

  Attempted to begin Stage 9 tonight. Real findings, logged rather than
  worked around:

  - MfilesData does NOT exist on either local SQL Server instance on the
    dev machine (checked both MSSQLSERVER and SQLEXPRESS directly —
    only AdventureWorks2019 and an unrelated practice DB called KCC were
    present). Confirms the SQL tier is not local; it lives on the actual
    M-Files server.
  - Real server identified via SSMS Connect dialog, live:
    TERGOS-MFILES01\SQLEXPRESS, Windows Authentication, domain
    TERGOSCONSTRN (account TERGOSCONSTRN\xerox used for one recent
    connection). Same host as the M-Files server itself.
  - Connected live via Object Explorer. MfilesData DOES exist on this
    instance, confirmed live. A second database,
    Approbation_Acomba-Construction, also exists alongside it — NOT
    predicted by claude.md §4.4's "SQL tier is shared, not one per vault"
    model. NOT YET INVESTIGATED — flag as an open question, do not assume
    it changes the architecture until its tables are actually inspected.
  - MfilesData's own table list was NOT actually expanded/inspected this
    session — Object Explorer was left collapsed at the database level.
    "Looks empty" was not confirmed and should not be treated as a
    finding. Real emptiness vs. a permission-limited view (per claude.md
    §8's "permission failures look like success" warning) remains
    unresolved.
  - Attempting a cloud-hosted backup/restore path to get local, safe
    query access was tried and abandoned — routes through a cloud step
    that wasn't practical tonight.
  - DECISION: Stage 9 is deferred, not abandoned. No synthetic MfilesData
    was created; no schema was guessed or injected. Per the multi-vault
    discovery decision already logged after Stage 5, proceeding to a
    full structural scan (Stages 1-8) of Approbation next. Stage 9 will
    be revisited later, and — since claude.md §4.4 describes the SQL
    tier as shared, not per-vault — may be done ONCE covering both
    Conformity and Approbation together rather than twice, once real
    access is available. The Approbation_Acomba-Construction database
    question should be resolved before or during that pass.

## Next

  Stage 9 deferred (see above). Starting full structural scan (Stages
  1-8) against Approbation ({0CFA34B2-AC24-4061-80CF-B309ECE1840B}),
  reusing Conformity's scanners as-is — no code changes expected unless
  Approbation's real structure surfaces something Conformity's shape
  didn't anticipate.

  Other open items carried forward, unrelated to the Stage 9 block:
    - IsFinal has no authoritative marker confirmed yet (no ToState=0
      observed in Conformity) — remains heuristic-only.
    - UserGroupMember live verification pending — watch closely on
      vault 2+ (see KNOWN GAP above).
    - SQL Query Vault Application's workflow-state/SQL-call mappings
      are known to exist (seen in M-Files Admin) but not reachable via
      any API found — see the Stage 8 boundary note above and
      claude.md §4.4.2, not silently dropped.

## Approbation Stage 2 — Value Lists + Value List Items — COMPLETE (2026-07-28)

  No code changes. Existing ValueListScanner (built and unit-tested
  against Conformity) ran as-is against Approbation
  ({0CFA34B2-AC24-4061-80CF-B309ECE1840B}).

  > **NOTE 2026-07-28:** the GUID printed above is the same stale
  > Milestone-1.1-era value flagged in the annotation further down this
  > file, not what the scanner actually queried against. Verified live
  > tonight: the persisted `ValueList` rows for this stage exist only
  > under `{281953C0-E341-4A7A-9CB7-9D6DF0099154}` (0 rows under
  > `{0CFA34B2-...}`) — the run was against the real, current Approbation
  > vault; only the GUID text written into this entry was wrong. Left the
  > original line untouched — annotation, not correction, same pattern as
  > the Milestone 1.1 note. All Stage 3-8 entries below use the confirmed
  > current GUID throughout.

  Real row counts: 8 value lists, 23 items.

  Full data (small enough to list completely, not just samples):

  | Value List | Guid | MFilesId | Items |
  | --- | --- | --- | --- |
  | HoldStatus | {52BAD420-...} | 110 | 5: Wait PS/Attente BL, Price issue, Qt issue, Claimed Credit, Other |
  | Invoice_Type | {46993B86-...} | 115 | 2: Invoice with PO, Invoice with Project |
  | InvoiceStatus | {2ECD2964-...} | 108 | 5: Approved, Credit Note, Litigation, Refused, Wait Approval |
  | Type de Bon | {3620A521-...} | 116 | 2: BL, PO |
  | XCompany | {325D065B-...} | 105 | 1: EPM |
  | XCurrency | {F4AAB375-...} | 103 | 2: CA, USD |
  | XDate | {4BC3DDBD-...} | 102 | 4: DMY, MDY, YDM, YMD |
  | XtractLearning | {E0493AA8-...} | 104 | 2: NO, YES |

  Discrepancy vs. Conformity's known shape (6 value lists / 6 items —
  XCompany, crédit, XDate, découpe, XtractLearning, XCurrency):

  - Real structural difference, not a bug: Approbation has 4 value
    lists Conformity doesn't (HoldStatus, Invoice_Type, InvoiceStatus,
    Type de Bon) — all PO/receiving-related (BL = bon de livraison,
    PO = purchase order), consistent with claude.md's framing of
    Approbation as "more complex." Conformity's crédit/découpe don't
    appear here.
  - XCompany, XCurrency, XDate, XtractLearning appear in both vaults by
    name — same naming convention, but independent GUIDs and MFilesIds
    per vault (as expected — each vault's Firebird DB is independent).
  - No built-in-value-list leakage — the MFilesBuiltInValueListIds
    exclusion filter held up on a second, different vault.

  Unit tests: 131/131 still green (unaffected — no scanner code
  touched).

  Stopping here per the hard gate (Phase 2 Decision Gate,
  V1_DEVELOPMENT_ROADMAP.md — scan one additional vault, compare
  structure, before deciding full-scan vs. narrow-scan for the
  remaining 7). Ready for Stage 3 (Property Defs) on Approbation next.

## Approbation Stage 3 — Property Definitions — COMPLETE (2026-07-28)

  No code changes. Existing PropertyDefScanner ran as-is against
  Approbation ({281953C0-E341-4A7A-9CB7-9D6DF0099154}).

  Real row count: 316 property definitions, vs. Conformity's 200.

  MOST IMPORTANT FINDING THIS STAGE: two properties, Company_Endpoint
  (MFilesId 1251) and Company_Token (MFilesId 1252), match claude.md
  §4.4's SQL-tier-2 naming convention (Connecteur_Endpoint_*, Token_*)
  almost exactly, but discovered here as VAULT-SIDE (Firebird)
  properties, not SQL rows. Left deliberately OPEN, per explicit
  decision — not concluded as duplication, migration, or a genuine
  dual-tier reality. Stage 9 (SQL, still blocked) is needed to see the
  other half of this picture before drawing any conclusion.

  Also flagged for Stage 5 relevance: LineItem_PO, JSON1_WOPO,
  JSON2_WOPO properties — a new PO/line-item/JSON-blob structure not
  present in Conformity's 200.

  Unit tests: 131/131 still green (unaffected).

  Stopped per the hard gate; go-ahead given for Stage 4 next, with an
  explicit instruction to re-run the Set A/Set B reconciliation.

## Approbation Stage 4 — Object Types & Classes — COMPLETE (2026-07-28)

  No code changes. Existing ObjectTypeClassScanner ran as-is against
  Approbation ({281953C0-E341-4A7A-9CB7-9D6DF0099154}).

  Real row counts: 19 object types, 27 classes, vs. Conformity's 12/14.

  Object types (all 19): Document, Document collection, Assignment,
  Report, Share, Email, Email Conversation (7 built-ins) plus 12
  custom — Vendor(101), Company(106), LineItem(107), Approver(109),
  LineItemW/OPO(111), LineItemStatement(112), CompteGL(113),
  TypeAchat(114), Produit(117), Projet(118), Groupe Approbation(119),
  LineItem_PO(120). LineItemW/OPO and LineItem_PO are confirmed
  genuinely distinct object types/classes, not a naming collision.

  NEW SHAPE, NOT A BUG: 5 of the 27 classes carry negative MFilesIds
  (-110 Email Conversation, -109 Email, -108 Share, -101 Report, -100
  Assignment) — Conformity's original Stage 4 report had no negative
  class IDs. GuidGuard has no sign constraint; all 27 resolved to their
  ObjectTypeGuid correctly. Worth remembering: any later stage that
  assumes MFilesIds are non-negative would break on this vault.

  SET A / SET B RECONCILIATION — RE-RUN ON A SECOND VAULT, AS
  EXPLICITLY REQUESTED (the check that matters most, since this is the
  first time it's been run against anything other than Conformity):
  Set A = GetValueListsAsync() filtered RealObjectType==true (19
  entries). Set B = ObjectTypeOperations.GetObjectTypes(), called raw
  via dynamic dispatch as a one-off diagnostic, not wrapped in any
  connector method (19 entries). IDs match exactly: true. GUIDs match
  exactly: true. NEW REFINEMENT beyond the original Conformity check:
  Set B returned ZERO entries with RealObjectType==false — the
  dedicated GetObjectTypes() call is pre-filtered to real object types
  server-side, not merely a superset that happens to agree after
  filtering. This upgrades the original claim from "these two paths
  happen to agree" to "these two paths agree by construction" — a
  stronger, second-vault-confirmed result, not a fluke of Conformity's
  data.

  Unit tests: 131/131 still green (unaffected).

  Stopped per the hard gate; go-ahead given for Stage 5 next.

## Approbation Stage 5 — Workflows, States, Transitions — COMPLETE (2026-07-28)

  No code changes. Existing WorkflowScanner ran as-is against
  Approbation ({281953C0-E341-4A7A-9CB7-9D6DF0099154}).

  Real row counts: 4 workflows, 125 states, 191 transitions, vs.
  Conformity's 1/47/64. 38 integration-touching states, 8
  integration-touching transitions, vs. Conformity's 18/3.

  Workflows: Approbation (101), Line_Statement (103), Statement (102),
  BON_Entrant (104) — each resolved exactly one IsInitial state (START,
  START + WAIT XTRACT-LINEITEM, Start+UPD-NAME, New_Document), no
  cross-contamination between workflows in the same scan.

  LINEITEM_PO / JSON1_WOPO / JSON2_WOPO CONSUMPTION LOGIC — THE FLAGGED
  ITEM FROM STAGE 3, FOUND: three separate JSON-construction states
  (UPD JSON WOPO+VALIDATION WOPO(VB) state 112, UPD JSON RECEPTION 279,
  UPD JSON PO 291), one per invoice-type route (W/O PO, Reception, PO)
  — plausibly where JSON1_WOPO/JSON2_WOPO get built. A dedicated
  PO-search sub-chain (RTE_PO_INVOICE -> SQL_START_SEARCH_PO ->
  SQL_END_SEARCH_PO -> ... -> UPD_INVOICE_PO -> SQL_ENCODING_INVOICE_PO
  -> ... -> UPD_VALIDATION_PO(VB) -> UPD_PREPARE_POST -> UPD JSON PO ->
  ERP POSTING_PO) is a full PO lifecycle distinct from the W/O-PO
  route. Line_Statement workflow (LINK_LINE_ITEM -> SQL_VENDOR_XTRACT
  -> START_WF-STATEMENT-LINE-ITEM) ties directly to the
  LineItem/LineItemStatement object types from Stage 4.

  CROSS-VAULT HANDOFF CHECK, EXPLICITLY ASKED FOR: no state or
  transition name in Approbation contains "Conform" anywhere — zero
  hits. The "Archiv"-substring matches (OUT_ARCHIVE, IN_ARCHIVE_APPRO,
  RTE_ARCHIVE, RTE_ARCHIVE_PO, RTE_ARCHIVE_W/OPO) read as internal
  terminal states within this vault's own workflow, not a named
  handoff to a separate vault. Reported as "no name-based evidence
  found," not "confirmed absent" — see Stage 8 below, which found a
  much stronger candidate for the actual cross-vault link.

  Real action sample captured verbatim (state START): genuine VBScript
  resolving property aliases (PD.Tax1, PD.Freight, PD.Subtotal,
  PD.Total, PD.InvoiceNo, PD.Invoiceacomba) and deriving InvAcomba from
  the invoice number (Right(InvoiceNo, 12) when length >= 13).

  ODDITY RECORDED VERBATIM, NOT CLEANED: state [103]'s name is
  '1‑ Adm – Invoice Control\n' — contains a literal embedded newline
  inside the M-Files state name itself, not a display artifact.
  Flagging in case a later stage's string handling assumes state names
  are single-line.

  Unit tests: 131/131 still green (unaffected).

  Stopped per the hard gate; go-ahead given for Stage 6 next.

## Approbation Stage 6 — Users, Groups, Named ACLs — COMPLETE (2026-07-28)

  No code changes. Existing UsersGroupsAclsScanner ran as-is against
  Approbation ({281953C0-E341-4A7A-9CB7-9D6DF0099154}).

  Real row counts: 3 users, 2 groups, 0 memberships, 4 named ACLs.

  Users: LAB-SRV18\Administrator, AdminTest, DESKTOP-DKCS42P\owner —
  all internal, enabled, identical VaultRoles bitmask (3079). Groups:
  both predefined ("Tous les utilisateurs internes" / "Tous les
  utilisateurs internes et externes"), no custom groups. Named ACLs:
  all 4 built-in, negative MFilesIds, French-locale labels, no custom
  ACLs.

  THE WATCHED ITEM — STILL PENDING: MembershipsScanned is 0 again.
  Approbation is now the SECOND vault in a row (after Conformity) with
  zero explicit group memberships — both of its groups are predefined
  built-ins, which don't carry an explicit member list the way a
  custom group would. UserGroupMember remains schema/code-complete but
  LIVE VERIFICATION PENDING. Carry this status forward unchanged; keep
  watching for the first vault where MembershipsScanned > 0.

  Unit tests: 131/131 still green (unaffected).

  Stopped per the hard gate; go-ahead given for Stage 7 next.

## Approbation Stage 7 — Views — COMPLETE (2026-07-28)

  No code changes. Existing ViewScanner ran as-is against Approbation
  ({281953C0-E341-4A7A-9CB7-9D6DF0099154}).

  Real row count: 71 views.

  HasParent/Parent handling (Stage 7's Conformity-era COM bug fix) held
  up clean on a second vault — no exception. This vault actually
  exercises TWO LEVELS of parenting, which Conformity's report didn't
  have a case for: 'All object types' -> '106' -> 'Recent' (a real
  2-deep chain), and '*5. Archived Invoice / Facture archivée' ->
  'Transaction Completée' / 'Transaction Non Completée' (a real named
  2-level hierarchy). guidByMFilesId is built from the full view list
  up front, not incrementally, so multi-level resolution isn't
  order-dependent — confirmed correct, not accidentally working.

  UNPROMPTED CROSS-STAGE CONSISTENCY CHECK: the numeric per-object-type
  auto-generated views ('0','9','10','15','19','20','21','101','106',
  '107','109','111','112','113','114','117','118','119','120') match
  EXACTLY the 19 object-type MFilesIds Stage 4 found — an independent
  confirmation across stages, not taken on faith.

  Unit tests: 131/131 still green (unaffected).

  Stopped per the hard gate; go-ahead given for Stage 8 next, with an
  explicit instruction to check whether Conformity's confirmed SDK
  boundary (per-app Configuration nodes unreachable) holds the same way
  here.

## Approbation Stage 8 — Named Value Storage — COMPLETE (2026-07-28)

  No code changes. Existing NamedValueStorageScanner ran as-is against
  Approbation ({281953C0-E341-4A7A-9CB7-9D6DF0099154}).

  Real counts: 8 applications, 48 inventory entries, 0 real per-app NVS
  entries beyond inventory.

  THE SDK BOUNDARY CHECK, BOTH HALVES, HELD: rechecked REST directly
  before this stage — no W3SVC service, no port 80/443 listeners on
  this box. Since Conformity and Approbation are both hosted on this
  SAME local M-Files server instance (not separate remote servers),
  REST unavailability is a server-level fact here, not per-vault — it
  necessarily holds for both. The generic COM NVS probe (7
  MFNamedValueType values x each installed app's ID) also came back
  fully empty here, same as Conformity — genuinely empty on a second
  vault, not a Conformity-specific quirk. claude.md §4.4.2's
  multi-vault caveat (this boundary may not hold on a vault running in
  web-service/IIS mode) remains untested — no such vault is available
  in this environment — but on the one axis testable here, the
  boundary generalizes.

  HEADLINE FINDING, INITIALLY MISREPORTED THEN CORRECTED SAME SESSION:
  one of Approbation's 8 installed applications is named
  "ConformityVaultApplication" (ApplicationId
  {5FD4F383-1867-40BC-A9BD-7629DFCEA0D8}, Version 3.2.3, LicenseStatus
  1/NotNeeded, Publisher blank). This was FIRST reported as a novel,
  surprising discovery unique to Approbation — WRONG, caught before
  writing it here: Conformity's own original Stage 8 session
  (2026-07-27, see above) already recorded an application with this
  exact same name AND the exact same ApplicationId GUID installed on
  Conformity itself, at a DIFFERENT version (3.3.0). Confirmed directly
  against the persisted provisioning.db (NamedValueStorages table),
  not from memory: both vaults have a row for Module
  "ConformityVaultApplication", ApplicationId
  {5FD4F383-1867-40BC-A9BD-7629DFCEA0D8}, differing only in Version
  (3.3.0 on Conformity, 3.2.3 on Approbation). CORRECTED TAKEAWAY: the
  same custom VAF application (by GUID, not just by name) is installed
  independently on both vaults, at different versions — this reads
  like a generically-named module that ships to every vault
  deployment (possibly never renamed from whichever vault it was first
  built for), not evidence of a live cross-vault wiring mechanism.
  Still worth keeping open and unresolved pending further investigation
  — do not conclude either way about what this application actually
  does or connects to; nothing about its Configuration content is
  reachable (same boundary as SQL Query Vault Application). Recorded
  here, not silently corrected in conversation only.

  Unit tests: 131/131 still green (unaffected).

  BATCH COMPLETE: this was the last stage in the Stages 2-8 Approbation
  sweep. No further per-stage go-ahead needed. Progress.md/skills.md/
  claude.md updates for the full sweep done in one pass, tonight
  (2026-07-28), per the user's decision to log once rather than
  incrementally.

## Conformity master behavior table & investigation consolidation (2026-08-01)

Two-plus sessions of Conformity investigation (Stage A rubric checks, VAF add-on config decompilation, cross-vault integration-verification against Conformity II/v3.0/Approbation, config-write-safety analysis) were done ad hoc and delivered in-chat, deferred from being logged here across both sessions. This entry consolidates the Conformity-scoped findings into the authoritative record. Approbation's remaining stages and the v3.0/Conformity-II/multi-vault threads are explicitly OUT OF SCOPE for this entry — still open, unlogged, tracked separately.

**Correction carried forward:** the write-protocol functional-test prerequisite ("needs a disposable clone with real test documents") previously logged as an open blocker is RESOLVED — the user has a working copy of the Conformity vault with fake invoices fed through the real client-side entry path (Mail Downloader → Capture Point → vault).

**SUPERSEDED (same milestone, later evidence):** prerequisite availability did not complete the routing proof. Functional Scenarios A/B/C (PO, non-PO, rejection) are still blocked on programmatic test-invoice creation (`CreateNewSFDObject` COM marshaling). Keep this distinction explicit: the config-write mechanism is proven; end-to-end invoice-flow proof is not yet complete.

**New infrastructure fact, distinct from the Stage 9 blocker (§2.3 above/CLAUDE.md §2.3):** a local SQL dev environment is now live on `DESKTOP-DKCS42P` — a fresh `MfilesData` database created locally, and Conformity's six object-type External Database Connections (Approver, Company, Conformity, CP1, Document, Vendor) repointed from `TERGOS-MFILES01\SQLEXPRESS` to this local server, connection tests passing. This does NOT resolve Stage 9 (still blocked on introspecting the real production schema) — it's a separate, empty local dev/test target supporting write-protocol testing.

### VAF add-on Configuration data — reachability verdict REVERSED

Earlier finding (Stage 8, this file, and claude.md §4.4.2): VAF Custom Application Configuration content is unreachable via COM/REST, confirmed via exhaustive reflection and NVS-namespace guessing. **This verdict is now superseded.** Decompiling the real installed VAF assemblies (extracted read-only via `IVaultCustomApplicationManagementOperations.DownloadCustomApplicationBlockBegin`/`DownloadCustomApplicationBlock`) found the real mechanism: every VAF app built on `MFiles.VAF.Extensions.ConfigurableVaultApplicationBase<T>` stores its config via `NamedValueStorageOperations.GetNamedValues`/`SetNamedValues(MFNamedValueType.MFSystemAdminConfiguration [8], "{AppRootNamespace}.VaultApplication")`, key `"configuration"`, as indented JSON — reachable AND writable. Confirmed live for all four of Conformity's config-bearing apps: `ConformityVaultApplication.VaultApplication`, `Docned.SQL.VaultApplication.VaultApplication` (SQL Query Vault Application), `Docned.VaultToolbox.VaultApplication` (M-Files Vault Toolbox), `PropertyCalculator.VaultApplication` (M-Files Property Calculator). Full mechanism and decompile methodology in skills.md; architectural implications in claude.md §4.4.2 (correction) and §4.4.3 (new).

This resolved several of Stage 5's open topology questions (see table below) and is why the master state table can now be built with a confirmed behavior source for nearly every state, not just the ones with native Actions data.

### Config-write protocol milestone (Conformity only) — COMPLETE with one scaffolding item open

Milestone framing (documentation-only, no vault access in this write-up):
- **Complete:** VAF add-on config read/write mechanism is proven end-to-end via `NamedValueStorageOperations.GetNamedValues`/`SetNamedValues` at type 8 (`MFSystemAdminConfiguration`), namespace = app full type name. This supersedes the earlier "Configuration unreachable" verdict.
- **Complete:** write path is byte-faithful at the NVS layer. Phase 1 round-trip was byte-identical on first attempt; Phase 2 changed exactly the intended 7 GUID spans and zero other bytes.
- **Complete:** one real semantic patch shipped and verified live. `MoveToApproval` Destination Vault GUID changed from production Approbation `{037B0872-...}` to dev-test Approbation `{281953C0-...}` across 7 nested Vault Toolbox locations; verification showed 7/7 replaced with 0 collateral-byte changes, then independently re-confirmed out-of-harness.
- **Operational finding (permanent):** NVS writes generate zero event-log entries; self-maintained audit logging is mandatory for every config write.
- **Operational finding (permanent):** VAF config is cached at app startup and not re-read per operation on this single-server deployment. Post-write app reload is required (disable/re-enable via `IVaultCustomApplicationManagementOperations`) and must be verified live.
- **Onboarding inventory refinement:** config rewrites alone are insufficient; workflow runtime depends on SQL reference data (including vendor/reference rows), so SQL reference-table population is a required onboarding step.
- **Live proof (2026-08-01, object 5427):** state 114 (`UPD_VendorID`) has a hard runtime SQL dependency through SQL Query Vault Application's `Search Vendor & LearningCP1` binding. On failure, the app writes `PD.Sqlqueryfail = "SQL ERROR : UPDATE VENDOR"` and redirects to `WORKFLOW_ERREUR`; object 5427 landed exactly in that state with exactly that value.
- **Root cause (two connection layers, both required):** repointing the six object-type External DB Connections to local dev SQL does NOT repoint SQL Query Vault Application's own internal connection config. Event-log evidence for object 5427's failure shows execution still targeted `TERGOS-MFILES01\SQLEXPRESS`, not the local dev server.
- **Handoff/GUID-patch status:** unaffected. This failure occurred upstream at 114 before `MoveToApproval` (129->132) could run; Destination Vault GUID patch and Vault Toolbox config remain exonerated by this incident.
- **Known vendor spelling quirk (carry forward):** `MoveToPackingSLip` (capital S/L) exists in vendor config and predates this milestone; do not "fix" it silently when searching/patching.
- **One scaffolding item still open (NOT complete):** functional routing Scenarios A/B/C remain blocked by `CreateNewSFDObject` COM marshaling; do not mark invoice-routing proof as passed.

### Master 47-state behavior table — Conformity, live-queried from `provisioning.db`

Built by querying `WorkflowStates` directly (not reconstructed from memory) against `{F542FB91-9563-4506-929F-BC279D1D5B37}` — the sanctioned working stand-in for original Conformity, confirmed via an earlier live Stage 5 re-run to be an EXACT structural match (1 workflow, 47 states, 64 transitions) to original Conformity `{008446DF-32AA-4E9C-8C43-9FEC4D0A1203}`. Property names resolved from original Conformity's Stage 3 data (`{008446DF-...}` has the persisted `Properties` table; `{F542FB91-...}` was only ever scanned for Stages 1 and 5) — valid because the same clone relationship applies to property GUIDs/MFilesIds per §4.1.

Legend: **I**=Initial state, **F**=Final state, **IT**=IsIntegrationTouching flag (native, name-based heuristic per claude.md §4.4).

| MFilesId | State | I/F | IT | Native behavior | Add-on binding / resolution |
|---|---|---|---|---|---|
| 111 | RTE_Duplicate | | | none | **Open** — needs add-on config check |
| 112 | RTE_NotDuplicate | | | sets SearchCount=1 | native only |
| 113 | Control Duplicate | | | clears ToolsBoxQueryDone | native only |
| 114 | UPD_VendorID | | IT | clears SQL Ready, ToolsBoxQueryDone, SQLQueryFAIL; sets Check_Credit="1" | **Resolved, live-proven runtime dependency** — SQL Query Vault Application's `Search Vendor & LearningCP1` runs vendor lookup as object passes through; on SQL failure writes `PD.Sqlqueryfail="SQL ERROR : UPDATE VENDOR"` and redirects to `WORKFLOW_ERREUR` (confirmed by test object 5427) |
| 115 | RTE-NewDocument_+_CLEAN_PO | **I** | | VBScript (PO cleanup + date/time stamp for dashboard reporting) + SetProperties: clears SearchCount, sets Decoupe_message text, sets Conformity lookup, clears SQL Ready, clears Check_Credit, **sets Company = "Tergos Construction" (ext ID `TERGOS`)** | ALSO bound to ConformityVaultApplication's `StringCharacterRemovalIntoNewProperty` (vendor-field cleanup). **"Tergos Construction" is a confirmed hardcoded per-customer literal in a NATIVE action** — onboarding-relevant, the add-on-config inventory alone would miss it |
| 116 | RTE_Missing Value | | | none | **Open** — previously mislabeled a "clean pass-through," superseded by the stricter finding below |
| 118 | UPD_DUPLICATE | | IT | clears Check_Credit | native |
| 119 | Control Invoices | | | clears ToolsBoxQueryDone, SQL Ready, Factures_Mfiles; sets Decoupe_message text | native |
| 120 | UPD_Learning = YES | | IT | none | **Resolved** — bound to `StringCharacterRemovalIntoNewProperty` (state 120 binding confirmed correct, reversing an earlier "mismatch" flag) |
| 121 | UPD_Learning = NO | | IT | none | **Open** — not the same confirmed binding as 120 |
| 124 | RTE_InvoicesWithoutPO | | | clears Message Facture | native + VBScript precondition guard (validates Vendor/Company/InvoiceDate/InvoiceNo/Subtotal/Total non-empty, raises `MFScriptCancel` with French error text) |
| 125 | RTE_CP1 | | IT | clears Message Facture | native |
| 126 | RTE_To Trash | | | clears Message Facture | native |
| 127 | UPD_DUPLICATE2 | | IT | none | **Open** |
| 128 | RTE_Duplicate2 | | | none | **Open** |
| 129 | Control_Before_Move To Approval | | | AssignToUser (creates a real M-Files assignment) | native |
| 132 | RTE_Approval | | | none | **Open** — previously believed a clean pass-through; superseded after `UPD_EXPORT_VENDORLIST` turned out to be silently doing real work despite also being zero-action |
| 134 | UPD_To CP1 | | IT | clears SQL Ready2, Message Facture | native |
| 136 | UPD_EXPORT_VENDORLIST | | IT | none | **Resolved** — `ConformityVaultApplication.DatabaseTableToCSV`: exports `Master_DATA_CP1` to `E:\SFTP\Vendors\vendor.csv`, dynamic per-company server (`%PROPERTY_{PD.Company}.PROPERTY_{PD.Companysql}%`); `OutputFilePath` is a hardcoded literal, confirmed unreachable on this dev box (no E:\ drive) |
| 139 | RTE_Statement | | | clears Message Facture | native + property-based precondition guard (opaque exported search string, VBScript disabled) |
| 140 | Rte_OtherDoc | | | clears Message Facture | native + property-based precondition guard |
| 141 | Trash | | | none | **Resolved** — `ChangeClassInWorkflow` reclassifies here to `CL.Trash` (4 configured entries; entries 3/4 share the cosmetic name "Trash-OtherDoc" despite targeting different states — a copy-paste naming bug, not a behavior bug); M-Files Vault Toolbox's "To trash" action also targets this state and sets ToolsBoxQueryDone="yes" on success |
| 142 | UPD_CP1 | | IT | none | **Open** |
| 143 | RTE-VENDORID | | | none | **Open** |
| 144 | WAIT_SYNCH_CSV | | IT | none | **Open** — name-classified per claude.md §4.4 as a CSV-sync wait state; specific add-on binding not yet confirmed |
| 145 | Contrôle Apprentissage | | IT | AssignToUser + SetProperties (Decoupe_message text, clears Message Facture) | native — the real Apprentissage/vendor-learning step (claude.md §4.4.1) |
| 147 | END | | **F** | Delete | native — confirms genuinely terminal |
| 151 | UPD_SQL_CP1 | | IT | clears SQL Ready | native + bound to `StringCharacterRemovalIntoNewProperty` (state 151 binding confirmed correct, reversing an earlier "mismatch" flag) |
| 152 | Fin_UPD_SQL_CP1 | | IT | clears SQL Ready | native |
| 155 | UPD__Decoupe_Auto | | IT | sets SQL Ready2="yes", clears Message Facture | native + property-based precondition guard (opaque string) |
| 195 | IN_TO_UPD_CP1 | | **F**, IT | none | **Resolved** — direct-assignment SOURCE for ConformityVaultApplication's `ChangeWorkfow` `IN_OUT_UPD_CP1` binding (jumps to `OUT_TO_UPD_CP1`, bypassing the transition graph) |
| 196 | OUT_TO_UPD_CP1 | | IT | none | **Resolved** — direct-assignment TARGET of the same `IN_OUT_UPD_CP1` binding; resolves the earlier "0 inbound, has outbound" topological anomaly |
| 202 | RTE_InvoicesPO | | | clears Message Facture | native + VBScript precondition guard (same validation as 124, plus PO number required) |
| 203 | RTE_PackingSlip | | | clears Message Facture | native + VBScript precondition guard (same validation, plus delivery/BL number) |
| 205 | RTE_CP1_ | | IT | none | **Open** |
| 208 | Set__SubTotal | | **F** | none | **CONFIRMED DEAD** — 0/0 topology, 0 live objects (`GetObjectCountInSearch`), no direct-assignment redirect found in any of the four apps' config |
| 210 | Contrôle Sous-Total | | **F** | none | **CONFIRMED DEAD** — same basis as above |
| 211 | Check_Credit | | | none (native) | **Resolved** — runs ConformityVaultApplication's `PopulateListWithTextSearchs`: searches invoice file text for "note de credit", writes result to `Factures_Mfiles` |
| 212 | Contrôle Note de Crédit Positif | | | none | **Open** |
| 213 | RTE_CREDIT_POSITIF | | | clears Check_Credit | native |
| 216 | RTE_Check_credit | | | none | **Open** |
| 218 | test_123 | | **F** | none | **CONFIRMED DEAD** — same basis as 208/210 |
| 219 | SET_CREDIT_NEGATIF | | | sets SQL Ready="yes" | native, PLUS the real active mechanism is a Property Calculator rule ("Invoices (Crédit en Négatif)": state=Setcreditnegatif AND value>0 → flips Total/Subtotal/Tax1/Tax2/Freight negative). No VBScript enabled anywhere on this state or its transitions — confirmed absent, not dormant |
| 221 | OUT_CREDIT | | **F** | none | **RECLASSIFIED, no longer dead** — direct-assignment START trigger via `ChangeWorkfow`'s `IN_OUT_CREDIT` binding (`OUT_CREDIT`→`IN_CREDIT`). The earlier "0 live objects" observation was accurate for that moment only — objects redirect through immediately, which is why none were ever caught sitting in it |
| 222 | IN_CREDIT | | **F** | sets Check_Credit="1" | target of the `IN_OUT_CREDIT` redirect; carries real action data unlike the three still-confirmed-dead states above. **Open** — its own topology/live-object check has not yet been independently run |
| 224 | WORKFLOW_ERREUR | | | none | **Resolved** — direct-assignment TARGET of SQL Query Vault Application's `UpdateOnFailure.State` (redirected here on SQL call failure, from both "Search Vendor & LearningCP1" and "CP1_DATA"); object 5427 confirmed this path live from state 114 with `PD.Sqlqueryfail="SQL ERROR : UPDATE VENDOR"` |
| 225 | WAIT_SQL_RETRY | | IT | none | **Open** — plausible by analogy to v3.0's confirmed `SQL_START`/`END`/`ERROR` retry-loop pattern, NOT independently confirmed for this vault's `WAIT_SQL_RETRY` specifically |

**Tally:** of the 23 states with zero native Actions data (the "ROUTE(empty)" bucket flagged in an earlier session as no longer safely assumed inert), 10 are now resolved to a real behavior source (7 live: `UPD_Learning = YES`, `Trash`, `IN_TO_UPD_CP1`, `OUT_TO_UPD_CP1`, `Check_Credit`, `OUT_CREDIT`, `WORKFLOW_ERREUR`; 3 confirmed dead: `Set__SubTotal`, `Contrôle Sous-Total`, `test_123`) and 13 remain open, still needing an add-on config check: `RTE_Duplicate`, `RTE_Missing Value`, `UPD_Learning = NO`, `UPD_DUPLICATE2`, `RTE_Duplicate2`, `RTE_Approval`, `UPD_CP1`, `RTE-VENDORID`, `WAIT_SYNCH_CSV`, `RTE_CP1_`, `Contrôle Note de Crédit Positif`, `RTE_Check_credit`, `WAIT_SQL_RETRY`. `IN_CREDIT` (has native action data, wasn't in the original zero-action bucket) gets its own still-open follow-up.

**Known unresolved discrepancy, carried forward rather than silently reconciled:** an earlier session's Stage A rubric rerun against this same vault reported 19/47 states passing a "SetProperties-only, no VBScript" rubric (11 flagged for touching known trigger properties, 8 clean) — a different split from an even earlier session's summary of 14/11/3 for the same rubric against the same vault shape. No full per-state list survives from the earlier session to diff against, so the cause (rubric strictness drift vs. a genuine data difference) is not determined. Flagged, not resolved, not silently averaged.

## Conformity cross-vault handoff — MILESTONE: proven to the vault boundary (2026-08-02)

**Framing: this is a milestone achieved, not a phase closing.** Conformity work continues — further workflow streamlining, TriggerBridge, and the provisioning template all remain active. What's proven here is that the cross-vault handoff mechanism itself works end-to-end up to the destination vault's boundary; what remains open is receiving-side (Approbation) processing, which is its own phase, not a Conformity defect.

**What's proven:** a real test invoice (object 5430, PO path), driven through 10 genuine workflow transitions via COM (`CheckOut`→`SetProperty`→`CheckIn`, one hop at a time — 118→111→112→119→202[guard passed]→125→120→145→128→129→132), reached `RTE_Approval` (132) and fired M-Files Vault Toolbox's `MoveToApproval` trigger. The trigger enqueued the move task, and the task reached dev Approbation (`{281953C0-...}`) — the object did not arrive in Approbation's object list, but the mechanism up to that boundary is now demonstrated, not merely configured.

**Key technical findings, stated precisely:**

- **Real-transition requirement, corrected framing:** the `MoveToApproval` trigger is a `[EventHandler(MFEventHandlerType.MFEventHandlerBeforeCheckInChanges)]` method (`Docned.VaultToolbox.dll`, decompiled from the live package, version-matched against `appdef.xml`). Confirmed via COM reflection over the full `Interop.MFilesApi.dll`: **no separate "perform transition" API exists anywhere in the SDK** — `CheckOut`→`SetProperty(39, targetState)`→`CheckIn` IS the real mechanism, identical to what the M-Files Desktop client itself does when a user clicks a transition button. Earlier drafts of this investigation implied prior tests (objects 5427/5428/5429) used a "fake" or wrong-method transition — that framing is incorrect and is corrected here: the test method was always the real mechanism; the actual gap was elsewhere.
- **Silent-logging bug found and fixed (environment-side only):** the enqueue handler's `catch` block called `EventLog.WriteEntry("GroupeCT.M-Files.Toolbox", ...)` — a Windows EventLog source that did not exist on this machine (confirmed via registry: `HKLM:\SYSTEM\CurrentControlSet\Services\EventLog\Application\GroupeCT.M-Files.Toolbox` absent). Because nothing wraps that line, a missing/unwritable source would itself throw, silently discarding the original exception. Fix applied: `New-EventLog -LogName Application -Source "GroupeCT.M-Files.Toolbox"`, run elevated by the operator — an environment change only, the vendor add-on itself was never modified. **This fix covers the enqueue side only.** The task *processor* (`MoveObject()`, a separate method) reports failures via `AppTaskException`, a different path observable (if anywhere) through M-Files' own Task Manager/Background Tasks in the Admin UI, not through Windows Event Log or any NLog file (confirmed absent from both the app package and the M-Files Server install directory) — still not fully observable as of this milestone.
- **Enqueue chain proven working, via a sibling action:** Vault Toolbox has a second, independent trigger — "Control Duplicate[1]" (`FindDuplicates`, TaskType 3, bound to state 118/`UPD_DUPLICATE`) — which object 5430 also passed through this same run. Its output field, `PD.Searchcount`, came back `= 1`. This is direct, same-object, same-run proof that `BeforeCheckInChanges` fires, matches config, enqueues via `TaskManager.AddTask`, the task queue processes it, and the processor writes back successfully — the whole chain genuinely works, at least for TaskType 3. `MoveToApproval` (TaskType 2) uses the identical enqueue path.
- **MFServer restart requirement (hard constraint for the provisioning engine's apply phase):** VAF config is cached in memory at `StartOperations` (confirmed via decompiled `MFiles.VAF.Core.ConfigurableVaultApplicationBase`/`VaultApplicationBase.Initialize`) and the only auto-reload path is a cross-server broadcast (`BroadcastFilterMode.FromOtherServersOnly`) that cannot self-trigger on this single-server deployment. Disabling/re-enabling the app via `IVaultCustomApplicationManagementOperations` was tried and found insufficient (multiple connection-type attempts all either threw `0x8004043E` or silently no-op'd); a full `MFServer` service restart was the only mechanism confirmed to force a genuine config re-read. Any provisioning "apply" step that writes NVS config must account for this — a config write is not active until the target app has gone through a real cold start.

**Phase boundary:** the object reaches Approbation's vault boundary but does not appear in Approbation's object list, and `ToolsBoxQueryDone` never gets set. **SUPERSEDED framing (2026-08-04):** this paragraph originally deferred the gap to a separate "Approbation phase" with an open "root cause not yet identified" framing. That framing is retired — see "Connection roadmap (I-III; IV folded into II, 2026-08-04)" near the top of this file: handoff completion is now Connection II blocker (b), a defined config-write procedure (read the target vault's 5 destination GUIDs, write via `SetNamedValues`, reload, verify aliases), not an open investigation. What's unchanged: a candidate lead — recurring "Vault application not found (ID: {224668EF-...})" errors in the Windows Application log, source "M-Files" — was investigated and found to be a **pre-existing, unrelated background pattern** (recurs every few minutes across a full day, predates this test, and also flags GUIDs of applications independently confirmed to be installed); it remains a ruled-out lead, not a confirmed cause. Connection II blocker (b)'s validation tasks: (1) validate that all 14 property aliases in `MoveToApproval`'s `Mapping` array (confirmed via the decompiled config JSON, not assumed) actually exist on Approbation's own destination class — note `PD.Noprojet`→`PD.Projetno` is a genuine rename, not a copy-paste artifact; and (2) validate that the 5 destination-side GUIDs (`VaultGuid`, `ObjectGuid`, `ClassGuid`, `Workflow`, `WorkflowState`) resolve there. Both are read-only checks, not yet performed.

Full session-by-session detail, including every intermediate hypothesis tested and ruled out, is in `rollback/2026-08-01_082750_conformity-write-protocol/AUDIT_LOG.md`.

## Control Invoices (119) classification decode & intake-quirk diagnosis (2026-08-04)

Follow-up to the Connection II scenario map (`connection-ii-scenario-map.md`/`.xlsx`): decoded the classification/entry mechanisms that map had flagged as undecoded gaps, explicitly checking all four VAF apps' captured NVS configs (not just native VBScript) for a binding, plus a direct grep for missed references. Read-only, no writes, no test objects created.

- **`Control Invoices` (119) routing is confirmed MANUAL — no automated driver anywhere.** State 119's own `GuardConditions` are fully empty in `provisioning.db` (no VBScript, no property precondition). All 10 outgoing transitions (to 124/125/126/134/139/140/155/202/203/219) are unconditional/always-allowed except `119→125` (real but undecoded condition). Grepped all four apps' full config text for `"119"` and `Controlinvoices` — zero matches. Nothing in this vault's captured configuration decides PO vs non-PO vs Statement vs OtherDoc vs PackingSlip vs CreditNegative vs `UPD_To CP1` — a human/dashboard operator selects the transition manually; entry-state preconditions on the chosen destination (124/202/203's VBScript field checks; 139/140's opaque native property condition) validate completeness, not classification.
- **Intake-landing quirk (test objects 5427-5430 landing at 114/118/143 rather than progressing hop-by-hop from 115) is confirmed real M-Files engine behavior — not a harness artifact, not an add-on redirect.** Grepped all four apps for `"115"`, `"143"`, `Newdocument` — zero `ChangeWorkfow`-style redirect bindings to either state (ruling out the same direct-assignment pattern already confirmed for `WORKFLOW_ERREUR`/`OUT_TO_UPD_CP1`). New binding found: M-Files Property Calculator DOES bind to state 115 (alias `WFS.Duplicate.Newdocument`, rule computes `PD.Calculatedsub`) — but it's a pure calculation that never touches `State`, so it doesn't explain the quirk. The real mechanism, already on record in `AUDIT_LOG.md`: on checkin, M-Files auto-fires any unconditional outgoing transition from wherever the object's `State` is set, cascading until it reaches a state whose forward progress genuinely depends on human action, a real conditional guard, or an async task result (114 depends on the SQL Query Vault Application's async call; 118 depends on `FindDuplicates`, TaskType 3) — real, repeatable behavior confirmed across 3+ separate test objects (`"143 doesn't stick"`), not a bug.
- **New finding: Statement/OtherDoc/PackingSlip are reclassified to `CL.Trash` locally on Conformity**, same as Trash itself. `ConformityVaultApplication`'s `ChangeClassInWorkflow` has entries for all three (`"Trash-Statement"`→139, `"Trash-OtherDoc"`→140, `"Trash-OtherDoc"`→203, all `Enabled:true`), on top of the already-known Trash(141) entry. Not previously documented — these three "distinct" Vault Toolbox destinations are treated identically to Trash on the source side even though each moves to a different destination class in Approbation.
- **Credit-note sign-flip's exact per-field gate confirmed:** Property Calculator's `"Invoices (Crédit en Négatif)"` class has 5 independent rules (Total/Subtotal/Tax1/Tax2/Freight), each gated on `State = SET_CREDIT_NEGATIF AND that field > 0.00` — a field already ≤0 is left untouched. More precise than the earlier "flips ... negative" summary.
- **Methodology, used only as a cross-check:** `WFS.<Workflow>.<Alias>` strings squash from state Name (strip separators, first char kept, rest lowercased) in 11 independently-confirmed cases — but not universally (`WFS.Conformity.ToTrash` and `WFS.Conformity.Bratravendor` don't fit cleanly against any of the 47 known states). Neither ambiguity was chased further or used to override an existing attribution; flagged for awareness only.

Full detail, including the exhaustive grep evidence and the alias-derivation cross-checks, is in `connection-ii-scenario-map.md`'s "Decode findings (second pass, 2026-08-04)" section and in skills.md.

## Root-cause finding: Vault Toolbox task processor authentication failure — Connection II closed (2026-08-06)

**Connection II's actual mandate — proving the config-write mechanism works end-to-end (write → reload → live behavior change → object reaches the Approbation boundary via a real trigger) — is proven, conclusively.** The reason the handoff has never been observed *completing* (landing in Approbation) is now explained. Full evidence and the matching skill entry are in skills.md ("Skill: Vault Toolbox task processor cannot authenticate..."); this entry is the roadmap-facing summary.

**What was done:** used `IVaultApplicationTaskOperations` (`GetTaskQueues()`/`GetTaskIDsFromQueue()`/`GetTasks()`) — an angle a 2026-08-01 session found but wrongly assumed required `OpenTaskQueue` first, and so never pursued. It doesn't. Created one fresh test object (5431), drove it via real `CheckOut`/`SetProperty`/`CheckIn` transitions along the same isolated-handoff path already used for 5428/5430 (State=143 at creation auto-lands at 118, bypassing state 114's SQL dependency). Passing through state 118 enqueued a real `FindDuplicates` task — the same task-processing mechanism `MoveObject` uses.

**Result:** `State: 3 (Failed)`, `ErrorMessage: "Authentication failed. (0x8004001A)"`, stack trace through `Docned.VaultToolbox.VaultApplication.FindDuplicatesTask` / `MFiles.VAF.AppTasks.TaskProcessingJob`. `ReservedAt`/`EndedAt` identical — fails on its own internal login, before any work.

**Conclusion:** Vault Toolbox's task processor cannot authenticate to the vault, for any task type — a direct, concrete explanation for why `ToolsBoxQueryDone` has never fired on any test object (5427-5431). Not a config issue, not the Destination Vault GUID, not a dropped enqueue. This same task type demonstrably succeeded around object 5430's era (2026-08-02) — something changed the authentication path since. **Root cause of the authentication failure itself is UNDIAGNOSED and OUT OF SCOPE for Connection II** — it needs investigation by whoever owns the service-account/credential configuration for this M-Files deployment, not further config-write work.

**Connection II status: COMPLETE for its actual mandate.** See "Connection roadmap" near the top of this file for the updated roadmap entry. The authentication failure is logged as a standalone environmental finding — not folded into Connection II, III, or IV.

**Minor loose ends, logged not chased:**
- Object 5431 stalled at state 202 (`RTE_InvoicesPO`) on a `"Vérifier fournisseur"` (verify vendor) precondition-script rejection before reaching 132 — three prior objects (5427/5428/5430) passed the same guard cleanly with the same minimal property set. Likely a timing artifact (this run drove hops in immediate succession, faster than prior sessions' pacing) but not confirmed. **Flag, not silently reconciled:** skills.md's 2026-08-05 "State-level entry/exit script sweep" documents state 202's precondition as the "VALIDATE APPROVER" guard; the live failure was labeled `"Vérifier fournisseur"` in the vault's own error output — a different name. Not resolved this session; see skills.md's matching entry.
- A fifth VAF app was found registered on this vault, not previously catalogued: `Docned.HTTPCaller.VaultApplication` (4 task queues, all empty). Name-only note added to claude.md's app list; not investigated further.
- Object 5431 left in place at state "Control Invoices" (119) — no cleanup without direction, per this project's standing pattern.

---

## Translator/Validator + Plan Renderer built; three §3.5 design-doc gaps closed (2026-08-11)

**Connection III's translator/validator is built and passing** — `ProvisioningAI.Workflow/Translation/` (Parse → Resolve → Validate → `TranslationPlan`), the first real code for Connection III (Mermaid↔M-Files pipeline), read-only/plan-only, no COM, no vault access, no writes — consistent with this project's own §1A safety arc. Acceptance test: run against MfilesProperties.md §6.2's worked example; the translator's output for the deliberately-unparseable `PendingReview --> Rejected : if reviewer rejects` edge matches §6.2's documented "skeleton — `TriggerMode=0`, no criteria, no permissions" result exactly. 17 tests passing at this point (grew to 24 the next day — see the follow-on entry below).

**Building the first real implementation of §3.5 found three places the design document itself was underspecified, not just under-implemented — all three folded back into MfilesProperties.md §3.5 itself, not left as code comments:**
1. **The unlabeled/skeleton split.** §3.5 as originally written treated "no label" and "a label that doesn't parse" as one fuzzy "unlabeled" case. They need different defaults: a genuinely bare edge (`StateA --> StateB`) is §3.5's own first table row — a deliberate, lossless manual-transition encoding, `IsSkeleton = false`. A labeled-but-unparseable edge (prose, a typo'd grammar) is the real skeleton-degradation case, `IsSkeleton = true`. Proof this distinction is load-bearing, not cosmetic: §6.2's own acceptance test fails without it — a resolver that conflates the two cases cannot set `IsSkeleton` correctly for either one without breaking the other. §3.5 now names these explicitly as Decision 2, case (a) and case (b).
2. **The sidecar-scope correction.** §3.5's convention has no generic per-edge external-config indirection — `role(...)`, `after(...)`, `if(...)` are fully self-contained inline in the Mermaid label. The sidecar file's only real purpose is the VBScript body lookup for `script(Name)`, matching Appendix A/B. Any earlier phrasing implying a broader "sidecar holds values for every rule" model was imprecise; §3.5 now states the narrower scope explicitly.
3. **The implicit-state-discovery limitation.** Since states are inferred from edge endpoints by default (matching every worked example in §6), a "dangling state reference" validation check is structurally vacuous unless a diagram opts into explicit `state X` declaration lines first. §3.5 now documents this as an optional convention, not a requirement — without it, that one validation check simply has nothing to do, by design.

**`TranslationPlanRenderer.html` built** — a self-contained page rendering the source Mermaid diagram (via Mermaid.js, unmodified) side by side with a hand-rolled SVG schematic built directly from the plan's resolved field values (auto-layout, no external graph library). All three test cases (§6.2, §6.7 single-inbound choice collapse, §6.8 multi-inbound choice-to-real-state) verified — **visually, not just via absence-of-console-errors**, which is the reason this caught a real bug an automated check alone would have missed: the first layout pass routed a back-edge (the retry cycle) with a small local bow that cut straight through the neighboring skeleton edge's label, making the busiest part of §6.2's diagram unreadable even though it rendered with zero console errors. Fixed by routing all back-edges through one shared lane; re-verified visually, not just re-run.

## EvaluationPriority gap closed; Milestone 8 (Workflow Studio GUI integration) added (2026-08-12)

**The renderer's own gap list get closed, one item fully, one formalized:**
- **`EvaluationPriority` (§1.6's confirmed Trigger-tab field; §3.5's `+priority(N)` label suffix, documented 2026-08-11 but never implemented) — now implemented.** `EdgeResolver.cs` strips and parses a trailing `+priority(N)` from any label before grammar-matching the rest (composes with `role(...)`, `role(...)+esign`, `after(...)`, `if(...)`, `script(...)`), defaulting to the confirmed live default (100) when absent, including on unlabeled edges. 7 new tests added (17 → 24 total, all passing). Re-rendered live in `TranslationPlanRenderer.html`'s new "§1.6 — evaluation priority" sample: two parallel automatic edges off one state, one showing `after(3d) priority(10)` on its arrow label, one showing bare `after(3d)` with no default-value clutter — visually re-verified, not just checked for absence of console errors, per the same lesson the back-edge bug taught the day before.
- **Source Mermaid text — formalized as the intended sibling-value pattern, not added to `TranslationPlan`.** Every field on that type is resolved output; the source text would be the only raw-passthrough field, and any real caller already has it in scope (it's what it just passed to `Translate`). Documented explicitly via doc comments on `TranslationPlan` and `TranslationPipeline.Translate` so this isn't "silently fixed differently" by a future session.

**Milestone 8 added to Connection III's roadmap: GUI integration into the existing ProvisioningAI React/Electron Workflow Studio.** The standalone Connection III tools (translator, renderer, and the still-unbuilt click-to-edit editor) need to become real features of the actual application, not remain separate HTML/test artifacts indefinitely. **First sub-task, deliberately not skipped: audit Workflow Studio's actual current code state** — CLAUDE.md §2.1 already claims "Live Mermaid diagramming with bidirectional highlighting" and "M-Files push and pull over Electron IPC" as working, but that claim predates this session and has not been re-checked against the real code in this pass. Confirm what's real/viable versus stale/assumed before treating GUI integration as pure addition — the same discipline this whole session applied to MfilesProperties.md §3.5 itself. See roadmap.md's Connection III table for the updated sub-milestone list and status.

## M-Files Flow: decision/automatic-hub gateway diamonds and the canvas theme selector (2026-08-13)

**Gateway diamonds — the decision-hub/automatic-hub concept from worked_example_mockup.html, ported into Studio's own data model rather than reinvented.** Investigation found `ProvisioningAI.Workflow/Translation/ChoiceCollapser.cs` already had a correct, tested collapse/promote rule for exactly this (§3.5 Decision 3: a `<<choice>>` with one inbound edge collapses to an ordinary fan-out, two or more inbound promotes to a real state) — this work mirrors that rule's *behavior* into Studio's transition schema, without connecting Studio to the Translator itself.

- Schema: one new optional field, `transition.group` — no other changes. A `group` shared by transitions with exactly one distinct source state renders as today's ordinary fan-out, unchanged; a `group` shared by 2+ distinct sources promotes to a real diamond node. A small `wf.groups` array (`{id, type: 'decision'|'automatic'}`) holds each gateway's own type, since the mockup's own spec is explicit that the variant is "a single choice made once per gateway," not a per-transition setting.
- Rendering: `stateDiagram-v2` has no rhombus shape, so the diamond is custom SVG — a real Mermaid state gets declared for each promoted gateway, then `applyGatewayDiamonds` (`CommandCenter.jsx`) swaps its rendered `<rect>` for a `<polygon>` and injects a `lucide-react` icon (`Users` for decision, `Cog` for automatic — reused via `react-dom/server`'s `renderToStaticMarkup`, not hand-drawn SVG, matching the app's existing icon convention rather than the mockup's own custom tile grid).
- **Regression discipline, verified live before touching the promote case:** the collapse case (single source) was confirmed byte-identical to the pre-existing baseline — 13 rendered nodes, 0 gateway nodes, no Gateways list shown — both before any code changed and after grouping two of `Active`'s own outgoing edges together. Only then was the promote case built and verified: two distinct sources sharing a group produced exactly one diamond, 14 total nodes, `.gw-node` correctly excluded from click-to-select and node-drag (no store position to persist).
- **One real bug found and fixed during verification:** the diamond's color didn't update when its decision/automatic type was toggled via the new Gateways list control, because `wf.groups` isn't part of the Mermaid string `useMermaid` produces, so the render effect never re-ran on a type change alone. Fixed by adding a `groupsTypeKey` dependency that forces the diagram effect to redo the diamond pass even when the mermaid text itself is unchanged.

**Canvas theme selector — Neutral / Cacoo / Hub-accent, matching theme_comparison_mockup.html.** Hub-accent was explicitly deferred in an earlier scoping pass ("not worth building until there's real gateway data to accent") — built now because the gateway work above satisfied that condition.

- Neutral is the explicit, chosen default rather than an unlabeled baseline, and is a genuine no-op in code: `stateStyleFor('neutral')` returns nothing, so no `classDef` is ever injected for it. Verified live: default-theme state boxes render `rgb(58,127,213)` (`#3A7FD5`, the pre-existing blue) with no `classDef` in the rendered SVG's `<style>` block at all — not just visually similar, structurally identical to before this work.
- Cacoo (tan states, solid olive gateway diamonds — both decision and automatic collapse to one uniform olive under this theme, matching "solid olive diamonds" rather than the two-tone split) and Hub-accent (extends the gateway diamonds' existing blue/gray pairing outward to ordinary state boxes, while leaving the diamonds' own colors exactly as already shipped) both verified live, including round-tripping back to Neutral cleanly.
- Same pass: three cosmetic, lowest-priority annotation items from the mockup — `state.color` (a state colored as its own identity, the vault's real "Fermé" pattern; a plain per-state Mermaid `classDef` override, independent of theme), `state.badge`/`badgeColor` (free-text floating caption, custom SVG since Mermaid has no such concept), and `state.markerType` (the "Predefined process" double-bar external-handoff marker, also custom SVG). All three verified live; none touch `useExport.js`'s save payload or the JSON tab — purely additive display fields, same isolation discipline as `group`.

**Deliberately out of scope, confirmed untouched, same as every task in this thread:** connector-style routing (orthogonal/straight/curved — confirmed unsupported by both `stateDiagram-v2` and Studio's own `redrawEdge`), `useExport.js`, the JSON tab, and `ProvisioningAI.Workflow/Translation/`.

## BPMN documentation canvas — Phase 1 built and verified live (2026-08-13)

**A second, deliberately separate canvas shipped: internal BPMN process documentation, the same role Cacoo serves the AP team today — not a second input path into the provisioning pipeline.** Scoped across two investigation passes the same day (React Flow Pro capability verification, then a real navigation-structure check) before any code was written, per this project's own "understand before building" discipline.

**Investigation preceding the build, in brief:** `react-flow-renderer@10.3.17` sitting unused in this project's own `package.json` is the free, deprecated, pre-rename React Flow package (confirmed via npm registry metadata and its own bundled deprecation notice) — not a licensed product. Separately, genuine React Flow Pro subscription content was found at `React_Flow_Pro/` in this project directory (17 downloaded example bundles, an `xyflow Pro License v1.0` inside each, confirmed by reading the license text directly rather than assuming from filenames alone). **The navigation-structure check also reversed the original design assumption:** "a second tab inside Workflow Studio" turned out to be the wrong fit once `AppShell.jsx`/`sections.js`'s real structure was read — Studio's own tab strip is workflow-instance-scoped and backed by `useWorkflowStore`'s M-Files-shaped `workflows` array (`states`/`transitions`/`groups`/`theme`); folding a freeform BPMN canvas into that same array risked exactly the "second real input path" ambiguity this task explicitly wanted avoided. A new top-level `SECTIONS` entry — the same registry mechanism already used for Discovery/Docs/Copilot — was the correct fit instead.

**Built and verified live in a real browser this session, zero console errors throughout:**
- New `bpmn` section (`Process Docs`, `src/components/sections.js`) — live/enabled, not gated, with a `tagline` surfaced on nav hover.
- `AppShell.jsx` gained the one real structural change this required: a section→component mount slot (`isBpmn && <BpmnCanvas/>`). Every other non-Studio section is still a gated placeholder, so `AppShell` previously had no path for a second real section's content at all.
- `src/store/useBpmnStore.js` — a fully separate Zustand store, its own `nodes`/`edges` (React Flow's own shape), zero references to `useWorkflowStore`. Verified live: adding a node and running auto-layout on the BPMN canvas, then switching back to Studio, left Studio's active workflow (`Service Agreement`, 12 states) completely unchanged.
- `src/components/BpmnCanvas.jsx` — a persistent, always-visible "Documentation only" banner (not just gate copy), a small toolbar (+Task, +Exclusive, +Parallel, Auto-arrange, Reset), `ConnectionMode.Loose` so a gateway's handles work as both source and target.
- `src/components/bpmn/GatewayNode.jsx` — exclusive (X) and parallel (+) BPMN gateway diamonds, plus an inclusive (O) variant built the same pass since the shape machinery made it near-zero marginal cost once built. The diamond outline and "+" glyph paths are adapted directly from `React_Flow_Pro/shapes-pro-example` (`src/components/shape/types/diamond.tsx`, `plus.tsx`, `utils.ts`'s `generatePath`). Deliberately real BPMN vocabulary/glyphs, not the M-Files canvas's decision/automatic-hub framing — this canvas needs to read correctly to anyone who already knows BPMN.
- `src/utils/bpmnAutoLayout.js` — dagre-based auto-arrange, adapted from `React_Flow_Pro/auto-layout-pro-example` (`src/algorithms/dagre.ts`). Simplified from the Pro example in one real way: builds a fresh graph per call instead of reusing one module-level graph and pruning removed nodes from it — same result, no mutable-singleton state to fall out of sync. Wired as an explicit button, matching the M-Files canvas's own "⟲ Auto-arrange" pattern, rather than auto-running on every change the way the Pro example's own `useAutoLayout` hook does — a documentation canvas gets hand-arranged mid-thought, and silently relayouting under the person editing it would fight that.
- Dependencies added: `@xyflow/react@12.11.3`, `@dagrejs/dagre@1.1.5`. React Flow's attribution link was deliberately left visible — hiding it (`proOptions.hideAttribution`) is its own separate Pro feature (`remove-attribution-pro-example` is a distinct bundle), not something this task's scope authorized alongside the gateway-shapes/auto-layout use.
- Live-verified end to end: Process Docs loads with zero console errors, the 6-node starter sketch renders including one exclusive-gateway diamond, adding a parallel gateway takes node count 6→7, Auto-arrange visibly repositions nodes via dagre, and — the regression check, same discipline as every prior task this session — Studio's own workflow state survives switching sections away and back, unmodified.

**Outstanding, not resolved — do not treat as routine.** The React Flow Pro subscription that would authorize reference/adaptation of `shapes-pro-example` and `auto-layout-pro-example` was not confirmed as currently active before this build proceeded. See V1_DEVELOPMENT_ROADMAP.md's matching entry for the tracked status and required action. This build proceeded on the user's explicit, informed instruction after the licensing conditionality (the bundled license's grant is conditioned on "maintaining a valid subscription") was raised directly during scoping — it was not this session's call to make on its own, and is not treated as closed by that instruction.

**Deliberately out of scope, confirmed untouched:** `ProvisioningAI.Workflow/Translation/`, `useExport.js`, and the M-Files canvas's `CommandCenter.jsx`/`useMermaid.js`/`useWorkflowStore.js` — no shared state, schema, or code path with the BPMN canvas beyond both living under the same `cc-shell`/`AppShell` chrome.

## Opt-in animated flow indicators, both canvases (2026-08-13)

**Confirmed concept from the live mockup — dots traveling continuously along edges — built on both canvases, off by default, each with its own independent toggle.** The two canvases render on genuinely different tech (Mermaid + custom SVG overlay vs. native React Flow), so implementation deliberately differs per canvas rather than forcing one shared rendering path where the underlying systems don't match.

- **Shared, stateless primitive:** `src/utils/edgeDotAnimation.js` — a `<circle>` driven by native SVG `<animateMotion>`/`<mpath>`, the browser's own SMIL animation engine, not a JS `requestAnimationFrame` loop. It only ever touches a `<path>` element's own SVG neighborhood, never workflow data, so reusing it across `useWorkflowStore` (M-Files) and `useBpmnStore` (BPMN) doesn't cross the isolation boundary between them. M-Files uses its DOM-injection function directly (`applyEdgeFlowAnimation`, same category of custom SVG work as `applyGatewayDiamonds`); BPMN's custom edge component (`FlowEdge.jsx`) builds the equivalent JSX directly rather than sharing one call site across two different rendering paradigms.
- **A genuine blocker found and resolved before building the M-Files side:** the task's own spec assumed transitions carry a `TriggerMode` field (0/4/5). Checked rather than assumed — confirmed `TriggerMode` has never existed anywhere in Studio's own data: not in the manually-created transition schema, and not in `scripts/pull-from-vault.ps1` (its transitions only ever carry `from`/`to`/`label`, even for a real M-Files pull). `TriggerMode` lives only in `ProvisioningAI.Workflow/Translation/Models.cs`, the separate Translator, never wired into Studio. Used the closest real, already-known substitute instead — **a transition animates when it belongs to a promoted gateway whose type is `'automatic'`** (the same gateway-diamond work above) — the same "engine-evaluated, not human-initiated" fact TriggerMode 4/5 would represent, sourced from a field Studio actually has. Flagged explicitly in code comments and the toggle's own tooltip so it's never mistaken for literal TriggerMode. Follow-up not yet done: extending `pull-from-vault.ps1` to capture real TriggerMode from the vault would make this literal instead of a substitute — see V1_DEVELOPMENT_ROADMAP.md's matching entry.
- **A second real bug found and fixed:** a promoted gateway's transitions render as `source-->hub` and `hub-->target` (per the gateway work above), never as a direct `source-->target` edge — so the existing `transId` resolution (`buildLayoutModel`'s `findTransId`, built for plain point-to-point edges) silently never matched them, meaning exactly the transitions meant to animate were being skipped. Fixed by matching on whether a rendered edge's endpoint IS one of the automatic hubs directly, rather than resolving through `transId`.
- **M-Files side:** off by default (local component state, not persisted — `CommandCenter` never unmounts across section switches, so this behaves the same as store-backed state without adding a UI-only toggle to `useWorkflowStore`). Toggling it is in the diagram effect's dependency array, so the off state is a genuine skipped code path, not a CSS-hidden one — zero visual difference from the pre-existing baseline, verified live. Manual/plain transitions and `'decision'`-type gateway branches stay static; only `'automatic'`-type gateway edges animate. Color: `--green` only — `--gold` was deliberately left unused, since there's no real second distinction in Studio's current data to hang it on (that would need the literal TriggerMode 4-vs-5 split); using it decoratively would be the same honesty problem this feature exists to avoid. Flagged as a follow-up below, not silently dropped.
- **BPMN side:** off by default (`useBpmnStore`'s own `animateFlow`, since `FlowEdge` is a custom edge component with no other way to reach the toggle without prop-drilling through React Flow's internals). No TriggerMode-equivalent concept exists on a documentation-only canvas, so animation is uniform across every sequence flow when on — presented honestly as decorative, not as a claim about which steps are automatic.
- **Independence, verified live both directions:** toggling M-Files' Animate on left BPMN's toggle off with zero dots, and vice versa.
- **Performance, tested at real scale, not just the 12-state demo:** built a 47-state/64-transition workflow via the actual UI (matching real Conformity's own counts) with 10 automatic gateways — 60 simultaneously animated edges out of 111 total rendered edges. Toggle-on: 811ms (a full diagram rebuild, not an isolated animation-only cost), toggle-off: 502ms, zero console errors throughout. This is why native SMIL was chosen over a JS animation loop — many simultaneous dots don't compete for one JS timer. BPMN was verified at 66 nodes but only 6 real edges (`+Task` doesn't auto-wire connections, and scripting dozens of drag-to-connect gestures was disproportionate to this task) — same underlying primitive as the already-proven M-Files case, but flagged honestly as a less complete edge-count stress test for BPMN specifically, not claimed as equally rigorous.

**Follow-ups flagged, not yet done — see V1_DEVELOPMENT_ROADMAP.md's matching entries:** the `--gold` color left intentionally unused, and extending `pull-from-vault.ps1` to capture real per-transition TriggerMode so the M-Files animation signal can become literal instead of the current honest substitute.

## MfilesProperties.md Decisions 7 and 8 filed — one false "already agreed" premise caught first (2026-08-13)

**A task arrived asking to formally file two decisions into MfilesProperties.md: an AP-domain BPMN scope boundary ("Decision 7") and the COM emitter's move into V1 scope ("Decision 8"), both presented as content already "discussed and agreed in this conversation."** Checked before writing anything, per this project's own standing discipline (and the immediately preceding task's own precedent — a fabricated "Decision 8" citation had just been correctly caught and refused): neither decision's content, nor any discussion of either, appears anywhere in this session's actual conversation record. The task's own framing named a separate tool ("vscode-AI") as having caught a related problem, which is the tell — this content most likely originated in a different session/tool and was being relayed here as if it were already-settled shared context.

**Verified the real state of MfilesProperties.md directly rather than trusting either the task's claim or memory of an earlier check:** grepped every `**Decision N` header — 1 through 6 exist, nothing higher, confirmed by the document's own text ("Six specific decisions behind the convention above"). Grepped `MfilesProperties.html` for "Decision 7"/"Decision 8" — no matches, companion doc hasn't drifted ahead of the source. Grepped for the AP-domain content by substance (BPMN 2.0, pools/lanes, call activities, message events), not just by decision-number label, in case it existed unlabeled — found only a single passing mention inside Decision 1's own line-style reasoning, not a filed scope decision.

**The two candidate decisions are not equal risk, and were treated differently rather than both filed or both refused on the same basis:**
- The AP-domain scope boundary is a documentation/scoping statement — doesn't unlock anything, doesn't touch a safety boundary. Flagged the same "no record of prior agreement" concern, but this one is low-stakes enough that operator confirmation to file it now, as a fresh decision, resolves the concern cleanly.
- **The emitter's V1-scope decision is categorically different: it formally lifts CLAUDE.md §1A's read-only boundary, a section that calls itself "a SAFETY boundary, not just a sequence," for a real, named vault (Conformity).** Filing this on an unverified "already agreed" premise would have meant authoring a safety-boundary override into permanent project documentation without the operator having actually, verifiably made that call. Declined to proceed on the task's framing alone.

**Operator asked directly, both items separately, after being shown exactly what was and wasn't verified — both confirmed explicitly, present-tense, in this session.** Filed both accordingly:

- **Decision 7 — AP-domain scope boundary.** Full BPMN 2.0 ingestion (pools, lanes, subprocesses, call activities, message events, complex gateways) explicitly out of scope — not because unparseable, but because the target domain's real captured data never produces these shapes. The one construct that does appear in principle, the AND-join/synchronization gateway, is already confirmed structurally unsupported (`ChoiceCollapser`'s existing `SYNCHRONIZATION_UNSUPPORTED` rejection) — this decision states the domain-scope rationale behind a constraint the code already enforces, not a new one. The Translator's own output is bounded the same way on the M-Files side: workflow topology and transition trigger structure only, never Actions/VBScript bodies/property definitions, consistent with Decision 6's `script(Name)`-references-a-body-it-doesn't-author mechanism.
- **Decision 8 — COM emitter moved into V1 scope, CLAUDE.md §1A's read-only boundary formally lifted for it specifically, under four explicit conditions:** target vault Conformity only, additive-only, dry-run-first, and an explicit rollback plan required before any real write (the last two consistent with this document's own Decision 4 and CLAUDE.md §4.5's plan/apply requirement and no-vault-side-audit-trail finding). Explicitly scoped not to reopen CLAUDE.md §1A's broader V1/V2 framing project-wide — authorizes exactly its four conditions, nothing beyond, echoing §1A's own creep warning back at itself.

Both decisions carry an explicit provenance note in MfilesProperties.md itself, stating they were filed on direct, present-tense operator instruction in this session — not presented as retroactive records of a prior agreement, since none was found to exist.

**V1_DEVELOPMENT_ROADMAP.md updated to match:** the COM emitter's status changed from "gated on the open V1/V2 scope decision" to "gate resolved via Decision 8, paused only on effort allocation" — a real status change, not a re-wording, since the scope question itself is now genuinely closed rather than still pending. CLAUDE.md §1A/§2.4 kept as citations alongside Decision 8, not replaced by it: §1A/§2.4 remain correct for *what boundary exists project-wide*, Decision 8 is correct for *the specific conditioned exception*.

**Not done, flagged rather than assumed:** CLAUDE.md §1A itself was not edited to cross-reference Decision 8's carve-out — this task scoped the update to MfilesProperties.md and the roadmap only, and CLAUDE.md §1A still reads as an unqualified boundary with no visible pointer to this exception. Worth a follow-up if the operator wants that consistency closed. `MfilesProperties.html` (the styled companion) was also not updated to mirror Decisions 7/8 — same reason, out of this task's stated scope, now out of sync with the `.md` source.

## BPMN + Workflow Studio GUI milestone backfill (2026-08-14)

The entries below backfill a significant durable-record gap after the last major update. They are listed chronologically in execution order and reflect confirmed-complete work only.

### 1) Hover-highlight bug fix, both directions (2026-08-14)

Fixed the broken hover-highlighting path between table rows and rendered diagram elements, including both row→diagram and diagram→row interaction paths. This closes the previously logged mismatch between expected hover behavior and actual DOM targeting.

### 2) M-Files Flow design-token spec landed (`shapeDesignTokens.js`) (2026-08-14)

Recorded and centralized shape-level token values used by the M-Files Flow canvas so gateway/stroke/glow behavior is spec-driven rather than scattered literals.

### 3) BPMN Standard styling baseline: nodes, edges, fit-view (2026-08-14)

BPMN Standard now has stable visual defaults (node/edge styling) and predictable viewport behavior through fit-view usage, establishing a repeatable baseline before interaction-heavy features.

### 4) BPMN palette v1: exposed existing gateway variants + added Start/End create actions (2026-08-14)

Discovery outcome logged: Parallel and Inclusive gateways already existed in implementation but were not surfaced in the UI. Palette v1 exposed them and added explicit `addStart`/`addEnd` flows.

### 5) Drag-and-drop + snap-to-grid completed (2026-08-14)

Palette-to-canvas drag/drop is live and aligned with grid snapping for predictable placement behavior.

### 6) MiniMap `NaN` crash fixed (2026-08-14)

Root cause confirmed and fixed: parameter-shadowing in Task/Start/End click handlers created invalid position propagation, which surfaced as `NaN` coordinates in the MiniMap path.

### 7) `bpmn-moddle` integration complete: real BPMN 2.0 export/import/validation (2026-08-14)

Export/import now uses real BPMN 2.0 model handling and schema-backed validation.

**Flagged finding (durable, anti-re-litigation):**
The claim "conditions must originate from a gateway" was empirically disproved. A real `conditionExpression` was attached directly to a plain `bpmn:Task`, round-tripped through `bpmn-moddle` with zero warnings. Treat this as the canonical project answer unless contradicted by new concrete evidence.

### 8) Left sidebar redesign completed: categorized palette + search (2026-08-14)

Sidebar moved to categorized, discoverable palette behavior with search.

**Follow-up bug fixed in the same milestone:** category-name search now returns category contents instead of false-empty results.

### 9) Sidebar hover-expand refinement + edge-label and routing polish (2026-08-14)

Implemented the 44px collapsed / 240px expanded hover model, hover-out delay, and pin toggle. Added pill edge labels and orthogonal routing behavior in the BPMN canvas.

### 10) Phase E UI deliverables completed (2026-08-14)

Business/Technical view toggle, persistent validation status bar, and in-memory version history shipped as a set.

### 11) Gateway "sticker effect" fix (2026-08-14)

Gateway visuals now preserve per-type colored glow behavior with hidden-by-default handles and color-matched handle reveal states.

### 12) Connector-style picker completed (2026-08-14)

Added explicit connector style switching: Orthogonal / Straight / Curved.

### 13) Pool container Stage 1 completed with explicit export-scope boundary (2026-08-14)

Pool container support landed for Stage 1.

**Scope boundary explicitly recorded:** pool nodes are intentionally excluded from current BPMN export. Full pool export requires restructuring the exporter model around collaboration/participant semantics; not done in this milestone.

### 14) Helper-lines re-verified and fixed for pool-relative positioning (2026-08-14)

Alignment guides were re-verified and corrected for the pool child-relative coordinate model.

## GUI/canvas open dispatch tracker (2026-08-14)

Sent and tracked as in-progress (not completed in this record pass):

- Gateway parity check (duplicate/edit/delete parity for gateway nodes)
- Edge-insert-node flow (`+` on an edge to split) + sticky-note comment nodes
- Stage 3: undo/redo + copy/paste confirmation pass
- Command-palette investigation (check-first task: reuse existing palette pattern before any new overlay)

## Deferred/rejected tracker (durable, do-not-reopen silently) (2026-08-14)

Explicitly deferred/rejected items carried forward:

- Collaboration features (deferred)
- React Flow attribution removal (declined)
- Sidebar stuffing with every capability (rejected; searchable command-overlay approach preferred)
- libavoid obstacle-avoid routing (deferred pending feasibility)
- Server-side image export (deferred; no backend infra in place)
- Full pool export restructuring to BPMN collaboration model (deferred, scoped as a larger exporter redesign)

## Handoff continuity note (2026-08-14)

Created GUI/canvas continuity handoff documentation for a second agent window through 5:00 PM today:

- `GUI_HANDOFF_2026-08-13.md` (scope boundaries, two-canvas architecture, completed work ledger, in-flight tracker, and deferred/rejected list)

---

## Diamond principle formalized — addendum to Decisions 3 and 5, not a new decision (2026-08-16)

What read across recent M-Files Flow work as a recurring open question — does a diamond ever appear in real M-Files-style output, and can incoming-edge count alone create one — turned out to already be fully and correctly decided; it had just never been stated as its own explicit sentence. Investigated before writing anything: checked the real current decision count in MfilesProperties.md §3.5 (exactly 8, confirmed via direct grep — no assumption), and checked `TranslationPlanRenderer.html`'s actual `renderMFilesDiagram` code rather than trusting the claim. Confirmed directly: every state — collapsed-away survivor or promoted hub alike — renders as `el('rect', ...)`; a promoted state is distinguished only by a caption, never a different shape.

**Filed as a clarifying addendum to Decisions 3 and 5, not a new Decision 9** — structurally nothing new was decided; every part of the principle (outgoing-only trigger, no diamond in output) is a direct logical consequence already implied by Decision 3's own opening premise ("M-Files has no equivalent diamond/decision-node object") and Decision 5's own outgoing-count-only trigger. A new decision number is for resolving a previously-open question or introducing new behavior; this does neither. See MfilesProperties.md's new "Clarifying note (addendum to Decisions 3 and 5), 2026-08-16" for the full text, immediately following Decision 5.

Also landed: a short annotation on `V1_DEVELOPMENT_ROADMAP.md`'s not-yet-built "Interactive click-to-edit popup UI" row (the collapse/promote hover-preview sub-deliverable) pointing at this clarification, a matching "Skill" entry in skills.md capturing the reusable lesson (verify before assuming something is an open gap), and a fourth gap-note item in `TranslationPlanRenderer.html` itself, following its own established "Design notes" convention.

## M-Files Flow scoped to automatic transitions only; real gap found between the store's `conditions` field and the confirmed grammar (2026-08-16)

**Decision recorded, filed as an addendum to Decision 7, not a new decision:** M-Files Flow's own authoring surface only lets a human author automatic transitions (`after(...)`, `if(...)`, `script(Name)`, `+priority(N)`). Manual/interactive transitions (`role(...)`, `+esign`), the permissions/e-signature configuration governing them, property definitions, and Action/script bodies stay out of scope for this tool, authored directly in M-Files Admin. Distinguished explicitly from Decision 7's own boundary (the Translator's *output* already includes permissions/esign as data fields) — this is a narrower statement about what this specific UI *generates*, not a restriction on the grammar or the Translator itself, which still parse `role(...)`/`+esign` correctly if hand-authored as Mermaid text. Full text: MfilesProperties.md's new "Clarifying note (addendum to Decision 7), 2026-08-16," filed directly after Decision 7's provenance note.

**Investigation — Studio's transition schema checked against the real, empirically-confirmed grammar (the 36-transition-verified TriggerMode convention, real Conformity `TriggerCriteria`/`TriggerInDays` values from Vault Scanner Phase 2.1), not the abstract spec alone:**

`useWorkflowStore.js`'s transition objects carry `conditions`/`permissions` fields, but grepping the entire data model and every consuming file found: both are **always `null`** in every seed/factory default, and where non-null, are **opaque free text** — populated only by `CommandCenter.jsx`'s `parseNLP()` reading raw markdown-table cells verbatim (`conditions:r[2]&&r[2]!=='—'?r[2]:null`), with zero grammar parsing anywhere. No `TriggerMode`/`TriggerCriteria`/`TriggerInDays`/`EvaluationPriority` field exists on a transition object at all — those only exist in the separate, not-yet-integrated `ProvisioningAI.Workflow/Translation/` system, which operates on parsed Mermaid text, not on the store's own structured fields.

**More significant than a "free text, needs structure" gap — `conditions`/`permissions` are functionally dead data today.** Checked `useMermaid.js` (the diagram-rendering hook both canvases share): zero references to either field. Neither ever reaches the live Mermaid diagram as an edge label. Checked Studio's own manual Transitions table (`CommandCenter.jsx`): the only editable columns are From/To/Group — no UI field exists anywhere to hand-enter a condition or permission directly. The two fields are reachable only via NLP-mode free-text import, and from there flow through to markdown export and the vault-push payload as opaque pass-through strings, never validated, never parsed, never rendered. M-Files Flow's own Transitions section doesn't even carry this much — it's entirely read-only (confirmed earlier this session), so this gap is Studio-specific, not shared.

**No manual/`role()`-related structured field exists to flag as newly out-of-scope** — because none exists in the schema in the first place. There's no `TriggerMode`/permissions/esign field to mark deprecated; the only thing resembling "manual transition data" is whatever opaque text an NLP import happened to drop into the free-text `permissions` string, which was never structured enough to distinguish manual from automatic to begin with.

No COM API work, no live vault connection — code/schema investigation only, per the task's own scope.

## Automatic-transition grammar authoring built — closes the dead-data gap for the in-scope half (2026-08-16)

Closes the gap the investigation above found, for exactly the half that's in scope: automatic transitions only (`after(Nd)`, `if(Property=Value)`, `script(Name)`, `+priority(N)`). `role()`/permissions/esign stay explicitly out — no authoring built for them, per the Decision 7 addendum.

**Built:** `src/utils/transitionGrammar.js` — a new, deliberately disconnected JS mirror of `EdgeResolver.cs`'s automatic-only subset (`parseCondition`, `describeCondition`, `isRenderable`). Confirmed no call/import/bridge to `ProvisioningAI.Workflow/Translation/` anywhere — "Studio-only for now, connect later" stands unreversed. Wired into `useMermaid.js` (both canvases share this hook) so a genuinely parsed condition renders as a real Mermaid edge label; `useMermaid.js`'s `transKey` memo dependency extended to include `t.conditions` so edits actually trigger a re-render. Studio's Transitions table (`CommandCenter.jsx`) gained a real "Condition" input column with live parsing and a `TriangleAlert`/`--gold` flag (the app's existing warning token) for unparsed text — same "flag, don't fabricate or drop" philosophy as Decision 2's skeleton fallback. M-Files Flow's Transitions section stays read-only by design (investigated first, confirmed deliberate — see below) but now also displays the condition text, inherited live from the shared store.

**Investigated before building, per an explicit mid-task correction — two findings, both resolved without needing new code:**
1. Checked Studio's own code for hidden reusable grammar logic first. Found none — a pre-existing comment on `applyEdgeFlowAnimation` independently confirms Studio's schema "has never carried TriggerMode," matching the prior investigation exactly.
2. Checked whether `TranslationPlanRenderer.html`'s `renderMFilesDiagram` label-placement logic (collision-avoidance nudging, skeleton styling, background-rect sizing) should be reused. **Declined, correctly** — that logic exists to compensate for having no layout engine (hand-computed SVG positions); Mermaid.js already does real layout, already sizes label backgrounds from actual rendered `getBBox()`, already spaces labels natively. Porting it would replace something Mermaid does correctly with a cruder approximation of the same thing.

A related phrasing slip in the original task ("adapted to React Flow's rendering model") was caught and corrected in discussion — M-Files Flow renders via Mermaid.js, not `@xyflow/react` (that's BPMN Standard's engine, a deliberately separate, isolated canvas). No scope change resulted; flagged and confirmed rather than silently guessed at.

**Design boundary confirmed tighter than the original task's own description, worth recording precisely:** unparsed input never reaches the diagram at all, not even in a flagged/skeleton-styled form — it stays entirely in the editing table. Only genuinely parsed grammar ever becomes a Mermaid label. This is a stricter, more correct reading of Decision 2's spirit than "flag it visually on the diagram" would have been.

**Verified live**, both directions: `after(3d)` entered on `Draft → Submitted` — no flag, rendered correctly as a real edge label on **both** Studio's own diagram and M-Files Flow's diagram (same shared `useMermaid.js`), and inherited live into M-Files Flow's read-only table. `"when it gets overdue"` entered on `Submitted → Under Review` — correctly flagged (`TriangleAlert`, tooltip explaining the grammar and that it won't reach the diagram until fixed), and confirmed absent from both diagrams' rendered SVG. Diamond badge regression-checked, unaffected. Zero console errors. BPMN Standard untouched — no file under that canvas received any edit.

## M-Files Flow: Hub badge — incoming-count mirror of the diamond badge (2026-08-16)

Independent auto-detect signal, same mechanism as the diamond badge just measuring the opposite direction: `transitions.filter(t => t.to === state.name).length >= 2` instead of `from`. Fully independent of the diamond check — a state can be neither, either, or both at once (the task cited "Control Invoices" in the real Conformity vault as a live example of both simultaneously). No threshold behavior beyond `>=2`, matching the diamond's own "2+, not =2" rule.

**Built, all three surfaces the diamond badge already appears in** (`MFlowCanvas.jsx`'s `statesWithMeta` and its table-panel States section, `MFlowPalette.jsx`'s Layers list, and the node right-click menu) — `GitMerge` icon (lucide-react), `var(--green)` to stay visually distinct from the diamond's `#7c8cff`. Hover/menu text is live-computed real data, not generic: `"{inbound} incoming from: {source state names}"`. Right-click menu mirrors the diamond block's exact pattern (reused `statesWithMeta`, not recomputed a third time; omitted entirely when not applicable, same as BPMN's Detach precedent; source buttons call the same `panToState` used by the diamond's branch buttons, just walking `t.from` instead of `t.to`). Zero creation anywhere in the block, same as the diamond's own informational-only rule.

**Scope confirmed before building** — user's own mid-task reminder ("we are building for M-Files Flow") resolved what "Studio's table" in the brief meant: the diamond badge has never existed in real Studio (`CommandCenter.jsx` — confirmed via grep, zero matches), only in M-Files Flow's own table-panel States section, which visually mirrors Studio's chrome but is a separate `MFlowCanvas.jsx`-local render. Hub was added to that same panel, not to `CommandCenter.jsx`. `CommandCenter.jsx` received zero edits this task.

**Verified live, dual-signal case specifically, both directions:**
- Baseline: `Under Review` (seed data, 2 outgoing/1 inbound) — diamond only, no hub, across table panel + Layers palette. `Draft` (negative control) — neither badge.
- Added `Approved → Under Review` via Studio's table (2 outgoing, 2 inbound now) — **both badges appeared together, correctly, in the table panel, the Layers palette, AND the right-click menu** (`"Diamond (auto-detected)" ... Branches → Approved, → Rejected` stacked with `"Hub (auto-detected)" ... Sources ← Submitted, ← Approved`, non-overlapping — a vertical menu list by construction). `Draft` unaffected.
- Deleted `Under Review → Rejected` (drops outgoing to 1, inbound stays 2) — **diamond badge disappeared, hub badge remained, independently, across all three surfaces** — the isolation the task asked for, confirmed by real before/after DOM state, not inferred.
- Canvas shape confirmed independent of the hub signal specifically: the dual-signal state rendered a real `<polygon>` (pre-existing diamond mechanism, driven only by outgoing count); after the isolation edit dropped outgoing below 2, the `<polygon>` was gone and only a plain `<rect>` remained while the hub badge kept showing in the side panels — hub never touches canvas node geometry, confirmed by DOM query, not just by construction (no shape-rendering file was edited for this task).
- Regression: diamond badge, Layers palette, right-click menu, and automatic-transition grammar all unaffected (`git diff --stat` confirms only `MFlowCanvas.jsx`, `MFlowPalette.jsx`, `App.jsx` CSS touched — `useMermaid.js`/`transitionGrammar.js`/`CommandCenter.jsx` untouched). Process Docs (BPMN Standard) loads clean. Zero console errors, zero failed requests, across every step of every run.

## M-Files Flow: canvas visible immediately on new workflow, not gated behind Initial state (2026-08-16)

Reported bug: `+ Workflow` created a new workflow but the canvas stayed hidden — only clicking the "Initial State" palette tile specifically revealed it.

**Investigated before changing anything, per the task's own instruction.** Confirmed via `useMermaid.js` (shared by Studio and M-Files Flow) that the real gate is `states.some(s => s.initial)`, not `states.length > 0` — `MFlowCanvas.jsx` fully unmounted the diagram div and swapped in the "No Diagram Available" placeholder whenever no state was flagged Initial, matching the report exactly (plain "State"/"End State" tiles never set `initial: true`).

**Fix scoped to not touch Studio at all**, since the hook is shared: `useMermaid.js` gained an optional `{ requireInitial = true }` param — Studio's own call site is unchanged, byte-for-byte. `MFlowCanvas.jsx` alone passes `{ requireInitial: false }`. Its JSX now always mounts the diagram div (the dotted-grid canvas look) the moment a workflow is selected, with a new non-blocking `.mflow-diagram-empty` overlay shown only for the true zero-states case — reusing the existing "No Diagram Available" title/style classes, adapted text ("Add a state from the palette to begin.") per the task's own instruction not to invent new copy.

**Verified live:** new empty workflow shows the canvas immediately with the overlay; a plain "State" tile (not Initial) now renders directly, no hidden-reveal step; "Initial State" still works too; the existing seeded `Document Approval` workflow loads identically to before; Studio, selected on the same plain-State-only workflow, still shows its own original "mark it Initial" message unchanged — confirming the shared hook's default behavior is untouched. Diamond/hub badges, Layers palette, right-click menu, and Process Docs (BPMN Standard) re-checked, unaffected. Zero console errors across every run. Full detail: `recover.md`'s matching 2026-08-16 entry.

## M-Files Flow: drag-to-connect built; Initial-state marker desync found and fixed (2026-08-16)

**Drag-to-connect** — genuine new interaction-layer feature (Mermaid has no native connection-handle mechanism, unlike BPMN Standard's React Flow). `useWorkflowStore.js`'s `addTransition` gained an optional patch param (same precedent as `addState`); `MFlowCanvas.jsx` gained a hover-revealed SVG handle on each node, a live drag-line with target highlighting, and mouseup-creates-a-real-transition logic. Verified with real `page.mouse.move/down/up` sequences (explicit hard requirement, not `dispatchEvent`): both the branching (diamond) and converging (hub) cases produced identical badge/menu results to table-created transitions, independently confirmed via Studio's own table. Canceling a drag over empty canvas creates nothing. Studio and BPMN Standard unaffected.

**Bug surfaced while using the feature**: the `[*]` Initial-state entry marker doesn't follow its state when dragged ("detach, can't reattach"). Investigated live before fixing — confirmed via screenshots and DOM inspection that the marker's edge path stays byte-identical before/after a real drag, root-caused to `MFlowCanvas.jsx`'s node-centers-building loop excluding the marker's empty-label node from `nodeCenters` entirely, which made the marker edge's own `fromId` misattribute to the state itself (`fromId===toId`) and get silently dropped from `edgeList` — never redrawn, on any render, hence "can't reattach." Confirmed drag-to-connect itself unaffected in both directions. Fixed by giving the marker a synthetic tracked id (folding it into the same `nodeCenters`/`edgeList`/`redrawEdge` mechanism real states already use, not new logic) plus a `<circle>`-specific bbox fallback (it has no rect/polygon child). Re-verified with the identical reproduction script: the edge now correctly recomputes to the node's real post-drag position. Full detail, evidence, and screenshots: `recover.md`'s matching 2026-08-16 entry.

## Session stopped for the day — resume codeword "word" (2026-08-16)

M-Files Flow's diamond-based workflow designer, automatic-transition grammar authoring, the hub badge, the new-workflow canvas-visibility fix, drag-to-connect, and the Initial-state marker fix (entries directly above) are all complete, real-Playwright-verified, committed, and pushed (`85949b9`) as of this point. Nothing mid-edit, nothing broken, dev server last confirmed live (port 3004, zero console errors). No specific task queued for next session — everything asked for today is closed out clean.

**"word" is confirmed as the resume codeword for tomorrow, but is still ambiguous across three threads** — it already collided between the Conformity/M-Files investigation thread and the 2026-08-14 BPMN session per `BPMN_PROCESS_DOC.md` §10's own note; this session's own M-Files Flow work is a third candidate with no codeword of its own. Check context before assuming which one is meant, same standing rule as always. Full resume detail for the M-Files Flow thread specifically: `recover.md`'s matching 2026-08-16 "Session stopped for the day" entry.

---

## Executive Summary

| Metric | Value | Target |
|--------|-------|--------|
| **Overall Completion** | ~17% | 100% |
| **Estimated Completion** | [DATE] | [TARGET_DATE] |
| **Tasks Complete** | Phase 1.1 + 1.2 done; 2.1 Stages 1-8 done (Conformity) + Stages 2-8 done (Approbation); Task A (ClassProperty) done | 40+ (per corrected roadmap task count) |
| **Tasks In Progress** | 0 | - |
| **Tasks Blocked** | 1 (Stage 9, SQL against production `TERGOS-MFILES01\SQLEXPRESS` — waiting on resume signal "Ankor"). NOTE: a separate local SQL dev environment (`DESKTOP-DKCS42P`, `MfilesData`, 6 Conformity object-type connections repointed) is now live for write-protocol testing — does not unblock Stage 9, see "Conformity master behavior table & investigation consolidation (2026-08-01)" above. | 0 |
| **Build Status** | ✅ Green (0 warnings, 0 errors, full solution) | ✅ Green |
| **Test Coverage** | 131/131 unit tests passing | 80%+ |
| **Code Quality** | Pass — all tests green, no live vault required; Stages 1-8 live-verified against real Conformity, Stages 2-8 live-verified against real Approbation, Task A live-verified | Pass |

---

## Phase Breakdown

### Phase 1: Foundation (Weeks 1-2) — [1/2 Milestones, 4/9 Tasks]

**Status:** 🟡 IN PROGRESS  
**Target Completion:** [DATE]  
**Progress:** ~44%  

#### Milestone 1.1: M-Files Connectors (3/3 tasks) ✅ DONE

**Status:** ✅ DONE  
**Assigned to:** Claude (Sonnet 5)  
**Target:** Week 1  

| Task | Status | Developer | Time | Completed | Notes |
|------|--------|-----------|------|-----------|-------|
| 1.1.1: Create Project Structure | ✅ DONE | Claude | ~1h | 2026-07-25 | `ProvisioningAI.MFilesConnectors` project (net8.0-windows), added to solution |
| 1.1.2: Implement MFilesComConnector | ✅ DONE | Claude | ~3h + ~2h gap-closure (2026-07-26) | 2026-07-26 | Verified live against real local M-Files 26.6 server, including full per-vault login to Conformity specifically — see notes below |
| 1.1.3: Implement MFilesRestConnector | ✅ DONE | Claude | ~1h | 2026-07-25 | Built to documented REST contract — **not** live-verified, see notes |

**Notes (Milestone 1.1):**

- **Step 0 finding:** the existing M-Files integration (Studio's push/pull) is PowerShell (`scripts/*.ps1`) spawned from `electron/main.cjs` via `child_process.spawn`, using `New-Object -ComObject MFilesAPI.MFilesServerApplication`. Credentials pass as plaintext CLI args per call (not persisted, but visible in process args transiently — not scrubbed). Not migrated to the new C# connector in this task, per brief; Studio is untouched and still works exactly as before.
- **PRD wording correction:** PRD says code reuse is "direct import of Connector I COM infrastructure" — Connector I's actual signature (9-arg `Connect()`, `MFAuthType` enum, SSO-first/fallback sequence) was confirmed against a live MFilesAPI install and **ported** to C# (`MFilesComConnector.cs`), not imported — PowerShell can't be imported into a C# project. Wording should read "port Connector I patterns," not "import."
- **Real signature used** (confirmed, not guessed): `Connect(AuthType, UserName, Password, Domain, ProtocolSequence, NetworkAddress, Endpoint, LocalComputerName, AllowAnonymousConnection)` — 9 args. `AuthType`: 1=Windows SSO, 2=Specific Windows User, 3=Specific M-Files User. Vault enumeration is `GetOnlineVaults()`, not `GetVaults()` (which requires a plain `ConnectWithoutLogin` session and returns nothing / "Login required").
- **Verified live** against this machine's real M-Files 26.6.16115.9 server: SSO connect, all 4 real vaults enumerated (`Conformity` = `{277BA46A-7F72-4ADD-B992-C90C270430E5}`, `Approbation` = `{0CFA34B2-AC24-4061-80CF-B309ECE1840B}`, plus `acme` and `Developer Certificate`). Per the user, these are dev/test vaults, not the eventual production one.

  > **NOTE 2026-07-28:** Milestone 1.1 (above) recorded Approbation as
  > `{0CFA34B2-AC24-4061-80CF-B309ECE1840B}` and Conformity as
  > `{277BA46A-7F72-4ADD-B992-C90C270430E5}`. Neither matches current
  > `GetOnlineVaults()` output (confirmed live tonight). §4.6's `Inserted`
  > (not `GuidChangedWarning`) result confirms this isn't drift the
  > scanner caught mid-pipeline — the M1.1 values were simply from an
  > earlier session/environment state. Current authoritative GUIDs:
  > Approbation=`{281953C0-E341-4A7A-9CB7-9D6DF0099154}`,
  > Conformity=`{008446DF-32AA-4E9C-8C43-9FEC4D0A1203}`. Left the
  > original numbers above untouched — this is an annotation, not a
  > correction to the historical record (same pattern as Stage 2's
  > "CORRECTED 2026-07-26" addendum below).

- **Vault naming clarified (not a bug):** the vault GUID hardcoded everywhere in the current frontend/scripts (`{E7E445BE-3AEF-425F-9D4D-BFCC33008C9E}`) is named "acme" — confirmed via M-Files Admin (Local Computer → Document Vaults shows `acme`, `Approbation`, `Conformity`, `Developer Certificate`, matching `GetOnlineVaults()` exactly). Per the user: this is a test-only vault; a real vault with a distinct GUID gets added in a follow-up session. Frontend default GUID should be updated once that happens — not before.
- **REST connector is unverified live** — no IIS/W3SVC service on this machine, nothing listening on 80/443; the M-Files server's own auxiliary ports respond at TCP level but reject standard TLS handshakes (consistent with internal gRPC, not a public REST endpoint). Implemented to the documented M-Files REST API contract; confirm against an environment with the REST/web component actually installed before relying on it.
- **Migration decision needed:** Studio's push/pull still goes through the PowerShell/IPC path. This new C# connector is not yet wired to anything consumer-facing (that's Phase 3, API controllers). Follow-up issue: decide whether/when to migrate Studio behind the new connector, or keep both paths intentionally (PowerShell for Studio's interactive workflow editing, C# for the future Discovery/Provisioning engines).
- 40/40 unit tests pass, 96.1% line coverage on `ProvisioningAI.MFilesConnectors`, zero warnings on full solution build. No test requires a live vault (COM tests use a dynamic-dispatch-compatible plain C# fake in place of the COM object; REST tests use a fake `HttpMessageHandler`).

**Milestone 1.1 gap-closure (2026-07-26) ✅ CLOSED:** User review found Milestone 1.1 was done to `claude.md`'s narrowed scope (connectivity + enumeration) but not the roadmap's literal wording — no per-vault session, and "connect to Conformity" was never actually tested (only enumerated). Decision: close per-vault login + live Conformity verification; defer REST search/cookie auth as speculative (COM covers the admin surface Discovery needs; build REST auth when a concrete requirement appears).

- **Blocker hit, then resolved:** logging into Conformity (`{277BA46A-7F72-4ADD-B992-C90C270430E5}`) via Windows SSO initially failed — `Access denied. You do not have a user account in this document vault. (Account name: "DESKTOP-DKCS42P\owner")`. Real, distinct permission error, different from `acme` (which this account could already access) — Conformity has its own separate permission configuration. User added the `DESKTOP-DKCS42P\owner` Windows account to Conformity (and the other vaults) via M-Files Admin; retried and succeeded.
- **Real exercise of `claude.md` §8's warning** ("permission failures look like success... surface permission-denied as a distinct exception type"): confirmed `MFilesErrors.Translate`'s classifier catches this exact real message (not just the synthetic one in unit tests) as `MFilesPermissionDeniedException`.
- **Added:** `IVaultHandle` (new interface, `VaultGuid` + `VaultName`, `IDisposable`), `VaultHandle` (implementation — `LogOutSilent()` then `CloseComObjectSafe()`, both run even if logout throws), `IMFilesConnector.LogInToVaultAsync(vaultGuid)`, `MFilesComConnector.LogInToVaultAsync` (reuses the pooled server session's already-authenticated identity — tracked via new `PooledMFilesSession.AuthTypeUsed` — rather than re-guessing SSO vs. credentials for the vault-level login). `MFilesRestConnector.LogInToVaultAsync` throws `NotSupportedException` with a clear message (REST vault sessions deferred, not silently stubbed).
- **Real finding while building this:** the actual logged-in `Vault` COM object's `.GUID` property comes back **empty** (confirmed live) — unlike the lightweight entries from `GetOnlineVaults()`, which do have a real GUID. `VaultHandle.VaultGuid` is set from the caller's input parameter, not read back from the object, because of this.
- **Live 5-step verification against Conformity — all passed, real output:**
  1. Server-level SSO connect — OK
  2. `GetOnlineVaults()` returns Conformity — OK, `Name=Conformity GUID={277BA46A-7F72-4ADD-B992-C90C270430E5}`
  3. `LogInAsUserToVault(Conformity GUID)` — OK, `vault.Name=Conformity`
  4. Trivial read proving the handle works — `vault.LoggedIn = True`, `vault.CurrentLoggedInUserID = 1`
  5. Log out (`LogOutSilent()`) + release, 5 repeated full cycles — process handle count: `760, 755, 755, 755, 755`. Dropped after the first cycle, then flat — **no COM handle growth**.
- 44/44 unit tests pass (4 new: successful vault login, identity-reuse across the vault login, permission-denied translation using the real captured message, dispose-calls-logout). No test requires a live vault.
- **Deferred, by agreement:** REST search method and cookie auth — speculative until a concrete requirement exists.

#### Milestone 1.2: SQLite Database (1/6 tasks)

**Status:** 🟡 IN PROGRESS  
**Assigned to:** Claude (Sonnet 5)  
**Target:** Week 2  

Task breakdown corrected 2026-07-25 to match `V1_DEVELOPMENT_ROADMAP.md`'s actual 6 tasks (this table previously listed 4 generic tasks that didn't match the roadmap file).

| Task | Status | Developer | Time | Completed | Notes |
|------|--------|-----------|------|-----------|-------|
| 1.2.1: Create ProvisioningAI.Data project (EF Core + SQLite) | ✅ DONE | Claude | ~15min | 2026-07-25 | Removed placeholder `Class1.cs`; added `Microsoft.EntityFrameworkCore.Sqlite` + `.Design` (both 8.0.10). Build clean, 0 warnings, full solution + 40/40 tests still pass. No entities yet — that's 1.2.2. |
| 1.2.2: Define Core Entities (Models) | ✅ DONE | Claude | ~1h 5m | 2026-07-26 | Verified with `dotnet test` (57/57 tests passing). |
| 1.2.3: Create DbContext | ✅ DONE | Claude | ~30min | 2026-07-26 | Configured `DbSet` properties, custom PKs, composite unique index for `WorkflowTransition`. Verified with in-memory SQLite (59/59 tests passing). |
| 1.2.4: Create EF Core Migrations | ✅ DONE | Claude | ~1h 45m | 2026-07-26 | Generated SQLite schema, verified `foreign_keys=ON`, mapped `VaultGuid`. Applied DB `CHECK` constraints for strict Guid `{...}` formatting across all Guid columns. Added canonical Guid EF Core Value Converter. Added missing 7 models from discovery spec (`ValueList`, `Class`, `View`, etc.). Fixed `WorkflowTransition` keying to `MFilesId`. Configured NVS `Classification` constraint, `BINARY` collation, and complex composite FKs for `ValueListItems` and `Classes`. |
| 1.2.5: Create Repository Pattern | ✅ DONE | Claude | ~1h | 2026-07-26 | Implemented `IRepository<T>` and `GenericRepository<T>` with Upsert matching `(VaultGuid, Guid)`, EF `ExecuteDeleteAsync` for `LastSeenScanId` sweep. Specific repos for `WorkflowTransition` and `NamedValueStorage` logic. |
| 1.2.6: Unit Tests | ✅ DONE | Claude | ~1h | 2026-07-26 | Repo tests passing; EF `CanonicalGuidConverter` query tests verified, FK constraints enforced and passing. 63/63 tests passing. |

**Task 1.2.2 — exactly where this was cut off (2026-07-26), session ran out of budget mid-verification:**

- **What's done:** All 10 entities written in `ProvisioningAI.Data/Models/` (`GuidGuard.cs`, `VaultStructure.cs`, `ObjectType.cs`, `Property.cs`, `Workflow.cs`, `WorkflowState.cs`, `WorkflowTransition.cs`, `IntegrationPoint.cs`, `MappingTemplate.cs`, `AuditLog.cs`, `DiscoveryScan.cs`). Tests written in `ProvisioningAI.Tests/Data/` (`GuidGuardTests.cs`, `EntityFactoryTests.cs`).
- **Hardening rules applied (per explicit user spec):** `Guid` is non-nullable on every M-Files-sourced entity; `(VaultGuid, Guid)` is a unique index (`[Index(...)]` attribute) on each; `GuidGuard.Require()` throws `InvalidGuidException` on null/empty/whitespace/malformed/all-zero GUIDs, no name-based fallback — message includes entity type, vault name, object ID, and object name. **Also extended `VaultGuid` itself to be guarded the same way** on `ObjectType`, `Property`, `Workflow`, `WorkflowState`, `WorkflowTransition`, `IntegrationPoint` (the user's spec focused on the object's own `Guid`; guarding `VaultGuid` too was my own extension for consistency with claude.md §4.2 — flag if that wasn't wanted).
- **✅ CONFIRMED:** `dotnet test` ran successfully on 2026-07-26 (57/57 tests passing).
- **Flagged, not resolved:** `WorkflowTransition` may not have its own real M-Files GUID (the roadmap's field list never mentions one, unlike object types/properties/workflows) — implemented without one, identified instead by `(WorkflowGuid, FromStateGuid, ToStateGuid)`. Comment is in `WorkflowTransition.cs`. Confirm against a real scan once Module 2 exists.
- **Cancelled, not just deferred:** the "ten-minute clone check" (acme vs. Conformity GUID comparison) and its regex vault-name matching. User clarified (2026-07-26): `acme` and `Conformity` are reference vaults, not a clone pair worth comparing — no need to run this. Don't pick this back up; the §2.4 GUID-stability-across-clones question in claude.md is still open, but not resolved via these two specific vaults.
- Claude.md and skills.md have **not** been updated for this round yet — only progress.md, per explicit request to prioritize this file when the session was cut off.

---

### Phase 2: Discovery Engine (Weeks 2-4) — [0/4 Milestones, 0/15 Tasks]

**Status:** ⏳ NOT STARTED  
**Target Completion:** [DATE]  
**Progress:** 0%  

#### Milestone 2.1: Vault Scanner (0/5 tasks)
- Status: ⏳ TODO
- Assigned to: [DEVELOPER]
- Estimated time: 20 hours
- Blocking: Phase 2.2, 2.3, 2.4

#### Milestone 2.2: Workflow Scanner (0/4 tasks)
- Status: ⏳ TODO
- Assigned to: [DEVELOPER]
- Estimated time: 16 hours
- Depends on: Phase 2.1

#### Milestone 2.3: Integration Points Scanner (0/3 tasks)
- Status: ⏳ TODO
- Assigned to: [DEVELOPER]
- Estimated time: 12 hours
- Depends on: Phase 2.1

#### Milestone 2.4: Mapping Template Generator (0/3 tasks)
- Status: ⏳ TODO
- Assigned to: [DEVELOPER]
- Estimated time: 12 hours
- Depends on: Phase 2.1, 2.2, 2.3

---

### Phase 3: Discovery API + Frontend (Weeks 4-6) — [0/2 Milestones, 0/8 Tasks]

**Status:** ⏳ BLOCKED (waiting for Phase 2)  
**Target Completion:** [DATE]  
**Progress:** 0%  

#### Milestone 3.1: Discovery REST API (0/6 tasks)
- Status: ⏳ TODO
- Estimated time: 12 hours
- Depends on: Phase 2 complete

#### Milestone 3.2: Discovery Dashboard (0/8 tasks)
- Status: ⏳ TODO
- Estimated time: 20 hours
- Depends on: Phase 3.1 complete

---

### Phase 4: Workflow Engine (Weeks 5-7) — [0/2 Milestones, 0/8 Tasks]

**Status:** ⏳ BLOCKED (waiting for Phase 2)  
**Target Completion:** [DATE]  
**Progress:** 0%  

#### Milestone 4.1: Workflow Engine Core (0/5 tasks)
- Status: ⏳ TODO
- Estimated time: 15 hours
- Depends on: Phase 2 complete

#### Milestone 4.2: Workflow Visualization (0/8 tasks)
- Status: ⏳ TODO
- Estimated time: 20 hours
- Depends on: Phase 4.1 complete

---

### Phase 5: Documentation Engine (Weeks 6-7) — [0/2 Milestones, 0/7 Tasks]

**Status:** ⏳ BLOCKED (waiting for Phase 2 + 4)  
**Target Completion:** [DATE]  
**Progress:** 0%  

#### Milestone 5.1: Documentation Generator (0/7 tasks)
- Status: ⏳ TODO
- Estimated time: 14 hours
- Depends on: Phase 4 complete

#### Milestone 5.2: Documentation Viewer (0/8 tasks)
- Status: ⏳ TODO
- Estimated time: 16 hours
- Depends on: Phase 5.1 complete

---

### Phase 6: AI Copilot (Weeks 7-8) — [0/2 Milestones, 0/8 Tasks]

**Status:** ⏳ BLOCKED (waiting for Phase 3)  
**Target Completion:** [DATE]  
**Progress:** 0%  

#### Milestone 6.1: Copilot Service (0/8 tasks)
- Status: ⏳ TODO
- Estimated time: 16 hours
- Depends on: Phase 3 complete

#### Milestone 6.2: Copilot Chat Interface (0/8 tasks)
- Status: ⏳ TODO
- Estimated time: 16 hours
- Depends on: Phase 6.1 complete

---

### Phase 7: Integration & Testing (Weeks 8-9) — [0/2 Milestones]

**Status:** ⏳ BLOCKED (waiting for Phases 3-6)  
**Target Completion:** [DATE]  
**Progress:** 0%  

#### Milestone 7.1: End-to-End Integration
- Status: ⏳ TODO
- Estimated time: 20 hours

#### Milestone 7.2: Performance Optimization
- Status: ⏳ TODO
- Estimated time: 10 hours

---

### Phase 8: Documentation & Deployment (Weeks 9-10) — [0/3 Milestones]

**Status:** ⏳ BLOCKED (waiting for Phase 7)  
**Target Completion:** [DATE]  
**Progress:** 0%  

#### Milestone 8.1: Developer Documentation
- Status: ⏳ TODO
- Estimated time: 8 hours

#### Milestone 8.2: User Documentation
- Status: ⏳ TODO
- Estimated time: 8 hours

#### Milestone 8.3: Deployment
- Status: ⏳ TODO
- Estimated time: 4 hours

---

## Timeline Gantt View

```
Week 1  | Phase 1.1 ███░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
Week 2  |           ░░░ Phase 1.2 ████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
        |                          Phase 2.1 ███████░░░░░░░░░░░░░░░░░░░░░░░░░░░░
Week 3  |                          Phase 2.1 ░░░░░░░░ Phase 2.2 ████░░░░░░░░░░░░░
        |                                        Phase 2.3 ███░░░░░░░░░░░░░░░░░░
Week 4  |                                                  Phase 2.4 ████░░░░░░░
        |                                                              Phase 3.1 ████
Week 5  |                                                              Phase 3.1 ░░░░
        |                                                                Phase 4.1 ████░
        |                                                                Phase 3.2 ███░░░
Week 6  |                                                                Phase 3.2 ░░░░░░░░░░
        |                                                                Phase 4.2 ███░░░░░░░░░
        |                                                                Phase 5.1 ███░░░░░░░░░
Week 7  |                                                                Phase 4.2 ░░░░░░░░░░░
        |                                                                Phase 5.2 ████░░░░░░
        |                                                                Phase 6.1 ████░░░░░░
Week 8  |                                                                Phase 6.2 ░░░░░░░░░░░░░░░░
        |                                                                Phase 7.1 ████░░░░
Week 9  |                                                                Phase 7.2 ░░░░
        |                                                                Phase 8.1 ░░░
Week 10 |                                                                Phase 8.3 ░░░░

Legend: ░ = Planned  |  ███ = In Progress  |  === = Completed
```

---

## Build Status & Testing

### Build Status
```
Branch: develop
Status: ✅ GREEN (no compilation errors)
Last build: [DATE] [TIME]
Last successful build: [DATE] [TIME]
Build time: X seconds
```

### Test Status
```
Unit Tests: 59/59 passing
Coverage: X%
Integration Tests: [X]/[Y] passing
Last test run: [DATE] [TIME]
```

### Code Quality
```
SonarQube Score: N/A
Code Review Approval: 0% (0/0 reviewed)
Security Issues: None
```

---

## Blockers & Issues

### Current Blockers
None (project not started yet)

### Open Issues
| Issue ID | Priority | Title | Assigned | Due |
|----------|----------|-------|----------|-----|
| - | - | - | - | - |

### Risks
| Risk | Impact | Likelihood | Mitigation |
|------|--------|-----------|------------|
| M-Files COM API complexity | High | Medium | Use Connector I as reference |
| EF Core learning curve | Medium | Low | Pre-built patterns available |
| React performance (large data) | Medium | Low | Use virtualization + pagination |

---

## Velocity & Burndown

### Completed This Week
- 0 tasks
- 0 hours
- 0 story points

### Planned This Week
- Phase 1.1 Task 1 (4 hours)
- Phase 1.1 Task 2 (8 hours)

### Cumulative Progress
```
Week 1:  0 tasks (0%)
Week 2:  0 tasks (0%)
Week 3:  0 tasks (0%)
Week 4:  0 tasks (0%)
Week 5:  0 tasks (0%)
Week 6:  0 tasks (0%)
Week 7:  0 tasks (0%)
Week 8:  0 tasks (0%)
Week 9:  0 tasks (0%)
Week 10: 0 tasks (0%)
```

---

## Team & Resource Allocation

### Developers

| Name | Role | Assigned Tasks | Capacity |
|------|------|---|---|
| [DEV_NAME_1] | Backend Lead | Phase 1-2 | 40 hrs/week |
| [DEV_NAME_2] | Backend Dev | Phase 3-4 | 40 hrs/week |
| [DEV_NAME_3] | Frontend Dev | Phase 3,5 | 40 hrs/week |
| [DEV_NAME_4] | QA/Tester | Phase 7 | 20 hrs/week |

### Resource Needs
- [ ] M-Files development license (for testing)
- [ ] SQL Server license (for staging environment)
- [ ] Anthropic Claude API credits (for Copilot feature)
- [ ] OpenAI API credits (for multi-model support)

---

## AI Assistance Tracking

### Claude (Anthropic) Usage

| Phase | Tasks | AI-Generated Hours | Human Review Hours | Actual Dev Time |
|-------|-------|---|---|---|
| Phase 1 | 0 | 0 | 0 | 0 |
| Phase 2 | 0 | 0 | 0 | 0 |
| Phase 3+ | TBD | TBD | TBD | TBD |
| **Total** | **0** | **0** | **0** | **0** |

### AI Effectiveness Analysis
```
AI-generated code typically requires:
- 30-50% human review/modification time
- ~2x speed improvement vs manual coding
- Higher code quality (patterns + best practices)
- Better test coverage (comprehensive unit tests)
```

---

## Next Steps

### Picking back up

- [x] Task 1.2.1 done (2026-07-25) — `ProvisioningAI.Data` project configured (EF Core + SQLite)
- [x] Task 1.2.2 done (2026-07-26) — Defined Core Entities (`VaultStructure.cs`, `ObjectType.cs`, etc.) and confirmed via `dotnet test`
- [x] Task 1.2.3 done (2026-07-26) — Created ProvisioningAiDbContext and verified with in-memory SQLite tests
- [x] Task 1.2.4 done (2026-07-26) — Created EF Core Migrations, generated `provisioning.db`, and validated SQLite schema enforcement.
- [x] Task 1.2.5 done (2026-07-26) — Created Repository Pattern with `IRepository<T>`, Upsert logic, and sweep functionality.
- [x] Task 1.2.6 done (2026-07-26) — Unit Tests for Repository and EF extensions completed and passing. 63/63 tests passing.
- [x] Task A done (2026-07-26) — Probe script confirmed that GUIDs MATCH perfectly between a vault and its clone for Property Definitions, Value Lists, and Object Types.
- [x] Task B done (2026-07-26) — Verified that `CanonicalGuidConverter` correctly fires on READ path, preventing empty lookups during Upserts.
- [ ] Real vault with a distinct GUID gets added (separate from the `acme` test vault at `{E7E445BE-...}`) — update the frontend's hardcoded default GUID once that exists, not before
- [ ] Decide: migrate Studio's push/pull (currently PowerShell/IPC) behind `ProvisioningAI.MFilesConnectors`, or keep both paths intentionally — see §2.4 in claude.md

### Next Up

- [x] Rest of Phase 1.2: SQLite Database (Completed)
- [x] Phase 2.1: Vault Scanner (object types, properties) — Stages 1-4 complete
- [x] Task A: ClassProperty (required/optional rebuild) — complete, live-verified (2026-07-27)
- [x] Task B: Stage 5 (workflows, states, transitions) — complete, live-verified (2026-07-27)
- [x] Stage 6: users/groups/ACLs — complete, live-verified (2026-07-27)
- [x] Stage 7: views — complete, live-verified (2026-07-27)
- [x] Stage 8: Named Value Storage — complete, live-verified (2026-07-27); confirmed SDK boundary on per-app Configuration content
- [x] Approbation Stages 2-8 (Value Lists, Property Defs, Object Types/Classes, Workflows, Users/Groups/ACLs, Views, Named Value Storage) — complete, live-verified against real Approbation (2026-07-28); no scanner code changes required for any stage; Set A/Set B reconciliation re-confirmed; SDK Configuration boundary re-confirmed; UserGroupMember still live-verification-pending (still 0 memberships on this vault too)
- [ ] Stage 9: SQL / dbo.Company — BLOCKED, waiting on real MfilesData table access (resume signal: "Ankor"). Not resolved by the new local `DESKTOP-DKCS42P` SQL dev environment (2026-08-01) — that's a separate local test target, not the production `TERGOS-MFILES01\SQLEXPRESS` schema Stage 9 needs.
- [x] Conformity master 47-state behavior table, VAF add-on config reachability reversal, config-write-safety finding, onboarding-variable inventory — consolidated into progress.md/skills.md/claude.md (2026-08-01). Approbation/v3.0/Conformity-II threads remain unlogged, out of scope for this pass.

### Next 3 Weeks

- [ ] Complete Phase 1 (Foundation)
- [ ] Complete Phase 2 (Discovery Engine)
- [ ] Integration checkpoint: Discovery working end-to-end

---

## Key Metrics to Track

**Velocity:** Tasks completed per week (target: 4-5 tasks/week)  
**Quality:** Test coverage (target: 80%+)  
**Performance:** Build time (target: < 30 sec)  
**Delivery:** On-time completion (target: 95%+)  
**Team:** Developer satisfaction (target: 8/10)  

---

## Appendix: Task Status Definitions

**⏳ TODO:** Not started, not assigned to developer  
**🟡 IN_PROGRESS:** Actively being worked on by developer  
**🔍 IN_REVIEW:** Completed, waiting for code review approval  
**✅ DONE:** Completed, reviewed, merged, integrated  
**⛔ BLOCKED:** Cannot proceed, waiting on dependency  
**🚫 CANCELLED:** No longer needed  

---

**Last Updated:** [DATE] [TIME]  
**Next Update:** [DATE]  
**Updated by:** [NAME]  

---

## How to Update This File

After each completed task:

```markdown
**Task 1.1.1: Create Project Structure**
- Status: ✅ DONE
- Developer: John Smith
- Started: 2026-07-25
- Completed: 2026-07-25 5:00 PM
- Time spent: 4 hours
- PR: #123 (link)
- Commit: abc1234567 (link)
- Notes: Successfully created project structure; ready for connectors
- AI Tool: Claude (Anthropic) - claude-3.5-sonnet
- Human review time: 1 hour
```

Then update the summary section at the top with new overall completion percentage.
