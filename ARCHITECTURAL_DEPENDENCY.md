# Architectural Dependency: Discovery as the Mandatory Foundation for Safe Provisioning

**Document Date:** July 24, 2026  
**Purpose:** Explain why the ProvisioningAI sequencing (V1 Discovery → V1.5 Simulation → V2 Provisioning) is not just convenient, but architecturally essential.

---

## The Core Truth

**You cannot safely automate what you have not fully mapped.**

This single principle drives the entire architecture of ProvisioningAI:

1. **V1 Discovery Engine** maps the vault (builds the GPS)
2. **V1.5 Workflow Simulation** delights users with visual testing
3. **V2 Provisioning Engine** uses the map to automate vault rewiring safely

If you tried to build the Provisioning Engine without the Discovery tool first, you would be writing a blind, hardcoded script that corrupts vault metadata.

---

## The Danger of Hardcoded Provisioning Scripts

### Scenario: Vault Cloning Without Discovery

You decide to skip V1 and jump straight to V2 provisioning. You write a script like this:

```csharp
// Blind provisioning script (DANGEROUS)
public void CloneVaultForCustomer(string customerName, string newErpUrl)
{
    MFilesAPI.GetPropertyDefById(104).SetValue("ERP_Endpoint", newErpUrl);
    MFilesAPI.GetPropertyDefById(107).SetValue("SQL_Connection", customerSqlString);
    MFilesAPI.GetValueListById(56).ImportFromCSV(customerVendorList);
}
```

**What you think will happen:**
- Update Property ID 104 (ERP_Endpoint) ✅
- Update Property ID 107 (SQL_Connection) ✅
- Import vendor list ID 56 ✅

**What actually happens:**

**Vault A (Conformity template):**
- Property 104 = "ERP_Endpoint" → Update works ✅
- Property 107 = "SQL_Connection" → Update works ✅
- ValueList 56 = "Vendors" → Update works ✅

**Vault B (Different template structure):**
- Property 104 = "Customer_Name" → **CORRUPTED** ❌ (you overwrote the customer name with an ERP URL)
- Property 107 = "Department_Code" → **CORRUPTED** ❌ (you overwrote department with SQL connection string)
- ValueList 56 = "Product Categories" → **CORRUPTED** ❌ (you overwrote product list with vendor list)

**Result:** Silent data corruption. The vault doesn't crash; it just has wrong data in critical fields.

### Why This Happens

In M-Files, **internal IDs (PropertyDef IDs, ValueList IDs) are not stable across vaults**. When you clone a vault, M-Files reassigns IDs:
- Vault A's Property 104 might become Property 110 in Vault B
- Vault A's ValueList 56 might become ValueList 62 in Vault B
- There's no guarantee of consistency

**Hardcoded ID-based scripts don't know this and blindly update the wrong fields.**

---

## The Solution: Name-Based Lookups Powered by Discovery

### How Discovery Solves This

The Discovery Engine (V1) doesn't just document; it creates a **mapping template** that records:

1. **The property/valuelist name** (stable across vault clones)
2. **The current ID** (for reference, but not for direct updates)
3. **The COM API path to access it** (the safe way to find and update)
4. **Validation rules** (to ensure the new value is valid)

**Example Discovery Output:**

```json
{
  "integrationPoints": [
    {
      "id": "ERP_ENDPOINT",
      "name": "ERP API Endpoint",
      "currentValue": "http://old-erp.com/api",
      "vaultLocation": {
        "type": "PROPERTY_DEFINITION",
        "propertyDefName": "ERP_Endpoint",    // ← STABLE NAME
        "propertyDefId": 104,                 // ← MIGHT SHIFT
        "lookupByName": true,
        "comPath": "Vault.FindPropertyDefByName('ERP_Endpoint')"
      },
      "dataType": "URL",
      "validation": "Must be valid HTTPS URL"
    }
  ]
}
```

### How Provisioning Engine Uses the Map

**Safe provisioning script (powered by Discovery mapping):**

```csharp
// Safe provisioning script using Discovery mapping
public void CloneVaultForCustomer(string customerName, MappingTemplate template, CustomerVariables vars)
{
    foreach (var integration in template.IntegrationPoints)
    {
        if (integration.Location.Type == "PROPERTY_DEFINITION")
        {
            // SAFE: Lookup by name, not by ID
            PropertyDef propertyDef = Vault.FindPropertyDefByName(integration.Location.PropertyDefName);
            propertyDef.SetValue(vars[integration.Id]);
        }
        
        if (integration.Location.Type == "VALUE_LIST")
        {
            // SAFE: Lookup by name, not by ID
            ValueList valueList = Vault.FindValueListByName(integration.Location.ValueListName);
            valueList.Clear();
            valueList.ImportFromCSV(vars[integration.Id]);
        }
    }
}
```

**Why this works:**

- **Property name** "ERP_Endpoint" is the same in Vault A and Vault B
- **Property ID** might be 104 in Vault A and 110 in Vault B, but we don't care
- **Lookup by name** finds the right property regardless of ID
- **Update is safe** because we're updating the correct field

**Result:** Vault B gets the right data in the right fields, even though IDs are different.

---

## The Cascading Dependencies

### Discovery Engine Enables Safe Provisioning

**Discovery must happen first because:**

1. **You don't know where integrations live until you scan the vault**
   - Is the ERP endpoint in a metadata property or VAF config?
   - Which property? Is it called "ERP_Endpoint" or "ERP_URL" or "Integration_ERP"?
   - What's the current ID? (For documentation, not for scripting)

2. **You can't write safe lookup code without the mapping template**
   - Name-based lookups require knowing the correct names
   - VAF config paths require knowing the exact module/setting structure
   - COM API calls require knowing the right method to call

3. **You can't validate new values without understanding the schema**
   - Is "ERP_Endpoint" a URL field? (Must validate as HTTPS)
   - Is "SQL_Connection" a connection string? (Must contain Server=, Database=)
   - Are "AD_Groups" actually Active Directory? (Must validate format)

### Without Discovery, Provisioning Can't Work

**Without mapping, you have three bad options:**

**Option A: Hardcoded IDs (DANGEROUS)**
```csharp
PropertyDef.GetById(104).SetValue(...);  // Corrupts wrong field in other vaults
```

**Option B: Hardcoded Names (FRAGILE)**
```csharp
PropertyDef.GetByName("ERP_Endpoint").SetValue(...);  // Fails if someone renames it
```

**Option C: Manual Script Per Vault (NOT SCALABLE)**
```csharp
// You have to inspect each vault manually and write custom scripts
// Takes 2 weeks per vault — that's the problem you're trying to solve!
```

**With Discovery (SAFE & SCALABLE)**
```csharp
// Read mapping template generated by Discovery
// Use stable names + COM paths
// Works on any vault that's a clone of the template
```

---

## The Complete Flow

### V1: Build the Map

```
Template Vault
    ↓
[Discovery Engine]
- Scan all configurations
- Identify all integration points
- Record names, IDs, COM paths
- Capture validation rules
    ↓
Mapping Template JSON
{
  "integrationPoints": [
    { "name": "ERP_Endpoint", "id": 104, "comPath": "...", "validation": "..." },
    { "name": "SQL_Connection", "id": 107, "comPath": "...", "validation": "..." },
    ...
  ]
}
```

### V2: Use the Map to ProvisioningAIn Safely

```
Mapping Template + Customer Variables
    ↓
[Provisioning Engine with Plan/Apply]
- Read mapping template
- Look up integration by name (safe)
- Replace value with customer data
- Validate new value
- Generate Plan (what will change)
    ↓
Plan Review + Approval
    ↓
[Provisioning Engine executes Apply]
- Use COM paths from template
- Update only what's in the plan
- Log all changes
- Maintain rollback checkpoint
    ↓
New Customer Vault (fully configured)
```

---

## Why the Sequencing is Perfect

### V1 (Discovery & Documentation): 3-4 months
**Goal:** Build the mapping template and documentation foundation  
**Why it's first:** Without this, you can't build anything safe  
**Output:** Mapping template, integration docs, configuration index

### V1.5 (Workflow Simulation): 1-2 months
**Goal:** Visual testing and business analyst onboarding  
**Why it comes here:** Quick win that builds momentum + user buy-in  
**Bonus:** Proves the discovery index is accurate (if simulation works, discovery was thorough)

### V2 (Provisioning + Knowledge Graph): 3-4 months
**Goal:** Safe automated vault deployment  
**Why it comes last:** You now have the complete mapping template from V1  
**Foundation:** Discovery index powers both provisioning (what to update) and knowledge graph (how to present it)

---

## The Business Insight

### The "Mapping Template" is Your Real Product

Many people think the product is the "Provisioning Engine" (the automation).

**Actually, the real product is the "Mapping Template"** — the discovery-generated intelligence that tells you where every integration lives.

**Why?**

- Without discovery, provisioning is dangerous and not scalable
- With discovery, provisioning is fast, safe, and repeatable
- The mapping template is the hard part (it requires intimate knowledge of M-Files architecture)
- The provisioning engine is just a script that reads the template and applies changes

**Analogy:**
- Building a house = Provisioning Engine (straightforward once you have a plan)
- Creating architectural blueprints = Discovery Engine (complex, requires expertise)
- **The blueprint is more valuable than the builder** because different blueprints can be used for many buildings

---

## Risk Mitigation: What Happens if You Skip Discovery

**Scenario:** You try to build Provisioning without Discovery

| Stage | What You Think | What Actually Happens |
|-------|---|---|
| **Design** | "We'll hardcode a provisioning script" | You underestimate integration complexity; forget some configs |
| **First Deployment** | "The script should work on this new vault" | IDs are different; script corrupts critical fields |
| **Debugging** | "Must be a bug in the script" | Hours hunting for which property got overwritten |
| **Second Deployment** | "We'll fix the script with ID 110 instead of 104" | Works for 2 weeks until a third vault with different IDs fails |
| **Third Attempt** | "We need a different script per vault" | Back to 2-week manual deployments for each vault |
| **Reality** | Provisioning Engine automation "failed" | Actually, you skipped the mandatory Discovery step |

**Conclusion:** Doing Discovery first saves weeks of debugging and vault recovery.

---

## Proof of Concept: The Mapping Template Example

Here's a real-world example of what Discovery outputs (abbreviated):

```json
{
  "vault": "Conformity",
  "discoveredAt": "2026-07-24T20:45:00Z",
  "integrationPoints": [
    {
      "businessFunction": "ERP Integration",
      "configName": "ERP API Endpoint",
      "location": {
        "type": "VAF_CONFIG",
        "module": "Module_SAP_Integration",
        "setting": "ApiUrl",
        "comCall": "MFilesAPI.GetNamedValue('SAP_Integration', 'ApiUrl')"
      },
      "currentValue": "https://sap.template.local:8000/api",
      "replaceInProvisioning": true
    },
    {
      "businessFunction": "SQL Integration",
      "configName": "SQL Connection String",
      "location": {
        "type": "PROPERTY_DEFINITION",
        "propertyName": "SQL_Connection",
        "propertyId": 104,
        "lookupMethod": "FindPropertyDefByName('SQL_Connection')"
      },
      "currentValue": "Server=template-sql;Database=mfiles_vault;User=sa;",
      "replaceInProvisioning": true
    },
    {
      "businessFunction": "Reference Data",
      "configName": "Vendor Master List",
      "location": {
        "type": "VALUE_LIST",
        "valueListName": "Vendors",
        "valueListId": 56,
        "lookupMethod": "FindValueListByName('Vendors')"
      },
      "currentValue": "[127 entries from template_vendors.csv]",
      "replaceInProvisioning": true
    }
  ]
}
```

**Then in V2, the Provisioning Engine reads this template:**

```csharp
var mappingTemplate = JsonConvert.DeserializeObject<MappingTemplate>(mappingJson);
foreach (var integration in mappingTemplate.IntegrationPoints.Where(x => x.ReplaceInProvisioning))
{
    var newValue = customerVariables[integration.ConfigName];
    ApplyIntegrationUpdate(integration.Location, newValue);
}
```

**Result:** Safe, scalable, repeatable vault deployment.

---

## Conclusion: The Architectural Truth

**ProvisioningAI's architecture is not arbitrary. It's necessary.**

- **V1 Discovery:** Builds the intelligence (mapping template)
- **V1.5 Simulation:** Validates the intelligence (if simulation works, discovery was thorough)
- **V2 Provisioning:** Uses the intelligence (safe, automated deployment)

Skip V1, and V2 becomes a liability (corrupt vaults).  
Complete V1, and V2 becomes a superpower (5-minute deployments).

**The mapping template is the crown jewel of ProvisioningAI** — it's what makes consulting impossible to scale without it, and trivially easy with it.

