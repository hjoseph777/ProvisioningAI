# ProvisioningAI Tech Stack: React Electron + C#/.NET Architecture

**Date:** July 24, 2026  
**Scope:** Complete tech stack for V1 core pipeline (Discovery, Documentation, Workflow, Provisioning)  
**Frontend:** React Electron (already in use)  
**Backend:** C#/.NET microservices  
**Development:** VS Code, local M-Files server

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    REACT ELECTRON FRONTEND                       │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  UI Components (Discovery, Simulation, Provisioning)    │   │
│  │  - Discovery Scanner Dashboard                          │   │
│  │  - Workflow Simulation Canvas (Animated)                │   │
│  │  - Provisioning Plan/Apply Interface                    │   │
│  │  - AI Copilot Chat Interface                            │   │
│  │  - Documentation Viewer                                 │   │
│  └──────────────────────────────────────────────────────────┘   │
│         ↓ (Electron IPC & REST API calls)                        │
└─────────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────────┐
│              C#/.NET BACKEND SERVICES (Local Server)             │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Discovery Engine      │ Documentation Engine             │   │
│  │ Workflow Engine       │ Provisioning Engine              │   │
│  │ AI Copilot Service    │ Audit Logging Service            │   │
│  └──────────────────────────────────────────────────────────┘   │
│         ↓ (COM API, REST API, Local Storage)                     │
└─────────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────────┐
│              M-FILES VAULT (Conformity - Testbed)                │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Object Types │ Workflows │ Properties │ Value Lists      │   │
│  │ Named ACLs   │ VAF Apps  │ Configs    │ Integration Pts  │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘

External (with Plan/Apply gate):
AI APIs: Claude, OpenAI GPT-5.6 Codex, GLM
```

---

## Frontend: React Electron

### Tech Stack

```
electron@latest
├── react@18.x
├── react-dom@18.x
├── react-router-dom@6.x (for page routing)
│
├── UI Components & Styling
│   ├── shadcn/ui (component library, already integrated)
│   ├── tailwindcss@3.x (styling)
│   ├── lucide-react (icons)
│   └── recharts (data visualization)
│
├── Visualization & Animation
│   ├── react-flow-renderer (workflow diagram canvas)
│   ├── framer-motion (animation for workflow simulation)
│   ├── react-tabs (multi-view workflow tab interface)
│   ├── react-json-view (JSON pretty-printing for raw workflow export)
│   ├── d3.js (advanced graph visualization for V2)
│   └── three.js (3D visualization, optional)
│
├── State Management
│   ├── zustand (lightweight state - chosen over Redux)
│   │   └── stores/
│   │       ├── discoveryStore.ts
│   │       ├── simulationStore.ts
│   │       ├── provisioningStore.ts
│   │       └── copilotStore.ts
│   └── react-query@4.x (server state management)
│
├── API Communication
│   ├── axios (HTTP client)
│   ├── electron-is-dev (environment detection)
│   └── electron-store (persist settings locally)
│
├── Developer Experience
│   ├── @vitejs/plugin-react (Vite bundler)
│   ├── typescript@5.x
│   ├── eslint (linting)
│   └── prettier (code formatting)
│
└── Build & Distribution
    ├── electron-builder (packaging)
    ├── electron-updater (auto-updates)
    └── dotenv (environment variables)
```

### Frontend Directory Structure

```
provisioningai-frontend/
├── electron/
│   ├── main.ts                    # Main Electron process
│   ├── preload.ts                 # IPC preload bridge
│   └── utils/
│       ├── ipc-handlers.ts        # Electron IPC handlers
│       └── security.ts             # CSP, security headers
│
├── src/
│   ├── components/
│   │   ├── Discovery/
│   │   │   ├── DiscoveryScannerDashboard.tsx
│   │   │   ├── VaultStructureTree.tsx
│   │   │   ├── IntegrationPointsMap.tsx
│   │   │   └── MappingTemplateViewer.tsx
│   │   │
│   │   ├── Simulation/
│   │   │   ├── WorkflowSimulationTabs.tsx       # Multi-tab container
│   │   │   ├── AnimationView.tsx                # Animation-focused view wrapper
│   │   │   ├── MFilesOriginalView.tsx           # Original M-Files structure view
│   │   │   ├── MetadataView.tsx                 # Properties/guards/actions detail view
│   │   │   ├── JsonRawView.tsx                  # Raw JSON export and debug view
│   │   │   ├── WorkflowSimulationCanvas.tsx     # Animated diagram canvas
│   │   │   ├── DocumentFlowAnimation.tsx        # Paper icon moving through states
│   │   │   ├── StateTransitionControls.tsx      # Manual "what-if" testing
│   │   │   └── SimulationTimeline.tsx           # Playback controls
│   │   │
│   │   ├── Provisioning/
│   │   │   ├── ProvisioningWizard.tsx           # Step-by-step flow
│   │   │   ├── CustomerVariablesForm.tsx        # Input JSON/CSV
│   │   │   ├── RewiringPlanDisplay.tsx          # Plan preview
│   │   │   ├── ApplyConfirmation.tsx            # Approval gate
│   │   │   └── ProvisioningStatus.tsx           # Real-time execution status
│   │   │
│   │   ├── Copilot/
│   │   │   ├── ChatInterface.tsx                # Q&A with vault
│   │   │   ├── QueryInput.tsx
│   │   │   ├── ResponseDisplay.tsx
│   │   │   └── CitationViewer.tsx               # Show sources
│   │   │
│   │   ├── Documentation/
│   │   │   ├── SopViewer.tsx                    # SOPs & guides
│   │   │   ├── IntegrationMapViewer.tsx
│   │   │   ├── StateFlowDiagram.tsx
│   │   │   └── AuditLogViewer.tsx
│   │   │
│   │   └── Common/
│   │       ├── Layout.tsx
│   │       ├── Navbar.tsx
│   │       ├── Sidebar.tsx
│   │       └── LoadingSpinner.tsx
│   │
│   ├── stores/                    # Zustand state management
│   │   ├── discoveryStore.ts
│   │   ├── simulationStore.ts
│   │   ├── provisioningStore.ts
│   │   ├── copilotStore.ts
│   │   └── auditStore.ts
│   │
│   ├── api/                       # API client hooks
│   │   ├── useDiscovery.ts
│   │   ├── useSimulation.ts
│   │   ├── useProvisioning.ts
│   │   ├── useCopilot.ts
│   │   └── apiClient.ts
│   │
│   ├── types/
│   │   ├── vault.ts               # Vault data structures
│   │   ├── discovery.ts           # Discovery output types
│   │   ├── mapping.ts             # Mapping template types
│   │   ├── provisioning.ts        # Provisioning types
│   │   └── index.ts
│   │
│   ├── utils/
│   │   ├── formatters.ts          # Format data for display
│   │   ├── validators.ts          # Validate customer inputs
│   │   └── electron-utils.ts      # Electron-specific utils
│   │
│   ├── App.tsx
│   └── index.tsx
│
├── public/
│   └── icon.ico
│
├── package.json
├── tsconfig.json
├── vite.config.ts
├── electron-builder.config.js
└── .env.example
```

### Key Frontend Components

#### 1. Discovery Scanner Dashboard
```tsx
// Shows real-time discovery scan progress
// Displays found objects, integrations, conflicts
// Allows user to trigger scans and view results
```

#### 2. Workflow Simulation Tabs (THE KILLER FEATURE)
```tsx
// Multi-view simulation interface (React UI, not M-Files add-on)
// Tab 1: Animation canvas with document flow
// Tab 2: M-Files original structure for source validation
// Tab 3: Metadata detail (properties, guards, actions, permissions)
// Tab 4: JSON raw export/debug
// Manual "what-if" testing: click through branches
```

#### 3. Provisioning Plan/Apply Interface
```tsx
// Step 1: Upload customer variables JSON/CSV
// Step 2: Review proposed plan (what will change)
// Step 3: Approval with signature/timestamp
// Step 4: Monitor real-time Apply execution
// Step 5: Confirmation and rollback option
```

#### 4. AI Copilot Chat
```tsx
// Natural language Q&A about vault structure
// Shows citations (which objects/workflows answer came from)
// Permission-aware (respects user's vault access)
// Audit logged: every query and response
```

---

## Backend: C#/.NET Microservices

### Tech Stack

```
.NET 6+ / .NET 8
├── Core Framework
│   ├── ASP.NET Core (API server)
│   ├── Entity Framework Core (ORM for SQLite/JSON)
│   └── Serilog (structured logging)
│
├── M-Files Integration
│   ├── M-Files COM API (MFilesAPI.dll)
│   │   └── Via COM interop (already proven in Connector I)
│   │
│   ├── M-Files REST API
│   │   └── HttpClient for searches, metadata, workflows
│   │
│   └── M-Files SDK
│       └── Official NuGet packages for type definitions
│
├── Data Persistence (V1)
│   ├── SQLite (primary)
│   │   ├── Microsoft.Data.Sqlite
│   │   └── Entity Framework Core
│   │
│   ├── JSON Files (backup/export)
│   │   ├── Newtonsoft.Json (JSON.NET)
│   │   └── System.Text.Json
│   │
│   └── Elasticsearch (optional for V1+, better for full-text search)
│
├── Data Persistence (V2)
│   └── Neo4j
│       ├── Neo4j.Driver (official driver)
│       └── neo4j-dotnet-driver
│
├── AI Integration
│   ├── Anthropic SDK (Claude API)
│   ├── OpenAI SDK (GPT-5.6 Codex, GPT-4)
│   └── Custom GLM HTTP client (for Baidu GLM)
│
├── Validation & Safety
│   ├── FluentValidation (input validation)
│   ├── PolicyViolationChecking (provisioning safety)
│   └── SchemaValidation (mapping template validation)
│
├── Async & Performance
│   ├── Async/Await (all API calls)
│   ├── BackgroundService (scheduled discovery scans)
│   └── ChannelQueue (audit log buffering)
│
└── Testing & Quality
    ├── xUnit (unit tests)
    ├── Moq (mocking)
    ├── FluetAssertions (readable assertions)
    └── TestContainers (integration testing with M-Files)
```

### Backend Directory Structure

```
provisioningai-backend/
├── ProvisioningAI.Core/
│   ├── Models/
│   │   ├── VaultStructure.cs
│   │   ├── ObjectTypeDefinition.cs
│   │   ├── WorkflowDefinition.cs
│   │   ├── IntegrationPoint.cs
│   │   ├── MappingTemplate.cs
│   │   ├── ProvisioningPlan.cs
│   │   └── AuditLog.cs
│   │
│   ├── Interfaces/
│   │   ├── IDiscoveryEngine.cs
│   │   ├── IDocumentationEngine.cs
│   │   ├── IWorkflowEngine.cs
│   │   ├── IProvisioningEngine.cs
│   │   ├── IAiCopilot.cs
│   │   └── IAuditService.cs
│   │
│   └── Extensions/
│       ├── ValidationExtensions.cs
│       └── MappingExtensions.cs
│
├── ProvisioningAI.Discovery/
│   ├── Services/
│   │   ├── DiscoveryEngine.cs           # Scans vault
│   │   ├── ObjectTypeScanner.cs
│   │   ├── WorkflowScanner.cs
│   │   ├── PermissionMatrixBuilder.cs
│   │   ├── IntegrationPointFinder.cs    # Finds ERP, SQL, API endpoints
│   │   └── MappingTemplateGenerator.cs  # Generates JSON mapping
│   │
│   ├── Connectors/
│   │   ├── MFilesComConnector.cs        # COM API (from Connector I)
│   │   ├── MFilesRestConnector.cs
│   │   └── VafConfigReader.cs           # Reads VAF settings
│   │
│   └── Models/
│       ├── DiscoveryResult.cs
│       └── ScanProgress.cs
│
├── ProvisioningAI.Documentation/
│   ├── Services/
│   │   ├── DocumentationEngine.cs
│   │   ├── SopGenerator.cs
│   │   ├── OnboardingGuideGenerator.cs
│   │   ├── IntegrationMapGenerator.cs
│   │   └── StateFlowDiagramGenerator.cs
│   │
│   ├── Templates/
│   │   ├── sop-template.md
│   │   ├── onboarding-template.html
│   │   └── integration-map-template.md
│   │
│   └── Renderers/
│       ├── MermaidRenderer.cs           # Flowchart generation
│       └── GraphvizRenderer.cs
│
├── ProvisioningAI.Workflow/
│   ├── Services/
│   │   ├── WorkflowEngine.cs
│   │   ├── StateGraphBuilder.cs
│   │   ├── GuardExtractor.cs
│   │   ├── ActionSequenceBuilder.cs
│   │   ├── WorkflowMetadataExtractor.cs # Extract properties/guards/actions/permissions
│   │   └── CycleDetector.cs
│   │
│   ├── Simulation/
│   │   ├── WorkflowSimulator.cs         # For animated visualization
│   │   ├── DocumentFlowAnimator.cs      # Paper icon movement
│   │   ├── PathResolver.cs              # Resolve state paths
│   │   └── MultiViewProjectionBuilder.cs # Build Animation/M-Files/Metadata/JSON projections
│   │
│   └── Models/
│       ├── StateGraph.cs
│       ├── WorkflowPath.cs
│       └── TransitionRule.cs
│
├── ProvisioningAI.Provisioning/
│   ├── Services/
│   │   ├── ProvisioningEngine.cs        # Main orchestrator
│   │   ├── PlanGenerator.cs             # Creates rewiring plan
│   │   ├── PlanValidator.cs             # Validates plan before apply
│   │   ├── ApplyExecutor.cs             # Executes plan with COM API
│   │   ├── RollbackManager.cs           # Checkpoint & rollback
│   │   └── ProvisioningAuditor.cs       # Logs all operations
│   │
│   ├── Rewiring/
│   │   ├── VendorListRewirer.cs         # Flush & import value lists
│   │   ├── IntegrationRewirer.cs        # Update ERP/SQL endpoints
│   │   ├── NamedAclCloner.cs            # Clone & inject AD groups
│   │   └── VafConfigUpdater.cs          # Update VAF settings
│   │
│   ├── Models/
│   │   ├── CustomerVariables.cs
│   │   ├── RewiringPlan.cs
│   │   ├── RewiringOperation.cs
│   │   └── ProvisioningCheckpoint.cs
│   │
│   └── Validation/
│       ├── UrlValidator.cs
│       ├── SqlConnectionValidator.cs
│       ├── AdGroupValidator.cs
│       └── ApiTokenValidator.cs
│
├── ProvisioningAI.Copilot/
│   ├── Services/
│   │   ├── CopilotService.cs
│   │   ├── QueryParser.cs
│   │   ├── ContextRetriever.cs          # Gets index data
│   │   ├── PromptBuilder.cs             # Builds AI prompts
│   │   ├── ResponseValidator.cs         # Checks citations
│   │   └── PermissionChecker.cs         # Enforces user permissions
│   │
│   ├── AIProviders/
│   │   ├── ClaudeProvider.cs            # Anthropic API
│   │   ├── OpenAiProvider.cs            # OpenAI API
│   │   ├── GlmProvider.cs               # Baidu GLM API
│   │   └── IAiProvider.cs               # Interface
│   │
│   └── Models/
│       ├── Question.cs
│       ├── AiResponse.cs
│       └── Citation.cs
│
├── ProvisioningAI.Data/
│   ├── DatabaseContext.cs               # EF Core DbContext
│   ├── Repositories/
│   │   ├── VaultStructureRepository.cs
│   │   ├── MappingTemplateRepository.cs
│   │   ├── ProvisioningRepository.cs
│   │   └── AuditLogRepository.cs
│   │
│   ├── Migrations/
│   │   └── (EF Core migrations for schema changes)
│   │
│   └── Seeders/
│       └── InitialDataSeeder.cs
│
├── ProvisioningAI.Audit/
│   ├── Services/
│   │   ├── AuditLogger.cs               # Serilog + structured logging
│   │   ├── DiscoveryScanAuditor.cs
│   │   ├── ProvisioningAuditor.cs
│   │   └── CopilotAuditor.cs
│   │
│   └── Models/
│       └── AuditEntry.cs
│
├── ProvisioningAI.Api/
│   ├── Controllers/
│   │   ├── DiscoveryController.cs       # REST endpoints
│   │   ├── SimulationController.cs
│   │   ├── ProvisioningController.cs
│   │   ├── CopilotController.cs
│   │   ├── DocumentationController.cs
│   │   └── AuditController.cs
│   │
│   ├── Middleware/
│   │   ├── ErrorHandlingMiddleware.cs
│   │   ├── AuditLoggingMiddleware.cs
│   │   └── PermissionMiddleware.cs
│   │
│   ├── HostedServices/
│   │   └── ScheduledDiscoveryScanService.cs  # Runs on schedule
│   │
│   ├── Startup.cs
│   ├── Program.cs
│   └── appsettings.json
│
├── ProvisioningAI.Tests/
│   ├── Discovery/
│   │   ├── DiscoveryEngineTests.cs
│   │   └── MappingTemplateGeneratorTests.cs
│   │
│   ├── Provisioning/
│   │   ├── PlanGeneratorTests.cs
│   │   ├── ApplyExecutorTests.cs
│   │   └── RollbackManagerTests.cs
│   │
│   ├── Copilot/
│   │   └── CopilotServiceTests.cs
│   │
│   ├── Integration/
│   │   └── E2EProvisioningTests.cs       # Full workflow tests
│   │
│   └── Fixtures/
│       └── MockVaultData.cs
│
├── appsettings.json
├── appsettings.Development.json
├── appsettings.Production.json
├── Dockerfile
└── docker-compose.yml
```

---

## Data Layer: V1 (JSON/SQLite) and V2 (Neo4j)

### V1: SQLite Database Schema

```sql
-- Vault Structure
CREATE TABLE ObjectTypes (
    ObjectTypeId INTEGER PRIMARY KEY,
    Name TEXT NOT NULL,
    DisplayName TEXT,
    Description TEXT,
    CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE Properties (
    PropertyId INTEGER PRIMARY KEY,
    Name TEXT NOT NULL,
    ObjectTypeId INTEGER,
    DataType TEXT,
    IsRequired BOOLEAN,
    ValidationRules TEXT,  -- JSON
    FOREIGN KEY (ObjectTypeId) REFERENCES ObjectTypes(ObjectTypeId)
);

-- Workflows & States
CREATE TABLE Workflows (
    WorkflowId INTEGER PRIMARY KEY,
    Name TEXT NOT NULL,
    Description TEXT,
    CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE WorkflowStates (
    StateId INTEGER PRIMARY KEY,
    WorkflowId INTEGER,
    Name TEXT NOT NULL,
    IsInitial BOOLEAN,
    IsFinal BOOLEAN,
    FOREIGN KEY (WorkflowId) REFERENCES Workflows(WorkflowId)
);

CREATE TABLE WorkflowTransitions (
    TransitionId INTEGER PRIMARY KEY,
    WorkflowId INTEGER,
    FromStateId INTEGER,
    ToStateId INTEGER,
    GuardConditions TEXT,  -- JSON
    Actions TEXT,          -- JSON
    FOREIGN KEY (WorkflowId) REFERENCES Workflows(WorkflowId),
    FOREIGN KEY (FromStateId) REFERENCES WorkflowStates(StateId),
    FOREIGN KEY (ToStateId) REFERENCES WorkflowStates(StateId)
);

-- Integration Mapping
CREATE TABLE IntegrationPoints (
    IntegrationId INTEGER PRIMARY KEY,
    Name TEXT NOT NULL,
    Type TEXT,  -- VAF_CONFIG, PROPERTY_DEFINITION, VALUE_LIST, NAMED_ACL
    Location TEXT NOT NULL,  -- JSON with path details
    CurrentValue TEXT,
    DataType TEXT,
    ValidationRules TEXT,  -- JSON
    IsRewireable BOOLEAN DEFAULT 1,
    CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Mapping Template (Discovery Output)
CREATE TABLE MappingTemplates (
    TemplateId INTEGER PRIMARY KEY,
    VaultName TEXT NOT NULL,
    GeneratedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    IntegrationPoints TEXT NOT NULL,  -- JSON array
    VersionNumber INTEGER,
    Status TEXT  -- DRAFT, VALIDATED, PRODUCTION
);

-- Provisioning History
CREATE TABLE ProvisioningOperations (
    OperationId INTEGER PRIMARY KEY,
    CustomerName TEXT NOT NULL,
    TemplateId INTEGER,
    PlanJson TEXT NOT NULL,  -- Full plan
    ApprovedBy TEXT,
    ApprovedAt DATETIME,
    ExecutedAt DATETIME,
    Status TEXT,  -- PLANNED, APPROVED, EXECUTING, COMPLETED, FAILED, ROLLED_BACK
    CheckpointData TEXT,  -- For rollback
    FOREIGN KEY (TemplateId) REFERENCES MappingTemplates(TemplateId)
);

-- Audit Logs
CREATE TABLE AuditLogs (
    AuditId INTEGER PRIMARY KEY,
    Timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    User TEXT,
    Action TEXT,  -- DISCOVERY_SCAN, PROVISIONING_PLAN, PROVISIONING_APPLY, COPILOT_QUERY
    ResourceType TEXT,
    ResourceId TEXT,
    Details TEXT,  -- JSON with full details
    IpAddress TEXT,
    Severity TEXT  -- INFO, WARNING, ERROR, CRITICAL
);

-- Discovery Scans
CREATE TABLE DiscoveryScans (
    ScanId INTEGER PRIMARY KEY,
    StartedAt DATETIME,
    CompletedAt DATETIME,
    ObjectsFound INTEGER,
    IntegrationsFound INTEGER,
    ConflictsDetected TEXT,  -- JSON
    Status TEXT,  -- RUNNING, COMPLETED, FAILED
    ScanDuration_ms INTEGER
);
```

### V1: JSON Structure for Mapping Template

```json
{
  "templateVault": "Conformity",
  "generatedAt": "2026-07-24T20:45:00Z",
  "version": "1.0",
  "scanId": 12345,
  "summary": {
    "totalObjectTypes": 45,
    "totalProperties": 823,
    "totalWorkflows": 34,
    "totalIntegrationPoints": 12,
    "totalValueLists": 78
  },
  "integrationPoints": [
    {
      "id": "ERP_API_ENDPOINT",
      "name": "ERP API Endpoint",
      "type": "VAF_CONFIG",
      "currentValue": "https://sap.template.local:8000/api",
      "location": {
        "module": "Module_SAP_Integration",
        "setting": "ApiUrl",
        "comPath": "MFilesAPI.GetNamedValue('SAP_Integration', 'ApiUrl')",
        "comSetPath": "MFilesAPI.SetNamedValue('SAP_Integration', 'ApiUrl', newValue)"
      },
      "dataType": "URL",
      "validation": {
        "type": "URL",
        "protocol": ["https"],
        "required": true
      },
      "business_function": "ERP Integration",
      "replacement_priority": "HIGH",
      "notes": "Used by SAP sync job"
    },
    {
      "id": "SQL_CONNECTION_STRING",
      "name": "SQL Connection String",
      "type": "PROPERTY_DEFINITION",
      "currentValue": "Server=template-sql.local;Database=mfiles_vault;User=sa;Password=***;",
      "location": {
        "propertyName": "SQL_Connection",
        "propertyId": 104,
        "objectClass": "Integration Settings",
        "lookupMethod": "FindPropertyDefByName",
        "comPath": "Vault.FindPropertyDefByName('SQL_Connection')"
      },
      "dataType": "ConnectionString",
      "validation": {
        "type": "ConnectionString",
        "required_params": ["Server", "Database", "User", "Password"],
        "required": true
      },
      "business_function": "SQL Database Integration",
      "replacement_priority": "HIGH"
    },
    {
      "id": "VENDOR_LIST",
      "name": "Vendor Master List",
      "type": "VALUE_LIST",
      "currentValue": "template_vendors",
      "location": {
        "valueListName": "Vendors",
        "valueListId": 56,
        "lookupMethod": "FindValueListByName",
        "comPath": "Vault.FindValueListByName('Vendors')",
        "importFormat": "CSV"
      },
      "dataType": "ValueList",
      "validation": {
        "type": "CSV",
        "columns": ["VendorID", "VendorName", "Status"],
        "required": true
      },
      "business_function": "Vendor Management",
      "replacement_priority": "MEDIUM",
      "notes": "Import from customer's vendor_list.csv"
    },
    {
      "id": "FINANCE_ACL",
      "name": "Finance Department Access",
      "type": "NAMED_ACL",
      "currentValue": ["TEMPLATE\\Finance", "TEMPLATE\\Finance_Approvers"],
      "location": {
        "namedACLName": "Finance_Access",
        "namedACLId": 12,
        "lookupMethod": "FindNamedACLByName"
      },
      "dataType": "AdGroups",
      "validation": {
        "type": "AdGroups",
        "domainRequired": true,
        "required": true
      },
      "business_function": "Access Control",
      "replacement_priority": "HIGH",
      "notes": "Clone and inject customer's AD groups"
    }
  ],
  "valueListDetails": [
    {
      "name": "Vendors",
      "id": 56,
      "entries": 127,
      "sampleEntries": ["Vendor001", "Vendor002"],
      "requiredColumns": ["VendorID", "VendorName", "Status"]
    }
  ],
  "workflowDetails": [
    {
      "name": "Document Approval",
      "id": 34,
      "states": ["Draft", "Submitted", "Approved", "Published"],
      "integrationTouchPoints": ["Send email on Approved"]
    }
  ]
}
```

### V2: Neo4j Knowledge Graph Schema

```cypher
-- Nodes
CREATE (:Vault {name: "Conformity", discoveredAt: datetime()})
CREATE (:ObjectType {name: "Document", id: 1})
CREATE (:Property {name: "ERP_Endpoint", id: 104, type: "URL"})
CREATE (:Workflow {name: "Document Approval", id: 34})
CREATE (:WorkflowState {name: "Approved", workflowId: 34})
CREATE (:IntegrationPoint {name: "SAP API", type: "VAF_CONFIG"})
CREATE (:ValueList {name: "Vendors", id: 56})

-- Relationships
MATCH (v:Vault), (ot:ObjectType) 
WHERE v.name = "Conformity" AND ot.name = "Document"
CREATE (v)-[:CONTAINS_OBJECT_TYPE]->(ot)

MATCH (ot:ObjectType), (p:Property)
WHERE ot.name = "Document" AND p.name = "ERP_Endpoint"
CREATE (ot)-[:HAS_PROPERTY]->(p)

MATCH (w:Workflow), (ws:WorkflowState)
WHERE w.name = "Document Approval"
CREATE (w)-[:HAS_STATE]->(ws)

MATCH (ot:ObjectType), (ip:IntegrationPoint)
CREATE (ot)-[:USES_INTEGRATION]->(ip)

MATCH (w:Workflow), (ip:IntegrationPoint)
CREATE (w)-[:TRIGGERS_INTEGRATION]->(ip)
```

---

## API Endpoints: Backend REST API

### Discovery Endpoints

```
POST   /api/v1/discovery/scan                          # Trigger scan
GET    /api/v1/discovery/scan/{scanId}                 # Get scan status
GET    /api/v1/discovery/scan/{scanId}/results         # Get scan results
GET    /api/v1/discovery/integrations                  # List all integration points
GET    /api/v1/discovery/mapping-template              # Get mapping template JSON
GET    /api/v1/discovery/conflicts                     # Get detected conflicts
```

### Workflow Simulation Endpoints

```
GET    /api/v1/workflow/{workflowId}                   # Get workflow definition
GET    /api/v1/workflow/{workflowId}/paths             # Get possible state paths
GET    /api/v1/workflow/{workflowId}/metadata          # Get extracted properties/guards/actions/permissions
POST   /api/v1/workflow/{workflowId}/simulate          # Run simulation
GET    /api/v1/workflow/{workflowId}/simulate/{simId}  # Get simulation progress
POST   /api/v1/workflow/{workflowId}/test-path         # Manual "what-if" testing
```

### Provisioning Endpoints

```
POST   /api/v1/provisioning/plan                       # Generate rewiring plan
GET    /api/v1/provisioning/plan/{planId}              # Get plan details
POST   /api/v1/provisioning/approve/{planId}           # Approve plan
POST   /api/v1/provisioning/apply/{planId}             # Execute plan
GET    /api/v1/provisioning/apply/{planId}/status      # Real-time execution status
POST   /api/v1/provisioning/rollback/{operationId}     # Rollback operation
```

### Copilot Endpoints

```
POST   /api/v1/copilot/query                           # Submit question
GET    /api/v1/copilot/query/{queryId}                 # Get response
GET    /api/v1/copilot/query/{queryId}/citations       # Get source citations
```

### Documentation Endpoints

```
GET    /api/v1/documentation/sops                      # List all SOPs
GET    /api/v1/documentation/sop/{sopId}               # Get specific SOP
GET    /api/v1/documentation/onboarding-guide          # Get onboarding guide
GET    /api/v1/documentation/integration-map           # Get integration map
GET    /api/v1/documentation/state-diagram/{workflowId}# Get state diagram (SVG)
```

### Audit Endpoints

```
GET    /api/v1/audit/logs                              # Get audit logs
GET    /api/v1/audit/logs?action=PROVISIONING_APPLY   # Filter by action
GET    /api/v1/audit/operations/{operationId}          # Get operation audit trail
```

---

## Communication Patterns

### Electron IPC (Frontend ↔ Backend Process)

```typescript
// Main process (Electron)
ipcMain.handle('discovery:scan', async (event, args) => {
  return await discoveryService.scan();
});

ipcMain.handle('provisioning:apply', async (event, args) => {
  return await provisioningService.apply(args.planId);
});

// Renderer process (React)
const result = await ipcRenderer.invoke('discovery:scan');
```

### HTTP REST API (Electron ↔ Backend Server)

```typescript
// React component
const { data: scanResult } = await fetch('http://localhost:5000/api/v1/discovery/scan', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ vaultName: 'Conformity' })
}).then(r => r.json());
```

### WebSocket (Real-time Progress)

```csharp
// Backend: Hub for real-time updates
public class ProvisioningHub : Hub
{
    public async Task SubscribeToApply(string planId)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, $"plan-{planId}");
    }
    
    // Broadcast progress to UI
    await Clients.Group($"plan-{planId}").SendAsync("ApplyProgress", new {
        completed = 45,
        total = 100,
        message = "Updated ERP endpoint..."
    });
}

// Frontend: React hook
useEffect(() => {
  const connection = new HubConnectionBuilder()
    .withUrl("http://localhost:5000/apply-hub")
    .withAutomaticReconnect()
    .build();
  
  connection.on("ApplyProgress", (progress) => {
    setExecutionProgress(progress);
  });
  
  connection.start();
}, [planId]);
```

---

## Deployment Architecture

### Development (Local Home Office)

```
├── M-Files Server (Conformity)
│   └── Running on local network
│
├── ProvisioningAI Backend (.NET Core)
│   ├── Port 5000 (HTTP)
│   ├── Port 5001 (HTTPS, optional)
│   ├── SQLite DB (local storage)
│   └── Local file logging (Serilog)
│
├── React Electron App
│   ├── Main process: Node.js
│   ├── Renderer: React + Webpack
│   └── IPC bridges to backend
│
└── External AI APIs (with Plan/Apply gate)
    ├── Anthropic (Claude)
    ├── OpenAI (GPT-5.6 Codex)
    └── Baidu GLM
```

### Production (V2+ Optional)

```
Docker Container:
├── .NET Core app
├── SQLite / Neo4j
└── Serilog (structured logging)

Kubernetes (if SaaS):
├── API service (multiple replicas)
├── Database (Neo4j cluster)
├── Redis (caching, job queue)
└── ELK stack (logging & monitoring)
```

---

## Security Considerations

### Frontend (Electron)

```typescript
// IPC Validation
const validEvents = ['discovery:scan', 'provisioning:apply', 'copilot:query'];

ipcMain.handle('*', (event, args) => {
  if (!validEvents.includes(event.channel)) {
    throw new Error('Invalid IPC event');
  }
});

// CSP Headers
const mainWindow = new BrowserWindow({
  webPreferences: {
    sandbox: true,
    preload: path.join(__dirname, 'preload.js'),
    enableRemoteModule: false
  }
});

// No eval, no dangerous APIs
const cspHeader = "default-src 'self'";
```

### Backend (.NET)

```csharp
// Secrets management
var connectionString = configuration["ConnectionStrings:MFilesVault"];
var apiKey = configuration["ApiKeys:Anthropic"];  // From environment, not hardcoded

// COM API Security (from Connector I)
MFilesServerApplication.Connect(
  MFAuthType.MFAuthTypeCredentialsProvider,
  userId: "domain\\user",
  password: null,  // Use Windows auth, not hardcoded password
  server: "vault-server"
);

// Audit logging for all operations
auditLogger.Log(new AuditEntry {
  User = currentUser,
  Action = "PROVISIONING_APPLY",
  ResourceId = planId,
  IpAddress = remoteIp,
  Timestamp = DateTime.UtcNow
});

// Plan/Apply Pattern (safety)
// No writes without explicit approval + audit
```

### Data Locality

```
Local Storage Only:
├── M-Files COM API credentials (Windows auth)
├── Vault configuration (indexed locally)
├── Mapping templates (stored locally)
├── Provisioning operations (logged locally)
└── Customer data (never leaves office network)

External (Gated):
├── Copilot queries (anonymized, permission-checked)
├── AI model APIs (Claude, OpenAI, GLM)
└── Only questions leave office; never vault data
```

---

## Performance Optimizations

### Frontend

```typescript
// Code splitting
const Discovery = lazy(() => import('./pages/Discovery'));
const Simulation = lazy(() => import('./pages/Simulation'));
const Provisioning = lazy(() => import('./pages/Provisioning'));

// Caching (react-query)
useQuery(['discovery', scanId], () => fetchScanResults(scanId), {
  staleTime: 1000 * 60 * 5,  // 5 minutes
  cacheTime: 1000 * 60 * 10
});

// Virtual scrolling for large lists
<FixedSizeList
  height={600}
  itemCount={10000}
  itemSize={35}
>
  {renderRow}
</FixedSizeList>
```

### Backend

```csharp
// Async/await for all I/O
public async Task<DiscoveryResult> ScanVaultAsync()
{
    var objectTypes = await GetObjectTypesAsync();
    var workflows = await GetWorkflowsAsync();
    var integrations = await GetIntegrationPointsAsync();
    return new DiscoveryResult { /* ... */ };
}

// Database indexing
context.Database.ExecuteSqlRaw(@"
  CREATE INDEX idx_integration_name ON IntegrationPoints(Name)
");

// Query optimization
var integrations = await context.IntegrationPoints
    .AsNoTracking()
    .Where(i => i.IsRewireable)
    .ToListAsync();
```

---

## Development Workflow

### Setup

```bash
# Backend
cd provisioningai-backend
dotnet restore
dotnet build
dotnet run  # Starts on localhost:5000

# Frontend
cd provisioningai-frontend
npm install
npm start   # Starts Electron dev mode

# Both connect to local M-Files server
```

### Multi-AI Pair Programming

```
VS Code Setup:
├── Extension: Anthropic Claude (Claude 3.5 Sonnet)
├── Extension: GitHub Copilot (OpenAI GPT-5.6)
├── Extension: Baidu Coze (GLM models)
└── Integrated terminals for running services
```

---

## Summary: Complete Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | React 18 + Electron + Tailwind + Zustand | UI, state, responsive design |
| **Visualization** | React Flow + Framer Motion + react-tabs + react-json-view + Three.js | Multi-view workflow tabs, animation, JSON inspection, 3D (V2) |
| **Backend Core** | ASP.NET Core 8 + C# | API, services, business logic |
| **M-Files Integration** | COM API + REST API | Vault access (Discovery, Provisioning) |
| **Data (V1)** | SQLite + JSON files | Vault index, mapping template |
| **Data (V2)** | Neo4j | Knowledge graph |
| **AI** | Claude, GPT-5.6 Codex, GLM | Copilot Q&A |
| **Logging** | Serilog | Structured audit logs |
| **Testing** | xUnit + Moq | Unit, integration tests |
| **Deployment** | Docker, Kubernetes (future) | Containerization, scaling |

This is a **production-grade architecture** that scales from V1 (local discovery) all the way to V2 (automated provisioning) and V3 (multi-vault platform). 🚀
