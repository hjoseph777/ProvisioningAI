# ProvisioningAI

**M-Files vault automation platform.** ProvisioningAI maps vault integrations, documents them, simulates workflows, and — eventually — automates vault provisioning, turning a two-week manual cloning process into minutes.

> *"You cannot safely automate what you have not fully mapped."*

**Testbed vaults:** Conformity (V1, simpler — the proving ground) and Approbation (V2, more complex). Conformity is deliberately not assumed to be representative of every vault.

---

## Why this exists

M-Files vault knowledge — object types, workflows, permissions, ERP/SQL integration points — lives scattered across Admin screens, VAF configs, and tribal knowledge. Cloning a template vault for a new customer today is a manual, error-prone process: hunt for API tokens, find SQL connection strings, update AD groups, and hope nothing was missed. Miss one integration point and the vault silently points at the old customer's ERP server.

ProvisioningAI's answer is to **discover and document first**, building a GUID-keyed mapping template of every integration point, and only later — once that map is verified — automate the rewiring itself, gated behind explicit plan/apply approval.

---

## Project arc — three stages, one hard safety line

| Stage | Focus | Risk |
| --- | --- | --- |
| **V1 — Investigate & Document** *(current)* | Connect over COM/REST, scan both tiers (Firebird vault + SQL `dbo.Company`), produce a human-reviewed mapping template per vault. | **Read-only.** Writes nothing to any vault or SQL database. Has standalone value as documentation even if V2 is never built. |
| **V1.5 — Diff & Verify** | Compare two vaults' maps and show what differs. The bridge to onboarding, and the proving ground for the GUID/mapping model. | Still read-only. The diff view later becomes the V2 plan preview. |
| **V2 — Automate Onboarding** | M-Files' native vault copy/restore already clones the Firebird vault as a file-level unit. Onboarding is therefore not reconstruction — it's rewiring two known things (the `dbo.Company` row and any vault-side references) on a native clone. | **Mutates real systems.** Goes through plan/apply: preview every change, require approval, write vault + SQL as one transaction, keep rollback. |

**The word "import" has two distinct meanings** — never conflate them:

- **import-to-READ** = ingest a vault's documentation into the index. Writes nothing. This is V1.
- **import-to-PROVISION** = write a new customer's vault + SQL config into existence. Mutates real systems. This is V2, gated behind plan/apply.

The native clone being *easy* makes the rewire the *entire* risk surface — and that's exactly the part that needs the safety gate.

---

## Current state

### Working today

**Workflow Studio** — the only functioning end-to-end feature, treated as production code.

- Manual, NLP, AI, and Cacoo ingestion modes for defining workflow states/transitions
- Live Mermaid diagramming with bidirectional highlighting between tables and diagram
- SOW/PRD markdown export
- M-Files push and pull over Electron IPC (via PowerShell scripts calling the COM API)
- Command palette (`⌘K`) with fuzzy search over workflows, states, and actions

**M-Files Connectors** (`ProvisioningAI.MFilesConnectors`, C#) — both COM and REST connectors built, including per-vault login (`LogInToVaultAsync` / `IVaultHandle`), not just enumeration. Verified live against a real M-Files server, including a full connect → login → read → logout → release cycle repeated 5x with zero COM handle growth. The REST connector is built to spec but not yet live-verified.

**Data layer** (`ProvisioningAI.Data`) — EF Core + SQLite, with entities, `DbContext`, migrations, and repositories in place. Includes a `CanonicalGuidConverter` that enforces canonical GUID strings at the EF boundary.

### Scaffolding only

`ProvisioningAI.Discovery`, `.Documentation`, `.Copilot`, `.Core`, and `.Provisioning` currently contain little beyond generated placeholders — no real backend behavior yet.

### Next up

Phase 2 — the Discovery Engine (full-vault structural scan), the first real consumer of the connector's per-vault login, followed by V1.5 workflow simulation.

---

## Architecture

```text
┌─────────────────────────────────────────────────────────────────┐
│                    REACT + ELECTRON FRONTEND                     │
│  Workflow Studio · Discovery Dashboard · Documentation Viewer    │
│  AI Copilot Chat · (V2) Provisioning Plan/Apply Interface        │
└─────────────────────────────────────────────────────────────────┘
                           ↓  Electron IPC + REST (localhost:5000)
┌─────────────────────────────────────────────────────────────────┐
│              C#/.NET 8 BACKEND (ASP.NET Core)                    │
│  Discovery · Documentation · Workflow · Copilot · Provisioning   │
│  MFilesConnectors (the only place COM types appear)              │
└─────────────────────────────────────────────────────────────────┘
                           ↓  COM API · REST API · SQL (Windows auth)
┌─────────────────────────────────────────────────────────────────┐
│   TIER 1 — Firebird vault (MetaData.fdb), one per vault          │
│   Structure: object types, classes, properties, workflows,       │
│   value lists, named ACLs, NVS. GUID-stable across clones.       │
├─────────────────────────────────────────────────────────────────┤
│   TIER 2 — SQL Server integration layer (MfilesData), shared     │
│   across both vaults. dbo.Company, dbo.Conformity, and siblings  │
│   hold customer-specific ERP/SQL integration config.             │
└─────────────────────────────────────────────────────────────────┘
                           ↓  (gated, V2)
        EXTERNAL: Acomba (ERP) · Fusion CP1 (OCR) · Info Media (broker)
```

Discovery reads **two tiers**, not one: structural scans over COM per vault (identity → value lists → property defs → object types/classes → workflows → users/ACLs → views → NVS), plus a single SQL-tier pass across the shared `MfilesData` database, cross-referenced by company.

### Identity rules

- **GUID is identity.** Vaults, property definitions, value lists, classes, and workflows are keyed on GUID — never a bare numeric ID, which shifts between vault clones.
- **Name is a mutable display label**, refreshed on every scan, never used as an identifier.
- All three — GUID, name, numeric ID — are recorded: GUID for lookup, name for human review, ID for diagnostics only.

---

## Tech stack

| Layer | Technology |
| --- | --- |
| Frontend | React 18, Electron, TailwindCSS, Zustand, Mermaid |
| Backend | C#/.NET 8, ASP.NET Core, Serilog, EF Core + SQLite (V1); Neo4j (V2) |
| M-Files integration | COM API (Interop), M-Files REST API |
| AI | Claude / OpenAI / GLM APIs (Copilot, read-only in V1) |
| Testing | xUnit + Moq (backend), Jest (frontend) |
| Planned for V1.5+ | React Flow, Framer Motion (workflow simulation) — not introduced early |

---

## Project structure

```text
/electron                                  Electron main process & IPC bridges
/src/components
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
  ├── ProvisioningAI.Api                   REST API surface
  └── ProvisioningAI.Core                  shared models & interfaces
```

---

## Build, test, and run

```bash
# Backend API (localhost:5000)
cd provisioningai-backend && dotnet run --project ProvisioningAI.Api

# Frontend (Electron dev mode)
npm install
npm run electron:dev

# Tests
cd provisioningai-backend && dotnet test
npm test

# Lint
npm run lint
```

No automated test may require a live vault — the COM API is mocked. Integration tests against Conformity live in a separate project excluded from the default run.

---

## Roadmap

| Phase | Focus |
| --- | --- |
| **V1** *(current)* | COM/REST connectors, Discovery Engine (two-tier scan), Documentation Engine, Workflow Engine (static diagrams), structured SQLite index, read-only AI Copilot. |
| **V1.5** | Workflow simulation: multi-tab UI (Animation, M-Files Original, Metadata, JSON Raw) with manual "what-if" branch testing. Doubles as the diff/verify bridge to onboarding. |
| **V2** | Neo4j knowledge graph; Vault Provisioning Engine with plan/apply automation for ERP endpoints, value lists, named ACLs, and SQL config — rewiring a native vault clone in minutes instead of weeks. |
| **V3+** | Multi-vault platform, workflow automation recommendations, compliance analysis. |

See [`ProvisioningAI_PRD_v1.0.md`](ProvisioningAI_PRD_v1.0.md) for full requirements and [`V1_DEVELOPMENT_ROADMAP.md`](V1_DEVELOPMENT_ROADMAP.md) for the milestone-by-milestone build plan.

---

## Further reading

### Core specs

- [`CLAUDE.md`](CLAUDE.md) — current, as-built system state and architectural rules (source of truth)
- [`ProvisioningAI_PRD_v1.0.md`](ProvisioningAI_PRD_v1.0.md) — product requirements
- [`V1_DEVELOPMENT_ROADMAP.md`](V1_DEVELOPMENT_ROADMAP.md) — milestone breakdown
- [`TECH_STACK.md`](TECH_STACK.md) — full tech stack detail, including planned V1.5/V2 layers

### Design rationale

- [`ARCHITECTURAL_DEPENDENCY.md`](ARCHITECTURAL_DEPENDENCY.md) — why discovery must precede provisioning, with a worked example of the ID-vs-name corruption failure mode. Written before the two-tier Firebird/SQL model was confirmed (see `CLAUDE.md` §4.4 for the current architecture), but the core argument — map first, automate second — still holds.

### Project logs

- [`progress.md`](progress.md) — running build log: what's been scanned, what's live-verified against Conformity, what's still open
- [`skills.md`](skills.md) — patterns and session-by-session findings (COM API quirks, GUID behavior, scanner corrections) as they were actually discovered

### Process

- [`DEVELOPMENT_STANDARDS.md`](DEVELOPMENT_STANDARDS.md) — the AI-assisted development workflow this project follows (review discipline, when to update `progress.md`/`skills.md`)

A few earlier planning docs (`COMPLETE_VISION.md`, `INVESTIGATION_AND_AUTOMATION_STRATEGY.md`, `INSIGHTS_AND_UPDATES.md`, `INDEX_AND_READING_GUIDE.md`) describe an earlier "VAF Named Value Storage" integration model that `CLAUDE.md` §4.4 explicitly corrected to the current two-tier Firebird/SQL architecture. They're kept for history but aren't linked above since they no longer describe the system accurately.

---

*ProvisioningAI · Xerox · 2026*
