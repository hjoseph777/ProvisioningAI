# ProvisioningAI PRD: Architectural Insights & Updates

**Date:** July 24, 2026  
**Status:** PRD v1.0 Complete with Mapping Template Architecture  
**Files Updated:** 2 major documents + 1 architectural deep-dive

---

## Executive Summary: The Three Critical Insights

### 1. Discovery is Mandatory, Not Optional

**The Core Truth:** "You cannot safely automate what you have not fully mapped."

The Discovery & Documentation tool (V1) is not just convenient scaffolding—it's the **mandatory foundation** that makes the Provisioning Engine safe for production use.

**Why:** Without Discovery's mapping, you'd write blind, hardcoded provisioning scripts that corrupt vault metadata by updating the wrong fields (Property IDs shift between vault clones).

### 2. The "Mapping Template" is the Real Product

The Discovery Engine doesn't just generate documentation; it creates a **mapping template** in JSON format that records:
- WHERE every integration lives (VAF config path, property name, value list)
- HOW to access it safely (by name, not by fragile internal ID)
- WHAT validation it needs (URL format, connection string structure, etc.)

This mapping template is what the Provisioning Engine reads to safely rewire vaults.

### 3. The Sequencing is Perfect and Necessary

```
V1 (Discovery)      → Builds the GPS map of the vault
V1.5 (Simulation)   → Validates the map (if visual simulation works, discovery was thorough)
V2 (Provisioning)   → Uses the map to automate deployment safely
```

You cannot skip V1; V2 depends on it architecturally.

---

## ProvisioningAI PRD v1.0 Updates

### File: `ProvisioningAI_PRD_v1.0.md`
**Size:** 806 lines (was 617) | **Status:** Updated and complete

#### Major Changes

1. **Executive Summary** (Lines 14-33)
   - Emphasized architectural dependency
   - Added "You cannot safely automate what you have not fully mapped"
   - Clarified that Discovery is mandatory, not optional
   - Added note: "Integration points (ERP endpoints, SQL connections, API tokens, VAF configurations)"

2. **Problem Statement** (Lines 62-85)
   - **NEW DETAIL:** Expanded section on integration fragility
   - Highlighted the 2-week nightmare of vault cloning
   - Explained why hardcoded provisioning scripts are dangerous (silent data corruption risk)
   - Added "mapping template" to Desired State

3. **Discovery Engine Requirements** (Lines 435-450)
   - **NEW:** DISC-005 requirement
   - **Focus:** Integration Mapping Template generation
   - **Purpose:** "Foundation for safe Provisioning Engine operation (V2)"
   - **Output:** JSON template with location, access method, data type, validation rules

4. **NEW SECTION: 6.5 The "Mapping Template"** (Lines 334-475)
   - **COMPREHENSIVE DEEP-DIVE** on how Discovery enables Provisioning
   - Core Principle: "You cannot safely automate what you have not fully mapped"
   - Problem Analysis: Integration fragility in vault cloning
   - Solution: Discovery-generated mapping template with JSON example
   - Provisioning Logic: How the engine uses the map for safe updates
   - Safety Comparison: Hardcoded (dangerous) vs. Mapping-based (safe)
   - Complete Picture: V1 (builds map) + V2 (uses map)

5. **Strategic Value Section** (Previously 6.4, now contextualized with mapping)
   - Strengthened by new mapping template understanding
   - Plan/Apply pattern now anchored to mapping safety

### File: `ARCHITECTURAL_DEPENDENCY.md` (NEW)
**Size:** 500 lines | **Purpose:** Deep-dive on architectural necessity

#### Key Sections

1. **The Core Truth**
   - "You cannot safely automate what you have not fully mapped"
   - Explains why Discovery is mandatory

2. **The Danger of Hardcoded Scripts**
   - Real-world example of how blind ID-based updates corrupt vaults
   - Vault A: IDs work correctly
   - Vault B: Same IDs overwrite wrong fields (Customer_Name, Department_Code, etc.)

3. **The Solution: Name-Based Lookups**
   - Discovery enables property lookups by stable name, not ID
   - Provisioning uses the mapping template for safe updates
   - JSON example of discovery output

4. **Cascading Dependencies**
   - Why Discovery must happen first
   - Three bad options without Discovery
   - One good option with Discovery

5. **The Complete Flow**
   - V1: Build the Map (Discovery generates mapping template)
   - V2: Use the Map (Provisioning reads template and deploys safely)

6. **Risk Mitigation**
   - Table: What happens if you skip Discovery
   - Shows how you'd end up back at 2-week manual deployments

7. **Proof of Concept**
   - Real-world mapping template JSON example
   - Shows exactly what Discovery outputs
   - How Provisioning engine reads and uses it

---

## Key Additions to PRD

### Mapping Template Concept (Now Explicit)

**Discovery Output Format:**
```json
{
  "integrationPoints": [
    {
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
    }
  ]
}
```

**Provisioning Input Format:**
```json
{
  "customerName": "ACME Corp",
  "erpEndpoint": "https://erp.acmecorp.local:8080/api",
  "sqlConnection": "Server=acme-sql-01;Database=mfiles_vault;...",
  "vendorList": "acme_vendors.csv"
}
```

**Process:** Provisioning Engine reads mapping, finds integration by name (not ID), updates safely.

### New Discovery Requirement

**DISC-005: Integration Mapping Template (Critical for V2)**
- Generate comprehensive JSON mapping template
- Document every integration point: VAF configs, metadata properties, SQL connections, API tokens
- Map includes: location, access method, data type, validation rules
- This template is the foundation for safe Provisioning Engine operation

---

## Why This Matters Strategically

### Before This Clarification
- Provisioning Engine seemed like the main goal (write automation)
- Discovery seemed like necessary scaffolding
- Unclear why order mattered

### After This Clarification
- **Discovery is the crown jewel** (creates the mapping template)
- **Provisioning is the application** (uses the mapping to automate safely)
- **Order is architecturally mandatory** (V2 cannot work without V1's output)

### Business Impact
- **You're building a safety system first** (Discovery/Mapping), then automation (Provisioning)
- **This is why it's consulting gold** — no one else is that thorough
- **The mapping template is why it's scalable** — same template works for many vaults

---

## Validation: The Three-Question Test

### Q1: Why must Discovery come before Provisioning?
**A:** Because Provisioning needs the mapping template (which Discovery generates) to work safely. Without the map, you'd write hardcoded scripts that corrupt vault metadata.

### Q2: What is the "Mapping Template"?
**A:** A JSON file generated by Discovery that documents every integration point in the vault:
- WHERE it lives (VAF path, property name, ID)
- HOW to access it (COM API call, lookup method)
- WHAT it validates (URL, connection string, etc.)

### Q3: Why is name-based lookup safer than ID-based lookup?
**A:** Because property names stay the same across vault clones, but IDs shift. Name-based lookups find the right field regardless of ID; ID-based lookups update whatever happened to have that ID (wrong field).

---

## Files Delivered

| File | Lines | Purpose |
|------|-------|---------|
| **ProvisioningAI_PRD_v1.0.md** | 806 | Complete production PRD with Mapping Template section |
| **ARCHITECTURAL_DEPENDENCY.md** | 500 | Deep-dive on why Discovery is mandatory for Provisioning |
| **PROVISIONING_ENGINE_SUMMARY.md** | 200 | Quick reference on Vault Provisioning feature (from earlier) |

---

## Next Steps for Development

### V1 Development: Integration Mapping Focus

**Primary Deliverable:** Mapping Template JSON for Conformity vault

**Key Tasks:**
1. Scan Conformity vault for all integration points
2. Document each point: name, current value, location, access method
3. Generate mapping template JSON
4. Validate by comparing manual audit against discovered integrations

**Success Criteria:**
- 100% discovery of integration points
- Mapping template JSON is complete and usable
- Human audit confirms accuracy

### V2 Development: Safe Provisioning Engine

**Primary Input:** Mapping template from V1

**Key Tasks:**
1. Build Provisioning Engine to read mapping template
2. Accept customer variables (JSON with new integration values)
3. Implement Plan/Apply pattern
4. Validate and execute safe updates

**Success Criteria:**
- Plan generation is accurate and complete
- Updates are name-based, not ID-based
- Plan/Apply pattern works end-to-end
- Zero data corruption on test vaults

---

## The Complete Vision

You're building three things in sequence:

1. **V1: The Intelligence Layer** (Discovery + Mapping Template)
   - Know exactly where every integration lives
   - Safe, documented, validated

2. **V1.5: The Validation Layer** (Workflow Simulation)
   - Prove the intelligence is accurate
   - Delight users with visual testing

3. **V2: The Automation Layer** (Provisioning Engine powered by Mapping)
   - Use the intelligence to automate safely
   - 5-minute deployments where competitors need 2 weeks

**Result:** The definitive vault automation platform. You're the "top dog."

---

## One-Page Summary for Stakeholders

**ProvisioningAI: From Documentation Tool to Vault Provisioning Platform**

**V1 (3-4 months):** Discovery Engine maps vault integrations → generates mapping template  
**V1.5 (1-2 months):** Workflow Simulation enables visual testing and business analyst onboarding  
**V2 (3-4 months):** Provisioning Engine uses mapping template → automates vault deployment in 5 minutes  

**Value:** 2-week manual vault cloning → 5-minute automated deployment (same cost, 100x faster)

**Why It Works:** Discovery generates the mapping template; Provisioning safely reads the template to update integrations by name (not ID), preventing data corruption.

**Competitive Advantage:** Competitors still do this manually; you're automated and scaled.

