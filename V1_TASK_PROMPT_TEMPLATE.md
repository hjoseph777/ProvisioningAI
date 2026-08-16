# V1 Development Task Prompt Template (Use This Iteratively)

**Purpose:** Copy this template, fill in the specifics, and use as your development prompt for each milestone/task

---

## Template (Copy for Each Task)

```
# Task: [TASK_NAME]

**Phase:** [PHASE_NUMBER]
**Milestone:** [MILESTONE_NUMBER]
**Status:** [TODO / IN_PROGRESS / REVIEW / DONE]
**Owner:** [DEVELOPER_NAME]
**Timeline:** [START_DATE] → [END_DATE]
**Effort:** [HOURS_ESTIMATED]

---

## Task Description

[Copy the task description from V1_DEVELOPMENT_ROADMAP.md]

---

## Objectives

[ ] Objective 1
[ ] Objective 2
[ ] Objective 3
[ ] All tests pass
[ ] Code review approved

---

## Technical Details

### Files to Create/Modify
```
Backend:
├─ [ProjectName]/
│   ├─ [ClassName].cs (new)
│   ├─ [ClassName]Tests.cs (new)
│   └─ ...

Frontend:
├─ src/components/[ComponentName]/
│   ├─ [ComponentName].tsx (new)
│   ├─ [ComponentName].test.tsx (new)
│   └─ ...
```

### Dependencies
- [ ] [Required module or service]
- [ ] [Upstream task that must be done first]
- [ ] [External library or API]

### API Contracts (If exposing REST API)
```csharp
// Endpoint
POST /api/v1/[endpoint]
GET /api/v1/[endpoint]/{id}

// Request
{
  "property1": "value1",
  "property2": "value2"
}

// Response (Success)
{
  "id": "...",
  "status": "success",
  "data": { ... }
}

// Response (Error)
{
  "status": "error",
  "message": "Human-readable error message"
}
```

### Database Changes (If applicable)
```sql
-- New tables/columns
CREATE TABLE [TableName] (
  [ColumnName] [Type],
  ...
);

-- Migration needed? YES / NO
```

### Component/Hook Contracts (If frontend)
```typescript
// Usage example
const { data, loading, error } = useYourHook(param1, param2);

const response = await yourService.method(arg1, arg2);

<YourComponent prop1={value1} prop2={value2} />
```

---

## Implementation Checklist

### Code
- [ ] Main class/component implemented
- [ ] All methods/functions have clear purposes
- [ ] Error handling implemented
- [ ] Logging implemented (Serilog for backend, console for frontend)
- [ ] Configuration externalized (no hardcoded values)
- [ ] Comments added for complex logic

### Testing
- [ ] Unit tests written
- [ ] Unit tests passing
- [ ] Mock objects used for dependencies
- [ ] Edge cases covered
- [ ] Error scenarios tested

### Integration
- [ ] Integrates with previous module
- [ ] Dependencies work correctly
- [ ] No breaking changes to existing code

### Quality
- [ ] Code style consistent (ESLint/StyleCop)
- [ ] No warnings or errors
- [ ] Performance acceptable
- [ ] Security review done (if applicable)

### Documentation
- [ ] Code comments clear
- [ ] XML doc comments (C#)
- [ ] JSDoc comments (TypeScript)
- [ ] README updated (if new module)

---

## Definition of Done

✅ Task is DONE when:
- [ ] All code written
- [ ] All tests pass
- [ ] Code review approved
- [ ] No merge conflicts
- [ ] Ready to integrate with next module
- [ ] Can demonstrate working feature to team

---

## Testing Strategy

### Unit Tests
```
Test files: [ClassName]Tests.cs / [ComponentName].test.tsx
Coverage: Aim for 80%+ code coverage
Key scenarios:
  ✓ Happy path (normal operation)
  ✓ Error handling (exceptions, null values)
  ✓ Edge cases (empty inputs, boundary values)
  ✓ Integration (dependencies work correctly)
```

### Manual Testing (After Code Complete)
```
Test Environment: Local dev
Steps:
  1. [Step 1]
  2. [Step 2]
  3. [Step 3]
  
Expected Results:
  ✓ [Expected outcome 1]
  ✓ [Expected outcome 2]
  ✓ [Expected outcome 3]
```

---

## Integration Checkpoint

**Before moving to next task:**
- [ ] This module builds without errors
- [ ] This module's tests all pass
- [ ] This module integrates with previous module (if applicable)
- [ ] Performance is acceptable
- [ ] Code review complete
- [ ] Documentation complete

**Sign-off:** [Date] [Developer Name]

---

## Notes/Blockers

[Add any notes, questions, or blockers here]

---

## Resources

**Code References:**
- [Link to related code]
- [Link to documentation]
- [Link to example]

**External Resources:**
- [NuGet packages needed]
- [npm packages needed]
- [API documentation]

---

## Git Workflow

```bash
# Create feature branch
git checkout -b feature/phase-X-milestone-Y-task-Z

# Commit frequently with clear messages
git commit -m "feat: [Brief description of what was done]"

# When done, push and create PR
git push origin feature/phase-X-milestone-Y-task-Z

# Create Pull Request
# → Code review
# → Merge to develop
# → Deploy to staging

# After testing in staging:
# → Merge to main
# → Tag release
```

---

## Success Metrics

- [ ] Build succeeds
- [ ] All tests pass
- [ ] Code coverage: _____% (target: 80%+)
- [ ] Performance: _____ ms (target: acceptable for task)
- [ ] Zero critical bugs
- [ ] Zero security issues
- [ ] Team can understand and modify code

---
```

---

## How to Use This Template

### For Each Task:

**1. Copy the template above**

**2. Fill in the specifics** (use the V1 Development Roadmap)

**3. Example: Phase 1, Milestone 1.1, Task 1.1.1**

```
# Task: Create ProvisioningAI.MFilesConnectors Project

**Phase:** 1 (Foundation)
**Milestone:** 1.1 (M-Files Connectors)
**Status:** TODO
**Owner:** Backend Developer
**Timeline:** Week 1 (Day 1-2)
**Effort:** 4 hours

---

## Task Description

Create the ProvisioningAI.MFilesConnectors project and set up connection infrastructure.
Reference Connector I (ClientVaultAccessMSIBuilder) proven code for patterns.

---

## Objectives

- [ ] New C# project created (ProvisioningAI.MFilesConnectors)
- [ ] Project references M-Files COM SDK
- [ ] Basic project structure in place
- [ ] Build succeeds with no warnings
- [ ] Ready for connector implementation

---

## Technical Details

### Files to Create
```
ProvisioningAI.MFilesConnectors/
├─ ProvisioningAI.MFilesConnectors.csproj
├─ Properties/
│   └─ AssemblyInfo.cs
├─ IConnector.cs (interface)
├─ ConnectorFactory.cs
└─ README.md
```

### Dependencies
- [ ] M-Files COM SDK installed
- [ ] .NET 6+ SDK
- [ ] NuGet packages: Serilog, Microsoft.Extensions.DependencyInjection

### Build
```bash
dotnet new classlib -n ProvisioningAI.MFilesConnectors
cd ProvisioningAI.MFilesConnectors
dotnet build
# Should output: ✓ Succeeded
```

---

## Implementation Checklist

### Code
- [ ] .csproj file configured correctly
- [ ] IConnector interface defined
- [ ] ConnectorFactory skeleton created
- [ ] Using statements added for M-Files
- [ ] Build clean (no warnings)

### Testing
- [ ] Project builds
- [ ] No compilation errors

### Quality
- [ ] Follows C# naming conventions
- [ ] Code formatted cleanly
- [ ] Ready for next developer to add code

---

## Definition of Done

✅ Task is DONE when:
- [ ] Project created and builds
- [ ] All file structure in place
- [ ] No compilation errors or warnings
- [ ] Pushed to feature branch
- [ ] Ready for 1.1.2 (MFilesComConnector implementation)

---

## Git Workflow

```bash
git checkout -b feature/phase-1-milestone-1-task-1

# Create project, commit structure
git commit -m "feat: Create ProvisioningAI.MFilesConnectors project structure"

git push origin feature/phase-1-milestone-1-task-1
```

---
```

**4. Share with team** (either print or Slack)

**5. Developer works through checklist**

**6. When done, mark DONE and move to next task**

---

## Quick Prompt Format (Use in AI Chat)

When asking Claude or another AI to help with a specific task:

```
I'm building ProvisioningAI V1, Phase [1-8], Milestone [1.1-8.3].

CURRENT TASK: [TASK_NAME]

REQUIREMENTS:
- [Requirement 1]
- [Requirement 2]
- [Requirement 3]

WHAT I NEED:
☐ C# code for [ClassName]
☐ Unit tests for [ClassName]
☐ React component for [ComponentName]
☐ API endpoint [GET/POST /api/...]
☐ Database schema
☐ Other: [specific help needed]

CONSTRAINTS:
- Must integrate with: [Previous module]
- Must support: [Feature 1, Feature 2]
- Performance target: [X milliseconds]
- Test coverage: 80%+

CONTEXT:
[Paste relevant info from V1_DEVELOPMENT_ROADMAP.md]

Generate: [Code / Unit tests / API design / Other]
```

---

## Example: Full Task Prompt (Copy & Paste Ready)

```
TASK: Implement MFilesComConnector.cs (Phase 1, Milestone 1.1, Task 1.1.2)

REQUIREMENTS:
✓ Establish COM connection to M-Files vault (Conformity)
✓ Use 9-argument Connect() method (from Connector I pattern)
✓ Implement SSO-first authentication
✓ Implement connection pooling
✓ Implement Close-ComObjectSafe() cleanup
✓ Handle errors gracefully
✓ Log all operations (Serilog)

WHAT I NEED:
☐ MFilesComConnector.cs (main implementation)
☐ MFilesComConnectorTests.cs (unit tests with mocks)
☐ Error handling for vault offline scenarios
☐ Connection pool management
☐ Serilog integration

CONSTRAINTS:
- Reuse proven code from Connector I (ClientVaultAccessMSIBuilder)
- No hardcoded credentials (use Windows auth)
- Must be mockable for testing
- Performance: Connect within 2 seconds
- Test coverage: 85%+

CONTEXT:
This is the foundation for all M-Files interactions. Must be solid + tested.
Next module (1.1.3 MFilesRestConnector) depends on this working.

ARCHITECTURE:
IConnector (interface)
├─ MFilesComConnector : IConnector (this task)
├─ MFilesRestConnector : IConnector (next)
└─ ConnectorFactory (uses both)

Generate:
1. MFilesComConnector.cs (full implementation with comments)
2. MFilesComConnectorTests.cs (comprehensive unit tests)
3. Brief integration notes
```

---

## Team Coordination Example

**Using this to coordinate multiple developers:**

```
📋 V1 DEVELOPMENT BOARD (Week 2)

Frontend Developer:
├─ [TODO] Phase 3.2, Task 3.2.1: Discovery Dashboard Component
├─ [IN_PROGRESS] Phase 3.2, Task 3.2.2: Discovery Results Viewer
└─ [REVIEW] Phase 3.2, Task 3.2.3: Mapping Template Viewer

Backend Developer 1:
├─ [DONE] Phase 1.1: M-Files Connectors ✓
├─ [DONE] Phase 1.2: Database Setup ✓
├─ [IN_PROGRESS] Phase 2.1: Object Type Scanner
└─ [TODO] Phase 2.2: Workflow Scanner

Backend Developer 2:
├─ [TODO] Phase 4.1: State Graph Builder
├─ [TODO] Phase 4.2: Workflow Visualization (Backend API)
└─ [TODO] Phase 6.1: Copilot Service

Each developer has:
✓ Clear task description
✓ Definition of done
✓ Integration checkpoint
✓ Git branch name
✓ Testing strategy
✓ Estimated hours
```

---

## When to Create a New Task Prompt

**Create new prompt when:**
1. ✅ Previous task is DONE
2. ✅ Code review approved
3. ✅ Tests pass
4. ✅ Integrated with previous module
5. ✅ Ready to start next task

**Template fill-in time:** ~5 minutes per task

**Result:** Clear, unambiguous work for developer

---

## Save This File

**Download/Save:** `V1_TASK_PROMPT_TEMPLATE.md`

**Use it for:** Every single V1 development task

**Result:** Consistent, organized, trackable development

---

## Summary: Divide & Conquer Development

1. ✅ **V1_DEVELOPMENT_ROADMAP.md** — Master plan (8 phases, 40+ tasks)
2. ✅ **V1_TASK_PROMPT_TEMPLATE.md** — This file (reusable template)
3. ✅ **Iterative workflow** — One task at a time, clear success criteria

**For each task:**
- Copy template
- Fill in specifics from roadmap
- Share with developer
- Developer works through checklist
- Code review + approve
- Move to next task

**This ensures:**
- ✓ Clear communication
- ✓ Trackable progress
- ✓ Consistent quality
- ✓ Easy onboarding of new team members
- ✓ No confusion about what's needed

**You now have a complete V1 development system.** 🚀
