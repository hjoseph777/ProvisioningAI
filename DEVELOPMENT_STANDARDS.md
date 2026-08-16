# ProvisioningAI Development Standards & AI-Assisted Development Guidelines

**Version:** 1.0  
**Status:** Active  
**Last Updated:** July 24, 2026  
**Purpose:** Standard practices for building ProvisioningAI V1 with AI assistance, tracking, and documentation

---

## Principle: AI-Assisted, Human-Reviewed Development

**Core Rule:** Every code file, design decision, and architecture choice created with AI assistance should:
1. ✅ **Reference Claude at the beginning** (attribution)
2. ✅ **Be reviewed + modified by human** (human judgment)
3. ✅ **Be tested thoroughly** (validation)
4. ✅ **Be tracked in progress.md** (transparency)
5. ✅ **Contribute to skills.md** (learning)

---

## Part 1: Every Coding Task Must Follow This Workflow

### **Step 1: Human Initiates**

```
Developer opens V1_TASK_PROMPT_TEMPLATE.md
├─ Fills in task specifics
├─ Identifies what needs to be built
└─ Clarifies success criteria
```

### **Step 2: AI (Claude) Generates Code**

**At the START of every code file, Claude MUST include:**

```csharp
// ============================================================================
// Generated with Claude (Anthropic) - https://claude.ai
// Model: Claude 3.5 Sonnet
// Date: [DATE]
// Task: [TASK_NAME]
// Purpose: [BRIEF_DESCRIPTION]
// 
// IMPORTANT: This code was AI-generated and MUST be reviewed + modified
// by a human developer before production use. Do not use as-is.
// ============================================================================
```

### **Step 3: Human Reviews + Modifies**

**Developer MUST:**
- [ ] Read entire generated code
- [ ] Modify sections that don't match your style/requirements
- [ ] Add comments explaining any changes
- [ ] Ensure it integrates with existing code
- [ ] Test thoroughly

**When modifying, ADD comment:**
```csharp
// [HUMAN_REVIEW]: Simplified error handling per team standards (modified by [Name])
// [HUMAN_REVIEW]: Changed logging to use Serilog pattern (added by [Name])
// [HUMAN_REVIEW]: Added null checks for production safety (added by [Name])
```

### **Step 4: Test Thoroughly**

- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] No compilation errors/warnings
- [ ] Performance acceptable
- [ ] Security review done (if applicable)

### **Step 5: Code Review**

- [ ] Peer reviews code
- [ ] Approves or requests changes
- [ ] Verifies human modifications are sound

### **Step 6: Merge + Track**

- [ ] Merge to feature branch
- [ ] Update progress.md (mark task complete + time spent)
- [ ] Update skills.md (what was learned)
- [ ] Tag commit with task ID

---

## Part 2: File Header Standards

### **C# Classes**

```csharp
// ============================================================================
// [CLASS_NAME]
// Generated with Claude (Anthropic) - https://claude.ai
// Date: [DATE] | Task: [TASK_ID] | Developer: [NAME]
// 
// Purpose: [WHAT_THIS_CLASS_DOES]
// Dependencies: [REQUIRED_DEPENDENCIES]
// Integration: [WHAT_OTHER_MODULES_USE_THIS]
// 
// MODIFICATIONS:
// [DATE] [DEVELOPER]: [WHAT_CHANGED_AND_WHY]
// ============================================================================

namespace ProvisioningAI.[Module]
{
    /// <summary>
    /// [Class description for documentation]
    /// </summary>
    public class [ClassName]
    {
        // Implementation...
    }
}
```

### **React Components**

```typescript
/**
 * ============================================================================
 * [ComponentName]
 * Generated with Claude (Anthropic) - https://claude.ai
 * Date: [DATE] | Task: [TASK_ID] | Developer: [NAME]
 * 
 * Purpose: [WHAT_THIS_COMPONENT_DOES]
 * Dependencies: [REQUIRED_DEPENDENCIES]
 * Integration: [WHERE_THIS_IS_USED]
 * 
 * MODIFICATIONS:
 * [DATE] [DEVELOPER]: [WHAT_CHANGED_AND_WHY]
 * ============================================================================
 */

import React, { useState } from 'react';

/**
 * [Component description]
 */
export function [ComponentName]({ prop1, prop2 }: [Props]) {
  // Implementation...
}
```

### **Unit Tests**

```csharp
// ============================================================================
// [ClassName]Tests
// Generated with Claude (Anthropic) - https://claude.ai
// Date: [DATE] | Task: [TASK_ID] | Developer: [NAME]
// 
// Purpose: Unit tests for [ClassName]
// Coverage: [TARGET_COVERAGE]%
// ============================================================================

namespace ProvisioningAI.[Module].Tests
{
    public class [ClassName]Tests
    {
        // Test implementations...
    }
}
```

---

## Part 3: Commit Message Standards

**Every commit that involves AI-generated code:**

```
feat: [Brief description of feature]

AI-Assisted Development:
- Generated with Claude (Anthropic)
- Task: [TASK_ID]
- Time to develop: [HOURS]h
- Human review time: [MINUTES]m

Changes Made:
- [Change 1]
- [Change 2]
- [Change 3]

Testing:
- Unit tests: ✓ Pass
- Integration tests: ✓ Pass
- Manual testing: ✓ Pass

Reviewed by: [REVIEWER_NAME]
Approved: [DATE]
```

**Example:**

```
feat: implement MFilesComConnector with connection pooling

AI-Assisted Development:
- Generated with Claude (Anthropic)
- Task: Phase-1-Milestone-1.1-Task-1.1.2
- Time to develop: 2h
- Human review time: 30m

Changes Made:
- Implemented 9-arg Connect() method from Connector I pattern
- Added connection pooling (max 10 concurrent connections)
- Implemented Close-ComObjectSafe() cleanup
- Added comprehensive error handling
- Added Serilog integration for logging

Testing:
- Unit tests: ✓ Pass (95% coverage)
- Integration tests: ✓ Pass (can connect to Conformity vault)
- Manual testing: ✓ Pass (connection pooling verified)

Reviewed by: John Smith
Approved: 2026-07-25
```

---

## Part 4: Progress.md Format & Updates

**After EVERY completed task, update progress.md:**

```markdown
# ProvisioningAI V1 Development Progress

**Last Updated:** [DATE] [TIME]  
**Overall Completion:** X%  
**Estimated Completion:** [DATE]  

---

## Phase 1: Foundation (Weeks 1-2) — [X/7 tasks complete]

### ✅ Milestone 1.1: M-Files Connectors (Completed [DATE])

**Task 1.1.1:** Create ProvisioningAI.MFilesConnectors Project
- Status: ✅ DONE
- Developer: [NAME]
- Time spent: 4 hours
- Started: [DATE]
- Completed: [DATE]
- PR: [LINK]
- Commit: [HASH]
- Notes: Successfully created project structure; ready for connector implementation

**Task 1.1.2:** Implement MFilesComConnector.cs
- Status: ✅ DONE
- Developer: [NAME]
- Time spent: 8 hours (2h AI-gen + 6h human review/test)
- Started: [DATE]
- Completed: [DATE]
- PR: [LINK]
- Commit: [HASH]
- AI Tool: Claude (Anthropic) - claude-3.5-sonnet
- Tests: 95% coverage, all pass
- Notes: Reused Connector I patterns; connection pooling working correctly

**Task 1.1.3:** Implement MFilesRestConnector.cs
- Status: 🟡 IN_PROGRESS
- Developer: [NAME]
- Time spent: 2 hours (so far)
- Started: [DATE]
- Expected completion: [DATE]
- Estimated remaining time: 6 hours
- Notes: REST connector implementation started; basic scaffolding done

### ⏳ Milestone 1.2: SQLite Database Schema (Week 2) — [X/6 tasks complete]

**Task 1.2.1:** Define Core Entities & DbContext
- Status: 🟡 IN_PROGRESS
- Developer: [NAME]
- Time spent: 3 hours (so far)
- Started: [DATE]
- Expected completion: [DATE]
- Notes: Entity definitions done; DbContext configuration in progress

**Task 1.2.2:** Create EF Core Migrations
- Status: ⏳ TODO
- Assigned to: [NAME]
- Estimated time: 3 hours
- Blocked by: Task 1.2.1 completion

---

## Phase 2: Discovery Engine (Weeks 2-4) — [0/15 tasks complete]

### ⏳ Milestone 2.1: Vault Scanner (Week 3-4)
- Status: ⏳ TODO
- Tasks: 5
- Estimated time: 20 hours
- Assigned to: [DEVELOPER_NAME]

### ⏳ Milestone 2.2: Workflow Scanner (Week 3-4)
- Status: ⏳ TODO
- Tasks: 4
- Estimated time: 16 hours
- Assigned to: [DEVELOPER_NAME]

### ⏳ Milestone 2.3: Integration Points Scanner (Week 4)
- Status: ⏳ TODO
- Tasks: 3
- Estimated time: 12 hours
- Assigned to: [DEVELOPER_NAME]

### ⏳ Milestone 2.4: Mapping Template Generator (Week 4)
- Status: ⏳ TODO
- Tasks: 3
- Estimated time: 12 hours
- Assigned to: [DEVELOPER_NAME]

---

## Phase 3-8: [Similar structure for all phases]

---

## Summary Statistics

| Metric | Value |
|--------|-------|
| **Total Tasks** | 40+ |
| **Tasks Complete** | 3 |
| **Tasks In Progress** | 2 |
| **Tasks Blocked** | 1 |
| **Tasks Not Started** | 34+ |
| **Total Hours Planned** | ~320 hours |
| **Total Hours Spent** | 18 hours |
| **Estimated Remaining** | 302 hours |
| **Overall Progress** | 5.6% |

---

## AI Assistance Summary

| Tool | Tasks Used | Total Time | Avg Time/Task |
|------|-----------|-----------|---------------|
| Claude (Anthropic) | 3 | 6 hours | 2 hours |
| [Other tools] | - | - | - |

**Total AI-Assisted:** 3 tasks (2 hours per task, 6 hours saved overall)

---

## Blockers & Notes

### Current Blockers
- None

### Risk Items
- M-Files COM API learning curve (mitigated by Connector I reference)
- Entity Framework configuration complexity (mitigated by templates)

### Lessons Learned
- Use Connector I code patterns - significantly speeds up COM implementation
- AI-generated code needs 30-50% human review time
- Comprehensive testing essential for foundation modules

---

## Next Week

- Complete Phase 1.2 (Database setup)
- Start Phase 2.1 (Vault scanner)
- Integrate discovery module with database
- First integration checkpoint

---
```

---

## Part 5: Skills.md Format & Updates

**After EVERY completed task, update skills.md with what was learned:**

```markdown
# ProvisioningAI Development Skills & Learnings

**Project:** ProvisioningAI V1 (Discovery + Documentation + Workflow Engine)  
**Duration:** [START_DATE] - [END_DATE]  
**Team Size:** [NUMBER] developers  

---

## Skills Developed (By Task)

### Phase 1: Foundation

#### Task 1.1.1: ProvisioningAI.MFilesConnectors Project Setup
**Developer:** [NAME]  
**Date Completed:** [DATE]  
**Duration:** 4 hours  

**Skills Developed:**
- ✓ C# project structure + best practices
- ✓ .NET dependency injection patterns
- ✓ NuGet package management
- ✓ Interface-based design (IConnector abstraction)
- ✓ Repository pattern implementation

**Key Learnings:**
```
1. M-Files COM SDK requires specific COM registration
   → Always verify COM objects are registered on dev machine
   
2. Interface-based design enables testing + mocking
   → Defined IConnector interface first, then implementations
   
3. Using Serilog for structured logging from the start
   → Saves massive refactoring later
   → Use semantic logging (Log.Information("Connected to {VaultName}", vaultName))
```

**Resources Used:**
- Connector I code reference (ClientVaultAccessMSIBuilder)
- Microsoft docs on Dependency Injection in .NET

**Reusable Patterns:**
```csharp
// Pattern 1: Connector Factory Pattern
public interface IConnector { /* ... */ }
public class MFilesComConnector : IConnector { /* ... */ }
public class ConnectorFactory 
{ 
    public static IConnector CreateConnector(ConnectorType type) { /* ... */ }
}

// Pattern 2: Dependency Injection Setup
services.AddScoped<IConnector, MFilesComConnector>();
services.AddSingleton<ConnectorFactory>();
```

**What to Do Differently Next Time:**
- Document M-Files COM API quirks as you discover them
- Create a "COM API Cheat Sheet" for team reference
- Setup automated testing of COM connectivity earlier

---

#### Task 1.1.2: MFilesComConnector Implementation
**Developer:** [NAME]  
**Date Completed:** [DATE]  
**Duration:** 8 hours (2h AI-gen + 6h human review/test)  
**AI Tool:** Claude (Anthropic) - claude-3.5-sonnet  

**Skills Developed:**
- ✓ M-Files COM API (9-argument Connect method)
- ✓ Connection pooling implementation
- ✓ COM object lifecycle management (Close-ComObjectSafe)
- ✓ Windows authentication + SSO patterns
- ✓ Async/await patterns with COM objects
- ✓ Unit testing with mocks + Moq library
- ✓ Serilog structured logging in production code
- ✓ Error handling for vault connectivity issues

**Key Learnings:**

```
1. M-Files COM API Connection (9 arguments)
   MFilesServerApplication.Connect(
       authType: MFAuthType.MFAuthTypeCredentialsProvider,
       userId: "domain\\user",
       password: null,  // Use Windows auth, not hardcoded
       clientId: "...",
       ipAddress: "localhost",
       portNumber: 2266,
       vaultGuid: null,  // For default vault
       server: "...",
       checkOutAtConnectTime: true
   );
   
   KEY: Always null out password for Windows auth!
   KEY: Connection pooling is critical for performance!

2. COM Object Cleanup (Close-ComObjectSafe pattern)
   try {
       // Use COM objects
   } finally {
       // MUST close or memory leaks occur!
       if (vault != null) Marshal.ReleaseComObject(vault);
   }
   
   KEY: Every COM object must be explicitly released!
   KEY: Even if exceptions occur (use finally block)!

3. Unit Testing COM Objects
   - Mock IConnector interface, don't test actual COM
   - Use Moq library: var mockConnector = new Mock<IConnector>();
   - Test error scenarios separately (vault offline, bad auth, etc.)
   
   KEY: Never depend on live M-Files in unit tests!
   KEY: Mock all external dependencies!

4. Connection Pooling for Performance
   - Reuse connections rather than creating new ones
   - Max pool size: 10-20 concurrent connections
   - Timeout: 5 minutes for idle connections
   - Prevents "too many connections" errors
   
   KEY: Improves performance by 10-100x!
   KEY: Reduces M-Files server load!
```

**AI-Generated Code Quality Assessment:**
```
✓ 95% of code was production-ready
✓ Logic correct and well-structured
✓ Error handling appropriate
✓ Naming conventions consistent
⚠ 5% needed modifications:
  - Simplified error messages (was too verbose)
  - Added specific timeout values (was using defaults)
  - Enhanced logging detail (was too minimal)
  - Fixed one null reference bug in cleanup code
```

**Human Review Modifications:**
```
1. Line 47: Simplified exception message
   Before: "An exception of type {exceptionType} occurred in method..."
   After: "Failed to connect to vault: {exceptionMessage}"
   
2. Line 92: Added timeout configuration
   Before: Using default timeout (30 seconds)
   After: Configurable timeout (from appsettings.json)
   
3. Line 156: Enhanced logging
   Before: Log.Information("Connected")
   After: Log.Information("Connected to vault {VaultName} on {Server}:{Port}", 
                         vaultName, server, port)
   
4. Line 203: Fixed null reference bug
   Before: if (vault != null) vault.Close();  // Could throw if already closed
   After: try { vault?.LogOutSilent(); } catch { } finally { ... }
```

**Reusable Patterns:**
```csharp
// Pattern 1: Connection Pooling with Timeout
public class ConnectionPool {
    private Queue<MFilesServerApplication> _pool;
    private readonly int _maxSize = 10;
    private readonly TimeSpan _timeout = TimeSpan.FromMinutes(5);
    
    public MFilesServerApplication GetConnection() { /* ... */ }
    public void ReturnConnection(MFilesServerApplication conn) { /* ... */ }
}

// Pattern 2: Safe COM Object Cleanup
public static void CloseComObjectSafe(object comObject) {
    try {
        if (comObject != null) {
            if (comObject is MFilesServerApplication vault) {
                vault.LogOutSilent();
            }
            Marshal.ReleaseComObject(comObject);
        }
    } catch (Exception ex) {
        Log.Warning("Failed to safely close COM object: {Error}", ex.Message);
    }
}

// Pattern 3: Structured Error Handling
try {
    return await ConnectToVaultAsync(...);
} catch (MFException ex) when (ex.ErrorCode == -2147212861) {
    // Bad authentication
    throw new InvalidOperationException("Invalid vault credentials", ex);
} catch (MFException ex) when (ex.ErrorCode == -2147213053) {
    // Vault not found
    throw new InvalidOperationException("Vault not found", ex);
} catch (Exception ex) {
    // Unknown error
    Log.Error(ex, "Unexpected error connecting to vault");
    throw;
}
```

**Team Takeaways:**
- Always use Connector I as reference (proven, battle-tested)
- COM object management is critical (memory + performance)
- Unit tests save weeks of debugging later
- Structured logging from day one (invaluable for production support)

**What to Do Differently Next Time:**
- Create a reusable ConnectorBase class to eliminate duplication
- Document M-Files error codes + meanings (make error messages clearer)
- Pre-generate mocks for testing (speed up test development)
- Create performance benchmarks for connection pool sizing

**Recommended Reading:**
- M-Files COM API documentation (bookmark this!)
- "COM Interop Handbook" for .NET developers
- Unit testing best practices with Moq

---

#### Task 1.1.3: MFilesRestConnector Implementation
**Developer:** [NAME]  
**Date Started:** [DATE]  
**Status:** IN_PROGRESS  

**Skills Being Developed:**
- HTTP client patterns in .NET
- REST API authentication (Bearer tokens)
- Error handling for HTTP timeouts
- Response deserialization (JSON)

**Current Blockers:**
- Waiting on M-Files REST API documentation
- Need to determine authentication mechanism

**Knowledge Gaps to Address:**
- Bearer token refresh logic
- Rate limiting + retry strategies
- SSL certificate validation

---

### Phase 1.2: Database Setup

#### Task 1.2.1: Entity Framework Core Configuration
**Developer:** [NAME]  
**Date Completed:** [DATE]  
**Duration:** 6 hours  

**Skills Developed:**
- ✓ Entity Framework Core 8 fundamentals
- ✓ Database schema design for vault structure
- ✓ Relationship modeling (one-to-many, many-to-many)
- ✓ LINQ query best practices
- ✓ Migration management + version control
- ✓ SQLite configuration + optimization

**Key Learnings:**
```
1. EF Core Data Annotations vs Fluent API
   ✓ Fluent API is better for complex relationships
   ✓ Data annotations good for simple validations
   
2. Index Strategy
   ✓ Always index foreign keys
   ✓ Index frequently searched columns (Name, GUID)
   ✓ Avoid indexing low-cardinality columns
   
3. SQLite Specific
   ✓ Slower for writes, but good for development
   ✓ No concurrent access (file-based locking)
   ✓ Missing some SQL Server features (check before using)
```

**Reusable Patterns:**
```csharp
// Pattern 1: DbContext Configuration
public class ProvisioningAiDbContext : DbContext {
    public DbSet<ObjectType> ObjectTypes { get; set; }
    public DbSet<Property> Properties { get; set; }
    public DbSet<Workflow> Workflows { get; set; }
    
    protected override void OnModelCreating(ModelBuilder modelBuilder) {
        // One-to-Many: ObjectType → Properties
        modelBuilder.Entity<ObjectType>()
            .HasMany(ot => ot.Properties)
            .WithOne(p => p.ObjectType)
            .HasForeignKey(p => p.ObjectTypeId)
            .OnDelete(DeleteBehavior.Cascade);
        
        // Indexes for performance
        modelBuilder.Entity<Property>()
            .HasIndex(p => p.Name)
            .IsUnique(false);
        
        modelBuilder.Entity<Property>()
            .HasIndex(p => p.Guid)
            .IsUnique(true);
    }
}
```

**What to Do Differently Next Time:**
- Create a database design document BEFORE implementing (saves revisions)
- Setup performance testing early (detect N+1 queries before they multiply)
- Document relationship semantics (why this cascade behavior?)

---

## Team Skills Summary

### By Developer

**Developer 1 ([NAME]):**
- Skills: C# project setup, COM API patterns, connection management
- Level: Intermediate → Advanced (in M-Files integration)
- Recommended Next: Async/await patterns in COM

**Developer 2 ([NAME]):**
- Skills: Entity Framework, database design, LINQ
- Level: Intermediate
- Recommended Next: Query optimization + performance tuning

### By Topic

**M-Files Integration:** 2 developers trained
**Database/EF Core:** 1 developer trained
**Unit Testing:** 2 developers trained (Moq, mocking patterns)
**Serilog Logging:** 2 developers trained (structured logging)
**C# Best Practices:** 2 developers trained

### Knowledge Gaps to Address

**High Priority:**
- REST API authentication (needed for next phase)
- Async/await with COM objects (subtle pitfalls)
- Performance testing + benchmarking

**Medium Priority:**
- SQL Server migration (SQLite → SQL Server)
- Complex LINQ queries (N+1 problems)
- Encryption for sensitive data

---

## Code Patterns Library

### Proven Patterns (Reuse These!)

**Pattern: Connector Factory**
```csharp
// Location: ProvisioningAI.MFilesConnectors/ConnectorFactory.cs
// Usage: var connector = ConnectorFactory.Create(ConnectorType.Com);
```

**Pattern: Safe COM Cleanup**
```csharp
// Location: ProvisioningAI.MFilesConnectors/ComObjectExtensions.cs
// Usage: vault.CloseComObjectSafe();
```

**Pattern: Connection Pooling**
```csharp
// Location: ProvisioningAI.MFilesConnectors/ConnectionPool.cs
// Usage: var conn = pool.GetConnection();
```

**Pattern: EF Core Configuration**
```csharp
// Location: ProvisioningAI.Data/ProvisioningAiDbContext.cs
// Usage: var db = new ProvisioningAiDbContext();
```

---

## Resources & References

### Documentation
- [M-Files COM API Reference](link)
- [Entity Framework Core Docs](link)
- [Serilog Documentation](link)

### Code Examples
- Connector I (ClientVaultAccessMSIBuilder) - COM patterns
- Microsoft EF Core tutorial - Database configuration
- Moq documentation - Unit testing patterns

### Team Slack Channels
- #provisioningai-dev
- #m-files-integration
- #database-design

---

## Recommended Learning Path for New Team Members

**Week 1:**
- Read ProvisioningAI_PRD_v1.0.md (product context)
- Read TECH_STACK.md (architecture)
- Study Task 1.1.1 implementation (project setup)

**Week 2:**
- Study Task 1.1.2 (COM API patterns)
- Study Task 1.2.1 (EF Core patterns)
- Run MFilesComConnector tests

**Week 3:**
- Code review previous tasks
- Start first task assignment
- Ask questions in #provisioningai-dev

---
```

---

## Part 6: When to Update These Files

**Update progress.md AFTER each completed task:**
```
✓ Task finished
✓ Code reviewed
✓ Merged to develop
✓ Updated progress.md (10 minutes)
✓ Updated skills.md (15 minutes)
✓ Ready for next task
```

**Update skills.md AFTER each completed task:**
```
✓ Document what was learned
✓ Add reusable patterns to library
✓ Note blockers or issues for next developer
✓ Add to team knowledge base
```

---

## Part 7: Git Workflow Integration

**For every completed task:**

```bash
# 1. Create feature branch (already done)
git checkout -b feature/phase-1-milestone-1-task-1

# 2. Commit with full message (includes AI attribution)
git commit -m "feat: task description
    
AI-Assisted Development:
- Generated with Claude (Anthropic)
- Task: [TASK_ID]
- Time to develop: [X]h
- Human review: [Y]m

Testing: ✓ Pass
Reviewed by: [REVIEWER]"

# 3. Push to origin
git push origin feature/phase-1-milestone-1-task-1

# 4. After merge to develop
# 5. UPDATE progress.md
# 6. UPDATE skills.md
# 7. COMMIT updates

git add progress.md skills.md
git commit -m "docs: update progress and skills after task completion"
git push origin develop
```

---

## Part 8: Team Standards Checklist

**Before starting development on any task:**

- [ ] Read V1_DEVELOPMENT_ROADMAP.md for task details
- [ ] Create task prompt using V1_TASK_PROMPT_TEMPLATE.md
- [ ] Share with team (Slack #provisioningai-dev)
- [ ] Get approval to start

**During development with AI assistance:**

- [ ] AI includes header attribution in every file
- [ ] Human reviews every AI-generated line
- [ ] Add modification comments where you changed code
- [ ] Write comprehensive unit tests (80%+ coverage)
- [ ] Test thoroughly before code review

**After completing task:**

- [ ] All tests pass
- [ ] Code review approved
- [ ] Merge to develop
- [ ] Update progress.md (when done? how long? any issues?)
- [ ] Update skills.md (what was learned? what patterns to reuse?)
- [ ] Update team in #provisioningai-dev with completion notification

**Example Team Notification:**

```
✅ TASK COMPLETE: Phase 1, Milestone 1.1, Task 1.1.2

Task: MFilesComConnector Implementation
Developer: John Smith
Time: 8 hours (2h AI-gen + 6h human review/test)
Status: MERGED to develop

Key Achievements:
- Connection pooling implemented (10 max concurrent)
- 95% test coverage
- All M-Files COM API errors handled
- Serilog integration complete

Files Changed:
- MFilesComConnector.cs (240 lines)
- MFilesComConnectorTests.cs (180 lines)

Ready for: Phase 1.2 (Database setup)

Questions? Ask in thread or #provisioningai-dev
```

---

## Summary: Development Standards

```
Every Task:
├─ AI generates code (with attribution header)
├─ Human reviews + modifies (adds [HUMAN_REVIEW] comments)
├─ Tests thoroughly (80%+ coverage)
├─ Code review + approval
├─ Merge to develop
├─ Update progress.md
├─ Update skills.md
└─ Notify team

Tracking:
├─ progress.md = What's done + time spent
├─ skills.md = What was learned + patterns for reuse
├─ Git commits = Full story with AI attribution
└─ Team Slack = Communication + transparency

Quality:
├─ AI-generated code is starting point (not final)
├─ Human judgment essential (architecture + final decisions)
├─ Tests validate everything (before production)
├─ Documentation captures learning (for next developer)
└─ Patterns reused (faster future development)
```

---

**These standards ensure ProvisioningAI V1 development is:**
✅ Well-tracked  
✅ Well-documented  
✅ Transparent about AI assistance  
✅ Human-reviewed + validated  
✅ Fast + scalable  
✅ Maintainable long-term  

**Ready to start V1 development with these standards in place!** 🚀
