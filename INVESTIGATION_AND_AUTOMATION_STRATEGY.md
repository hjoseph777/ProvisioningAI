# ProvisioningAI Investigation & Automation Strategy: M-Files Add-Ons

**Project Goal:** Automate vault reuse by discovering add-on configurations and safely provisioning them for new customers

**Key Insight:** Reusing vaults is good (structure is stable, GUIDs don't change), but manual "under the hood" customization is killing time. Automation via discovery + mapping + provisioning will solve this.

**Approach:** Systematic investigation of add-on architectures → Discovery Engine design → Provisioning automation

---

## Phase 1: Investigation (Let's Discover Everything)

### Step 1: Identify All Add-Ons in Use

**Starting List (to be expanded):**
- SQL Connector (database queries, connections)
- HTTP Caller (external API calls, webhooks)
- ???? (to be discovered)

**Investigation Method:**
```csharp
// Use M-Files COM API to list all installed add-ons
MFilesServerApplication vault = new MFilesServerApplication();
vault.Connect(...);

// List VAF applications
var vafApps = vault.GetApplications();
foreach (var app in vafApps)
{
    Console.WriteLine($"App: {app.Name} (GUID: {app.Guid})");
    Console.WriteLine($"  Version: {app.Version}");
    Console.WriteLine($"  Path: {app.Path}");
    // Inspect each app's configuration
}

// List enabled add-ons
// (Exact COM method TBD - need to investigate)
```

**Deliverable:** Complete inventory of all add-ons in Conformity vault

---

### Step 2: For Each Add-On, Answer These Questions

#### **SQL Connector (Example)**

**Q1: Where are its configurations stored?**
- [ ] In M-Files properties? (Which property? GUID?)
- [ ] In VAF Named Value Storage? (Which module/key?)
- [ ] In an external config file? (Where on disk?)
- [ ] In M-Files settings/admin area? (How to access via COM?)

**Q2: What configurations are customer-specific?**
- SQL Server hostname/IP
- Database name
- SQL credentials (username, password, connection string)
- Query timeouts
- Connection pool settings
- Anything else?

**Q3: How are those configurations currently set?**
- Manual edit in Admin UI?
- Property values on specific objects?
- Configuration objects (dedicated class)?
- VAF Named Value Storage API?
- M-Files settings dialog?

**Q4: How to programmatically UPDATE them?**
```csharp
// Example: If SQL config is in a property
var sqlConfigProperty = vault.FindPropertyDefByName("SQL_Connection");
sqlConfigProperty.SetValue("Server=newserver;Database=newdb;User=sa;");

// Example: If SQL config is in VAF Named Value Storage
vault.SetNamedValue("SQL_Connector", "ConnectionString", "Server=...");

// Example: If it's in a configuration object
var sqlConfig = vault.FindObjectsByClass("SQL_Config")[0];
sqlConfig.GetProperty("ConnectionString").SetValue("Server=...");
```

**Q5: How do you currently verify it's working?**
- Run a test query?
- Check connection status?
- Monitor logs?

---

#### **HTTP Caller (Example)**

**Q1: Where are its configurations stored?**
- Which object type/class holds HTTP endpoints?
- Properties? VAF config? Named Value Storage?
- How are multiple endpoints managed (one per object? property array?)?

**Q2: What configurations are customer-specific?**
- HTTP endpoint URLs
- API authentication (tokens, credentials)
- Header configurations
- Timeout settings
- SSL certificate handling
- Anything else?

**Q3: How to programmatically update them?**
- Same investigation as SQL above

**Q4: Are multiple customers using different endpoints?**
- Customer A: `https://api-a.acmecorp.com/endpoint`
- Customer B: `https://api-b.othercorp.com/endpoint`
- How do you currently manage this?

---

#### **Other Add-Ons (To Be Discovered)**

**Follow the same 5 questions for each**

---

### Step 3: Map All Customer-Specific Configurations

**Output: Configuration Inventory**

```json
{
  "addOns": [
    {
      "name": "SQL Connector",
      "installed": true,
      "customer_specific_configs": [
        {
          "id": "SQL_SERVER",
          "name": "SQL Server Connection",
          "type": "STRING",
          "current_value": "Server=template-sql.local;Database=mfiles;User=sa;",
          "storage_location": {
            "type": "PROPERTY_DEFINITION",
            "property_name": "SQL_Connection",
            "property_guid": "{xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx}",
            "object_class": "Integration Settings"
          },
          "update_method": "SetPropertyValue",
          "validation": {
            "type": "SQL_CONNECTION_STRING",
            "required_params": ["Server", "Database", "User", "Password"]
          },
          "automation_priority": "HIGH"
        },
        {
          "id": "SQL_QUERY_TIMEOUT",
          "name": "Query Timeout (seconds)",
          "type": "INTEGER",
          "current_value": 30,
          "storage_location": {
            "type": "VAF_NAMED_VALUE_STORAGE",
            "module": "SQL_Connector",
            "key": "QueryTimeout"
          },
          "update_method": "SetNamedValue",
          "validation": { "type": "INTEGER", "min": 10, "max": 300 },
          "automation_priority": "MEDIUM"
        }
      ]
    },
    {
      "name": "HTTP Caller",
      "installed": true,
      "customer_specific_configs": [
        {
          "id": "HTTP_ENDPOINT",
          "name": "API Endpoint",
          "type": "STRING",
          "current_value": "https://api.template.com/integration",
          "storage_location": {
            "type": "OBJECT_PROPERTY",
            "object_type": "HTTP Integration Config",
            "property_name": "API_URL",
            "property_guid": "{yyyyyyyy-yyyy-yyyy-yyyy-yyyyyyyyyyyy}"
          },
          "update_method": "UpdateObject",
          "validation": { "type": "URL", "protocol": ["https", "http"] },
          "automation_priority": "HIGH"
        },
        {
          "id": "HTTP_AUTH_TOKEN",
          "name": "API Authentication Token",
          "type": "STRING",
          "current_value": "***REDACTED***",
          "storage_location": {
            "type": "OBJECT_PROPERTY",
            "object_type": "HTTP Integration Config",
            "property_name": "API_Token",
            "property_guid": "{zzzzzzzz-zzzz-zzzz-zzzz-zzzzzzzzzzzz}"
          },
          "update_method": "UpdateObject",
          "validation": { "type": "SECURE_TOKEN", "min_length": 10 },
          "automation_priority": "HIGH"
        }
      ]
    }
  ]
}
```

---

### Step 4: For Each Storage Location Type, Understand the COM API

#### **A. If stored in PROPERTY_DEFINITION**

```csharp
// Discovery
var property = vault.FindPropertyDefByName("SQL_Connection");
var currentValue = property.Value;  // Get current value
var guid = property.Guid;           // Get GUID for stable identification

// Provisioning (Update for new customer)
var property = vault.FindPropertyDefByGUID(guid);  // Use GUID (stable)
property.SetValue(newSqlConnectionString);
```

**Questions to Answer:**
- How to find the property?
- How to read its current value?
- How to set a new value?
- Does it affect other objects?

---

#### **B. If stored in VAF NAMED_VALUE_STORAGE**

```csharp
// Discovery
var currentValue = vault.GetNamedValue("SQL_Connector", "ConnectionString");

// Provisioning
vault.SetNamedValue("SQL_Connector", "ConnectionString", newValue);
```

**Questions to Answer:**
- What modules/keys exist?
- How to enumerate them all?
- Are they customer-specific or global?
- How to safely update without breaking VAF app?

---

#### **C. If stored in CONFIGURATION OBJECTS**

```csharp
// Discovery
var configObjects = vault.FindObjectsByClass("SQL_Config");
foreach (var configObj in configObjects)
{
    var connectionProperty = configObj.FindProperty("SQL_Connection");
    var currentValue = connectionProperty.Value;
}

// Provisioning
var configObj = vault.FindObjectsByClass("SQL_Config")[0];
configObj.SetProperty("SQL_Connection", newValue);
```

**Questions to Answer:**
- Which class holds the configuration?
- Which properties are customer-specific?
- How many config objects per customer?
- How to identify the right object to update?

---

#### **D. If stored in M-FILES SETTINGS/ADMIN AREA**

```csharp
// Discovery / Provisioning (TBD - depends on specific setting)
// Might use:
// - vault.LoggedInUser
// - vault.ServerVersion
// - vault.Properties
// - Custom admin API (if exists)
```

**Questions to Answer:**
- Which settings are exposed via COM API?
- Which require direct registry/config file editing?
- Which require M-Files server restart?

---

### Step 4.5: Workflow Metadata Extraction

For each workflow, discover and capture metadata required for simulation and validation views:

- Properties used in each state (required fields, prompts, validation properties)
- Guard conditions on transitions (property checks, role constraints, conditional logic)
- Transition actions (property updates, notifications, integration triggers)
- User prompts and interaction requirements per state
- Permissions (who can act, approve, reject, or transition)

**Output Artifact:**
- Structured workflow metadata JSON that can directly feed:
    - Animation View (business-friendly state flow)
    - M-Files Original View (source validation)
    - Metadata View (technical details)
    - JSON Raw View (debug/export)

---

### Step 5: Identify Dependencies & Side Effects

**For each configuration, answer:**

**Q1: Are there dependencies?**
- Does changing SQL connection affect other add-ons?
- Does changing HTTP endpoint require VAF app restart?
- Do related configs need to change together?

**Q2: Do any require M-Files restart?**
- VAF apps? (might need restart)
- Named Value Storage? (probably no)
- Properties? (probably no)
- Settings? (might need restart)

**Q3: How to verify changes work?**
- Test SQL query?
- Make HTTP call?
- Check logs?

**Q4: Rollback procedure?**
- Can you immediately revert?
- Or does it need shutdown/restart?

---

## Phase 2: Discovery Engine Design

### Discovery Flow

```
Scan M-Files Vault (Conformity)
    ↓
Step 1: List all VAF apps
Step 2: Scan M-Files properties for integration configs
Step 3: Query Named Value Storage for add-on configs
Step 4: Scan for Configuration objects
Step 5: Inventory M-Files settings
Step 6: Extract workflow metadata (properties, guards, actions, prompts, permissions)
Step 7: For each config, record:
  - Name (human-readable)
  - Current value
  - Storage location (type, path, GUID)
  - Data type & validation rules
  - Customer-specific? (yes/no/maybe)
  - Update method (how to programmatically change it)
  - Dependencies (what else might break)
    ↓
Output: Configuration Inventory JSON + Mapping Template
```

### Discovery Engine Code Skeleton

```csharp
public class AddOnConfigDiscoveryEngine
{
    private MFilesServerApplication vault;
    
    public ConfigurationInventory DiscoverAllConfigurations()
    {
        var inventory = new ConfigurationInventory();
        
        // Discover SQL Connector configs
        inventory.AddRange(DiscoverSqlConnectorConfigs());
        
        // Discover HTTP Caller configs
        inventory.AddRange(DiscoverHttpCallerConfigs());
        
        // Discover other add-ons (to be added as we identify them)
        
        return inventory;
    }
    
    private List<ConfigurationPoint> DiscoverSqlConnectorConfigs()
    {
        var configs = new List<ConfigurationPoint>();
        
        // Q: Is SQL config in a property?
        try
        {
            var sqlProp = vault.FindPropertyDefByName("SQL_Connection");
            configs.Add(new ConfigurationPoint
            {
                Id = "SQL_CONNECTION_STRING",
                Name = "SQL Connection String",
                CurrentValue = sqlProp.Value,
                StorageType = StorageType.PropertyDefinition,
                PropertyName = sqlProp.Name,
                PropertyGuid = sqlProp.Guid,
                CustomerSpecific = true,
                UpdateMethod = UpdateMethod.SetPropertyValue
            });
        }
        catch
        {
            // Not in property, try next location
        }
        
        // Q: Is SQL config in Named Value Storage?
        try
        {
            var connString = vault.GetNamedValue("SQL_Connector", "ConnectionString");
            configs.Add(new ConfigurationPoint
            {
                Id = "SQL_CONNECTION_STRING_NVS",
                Name = "SQL Connection String (NVS)",
                CurrentValue = connString,
                StorageType = StorageType.NamedValueStorage,
                VafModule = "SQL_Connector",
                VafKey = "ConnectionString",
                CustomerSpecific = true,
                UpdateMethod = UpdateMethod.SetNamedValue
            });
        }
        catch
        {
            // Not in NVS either
        }
        
        // Continue checking other possible locations...
        
        return configs;
    }
    
    private List<ConfigurationPoint> DiscoverHttpCallerConfigs()
    {
        var configs = new List<ConfigurationPoint>();
        
        // Similar discovery pattern as SQL
        // Look for HTTP_Endpoint, API_Token, etc.
        // Check properties, NVS, config objects
        
        return configs;
    }
}

public class WorkflowMetadataExtractor
{
    private MFilesServerApplication vault;

    public WorkflowMetadataInventory ExtractAll()
    {
        var inventory = new WorkflowMetadataInventory();
        var workflows = vault.GetWorkflows();

        foreach (var workflow in workflows)
        {
            var workflowMetadata = new WorkflowMetadata
            {
                WorkflowName = workflow.Name,
                States = ExtractStateMetadata(workflow),
                Transitions = ExtractTransitionMetadata(workflow)
            };

            inventory.Workflows.Add(workflowMetadata);
        }

        return inventory;
    }

    private List<StateMetadata> ExtractStateMetadata(Workflow workflow)
    {
        // Inspect state-level required properties, prompts, and permissions
        return new List<StateMetadata>();
    }

    private List<TransitionMetadata> ExtractTransitionMetadata(Workflow workflow)
    {
        // Inspect transition guards and actions
        return new List<TransitionMetadata>();
    }
}
```

---

## Phase 3: Provisioning Automation Design

### Provisioning Flow

```
Customer Variables Input:
{
  "sqlServer": "acme-sql-01.local",
  "sqlDatabase": "mfiles_acme",
  "httpEndpoint": "https://api.acmecorp.com/integration",
  "httpToken": "eyJhbGciOiJIUzI1NiIs..."
}
    ↓
Read Mapping Template (from Discovery output)
    ↓
Generate Provisioning Plan:
  Operation 1: Update SQL_Connection property
    - Current: "Server=template-sql;Database=mfiles;..."
    - New: "Server=acme-sql-01.local;Database=mfiles_acme;..."
  
  Operation 2: Update HTTP_Endpoint property
    - Current: "https://api.template.com/integration"
    - New: "https://api.acmecorp.com/integration"
  
  Operation 3: Update HTTP_Token property
    - Current: "***REDACTED***"
    - New: "eyJhbGciOiJIUzI1NiIs..."
    ↓
Validate Plan:
  - Check all configs are reachable
  - Validate connection strings (proper format)
  - Validate URLs (valid HTTPS)
  - Check no breaking dependencies
    ↓
Operator Approval
    ↓
Execute Plan (with rollback capability):
  For each operation:
    1. Create checkpoint
    2. Update configuration
    3. Test (e.g., SQL query test, HTTP endpoint test)
    4. Log to audit trail
  
  If any test fails:
    - Rollback from checkpoint
    - Log error
    - Halt and notify operator
    ↓
Result: Fully configured vault for ACME
```

### Provisioning Engine Code Skeleton

```csharp
public class AddOnConfigProvisioningEngine
{
    private MFilesServerApplication vault;
    private ConfigurationInventory configInventory;
    
    public ProvisioningPlan GeneratePlan(
        ConfigurationInventory template,
        CustomerVariables customerVars)
    {
        var plan = new ProvisioningPlan();
        
        foreach (var config in template.Configurations)
        {
            if (!config.CustomerSpecific)
                continue;  // Skip non-customer-specific configs
            
            var newValue = customerVars.GetValue(config.Id);
            if (newValue == null)
                continue;  // Customer didn't provide this value
            
            var operation = new ProvisioningOperation
            {
                ConfigId = config.Id,
                ConfigName = config.Name,
                OldValue = config.CurrentValue,
                NewValue = newValue,
                StorageType = config.StorageType,
                ValidationRules = config.Validation,
                UpdateMethod = config.UpdateMethod
            };
            
            plan.AddOperation(operation);
        }
        
        return plan;
    }
    
    public void ExecutePlan(ProvisioningPlan plan)
    {
        var checkpoint = CreateCheckpoint();
        
        try
        {
            foreach (var operation in plan.Operations)
            {
                ExecuteOperation(operation);
                
                // Test the update
                if (!TestConfiguration(operation))
                    throw new ConfigurationTestException($"Configuration test failed: {operation.ConfigName}");
                
                AuditLog($"Applied: {operation.ConfigName}");
            }
        }
        catch (Exception ex)
        {
            AuditLog($"Provisioning failed: {ex.Message}");
            RollbackFromCheckpoint(checkpoint);
            throw;
        }
    }
    
    private void ExecuteOperation(ProvisioningOperation operation)
    {
        // Validate first
        if (!operation.ValidationRules.Validate(operation.NewValue))
            throw new ValidationException($"Invalid value for {operation.ConfigName}");
        
        // Update based on storage type
        switch (operation.StorageType)
        {
            case StorageType.PropertyDefinition:
                UpdatePropertyDefinition(operation);
                break;
                
            case StorageType.NamedValueStorage:
                UpdateNamedValue(operation);
                break;
                
            case StorageType.ConfigurationObject:
                UpdateConfigurationObject(operation);
                break;
                
            default:
                throw new NotImplementedException();
        }
    }
    
    private void UpdatePropertyDefinition(ProvisioningOperation operation)
    {
        // Use GUID if available (stable across clones)
        PropertyDef property;
        
        if (operation.PropertyGuid != null)
            property = vault.FindPropertyDefByGUID(operation.PropertyGuid);
        else
            property = vault.FindPropertyDefByName(operation.PropertyName);
        
        property.SetValue(operation.NewValue);
    }
    
    private void UpdateNamedValue(ProvisioningOperation operation)
    {
        vault.SetNamedValue(
            operation.VafModule,
            operation.VafKey,
            operation.NewValue
        );
    }
    
    private void UpdateConfigurationObject(ProvisioningOperation operation)
    {
        var configObj = vault.FindObjectsByClass(operation.ConfigObjectClass)[0];
        configObj.SetProperty(operation.PropertyName, operation.NewValue);
    }
    
    private bool TestConfiguration(ProvisioningOperation operation)
    {
        // Test based on configuration type
        if (operation.ConfigName.Contains("SQL"))
            return TestSqlConnection(operation.NewValue);
        
        if (operation.ConfigName.Contains("HTTP"))
            return TestHttpEndpoint(operation.NewValue);
        
        // Other tests...
        return true;
    }
    
    private bool TestSqlConnection(string connectionString)
    {
        try
        {
            using (var connection = new SqlConnection(connectionString))
            {
                connection.Open();
                return connection.State == ConnectionState.Open;
            }
        }
        catch
        {
            return false;
        }
    }
    
    private bool TestHttpEndpoint(string endpoint)
    {
        try
        {
            using (var client = new HttpClient())
            {
                var response = client.GetAsync(endpoint).Result;
                return response.IsSuccessStatusCode;
            }
        }
        catch
        {
            return false;
        }
    }
}
```

---

## Phase 4: Investigation Workflow (How We'll Discover Everything)

### Week 1: Add-On Inventory & Config Locations

**Task 1.1: List all add-ons**
```csharp
// List all VAF apps, their GUIDs, versions
var vafApps = vault.GetApplications();
// Export list to spreadsheet for review
```

**Task 1.2: For each add-on, identify config locations**
- Navigate M-Files admin panel
- Check properties, vault settings, config objects
- Document where configurations are stored
- Test COM API access methods

**Deliverable:** Spreadsheet with:
| Add-On | Config Name | Current Value | Storage Type | GUID (if available) | Update Method |
|--------|-------------|---------------|--------------|-------------------|----------------|
| SQL Connector | SQL_Connection | Server=... | Property | {guid} | SetPropertyValue |
| HTTP Caller | API_Endpoint | https://... | Property | {guid} | SetPropertyValue |
| ... | ... | ... | ... | ... | ... |

---

### Week 2: COM API Exploration

**Task 2.1: For each storage type, test update methods**

```csharp
// Test updating a property
var testProperty = vault.FindPropertyDefByName("SQL_Connection");
testProperty.SetValue("SERVER=TEST;");
vault.SaveChanges();  // Do we need explicit save?
// Verify change took effect

// Test updating Named Value Storage
vault.SetNamedValue("SQL_Connector", "ConnectionString", "SERVER=TEST;");
// Verify change took effect

// Test updating configuration object
var configObj = vault.FindObjectsByClass("Integration Config")[0];
configObj.SetProperty("ConnectionString", "SERVER=TEST;");
configObj.SaveChanges();
// Verify change took effect
```

**Deliverable:** Documented COM API calls for each update method

---

### Week 3: Dependency Mapping

**Task 3.1: For each config change, test side effects**

```
Change SQL connection → Does query still work? Do other add-ons break?
Change HTTP endpoint → Does webhook still post? Do related configs need updating?
Change auth token → Does API still authorize?
```

**Deliverable:** Dependency matrix showing which configs affect each other

---

### Week 4: Discovery Engine Prototype

**Task 4.1: Build discovery scanner**
```csharp
var discoveryEngine = new AddOnConfigDiscoveryEngine(vault);
var configInventory = discoveryEngine.DiscoverAllConfigurations();
configInventory.ExportToJson("mapping_template.json");
```

**Task 4.2: Test workflow metadata extraction**
- Run metadata discovery across Conformity workflows
- Verify properties, guards, actions, prompts, and permissions are captured
- Compare extracted metadata against manual workflow inspection in M-Files
- Export metadata as a structured JSON artifact for UI tabs

**Deliverable:** Working mapping template for Conformity vault

**Additional Deliverable:** Verified workflow metadata extraction report

---

### Week 5: Provisioning Engine Prototype

**Task 5.1: Build provisioning engine**
```csharp
var provisioningEngine = new AddOnConfigProvisioningEngine(vault, configInventory);
var plan = provisioningEngine.GeneratePlan(
    mappingTemplate: configInventory,
    customerVariables: new CustomerVariables 
    { 
        SqlServer = "acme-sql",
        HttpEndpoint = "https://api.acme.com"
    }
);

// Review plan, approve
plan.Approve("admin@company.com");

// Execute
provisioningEngine.ExecutePlan(plan);

// Verify - check that SQL queries work, HTTP calls work, etc.
```

**Deliverable:** Working provisioning automation for test customer

---

## Timeline & Deliverables

| Phase | Task | Timeline | Deliverable |
|-------|------|----------|-------------|
| **Investigation** | Add-on inventory & config discovery | Week 1-2 | Configuration inventory spreadsheet + COM API documentation |
| **Investigation** | Dependency mapping | Week 2-3 | Dependency matrix |
| **Discovery** | Build discovery engine | Week 3-4 | Mapping template JSON + workflow metadata JSON for Conformity |
| **Provisioning** | Build provisioning engine | Week 4-5 | Working provisioning automation |
| **Testing** | Test on test customer vault | Week 5-6 | Proof of concept deployment |

---

## Success Criteria

### Discovery Engine
- [ ] Discovers 100% of add-on configurations
- [ ] Correctly identifies customer-specific vs static configs
- [ ] Generates valid mapping template JSON
- [ ] Records GUIDs where available for stable identification
- [ ] Extracts workflow metadata completely (properties, guards, actions, prompts, permissions)

### Provisioning Engine
- [ ] Generates accurate provisioning plans (what will change)
- [ ] Validates customer inputs before applying
- [ ] Updates configurations safely (no silent failures)
- [ ] Tests each update (SQL query test, HTTP endpoint test, etc.)
- [ ] Maintains rollback capability (checkpoint system)
- [ ] Logs every operation for audit trail

### Automation Value
- [ ] Reduces 2-week manual process to 5-minute automated deployment
- [ ] Zero errors (no missed configurations)
- [ ] Repeatable across unlimited customers
- [ ] Clearly visible what's changing (Plan/Apply transparency)

---

## Key Insights

1. **Vault reuse is good** — structure is stable, GUIDs don't change
2. **Manual customization is the bottleneck** — hunting for configs under the hood
3. **Discovery solves the discovery problem** — Once we find all configs, provisioning is trivial
4. **Add-ons store configs in multiple places** — properties, NVS, config objects, settings
5. **GUID stability is our friend** — Use GUIDs for safe, deterministic lookups
6. **Automation requires testing** — Each update needs verification (SQL test, HTTP test, etc.)

---

## Next Steps

1. **Your side:** Ensure all necessary add-ons are installed in M-Files
2. **Your side:** Document the current manual 2-week process (what exactly gets changed?)
3. **My side:** Start investigation with the COM API exploration
4. **Together:** Weekly sync-ups to validate findings and adjust approach

**This is exactly the "Holy Grail" of vault automation.** By discovering all add-on configurations and automating their provisioning, you'll go from 2-week manual deployments to 5-minute automated deployments.

The key is that we're not replacing the manual process; we're automating it intelligently by understanding exactly what needs to change per customer, and then changing it safely via the COM API.

---

## Questions for You (As Investigation Progresses)

As we discover each add-on, we'll ask:

1. "Is this config stored in a property? VAF? Config object?"
2. "What value changes for each customer?"
3. "How do we verify it's working after changing it?"
4. "Are there dependencies (changing this breaks that)?"
5. "Does M-Files need to restart after the change?"

**I'm ready to start investigating whenever you are.** We'll document everything systematically and build the automation pipeline step by step.

Let's make vault reuse painless! 🚀
