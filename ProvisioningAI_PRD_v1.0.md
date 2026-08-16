# CONNECTOR II: PROVISIONINGAIAI

## Deep Vault Intelligence Layer

**Product Requirements Document (PRD) | v1.0**

- **Project:** MFilesConnector (Personal, Script.NET)
- **Testbed Vault:** Conformity
- **Status:** Active Development — V1 Core Pipeline
- **Environment:** Local M-Files Server, VS Code, Multi-AI Pair Programming

---

## 1. Executive Summary

**Connector I** (ClientVaultAccessMSIBuilder) solved a narrow, repetitive problem: conditional automated access to a single vault through a single COM connection. It is complete, live-verified, and audit-passed.

**Connector II** (ProvisioningAI) tackles a broader challenge: making vault knowledge accessible, queryable, **and automatable**. It unifies vault discovery, documentation generation, natural-language Q&A, and **vault provisioning** into a single intelligence layer backed by a structured knowledge index.

ProvisioningAI operates in four integrated tiers:

- **Discovery & Indexing:** Automated scanning of vault structure, objects, workflows, permissions, **and integration points** (ERP endpoints, SQL connections, API tokens, VAF configurations).
- **Documentation Engine:** Auto-generated SOPs, onboarding guides, integration maps, and **mapping templates** for safe provisioning.
- **Workflow Intelligence:** Visualization, simulation, and animation of document lifecycles.
- **Vault Provisioning Engine:** Automated "rewiring" of template vaults for new customers—the **Holy Grail** of M-Files consulting.

### **Architectural Dependency (Critical)**

The Discovery & Documentation tool (V1) is **not optional scaffolding**—it is the **mandatory GPS map** that makes the Provisioning Engine safe for production use. Without the Discovery tool's mapping of integration points, provisioning would be a blind script that could silently corrupt vault metadata. V1 builds the intelligence layer; V2 uses that intelligence to automate vault rewiring safely.

**You cannot safely automate what you have not fully mapped.**

In V1, ProvisioningAI focuses on core discovery and documentation against the Conformity vault testbed, creating detailed maps of where integrations live. A structured JSON/Relational index serves queries; workflow simulation adds visual testing; the knowledge graph materializes in V2. The Vault Provisioning Engine—the transformative write-automation feature—arrives in V2, leveraging V1's integration mapping to convert a 2-week manual vault clone into a 5-minute automated deployment.

**Strategic Impact:** By automating vault provisioning (powered by V1's discovery intelligence), ProvisioningAI transforms from a documentation tool into a **Vault Provisioning Platform**—eliminating manual reconfiguration, reducing deployment risk, and positioning you as the consulting "top dog" in the M-Files ecosystem.

---

## 2. Vision & Strategic Context

### 2.1 Problem Space

M-Files vault knowledge is fragmented across:

- Admin console screens (object types, classes, workflows, lifecycle states)
- Named ACLs and permission hierarchies (scattered, often undocumented)
- VAF applications and custom metadata handlers
- Point-to-point integrations (SQL, SAP, ERP, CRM connectors)
- Tribal knowledge held by individual power users

No single authoritative artifact describes what this vault actually contains or how it works. Onboarding a new developer or auditing vault configuration requires manual navigation of Admin screens and trial-and-error exploration.

### 2.2 Strategic Goals

- Enable self-service vault discovery and documentation, reducing manual overhead.
- Create a central source of truth for vault architecture that stays synchronized with configuration changes.
- Provide natural-language access to vault operations and business logic.
- Establish a structured, queryable knowledge index that scales to multiple vaults in future phases.

---

## 3. Problem Statement

### Current State

- Vault configurations exist only as live admin objects; no queryable documentation layer.
- Onboarding new developers or auditors requires manual exploration and screen-by-screen documentation.
- Business process understanding is implicit in workflows but not extractable or explainable at scale.
- **Integration points (ERP endpoints, SQL connections, API tokens, VAF configs) are scattered and fragile.** Cloning a vault for a new customer is a 2-week nightmare:
  - Hunt for API tokens in VAF configuration storage
  - Find SQL connection strings in custom Property Definitions
  - Locate ERP endpoints in Configuration Objects
  - Update Named ACLs for new AD groups
  - High error risk: miss one integration, and the vault connects to the old customer's ERP server in production
- **Hardcoded provisioning scripts are dangerous.** Without a complete mapping of where integrations live, blind ID-based updates risk silent data corruption (e.g., "Update Property ID 104" works in one vault but corrupts the "Customer Name" field in another).

### Desired State

- Automated vault scanning generates complete object inventory, workflow definitions, and **a detailed mapping template of all integration points** (where they live, how to access them safely).
- AI copilot can answer "what" and "why" questions about vault structure and operations in natural language.
- Auditing and compliance verification is streamlined via searchable documentation.
- New developers can onboard via self-service discovery rather than manual guidance.
- **Template vaults can be safely redeployed to new customers in minutes, not weeks.** A mapping template (created by Discovery) enables the Provisioning Engine to safely rewire all integrations without risk of data corruption or missed connection points.

---

## 4. Goals & Objectives (V1)

### 4.1 Functional Goals (V1)

1. **Automatic, repeatable vault discovery:** Scan and index all accessible vault configuration (object types, classes, workflows, states, lifecycle rules, permissions).
2. **Auto-generated architecture documentation:** Produce SOPs, onboarding guides, workflow state diagrams, and integration maps.
3. **Natural-language Q&A:** Accept plain-language questions about vault structure and respond with accurate, cited explanations.
4. **Structured, queryable index:** Build a JSON/Relational index that serves as the foundation for knowledge graph migration (V2) and vault provisioning automation (V2).
5. **Workflow simulation & animation:** Enable visual testing and "what-if" scenario validation for business analysts and developers (V1.5).

### 4.2 Strategic Goals (V2+)

**Priority call, recorded 2026-08-10 (full reasoning: progress.md's "Decision (2026-08-10)" entry):** of the write-capable goals below, the Workflow/Mermaid Pipeline (item 1) is the active near-term priority — more attainable than Vault Provisioning Automation's broader scope, since its reference document, BPMN mapping, and worked example are already built and verified, and only the interactive editor, translator/validator, and COM emitter remain. This does not change either item's formal V2+ categorization (see the scope note below) — it's a build-order call within that bucket, not a promotion to V1.

**Scope note, flagged rather than silently resolved:** both goals below require writing to a live M-Files vault (COM export in item 1's case), which is in tension with this PRD's V1-is-read-only framing (§5.1/§5.2, §4.1) and with CLAUDE.md's three-stage arc (V1/V1.5 read-only, writes gated to V2 behind plan/apply). This is the same category of unresolved tension CLAUDE.md §2.4 already flags for Studio's existing push/pull path ("the PRD scopes V1 as read-only... the code and the spec disagree... raise it, don't silently decide"). Recording the Workflow/Mermaid Pipeline as priority 1 here does not resolve that tension — it's noted, not decided, consistent with this project's own standing practice.

1. **Workflow/Mermaid Pipeline (Connection III) — ACTIVE PRIORITY 1 as of 2026-08-10.** Design an M-Files workflow visually via Mermaid (hand-drawn or AI-drafted from a plain-language description), refine it through an interactive editor, and export it into a real M-Files workflow via COM — and the reverse (read an existing M-Files workflow out as a Mermaid diagram). Status: property reference (MfilesProperties.md), BPMN↔Mermaid mapping, and a full worked example are done; the interactive editor, translator/validator, and COM emitter are not yet built.
2. **Vault Template / "Customize on the Fly" — deferred, priority 2, see §5.2.** A specific, scoped instance of the Vault Provisioning Automation goal below: import an existing vault's full structure as a reusable template, then rapidly customize it for a new deployment. Builds on Connection I/II groundwork (SQL consolidation, object-type connection repointing, the byte-faithful NVS config-write mechanism) but has not yet been scoped as its own tool/spec.
3. **Vault Provisioning Automation:** Build the Provisioning Engine to automate customer vault deployment, reducing 2-week manual reconfiguration to 5-minute automated deployment via Plan/Apply pattern.
4. **Knowledge Graph Foundation:** Migrate structured index to true graph database for advanced multi-vault visualization and analytics.
5. **Consulting Differentiation:** Position ProvisioningAI as the definitive M-Files vault automation platform—the "Holy Grail" of consulting tools.

### 4.3 Quality Goals

1. **Accuracy:** Discovery engine must capture 100% of accessible vault configuration.
2. **Audit Trail:** Every discovery scan, AI query, and provisioning operation must be logged (especially write operations).
3. **Respects Permissions:** Copilot operates within the querying user's actual vault permissions, not as unrestricted admin by default.
4. **Data Locality:** All index and administrative data remains on the local home office server; only queries/questions may traverse external APIs.
5. **Safety in Automation:** Plan/Apply pattern ensures no writes occur without explicit operator approval; every operation is reversible and auditable.

---

## 5. Scope & Constraints

### 5.1 In Scope (V1)

- Single testbed vault: Conformity (all discovery and documentation focused here)
- COM API integration: Administrative tasks (vault config, named ACLs, VAF apps)
- REST API integration: Searches, metadata reads, workflow updates
- Discovery engine: Full object type, class, workflow, and permission scanning
- Documentation engine: SOPs, onboarding guides, integration maps, state diagrams
- Workflow visualization: Flowcharts, state transition matrices
- AI copilot: Read-only Q&A over index (no write actions)
- Structured index (JSON/Relational): V1 foundation for V2 graph migration

### 5.2 Out of Scope (V1)

- True Knowledge Graph: Deferred to V2 (Neo4j or embedded graph DB)
- **Vault Provisioning Engine:** Deferred to V2 (the "Holy Grail" feature for automated customer vault deployment)
- **Vault Template / "Customize on the Fly" — explicit non-goal for the current phase, deferred, not abandoned (added 2026-08-10).** Importing an existing vault's full structure as a reusable template and rapidly customizing it for a new deployment. Real groundwork exists (Connection I/II: SQL consolidation, object-type connection repointing, the byte-faithful NVS config-write mechanism — see progress.md/skills.md, not re-derived here), but it has not been scoped as its own defined tool, and it is priority 2 behind the Workflow/Mermaid Pipeline (§4.2 item 1) for the reasoning recorded in progress.md's "Decision (2026-08-10)" entry. Full-vault-import does not make workflow design easier — it solves a different problem (replicate/adapt an existing template) than the Workflow/Mermaid Pipeline (design/modify logic itself), and the two should not be conflated.
- Write/automation actions from AI Copilot: Copilot reads and explains; does not execute state changes (write automation deferred to V3+)
- Live execution against SAP/ERP/CRM systems: Integration layer is mapping/documentation only in V1; rewiring automation added in V2
- Multi-vault platform or marketplace: Single-vault focus in V1; multi-vault scaling begins in V2

### 5.3 Constraints

- Development Environment: Local home office server only; no cloud or multi-tenant deployment
- Data Residency: Admin data must remain local; only questions leave the office network
- Vault Permissions: Must respect and enforce user role boundaries
- Audit Compliance: Every significant operation must be loggable and auditable

---

## 6. Architecture & High-Level Design

### 6.1 System Overview

```
User → AI Copilot → ProvisioningAI Orchestrator → [Discovery, Documentation, Workflow Engines]
                                                    ↓
                                          Structured Index ↔ M-Files Vault
```

### 6.2 Component Overview

#### COM API Connector

**Handles administrative-level tasks:** vault configuration, named ACLs, VAF applications.  
**Reuses Connector I infrastructure:** 9-arg Connect(), SSO-first auth, Close-ComObjectSafe

**Capabilities:**
- Vault configuration queries (object types, classes, properties, aliases)
- Named ACL enumeration and permission matrix extraction
- VAF application registry and deployment status
- Lifecycle rule definitions and state transition mappings
- Administrative audit log retrieval

#### REST API Connector

**Provides platform-independent HTTP-based access** to M-Files vault operations.  
**Manages:** searches, metadata reads, document retrieval, workflow state queries

**Capabilities:**
- Federated search across all accessible document types
- Metadata property reads (builtin and custom properties)
- Document version history and state change tracking
- Workflow state enumeration and transition history
- Integration endpoint metadata (SAP, ERP, CRM connectors)

#### Discovery Engine

**Autonomous scanner** that traverses vault configuration artifacts and populates the structured index.  
**Runs on:** configurable schedule (manual trigger, hourly, daily)

**Capabilities:**
- Full object type and class hierarchy enumeration
- Workflow definition parsing (states, transitions, guards, actions)
- Permission matrix synthesis (who can do what, where, when)
- Integration point detection (API calls, VAF hooks, external connectors)
- Metadata schema extraction (properties, aliases, validation rules)
- Conflict detection (circular workflows, ambiguous permissions, orphaned objects)

#### Documentation Engine

**Generates** machine-readable and human-readable documentation artifacts from indexed vault state.

**Capabilities:**
- Standard Operating Procedures (SOPs): Step-by-step guides for common tasks
- Onboarding guides: New developer/user primer covering object types, workflows, permissions
- Integration maps: Diagram-format views of external system connections
- State diagrams and flowcharts: Visual renderings of workflow lifecycle
- Change log: Discovery scan deltas (new objects, removed configs, permission changes)

#### Workflow Engine

**Parses workflow definitions** and renders them as queryable state transition structures.

**Capabilities:**
- State graph construction: nodes = states, edges = transitions
- Guard condition extraction: preconditions for state transitions
- Action sequence materialization: side effects triggered by transitions
- Swimlane visualization: role-based workflow responsibility mapping
- Cycle detection: warnings for circular or infinite-loop workflows
- Workflow metadata extraction: properties, guards, actions, permissions, and user prompts per state/transition
- Workflow simulation: path evaluation and "what-if" branch testing logic
- Workflow visualization: multi-view React UI (Animation, M-Files Original, Metadata, JSON Raw)
- Manual "what-if" scenario testing: Click through branches to validate conditional paths

#### Vault Provisioning Engine (The "Rewire" Automator)

> NOTE (deferred): V2 provisioning sections predate the confirmed two-tier (Firebird + SQL) architecture and the two-coupled-writes model. Do not rebuild these sections now — they will shift again as V1 discovery completes. Authoritative current facts live in claude.md §4.4/§4.6 and skills.md. Reshape here when V2 begins.

**Automates the painful process** of reusing a template vault for a new customer/project.  
**Strategic Value:** Converts 2-week manual vault clone into 5-minute automated deployment—the **Holy Grail** of M-Files consulting.

**Capabilities:**
- Template Variable Injection: Accepts JSON/CSV input with new customer data (Company Name, Vendor Lists, ERP Endpoints, SQL mappings, AD Groups)
- Targeted Configuration Updates: Uses COM API to find and update specific config points without altering core vault structure (Workflows, Classes)
- Value List Replacement: Programmatically flush template vendor lists and import customer-specific lists
- Integration Rewiring: Updates VAF config objects and metadata properties containing ERP endpoints, SQL connection strings, and API URLs
- Named ACL Cloning: Clones template Named ACLs and injects new customer's Active Directory groups
- Plan/Apply Safety Gate: Generates detailed "Rewiring Plan" (deletion preview, change summary, group mappings). No writes executed until operator explicitly approves
- Dependency Mapping: Leverages Discovery Engine's index to identify all integration points requiring rewiring

#### Structured Index (V1)

**Queryable, versioned data structure** (JSON/Relational) that the AI copilot consults to answer questions.  
**Serves as foundation** for V2 Knowledge Graph migration.

**Capabilities:**
- Object type catalog with property definitions and validation rules
- Class hierarchy and instance counts
- Workflow state definitions with transition matrices
- Permission matrix (user/role → object type → allowed actions)
- Integration endpoint registry (name, type, connection string hash, last sync)
- Audit trail of discovery scans and configuration changes
- Version history (immutable snapshots tied to discovery scan timestamps)

#### AI Copilot (Natural-Language Interface)

**Accepts plain-language questions** about vault structure and operations.  
**Retrieves context** from the structured index and uses Claude/GPT to formulate accurate, cited responses.

**Capabilities:**
- Question parsing: extract intent and entities
- Context retrieval: query the structured index for relevant object definitions, workflows, permissions
- Response generation: pass context to Claude/GPT with a structured prompt
- Citation and verification: ensure all claims are backed by index data
- Audit logging: record the question, context, and AI response for compliance

### 6.3 Technology Stack

| Component | Technology |
|-----------|-----------|
| **Development** | C#, .NET 6+, VS Code |
| **M-Files Integration** | COM API, REST API, M-Files SDK |
| **Data Storage (V1)** | JSON files or SQLite |
| **Data Storage (V2+)** | Neo4j or embedded graph DB |
| **AI Copilot** | Claude, OpenAI GPT-5.6, GLM (via API) |
| **Logging & Audit** | Serilog or similar, JSON audit logs |
| **Documentation** | Markdown, Mermaid, Graphviz |
| **Provisioning UI** | Web dashboard or CLI for Plan/Apply workflow |
| **Workflow Visualization UI** | ProvisioningAI React frontend (not M-Files add-on), Framer Motion, tabbed multi-view |

**Workflow Engine Clarification (V1.5):**
- Animation is rendered in the ProvisioningAI React UI, not inside an M-Files add-on.
- Visualization and simulation are separate concerns: simulation determines valid paths; visualization presents those paths in multi-tab views for business and technical users.

### 6.4 Strategic Value: Vault Provisioning as the "Holy Grail"

The Vault Provisioning Engine (V2) transforms ProvisioningAI from a documentation tool into a **consulting powerhouse**. Here's why:

**The Problem:** Deploying a template vault to a new customer currently requires 2+ weeks of manual reconfiguration:
- Update Vendor Lists from the template (e.g., ABC Vendors) to customer-specific lists (XYZ Vendors)
- Rewire ERP endpoints (update SQL connection strings, API URLs)
- Clone and customize Named ACLs for the customer's Active Directory groups
- Verify all integrations still work (VAF apps, external connectors)
- Test and validate (high risk of missing a connection point)

**The Solution:** Vault Provisioning Engine automates this with the **Plan/Apply pattern** (proven in Connector I):

1. **Input:** Simple JSON file containing customer variables:
   ```json
   {
     "customerName": "ACME Corp",
     "vendorList": "acme_vendors.csv",
     "erpEndpoint": "https://erp.acmecorp.local:8080",
     "sqlConnection": "Server=acme-sql-01;Database=vault;",
     "adGroups": ["ACME\\Finance", "ACME\\Procurement"]
   }
   ```

2. **Discovery:** Engine queries the Discovery Engine's index to locate:
   - All metadata properties containing ERP endpoints
   - VAF configuration objects with SQL connections
   - Value List definitions (Vendor List, etc.)
   - Named ACL templates

3. **Plan Generation:** Provisioning Engine generates a detailed plan:
   ```
   REWIRING PLAN: ACME Corp Vault Deployment
   
   DELETE: 100 entries from "Template Vendors" list
   ADD: 127 entries from acme_vendors.csv
   
   UPDATE ERP Endpoint:
     Property "ERP_Connection" 
     OLD: https://erp.template.local:8080
     NEW: https://erp.acmecorp.local:8080
   
   UPDATE SQL Connection:
     VAF Config "SQL_Vault_Connector"
     OLD: Server=template-sql;Database=vault;
     NEW: Server=acme-sql-01;Database=vault;
   
   CLONE Named ACL:
     "Template_Finance" → "ACME_Finance"
     Inject AD Groups: ACME\Finance
   
   CLONE Named ACL:
     "Template_Procurement" → "ACME_Procurement"
     Inject AD Groups: ACME\Procurement
   
   Apply? (Y/N)
   ```

4. **Approval Gate:** Operator reviews the plan, verifies changes, approves with signature/timestamp
5. **Safe Execution:** Plan/Apply pattern ensures:
   - No writes occur until explicit approval
   - Checkpoint created before any changes
   - Rollback available if operation fails
   - Every change is audited (who approved, when, what changed)

**Consulting Impact:**
- **Speed:** 5-minute deployment vs. 2-week manual
- **Accuracy:** Eliminates human error in reconfiguration
- **Repeatability:** Same plan works for multiple customer deployments
- **Risk Reduction:** Plan review catches issues before they're written
- **Differentiation:** Competitors still do this manually; you're automated

**Why Discovery Engine + Provisioning Engine is Powerful:**
- V1 Discovery Engine builds the configuration map (where ERP endpoints live, where Value Lists are defined)
- V2 Provisioning Engine uses that map to automate rewiring
- Together, they make you the "top dog" in M-Files consulting

### 6.5 The "Mapping Template": How Discovery Enables Safe Provisioning

This is the architectural heart of ProvisioningAI: the Discovery tool doesn't just document; it creates a **mapping template** that the Provisioning Engine uses to safely rewire integrations.

**Core Principle:** You cannot safely automate what you have not fully mapped.

#### The Problem: Why Blind Vault Cloning Fails

In M-Files, integration configurations are scattered across multiple hidden locations:

- **Metadata Properties** on "Configuration Objects" (classes like "ERP Settings" with properties holding API URLs)
- **VAF (Vault Application Framework) Configurations** stored deep in Named Value Storage (NVS)
- **SQL Connection Strings** embedded in Property Definitions or VAF settings
- **API Tokens & Endpoints** in various configuration locations

**Manual cloning nightmare:**
- Hours hunting for scattered API tokens and connection strings
- You usually miss one integration point
- Vault tries to ping the old customer's ERP server in production
- If you hardcode "Update Property ID 104," it might work on Vault A but corrupt Vault B (ID 104 might be "Customer Name" there)
- Silent data corruption is the result

#### The Solution: Discovery-Generated Mapping Template

The Discovery Engine (V1) generates a clean JSON mapping template that captures WHERE every integration lives and HOW to access it safely (by name, not by fragile internal IDs).

**Discovery Engine Workflow:**
1. Scan the template vault
2. Find all VAF configurations, metadata properties, SQL connections, API tokens
3. Record both the name AND the internal ID (but prioritize name-based lookups)
4. Capture the COM API path to access each integration point
5. Include validation rules for each value
6. Extract workflow metadata (state properties, guards, actions, user prompts, permissions)
7. Output a complete mapping template in JSON format

**Example Mapping Template (Abbreviated):**

```json
{
  "templateVault": "Conformity",
  "generatedAt": "2026-07-24T20:45:00Z",
  "integrationPoints": [
    {
      "id": "ERP_API_ENDPOINT",
      "name": "ERP API Endpoint",
      "currentValue": "http://old-customer-erp.com/api",
      "vaultLocation": {
        "type": "VAF_CONFIG",
        "module": "Module_ERP_Integration",
        "setting": "Setting_ApiUrl",
        "comPath": "MFilesAPI.GetNamedValue('ERP_Integration', 'ApiUrl')"
      },
      "dataType": "URL",
      "validation": "Must be valid HTTPS URL"
    },
    {
      "id": "SQL_CONNECTION_STRING",
      "name": "SQL Connection String",
      "currentValue": "Server=old_sql.template.local;Database=mfiles_vault;...",
      "vaultLocation": {
        "type": "PROPERTY_DEFINITION",
        "propertyDefName": "SQL_Connection",
        "propertyDefId": 104,
        "lookupByName": true,
        "path": "Object Class: Integration Settings -> Property Def 'SQL_Connection'"
      },
      "dataType": "Connection String",
      "validation": "Must contain Server=, Database=, User=, Password="
    },
    {
      "id": "VENDOR_LIST",
      "name": "Vendor List",
      "currentValue": "template_vendors",
      "vaultLocation": {
        "type": "VALUE_LIST",
        "valueListName": "Vendors",
        "valueListId": 56,
        "lookupByName": true
      },
      "dataType": "Value List",
      "validation": "Must reference existing value list by name"
    },
    {
      "id": "NAMED_ACL_GROUPS",
      "name": "Finance Department AD Groups",
      "currentValue": ["TEMPLATE\\Finance", "TEMPLATE\\Finance_Approvers"],
      "vaultLocation": {
        "type": "NAMED_ACL",
        "namedACLName": "Finance_Access",
        "namedACLId": 12
      },
      "dataType": "Active Directory Groups",
      "validation": "Must be valid AD groups in customer's domain"
    }
  ],
  "workflowMetadata": [
    {
      "workflowName": "Document Approval",
      "states": [
        {
          "stateName": "Submitted",
          "requiredProperties": ["DocumentType", "Owner"],
          "userPrompts": ["Confirm submission notes"],
          "permissions": ["ACME\\Approvers"]
        }
      ],
      "transitions": [
        {
          "from": "Submitted",
          "to": "Approved",
          "guards": ["Owner is assigned", "DocumentType is not empty"],
          "actions": ["Set ApprovedDate", "Notify Requestor"]
        }
      ]
    }
  ]
}
```

#### How Provisioning Engine Uses the Map (V2)

**Provisioning Input:** Customer variables JSON
```json
{
  "customerName": "ACME Corp",
  "erpEndpoint": "https://erp.acmecorp.local:8080/api",
  "sqlConnection": "Server=acme-sql-01;Database=mfiles_vault;...",
  "vendorList": "acme_vendors.csv",
  "adGroups": {
    "Finance": ["ACMECORP\\Finance", "ACMECORP\\Finance_Mgmt"]
  }
}
```

**Provisioning Logic:**
```
For each integration point in mappingTemplate:

  IF location.type == "VAF_CONFIG":
    newValue = customerVars[integration.id]
    MFilesAPI.SetNamedValue(module, setting, newValue)
    
  IF location.type == "PROPERTY_DEFINITION":
    propertyName = location.propertyDefName  // "SQL_Connection", not ID 104
    newValue = customerVars[integration.id]
    propertyDef = Vault.FindPropertyDefByName(propertyName)  // NAME-BASED LOOKUP
    UpdateConfigObjectProperty(propertyDef, newValue)
    
  IF location.type == "VALUE_LIST":
    valueListName = location.valueListName  // "Vendors", not ID 56
    newList = ReadCSV(customerVars[integration.id])
    valueList = Vault.FindValueListByName(valueListName)  // NAME-BASED
    valueList.Clear()
    valueList.ImportEntries(newList)
    
  IF location.type == "NAMED_ACL":
    namedACLName = location.namedACLName
    newGroups = customerVars[integration.id]
    newACL = Vault.CloneNamedACL(namedACLName, "ACME_" + namedACLName)
    newACL.InjectAdGroups(newGroups)
```

#### Why This Approach is Safe

**Without Mapping (DANGEROUS):**
```csharp
// Hardcoded approach
MFilesAPI.GetPropertyDefById(104).SetValue("NEW_ERP_URL");
// Problem: Property ID 104 might be different in another vault!
// Result: Silent data corruption
```

**With Mapping (SAFE):**
```csharp
// Mapping-based approach
PropertyDef propertyDef = Vault.FindPropertyDefByName("ERP_URL");
propertyDef.SetValue("NEW_ERP_URL");
// Result: Correct property updated, regardless of internal ID shift
```

#### The Complete Picture

**V1 (Discovery):** Creates the GPS map
- Scans template vault
- Maps WHERE every integration lives (by name + ID)
- Records HOW to access each (COM paths, API calls)
- Outputs JSON mapping template

**V2 (Provisioning):** Uses the map to navigate safely
- Reads mapping template
- Finds locations by name (stable across vaults)
- Updates values using the COM paths from the map
- Validates changes before applying
- No hardcoding, no blind ID-based updates

**Result:** Automated vault deployment that **cannot corrupt your metadata** because every update is name-based and validated.

---

## 7. Development Environment & Tooling

**Workspace:** VS Code with integrated terminals and multi-AI pair programming.

**AI Assistants:** Claude 3.5 Sonnet (primary), GPT-5.6 Codex, and GLM models accessed via API and integrated extensions.

**Execution Environment:** Local M-Files server (Conformity vault) running on home office network. All scanning, indexing, and context retrieval runs locally; only queries/questions leave the office network for external AI models.

**Version Control:** Git (personal repository, scriptdotnet organization).

**Testing:** Unit tests (NUnit/xUnit), integration tests against live Conformity vault, manual UAT against documented use cases.

---

## 8. Detailed Functional Requirements

### 8.1 Discovery Engine Requirements

| ID | Requirement | Description |
|---|---|---|
| DISC-001 | Complete Vault Enumeration | The discovery engine must scan and index every object type, class, property, workflow, and permission accessible to the authenticated user. |
| DISC-002 | Repeatable Scanning | Scanning must be idempotent; running twice in succession must produce the same index (or flag legitimate changes). |
| DISC-003 | Change Detection | Each scan must compare against the prior scan and report additions, removals, and modifications to vault configuration. |
| DISC-004 | Conflict Detection | Discovery engine must flag inconsistencies: circular workflows, orphaned classes, conflicting permissions, undefined properties. |
| DISC-005 | Integration Mapping Template (Critical for V2) | Generate a comprehensive JSON mapping template documenting every integration point in the vault: VAF configurations, metadata properties, SQL connections, API tokens, Value Lists, Named ACLs. Map includes: location (VAF path, property name, ID), access method (COM API call, property lookup), data type, validation rules. This template is the foundation for safe Provisioning Engine operation (V2). |

### 8.2 Documentation Engine Requirements

| ID | Requirement | Description |
|---|---|---|
| DOC-001 | SOP Auto-Generation | Generate step-by-step procedures for common vault operations (e.g., "Submit a Conformity Document", "Approve a Request") based on workflow definitions. |
| DOC-002 | Onboarding Guide | Produce a markdown/HTML guide introducing new users to vault structure, key workflows, permissions, and integration points. |
| DOC-003 | Integration Maps | Diagram or table format showing external systems connected to the vault, endpoints, sync frequency, failure handling. |
| DOC-004 | State Diagrams | Generate workflow state transition visualizations (graphviz, mermaid, or similar) from workflow definitions. |

### 8.3 Workflow Engine Requirements

| ID | Requirement | Description |
|---|---|---|
| WF-001 | State Graph Construction | Parse workflow definitions and construct a directed graph of states and transitions. |
| WF-002 | Guard Extraction | Identify and list all preconditions (guards) that must be satisfied for a transition to fire. |
| WF-003 | Action Materialization | Extract and describe all side effects triggered by state transitions (emails, API calls, property updates). |
| WF-004 | Cycle Detection | Detect and warn about circular or infinite-loop patterns in workflow definitions. |
| WF-005 | Workflow Simulation & Animation | Multi-Tab Visualization Interface: Tab 1 Animation Canvas (animated document flow through states), Tab 2 M-Files Original View (original workflow structure for validation), Tab 3 Metadata View (properties, guards, actions per state), Tab 4 JSON Raw (complete workflow export). Animation is rendered in ProvisioningAI React UI (not an M-Files add-on). Includes branch testing and smooth state transitions. |
| WF-006 | Simulation Logic | Engine evaluates transition triggers (property changes, state actions) to determine path automatically, OR allows user to manually click through branches for "what-if" scenario testing. |
| WF-007 | Visual Testing & Validation | Ideal for validating workflow logic before deployment and for visually onboarding business analysts to how the Conformity vault processes a document. |
| WF-008 | Workflow Metadata Extraction | Extract properties used in each state (guards, actions, user prompts), identify guard conditions, identify transition actions, and capture permissions for who can act in each state. Store results in structured format for Metadata View display. |
| WF-009 | Multi-View Workflow Visualization | Provide four independently useful tabbed views: Animation View (intuitive flow understanding), M-Files Original View (source validation), Metadata View (technical breakdown), JSON Raw View (debug/export). Together these views provide complete workflow understanding. |

### 8.4 Structured Index Requirements

| ID | Requirement | Description |
|---|---|---|
| IDX-001 | Queryable Format | Index must support efficient queries by AI copilot (e.g., "find all workflows containing state X", "list all users with permission Y"). |
| IDX-002 | Versioning | Index must be versioned; each discovery scan produces an immutable snapshot dated at scan time. |
| IDX-003 | JSON/Relational Hybrid | V1 uses JSON files (for simplicity) or lightweight SQLite (for query performance); structure allows migration to graph DB in V2. |
| IDX-004 | Audit Trail | Index must include a log of all discovery scans, deltas, and copilot queries for compliance. |

### 8.5 Vault Provisioning Engine Requirements (V2+)

| ID | Requirement | Description |
|---|---|---|
| PROV-001 | Template Variable Input | Accept structured JSON/CSV input containing: Company Name, Vendor Lists (CSV format), ERP Endpoints (URLs, connection strings), SQL Table mappings, Active Directory Group names. |
| PROV-002 | Configuration Discovery | Leverage Discovery Engine's index to identify all integration points: metadata properties with ERP endpoints, VAF config objects with SQL connections, Value List definitions, Named ACL templates. |
| PROV-003 | Value List Replacement | Programmatically identify template vendor lists, flush existing entries, and import new customer-specific lists without affecting workflow logic. |
| PROV-004 | Integration Rewiring | Update VAF configuration objects and metadata properties containing ERP endpoints, SQL connection strings, and API URLs with customer-provided values. |
| PROV-005 | Named ACL Cloning | Clone template Named ACLs and programmatically inject new customer's Active Directory groups while preserving permission structure. |
| PROV-006 | Plan/Apply Pattern | Generate detailed "Rewiring Plan" showing: deletions (old vendor entries), changes (updated endpoints), additions (new AD groups). Require explicit operator approval before executing any COM API writes. |
| PROV-007 | Safety Verification | Validate rewiring plan against schema (e.g., ensure ERP endpoint is valid URL, SQL connection string has required parameters) before allowing Apply. |
| PROV-008 | Rollback Capability | Maintain checkpoint before rewiring; allow rollback to pre-rewire state if Apply fails or if operator cancels mid-operation. |
| PROV-009 | Audit Logging | Log all rewiring operations: input variables, plan generation, approver identity, Apply timestamp, success/failure status, changes applied. |
| PROV-010 | Multi-Vault Support (V2+) | Provisioning Engine scales to handle multiple template vaults and customer configurations simultaneously. |

### 8.6 AI Copilot Requirements

| ID | Requirement | Description |
|---|---|---|
| AI-001 | Natural Language Queries | Accept free-form English questions about vault structure and operations. |
| AI-002 | Context-Aware Responses | Retrieve relevant index data and pass to Claude/GPT with sufficient context for accurate answers. |
| AI-003 | Citation & Verification | All facts in copilot responses must be traceable to index data; copilot must cite source objects/workflows. |
| AI-004 | Permission Awareness | Copilot must respect querying user's vault permissions; do not reveal data inaccessible to them. |
| AI-005 | Read-Only in V1 | Copilot does not execute state changes, approve workflows, or modify vault data in V1. |
| AI-006 | Audit Logging | Every copilot query and response must be logged with user, timestamp, question, index context, and AI response. |

---

## 9. Security & Compliance

### 9.1 Access Control & Audit

- **Role-Aware Copilot:** The AI copilot respects the authenticated user's actual M-Files permissions. It does not default to unrestricted admin access.
- **Audit Trail:** Every discovery scan and AI copilot query is logged with user, timestamp, question/context, and response.
- **Access Restrictions:** Administrative data (Named ACLs, VAF configs) requires elevated permissions to query; copilot enforces these boundaries.

### 9.2 Data Locality & Network Boundaries

- **Local Index Storage:** All indexed vault data resides on the home office server; no cloud backup or external storage of admin data.
- **Query-Only External Calls:** Only AI copilot queries (and generic context, if needed) may leave the local network for Claude/GPT APIs.
- **No Credentials on Wire:** M-Files connection credentials and vault secrets are never transmitted or logged; authentication uses SSO-first COM infrastructure from Connector I.

### 9.3 Logging & Compliance

- **Discovery Scan Logs:** Date, user, objects scanned, changes detected, errors.
- **Copilot Query Logs:** User, timestamp, question, index context retrieved, AI response, latency.
- **Retention:** Logs retained per organizational compliance policy (recommend 1 year minimum for audit purposes).

---

## 10. Data Flow & Integration Points

### 10.1 Discovery Workflow

1. **Discovery trigger:** Manual, scheduled, or webhook-based
2. **COM API Connector** authenticates to vault (SSO-first, 9-arg Connect)
3. **Discovery Engine** scans object types, classes, workflows, permissions
4. **Conflict detection** runs; results are flagged for review
5. **Index** is updated (new snapshot created, deltas logged)
6. **Documentation Engine** regenerates SOPs, onboarding guides, diagrams
7. **Scan completion** logged with user, timestamp, status, errors

### 10.2 Copilot Query Workflow

1. User submits natural-language question to copilot interface
2. Copilot parses question (intent, entities)
3. Structured index is queried for relevant objects, workflows, permissions
4. Context is formatted into a prompt; user's vault permissions are verified
5. Prompt + context sent to Claude/GPT (only questions/context, no sensitive data)
6. AI response received and verified against index (citations checked)
7. Response delivered to user
8. Query, context, response, and latency logged for audit

### 10.3 External Integration Points (V1)

- **M-Files COM API:** Connector I plumbing; vault config, ACLs, VAF
- **M-Files REST API:** Searches, metadata, workflow state reads
- **Claude/GPT APIs:** AI copilot responses (via Anthropic and OpenAI clients)
- **GLM APIs:** Alternative AI copilot backend (local or API-based)

---

## 11. Success Metrics

### Delivery Metrics

- Discovery Engine scans Conformity vault in < 5 minutes (end-to-end)
- 100% object type and class coverage in index (verified against manual audit)
- Index query latency: < 500ms for copilot context retrieval (tail latency)
- Documentation generated within 2 minutes post-scan

### Quality Metrics

- Copilot response accuracy: ≥ 95% (manual verification of sample queries)
- Citation coverage: 100% of factual claims in copilot responses must be citable to index data
- Audit log completeness: 100% of discovery scans and copilot queries logged
- Zero data leakage: No vault admin data transmitted outside local network

### Adoption Metrics

- Onboarding documentation completeness: All major workflows and object types covered
- Copilot usage: Track queries/week to gauge adoption
- User feedback: Satisfaction score ≥ 4/5 (survey of early users)

---

## 12. Roadmap & Phases

| Phase | Focus | Timeline |
|-------|-------|----------|
| **V1 (Current)** | **Discovery & Documentation:** COM/REST connectors, Discovery Engine, Documentation Engine, Workflow Engine (static diagrams & state graphs), Structured JSON Index, AI Copilot (read-only). Conformity vault testbed. | 3–4 months |
| **V1.5 (Next)** | **Workflow Simulation:** Multi-view workflow experience in ProvisioningAI React UI: Animation tab, M-Files Original tab, Metadata tab, JSON Raw tab. Includes manual "what-if" scenario testing and technical validation views. | 1–2 months |
| **V2 (Game-Changer)** | **Knowledge Graph & Vault Provisioning (The "Holy Grail"):** Migrate structured index to true Graph DB (Neo4j). Implement Vault Provisioning Engine with Plan/Apply automation for ERP endpoints, Value Lists, Named ACLs, and SQL connections. Auto-deploy template vaults in 5 minutes. Expand to additional vaults (Approbation). | 3–4 months |
| **V3+ (Future)** | **Advanced Automation & Platform:** Workflow automation recommendations, approval decision support, compliance analysis, multi-vault SaaS platform, AI fine-tuning. | TBD |

### Phase Descriptions

**V1** establishes the foundation: automated vault discovery, documentation generation, and knowledge index. Core infrastructure and Connector I integration are solid. Static workflow diagrams and state graphs provide baseline visualization. AI Copilot reads and explains vault structure.

**V1.5** adds the killer visual feature: Workflow Simulation & Animation. Animation happens in the ProvisioningAI React UI (not in an M-Files add-on). Users watch documents flow through states, manually test "what-if" scenarios, validate against the M-Files original view, inspect extracted metadata, and export raw JSON. This bridges abstract diagrams and executable processes for both business and technical validation.

**V2** is the game-changer: the **Vault Provisioning Engine** (the "Holy Grail"). Leveraging the Discovery Engine's configuration map (built in V1), the Provisioning Engine automates vault rewiring for new customers. Input a JSON file with new customer data → 5-minute automated deployment replaces 2-week manual reconfiguration. This is **consulting gold**: eliminate manual vault cloning, reduce human error, and position ProvisioningAI as the definitive vault automation platform. Simultaneously, Knowledge Graph migration to Neo4j provides advanced visualization and scalability for multi-vault deployments.

**V3+** scales to multi-vault SaaS, workflow automation recommendations, compliance analysis, and AI fine-tuning for industry-specific vaults.

---

## 13. Key Decisions & Assumptions

### 13.1 Answered Questions

**Q1: Index Format (V1)**  
**Answer:** JSON/Relational hybrid (SQLite or flat JSON files), not a true Knowledge Graph. The Knowledge Graph becomes a major presentation point in V2.

**Q2: AI Hosting**  
**Answer:** Multi-AI pair programming approach using Claude, GPT-5.6 Codex, and GLM models via API, all running locally on the home office server. The local-context-only model: vault index remains local, only questions/generic context leave for AI processing.

**Q3: Code Reuse**  
**Answer:** COM API infrastructure from Connector I (9-arg Connect, SSO-first auth, Close-ComObjectSafe) is directly imported into the Discovery Engine. No refactoring into a separate shared module in V1; reuse is direct in-code.

**Q4: Write/Automation (V1 vs V3)**  
**Answer:** AI Copilot is read-only in V1. Write actions and workflow automation are deferred to V3. This reduces V1 scope and risk while maintaining the query/explanation foundation.

### 13.2 Key Assumptions

- **Conformity vault is representative:** V1 discoveries and documentation patterns will apply to other vaults in V2+.
- **M-Files API stability:** COM and REST APIs are stable; no breaking changes during V1 development.
- **Local server availability:** Home office M-Files server is available and accessible for scanning and testing.
- **AI model quality:** Claude, GPT, and GLM models provide sufficient accuracy for vault Q&A without extensive fine-tuning.
- **User permissions are static:** Permissions do not change during a discovery scan (or changes are acceptable data errors).

---

## 14. Dependencies & Risks

### 14.1 External Dependencies

- **Connector I (completed, live, audit-passed):** Provides COM API plumbing; ProvisioningAI depends on this foundation.
- **M-Files Server (Conformity):** Must remain available and accessible during development.
- **AI Services (Claude, OpenAI, GLM):** Required for copilot responses; network outages or API downtime impact functionality.
- **VS Code & Extensions:** Development environment stability; pair programming extensions and AI assistant integrations.

### 14.2 Technical Risks

- **Discovery Engine Coverage:** Complex VAF applications or non-standard vault configurations may not be fully discovered.
- **AI Hallucination:** Copilot responses may contain fabricated details not in the index; citation verification mitigates this.
- **Performance at Scale:** Discovery and indexing latency may increase with vault size; optimize if Conformity grows significantly.
- **Multi-AI Coordination:** Ensuring consistent behavior across Claude, GPT, and GLM backends without synchronization overhead.

### 14.3 Mitigation Strategies

- **Validation & Testing:** Integration tests against live Conformity vault; manual UAT of discovery against expected configuration.
- **Citation Enforcement:** Copilot responses must cite index data; no facts without traceable source.
- **Incremental Rollout:** V1 starts with core pipeline; additional features added in V2 based on feedback.
- **Documentation First:** Maintain clear documentation of discovery assumptions and VAF/integration plugin handling.

---

## 15. Open Items & Future Decisions

- **V2 Graph DB Selection:** Neo4j vs. embedded graph (e.g., ArangoDB) for performance and deployment flexibility.
- **Visualization Framework:** Mermaid vs. Graphviz vs. custom D3.js renderers for workflow and dependency diagrams.
- **Scaling Strategy:** How to handle discovery of large vaults (>1000 object types, >500 workflows) in acceptable time.
- **Multi-Vault Expansion:** Timeline and approach for onboarding Approbation vault in V2 without duplicating infrastructure.
- **Compliance Metadata:** Extending index to include compliance tags, data classification, retention policies (for Approbation readiness).

---

## 16. Conclusion

Connector II (ProvisioningAI) transforms M-Files vault knowledge from scattered, manual documentation into a queryable, AI-driven intelligence layer. By automating discovery, generating documentation, and providing natural-language access, ProvisioningAI reduces onboarding friction, improves audit readiness, and establishes a foundation for future multi-vault platforms.

V1 focuses on delivering core discovery and documentation capabilities against the Conformity testbed vault, leveraging existing Connector I infrastructure and multi-AI pair programming. V2 and V3 phases scale to additional vaults, introduce true knowledge graphs, and unlock workflow automation and compliance analysis.

**This PRD establishes the foundation for a scalable, secure, and user-centric vault intelligence system.**

---

## Appendix: Quick Reference

### Component Quick Links

- **COM API Connector:** Administrative tasks (config, ACLs, VAF)
- **REST API Connector:** Searches, metadata, workflow states
- **Discovery Engine:** Automated vault scanning and indexing
- **Documentation Engine:** SOP and guide generation
- **Workflow Engine:** State transition analysis
- **Structured Index:** JSON/Relational queryable foundation
- **AI Copilot:** Natural-language Q&A interface

### Compliance Checklist

- [ ] All discovery scans logged
- [ ] All AI copilot queries logged
- [ ] User permissions verified before response
- [ ] No admin data transmitted outside office network
- [ ] 100% citation coverage for copilot responses
- [ ] Audit logs retained (recommend 1 year minimum)

### Development Priorities (V1)

1. COM/REST API connectors (leverage Connector I)
2. Discovery Engine (full vault enumeration)
3. Structured Index (JSON/Relational foundation)
4. Documentation Engine (SOPs, guides, diagrams)
5. Workflow Engine (state graph construction)
6. AI Copilot interface (read-only Q&A)
7. Audit logging and compliance infrastructure
