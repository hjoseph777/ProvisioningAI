<!-- markdownlint-disable-file -->

# ProvisioningAI V1 Development: Skills & Learnings

**Project:** ProvisioningAI (Vault Provisioning Automation Platform)  
**Phase:** V1 (Discovery + Documentation + Workflow Engine)  
**Duration:** 2026-07-25 → ongoing  
**Team Size:** 1 human + Claude (Sonnet 5)  
**Last Updated:** 2026-08-19 (end of day)  

---

## Purpose

This document captures:
- ✅ **Skills developed** by team members
- ✅ **Key learnings** from each task
- ✅ **Reusable code patterns** (don't reinvent the wheel)
- ✅ **Knowledge gaps** (what to learn next)
- ✅ **Best practices** (what worked well)
- ✅ **Lessons learned** (what to do differently)

## Build and Packaging Learning (2026-08-14)

### Vite + React + Electron packaging on Windows

Skill: diagnosing Electron packaging failures past the renderer build step.

Verified behavior in this repo:
- The Vite warning `Some chunks are larger than 500 kB after minification` is not the build blocker.
- The real blocker was Electron unpack/rename (`win-unpacked.tmp` -> `win-unpacked`) when using the download path.
- On this machine, the failure can happen even when AV is disabled, so do not over-assume antivirus as root cause.

Working mitigation, now codified in `package.json` scripts:
- `electron:build` uses local Electron dist: `electron-builder --config.electronDist=node_modules/electron/dist`
- `electron:build:download` keeps the original download-based path as fallback.

Operator notes for repeatable runs:
- Use a fresh terminal for packaging runs; interrupted batch sessions can leave confusing follow-up failures.
- Treat `SIGINT`/"Terminate batch job" interruptions as separate from true packaging errors.

## Connection roadmap framing (2026-08-02, Connection II corrected 2026-08-04, renumbered 2026-08-10)

RENUMBERING NOTE (2026-08-10): "Connection III" used to mean TriggerBridge.
It's now Connection IV — the slot freed when the original Connection IV
(Approbation receiving side) was folded into Connection II on 2026-08-04.
"Connection III" now names a new capability, the Workflow/Mermaid Pipeline,
given priority-1 status this session. Full reasoning in progress.md's
"Decision (2026-08-10)" entry — not re-derived here, per this document's own
practice of pointing to the fuller write-up rather than duplicating it.

Project work is now organized as Connections I-IV:
- Connection I: Conformity Core Mechanism — done (milestone achieved)
- Connection II: Full End-to-End Programmatic Run — CLOSED for its actual
  mandate 2026-08-06 (see progress.md's Connection roadmap for the closure
  detail; this entry's earlier "active/next" framing is superseded). Drove
  a real invoice programmatically through the entire Conformity workflow,
  intake through successful landing in Approbation. Absorbed the former
  Connection IV (Approbation receiving side) — a full end-to-end run
  inherently requires the handoff to complete. Two defined blockers, not
  unknowns: (a) state-114 SQL dependency (SQL Query Vault Application's own
  connection still targets TERGOS-MFILES01\SQLEXPRESS, distinct from the six
  object-type External DB Connections already repointed) — still open; (b)
  cross-vault handoff completion (5 destination GUIDs + 14 destination
  aliases must resolve in Approbation) — root cause identified 2026-08-06
  (Vault Toolbox task-processor authentication failure), fix still
  outstanding. Full detail: "Connection II's handoff-completion requirement"
  entry below.
- **Connection III: Workflow/Mermaid Pipeline — ACTIVE, PRIORITY 1
  (2026-08-10, new this session).** Design an M-Files workflow visually via
  Mermaid, refine it through an interactive editor, export it into a real
  M-Files workflow via COM, and the reverse (read an existing workflow out
  as Mermaid). Chosen over the vault-template capability as the nearer-term
  goal: MfilesProperties.md is mature (multiple correction passes including
  an independent third-party structuring audit), the architecture is
  designed, and a worked example is validated on paper. Not yet built: the
  interactive click-to-edit popup UI, the translator/validator, the COM
  emitter. Full reasoning: progress.md's "Decision (2026-08-10)" entry.
- Connection IV: TriggerBridge — major milestone (future), **renumbered
  from Connection III, 2026-08-10** (see note above; content unchanged,
  only the numeral). Effectively the same effort as "streamline the
  workflow" (only ~19% of states were found safely touchable in isolation
  by the earlier Stage A rubric) — wants Connection II's proven end-to-end
  run as its correctness baseline.
- Approbation receiving side (retired, formerly "Connection IV") — RETIRED
  as a standalone phase (2026-08-04), folded into Connection II above.
  Held the numeral IV until 2026-08-10, when IV was reassigned to
  TriggerBridge (a retired entry doesn't need to hold a live slot).
  Technical detail retained in Connection II's description and in the
  handoff-completion entry below, not lost.

**Project-management note, added 2026-08-10, so a future session doesn't
need to re-derive why:** the priority order is Connection III
(Workflow/Mermaid Pipeline) ahead of the vault-template/"customize on the
fly" capability (which builds on Connections I/II but has no Connection
number of its own — it's real, hard-won groundwork, not yet scoped as a
defined tool). The two are different capabilities, not one bigger than the
other: workflow pipeline = design/modify logic itself; vault template =
replicate and adapt something that already exists. Full-vault-import does
NOT make workflow design easier. See progress.md's "Decision (2026-08-10)"
entry for the complete reasoning and prd.md's Non-Goals section for the
"deferred, not abandoned" framing of the vault-template capability.

Carry-forward foundation for all later Connections: the proven Connection I
skills and findings remain authoritative — NVS config read/write via VAF
namespace conventions, task-queue diagnostics split (enqueue vs processor),
real transition mechanism (CheckOut->SetProperty->CheckIn), mandatory reload
behavior, and the cross-vault alias-resolution handshake model.

Framing: feasibility has been proven. Connection II is closed for its
mandate; Connection III (Workflow/Mermaid Pipeline) is the active
priority-1 goal as of 2026-08-10. Connection IV (TriggerBridge, renumbered
from III) remains a real future milestone once II's baseline is available
to streamline against — not dropped, just sequenced behind III.

---

## Team Skills Development

### Developer 1: Claude (Sonnet 5) - Backend/M-Files Specialist

**Overall Progress:** 0 → Verified against a live M-Files 26.6 server  
**Key Skills Gained:** M-Files COM API (real signatures, not guessed), dynamic-dispatch test doubles, IHttpClientFactory pitfalls  
**Recommended Next:** M-Files REST API against an environment where the web/IIS component is actually installed; Discovery-level COM calls (object types, properties, value lists)  

#### Phase 1 Tasks Completed

**Task 1.1.1: Project Setup**
- Status: ✅ DONE (2026-07-25)
- `ProvisioningAI.MFilesConnectors` (net8.0-windows), added to `ProvisioningAI.sln`
- Skills: TargetFramework choice for COM interop (`net8.0-windows`, not bare `net8.0` — see Known Pitfalls below), `InternalsVisibleTo` for test-only seams

**Task 1.1.2: MFilesComConnector**
- Status: ✅ DONE (2026-07-25)
- Skills: real 9-arg `Connect()` signature (confirmed live, not from docs), `MFAuthType` enum, SSO-first-then-fresh-instance-fallback, `GetOnlineVaults()` vs `GetVaults()`, dynamic-dispatch test doubles (see Pattern 8)
- Confidence Level: High — verified against a real running M-Files server on this machine, not just unit tests

**Task 1.1.3: MFilesRestConnector**
- Status: ✅ DONE (2026-07-25), **not live-verified**
- Skills: `IHttpClientFactory` lifecycle (see Lesson 2 below), exponential backoff with selective retry (5xx/408/429 only, never 401/404), token-refresh-once pattern
- Confidence Level: Medium — built to the documented M-Files REST contract, but no REST/IIS service was reachable on this dev machine to confirm against

### Developer 2: Claude (Sonnet 5) - Database/Backend

**Overall Progress:** 0 → EF Core DbContext and Migrations complete  
**Key Skills Gained:** EF Core/SQLite package setup, Fluent API schema configuration, EF Core Migrations  
**Recommended Next:** Repository Pattern (1.2.5)  

#### Phase 1.2 Tasks Completed

**Task 1.2.1: Create ProvisioningAI.Data project (EF Core + SQLite)**
- Status: ✅ DONE (2026-07-25)
- Duration: ~15 min (this task is genuinely small — project/package setup only, no entities)
- Skills: `ProvisioningAI.Data` already existed as an empty auto-generated scaffold (per `claude.md` §2.2) — the real work was removing the placeholder `Class1.cs` and adding `Microsoft.EntityFrameworkCore.Sqlite` + `.Design` (both 8.0.10, matched to the .NET 8 SDK already pinned in `global.json`). `dotnet add package` correctly set `PrivateAssets="all"` on the Design package automatically (it's build-time-only tooling for `dotnet ef migrations`, shouldn't ship in the runtime output).
- Learning: a C# class library with zero `.cs` files still builds cleanly (0 warnings/errors) as long as the `.csproj` is valid — useful to know when a task is scoped to "just the project setup," with entities coming in a later task.
- Confidence Level: High — trivial task, verified via full solution build + full test suite (40/40 still passing, no regressions from removing the old placeholder)

**Task 1.2.2: Define Core Entities**
- Status: ✅ DONE (2026-07-26)
- Skills: Record-like entity definitions using C# 12 `required` properties and `init` setters, `[Index]` attributes.

**Task 1.2.3: Create DbContext**
- Status: ✅ DONE (2026-07-26)
- Skills: EF Core Fluent API, overriding convention-based Primary Keys in `OnModelCreating`, composite unique indexes.

**Task 1.2.4: Create EF Core Migrations**
- Status: ✅ DONE (2026-07-26)
- Skills: EF Core CLI `dotnet ef`, SQLite PRAGMA `foreign_keys`, generated DDL schema validation.
- Learning: EF Core does not generate FK constraints for string keys without navigation properties unless explicitly defined via `HasPrincipalKey`. `PRAGMA foreign_keys` must be enabled per connection in SQLite (`Foreign Keys=True;` in connection string).

### Developer 3: [NAME] - Frontend/React

**Overall Progress:** 0 → Intermediate React Developer  
**Key Skills Gained:** React components, Zustand state management, UI/UX  
**Recommended Next:** Performance optimization (virtualization), Testing  

#### Phase 3 Tasks Completed

**Task 3.2.2: Discovery Dashboard**
- Status: [TODO / IN_PROGRESS / DONE]
- Duration: [HOURS]
- Skills: React hooks, Tailwind styling, API integration
- Confidence Level: [Low / Medium / High]

---

## Skill Matrix (By Topic)

### M-Files Integration
```
Skill: Understanding M-Files COM API
├─ Not Started: [ ]
├─ Beginner: [ ]
├─ Intermediate: Claude (verified live against a real server)
└─ Expert: [CONNECTOR_I_AUTHOR]

Key Learning (verified live on M-Files 26.6.16115.9, not from docs):
- Real 9-arg signature: Connect(AuthType, UserName, Password, Domain,
  ProtocolSequence, NetworkAddress, Endpoint, LocalComputerName,
  AllowAnonymousConnection). Domain must be "" (empty string), not null.
- MFAuthType: 1 = logged-on Windows user (SSO, no credentials), 2 = specific
  Windows user, 3 = specific M-Files user. Getting 2 vs 3 backwards silently
  sends the wrong credential type — the existing repo's pull-from-vault.ps1
  actually has this bug (uses 2 where 3 is correct for M-Files credentials).
- Vault enumeration is GetOnlineVaults(), NOT GetVaults() — GetVaults() on a
  plain ConnectWithoutLogin() session either returns 0 vaults or fails with
  "Login required." You need the full authenticated Connect() first.
- ConnectWithoutLogin() (7 args) gets you a transport-level connection only;
  it cannot enumerate vaults or do anything permission-gated.
- Real error signals, captured from a live server (not guessed):
  - bad credentials → HResult 0x8004001A, message "Authentication failed."
  - nonexistent vault GUID → HResult 0x80040001 (generic wrapper!), message
    "The specified document vault does not exist."
  - unreachable server → HResult 0x80040001 (same generic wrapper), message
    "Network problems are preventing M-Files from communicating with the
    server." / "gRPC connection to the server failed."
  - Takeaway: the top-level COMException.HResult is often the same generic
    0x80040001 regardless of what actually failed — the message text is the
    real signal for everything except authentication failure specifically.
  - permission-denied (a REAL case, not synthetic — hit while verifying
    per-vault login against Conformity, 2026-07-26) → HResult 0x800407E4,
    message "Access denied. You do not have a user account in this document
    vault. (Account name: \"...\")". Confirmed this real message is caught
    correctly by the existing "access"+"denied" keyword classifier in
    MFilesErrors.cs — designed against a guess, validated against reality.
  - This is exactly the scenario claude.md §8 warns about: a Windows account
    can be valid on the SERVER (SSO works, GetOnlineVaults() succeeds) while
    still lacking a user account in a SPECIFIC vault. Enumerating a vault and
    being able to log into it are genuinely different permission checks —
    don't assume the first implies the second. Resolved by adding the account
    as a Windows user (not an M-Files-type account) under each vault in
    M-Files Admin — SSO only works if the granted account type matches.
- COM object lifecycle management (Close-ComObjectSafe pattern — see Pattern 2)
- Connection pooling for performance (see Pattern 3)
- Per-vault login: LogInAsUserToVault(vaultGuid, null, authType, username,
  password, null) — same auth params as the server-level Connect(), reused
  for the vault-level login rather than re-attempting SSO-fallback logic a
  second time. Confirmed live against Conformity, 2026-07-26.
- The logged-in Vault object's own .GUID property comes back EMPTY (confirmed
  live) — unlike the lightweight entries from GetOnlineVaults(), which do
  have a real GUID. Never trust vault.GUID post-login; track the GUID you
  logged in with instead.
- Logout method is LogOutSilent() (confirmed real, not guessed) — call it
  before releasing the COM handle, in a try/finally so a logout failure never
  skips the release.
- 5 full connect -> login -> read -> logout -> release cycles against
  Conformity showed zero COM handle growth (process handle count: 760, then
  755 flat for the remaining 4 cycles) — the release discipline holds up
  under repetition, not just a single call.

Recommended Learning:
- M-Files REST API against an environment with the web/IIS component actually
  installed (this dev machine has none — no port 80/443, no W3SVC service)
- VAF (Vault Application Framework) patterns
- Performance tuning (large vaults)
```

### Entity Framework Core
```
Skill: EF Core database configuration
├─ Not Started: [DEV_NAME_3]
├─ Beginner: [DEV_NAME_2]
├─ Intermediate: [ ]
└─ Expert: [ ]

Key Learning:
- Fluent API vs Data Annotations (use Fluent API for complex models)
- Index strategies (what to index, what not to)
- Relationship configuration (HasMany, HasOne, etc.)
- Migration management

Recommended Learning:
- Query optimization (N+1 problems)
- SQLite → SQL Server migration
- Async/await with EF Core
```

### React + TypeScript
```
Skill: React component development
├─ Not Started: [DEV_NAME_1, DEV_NAME_2]
├─ Beginner: [DEV_NAME_3]
├─ Intermediate: [ ]
└─ Expert: [ ]

Key Learning:
- Component structure (presentational vs container)
- Hooks (useState, useEffect, custom hooks)
- Zustand state management (simpler than Redux)
- Tailwind CSS + shadcn/ui components

Recommended Learning:
- Performance (virtualization, memoization)
- Testing (React Testing Library)
- Accessibility (a11y)
```

### Unit Testing
```
Skill: Writing unit tests with Moq
├─ Not Started: [DEV_NAME_3]
├─ Beginner: [DEV_NAME_1, DEV_NAME_2]
├─ Intermediate: [ ]
└─ Expert: [ ]

Key Learning:
- Mocking external dependencies
- AAA pattern (Arrange, Act, Assert)
- Test coverage targets (80%+)
- Testing error scenarios

Recommended Learning:
- Integration testing patterns
- Test performance (vs actual API)
- Snapshot testing (for React)
```

---

## Reusable Code Patterns (Patterns Library)

### Pattern 1: Connector Factory (real code, corrected 2026-07-25)

**Location:** `ProvisioningAI.MFilesConnectors/ConnectorFactory.cs`  
**Task Created:** Phase 1.1.1  
**Status:** ✅ Built and tested (DI resolution + transport selection covered by `ConnectorFactoryTests.cs`)  
**Reuse:** Phase 1.1.2, 1.1.3 — will be consumed by Phase 3.1 API controllers  

The actual interface only has one method so far — `ListVaultsAsync()` — because that's all Module 1 needed. Resist the urge to add speculative methods (`GetVaultDataAsync<T>`, etc.) until a real caller needs them.

**Pattern Code:**
```csharp
public interface IMFilesConnector
{
    Task<IReadOnlyList<VaultInfo>> ListVaultsAsync(CancellationToken cancellationToken = default);
}

public enum MFilesConnectorTransport { Com, Rest }

public sealed class MFilesConnectorFactory : IMFilesConnectorFactory
{
    private readonly IServiceProvider _serviceProvider;
    public MFilesConnectorFactory(IServiceProvider serviceProvider) => _serviceProvider = serviceProvider;

    public IMFilesConnector Create(MFilesConnectorTransport transport) => transport switch
    {
        MFilesConnectorTransport.Com => _serviceProvider.GetRequiredService<MFilesComConnector>(),
        MFilesConnectorTransport.Rest => _serviceProvider.GetRequiredService<MFilesRestConnector>(),
        _ => throw new ArgumentOutOfRangeException(nameof(transport), transport, null),
    };
}
```

**Usage:**
```csharp
services.AddMFilesConnectors(configuration); // registers both connectors + the pool + the factory
var connector = factory.Create(MFilesConnectorTransport.Com);
var vaults = await connector.ListVaultsAsync();
```

**Why Reuse:** Callers depend on `IMFilesConnector`/`IMFilesConnectorFactory` only — no COM type is visible outside this project, which is what makes the future scanner and its tests mockable  
**Lessons Learned:** Start the interface with exactly what's needed now, not a guessed-at future surface — the fake `GetVaultDataAsync<T>(string query)` this section used to show was never real and never got built that way

---

### Pattern 2: Safe COM Object Cleanup (real code, corrected 2026-07-25)

**Location:** `ProvisioningAI.MFilesConnectors/ComObjectExtensions.cs`  
**Task Created:** Phase 1.1.2  
**Status:** ✅ Built and tested (`ComObjectExtensionsTests.cs` — null, non-COM, double-release, and a real COM object via `WScript.Shell` to exercise the actual `Marshal.ReleaseComObject` path without needing M-Files)  
**Reuse:** Everywhere COM objects are used  

There's no `MFilesServerApplication`-specific branch or `LogOutSilent()` call — that was never real. The extension is deliberately generic: it works on *any* COM object, not just M-Files ones.

**Pattern Code:**
```csharp
public static class ComObjectExtensions
{
    public static void CloseComObjectSafe(this object? comObject)
    {
        if (comObject is null) return;
        if (!Marshal.IsComObject(comObject)) return; // no-op for plain CLR objects — safe to call on anything

        try
        {
            Marshal.ReleaseComObject(comObject);
        }
        catch (Exception ex) when (ex is InvalidComObjectException or ObjectDisposedException)
        {
            // Already released — nothing left to do.
        }
    }
}
```

**Usage:**
```csharp
try {
    // Use COM object
} finally {
    vault.CloseComObjectSafe();  // Always call in finally — safe even if vault is null or already released
}
```

**Why Reuse:** Prevents memory leaks (critical for performance)  
**Lessons Learned:** COM cleanup must always happen, even on exceptions (use finally blocks). Also: to unit-test this without a live COM object, `WScript.Shell` (ships with every Windows install) is a good stand-in — no M-Files dependency needed just to prove `Marshal.ReleaseComObject` actually gets called on a real COM object.

---

### Pattern 3: Connection Pooling (real code, corrected 2026-07-25)

**Location:** `ProvisioningAI.MFilesConnectors/ConnectionPool.cs`  
**Task Created:** Phase 1.1.2  
**Status:** ✅ Built and tested (`ConnectionPoolTests.cs` — reuse, idle eviction, exhaustion, exception-releases-slot, discard-vs-reuse, dispose)  
**Reuse:** `MFilesComConnector` (pools authenticated server sessions, keyed by server:endpoint)  

Not generic (`ConnectionPool<T>`) and not `BlockingCollection`-based — it's keyed (multiple servers can each have their own pool of sessions) and uses `SemaphoreSlim` for capacity + `ConcurrentDictionary<string, ConcurrentBag<PooledMFilesSession>>` for the idle sessions themselves. Pool exhaustion is its own exception type, distinct from a connection failure, because the server may be healthy and just busy.

**Pattern Code (abbreviated — see the real file for the full version):**
```csharp
public sealed class ConnectionPool : IDisposable
{
    private readonly SemaphoreSlim _capacity;
    private readonly ConcurrentDictionary<string, ConcurrentBag<PooledMFilesSession>> _idle = new();

    public async Task<PooledMFilesSession> AcquireAsync(
        string key, Func<CancellationToken, Task<PooledMFilesSession>> factory, CancellationToken ct = default)
    {
        var acquired = await _capacity.WaitAsync(_options.AcquireTimeout, ct);
        if (!acquired) throw new MFilesPoolExhaustedException(/* ... */);

        try
        {
            var bag = _idle.GetOrAdd(key, static _ => new ConcurrentBag<PooledMFilesSession>());
            while (bag.TryTake(out var pooled))
            {
                if (DateTimeOffset.UtcNow - pooled.LastUsed <= _options.IdleTimeout)
                    return pooled; // reuse — no reconnect
                pooled.Dispose(); // stale — release its COM handle, don't hand it back
            }
            return await factory(ct); // no idle session available — connect fresh
        }
        catch { _capacity.Release(); throw; } // never handed out a usable connection — give the slot back
    }

    public void Release(string key, PooledMFilesSession session) { /* returns session to the idle bag + releases slot */ }
    public void Discard(PooledMFilesSession session) { /* session errored mid-use — release COM handle, don't pool it */ }
}
```

**Usage:**
```csharp
var session = await pool.AcquireAsync(key, ct => ConnectWithSsoFallback(ct));
try { /* use session.ServerApplication */ }
catch { pool.Discard(session); throw; }  // errored — don't return a possibly-bad session to the pool
// success path:
pool.Release(key, session);
```

**Why Reuse:** Second connect to the same server is materially faster than the first — no reconnect/re-auth  
**Lessons Learned:** "Pool exhausted" and "can't connect" are different failure modes and need different exception types — a busy-but-healthy server shouldn't look like a dead one to the caller. Also: a discarded (errored) session must never go back in the idle bag, or the next caller inherits a COM object in an unknown state.

---

### Pattern 4: EF Core DbContext Configuration

**Location:** `ProvisioningAI.Data/ProvisioningAiDbContext.cs`  
**Task Created:** Phase 1.2.1  
**Status:** ✅ Foundation for all database access  
**Reuse:** All repository classes, all database queries  

**Pattern Code:**
```csharp
public class ProvisioningAiDbContext : DbContext
{
    public DbSet<ObjectType> ObjectTypes { get; set; }
    public DbSet<Property> Properties { get; set; }
    public DbSet<Workflow> Workflows { get; set; }
    public DbSet<WorkflowState> WorkflowStates { get; set; }
    public DbSet<IntegrationPoint> IntegrationPoints { get; set; }
    public DbSet<MappingTemplate> MappingTemplates { get; set; }
    public DbSet<AuditLog> AuditLogs { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // One-to-Many: ObjectType → Properties
        modelBuilder.Entity<ObjectType>()
            .HasMany(ot => ot.Properties)
            .WithOne(p => p.ObjectType)
            .HasForeignKey(p => p.ObjectTypeId)
            .OnDelete(DeleteBehavior.Cascade);

        // Indexes for performance
        modelBuilder.Entity<Property>()
            .HasIndex(p => p.Guid)
            .IsUnique(true);

        modelBuilder.Entity<IntegrationPoint>()
            .HasIndex(p => p.Name)
            .IsUnique(false);

        // Value object configuration
        modelBuilder.Entity<MappingTemplate>()
            .Property(m => m.IntegrationPointsJson)
            .HasColumnType("TEXT");
    }
}
```

**Usage:**
```csharp
using var context = new ProvisioningAiDbContext();
var objectTypes = await context.ObjectTypes
    .Include(ot => ot.Properties)
    .Where(ot => ot.Name.Contains("Document"))
    .ToListAsync();
```

**Why Reuse:** Establishes consistent data access patterns  
**Lessons Learned:** Indexes are critical for performance; lazy-load carefully

---

### Pattern 5: Repository Pattern

**Location:** `ProvisioningAI.Data/Repositories/`  
**Task Created:** Phase 1.2.3  
**Status:** ✅ Standard data access layer  
**Reuse:** All data access in application  

**Pattern Code:**
```csharp
public interface IRepository<T> where T : class
{
    Task<T> GetByIdAsync(int id);
    Task<IEnumerable<T>> GetAllAsync();
    Task<T> AddAsync(T entity);
    Task UpdateAsync(T entity);
    Task DeleteAsync(int id);
}

public class GenericRepository<T> : IRepository<T> where T : class
{
    private readonly ProvisioningAiDbContext _context;
    private readonly DbSet<T> _dbSet;

    public GenericRepository(ProvisioningAiDbContext context)
    {
        _context = context;
        _dbSet = context.Set<T>();
    }

    public async Task<T> GetByIdAsync(int id)
    {
        return await _dbSet.FindAsync(id);
    }

    public async Task<IEnumerable<T>> GetAllAsync()
    {
        return await _dbSet.ToListAsync();
    }

    public async Task<T> AddAsync(T entity)
    {
        await _dbSet.AddAsync(entity);
        await _context.SaveChangesAsync();
        return entity;
    }

    public async Task UpdateAsync(T entity)
    {
        _dbSet.Update(entity);
        await _context.SaveChangesAsync();
    }

    public async Task DeleteAsync(int id)
    {
        var entity = await GetByIdAsync(id);
        if (entity != null)
        {
            _dbSet.Remove(entity);
            await _context.SaveChangesAsync();
        }
    }
}
```

**Usage:**
```csharp
var objectTypeRepo = new GenericRepository<ObjectType>(_context);
var objectType = await objectTypeRepo.GetByIdAsync(1);
```

**Why Reuse:** Eliminates duplicate data access code  
**Lessons Learned:** Generic repository for CRUD; specific repos for complex queries

---

### Pattern 6: Structured Logging (Serilog)

**Location:** Everywhere (appsettings.json + UseSerilog())  
**Task Created:** Phase 1.1.1  
**Status:** ✅ Operational excellence  
**Reuse:** All services, controllers  

**Pattern Setup:**
```csharp
// In Program.cs
Log.Logger = new LoggerConfiguration()
    .MinimumLevel.Debug()
    .WriteTo.Console()
    .WriteTo.File("logs/provisioningai-.txt", rollingInterval: RollingInterval.Day)
    .CreateLogger();

builder.UseSerilog();
```

**Pattern Usage:**
```csharp
// Structured logging (semantic)
Log.Information("Connected to vault {VaultName} on {Server}:{Port}",
    vaultName, server, port);

Log.Warning("Connection attempt {AttemptNumber} failed: {ErrorMessage}",
    attemptNumber, error.Message);

Log.Error(exception, "Unexpected error in {Method} for {VaultName}",
    nameof(ScanVaultAsync), vaultName);
```

**Why Reuse:** Logs are now queryable; can correlate issues  
**Lessons Learned:** Use semantic logging (structured); makes debugging infinitely easier

---

### Pattern 7: Zustand State Management (React)

**Location:** `src/stores/discoveryStore.ts`  
**Task Created:** Phase 3.2.1  
**Status:** ✅ Frontend state management  
**Reuse:** All React components  

**Pattern Code:**
```typescript
import { create } from 'zustand';

interface DiscoveryState {
  // State
  currentScan: DiscoveryScan | null;
  scanResults: DiscoveryResult | null;
  mappingTemplate: MappingTemplate | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  startScan: (vaultName: string) => Promise<void>;
  setScanResults: (results: DiscoveryResult) => void;
  setMappingTemplate: (template: MappingTemplate) => void;
  setError: (error: string | null) => void;
  clearScan: () => void;
}

export const useDiscoveryStore = create<DiscoveryState>((set) => ({
  // Initial state
  currentScan: null,
  scanResults: null,
  mappingTemplate: null,
  isLoading: false,
  error: null,

  // Actions
  startScan: async (vaultName) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.post('/discovery/scan', { vaultName });
      set({ currentScan: response.data });
    } catch (error) {
      set({ error: error.message });
    } finally {
      set({ isLoading: false });
    }
  },

  setScanResults: (results) => set({ scanResults: results }),
  setMappingTemplate: (template) => set({ mappingTemplate: template }),
  setError: (error) => set({ error }),
  clearScan: () => set({ currentScan: null, scanResults: null }),
}));
```

**Usage in Components:**
```typescript
export function DiscoveryDashboard() {
  const { currentScan, scanResults, isLoading } = useDiscoveryStore();
  const startScan = useDiscoveryStore((state) => state.startScan);

  return (
    <div>
      {isLoading && <LoadingSpinner />}
      {scanResults && <ResultsViewer results={scanResults} />}
    </div>
  );
}
```

**Why Reuse:** Simpler than Redux, perfect for app-level state  
**Lessons Learned:** Keep Zustand stores focused (one concern per store)

---

### Pattern 8: Dynamic-Dispatch COM Test Doubles (new, discovered 2026-07-25)

**Location:** `ProvisioningAI.MFilesConnectors/MFilesComConnector.cs` (the `_serverApplicationFactory` seam), `ProvisioningAI.Tests/MFilesConnectors/MFilesComConnectorTests.cs` (`FakeServerApplication`)  
**Task Created:** Phase 1.1.2  
**Status:** ✅ This is how "no test may require a live vault" actually got satisfied for COM connect/retry/fallback logic, not just the pool and error-mapping helpers  
**Reuse:** Any future COM-calling code (Discovery scanner, etc.)  

The real M-Files calls go through `dynamic`, not a compiled interop type (`dynamic srvApp = serverApplication; srvApp.Connect(...)`). The DLR resolves member calls against the *runtime* type of the object — it does not care whether that type is a COM RCW or a plain CLR class, only that the members exist and match. That means a plain `public` C# class with matching method signatures (`Connect(...)`, `GetOnlineVaults()`) flows through the exact same code path as the real COM object, with zero mocking framework involved.

**Pattern Code:**
```csharp
// Production: dynamic call site, works with COM or a compatible plain object
private void Connect(object serverApplication, int authType, /* ... */)
{
    dynamic srvApp = serverApplication;
    srvApp.Connect(authType, username, password, "", protocolSequence, server, endpoint, localComputerName, false);
}

// Test: a plain CLR class with matching members — MUST be public (or internal +
// InternalsVisibleTo declared on the TEST assembly, granting the connector's
// assembly access — not the other way around). A private nested class fails at
// runtime with "'object' does not contain a definition for 'Connect'" because the
// DLR binder resolves accessibility from the CALLING assembly's perspective.
public sealed class FakeServerApplication
{
    public void Connect(int authType, string username, string password, string domain,
        string protocolSequence, string networkAddress, string endpoint, string localComputerName, bool allowAnonymous)
    { /* set flags, optionally throw a COMException to simulate a real failure */ }

    public List<FakeVault> GetOnlineVaults() => Vaults;
}
```

**Why Reuse:** Lets you unit-test retry/fallback/pooling logic around COM calls (SSO fails once then succeeds, fails twice then falls back to credentials on a fresh instance, etc.) without touching a real vault or a mocking framework  
**Lessons Learned (the actual bug this caused, twice, in one session):**
1. First attempt made the fakes `private` nested classes — every COM-path test failed with `'object' does not contain a definition for 'Connect'`, even though the member itself was `public`. The *class* has to be visible from the other assembly, and `private` never is, regardless of `InternalsVisibleTo`.
2. Fix was to make them `public` (simplest — no cross-assembly grant needed at all). `internal` + `InternalsVisibleTo` also works, but the grant has to run in the *opposite* direction from what you'd naturally reach for: the assembly containing the fake types must declare `[InternalsVisibleTo]` for the assembly with the dynamic call site — not the other way around.
3. Separately: the 10-second SSO-retry delay needed to be constructor-injectable (defaulting to 10s in production), or every test touching the retry path costs 10 real seconds. Small seam, big difference to test suite runtime.

---

### Pattern 9: Per-Vault Login with Deterministic Release (new, 2026-07-26)

**Location:** `ProvisioningAI.MFilesConnectors/VaultHandle.cs`, `IMFilesConnector.LogInToVaultAsync`, `MFilesComConnector.LogInToVaultCore`  
**Task Created:** Milestone 1.1 gap-closure  
**Status:** ✅ Live-verified against Conformity — 5 full connect/login/read/logout/release cycles, zero COM handle growth  
**Reuse:** Every Discovery stage — this is the connectivity primitive every scan operation needs before it can read anything  

The server-level connect and the per-vault login are two separate M-Files authentication steps sharing one COM session. The pool holds the server session; the vault login is a lightweight operation on top of it, reusing whichever identity (SSO or credential fallback) actually succeeded — tracked via `PooledMFilesSession.AuthTypeUsed` rather than re-attempting the SSO-fallback cascade a second time for the vault login.

**Pattern Code:**
```csharp
public interface IVaultHandle : IDisposable
{
    string VaultGuid { get; } // from the caller's input — vault.GUID comes back EMPTY on a live session
    string VaultName { get; }
}

public sealed class VaultHandle : IVaultHandle
{
    private readonly object _vault;
    public string VaultGuid { get; }
    public string VaultName { get; }

    internal VaultHandle(object vault, string vaultGuid, string vaultName)
    { _vault = vault; VaultGuid = vaultGuid; VaultName = vaultName; }

    public void Dispose()
    {
        try { dynamic vault = _vault; vault.LogOutSilent(); }
        catch { /* logout failing doesn't excuse skipping the release below */ }
        finally { _vault.CloseComObjectSafe(); }
    }
}

// In MFilesComConnector — reuses the pooled server session's identity:
dynamic srvApp = session.ServerApplication;
var username = session.AuthTypeUsed == MFAuthTypeSpecificMFilesUser ? _options.Username : null;
var password = session.AuthTypeUsed == MFAuthTypeSpecificMFilesUser ? (_options.Password ?? "") : null;
dynamic vault = srvApp.LogInAsUserToVault(vaultGuid, null, session.AuthTypeUsed, username, password, null);
return new VaultHandle((object)vault, vaultGuid, (string)vault.Name);
```

**Usage:**
```csharp
using var handle = await connector.LogInToVaultAsync(conformityGuid);
// handle.VaultName == "Conformity"; disposed at scope end -> LogOutSilent() then COM release
```

**Why Reuse:** Every future Discovery scanner operation (object types, properties, workflows) needs a live vault session — building this once, correctly, in Module 1 means Module 2 starts scanning instead of starting by writing connection code.  
**Lessons Learned:** `vault.GUID` on the actual logged-in session object is empty on a real server — don't read identity back from the COM object when you already have it from the caller. Also: "the server accepted my connection" and "I have a user account in this vault" are different permission checks entirely — a Windows account can pass SSO and enumerate vaults while still being denied login to a specific one (see the M-Files Integration skill-matrix entry above for the real error this produced).

### High Priority (Required for V1)

| Topic | Current Level | Target Level | Resources | Est. Time |
|-------|---|---|---|---|
| M-Files REST API | Built to spec, unverified live | Verified against a real REST/IIS endpoint | Need an environment with the M-Files web component installed — none available on this dev machine | 2-4 hours once an endpoint exists |
| React Performance | Beginner | Intermediate | React docs + profiler | 4 hours |
| SQL Server Migration | Not Started | Beginner | EF Core migration guide | 4 hours |
| Integration Testing | Not Started | Beginner | XUnit examples | 4 hours |

### Medium Priority (Important for V1.5+)

| Topic | Current Level | Target Level | Resources | Est. Time |
|---|---|---|---|---|
| Async/await with COM | Not Started | Intermediate | Task Parallel Library docs | 6 hours |
| Query Optimization | Beginner | Intermediate | SQL execution plans | 4 hours |
| Performance Testing | Not Started | Beginner | BenchmarkDotNet | 4 hours |

### Low Priority (Nice to Have)

| Topic | Current Level | Target Level | Resources | Est. Time |
|---|---|---|---|---|
| Neo4j (for V2) | Not Started | Beginner | Neo4j tutorial | 8 hours |
| Kubernetes (for scaling) | Not Started | Beginner | K8s docs | 16 hours |

---

## Best Practices Discovered

### ✅ What Worked Well

**1. Starting with Interface-Based Design**
- Dramatically improved testability
- Enabled mocking for unit tests
- Made code more flexible + maintainable
- Example: `IConnector` interface used everywhere

**2. Using Connector I as Reference**
- Saved weeks of COM API learning
- Proven patterns + best practices
- Team had confidence in implementation
- Recommendation: Document all M-Files patterns reused

**3. AI-Assisted Code Generation**
- 2x faster development (AI generates, human reviews)
- High code quality (includes error handling, logging, tests)
- Captures best practices automatically
- Recommendation: AI attribution in every file

**4. Comprehensive Unit Testing (80%+ coverage)**
- Caught bugs before production
- Enabled confident refactoring
- Documented expected behavior
- Recommendation: Don't skip unit tests (saves time long-term)

**5. Structured Logging from Day 1**
- Made debugging 10x easier
- Could query logs for specific scenarios
- Reduced "Where is this happening?" time
- Recommendation: Use Serilog patterns everywhere

### ⚠️ What to Improve

**1. Database Design Document**
- Would have prevented 2 schema revisions
- Recommendation: Create ERD before coding

**2. Performance Profiling Earlier**
- Discovered connection pooling benefits late
- Recommendation: Benchmark from start of each phase

**3. Integration Testing**
- Unit tests great, but integration tests caught more
- Recommendation: Pair unit + integration tests

---

## Lessons Learned

### Lesson 1: Dynamic Binding Resolves Accessibility From the Caller's Assembly
**Context:** Writing `MFilesComConnectorTests.cs` — COM test doubles (Task 1.1.2)  
**Problem:** Test doubles were `private` nested classes; every test hitting the `dynamic srvApp.Connect(...)` call site failed with `'object' does not contain a definition for 'Connect'`, even though `Connect` itself was `public`. `InternalsVisibleTo` was already declared (in the wrong direction) and didn't help.  
**Solution:** Made the fake types `public`. (The alternative — `internal` + `InternalsVisibleTo` — has to be declared on the assembly *containing the fakes*, granting access to the assembly *with the dynamic call site* — easy to get backwards, which is exactly what happened first.)  
**Takeaway:** The DLR binder checks accessibility from the calling assembly's perspective at the call site, not the declaring assembly's. A `private` type is invisible cross-assembly no matter what `InternalsVisibleTo` says (that only ever affects `internal`).  
**Applied to:** `ProvisioningAI.Tests/MFilesConnectors/MFilesComConnectorTests.cs` (see Pattern 8)  

### Lesson 2: IHttpClientFactory Hands You a Fresh Client Each Call — Don't Mutate It Twice
**Context:** `MFilesRestConnectorTests.cs` — first test run against a mocked `IHttpClientFactory`  
**Problem:** `MFilesRestConnector` set `client.BaseAddress = ...` after every `CreateClient()` call, in two different methods. The test's fake factory returned the *same* `HttpClient` instance every time (simpler to write) — the second `BaseAddress` assignment then threw `InvalidOperationException: This instance has already started one or more requests.`  
**Solution:** Moved `BaseAddress` configuration to registration time (`services.AddHttpClient(name, (sp, client) => client.BaseAddress = ...)` in `ConnectorFactory.cs`) instead of mutating it in the connector on every call. Also fixed the test fake to vend a fresh `HttpClient` wrapping a shared handler each call, matching what a real `IHttpClientFactory` actually does.  
**Takeaway:** Configure `HttpClient` properties once, at registration — not per-call in code that consumes `IHttpClientFactory`. Real factories return fresh wrapper instances each call specifically so you *can't* rely on mutating a previously-used one; a test double that reuses one instance will catch that mistake, a test double that doesn't, won't.  
**Applied to:** `ProvisioningAI.MFilesConnectors/ConnectorFactory.cs`, `MFilesRestConnector.cs`  

### Lesson 3: AI-Generated Code Needs Human Review
**Context:** Phase 1.1.2 implementation  
**Problem:** AI generated good code, but 5% had subtle bugs  
**Solution:** Implemented mandatory human review (30-50% of AI time)  
**Takeaway:** AI is starting point, not final solution  
**Applied to:** All subsequent AI-assisted development  

### Lesson 4: GUID Stability Across Vault Clones is CONFIRMED (but NOT yet for Restore)
**Context:** Determining the unique identifier strategy for the mapping template (claude.md §4.1).  
**Problem:** If vault cloning regenerated GUIDs for properties, object types, and value lists, the provisioning engine would fail to match structural elements and would have to fall back to fragile name-based lookups.  
**Solution:** Built a read-only COM probe querying identical entities (by name) across a source vault (`acme`) and its clone (`Conformity`).  
**Takeaway:** GUID stability across vault clones is CONFIRMED for structural objects (property defs, value lists, object types) via the COPY path. It is NOT yet confirmed for the new-identity RESTORE path — that probe is still pending. Do not describe it as "absolute" until restore is tested. Build on GUID-first identity, but keep a name-based fallback path available until the restore case is closed.  
**Applied to:** Phase 1.2 Entity Models and Phase 2.1 Vault Scanner

### Lesson 5: Structured Logging from Day 1
**Context:** Debugging Phase 1.2 database issues  
**Problem:** Generic logs ("Error: Something went wrong")  
**Solution:** Switched to semantic logging (Serilog)  
**Takeaway:** Invest in logging infrastructure early  
**Applied to:** All subsequent code  

## Session findings — Firebird two-tier architecture & GUID mechanism (2026-07-26)

TOPOLOGY (confirmed this session):
  Three tiers, not one.
    1. Firebird vault — MetaData.fdb, one file per vault, holds all
       vault structure. Copy/restore = file-level clone.
    2. SQL Server integration layer — MfilesData.dbo.Company etc.,
       holds ERP endpoints, tokens, credentials, keyed by company.
       This is the CP1/Compliance Kit layer, separate from the vault.
    3. External systems — Acomba (ERP), Fusion CP1 (OCR),
       Info Media (cloud broker). Config lives in them, not discoverable.

WHY GUIDS SURVIVE CLONES (mechanism, not luck):
  A vault copy clones the Firebird .fdb as one file-level unit, so
  structural GUIDs are preserved by construction. This is why the
  earlier clone test passed — and why it's trustworthy, not incidental.

THE INTEGRATION SURFACE IS SQL, NOT NVS:
  Original design assumed integration config lived in vault NVS, read
  by COM (fragile). It actually lives in dbo.Company — a plain SQL
  table with named columns. Read with SELECT, written with UPDATE.
  Order-of-magnitude simpler and more stable than parsing NVS.

BACKUP WALL EXPLAINED:
  Local backup of the vault DB is blocked because the vault is
  cloud-attached. But you don't need it — M-Files' own vault COPY
  produces a self-contained, GUID-stable clone. The copy IS the backup.

RESTORE BEHAVIOUR:
  Restoring over an existing vault fails on file collision
  (MetaData.fdb already exists, 0x8004006C), and M-Files forces
  new-identity restore when the source still exists. New identity =
  new vault GUID + new path. Structural-GUID preservation across
  restore is not yet probed.

TWO ONE-CLICK FOOT-GUNS:
  "Change Unique ID" reassigns a vault GUID. New-identity restore
  assigns a new one. Both can orphan an index keyed on vault_guid;
  discovery must detect via name-matches-but-GUID-doesn't.

PROVISIONING IS NOW TWO COUPLED WRITES (V2):
  Vault side (Firebird, GUID-keyed) and SQL side (dbo.Company,
  company-keyed) must be rewritten together or not at all. A partial
  rewrite looks successful and points at the wrong ERP.  

## Session findings — the onboarding shortcut & the three-stage arc

THE ONBOARDING SHORTCUT (changes V2's difficulty):
  Original plan assumed a from-scratch provisioning engine rewiring
  integration points by name. Discovered instead: M-Files' native vault
  copy/restore clones the whole Firebird vault (structure, workflows,
  GUIDs) as one file-level unit. So onboarding = native clone + rewire
  two known things (dbo.Company row + vault-side references), NOT vault
  reconstruction. The hard 90% is done by the platform; automation
  targets the last 10%.

EASY IS NOT SAFE:
  Because the clone is easy, the REWIRE is the entire risk surface — and
  the rewire is exactly what needs plan/apply. A wrong dbo.Company value
  silently points a customer at the wrong ERP; a half-done rewire leaves
  vault and SQL inconsistent. Both look successful.

THE DIFF TOOL IS THE BRIDGE AND THE SAFETY NET:
  V1.5 diff (compare two vaults' maps) is read-only and low-risk, but it
  is also literally V2's plan-preview mechanism. Building it early, where
  stakes are low, means V2's safety gate is already proven.

WORKFLOW INTEGRATION PATTERN — confirmed in BOTH vaults:
  Integration logic is embedded in workflow states. The two vaults are
  NOT directly wired to each other — they transact through the SHARED
  SQL tier (MfilesData: dbo.Company, dbo.Conformity, dbo.Master_DATA_CP1).
  State name prefixes are reliable auto-classification signals:
    SQL_*, UPD_*_CP1, UPD_To_CP1 — direct SQL tier writes
    WAIT_SYNCH_CSV                — waits on CSV sync via CP1
    UPD_EXPORT_VENDORLIST         — exports vendor data through CP1
    UPD_*_Acomba, *_Procore       — ERP-specific triggers
    Contrôle Apprentissage,
    UPD_Learning (YES/NO)         — learning-loop states: sync vendor
                                    data via CSV through CP1; flag as
                                    integration-touching
  V1 records these verbatim and flags by prefix/name pattern.
  Do NOT parse or interpret the SQL they invoke.

SQL SCAN CARDINALITY:
  Stages 1-8 (structure) run per vault over COM.
  Stage 9 (SQL) runs ONCE across both vaults — read MfilesData and
  associate rows to each vault by company. Do NOT scan it per-vault.
  Cross-vault links resolve THROUGH the shared CP1 rows in the index.

EXTERNAL SOURCES ARE AN INTEGRATION SURFACE:
  Conformity's "Connections to External Sources" (File Sources + Mail
  Sources) is the inbound document path (OCR/Fusion feeds in here).
  Customer-specific (which path, which mailbox), discoverable over COM,
  must be captured.

## Session findings — Stage 1 scanner (2026-07-26)

STAGE 1 LIVE-VERIFIED against real Conformity_CP1_Tergos vault:
  VaultGuid    : {008446DF-32AA-4E9C-8C43-9FEC4D0A1203}
  VaultName    : Conformity_CP1_Tergos.mfb
  Action       : Inserted (first scan)
  GetOnlineVaults() is the correct and confirmed GUID source.

VAULTSTRUCTURE IS A SPECIAL-CASE REPOSITORY:
  VaultStructure's natural key is VaultGuid alone (not the usual
  (VaultGuid, Guid) composite). The GenericRepository doesn't apply.
  VaultStructureRepository handles it with FindByGuidAsync and
  FindByNameAsync (for the §4.6 foot-gun check).

§4.6 FOOT-GUN CHECK WORKS IN TESTS:
  GuidChangedWarning path: GUID unknown + name matches = don't write,
  log warning, return warning action. Covered by unit test with in-
  memory SQLite. Does NOT require a live vault.

DISCOVERY CSPROJ MUST TARGET net8.0-windows:
  Discovery references MFilesConnectors which references COM Interop
  (net8.0-windows). Any project that references Discovery (including
  the Api) must also target net8.0-windows, not net8.0.

---

## Session findings — Conformity AP pipeline (vendor training doc) (2026-07-26)

Received the vendor's own training material for the Conformity AP
process. It corrected and completed several things:

- Pipeline is 5 systems, not 3: Mail Downloader -> Capture Point/CP1 ->
  M-Files Conformité -> M-Files Approbation -> M-Files Archive.
- "Apprentissage" is vendor-identity resolution (bind a unique ID to a
  vendor once), not OCR error correction. Field-level learning (custom
  extraction prompts) is a separate, dependent step — vendor learning
  must happen first.
- Company detection is a third mechanism, integrator-configured, not
  customer-editable — distinct from both vendor learning and static
  config.
- CP1 keeps real customer-specific config as M-FILES PROPERTIES
  (CP1-VendorID, Lien CP1, etc.), not only in external SQL — so the
  vault-side property scan (stage 3) is part of the CP1 integration
  surface, not just NVS/SQL.
- Structured invoice format is a hard requirement; non-conforming
  vendors are custom dev scope, not config variance.

DECISION: Acomba/Info Media confirmed as the EXCEPTION, not the pattern.
Project focus stays vault + ERP, direct connection as the default case.
Do not generalize the broker pattern into the architecture or the
scanner design.

This document is the de facto SPEC for the "OCR feedback" add-on
candidate discussed earlier — when that redesign is scoped, start here
rather than reverse-engineering it from workflow state names.

Full detail recorded in claude.md §4.4.1 (context only — does not
change discovery scope, see that section for the complete pipeline
breakdown, Apprentissage sub-modes, and the CP1 property list).

---

## Session findings — the ".mfb" name was never a bug (2026-07-26)

Asked to "confirm the stage-1 fix" for VaultName showing
"Conformity_CP1_Tergos.mfb" instead of a clean name. Investigated
before touching anything — READ THE CODE FIRST, then verified live:

- VaultIdentityScanner.cs already sources VaultName exclusively from
  GetOnlineVaults()'s .Name property, via IMFilesConnector.ListVaultsAsync.
  No file-path-reading code exists anywhere in the scanner or connector.
- Built a throwaway console harness (project-referencing the real
  MFilesComConnector, ProvisioningAiDbContext, and VaultIdentityScanner
  — not a PowerShell mimic) and ran Stage 1 for real against the live
  Conformity vault. Same result: VaultName = "Conformity_CP1_Tergos.mfb".
- Confirmed with a raw GetOnlineVaults() call outside any of our code:
  M-Files itself returns ".mfb" as this vault's real, current Name.

CONCLUSION: not a bug. Whoever attached/restored this vault in M-Files
Admin left it registered under its backup-file-derived name. The
scanner faithfully recording that IS correct behavior per claude.md
§4.1 (Name is a mutable label, refresh every scan — don't sanitize
it). The real fix, if wanted, is renaming the vault in M-Files Admin,
not a code change. The §4.6 test fixture's ".mfb" constant was already
accurate — nothing to fix there either.

TAKEAWAY: when asked to "confirm a fix," check whether the described
bug actually exists in the code before assuming it does and patching
around it. A live re-run through the real production path (not just a
raw COM probe) is what actually settles whether something is a code
defect or an upstream data fact.

---

## Session findings — Stage 2 scanner: value lists + items (2026-07-26)

STAGE 2 LIVE-VERIFIED against real Conformity_CP1_Tergos vault
({008446DF-32AA-4E9C-8C43-9FEC4D0A1203}): 17 value lists, 144 items.
CORRECTED later the same day to 6 value lists / 6 items — see the
"built-in vault structure" session finding further down. The RealObjectType
filter mechanics described below are still accurate; a second filter
was added on top of them, not instead.

IVAULTHANDLE EXTENDED FOR CONTENT READS, NOT JUST IDENTITY:
  Module 1's IVaultHandle only had VaultGuid/VaultName. Stage 2 needed
  to read ValueListOperations/ValueListItemOperations, which only exist
  on a logged-in COM Vault object — no COM type may leak past
  MFilesConnectors (claude.md §4.3), so the fix was adding
  GetValueListsAsync()/GetValueListItemsAsync(int) to IVaultHandle
  itself, returning plain ValueListInfo/ValueListItemInfo records.
  VaultHandle implements them with the same dynamic-dispatch +
  CloseComObjectSafe-per-item discipline as MFilesComConnector's
  EnumerateVaults.

GetValueLists() RETURNS TWO DIFFERENT THINGS IN ONE COLLECTION:
  Confirmed live: the COM call returns items shaped like ObjectType
  (NameSingular, RealObjectType, no plain .Name) that mix BOTH real
  object types (RealObjectType=true, e.g. Document) and true value
  lists (RealObjectType=false, e.g. Class, Workflow). M-Files models a
  value list as a special case of object type under the hood. The
  scanner filters to RealObjectType==false — this is scoping to the
  stage's target, not "interpreting" the data; every field is still
  recorded verbatim.

GetValueListItems(id, bool) — SECOND ARG STILL UNCONFIRMED:
  Both true/false returned identical counts in the one live sample
  checked. Went with `true` (don't silently exclude anything) since
  each item's own .Deleted flag is what actually distinguishes live
  from removed entries, not this argument. Flagged, not resolved.

ONE TRANSACTION ACROSS TWO ENTITY TYPES NEEDED A REPOSITORY CHANGE:
  GenericRepository.UpsertManyAsync opens its own transaction
  internally — calling it twice (once for ValueLists, once for
  ValueListItems) would create two separate transactions, breaking
  "lands completely or not at all." Fix: extracted the loop body into
  UpsertManyNoTransactionAsync (added to IRepository<T> too); the
  scanner opens ONE outer transaction via the shared DbContext and
  calls the no-transaction variant for both entity types, then commits
  once. UpsertManyAsync itself is unchanged for existing callers.

TEST FIXTURES NEED A REAL VAULTSTRUCTURE + DISCOVERYSCAN ROW:
  Every entity table FKs to VaultStructures(VaultGuid) (claude.md §4.2),
  and LastSeenScanId FKs to DiscoveryScans(ScanId). In-memory-SQLite
  scanner tests that skip seeding those rows fail with a generic SQLite
  "FOREIGN KEY constraint failed" — not obviously about the missing
  seed row unless you know the schema already carries those FKs. Same
  root cause as the earlier "{CLASS}" placeholder-GUID mistake in
  EntityFactoryTests: test fixtures need to satisfy the same
  constraints as production data, not shortcut them.

VALUELIST/VALUELISTITEM GAINED Create() FACTORIES (NOT SCHEMA):
  These two models existed (built by a parallel session) but had no
  Create() factory applying GuidGuard, unlike every sibling entity.
  Added them to match ObjectType's pattern exactly — this is adding
  ingest-time validation behavior, not a schema change, so it didn't
  violate the "add nothing new to the schema" constraint for this task.

---

## Session findings — built-in vault structure hiding in "value lists" (2026-07-26)

USER CAUGHT A REAL BUG BY ASKING HOW STAGE 2's FILTER RELATES TO STAGE 4:
  Question was "does Stage 4 (object types/classes) rely on the same
  filter mechanism as Stage 2, or could something slip through uncaught."
  Answering it properly meant re-probing GetValueLists() in full instead
  of trusting the earlier sampled output, which surfaced something the
  original Stage 2 work missed entirely.

ValueListOperations.GetValueLists() RETURNS BUILT-IN STRUCTURE TOO:
  RealObjectType=false does NOT mean "customer value list." It also
  covers Class, Class group, Version label, Traditional folder, External
  source, User, Workflow, State, User group, State transition, Source —
  vault STRUCTURE that claude.md §4.4 assigns to its own dedicated later
  stages (classes; workflows/states/transitions; users/groups/ACLs).
  Stage 2's original filter (RealObjectType==false alone) let all of
  these through, meaning the first live run's "17 value lists / 144
  items" included 11 built-in entries — Class, Workflow, State, etc. —
  that don't belong in ValueList/ValueListItem at all.

THE FIX IS A DOCUMENTED SDK ENUM, NOT A HEURISTIC:
  Confirmed via .NET reflection against the real, installed
  Interop.MFilesApi.dll (26.6.16115.9) — NOT from memory, NOT from an
  ID-range guess, NOT a hardcoded name list. `MFilesAPI.MFBuiltInValueList`
  is a real public enum whose 11 relevant members (Classes=1, ClassGroups=2,
  VersionLabels=3, TraditionalFolders=4, ExternalLocations=5, Users=6,
  Workflows=7, States=8, UserGroups=16, StateTransitions=17, Sources=18)
  match every built-in entry observed live, exactly, by ID. These are
  M-Files SDK constants — identical across every installation, never
  vault-specific — so referencing the integers isn't the "hardcoded ID"
  risk claude.md §4.1 warns about (that's about customer content IDs
  that shift between clones). See MFilesBuiltInValueListIds.cs.
  HOW TO REFLECT ON AN INTEROP DLL WITHOUT ADDING A PROJECT REFERENCE:
  `[System.Reflection.Assembly]::LoadFrom($dllPath)` from PowerShell,
  then `.GetTypes()` / `[System.Enum]::GetNames(...)` — confirms enum
  members and interface signatures (e.g. IObjectType.RealObjectType is
  a plain Boolean, not an object-type-ID mapping) without needing the
  DLL wired into the actual C# project.

RESULT AFTER THE FIX: 6 value lists / 6 items (XCompany, crédit, XDate,
découpe, XtractLearning, XCurrency) — every built-in entry now excluded
before any item-fetch is attempted (confirmed via a Moq .Verify that
GetValueListItemsAsync is never called for an excluded built-in ID).

TAKEAWAY FOR STAGE 4: reuse GetValueListsAsync() filtered to
RealObjectType==true, rather than introducing a separate
ObjectTypeOperations.GetObjectTypes() COM call. One COM collection, two
stages partitioning it by the same already-verified flag, means the two
stages can't disagree about which object belongs where — a second COM
entry point could silently drift from the first without anyone noticing
until the counts don't add up.

---

## Session findings — Stage 3 scanner: property definitions (2026-07-26)

STAGE 3 LIVE-VERIFIED against real Conformity_CP1_Tergos vault: 200
property definitions, built-in (Name or title, Created, Last modified)
and customer-created (Check_Credit, SQLQueryFAIL, Projet_No, ...) alike,
all in the same table — unlike Stage 2, there's no known overlap with a
later stage here, since property definitions are their own single stage
in claude.md §4.4's dependency order.

PropertyDef.Required DOES NOT EXIST — Property.IsRequired WAS A BAD
ASSUMPTION BAKED IN BEFORE LIVE VERIFICATION:
  Live probe of PropertyDefOperations.GetPropertyDefs() found 30 real
  members (AccessControlList, DataType, GUID, ID, Name, ValueList,
  BasedOnValueList, Predefined, ...) — no Required or IsRequired member
  anywhere. This makes real M-Files sense: "required" isn't global to a
  property definition (which is vault-wide and reusable) — it's a
  per-CLASS setting (which classes require which properties). The
  Property entity's IsRequired bool (built by a parallel session before
  this was checked live) had no way to be populated truthfully.
  USER DECISION: drop IsRequired from the schema now (migration
  DropPropertyIsRequired); model it properly later as a Class<->Property
  association (e.g. ClassProperties: ClassGuid, PropertyGuid, IsRequired)
  when the classes stage is built. Don't stub a fake value in the
  meantime — that's exactly the "silent degrade" claude.md §4.1 prohibits.

TAKEAWAY: a sibling entity model built by a different session can encode
an assumption nobody live-checked yet. When a stage is about to consume
that model, verify the COM shape actually supports every field on it
before writing the scanner — don't assume an existing column is populatable
just because it compiles.

---

## Session findings — Stage 4 investigation: verifying RealObjectType, ClassOperations shape (2026-07-26)

DON'T JUST CITE AN ENUM — RECONCILE AGAINST THE ALTERNATIVE SOURCE WHEN ONE EXISTS:
  User pushed back on the Stage 4 recommendation itself: confirming
  RealObjectType==false maps to MFBuiltInValueList (done for Stage 2's
  fix) does NOT automatically prove RealObjectType==true means "real
  object type" — "not a known built-in value list" and "is definitely a
  real object type" are different claims. Stronger check used here:
  fetched real object types two independent ways (GetValueLists()
  filtered true, vs. the dedicated ObjectTypeOperations.GetObjectTypes())
  and diffed the sets directly — exact match, 12/12, zero mismatches.
  Reconciling against an alternative retrieval path is stronger evidence
  than an enum-membership argument alone; use this technique again
  whenever a COM flag's completeness (not just its existence) is in
  question.

EXTERNAL AND REALOBJECTTYPE ARE INDEPENDENT FLAGS:
  Vendor/Company/CP1/Conformity are real object types (RealObjectType=
  true) that are ALSO External=true (M-Files' external-repository
  feature, e.g. object data synced from an outside database). Don't
  conflate "external" with "not a real object type" — they answer
  different questions.

CLASSOPERATIONS SHAPE (GetAllObjectClasses(), 14 classes in Conformity):
  Same GUID-naming gotcha as ValueListItem: class entries have
  `.ItemGUID`, not `.GUID` (`.GUID` reads blank on this shape). And
  `.ObjectType` on a class entry is the owning object type's NUMERIC ID
  (e.g. Approver's class has ObjectType=116), not its GUID — Class.
  ObjectTypeGuid needs an ID->GUID resolution step built from the same
  scan's already-known object types, per claude.md §4.1's GUID-first
  resolution order (never store a bare numeric ID as if it were
  identity). No Required-type member on this shape either, consistent
  with PropertyDef's earlier finding.

---

## Session findings — Stage 4 scanner: object types + classes (2026-07-26)

STAGE 4 LIVE-VERIFIED against real Conformity_CP1_Tergos vault: 12
object types, 14 classes — after the RealObjectType empirical
verification (previous entry) confirmed the shared-collection design
was safe to build.

CLASSES REFERENCE THEIR OBJECT TYPE BY NUMERIC ID, NOT GUID:
  ClassInfo.ObjectTypeMFilesId (from the COM `.ObjectType` property) is
  a plain int — M-Files does not hand back the owning object type's
  GUID directly on a class entry. Resolved it in the scanner via a
  dictionary built from the SAME scan's object-type results (MFilesId ->
  Guid), not a second lookup call — one scan, one source of truth for
  both directions. A class whose ObjectType ID isn't in that dictionary
  throws InvalidOperationException rather than writing a half-resolved
  row; claude.md §4.1 treats a GUID mismatch on a fallback path as an
  error, not a warning, and an unresolvable numeric reference is the
  same category of problem.

ADDING A FIELD TO AN EXISTING RECORD WITHOUT BREAKING CALL SITES:
  ObjectType.DisplayName needed NamePlural, which ValueListInfo didn't
  originally capture (only NameSingular, per Stage 2). Rather than
  adding it as a new required positional parameter (which would have
  forced updating every existing ValueListInfo(...) call site across
  Stage 2's scanner and tests), added it as a trailing OPTIONAL
  parameter with a default (`string? NamePlural = null`) — C# lets
  positional record/constructor calls omit trailing optional args, so
  every pre-existing call site kept compiling unchanged. Useful pattern
  whenever a later stage needs one more field off an already-established
  DTO that earlier stages don't care about.

SIBLING ENTITY GAPS KEEP SHOWING UP THE SAME WAY:
  Class.cs (built by a parallel session) had no Create() factory either
  — third time this pattern has appeared (ValueList/ValueListItem before
  Stage 2, now Class before Stage 4). Worth checking for a Create()
  factory on ANY entity a new stage is about to write to, not just
  assuming one exists because the entity compiles.

---

## Session findings — Task A: rebuilding IsRequired as ClassProperty (2026-07-27)

CLOSED THE GAP FLAGGED IN STAGE 3: Property.IsRequired was dropped
(migration DropPropertyIsRequired, 2026-07-26) because PropertyDef has
no Required member on the real COM shape — required-ness is a
per-class setting. The plan noted then was to rebuild it as a
Class<->Property association once Class existed with a Create()
factory (true after Stage 4). Done this session.

THE ASSOCIATION DATA WAS ALREADY SITTING ON A COM OBJECT STAGE 4
ALREADY ENUMERATES — NO NEW COM CALL NEEDED:
  Confirmed via .NET reflection against the installed
  Interop.MFilesApi.dll (26.6.16115.9) BEFORE writing any code (same
  discipline as the Stage 2 built-in-value-list fix and Stage 4's
  RealObjectType reconciliation): IObjectClass — the exact shape
  ClassOperations.GetAllObjectClasses() already returns — exposes
  .AssociatedPropertyDefs, a collection of IAssociatedPropertyDef, each
  with .PropertyDef (the property definition's NUMERIC ID, not GUID)
  and .Required (bool). Extended VaultHandle.GetClassesAsync() to read
  this off the same class object already being enumerated and released,
  rather than adding a second ClassOperations walk. ClassInfo gained an
  optional AssociatedProperties field (defaulted to null), same
  trailing-optional-parameter trick as ObjectType's NamePlural in Stage
  4 — every pre-existing ClassInfo(...) call site (tests, Stage 4's
  scanner) kept compiling unchanged.

HOW TO REFLECT ON A NESTED COM COLLECTION TYPE, NOT JUST A TOP-LEVEL
ONE: `$asm.GetType('MFilesAPI.IObjectClass').GetProperty('AssociatedPropertyDefs').PropertyType.FullName`
gives you the collection's element type name directly from the
property's declared type — then reflect on THAT type
(IAssociatedPropertyDef) for its members. Faster than guessing a type
name and checking if it exists.

CLASSPROPERTY NEEDED ITS OWN REPOSITORY, SAME PATTERN AS
WORKFLOWTRANSITION: its natural key is (VaultGuid, ClassGuid,
PropertyGuid), not (VaultGuid, Guid) — GenericRepository<T>'s default
MatchEntity looks for a "Guid" property and throws
"could not be found" if the entity doesn't have one. Fix:
ClassPropertyRepository : GenericRepository<ClassProperty> overriding
MatchEntity, exactly like WorkflowTransitionRepository. Caught this by
actually running the tests, not by inspecting the code — the compile
succeeded fine since IRepository<ClassProperty> doesn't care which
concrete repository backs it.

FK-SEEDING LESSON REPEATED A THIRD TIME: ClassProperty FKs to both
Class(VaultGuid, Guid) and Property(VaultGuid, Guid). The in-memory
SQLite test fixture initially only seeded VaultStructure +
DiscoveryScan (matching Stage 4's test fixture) and hit a generic
SQLite "FOREIGN KEY constraint failed" with no further detail — same
root cause and same generic error message as Stage 2's original
FK-seeding gap (skills.md, Stage 2 section). Fix: seed a real
ObjectType + Class + Property row too. Test fixtures must satisfy the
same constraints as production data; this is now the third time this
exact lesson has recurred (Stage 2, then again for
EntityFactoryTests's placeholder-GUID mistake, now here) — worth
checking FK dependencies on ANY new entity's test fixture before
assuming VaultStructure + DiscoveryScan alone is enough.

STAGE 1/3/4 + TASK A LIVE-VERIFIED TOGETHER AGAINST REAL CONFORMITY
({008446DF-32AA-4E9C-8C43-9FEC4D0A1203}) via a throwaway console
harness (same "project-reference the real connector and DbContext, not
a PowerShell mimic" pattern as prior stages), run against the actual
persisted provisioning.db rather than a disposable in-memory one —
first time a live run built on top of previously-scanned real data
instead of a fresh throwaway DB:
  Stage 1: Updated Conformity_CP1_Tergos.mfb
  Stage 3: 200 property definitions
  Stage 4: 12 object types, 14 classes
  Task A: 242 class<->property associations
  92/92 unit tests passing (5 new).
See progress.md for the full sample output (Invoices and Vendor
classes' required/optional property lists).

---

## Session findings — Stage 5: workflows, states, transitions (2026-07-27)

OVERLAP QUESTION RESOLVED BEFORE WRITING ANY CODE, THIRD TIME THIS
PATTERN HAS PAID OFF: same discipline as Stage 2's built-in-value-list
fix and Stage 4's RealObjectType reconciliation. Confirmed via
reflection that IVaultWorkflowOperations.GetWorkflowsAsValueListItems()
returns the exact same ValueListItems COM type Stage 2 already reads —
the "Workflow" value-list entry (id=7, RealObjectType=false) IS a
value-list VIEW of the same real workflows, not a coincidence. Same
applies to States (id=8). Since Stage 2 already excludes all built-in
IDs, there was never a duplicate-write risk — but this stage NEEDED
those two built-in value lists anyway, for a different reason: IWorkflow
and IState expose no .GUID property at all (same gotcha as Class
needing .ItemGUID instead of .GUID). GUIDs come from the built-in value
lists; structure (states, transitions, guard data) comes from the
separate WorkflowOperations.GetWorkflowsAdmin() call — two
complementary sources, not two views of the same thing.

A THIRD SIBLING-ENTITY ASSUMPTION CAUGHT BEFORE IT SHIPPED — BUT THIS
ONE WASN'T A MISTAKE TO DROP, IT WAS A REAL GAP TO FILL: WorkflowState.
IsInitial/IsFinal are required non-nullable booleans (built by a
parallel session, same as Property.IsRequired and Class needing a
Create() factory before it). Exhaustive reflection across the ENTIRE
Interop.MFilesApi.dll (every type, every member) found no Initial/
Final/Start/Terminal concept anywhere — MFStateFlags only has None/
TechnicalState. Distinction from IsRequired (which got dropped because
the CONCEPT didn't exist at all): initial/final states are a real,
undisputed fact about every workflow — the SDK just doesn't expose a
flag for it. User decision: derive structurally from the transition
graph scanned in this same stage (no incoming edge = initial, no
outgoing edge = final), explicitly flagged as heuristic, not
SDK-confirmed — same honesty standard as IsIntegrationTouching.

THE HEURISTIC GOT A REAL STRESS TEST, AND SOMETHING BETTER TURNED UP:
user asked, before trusting the heuristic broadly, to check Conformity's
real transition data for a loop back to the start state (which would
break "no incoming edge = initial"). It exists: transition MFilesId=56,
"Control Duplicate" -> "RTE-NewDocument_+_CLEAN_PO" ("1-Fix Value and
Restart") is a genuine cycle. Investigating it surfaced something
stronger than the heuristic entirely: transition MFilesId=177 has
FromState MFilesId=0 (M-Files' own "workflow entry" pseudo-state,
confirmed as the ONLY transition with FromState=0 in the vault), and
ITS target IS the real starting state. This is authoritative, not a
guess — the scanner now uses "has an incoming transition FROM the
pseudo-state 0" as the PRIMARY signal for IsInitial, falling back to
the no-incoming-edge heuristic only for workflows with no such marker
at all. Neither this entry marker nor a hypothetical symmetric
ToState=0 "exit" marker (not observed in this vault) gets a
WorkflowTransition row — there's no real state on one side to
reference — they inform IsInitial/IsFinal only.
TAKEAWAY: asking "does this heuristic have a known failure mode, and
does the data we're about to scan actually contain one" turned a
flagged-but-untested assumption into a verified, stronger mechanism,
in the same session, before it ever shipped as heuristic-only.

GUARD CONDITIONS VERBATIM VIA M-FILES' OWN EXPORT, NOT OURS:
TriggerCriteria is a rich SearchConditions COM object with no ToJSON.
ISearchConditions.GetAsExportedSearchString(MFSearchFlags) is real
(confirmed via reflection) — M-Files' OWN textual serialization of its
condition object. Real captured output looks like
"04002000001000000R00000100000AG4000..." — opaque, not human-readable,
exactly what "store verbatim, don't interpret" means when the source
system's own export format isn't meant for humans either. Stored
alongside TriggerMode/TriggerInDays/TriggerAllowedByVBScript as one
JSON blob in WorkflowTransition.GuardConditions.

ACTIONS LIVE ON THE STATE, NOT THE TRANSITION — A REAL M-FILES FACT,
NOT AN OMISSION: confirmed via reflection (IStateAdmin's 9
ActionSetPermissions/ActionDelete/.../ActionCreateSeparateAssignment
boolean flags plus typed *Definition properties) that M-Files has NO
actions concept at the transition level at all. WorkflowTransition.
Actions is therefore always null in practice — verified, not a gap.
The REAL gap: WorkflowState has no schema column for its own guard
(Preconditions/Postconditions, IStateAdmin) or actions either — this
data exists live in the vault but isn't captured this stage, per the
"no new schema beyond what this stage needs" constraint. Flagged as an
open item, not silently dropped.

REFLECTING ON A NESTED COM COLLECTION'S ELEMENT TYPE DIRECTLY, AGAIN
USEFUL HERE: `$asm.GetType('MFilesAPI.IObjectClass').GetProperty(...)
.PropertyType.FullName` (first used for Task A's AssociatedPropertyDefs)
was reused to find IWorkflowAdmin.States -> StatesAdmin -> IStateAdmin,
and IWorkflowAdmin.StateTransitions -> StateTransitions -> IStateTransition,
without ever guessing a type name.

NAMESPACE COLLISION: ProvisioningAI.Workflow (the empty V1.5 scaffold
project, per claude.md §2.2) collides with the Workflow entity type in
any file that references both — Tests project does, since it
references every project. A `using Workflow = ...;` alias surprisingly
did NOT resolve this (still got CS0118 "is a namespace but is used like
a type" even with the alias present) — the working fix was fully
qualifying `ProvisioningAI.Data.Models.Workflow` at each use site
instead. Worth trying the alias first since it's cleaner when it works,
but don't assume it always will — verify by rebuilding.

LIVE-VERIFIED against Conformity: 1 workflow, 47 states, 64
transitions, 18 integration-touching states, 3 integration-touching
transitions. 101/101 unit tests passing (9 new). Full guard-condition
samples and the complete integration-touching name list are in
progress.md.

---

## Session findings — closing the WorkflowState guard/action gap (2026-07-27)

USER REJECTED "DOCUMENTED GAP" AS A CLOSING STATE FOR STAGE 5: flagging
that state-level actions exist but aren't captured was correctly read
as leaving the more important half of the business-logic evidence on
the table — a state name like UPD_To_CP1 only tells you it PROBABLY
touches the SQL tier; the action data tells you WHAT it actually does.
Same principle as the IsRequired/ClassProperty fix to Stage 4: a real
gap gets closed in the same session, not carried as a TODO.

THE SHAPE QUESTION HAD A CONCRETE ANSWER, WORTH CONFIRMING BEFORE
CODING (same discipline as every prior stage): IStateAdmin exposes 9
boolean action-enabled flags plus a typed "Definition" object per
action kind (IActionSendNotification, IActionCreateAssignment [reused
for both ActionAssignToUserDefinition and
ActionCreateSeparateAssignmentDefinition — same shape], IActionSetProperties,
IActionSetPermissions [detailed variant, since it also carries
DiscardsAutomaticPermissions], IActionConvertToPDF). Structured, not
opaque — confirmed via reflection before writing any code.

EVERY SUB-OBJECT HAS ITS OWN NATIVE SERIALIZATION — USE IT INSTEAD OF
HAND-DECODING:
  - TypedValue.ToJSON() for ActionSetProperties' fixed values (already
    known from Task A's reflection pass, reused here).
  - AccessControlList.GetAsBytes() (raw byte[], Base64-encoded for JSON
    storage) for ActionSetPermissions — M-Files' own binary ACL
    serialization, not walked into individual ACEs (that's Stage 6).
  - SearchConditions.GetAsExportedSearchString() for Preconditions/
    Postconditions property conditions — same mechanism already used
    for transition TriggerCriteria, now reused for state guards too.
  - Recipient/assignee IDs (IUserOrUserGroupID: UserOrGroupType +
    UserOrGroupID) and property-def IDs stored as raw numeric IDs, not
    resolved to names — deliberately left for Stage 6 (users/groups)
    or the property-scan machinery (Stage 3) to resolve later, keeping
    this stage's scope to CAPTURE, not cross-stage resolution.
TAKEAWAY: when a rich COM object needs verbatim capture and has no
obvious serialization, check adjacent/nested objects for one before
assuming you need to hand-walk fields — TypedValue, PropertyValues,
and AccessControlList all had one; only the outermost wrapper types
(IActionSendNotification, IActionCreateAssignment, etc.) needed
explicit field-by-field mapping into plain records.

ONLY READ A DEFINITION WHEN ITS FLAG IS TRUE: COM always returns a
valid-but-default object for an unset action definition (never null) —
reading it unconditionally would capture meaningless defaults as if
they were real data. Guard every *Definition read behind its
*boolean flag, mirroring the Count>0 check already used for
TriggerCriteria/PropertyConditionsDefinition.

REAL PAYLOAD, LIVE-VERIFIED — THIS IS WHAT THE FIX WAS FOR: captured
actual VBScript business logic, not just flags. RTE_InvoicesWithoutPO/
RTE_InvoicesPO/RTE_PackingSlip all carry a real approver/vendor/total
validation script (resolves PD.VendorList, PD.InvoiceDate, PD.Total,
PD.PurchaseOrder, PD.DeliveryNumber by alias; raises MFScriptCancel
with real French error messages when a required field is empty or a
total is zero). Contrôle Apprentissage has ActionAssignToUser=true
(creates a real M-Files assignment) AND a SetProperties fixed value
referencing "Sélection de Découpe Automatique dans la fiche
Fournisseur" — the actual Apprentissage/vendor-learning step
claude.md §4.4.1 has referenced structurally since the vendor training
doc was read, now visible as a real, stored action rather than an
inferred concept. END has ActionDelete=true, confirming it's a genuine
terminal cleanup state, not just named "END". Several states' fixed
SetProperties values are real vendor lookups by GUID+name (e.g.
"Tergos Construction", ext ID "TERGOS").

104/104 unit tests passing (3 new). 23 of 47 Conformity states have at
least one action enabled; 6 have a non-trivial guard condition. Full
JSON samples in progress.md.

---

## Session findings — Stage 6: users, groups, named ACLs (2026-07-27)

TWO MORE ENTITIES WITH NO GUID PROPERTY, SAME GOTCHA AS
CLASS/WORKFLOW/STATE — BUT WITH A TWIST: IUserAccount and IUserGroup
both lack .GUID (confirmed via reflection, expected by this point).
The twist: unlike Workflow/State, this stage ALSO has an entity that
does carry a real .GUID directly — INamedACL. Checked each COM shape
individually rather than assuming the whole stage needed the
value-list workaround; would have added an unnecessary reconciliation
step for NamedACL if assumed uniform.

VALUE-LIST GUID RESOLUTION VERIFIED LIVE BEFORE ASSUMING IT WOULD WORK
THE SAME WAY A THIRD TIME: built a tiny standalone diagnostic (not the
full scanner) calling GetValueListItemsAsync(6) and (16) directly
against Conformity before writing any Stage 6 code. Confirmed both
carry real GUIDs, including 5 negative-ID pseudo-users ("(current
user)", "(external source)", "(M-Files AI)", "(M-Files Server)",
"(current user and users for whom the current user is a substitute)")
alongside 2 real named accounts. Cheaper to spend 10 minutes confirming
this than to build the full scanner assuming it and finding out via a
live-run exception.

GetUserAccounts() AND THE USERS VALUE LIST ARE NOT THE SAME SET —
ANOTHER GENUINE TWO-SURFACES-NOT-ONE FINDING: GetUserAccounts()
(the admin-facing real-account list) returned only 2 entries on live
Conformity; the Users(6) value list returned 8 (the same 2 accounts
plus 5 pseudo-users). Confirms these are two different COM surfaces
serving different purposes, not one reconciled view like
Workflow/GetWorkflowsAsValueListItems() turned out to be. Also: the
value list's display Name for MFilesId=50 ("Harry joseph") differs
from GetUserAccounts()'s LoginName for the same ID
("DESKTOP-DKCS42P\owner") — a real display-name-vs-login-name
distinction, not a data conflict, and a reminder that "same MFilesId"
doesn't imply "same field means the same thing" across COM shapes.

PREDEFINED GROUPS HAVE EMPTY MEMBERS — LEARNED BY TRYING TO SHOW A
LIVE EXAMPLE AND FINDING NONE: both of Conformity's real groups ("All
internal users", "All internal and external users") are Predefined and
returned an empty IUserGroup.Members collection live. M-Files computes
their membership implicitly from user-type flags rather than storing
an explicit member list — not a scanner bug, a real property of
predefined groups. Consequence: the UserGroupMember resolution feature
(built and unit-tested with realistic mock data) has zero real rows to
show from this vault. Said so plainly in the deliverable rather than
manufacturing a misleading "0 members" framing or quietly omitting the
gap — the code path is verified, the live vault just doesn't exercise it.

STAGE 5's DEFERRED RESOLUTION, CLOSED AS A QUERY-TIME SERVICE, NOT A
SCHEMA REWRITE: WorkflowActionResolver joins the already-stored
verbatim Stage 5 JSON against the newly-populated UserAccount/
UserGroup/Property tables without ever touching the stored JSON itself
— resolution is presentation, not re-ingestion. MFUserOrUserGroupType
mattered here: type 1 (UserAccount) and type 3 (PseudoUser) BOTH
resolve against UserAccounts (pseudo-users are real Users-value-list
entries, confirmed above), type 2 against UserGroups, type 4
(PropertyBasedPseudoUser — the actual principal is determined per-
object from a property value at runtime) has no static name and
correctly resolves to null rather than guessing. Real resolved
examples pulled from Conformity's own Stage 5 data: PropertyDefMFilesId
1066/1146/1153/1079/1165 -> SearchCount/Decoupe_message/Conformity/SQL
Ready/Check_Credit.

117/117 unit tests passing (13 new). Live: 2 users, 2 groups, 0
memberships, 4 named ACLs. Full output in progress.md.

TAKEAWAY, FLAGGED EXPLICITLY BY THE USER RATHER THAN LEFT IMPLICIT:
"passes on Conformity" and "verified" are not the same claim when the
live vault's real data happens to never exercise a code path — 0 real
memberships means UserGroupMember is unit-tested-only, not live-
verified, no matter how clean the Conformity run looked. Tracked as a
named open item in progress.md ("KNOWN GAP — UserGroupMember...") with
an explicit instruction to watch the first vault scan that reports
MembershipsScanned > 0 as the real first-time validation, not a
formality.

---

## Session findings — Create() factory enforcement + Stage 7: Views (2026-07-27)

FIXING THE TEMPLATE, NOT THE Nth INSTANCE: user pushed back on treating
a third recurring gap (Class, then UserGroup/NamedAcl all shipped
without Create()) as three separate one-off fixes — asked whether it
should be a shared base pattern instead. A base class doesn't fit
(every Create() has a different parameter list — nothing to inherit).
The actual fix: an architecture test (EntityCreateFactoryConventionTests)
that reflects over ProvisioningAiDbContext.Model.GetEntityTypes() and
fails the build if any entity with a bare "Guid" property lacks a
public static Create(). Converts "forgot it" from silent to loud.
KEY TAKEAWAY: this isn't deduplication (each Create() still repeats its
own GuidGuard calls) — it's making the OMISSION itself impossible to
ship quietly, which is the actual failure mode that recurred three
times, not duplicated logic.

THE FOURTH INSTANCE WAS ALREADY THERE BEFORE THE TEST EVEN RAN:
checking all 21 model files before writing the test found View.cs —
literally the entity Stage 7 was about to consume — already missing
Create(), confirming the user's prediction in real time rather than
hypothetically. Fixed it, then the new test passed clean for all
existing entities. Exactly the loop this test exists to close for
every entity from here on.

STAGE 7 (VIEWS) COM SHAPE, CONFIRMED BEFORE CODING: IView has a real
.GUID property directly (like NamedACL, unlike Workflow/State/User/
UserGroup) — no built-in value-list workaround. Views also don't
appear in MFBuiltInValueList at all, so unlike every previous stage
there was no Stage 2 overlap question to even check.

A REAL LIVE BUG, AND THE DIAGNOSTIC PATH THAT ACTUALLY FOUND IT: first
live run threw COMException 0x80040001 ("The parameter is incorrect")
from deep inside M-Files' own CoView.cpp. Tried GetViews() vs
GetViewsAdmin(), multiple parameter values, splitting chained dynamic
member access into separate statements, even a classic
Type.InvokeMember late-binding workaround (mimicking how PowerShell's
COM automation binds, as opposed to C#'s DLR) — identical error every
time. The thing that actually worked: reproducing the EXACT SAME
GetViewsAdmin() call, same server/vault/session type, same argument
values, via raw PowerShell COM automation instead of our C# connector.
It succeeded (47 views) — proving definitively that the enumeration
call itself was never broken, and the fault had to be downstream, in
code that runs AFTER the collection comes back. That pointed straight
at IView.Parent, which throws when HasParent is false (an inapplicable
property access, not a bad method argument). Fixed by reading .Parent
only when .HasParent is true; reverted the InvokeMember detour
afterward since plain `dynamic` dispatch was never the problem.
TAKEAWAY, GENERALIZABLE: when the SAME low-level COM error follows you
across different methods and different parameter combinations, stop
varying your own call and reproduce the identical call from a
DIFFERENT client (PowerShell, in this project's established practice)
instead — that's what actually separates "my call is wrong" from "my
call is fine, something later in my own code is wrong."

122/122 unit tests passing (5 new). Live: 47 views, real bilingual
(French/English) business views ("2-Task Invoice Control /Tâche
Contrôle Facture", "Sys.Vendor / Sys.Fournisseur") plus M-Files
built-ins, parent/child hierarchy resolved by GUID, search criteria
captured verbatim via GetAsExportedSearchString(). Full output in
progress.md.

---

## Session findings — Stage 8: Named Value Storage, a confirmed SDK boundary (2026-07-27)

A TYPE-MATCH MISTAKE, CAUGHT LIVE, NOT LEFT UNCORRECTED: assumed
GetCustomApplicationsEx2()'s elements were IPluginInfo (which has an
inviting-looking .Configuration NamedValues field, found via a name-
similarity reflection search) without confirming the ACTUAL element
type first. First live run threw "does not contain a definition for
'ConfigurationScope'". Confirmed via reflection: the real element type
is ICustomApplication (no configuration fields at all — just ID, Name,
Version, Publisher, Enabled, ApplicationType), and IPluginInfo is
actually returned by IMFilesServerApplication.GetAuthenticationPlugins*()
— a different subsystem (authentication plugins) entirely.
TAKEAWAY: when a type LOOKS right by name/shape, still confirm it's
actually what the method in question returns — check "where is this
type returned from" specifically, not just "does this type have
promising fields," before building against it.

THE USER FOUND SOMETHING REAL IN M-FILES ADMIN THAT ISN'T IN THE
PUBLIC SDK — CONFIRMED, NOT JUST ASSUMED, VIA EXHAUSTIVE SEARCH: M-Files
Admin's "Other Applications -> [App] -> Configuration" screen is real
and high-value — SQL Query Vault Application's Configuration shows
structured Workflow-State -> SQL-Call mappings that would directly
complete Stage 5's IsIntegrationTouching flag with what SQL those
states actually run. Searched properly before concluding it's
unreachable: every type name AND every method name containing
"Configuration" across the entire Interop.MFilesApi.dll (not just
CustomApplication-related types) — nothing exists for
ICustomApplication. Tried GetNamedValues(type, namespace) with each
app's ID as namespace across all 7 MFNamedValueType values (56 live
combinations), then each app's Name, then several guessed generic
namespace strings — all empty. Checked REST as an alternative per the
user's direction — confirmed still unreachable (no IIS/W3SVC running).
CONCLUSION: M-Files Admin almost certainly reads this through each VAF
module's own private storage, not the public COM/REST SDK — a real,
confirmed boundary, resolved by decision same as the Restore-GUID
probe, not an open guess left to keep chasing.

A REAL FINDING SURFACED WHILE CHECKING THIS: HTTP Caller for M-Files
showed LicenseStatus=NotInstalled here vs NotNeeded on prod (confirmed
live, GetCustomApplicationLicenseStatus) — a genuine dev-vs-prod
environment gap, same pattern as the Property Calculator fix, not app
breakage. Already Enabled=True at the API level, so nothing was
stuck-disabled to toggle via COM. Separately confirmed SQL Query Vault
Application — the actual priority target — already reads NotNeeded on
this server, identical to prod: no license blocker on the target that
matters, even though the Configuration-reading mechanism itself
remains unreachable.

SCOPE SHIPPED GIVEN THE CONFIRMED BOUNDARY: installed application
inventory (ID, Name, Version, Publisher, Enabled, ApplicationType,
LicenseStatus — all real, all reachable) plus a best-effort generic
NamedValueStorage probe per (app ID, type) — confirmed empty for
every real app today but kept as a legitimate general-purpose
capability for whatever surfaces on a future vault. Reused the
existing NamedValueStorage schema and NamedValueStorageRepository
(already built by an earlier session, already correctly preserving
human-assigned Classification across rescans) — no new entity.

131/131 unit tests passing. Live: 8 real installed applications, 48
inventory entries, 0 real per-app config entries (confirms the
boundary empirically, not just in theory). Full output in progress.md.

---

## Session findings — Approbation cross-vault check: Stage 2 (Value Lists) (2026-07-28)

FIRST EXECUTION OF THE DECISION GATE'S "SCAN ONE ADDITIONAL VAULT"
STEP: no code changes — the existing ValueListScanner (built and
unit-tested against Conformity only, per the Stage 2 sessions above)
ran as-is against Approbation. This is the point of building GUID-
first, name-as-label scanners in the first place: the same code
generalized to a second vault with zero modification.

REAL STRUCTURAL DIFFERENCE, NOT A BUG: Approbation has 8 value
lists / 23 items vs. Conformity's 6 / 6. Four of Approbation's lists
(HoldStatus, Invoice_Type, InvoiceStatus, Type de Bon) don't exist in
Conformity at all — all PO/receiving-related (BL = bon de livraison,
PO = purchase order), consistent with claude.md's framing of
Approbation as "more complex." Conversely Conformity's crédit/découpe
don't appear in Approbation. XCompany, XCurrency, XDate,
XtractLearning appear in both by NAME, but with independent GUIDs and
MFilesIds per vault — expected, since each vault's Firebird DB is
independent (§4.1: name is a label, GUID is identity, and this is a
live example of the same label pointing at two different GUIDs
across vaults).

THE BUILT-IN-VALUE-LIST EXCLUSION FILTER (MFilesBuiltInValueListIds,
from the "built-in vault structure hiding in value lists" fix above)
held up on a second, structurally different vault — no leakage of
Class/Workflow/State etc. into the results. This is the first real
evidence the fix generalizes rather than being tuned to Conformity's
specific data.

131/131 unit tests unaffected (no scanner code touched — this was a
live-data run, not a code change). Full per-list, per-item table in
progress.md.

STOPPED AT THE HARD GATE, PER THE DECISION: this is step 2 of the
Phase 2 Decision Gate (V1_DEVELOPMENT_ROADMAP.md) — scan one
additional vault, then compare structure before deciding whether to
scale to a full 9-vault scan or switch to narrow-scan mode. Stage 2
alone doesn't settle the hypothesis (IsIntegrationTouching is a
Stage 5/workflow concept); this is one data point toward it, not a
confirmation. Stage 3 (Property Defs) on Approbation is the next
step, not yet started.

NOTE ADDED 2026-07-28 (same night, after Stages 3-8 below completed):
the GUID text in the entry above ({0CFA34B2-...}) turned out to be the
same stale Milestone-1.1-era value, not what was actually queried —
confirmed via direct DB check that the persisted ValueList rows exist
only under the current GUID. The DATA in this entry is accurate; only
the printed GUID was wrong. See progress.md's annotation on the same
entry for the full correction. Take away: when a task brief supplies a
corrected GUID mid-session, double check any *already-written* notes
from before the correction rather than assuming they're consistent.

---

## Session findings — Approbation cross-vault check: Stages 3-8 (2026-07-28)

ONE BATCH, SIX STAGES, ZERO SCANNER CODE CHANGES: Stages 3 (Property
Defs), 4 (Object Types/Classes), 5 (Workflows/States/Transitions), 6
(Users/Groups/ACLs), 7 (Views), and 8 (Named Value Storage) all ran
as-is against Approbation ({281953C0-E341-4A7A-9CB7-9D6DF0099154}) —
the same generalizes-without-modification pattern Stage 2 established,
now confirmed across the full stack, not just the value-list layer.
Full per-stage counts and samples are in progress.md; this entry is
lessons/takeaways only.

SET A / SET B RECONCILIATION GENERALIZES, AND GOT STRONGER ON REPEAT:
re-ran Stage 4's GetValueLists()-filtered vs. GetObjectTypes() check on
a second vault, per explicit request since this was the first time it
ran against anything but Conformity. Not just an exact match again
(19/19, GUIDs identical) — this run additionally revealed Set B
(GetObjectTypes()) returns ZERO RealObjectType==false entries, meaning
it's pre-filtered server-side, not merely a superset that happens to
match after filtering. TAKEAWAY: a reconciliation check that "passes"
once can still have more to teach on a second run — rerunning
empirical validations on new data isn't redundant even when the first
result already confirmed the hypothesis.

NEGATIVE MFilesIds ON CLASSES — A REAL SHAPE, NOT SEEN BEFORE: 5 of
Approbation's 27 classes (built-in ones: Email Conversation, Email,
Share, Report, Assignment) carry negative MFilesIds. GuidGuard and the
scanner's ObjectTypeGuid resolution both handled it correctly with zero
changes, but Conformity's Stage 4 never exercised this path. TAKEAWAY:
"worked on vault 1" doesn't mean every code path got exercised — a
second vault with a different shape is real coverage, not just
confirmation.

VIEW HIERARCHY DEPTH — THE STAGE 7 COM-BUG FIX (HasParent guard) HELD,
AND GOT A REAL MULTI-LEVEL CASE TO PROVE IT MATTERED: Approbation has
genuine 2-deep parent chains (both auto-generated per-object-type views
and real named views like "*5. Archived Invoice" with two named
children). The fix works because guidByMFilesId is built from the full
view list up front rather than incrementally — order-independent by
construction, not by luck.

THE STAGE 8 SDK BOUNDARY CHECK, EXPLICITLY RE-VERIFIED PER THE USER'S
FRAMING ("if it holds, that's good evidence of a genuine SDK limit; if
it doesn't, that's the interesting result"): it held. REST unreachable
for the same server-level reason (no W3SVC, no port 80/443 — and since
Conformity and Approbation share the same local M-Files server
instance, this fact is necessarily identical for both, not an
independent per-vault data point). The generic COM NVS probe also came
back fully empty on Approbation, same as Conformity.

A REAL MISTAKE, CAUGHT AND CORRECTED BEFORE IT WAS LOGGED: an
application named "ConformityVaultApplication" installed on the
Approbation vault was FIRST reported as a novel, surprising discovery
— potential evidence of an actual cross-vault link, since Stage 5's
name-based search over Approbation's own workflow states/transitions
had found zero "Conform" hits. This was WRONG. Before writing it to
progress.md, cross-checked the historical record: Conformity's own
original Stage 8 session (2026-07-27) already recorded an app with
this exact name. Confirmed directly against the persisted
provisioning.db (not from memory) that both vaults have a
NamedValueStorages row for this exact ApplicationId GUID
({5FD4F383-1867-40BC-A9BD-7629DFCEA0D8}), differing only in version
(3.3.0 on Conformity vs. 3.2.3 on Approbation). CORRECTED READING: the
same module is installed independently on both vaults at different
versions — plausibly a generically-named module that ships with every
vault deployment, not a live cross-vault wiring mechanism.
TAKEAWAY, THE IMPORTANT ONE: before reporting something as a novel
cross-vault finding, check whether an earlier session already recorded
the same fact about the OTHER vault. A single-session memory summary
can miss this; the persisted DB and progress.md are the actual source
of truth and are cheap to grep before claiming novelty.

FURTHER CORRECTED (confirmed via its own Configuration tree, a later
session): despite the vault-specific-sounding name, ConformityVaultApplication
is itself a generic, reusable M-Files add-on — not custom-built
exclusively for this vault. Evidence: its Configuration tree contains
generic, non-Conformity-specific function names (FrevvoNewObject,
Sage50IMPExport, and dozens of others) alongside the Conformity-specific
DatabaseTableToCSV bindings. "ConformityVaultApplication" is this
deployment's chosen name for an instance of a generic add-on framework,
not evidence the add-on itself was purpose-built for this vault.

131/131 unit tests passing throughout, unaffected by any of these six
stages (no scanner code touched). Full counts, samples, and verbatim
guard/action data in progress.md's per-stage entries.

---

## Session findings — Conformity master behavior map, add-on binding resolution (2026-08-XX)

**Pointer (2026-08-01):** the full literal 47-row master table — every state's confirmed behavior source, built by querying `provisioning.db` directly rather than from memory — now lives in progress.md ("Conformity master behavior table & investigation consolidation"). This section remains the narrative/lessons record of how each binding was resolved; the table is the reference artifact. The known rubric-count discrepancy (19/11/8 vs. an earlier 14/11/3) noted further down in this doc is carried forward unresolved in both places — not reconciled here either.

PRINCIPLE, CONFIRMED INDEPENDENTLY AT LEAST TWICE — DISABLED-BUT-RETAINED
IS A DELIBERATE CONVENTION, NOT A BUG SIGNAL:
This project's vault maintainers disable retired logic rather than
deleting it. Confirmed instances: v3.0's dormant PO-validation VBScript
(`preconditionsVBScriptEnabled=False`, left in the state definition
verbatim rather than removed — see the v3.0 derivation-mechanism finding
elsewhere in this doc); `Sage50IMPExport` on Conformity (a leftover
Sage 50 ERP integration, confirmed disabled/non-firing, left configured
alongside the current live export mechanism rather than deleted).
TAKEAWAY: finding an inactive-looking script, rule, or config entry is
NOT by itself evidence of a bug, dead code needing cleanup, or an
unresolved mystery — check whether it's simply disabled-but-retained,
consistent with this project's own convention, before treating it as
an anomaly worth chasing.

CONFORMITY ADD-ON BINDING RESOLUTION — several previously-open items
resolved via M-Files Admin Configuration-tree data (user-provided,
historical note: the original "Configuration nodes unreachable via
COM/REST" boundary is now superseded for VAF apps by the documented
NVS mechanism at `MFSystemAdminConfiguration` type 8):

- Two mechanisms in this vault assign workflow state DIRECTLY, bypassing
  the transition graph entirely — this is why Stage 5's topology scan
  found some states with 0 inbound edges despite being genuinely live:
  SQL Query Vault Application's `UpdateOnFailure.State` (redirects to
  `WORKFLOW_ERREUR` on SQL call failure, from both `Search Vendor &
  LearningCP1` and `CP1_DATA`), and ConformityVaultApplication's
  `ChangeWorkflow` function (sets `OUT_TO_UPD_CP1` as EndState via its
  `IN_OUT_UPD_CP1` binding). ANY state showing "0 inbound, has outbound"
  in a topology scan should be checked against this direct-assignment
  pattern before being called a topological anomaly.
- The long-open `SQL Ready`/`SQL Ready2`/`SQLQueryFAIL`/`ToolsBoxQueryDone`/
  `Check_Credit` consumer question is resolved: `SQL Ready`/`SQL Ready2`
  are set to `"yes"` on success by SQL Query Vault Application's own SQL
  calls; `SQLQueryFAIL` is set on failure with a real error message,
  alongside the `WORKFLOW_ERREUR` redirect above; `ToolsBoxQueryDone` is
  set to `"yes"` on success by M-Files Vault Toolbox actions (To trash,
  MoveToApproval, MoveToStatement, MoveToOtherDoc, MoveToPackingSlip,
  Export CP1). These properties are native workflow-state SetProperties
  actions (confirmed via Stage 5 COM data) that exist specifically to
  signal these two add-ons' outcomes — not orphaned flags with an
  unknown reader.
- `SET_CREDIT_NEGATIF`'s real active mechanism is a Property Calculator
  rule ("Invoices (Crédit en Négatif)": state=Setcreditnegatif AND
  value>0 → flip Total/Subtotal/Tax1/Tax2/Freight negative) — contradicts
  the earlier assumption that this state's behavior was fully captured
  by its native SetProperties action alone. Directly confirmed (not
  inferred) that no VBScript is enabled anywhere on this state or its
  in/out transitions — genuinely absent, not even dormant, unlike the
  v3.0 PO-validation pattern above.
- The `Check_Credit` STATE (distinct from the `Check_Credit` PROPERTY
  written natively by several other states) runs
  `PopulateListWithTextSearchs`: searches invoice file text for "note de
  credit", saves the result to `Facturesmfiles`.
- `StringCharacterRemovalIntoNewProperty` strips `.,#;'` characters from
  vendor-list-indirected properties into `CP1-VendorAddress`/
  `CP1-VendorName`/`CP1-VendorID`, bound to the vault's initial state
  (`RTE-NewDocument_+_CLEAN_PO`) plus two more states — **flagged, not
  fully confirmed**: the two additional bindings were given as raw state
  numbers (120, 151) that don't semantically match "vendor/découpe
  cleanup" against this vault's own confirmed Stage 5 state names
  (120=`UPD_Learning = YES`, 151=`UPD_SQL_CP1`; neither of their native
  SetProperties actions touch the CP1-Vendor* properties). Worth a
  direct re-check of the raw JSON rather than treating those two state
  numbers as settled.
- `ChangeClassInWorkflow`'s 4 configured items reclassify `Trash`,
  `RTE_Statement`, `RTE_OtherDoc`, and `RTE_PackingSlip` to `CL.Trash` on
  entry — a clean 1:1 match to those states' names, no ambiguity.
- `Sage50IMPExport` — CLOSED. A leftover Sage 50 ERP integration bound to
  the same state as the live `DatabaseTableToCSV` export
  (`UPD_EXPORT_VENDORLIST`), named "Update CSV For CP1 (Disable)",
  targeting `D:\SFTP\Vendors` instead of the live export's
  `E:\SFTP\Vendors`. Consistent with the disabled-but-retained principle
  above, not an open oddity. Neither `E:\SFTP\Vendors` nor
  `D:\SFTP\Vendors` exists on this dev machine's local filesystem, so
  file-system evidence can't independently confirm which is live —
  inconclusive on this box specifically, not a contradiction of the
  "disabled" read.
- `DuplicateDetectionConfig` (2 configured items) was flagged for
  extraction but never actually supplied this session — the
  duplicate-handling states (`RTE_Duplicate`, `RTE_NotDuplicate`,
  `Control Duplicate`, `UPD_DUPLICATE`, `UPD_DUPLICATE2`,
  `RTE_Duplicate2`) remain resolved only for their native
  SetProperties/topology data, NOT for this specific add-on's role.
  Open gap, not yet closed.
- Destination Vault GUID `{037B0872-...}` appears consistently, labeled
  `"Name": "Approbation"`, across multiple independent Toolbox actions
  (cross-vault duplicate searches, MoveToApproval) — revises the earlier
  "stale pre-restore GUID" hypothesis toward "likely the intended
  production Approbation vault, distinct from the scanned dev/test
  Approbation (`{281953C0-...}`)." Not yet confirmed against a fresh
  `GetOnlineVaults()` call — open.
- SECURITY NOTE: `Search Vendor & LearningCP1`'s SQL Query Vault
  Application config contains a **plaintext SQL login credential**
  stored directly in the add-on's Configuration JSON. Value is
  `[REDACTED]` here and in every persisted file — home dev environment,
  low real-world risk, but the structural finding (plaintext credentials
  stored directly in a vault application's config, not in a secrets
  store) stands regardless of environment and is worth carrying forward
  if this pattern is ever assessed for a production deployment.
- `DestroyDeletedObjects` — still open, flagged again: now confirmed via
  a second Admin read to have **three** daily triggers (06:00, 12:00,
  11:59), not one as first reported, `NumberOfDaysToKeep: 0` unchanged,
  now also confirmed scoped to `CL.Invoices`/`CL.Trash`/`OT.Vendor`. A
  zero-retention purge running three times a day still needs the
  operator's direct confirmation that it's intentional — not verifiable
  independently (Configuration-node data, same §4.4.2 boundary).
- NEW FINDING, not previously flagged: `IN_CREDIT` (a FINAL state with 0
  inbound/0 outbound transitions, topologically identical in shape to
  the four confirmed-dead orphans `Set__SubTotal`/`Contrôle
  Sous-Total`/`OUT_CREDIT`/`test_123`) actually carries a real native
  SetProperties action (`Check_Credit` written) — the four confirmed-dead
  states have NO action data at all. Applying the direct-state-assignment
  pattern above, `IN_CREDIT` is a plausible target of a direct assignment
  (likely from the credit-check chain) rather than genuine dead
  configuration debris, despite sharing the four dead states' 0/0
  topology shape. It was never included in the earlier
  `GetObjectCountInSearch` dead-state confirmation and should get its own
  check before being lumped in with the confirmed-dead four.

---

## MAJOR CORRECTION — VAF add-on Configuration data IS reachable via COM after all (2026-08-XX)

**This reverses the earlier "not reachable via any COM/REST angle tried" verdict for VAF Custom Application Configuration.** That conclusion was reached by guessing NVS namespaces (app IDs, app names, function names) — it never tried the actual convention the framework uses. Decompiling the real, installed assemblies (extracted read-only via the documented `IVaultCustomApplicationManagementOperations.DownloadCustomApplicationBlockBegin`/`DownloadCustomApplicationBlock` COM methods — no loose `.dll` exists on disk for any of these apps; M-Files stores installed Custom Application packages inside the vault's own database, downloadable only through this API) revealed the exact mechanism.

**The mechanism, read straight from `MFiles.VAF.Configuration.ConfigurationStorageInVault` (decompiled from the real `MFiles.VAF.Configuration.dll` shipped alongside the app):**
- Storage: `MFNamedValueType.MFSystemAdminConfiguration` (enum value 8)
- Namespace: `GetType().FullName` of the app's `VaultApplication` class — for `ConformityVaultApplication`, literally the string `"ConformityVaultApplication.VaultApplication"` (confirmed by decompiling `MFiles.VAF.Core.ConfigurableVaultApplicationBase`, which constructs `new SecureConfigurationManager<T>(GetType().FullName)`)
- Key: `"configuration"` (the framework's default `configKey`)
- Read: `vault.NamedValueStorageOperations.GetNamedValues(8, "ConformityVaultApplication.VaultApplication")`, then the `"configuration"` entry is the full config, serialized as indented JSON via Newtonsoft.Json (`ConfigurationStorageInVault.Serialize`/`Deserialize`).
- **Write is the identical, symmetric NVS `SetNamedValues` call** (`ConfigurationStorageInVault.SaveConfigurationData`) — already a long-confirmed-writable COM operation elsewhere in this project. So this is **reachable AND writable**, not read-only.

**Verified live, read-only, this session:** called exactly this against Conformity_CP1 and got back the complete, real 9.8KB configuration JSON in one call — not a guess, not a screenshot transcription. This works for ANY VAF app built on `MFiles.VAF.Extensions.ConfigurableVaultApplicationBase<T>` (which is the same framework `Property Calculator`, `M-Files Vault Toolbox`, and `SQL Query Vault Application` are also built on, per their own extracted packages containing the same `MFiles.VAF.*` DLLs) — the namespace for each is simply `{AppRootNamespace}.VaultApplication`, derivable without decompiling every app individually once the pattern is known.

**Implication for V2 onboarding automation — this changes the answer materially:** VAF add-on configuration (ConformityVaultApplication, and by the same mechanism Property Calculator/Vault Toolbox/SQL Query Vault Application) is a **fully automatable read/write target via the exact same `IMFilesConnector` COM path** this project already uses everywhere else. No UI automation, no Firebird side-channel, no unsupported mechanism needed. The earlier "automation floor" (object CRUD + External DB Connection setup) was too conservative — this is now confirmed part of the floor too.

**Real, live config content read this session (ConformityVaultApplication, full 9.8KB JSON, not paraphrased):**
- `DatabaseTableToCSV[0].ConnectionConfig.DatabaseServer` = `"%PROPERTY_{PD.Company}.PROPERTY_{PD.Companysql}%"` — genuinely dynamic, chained property indirection (reads the invoice's `Company` lookup, then that Company object's own `Companysql` property) confirming the earlier "dynamic per-company server resolution" claim with the literal syntax. `DatabaseName`="MfilesData" and `TableName`="Master_DATA_CP1" are plain hardcoded literals (shared across all customers by design, matches CLAUDE.md §4.4's "shared, not per-vault" model). `OutputFilePath`="E:\\SFTP\\Vendors" is a hardcoded literal — confirmed genuinely unreachable on this dev box (no E:\ drive at all, verified via `Get-PSDrive`), so "live and working" needs that caveat attached going forward. All 5 CSV columns are `Type="1"` (Database Column) — zero use of the schema's `Fixed M-Files Property`/`Fixed Value` column types here.
- `DestroyDeletedObjects`: confirmed live, not inferred — `Enabled: true`, `NumberOfDaysToKeep: 0`, three daily triggers (06:00, 12:00, 11:59), scoped to `CL.Invoices`/`CL.Trash`/`OT.Vendor`. Still needs the operator's direct confirmation this zero-retention purge is intentional — nothing about reading it live changes that it's the operator's call, not a technical question.
- `Sage50IMPExport`: **no `"Enabled"` key present in the live JSON at all** — since the schema defaults `Enabled = false`, this is now a direct, definitive confirmation (not an inference from a missing E:\/D:\ drive) that it's genuinely disabled. Its own IMPValue template does use full `%PROPERTY_{...}%` indirection reading the CP1-Vendor* properties, so the mechanism itself isn't primitive — it's just switched off.
- `ChangeWorkfow` (literal property name, typo baked into the compiled schema — `Workfow` not `Workflow`) has **two** entries, not one: `IN_OUT_UPD_CP1` (already known: `IN_TO_UPD_CP1`→`OUT_TO_UPD_CP1`) and a previously-unknown **`IN_OUT_CREDIT`: `OUT_CREDIT`→`IN_CREDIT`**. This is a real correction to the earlier per-state table: `OUT_CREDIT` (previously "confirmed dead" via 0/0 topology + 0 live `GetObjectCountInSearch` results) is actually a genuine, intentional direct-assignment START trigger, not dead configuration debris — the earlier "0 live objects" check was accurate for objects *at that moment*, not evidence the mechanism is unused; objects pass through `OUT_CREDIT` and get redirected to `IN_CREDIT` immediately, which is exactly why none were ever observed sitting "in" it. `Set__SubTotal`/`Contrôle Sous-Total`/`test_123` remain confirmed dead with no such redirect found for them.
- `DuplicateDetectionConfig`: only 2 fields configured (`InvoiceClass`="CL.Invoices", `UniqueInvoiceID_Text`="PD.Uniqueinvoiceid") — no `ApprovalVault` section at all (GUID/Login/Password all unset), and **no `"Enabled": true` present**, meaning per schema default this feature is NOT actually active despite having partial configuration. Answers the earlier-flagged "DuplicateDetectionConfig (2 items) never supplied" gap.
- `StringCharacterRemovalIntoNewProperty`: exactly 6 entries as expected. **Directly resolves the earlier-flagged state 120/151 "mismatch"** — the real config genuinely does bind to states 120 and 151 (Workflow=103), despite those states' own names (`UPD_Learning = YES`, `UPD_SQL_CP1`) not obviously suggesting vendor-cleanup — the earlier skepticism about a mismatch was itself mistaken; the bindings were correct all along. Only entries 4–6 carry an explicit `"Enabled": true`; entries 1–3 have no `Enabled` key and default to `false` — so only half of the six are actually active. One entry's state is given as `"WFS.Conformity.Testupdsqlcp1"`, a name not yet cross-checked against the confirmed 47-state list — flagged, not resolved.
- `InvoiceCalculatedTotal` (Enabled=true, native C# event-handler logic in `VaultApplication.cs`, not a Property Calculator rule) computes whether `PD.Total` matches computed Subtotal+Tax1+Tax2+Freight and flags `PD.Totaldifferent`. `MathStringFormulaToNumberRealApp`'s one entry ("totaldiffnombre", formula `(Total - Calculated total) * -1`, output property 1148, inputs 1069/1028) is a **separate, distinct mechanism** — property IDs don't overlap with the credit-negative-flip properties from the earlier session, so this should NOT be conflated with `SET_CREDIT_NEGATIF`'s Property Calculator rule as previously assumed; they're different calculations on different data.
- `ChangeClassInWorkflow`: confirmed 4 entries reclassifying to `CL.Trash` — but entries 3 and 4 are **both literally named "Trash-OtherDoc"** even though entry 4 actually targets `Rtepackingslip`, not `Rteotherdoc` — a real copy-paste naming bug in the vendor's own config (cosmetic, `Name` field only, doesn't affect behavior — the `WorkflowAndState` targets are correct and distinct).
- `PopulateListWithTextSearchs`: confirmed exactly as previously found (searches "note de credit", saves to `PD.Facturesmfiles`, bound to `WFS.Conformity.Checkcredit`).
- **~24 of the ~35 config sections this generic app's schema supports are entirely absent from the live JSON** (no key at all — pure schema defaults apply, i.e. disabled/unused): `ChangePropertyOnMatchingObjects`, `DeleteLineItemsWithNoConnections`, `TestTranslations`, `PreConditionsMessageIfMissingProperties`, `ListSubObjectsOnMainObject`, `rtfToPlainTexts`, `FormatDateField`, `CheckPropertiesIfEmpty`, `SearchStringsUsingRegex`, `CommentCreationApps`, `ExportFilesToFolder`, `StringCharacterRemove` (the non-"IntoNewProperty" sibling), `NewObject`, `TinyURLLinkGenerators`, `FrevvoNewObject`, `ObjectCountApplication`, `ExtractDateValueApplication`, `UpdateSubObjectProperty`, `SplitIncomingFileNameToValues`, `OCRDocument`, `CopyProperty`, `EndOfMonthAdjustPostingDates`, `ChangeSubItemWorkflow`, `XMLOutputs`. Confirms, with hard evidence rather than inference, that this vault only lights up a small fraction of a large generic add-on's capability — consistent with the earlier "generic, reusable module" correction.

**Export/Import (app-specific):** none found — no custom Dashboard command, no `ExportConfig`/`ImportConfig`-named method anywhere in the decompiled app or the three decompiled VAF framework assemblies (`MFiles.VAF.dll`, `MFiles.VAF.Extensions.dll`, `MFiles.VAF.Configuration.dll`). Not needed, though — the generic NVS read/write above serves the same purpose without any UI involvement at all.

**`AP Extension Refonte`**, extracted the same way, turned out to have **no compiled DLL at all** — it's a client-side Dashboard/Shell UI extension (ag-grid, jQuery, `my-dashboard.js`, `shellui.js`, plain readable JavaScript/HTML/CSS). Not decompiled in the traditional sense since there's nothing compiled to decompile; not pursued further this session (lower priority, time-boxed).

**Security note, credential still redacted per the standing rule:** the plaintext SQL login flagged earlier (`[REDACTED]`, server `SRV-T450`) belongs to a different app (`SQL Query Vault Application`'s `Search Vendor & LearningCP1`/`CP1_DATA` config), not read again this session — the same NVS mechanism above would reach it too, using that app's own `{RootNamespace}.VaultApplication` name, not attempted here to avoid re-touching credential data unnecessarily.

---

## Session findings — full customer-specific-value inventory across all 4 config-bearing apps (2026-08-XX)

Follow-up session: read all four apps' live config in one read-only pass, using namespaces taken directly from each app's own `appdef.xml` (no guessing needed this time — `appdef.xml` declares the exact `<class>` fully-qualified name):
- `ConformityVaultApplication.VaultApplication`
- `Docned.SQL.VaultApplication.VaultApplication` (SQL Query Vault Application — publisher "Groupe CT", same vendor/framework family as ConformityVaultApplication, not M-Files)
- `Docned.VaultToolbox.VaultApplication` (M-Files Vault Toolbox — also publisher "Groupe CT")
- `PropertyCalculator.VaultApplication` (M-Files Property Calculator — genuinely from M-Files, publisher "M-Files")

All four `GetNamedValues(8, namespace)["configuration"]` calls succeeded first try. This is now a repeatable, documented pattern for pulling any of this vault's VAF app configs without decompiling anything — decompiling was only ever needed once, to discover the mechanism itself.

**Destination Vault GUID `{037B0872-D93D-4DE8-B031-A7813755F86C}` ("Approbation") appears 7 times, only in M-Files Vault Toolbox, always nested in an array element** (`SearchLocations[i].VaultGuid` ×2, `MoveObjectSettings.VaultGuid` ×5 — one per Move* action: To trash/MoveToApproval/MoveToStatement/MoveToOtherDoc/MoveToPackingSlip). Never appears in the other 3 apps. **Not the only destination-vault-specific value that travels with it**: every `MoveObjectSettings` block also carries an `ObjectGuid` (identical across all 5 — `{53F0C8FD-...}`), a distinct `ClassGuid` per action (5 different destination-vault class GUIDs), and `MoveToApproval` additionally carries a destination-vault `Workflow`/`WorkflowState` GUID pair. Onboarding a new customer with a different destination vault means all of these change together, not just the one GUID — the true patch surface is wider than "find the vault GUID."

**Full hardcoded-vs-parameterized census, all 4 apps, real values not paraphrased:**
- **Hardcoded, genuinely needs a per-customer/per-deployment edit:** SQL Query Vault App's `ServerName`="SRV-T450" + `Login`/`Password` (`[REDACTED]`) on `WorkflowConfigurations[0]`'s top-level `ConnectionConfig` only (NOT its nested `SQLCalls[].ConnectionConfig`, which use the dynamic form below); three distinct hardcoded SFTP paths across two apps — `E:\SFTP\Vendors` (ConformityVaultApplication, live), `D:\SFTP\Vendors` (ConformityVaultApplication's disabled Sage50IMPExport), and a **third, previously-unseen path** `E:\SFTP\IN` (Vault Toolbox's "Export CP1" action); the Destination Vault GUID + its accompanying Object/Class/Workflow/WorkflowState GUIDs above.
- **Hardcoded in the NATIVE workflow layer, not just add-on config — a distinct source worth checking separately:** workflow state `RTE-NewDocument_+_CLEAN_PO` (the workflow's own initial state)'s native SetProperties action fixes the `Company` lookup property to a literal value — `"Tergos Construction"`, external ID `TERGOS` — confirmed via a direct query against `provisioning.db`'s `WorkflowStates.Actions` JSON, not paraphrased. The add-on-config census above wouldn't surface this; it lives in Stage 5's native Actions data. Any onboarding-automation pass needs to walk BOTH the add-on config (this section) and native per-state Actions/GuardConditions JSON (progress.md's master 47-state table) for hardcoded customer literals — checking only one layer will miss real ones.
- **Hardcoded but intentionally shared across every customer, not actually customer-specific:** `MfilesData` (database name, appears identically in every `ConnectionConfig` across both ConformityVaultApplication and SQL Query Vault App), `Master_DATA_CP1`/`View_FOUR` (shared reference table names). These don't need per-customer editing by design — they're the shared SQL tier CLAUDE.md §4.4 already documents.
- **Already parameterized via `%PROPERTY_{...}%` (including chained forms like `%PROPERTY_{PD.Company}.PROPERTY_{PD.Companysql}%`), no per-customer edit needed:** every vendor/company/invoice-level value in all 4 apps, including SQL Query Vault App's `SQLCalls[].ConnectionConfig.ServerName` (the actual data-moving calls resolve their server dynamically per-company — only the top-level "Search Vendor" connection is hardcoded), all of ConformityVaultApplication's `StringCharacterRemovalIntoNewProperty` and `Sage50IMPExport` templates, and Vault Toolbox's `Export CP1` filename template.
- **M-Files Property Calculator: zero customer-specific values found.** Every reference (5 calculation rules) is to this vault's own internal property/workflow/class identifiers — pure template logic, portable as-is across any structurally-identical clone. Confirms it needs no attention at all in an onboarding automation pass.

**Patch-location detail for the Destination Vault GUID:** `{037B0872-...}` appears 7× total, all nested inside Vault Toolbox's config — `SearchLocations[].VaultGuid` (×2) and `MoveObjectSettings.VaultGuid` (×5) — never as a flat top-level value. A provisioning patch touching this value must walk all 7 nested locations individually (or do a raw string-replace across the JSON text, since all 7 hold the identical literal).

## Config-write safety: the VAF framework's own Validate() is real but unusable for our purpose

Decompiled `Docned.VaultToolbox.dll` (not just ConformityVaultApplication's Configuration class, which doesn't contain this field — the Destination Vault GUID lives in Vault Toolbox's own `SearchLocation.cs` and `MoveObjectSettings.cs`) plus the three already-decompiled VAF framework assemblies, specifically to answer: can we lean on the framework's own validation before writing a provisioning patch, or do we need our own?

**The field itself has no meaningful validation:**
```csharp
// SearchLocation.cs
[TextEditor(Label = "Vault", IsRequired = true, HelpText = "GUID of the vault to search in...")]
public string VaultGuid { get; set; }

// MoveObjectSettings.cs
[TextEditor(Label = "Destination Vault", IsRequired = false, HelpText = "GUID of the destination vault...")]
public string VaultGuid { get; set; }
```
Plain `string`. `[TextEditor]` only controls the Admin UI's label/help-text/placeholder rendering and an optional non-empty check — no GUID-format check, no existence/reachability check, and not even consistently required (`SearchLocation` requires it, `MoveObjectSettings` doesn't).

**The framework DOES expose a real, non-cosmetic validator** — `MFiles.VAF.Core.ConfigurableVaultApplicationBase<T>.Validate(IConfigurationRequestContext context, string configuration = null)` — the same code path the Admin config UI itself calls (via `ConfigurationDomainNode.Validate`). It deserializes the given config JSON and runs a reflection-based walker (`ValidateConfigurationAttributes`) that checks every `[MFWorkflow]`/`[MFClass]`/`[MFPropertyDef]`/etc.-attributed field against the live vault, plus any app-specific `CustomValidation` override (ConformityVaultApplication doesn't add one — it relies entirely on the generic attribute walker).

**It's unusable for our purpose, for two independent reasons — either one alone would be disqualifying:**
1. **All twelve reference-attribute types in the framework** (`MFClass`, `MFClassGroup`, `MFNamedACL`, `MFObject`, `MFObjType`, `MFPropertyDef`, `MFState`, `MFStateTransition`, `MFUserGroup`, `MFValueList`, `MFValueListItem`, `MFView`, `MFWorkflow`) derive from the same `VaultElementReferenceAttribute` base and validate references **within the same vault only**. There is no cross-vault-reference attribute type anywhere in the framework's vocabulary — structurally, it has no concept of "does this GUID point at a real, reachable *other* vault," so it could never validate a Destination Vault GUID even in principle.
2. **`Validate()` is an instance method on the live VaultApplication object, running inside the M-Files Server process.** There's no COM/REST wrapper exposing it — it's reachable only from code hosted in the same process (e.g. a sibling VAF app), not from an external client like this project's `IMFilesConnector` harness.

**Conclusion — binding for the future provisioning write path:** any write that touches the Destination Vault GUID must include our own validator, at minimum: (1) a GUID-format check, (2) a live reachability probe (`GetOnlineVaults()` / a login attempt against the target GUID) before the corresponding `SetNamedValues` call. This is the same identity-verification discipline already used elsewhere in this project (§4.1's GUID-first resolution, the vault-identity foot-gun checks in §4.6) — not a new pattern, just this feature's instance of it.

## Platform findings — NVS write audit trail and byte-fidelity guarantee (2026-08-01)

Confirmed during Phases 1 and 2 of the config-write protocol — the first real writes ever performed against a live vault in this project. Both findings are permanent operational facts about the NVS layer itself, not specific to either phase's task.

**1. NVS writes generate zero vault event-log entries.** `vault.EventLogOperations.GetIDRange().MaxID` was read immediately before and after each write:
- Phase 1 (SQL Query Vault Application round-trip write): MaxID unchanged (141672 → 141672).
- Phase 2 (Vault Toolbox Destination Vault GUID patch, a real content change, not a no-op round-trip): MaxID unchanged again.

So this isn't just "a byte-identical write didn't log anything" — a write that genuinely changed 7 locations in the config *also* generated nothing in the event log. **The vault provides no audit trail for `SetNamedValues` calls at all**, regardless of whether the write is a no-op or a real change. This refines (doesn't contradict) the earlier "genuinely inconclusive" finding from the cross-vault integration-verification thread — that question was about whether the Event Log captures VAF-*internal* actions generally (e.g. a Vault Toolbox move actually firing); this is a narrower, now-definitive answer specifically for the NVS config-write layer: it does not log, full stop. **Implication:** self-maintained audit logging (timestamp, vault GUID, namespace/key, before/after byte length + SHA-256, intended change, human authorization) is mandatory for every config write the provisioning engine performs — see the audit records in `rollback/2026-08-01_082750_conformity-write-protocol/AUDIT_LOG.md` for the format this settled on.

**2. `SetNamedValues` is byte-faithful — no normalization or re-serialization happens at the NVS layer.**
- Phase 1: read 3,625 bytes, wrote the exact same `NamedValues` COM object straight back (string never touched on our side), re-read — byte-identical on the first attempt, no retry needed.
- Phase 2: a real 7-location same-length GUID substitution (9,588 bytes before and after) — verified byte-for-byte that exactly those 7 spans changed and *zero* bytes changed anywhere else in the file, both from inside the write harness and independently via `sha256sum`/`grep` outside it.

**Implication for the provisioning engine:** a write can be constructed as a raw string patch (locate → substitute → write) without any JSON parse/re-emit round-trip, and the result is guaranteed exact-bytes-in-exact-bytes-out. The re-serialization risk that motivated Phase 1's original design (attribute reordering, quote-style changes, self-closing-tag normalization) does not materialize at this API layer — confirmed empirically, not assumed. This also means a byte-level diff is a valid, sufficient acceptance test for a provisioning write; a full JSON-semantic diff isn't needed to prove correctness at this layer (though it may still be worth doing for human review).

**3. Config writes require explicit app reload before behavior changes take effect (single-server deployment rule).**
- VAF config is loaded into memory at app startup (`StartOperations`) and is not re-read for every operation.
- Automatic refresh depends on a cross-server broadcast path (`BroadcastFilterMode.FromOtherServersOnly`) that does not self-trigger on this single-server setup.
- Practical requirement for provisioning writes: after `SetNamedValues`, explicitly reload the target custom app via `IVaultCustomApplicationManagementOperations` (disable/re-enable), then verify the expected behavior live. Do not assume a successful write means active behavior.

## Milestone lock-in (Conformity) — config-write mechanism complete, functional routing still pending

This section is the reusable summary for future sessions so we do not regress on scope language:
- Proven milestone: NVS write mechanism is complete enough to rely on for provisioning-engine design (reachability, writability, byte fidelity, and one real semantic patch delivered).
- Real semantic patch: `MoveToApproval` Destination Vault GUID changed from `{037B0872-...}` to `{281953C0-...}` across 7 nested Vault Toolbox locations, verified 7/7 with 0 collateral-byte changes and re-checked independently.
- Permanent operational constraints: no event-log audit trail for NVS writes, and mandatory post-write app reload + live verification.
- Onboarding dependency refinement: config-push alone is insufficient; runtime behavior reads SQL reference data (vendors and related lookup/reference rows), so reference-table population is part of onboarding. Earlier "no vendor data" wording was a mis-theory and is corrected here: vendors do exist in Conformity_CP1; the runtime SQL dependency point still stands.
- Search/patch hygiene note: `MoveToPackingSLip` (capital S/L) is a pre-existing vendor spelling quirk in config, not introduced by project patches. Include this exact spelling in future searches to avoid false negatives.

## Live failure proof (2026-08-01) — state 114 runtime SQL dependency and two-layer connection rule

Confirmed live using test object 5427:
- As the object passed state 114 (`UPD_VendorID`), SQL Query Vault Application's `Search Vendor & LearningCP1` executed vendor lookup automatically.
- Failure behavior was exact and deterministic: `PD.Sqlqueryfail` became `SQL ERROR : UPDATE VENDOR` and the object redirected to `WORKFLOW_ERREUR`.

Root cause proved a critical architectural distinction:
- Layer 1: six object-type External DB Connections (Company, Conformity, CP1, Document, Vendor, Approver), writable via `IObjectTypeAdmin`.
- Layer 2: SQL Query Vault Application's own internal connection config, writable via NVS (`Docned.SQL.VaultApplication.VaultApplication`).
- Repointing layer 1 does not repoint layer 2. Event-log evidence for this failure showed execution still targeted `TERGOS-MFILES01\SQLEXPRESS` (old/original server), not the local dev SQL server.

Binding rule for onboarding/provisioning:
- A new customer deployment must update both layers. Updating only layer 1 leaves invoices failing at 114 and dying into `WORKFLOW_ERREUR` before downstream states can run.

Scope/exoneration note:
- This incident does not invalidate the Destination Vault GUID patch or Vault Toolbox handoff logic. Object 5427 failed upstream at 114, before `MoveToApproval` (129->132) executed.

## RESOLVED (2026-08-01) — functional write-protocol testing is no longer gated on a disposable clone

The write protocol's functional test (routing a real invoice — both PO and non-PO paths) previously needed a disposable clone that actually contains test documents to route. Neither Conformity II (0 real objects, structure-only copy) nor a TriggerBridge R&D clone qualified at the time this was flagged.

**No longer blocking.** The user now has a working copy of the Conformity vault with fake invoices fed through the real client-side entry path (Mail Downloader → Capture Point → vault) — the functional prerequisite is handled on the user's side. Separately, a local SQL dev environment is also now live (`DESKTOP-DKCS42P`, fresh `MfilesData`, Conformity's six object-type External Database Connections repointed from `TERGOS-MFILES01\SQLEXPRESS` to local, connection tests passing) — supports local write-protocol testing without touching production SQL. Neither of these substitutes for Stage 9 (introspecting the real production `MfilesData` schema, still blocked — see progress.md/claude.md §2.3).

**SUPERSEDED status note (same milestone, later evidence):** prerequisite availability did not complete end-to-end routing proof. Functional Scenarios A/B/C (PO, non-PO, rejection) are still blocked on programmatic object creation (`CreateNewSFDObject` COM marshaling). This is new territory for the project (no prior object-creation path existed). Keep the status split explicit in future write-ups: mechanism proven, routing proof pending.

## Skill: M-Files VAF task-queue diagnostics have two separate, non-overlapping error paths (2026-08-02)

Confirmed by decompiling `Docned.VaultToolbox.dll` and empirically testing both paths against a real object driven through a real workflow transition:

- **Enqueue-side failures** (inside an `[EventHandler]` method like `BeforeCheckInChanges`, where a task actually gets created via `TaskManager.AddTask`) surface through whatever the app's own `catch` block does — in this case `EventLog.WriteEntry(sourceName, ...)`. **This only works if the named Windows EventLog source already exists.** If it doesn't, the `WriteEntry` call itself throws, uncaught, silently discarding the original exception along with itself — a genuine failure mode found live in this project (source `GroupeCT.M-Files.Toolbox` was never registered on this machine). Check with `Test-Path "HKLM:\SYSTEM\CurrentControlSet\Services\EventLog\Application\<source>"` before trusting an app's own EventLog-based error reporting; register a missing source with `New-EventLog -LogName Application -Source "<name>"` (environment-side fix, does not touch the add-on).
- **Processor-side failures** (inside the actual `[TaskProcessor(...)]` method that runs asynchronously off a task queue) use a completely different mechanism: `throw new AppTaskException(TaskProcessingJobResult.Fatal, ex.Message)`. This is NOT routed through the app's own EventLog source — it's handled by the VAF task-processing framework itself, and is observable (if at all) through M-Files Admin's Background Tasks / Task Manager view, not through Windows Event Log or an NLog file. Confirmed no NLog config exists for this project's apps or M-Files Server install (`Get-ChildItem -Filter NLog.config` under the M-Files Server directory returns nothing).
- **Practical implication:** fixing the enqueue-side EventLog source (as done in this project, 2026-08-02) proves whether the *trigger* fired cleanly — it tells you nothing about whether the *task* that got enqueued actually completed. Don't conflate the two paths when diagnosing a "the automation didn't do anything visible" symptom; check both, separately.
- **How to prove the enqueue side works without needing the processor to succeed:** if the app has more than one trigger/task binding, test with a *different, lower-stakes* binding that shares the same enqueue code path. In this project, Vault Toolbox's `FindDuplicates` action (bound to a different, earlier workflow state) fired, enqueued, processed, and wrote back a result (`PD.Searchcount=1`) on the same object in the same test run where `MoveToApproval` did not visibly complete — proving the shared enqueue mechanism was healthy and narrowing the real gap to the specific action's own processor/task, not the general trigger infrastructure.

## Skill: NVS config-write mechanism is now confirmed to survive a full real-world provisioning cycle (2026-08-02)

The NVS read/write mechanism documented above (`GetNamedValues`/`SetNamedValues` at type 8/`MFSystemAdminConfiguration`, namespace = app's full type name, byte-faithful, silent — no event-log trail, self-maintained audit logging mandatory, explicit reload required) was originally proven via isolated round-trip and single-field patch tests (2026-08-01). This session re-confirmed it holds under a real end-to-end usage cycle: the same Destination Vault GUID patch, applied and reload-verified on 2026-08-01, was still present and correct (0 old-GUID residual) when a real object was driven all the way to the patched trigger state on 2026-08-02, one day and one full `MFServer` restart later. No drift, no need to re-patch. See progress.md's "Conformity cross-vault handoff — MILESTONE" entry (2026-08-02) for the full test that exercised this.

## Skill: cross-vault move is an alias-resolution handshake, not a row copy (2026-08-02)

Confirmed from `MoveToApproval`'s own decompiled config (`MoveObjectSettings` block, `Docned.VaultToolbox.dll`): a Vault Toolbox cross-vault move does not clone the source object's raw property values into the destination — it sends a `Mapping` array of `{Property, DestinationProperty}` alias pairs (14 entries for `MoveToApproval`) plus 4 destination-side structure GUIDs (`ObjectGuid`, `ClassGuid`, `Workflow`, `WorkflowState`), and the destination vault resolves each `DestinationProperty` alias against **its own** structure and creates the object natively there.

**Concrete proof the two sides' aliases are not assumed identical:** 13 of the 14 mappings are same-named (`PD.InvoiceNo`→`PD.InvoiceNo`, etc.), but one is a genuine rename: `PD.Noprojet` (source, Conformity) → `PD.Projetno` (destination, Approbation). This is real config content, not a guess — confirmed directly in the JSON, not inferred. **Implication for any Approbation-phase validation:** never assume a destination alias matches the source alias by name. Each of the 14 `DestinationProperty` values and all 4 destination structure GUIDs must be checked to actually resolve against Approbation's own live structure (`GetPropertyDefIDByAlias`, `GetObjectTypeIDByGUID`, etc.) individually — a bulk "does Approbation have these same properties" assumption would miss exactly this kind of rename.

## Skill: Connection II's handoff-completion requirement — the cross-vault move is a 5-GUID + 14-alias config-write procedure (2026-08-04, folded from the retired Connection IV)

Clarified via Philippe's training plus a direct M-Files Admin config review. Re-verified against the actual on-disk `MoveToApproval` config (`rollback/2026-08-01_082750_conformity-write-protocol/phase2_vaulttoolbox_after_...json`), `provisioning.db`, and `AUDIT_LOG.md` — not accepted from the training summary alone.

- **Model confirmed:** the move is an alias + GUID handshake, configured entirely on the Conformity side. Approbation's structure is the fixed reference — Conformity's `MoveToApproval` config is written to point at it. Approbation itself is never modified; all wiring lives in Conformity's NVS config.
- **Five destination GUIDs, all present together in `MoveToApproval`'s own `MoveObjectSettings` block:** `VaultGuid`, `ObjectGuid`, `ClassGuid`, `Workflow`, `WorkflowState`. This isn't new data — CLAUDE.md §4.4.3 already described "a per-action Object/Class/Workflow/WorkflowState GUID cluster" traveling with the Destination Vault GUID — but the task list previously bucketed "the Vault GUID" (already patched, Connection I) separately from "4 destination structure GUIDs" (open). Stating all 5 together is what makes this a **repeatable procedure**: for any new target vault, all 5 fields get read from the target and written into Conformity's config as one unit.
- **`WorkflowState` GUID `{C9B5E231-A4CC-4BCB-8AA1-5CBE812660BB}` resolves, live-queried against `provisioning.db`'s `WorkflowStates` table, to Approbation (`{281953C0-...}`) state `START`, `IsInitial=1`.** `Workflow` GUID `{5012788D-3C14-471A-979C-D8DDDA9D59DC}` resolves to Approbation's own `Approbation` workflow in the same vault. This is the entry point where a moved object lands in Approbation's approval workflow — easy to overlook among 5 opaque GUIDs, but essential: get it wrong and the object either fails the move or lands at the wrong point in the destination workflow.
- **14 destination property aliases reconfirmed directly against the on-disk `Mapping` array** (`PD.Docname`, `PD.InvoiceNo`, `PD.InvoiceDate`, `PD.PurchaseOrder`, `PD.DeliveryNumber`, `PD.Subtotal`, `PD.Tax1`, `PD.Tax2`, `PD.Freight`, `PD.Total`, `PD.Uniqueinvoiceid`, `PD.VendorList`, `PD.Company`, and the renamed `PD.Noprojet`→`PD.Projetno`) — matches the count and the rename already documented in the "alias-resolution handshake" skill above, now independently re-verified byte-for-byte rather than assumed current.
- **`PD.Toolsboxquerydone = "yes"` (Vault Toolbox's `UpdateOnSuccess` block on `MoveToApproval`) is the programmatic completion marker**, written back on the SOURCE (Conformity) object when the move actually completes. Confirmed empty on all four test objects, each individually re-checked live (per `AUDIT_LOG.md`): 5427 (derailed upstream by the state-114 SQL failure before a clean `MoveToApproval` attempt), 5428 (sat undisturbed at `RTE_Approval` for a clean 3-minute window, still empty, then self-progressed to END/Deleted ~50 min later with the marker never having fired), 5429 (post-`MFServer`-restart definitive test, checked at 4 timestamps over 8 minutes, empty throughout, later self-progressed to END with the marker still never fired), 5430 (reached `RTE_Approval`, fired the trigger via the sibling `FindDuplicates` proof, task reached Approbation's boundary, marker still empty). Empty `ToolsBoxQueryDone` = the move didn't complete, consistently across every test run so far.
- **Connection II's handoff-completion blocker, defined:** onboarding a customer's handoff = read the target Approbation-equivalent vault's 5 destination GUIDs, write them into Conformity's `MoveToApproval` config via the proven `SetNamedValues` NVS mechanism (Connection I), reload via a full `MFServer` restart (the confirmed cache-invalidation requirement — app disable/enable was already found insufficient), then verify the 14 destination aliases resolve against the target vault's own structure. This is Connection I's proven config-write mechanism applied to the destination coordinates — not a new or unknown mechanism.
- **Folded from Connection IV (2026-08-04):** this used to be scoped as a separate, later "Approbation receiving side" phase with an open "identify the real receiving-side cause" first task. That framing treated the dev-Approbation test's incomplete handoff as an unexplained bug to hunt, and implied a phase that only starts after Connection II's own scope finishes. It's now folded directly into Connection II instead, since a genuine end-to-end programmatic run cannot succeed without the handoff completing — there is no meaningful "Connection II done, handoff still pending" state. The task itself is unchanged: whether the target vault's 5 GUIDs and 14 aliases are the ones actually written and whether they resolve there — a defined, bounded config-validation matter, not an open investigation. The `{224668EF-...}` ruling-out below is unaffected by this reframing and still stands as a separate, unrelated finding.

## Open observation, not a confirmed finding — recurring "Vault application not found" errors (2026-08-02)

While investigating why the cross-vault handoff doesn't complete on Approbation's side, a specific GUID (`{224668EF-5C9F-437E-B278-B6775691F08E}`) was reported (by a separate analysis session) as the cause, allegedly visible in dev Approbation's own M-Files vault event log. That specific claim did NOT check out: a full export of dev Approbation's vault event log (`EventLogOperations.ExportRange`, 2,429 events, complete history) contains zero occurrences of this GUID or the phrase "not found." The GUID also does not match any installed custom application (checked via `GetCustomApplications()`, `GetCustomApplicationsEx2` for every `MFCustomApplicationType`/`MFExtApplicationPlatform` combination, on both Conformity_CP1 and dev Approbation — 14 distinct apps total, no match) nor any workflow/state/property/object-type/class/named-ACL GUID on either vault.

**What IS real:** the exact error string does appear, repeatedly, in the **Windows Application event log** (not the vault's own internal log), source `"M-Files"`, prefixed `"M-Files Online"`, message `"Not found. (Vault application not found. (ID: {GUID}))"`, from `RPCClientScriptHelper.cpp` line 375. But this is part of a **recurring background pattern spanning at least a full day** (first seen 2026-08-01 05:57 AM, still recurring 2026-08-02 07:30 AM — hours before this session's own test object was even created), cycling through a fairly stable set of ~15 GUIDs every few minutes, independent of any test run in this investigation. Several of the flagged GUIDs belong to applications independently confirmed to be installed and enabled (e.g. `{58E4F21F-...}` = M-Files Compliance Kit, confirmed live on both Conformity_CP1 and dev Approbation; several `{...}` GUIDs matching the four "M-Files Aino" apps confirmed installed on Conformity_CP1). A background process failing to find apps that verifiably exist is not consistent with "this GUID is the missing dependency blocking our specific move" — it looks like an unrelated, pre-existing issue with whatever "M-Files Online" is on this machine (not yet identified — possibly a cloud-sync/licensing background service, not investigated further).

**Do not treat `{224668EF-...}` as a confirmed root cause or install target without new evidence directly tying it to the `MoveObject` task's own execution** (e.g. a timestamp correlation with an actual test run, or the AppTaskException-based Task Manager evidence described in the skill above). Recorded here so a future session doesn't rediscover and re-chase the same unconfirmed lead.

---

## Skill: exhaustive-grep beats read-through for "does any app bind to state X" questions (2026-08-04)

Follow-up decode pass on the Connection II scenario map's undecoded gaps (`connection-ii-scenario-map.md`/`.xlsx`) — explicitly checking whether any of the four VAF apps (not just native VBScript) drive `Control Invoices` (119)'s classification or the 115/143 intake-landing quirk. Read-only, no writes, no test objects.

- **`Control Invoices` (119) routing is confirmed MANUAL, no automated driver anywhere.** State 119's own `GuardConditions` in `provisioning.db` are fully empty (no VBScript, no property precondition). Its 10 outgoing transitions are unconditional except `119→125` (real but undecoded condition). Full-text grepped all four apps' captured config JSON for `"119"` (as a state number) and `Controlinvoices` (the predicted alias) — zero matches, confirmed by direct search rather than an absence-of-mention read-through. **Method note:** reading each config file once (as done for the first-pass scenario map) is enough to catch bindings you're SEARCHING FOR, but a targeted grep across all four files for the specific number/alias in question is what actually closes out a "is anything bound here" question — read-through risks missing a binding buried in a long value; grep doesn't.
- **Intake-landing quirk (test objects consistently landing at 114/118 rather than progressing hop-by-hop from 115) is confirmed real M-Files engine behavior — not a harness artifact, not an add-on redirect.** Grepped all four apps for `"115"`, `"143"`, `Newdocument` — zero `ChangeWorkfow`-style direct-assignment bindings to either state (this project's own established redirect pattern, already confirmed for `WORKFLOW_ERREUR`→`WAIT_SQL_RETRY` and `IN_TO_UPD_CP1`→`OUT_TO_UPD_CP1`, does NOT apply here). One new binding found: M-Files Property Calculator DOES bind to state 115 (alias `WFS.Duplicate.Newdocument`, rule `Calculated_SubTotal` — computes `PD.Calculatedsub = Total-Tax1-Tax2`) — but it's a pure calculation that never touches `State`, so it doesn't explain the quirk; recorded as a previously-undocumented binding regardless. The real explanation was already on record in `AUDIT_LOG.md` and just needed connecting to the transition-guard data: on checkin, M-Files auto-fires any unconditional outgoing transition from wherever the object's `State` is set, cascading until it reaches a state whose forward progress genuinely depends on human action, a real conditional guard, or an async task result. 114 stops the cascade because it depends on SQL Query Vault Application's async call; 118 stops it because it depends on `FindDuplicates` (TaskType 3). Confirmed real and repeatable across 3+ separate test objects (`"143 doesn't stick"`), not a one-off.
- **New finding: Statement/OtherDoc/PackingSlip get reclassified to `CL.Trash` locally on Conformity, same as Trash itself.** `ConformityVaultApplication`'s `ChangeClassInWorkflow` has `Enabled:true` entries for all three (`"Trash-Statement"`→`RTE_Statement`/139, `"Trash-OtherDoc"`→`Rte_OtherDoc`/140, `"Trash-OtherDoc"`→`RTE_PackingSlip`/203 — the duplicate "Trash-OtherDoc" name is the same pre-existing copy-paste naming bug already documented for this app), on top of the already-known Trash(141) entry. These three "distinct" Vault Toolbox cross-vault destinations are treated identically to Trash on the SOURCE side, even though the Vault Toolbox move sends each to a genuinely different destination class in Approbation.
- **Credit-note sign-flip's exact per-field gate confirmed:** Property Calculator's `"Invoices (Crédit en Négatif)"` class is 5 independent rules (Total/Subtotal/Tax1/Tax2/Freight), each gated on `State = SET_CREDIT_NEGATIF AND that field > 0.00` individually — a field already ≤0 is left untouched by the sign-flip. More precise than the earlier "flips ... negative" summary, which didn't specify the per-field guard.
- **Alias-derivation pattern found, useful but NOT universal — don't over-trust it.** `WFS.<Workflow>.<Alias>` strings in these configs consistently squash from the state's current Name (strip spaces/underscores/hyphens/plus-signs, keep the first character, lowercase everything else) — confirmed against 11 independent alias/Name pairs already established elsewhere in this project (e.g. `Rteapproval`=`RTE_Approval`/132, `Intoupdcp1`=`IN_TO_UPD_CP1`/195, `Checkcredit`=`Check_Credit`/211, `Updduplicate`=`UPD_DUPLICATE`/118). It correctly predicted `Controlinvoices` as the alias to grep for state 119 (though the grep itself — not the prediction — is what confirmed the absence). **It is not reliable enough to use alone:** `WFS.Conformity.ToTrash` doesn't cleanly match either plausible candidate state (`RTE_To Trash`/126 or `Trash`/141) under strict application of the rule, and `WFS.Conformity.Bratravendor` (Property Calculator's `Set__SubTotal` rule — whose own human-typed condition *label* says `"State = Set__SubTotal"`, a mismatch with its own bound alias) doesn't match any of the 47 known states at all, suggesting a stale/orphaned binding to a renamed-away or removed state. Neither ambiguity was chased further, and neither was used to override an existing attribution (e.g. `"To trash"` = state 141, established in an earlier session) — flag pattern-derived matches as provisional until independently confirmed, exactly as done here.

Full detail (including the complete `Control Invoices` transition table and per-app grep results) is in `connection-ii-scenario-map.md`'s "Decode findings (second pass, 2026-08-04)" section and progress.md's matching entry.

## Reference: M-Files transition/state trigger architecture (standard M-Files design, not project-specific) (2026-08-05)

**This entry is background reference material from M-Files' own documentation, cited for context — it is NOT a project discovery.** The project's own empirically-confirmed findings for THIS vault (the 35/36 line-style correlation, the transition-222 rendering anomaly, and the cascade-vs-119 resolution, all in the entry immediately below) remain the authoritative record for Conformity specifically; this entry only explains the general M-Files mechanism those findings sit on top of.

- **Transitions ("the arrows") own the Trigger tab; states ("the boxes") do not.** Per M-Files' own user guide, a state transition's properties dialog has General / Permissions / Electronic Signature / **Trigger** ("Select conditions for automatic state transitions") / Advanced tabs. A workflow state's properties dialog instead has a **Conditions** tab (Preconditions — "properties that an object must have before it can be moved to this state"; Postconditions — "properties an object must have for it to be moved out of this state") and an **Actions** tab ("what happens when an object is moved to a specific workflow state"). This is exactly why state 119 (`Control Invoices`) itself came back with zero logic in this project's Stage 5 scan while its 10 outgoing edges carry all the real behavior — confirmed by M-Files' own design, not a gap in this vault's workflow or in the scanner. (This project's own docs use the shorthand "entry/exit actions" for the state-side Actions/Conditions tabs — that phrasing is this project's own summary, not M-Files' literal UI/API terminology, which doesn't use "EventEnterState"/"EventLeaveState" as tab or dialog names.)
- **`TriggerMode` values, per this project's empirical confirmation:** `0` = manual/solid line, a human must click; `4`/`5` = condition-based/dashed line, evaluated automatically on check-in (and periodically thereafter — see below). Matches the 35/36 correlation confirmed in the entry below; transition 222 remains the one open rendering anomaly, unchanged by this reference material.
- **Two additional mechanisms confirmed to exist in M-Files' trigger-script object model, not yet checked in this project before the pass logged below:**
  - **Time-based triggers (`TriggerInDays`)** — M-Files documentation confirms automatic transition triggers run "both when an object is altered... and also periodically for situations where the trigger depends on an external system," independent of `TriggerMode`/`TriggerCriteria` matching.
  - **Dynamic destination override (`NextStateID`)** — an `Out`-mode `MFilesAPI.Number` variable available specifically in automatic-state-transition trigger scripts: "the `NextStateID` variable contains the ID of the state for which the automatic state transition will be performed" — meaning such a script can redirect the object to a state other than the diagram-drawn destination at runtime. Related: `AllowStateTransition` (`Out`-mode Boolean, same script context) can allow or deny the transition outright, separate from whatever `TriggerCriteria`/`TriggerMode` already decided.
- See the deep-discovery entry immediately following this one for whether either mechanism is actually used anywhere in Conformity's 64 transitions / 47 states.

Sources: [State transition trigger](https://userguide.m-files.com/user-guide/latest/eng/workflow_state_transition_trigger.html), [Available VBScript variables](https://userguide.m-files.com/user-guide/latest/eng/Variables.html), [Workflow state transitions overview](https://userguide.m-files.com/user-guide/latest/eng/workflow_state_transitions.html), [Adding States to a Workflow / state actions, preconditions, postconditions](https://userguide.m-files.com/user-guide/latest/eng/adding_states_to_a_workflow.html), [Execution order of scripts](https://userguide.m-files.com/user-guide/latest/eng/execution_order_of_scripts.html).

## Skill: diagram line style (dotted vs. solid) reads `triggerMode`, not `triggerCriteria` — confirmed with one open exception (2026-08-05)

Read-only investigation, no vault writes. Tested a user hypothesis ("dotted = automatic-with-condition, solid = manual-with-condition") against the exported `conformity.png` diagram by cropping ~30 individual edges at pixel-level zoom and cross-checking each against `provisioning.db`'s `triggerMode`/`triggerCriteria`/`triggerAllowedByVBScript` for that exact transition.

**Confirmed rule:** line style follows `triggerMode` alone, not the presence/absence of `triggerCriteria`.
- **Solid = `triggerMode: 0`** (manual, human picks). All 13 sampled mode-0 edges rendered solid, including `Control Invoices` (119)'s 9 outgoing manual edges (which have no criteria at all) AND mode-0 edges elsewhere that also carry no criteria — mode 0 never carries criteria in this dataset, so criteria-presence can't be the driver for the solid side.
- **Dashed = `triggerMode: 4` or `triggerMode: 5`** (engine-automatic, with or without VBScript). 22 sampled mode-4/5 edges rendered dashed regardless of whether `triggerCriteria` was null (e.g. `115→114`, unconditional) or a real opaque-encoded value (e.g. `114→143`, `119→125`/transition 83, `143→216` vs. its sibling `143→116` fallback — both dashed even though only one carries real criteria). The clearest confirmation: `145→205` has two parallel transitions to the same target, id 204 (mode 0) solid and id 203 (mode 4, real criteria) dashed, side by side in the same crop.
- **The originally proposed rule ("dotted=automatic-with-condition, solid=manual-with-condition") is wrong as stated** — mode-0/solid edges are manual with NO condition (already established for 119, reconfirmed here), and mode-4/dashed edges fire automatically whether or not they carry a condition. The real split is purely `triggerMode` (human-selectable vs. engine-evaluable), not condition presence.
- **One confirmed, unresolved exception:** transition 222 (`211 Check_Credit → 213 RTE_CREDIT_POSITIF`, `triggerMode: 4`, real `triggerCriteria`) renders **solid**, not dashed — verified twice at pixel-level zoom to rule out a resolution artifact. `IsIntegrationTouching` and `Actions` don't distinguish it from its correctly-dashed neighbors (`213→118`, `213→212`, both dashed as expected) — no DB field explains the anomaly. Treat this as a known, isolated diagram-rendering inconsistency (or a gap in what `provisioning.db` captures for this one transition) rather than force it into the rule. Sample size: 36 edges checked, 35 fit the `triggerMode` rule cleanly, 1 doesn't.

**Separately, this also answers a question raised about the intake auto-cascade (`115→114→143→...`) vs. `Control Invoices`(119)'s wait-for-human behavior:** these are the SAME mechanism (`triggerMode`-driven auto-evaluation), not two different things. The cascade edges are `triggerMode: 4` throughout — including `114→143` and `143→216`, which carry real (not empty) `triggerCriteria` — so the engine is actively evaluating conditions at each cascade hop, not just blindly following single unconditional edges. `143` itself has two `triggerMode: 4` outgoing edges (`143→216` guarded by criteria, `143→116` an unconditional fallback) and still auto-resolves without human input, which rules out "a state only auto-fires when it has exactly one unconditional outgoing edge" as the mechanism — a state with multiple mode-4 edges still auto-resolves fine. `Control Invoices` (119) only waits for a human because 9 of its 10 edges are `triggerMode: 0`, which is never eligible for automatic evaluation regardless of how many such edges exist or whether any of them could be disambiguated some other way; its lone `triggerMode: 4` edge (119→125) is tried automatically same as any cascade edge, and if its criteria isn't met, the object simply has no automatically-eligible edge left and stops. So: `triggerMode` is a real, distinct, stored per-transition property that genuinely drives auto-vs-manual — it is not an emergent property of how many unconditional edges a state happens to have.

**Practical implication for the Path Builder tab:** the existing `pbEdgeClass()` classification (manual = mode 0; auto-criteria = mode 4 + real criteria; auto-vbscript = mode 5; auto-unconditional = mode 4 + no criteria) already keys off `triggerMode` directly from `provisioning.db`, which this finding confirms is the right signal — no change needed there. The diagram's dashed/solid rendering is a secondary, ~97%-reliable visual confirmation of the same `triggerMode` split, useful for a human eyeballing `conformity.png`, but should not be used as the primary or sole source of truth given the one confirmed exception.

## Deep discovery — TriggerInDays, NextStateID, AllowStateTransition swept across all 64 transitions + 47 states (2026-08-05)

Read-only, no vault writes. Follow-up to the reference entry above: checked whether Conformity actually uses the two trigger mechanisms flagged there as "confirmed to exist in M-Files, not yet checked in this project."

- **`TriggerInDays` sweep — one real hit, not a no-op default.** 63 of 64 transitions carry `triggerInDays: 365`, which reads as the M-Files UI's stored default rather than an active gate (it's present uniformly across mode-0, mode-4, and mode-5 transitions alike, including manual edges where a day-count wouldn't apply). Exactly one transition breaks that pattern: **id 98, `141 Trash → 147 END`, `triggerMode: 4`, no criteria, `triggerInDays: 1`.** Reading: an object sitting in `Trash` auto-finalizes to `END` after a 1-day delay rather than on the very next check-in like other unconditional mode-4 edges — plausibly a safety buffer for the cross-vault copy (per §2.4/Notes tab: "Local copy deleted only after cross-vault copy succeeds") to actually land before the local object disappears. **This does NOT explain the still-open 132(`RTE_Approval`)→147 timeout mystery** (objects 5427/5428 sitting 50min–several hours at 132 before reaching Trash/END): `147`'s only inbound edge is this one from `141`, and the delay under investigation happens *before* the object even reaches `141`/`147` — id 98 fires downstream of, not during, the observed dwell. `132`'s own outgoing edge (id 82, `132→141`) has the default `triggerInDays: 365`, so no schedule-based mechanism on that edge either.
- **`NextStateID` sweep — zero hits.** All 10 VBScript-bearing transitions (67, 80, 81, 82, 91, 92, 188, 212, 217, 245) were read in full; none references `NextStateID`. Nine use the identical "wait N minutes since `PropertyValues.SearchForProperty(21)`, then `AllowStateTransition = True`" timer pattern already documented (property 21 isn't in this project's own captured custom-property list, so it's a built-in system property — plausibly `Created`, not independently confirmed which one; if it is object-creation time rather than time-since-entering-this-state, these timers are trivially satisfied almost immediately in practice, well before the object reaches these downstream states). **No transition in this workflow overrides its diagram-drawn destination at runtime** — the drawn arrow is a reliable destination for every edge checked.
- **`AllowStateTransition = False` sweep — one explicit hit, already-known content.** Only transition 217 (`213 RTE_CREDIT_POSITIF → 212 Contrôle Note de Crédit Positif`) explicitly sets `AllowStateTransition = False` under a real condition (the linked-invoice Docname-ID duplicate check already decoded in this project's prior sessions) — the other 9 VBScript transitions only ever set it `= True` conditionally and never assign `False` explicitly. Not a new finding; re-confirms prior decoding, now framed against this specific mechanism.
- **State-level entry/exit script sweep — full re-confirmation, nothing missed.** Parsed `Actions`/`GuardConditions` JSON (not a naive text-substring search, which false-positived on every state because the JSON schema's own key names contain the literal substring "VBScript" regardless of whether they're populated) for all 47 states. Exactly 4 states carry real VBScript: **115** (`actionRunVBScript` — the already-documented PO-cleanup-plus-dashboard-date-stamp script, `progress.md` row 115), and **124/202/203** (`preconditionsVBScript` — the already-documented "VALIDATE APPROVER" guard, `progress.md` rows 124/202/203). Three more (139, 140, 155) have `preconditionsPropertyEnabled` (opaque property-based, non-VBScript) preconditions, also already documented. Every other state's `WorkflowTransitions.Actions` and `WorkflowStates` action/guard fields are the boilerplate empty/false shape. **Conclusion: the existing master 47-state table (progress.md) is accurate and complete — this fresh pass found nothing it missed.** Also confirmed structurally: `WorkflowTransitions.Actions` is empty for all 64 rows (0 non-empty) — this workflow has no separate before/after-transition script surface beyond the single `triggerAllowedByVBScript` Trigger-tab field already captured.

**Conclusion for the Path Builder — no new edge category needed.** `NextStateID` (zero hits) would have been the one finding that could break the Path Builder's core assumption that a drawn edge's destination is guaranteed — it isn't present anywhere in this workflow, so that assumption holds. The `TriggerInDays: 1` finding on id 98 and the `AllowStateTransition = False` finding on id 217 are both refinements *within* the existing "automatic" bucket (a delay value, a self-cancel condition), not a structurally different kind of edge — the current manual / automatic / app-assigned taxonomy stays structurally correct. Optional, low-priority follow-up (not implemented here, no HTML changed): id 98 could carry a small "waits ~1 day" annotation the same way transition 222 carries its line-style-exception note, since "fires on its own if reached" is misleadingly instantaneous-sounding for that one edge specifically.

## Confirmed object-type ↔ SQL column mapping, via External Database Connection (2026-08-06)

Read-only, no vault writes. Confirmed directly via M-Files Admin > Object Type Properties > "Connection to External Database" for three of Conformity_CP1's object types (Company, Conformity, CP1), cross-checked against real `dbo.Company`/`dbo.Conformity` SQL columns (direct `SELECT`). Extends the `IObjectTypeAdmin`/`ColumnMappings` finding already on record for Company (customer-specific-value inventory entry above) with two more object types and the exact field-level mapping.

**Company** (class properties: CompanyName, CompanyDatabase, CompanySQL, CompanyCode, Company_CP1_ID, CompanyERP — 6 total):

| SQL Column | M-Files Property | Connected? |
|---|---|---|
| ObjectID | (join key) | Yes |
| CieCode | CompanyCode | Yes |
| Name | CompanyName | Yes |
| URL | CompanyERP | Yes |
| SERVERNAME | CompanySQL | Yes |
| SQLDATABASENAME | CompanyDatabase | Yes |
| — | Company_CP1_ID | **Not SQL-connected** — a plain property definition on the class; population source not yet confirmed (manual entry, VBScript, or add-on write — not via this connector) |

Of the 19 real SQL columns on `dbo.Company` (confirmed via direct `SELECT`: `Dos`, `CieCode`, `ObjetID`, `Name`, `URL`, `URL2`, `URL3`, `SERVERNAME`, `SQLDATABASENAME`, `LOGIN`, `PASSWORD`, `PARTITIONID`, `Connecteur_Endpoint_Acomba`, `Token_Acomba`, `PREFIX`, `Connecteur_Endpoint_Procore`, `Token_Procore`, `client_id_Procore`, `client_secret_Procore`, `Company_Procore_ID`), only the 6 above are object-property-connected. All credential/endpoint fields (Acomba token, Procore client ID/secret/token) exist in SQL but are deliberately kept off the M-Files property layer — confirms and extends the earlier `TargetPropertyDef=-104` finding that credentials are never exposed as a visible vault property.

**Conformity** (class properties: Name/title, DatabaseServerName, DatabaseName — 3 total, all connected):

| SQL Column | M-Files Property |
|---|---|
| ObjectID | (join key) |
| DatabaseName | DatabaseName |
| DatabaseServerName | DatabaseServerName |

Conformity is a pure pointer object — no business logic, just server/database identity. The other 5 columns on `dbo.Conformity` (`TableNameMASTERDATA`, `TableNameMASTERDATE`, `OutputFilePathPROD`, `OutputFilePathLEARN`, `DBmanager`) exist in SQL but are explicitly mapped to "(ignore)" in this connector — **confirmed NOT the mechanism behind `DatabaseTableToCSV`'s export path** (an earlier hypothesis, now ruled out for this connection specifically; whether these columns are read directly by SQL query text elsewhere remains unconfirmed/unchecked).

**CP1** (class properties: VendorID, VendorName, VendorCity, VendorAddress, Split — 5 total):

| SQL Column | M-Files Property | Connected? |
|---|---|---|
| IDObjet (French label "ID d'objet" — same field, localized UI) | (join key) | Yes |
| VendorID | VendorID | Yes |
| Name1 | VendorName | Yes |
| City1 | VendorCity | Yes |
| — | VendorAddress, Split | **Not SQL-connected** — population source not yet confirmed. `Split` plausibly computed via Property Calculator's `Découpe_Automatique` logic (already documented elsewhere in this file) rather than imported from SQL. |

**Cross-vault note:** all three of these object-type connections were found with their "Disabled" checkbox checked — consistent with this vault being a reused/cloned copy where the SQL connection is deliberately deactivated by default. The user is re-enabling all four object connections (Company, Conformity, CP1, and Vendor) after first confirming each one's connection string actually resolves to the local dev server (`DESKTOP-DKCS42P`, database `MfilesData`) rather than the original production server. **This is a separate config layer from SQL Query Vault Application's own connection**, which is still confirmed pointing at `TERGOS-MFILES01\SQLEXPRESS` — the actual, still-unresolved blocker for state 114 (see "Live failure proof" entry above).

**Open threads, flagged not chased:** `Company_CP1_ID`'s and `VendorAddress`/`Split`'s actual population sources remain unconfirmed. Whether Conformity's 5 unmapped SQL columns are read directly by any SQL query text elsewhere is unconfirmed.

## Skill: Vault Toolbox task processor cannot authenticate — root cause of the never-completing cross-vault handoff (2026-08-06)

**Method: `IVaultApplicationTaskOperations` (`vault.ApplicationTaskOperations` → `GetTaskQueues()` / `GetTaskIDsFromQueue()` / `GetTasks()`) is a genuine, working, read-first COM path onto real task-queue state.** A 2026-08-01 session found this same API but assumed `OpenTaskQueue` was a required prerequisite for reading task status and did not pursue it further ("`GetTaskIDsFromQueue` requires `OpenTaskQueue` registration first ... not pursued further," per `AUDIT_LOG.md`). That assumption was wrong — `GetTaskIDsFromQueue`/`GetTasks` return real, populated task records (state, progress, task data, stack traces) with no `OpenTaskQueue` call at all. This closes a real methodological gap this project had carried since 2026-08-01, distinct from (and now superseding) the "check M-Files Admin's Background Tasks view" plan that stood as the concrete next step for this thread as of the 2026-08-05 handoff note.

**Test:** a fresh object (5431) was created in Conformity_CP1 and driven via real `CheckOut`/`SetProperty`/`CheckIn` transitions (the same isolated-handoff path already proven for 5428/5430 — State=143 at creation auto-lands at 118, bypassing state 114's SQL dependency entirely). Passing through state 118 (`UPD_DUPLICATE`) enqueued a real `FindDuplicates` task — the same Vault Toolbox task-processing mechanism (`MFiles.VAF.AppTasks.TaskProcessingJob`) that `MoveObject` uses.

**Result, read back ~20-100 seconds later, unchanged across every poll:**
```
State: 3 (Failed)
ErrorMessage: "Authentication failed. (0x8004001A)" — RPCLogin.cpp / MFilesSession.cpp / CoMFilesServerApplication.cpp
StackTrace: at Docned.VaultToolbox.VaultApplication.FindDuplicatesTask(...) VaultApplication.cs:line 133
            at MFiles.VAF.AppTasks.TaskProcessingJob`1.RunJobImpl()
            at MFiles.VAF.AppTasks.TaskProcessingJob.RunJob(Exception lastTryException)
```
`ReservedAt` and `EndedAt` are the same second — the task fails on its own internal login attempt, before doing any real duplicate-search work.

**Conclusion: Vault Toolbox's task processor cannot authenticate to the vault at all, for any task type it processes — not just `MoveObject`.** This is the direct, concrete explanation for why `ToolsBoxQueryDone` has never fired on any test object (5427, 5428, 5429, 5430, now 5431), closing the question flagged repeatedly across this project as "the task processor side has never been directly inspected." It is not a stale NVS config, not a wrong Destination Vault GUID, not a silently dropped enqueue (the enqueue side was already separately proven working via this exact same sibling-task method on 2026-08-02) — the shared task-execution layer itself is broken.

**Regression, not a standing condition:** this same task type (`FindDuplicates`, same processor infrastructure `MoveObject` uses) demonstrably succeeded around object 5430's era (2026-08-02, `PD.Searchcount=1` written back). Something changed the authentication path between then and now (2026-08-06). **Root cause of the authentication failure itself is UNDIAGNOSED** — candidate causes (service-account credential rotation, expired token, a change from the various `MFServer` restarts/config reloads performed across this project's sessions) were not investigated this session. This is a standalone environmental/credential issue, not a Connection II gap — see the Connection II closure entry in `progress.md`.

**Documentation conflict flagged, not resolved:** this project's existing "State-level entry/exit script sweep" finding (`skills.md`, "Deep discovery — TriggerInDays..." entry, 2026-08-05) documents states 124/202/203's precondition script as "the already-documented 'VALIDATE APPROVER' guard." The live precondition failure observed on object 5431 entering state 202 was named, in the vault's own error output, `"Vérifier fournisseur"` ("verify vendor/supplier") — a different label. Not reconciled this session: possibly the same script under an inaccurate documented name, possibly two distinct guard components on 202 with only one previously decoded, possibly a genuinely new finding. Flagging rather than silently correcting either document.

## Skill: the first real implementation of a design is itself a validation step — treat gaps the build finds as expected, not a failure of the design (2026-08-11)

**General principle, reusable beyond this project:** a design document — however many correction passes, however carefully cross-checked against vendor sources or third-party structuring audits — has only ever been validated against *reading*, not against *use*. Writing the first real code against it is a different, stronger kind of test: it forces every implicit assumption the prose glossed over to become an explicit branch of logic, with no ambiguity left to paper over. Finding that some of those branches don't have a clean answer in the source document isn't the build failing to follow the design — it's the build doing exactly what a first implementation is for. Treat it as expected and valuable, not as a defect in the earlier design work.

**Concrete evidence from this project — building `ProvisioningAI.Workflow/Translation/` against MfilesProperties.md §3.5 found three real gaps in §3.5 itself, not three implementation questions with an obvious answer already sitting in the text:**

1. **The unlabeled/skeleton split.** §3.5 talked about "unlabeled" Mermaid edges as a single fuzzy case. In code, that collapses two situations that need different defaults: a genuinely bare edge (`StateA --> StateB`) is a deliberate, lossless manual-transition encoding (§3.5's own first table row) — `IsSkeleton = false`. A labeled-but-unparseable edge (prose, a typo'd grammar) is the real skeleton-degradation fallback — `IsSkeleton = true`. **How this was proven load-bearing, not a style preference:** §6.2's own acceptance test — built from this document's own worked example — fails without the distinction. A resolver that treats "no label" and "unparseable label" identically cannot set `IsSkeleton` correctly for one without breaking the other. That's the build finding a real bug in the spec, using the spec's own worked example as the test oracle.
2. **The sidecar-scope correction.** The design's own language implied (without ever quite stating) that a sidecar config file might hold real field values for any rule. Implementing the resolver revealed that `role(...)`/`after(...)`/`if(...)` are all fully self-contained inline in the Mermaid label — the sidecar's only genuine job is the VBScript body lookup for `script(Name)`, because Mermaid labels can't hold multi-line script text. A narrower, more honest sidecar schema than the design's own loose phrasing implied.
3. **The implicit-state-discovery limitation.** The design's planned "dangling state reference" validation check turned out to be structurally vacuous under the document's own default authoring convention (states inferred from edge endpoints, exactly as every worked example in §6 is written) — there's no separate "declared states" list for an edge to dangle against unless the diagram opts into one. This wasn't visible from reading the prose; it only became visible once the validator had to be coded against a real state list that had to come from *somewhere*.

**All three were folded back into MfilesProperties.md §3.5 itself** — not left as code comments, not treated as implementation-only footnotes — because a design document that's wrong about its own conventions is a documentation bug, not an implementation detail. The build corrected the design, not just the design driving the build. See MfilesProperties.md §3.5 (Decision 2, the sidecar-scope paragraph, and the optional `state X` declaration convention) for where each landed, and progress.md's 2026-08-11 entry for the full build narrative.

**Corollary, found the very next day building the companion renderer:** the same principle applies recursively — the *renderer*, as the second real consumer of the design (via `TranslationPlan`), found a fourth gap (`EvaluationPriority` documented in §3.5 but never implemented in the resolver) that the *first* implementation had itself missed. Each additional real consumer of a design is another chance to catch what the previous ones didn't. Don't treat "the build already happened once" as proof the design is now fully validated.

## Skill: before treating something as a recurring open question, check whether it's already correctly implemented and just never stated explicitly (2026-08-16)

**General principle, reusable beyond this project:** a question that keeps resurfacing across a session doesn't automatically mean it's genuinely unresolved. Sometimes the answer already exists, correctly and consistently, spread across a decision document and its actual implementation — it just was never collected into one explicit sentence, so each new mention of it reads like an open item. Before scoping a fix or a new decision, check the real current state of both the spec and the code it governs; the honest answer might be "already done, just never written down that way."

**Concrete evidence from this project:** whether M-Files Flow's diamond shape ever survives into real M-Files-style output, and whether incoming-edge count alone could ever trigger one, felt like a live open question across several tasks this session. Checking the actual decision text (MfilesProperties.md §3.5, Decisions 3 and 5) and the actual rendering code (`TranslationPlanRenderer.html`'s `renderMFilesDiagram`, which draws every resolved state as `el('rect', ...)` regardless of collapse/promote status) found the answer was already fully implied and already correctly implemented — nothing needed to change, only to be stated. Filed as a clarifying addendum to the existing decisions, not a new one, since nothing new was actually decided. Full text: MfilesProperties.md's 2026-08-16 addendum; project-log entry: progress.md's matching 2026-08-16 entry.

## Skill: when extending a right-click menu, match the app's existing "doesn't apply" convention instead of inventing one — and reuse already-computed state instead of recomputing it again (2026-08-16)

**General principle, reusable beyond this project:** two small, easy-to-skip habits pay off disproportionately when adding a new context-menu item. First, check how the app already distinguishes "this action doesn't apply to this context" from "this action applies but isn't currently actionable" — most established UIs already have both patterns, and picking the wrong one for new content reads as inconsistent even if functionally correct. Second, before computing a new UI's data, check whether the value already exists somewhere else in the same render — reusing it isn't just less code, it's a guarantee the new UI can never show a different answer than the UI it's sitting next to.

**Concrete evidence from this project — M-Files Flow's right-click diamond info:**

- **Convention matching, not invention.** BPMN Standard's own node context menu (`BpmnCanvas.jsx`) already used two different patterns side by side: `disabled={!canUndo}` for Undo (applies, just not currently actionable) versus `{selectedNode?.parentId && (...)}` conditionally omitting the Detach button entirely (doesn't apply to a node with no parent at all). A non-branching state's diamond info is the second case, not the first — right-clicking `Draft` (1 outgoing transition) correctly shows zero diamond-related content, matching the Detach precedent, rather than a grayed-out "Diamond" row that would misleadingly imply a diamond almost exists.
- **Reuse over recompute, concretely.** `isDiamond`/`diamondTitle` were already computed once per render in `statesWithMeta` (built for the Layers-palette task). The new context-menu code looks that value up by name rather than recomputing the same `outgoing >= 2` / inbound-count formula a third time in a third place. Same discipline applied to the branch-jump buttons: each one calls the exact `panToState` function already built for the Layers palette's click-to-select-and-center, not a new pan mechanism — meaning the badge, the Layers list, and the right-click menu are structurally incapable of disagreeing with each other, because they're reading and calling the same code, not three independent copies of it.
- **Verified the reuse actually holds under a real mutation, not just visually.** Deleted a real transition (dropping a branching state to 1 outgoing) and confirmed the table badge and the right-click content disappeared on the same render, together — proof the "single source of truth" claim is real, not just visually similar.

## Skill: a reported "broken" interaction may never have existed — confirm via full code search and git blame before diagnosing a regression (2026-08-16)

**General principle, reusable beyond this project:** when a user reports an interaction as "broken," the honest first question is whether it was ever built at all, not just whether it currently works. A missing feature and a regressed feature look identical from the outside (both "doesn't do the thing"), but they call for completely different responses — one needs building, the other needs debugging a specific change. Confusing the two wastes time chasing a regression that doesn't exist, or worse, quietly building a workaround for something the user actually wanted built properly.

**Concrete evidence from this project:** reported as "drag-to-connect is broken," investigated by searching `MFlowCanvas.jsx` for any handle/anchor/port/connect logic (found none — the only node-interaction code was reposition-drag) and running `git log -L` on that exact block, which showed it unchanged since the very first commit of the file. Full diff of the two most recent commits against the file confirmed zero lines touched in that section. This wasn't a regression from recent work at all — it was a feature that had never been built, correctly distinguished from BPMN Standard's own real drag-to-connect (React Flow's native `Handle`/`onConnect`) by checking that file too rather than assuming parity. Reported the finding plainly before writing any code, which let the user decide whether to scope a real build (they did, next session) rather than silently patching around an absent feature.

## Skill: excluding an entity from a position-tracking map for a missing field can silently corrupt lookups for OTHER entities near it, not just fail to track the excluded one (2026-08-16)

**General principle, reusable beyond this project:** a common pattern for resolving "what does this rendered thing actually correspond to" is nearest-neighbor matching against a map of known, named entities — build the map from whatever has a real identifier, skip anything that doesn't (a pseudo-node, a label-less placeholder, an anonymous group). The bug this pattern hides: skipping the unnamed entity doesn't just mean it goes untracked — the nearest-neighbor search itself has fewer real candidates to choose from, so a lookup that *should* resolve to the unnamed entity now resolves to whatever named entity happens to be geometrically closest instead. That wrong resolution can then get silently discarded by an unrelated-looking guard (e.g. "same source and target, skip this edge") rather than surfacing as an obvious error, making the failure look like nothing was tracked at all rather than what actually happened: something real got misattributed to the wrong id.

**Concrete evidence from this project — M-Files Flow's `[*]` Initial-state marker "detaching" on node drag:** `MFlowCanvas.jsx`'s node-centers map was built by looping every rendered node and skipping any with no text label (`if (!lbl) return;`) — correct for real states, wrong for Mermaid's `[*]` start pseudostate, which legitimately has no label but still has a real edge pointing into a real state. Excluding it from the map meant `nearest()` (used to resolve every edge's true fromId/toId from its drawn path) had no candidate for the marker's own position, so the marker edge's fromId fell through to the nearest *named* node — the state it points at — making fromId equal toId, which an existing, correctly-intentioned self-loop guard then silently dropped from the edge-redraw list. The state moved; the marker never did, on any render, not just during a live drag — because the same wrong resolution happened fresh every time. Fix: give the label-less entity a synthetic id so it's a real map entry (invisible to any lookup keyed by real names, since those always derive from `sanitizeStateId(realName)`), folding it into the exact mechanism every named entity already used correctly, rather than writing new position-tracking logic for one special case. Verified with the identical real-`page.mouse`-driven reproduction before and after: the edge path was byte-identical pre-fix (frozen) and fully recomputed to the real post-drag position after.

## Skill: an external document's own self-described history is a claim, not a source — verify it against real code/commits before letting it override a shipped decision (2026-08-19)

**General principle, reusable beyond this project:** a document that arrives from outside the project — brought in for review, written by another tool or a prior draft process — sometimes carries its own "changelog" or "what we already tried" section, presented with the same confident tone as a verified fact. That tone is not evidence. Treat an external document's self-described institutional memory as a claim to be checked against this project's actual repository state (real commits, real files on disk, real dated log entries), not as a peer source that can be taken at face value or allowed to quietly override something this project already built and verified. When the two disagree, the external document is wrong until its claim is confirmed against real evidence — not the other way around.

**Concrete evidence from this project:** `mermaid-workflow-designer-prd.md`, an external document brought in for review, proposed a "skeleton-only" architecture that would defer all automatic-transition condition/trigger logic to M-Files Admin — and its own §11 changelog asserted that embedding this logic in Mermaid labels "was tried and explicitly reversed" in this project. Checked against the real repository instead of accepted on description: `src/utils/transitionGrammar.js` exists on disk, was committed (`commit 2599827`), and `progress.md`'s 2026-08-16 dated entry records it as built, live-Playwright-verified, and shipped — never attempted-then-rolled-back. The external document's claimed history was simply false. Confirmed the actual decision (grammar authoring stays as-built) and corrected the discrepancy on the record in `MfilesProperties.md` rather than letting a plausible-sounding external "we already tried this" quietly reopen a settled, verified decision. Same discipline this project already applies to other externally-sourced claims (e.g. the Qwen structuring audit's gaps, checked against verified vendor citations rather than accepted as given).

## Skill: when a new feature needs a shared action's default behavior to change, add an opt-in parameter instead of flipping the default (2026-08-19)

**General principle, reusable beyond this project:** a store/service action used by two different UI surfaces can have two genuinely different safety requirements at once — one surface may need to keep blocking on a condition, another may need to proceed past it. The tempting fix is to change the action's own default behavior once the new surface's real need is confirmed; the correct fix is to add an opt-in parameter that defaults to the *existing* behavior, so the surface that already depends on it byte-for-byte is provably unaffected, and only verify that claim, not assume it.

**Concrete evidence from this project:** M-Files Flow needed cascade-delete (remove a state's connected transitions automatically, matching BPMN Standard's own confirmed real behavior) where Studio's table needed to keep its original block-and-alert guard. `useWorkflowStore.js`'s `deleteState` gained `{ cascade: false }` as an optional param — Studio's call site (`CommandCenter.jsx`) needed zero changes and still shows the exact original "in use, remove its transitions first" alert, re-verified live after the change; M-Files Flow's three call sites (single delete, bulk delete, the new floating toolbar) all pass `{ cascade: true }`. Same precedent this codebase already established for `addState`/`addTransition`'s own optional patch params — extending a shared action without touching its existing callers, verified rather than assumed safe.

## Skill: in-process computation time and process-spawn time are different numbers — measure both before picking spawn-per-call vs. a persistent host (2026-08-19)

**General principle, reusable beyond this project:** when scoping a bridge between a UI process and a compiled backend, "how fast is it" is really two separate questions that get conflated if only the end-to-end wall-clock is measured: how long does the actual computation take once the runtime is already warm, and how long does starting that runtime cost per invocation. Assuming the algorithm is the bottleneck — without isolating runtime startup — can lead to over-optimizing code that's already effectively free, or under-scoping an architecture change (a persistent warm process) that's the only thing that actually moves the number that matters.

**Concrete evidence from this project:** a real, disposable timing probe against `ProvisioningAI.Workflow`'s `TranslationPipeline.Translate()` (a pure, side-effect-free static call) showed a fresh-process invocation costing ~250–300ms wall-clock, while the in-process call itself — timed with a `Stopwatch` around just that line, steady-state median over 100 calls — cost ~0.04–0.10ms. Over 2,500x apart. Without separating the two, "250ms per call" reads as a translator performance problem; with them separated, it's obviously 100% CLR/process-startup cost, and the real decision is spawn-per-call (fine for on-demand recompute) vs. a persistent warm process (needed for genuinely live updates) — a scope/architecture choice, not a code-optimization one. Also worth its own note: `dotnet run` (even with `--no-build`) measured 8–10x slower than invoking the already-compiled artifact directly — a trap easy to fall into if a CLI bridge is prototyped with `dotnet run` and the latency numbers are trusted at face value.

## Skill: passing a hand-authored spec sample doesn't prove a parser handles a real upstream producer's actual output shape (2026-08-20)

**General principle, reusable beyond this project:** a parser/translator verified against the spec's own worked examples is proven correct for *that* input shape — it is not thereby proven correct for whatever a *different*, independently-built producer of the same nominal format actually emits. Two components can each be individually well-tested and still fail the moment they're wired together for real, if one assumed a narrower grammar than the other actually produces. The only way to find that gap is to run the real producer's real output through the real consumer, not to re-run the consumer's own existing test fixtures.

**Concrete evidence from this project:** `ProvisioningAI.Workflow.Translation.MermaidParser.cs` had 24 passing tests, all exact-matching MfilesProperties.md's own §6 worked examples — and was genuinely correct against that input shape. `useMermaid.js` (M-Files Flow's own Mermaid emitter, built independently, for rendering purposes) emits a real, valid Mermaid construct — `ID : label` aliased state declarations — that the parser's grammar had never been asked to support and silently dropped as an unrecognized line, making any state with no edges yet invisible to the translator. This was caught only when the operator actually drew a state on the real canvas and watched the real translated output — not by any of this session's own first-pass Playwright verification, which (see the "the previous report claiming this worked was apparently wrong" correction the same day) initially reused the parser's own already-proven-correct sample text instead of the canvas's real live output for one code path, and missed it too. First-party integration testing with the real producer's real output, not just spec-fixture replay, is what actually closes this class of gap.

## Skill: SVG paint/hit-test order follows the whole subtree's document position, not when an element was appended in JS (2026-08-20)

**General principle, reusable beyond this project:** in SVG (no `z-index` in the classic model), a later `appendChild` call does not guarantee an element paints on top if that element is nested inside a parent that itself sits earlier in the document tree. A child appended to an early-positioned `<g>` still paints — and receives `elementFromPoint` hits — behind anything appended directly to a later position in the top-level `<svg>`, regardless of which JS code ran second. Reasoning about interactive-element stacking by "which line of code ran last" is wrong in SVG; the actual DOM tree position of every ancestor is what matters.

**Concrete evidence from this project:** `MFlowCanvas.jsx`'s drag-to-connect handle is a small `<circle>` appended as a child of its state's own `<g>` (an early-positioned element, from Mermaid's original render). A transition's own reconnect-handle circles (`.mflow-edge-endpoint`) are appended directly to the top-level `<svg>`, in code that runs *before* the connect-handle's own node loop — but because they're appended to a later top-level position regardless, they paint on top of, and intercept clicks meant for, any connect-handle sitting at the same screen position. Confirmed precisely via `document.elementFromPoint()` at the exact computed handle coordinates, not guessed at. **Scope confirmed broader than first thought (2026-08-20):** re-triggered independently via a *different* element of the same kind — `.mflow-edge-hit` (an edge's own wide invisible right-click hit-stroke, also appended directly to the top-level `<svg>`) — while building a 3-source hub for an unrelated verification task. Not limited to "a handle's second use once that side already has an edge," as first characterized: any connect-handle whose screen position happens to fall under *any* rendered edge's path or hit-area is affected, regardless of which state owns which edge. No functional damage in either case — the swallowed drag is a clean no-op, zero dangling data, confirmed recoverable by simply repositioning the source state and retrying. Found and flagged both times, not fixed, since a real fix means detaching connect-handles from node-local positioning entirely — operator's own standing call: track separately.

## Skill: automated UI test tooling must use an isolated profile — sharing a default user-data directory with a real running session risks corrupting it (2026-08-20)

**General principle, reusable beyond this project:** Electron (and browser automation generally) defaults to one shared profile directory per app identity unless told otherwise. Launching a second, automated instance against that same default profile while a real, human-driven session is also open means both processes read and write the *same* persisted storage (localStorage, IndexedDB, etc.) concurrently — a test script's `localStorage.clear()` or similar cleanup step can silently wipe the real session's data mid-use. Test harnesses should pass an explicit, disposable `--user-data-dir` (or equivalent) from the first script written, not retrofit it after noticing a real session is open.

**Concrete evidence from this project:** several of this session's own early Playwright/Electron verification runs launched against Electron's default profile before noticing the operator had a real `electron:dev` session open sharing that same profile — at least one of those runs had already called `localStorage.clear()` against it. Flagged directly to the operator the moment it was noticed; every verification run after that point used a fresh, isolated `--user-data-dir` per launch (and cleaned itself up afterward), with zero further risk to the real session. The fix cost nothing (one extra launch argument) and should have been the default from the first test script, not a correction applied mid-session.

## Skill: to verify rendering logic for data your UI has no way to author, inject via the app's own already-shipped persistence format, not a new mechanism (2026-08-20)

**General principle, reusable beyond this project:** when a rendering path depends on a data field that the current UI genuinely has no way to set (by design, or because authoring it lives in a different, out-of-bounds surface), don't skip verification and don't invent a new backdoor to set it either. If the app already persists its own state in a known, stable format (a `localStorage` key, a config file, a database row), writing directly into that format — using real field names and real value shapes the app already reads on every load — is a legitimate, low-risk verification technique. It's not a new mechanism, it doesn't touch source code, and it produces exactly the state a legitimate but out-of-scope path (a different UI, an import, a sync) would have produced anyway.

**Concrete evidence from this project:** verifying that M-Files Flow's M-Files Diagram tab renders automatic-grammar transitions (`after()`/`if()`/`script()`) as dashed lines needed a real transition with a `conditions` value set — but M-Files Flow's own Transitions table is deliberately read-only for that field (grammar authoring is a Studio-only surface, out of bounds for this task's own explicit boundary). Rather than building new authoring UI (out of scope) or skipping the check, the test read `localStorage.getItem('provisioningai-workflow-store')` (the app's real `zustand persist` key), parsed it, set one real transition's `conditions` field to `'after(3d)'` in place, wrote it back, and reloaded — the app then loaded and rendered exactly as if that data had arrived through any legitimate channel. This is not equivalent to "editing the store's source code" or "using Studio" — it's producing the same persisted shape those already do, from outside the running app, for verification purposes only.

## Skill: `window.prompt()`/`alert()`/`confirm()` native dialogs are not reliably interceptable via Playwright's `dialog` event inside an Electron app — stub the function directly instead (2026-08-20)

**General principle, reusable beyond this project:** Playwright's `page.on('dialog', ...)` listener is built for Chromium's own JS-dialog CDP events (`Page.javascriptDialogOpening`), which regular web pages' `window.prompt`/`alert`/`confirm` calls go through. Electron's renderer, however, implements these via its own synchronous IPC path to the main process to show a native OS dialog — a different code path that may not surface through the same CDP event Playwright listens on. A `dialog` listener attached before triggering the call can simply never fire, with no error either (the call just returns `null`/`undefined` synchronously, as if the user immediately cancelled) — silently producing "nothing happened" instead of a clear failure, which is easy to misdiagnose as the *feature* not working rather than the *test harness*.

**Concrete evidence from this project:** verifying a new "Group" action that calls `window.prompt()` to collect a process name, a `page.once('dialog', dialog => dialog.accept('Intake Review'))` listener never fired, and the resulting UI showed no group had been created — looking exactly like a broken feature. The actual cause was `window.prompt()` returning `null` before Playwright's listener ever got a chance to intercept anything, inside this specific Electron build. Fixed the *test*, not the product: `await page.evaluate(() => { window.prompt = () => 'Intake Review'; })` before triggering the action, replacing the native call with a synchronous stub entirely within the page's own JS context — no dependency on native dialog interception at all. Once stubbed, the exact same verification passed cleanly on the first try.

## Skill: a flex child sized directly by JS needs flex-shrink:0 — otherwise the flex container's default shrink behavior can silently diverge from what the JS math assumes, with no error (2026-08-20)

**General principle, reusable beyond this project:** when JavaScript sets an element's `style.width` (or height) directly to implement some calculation — a zoom level, a computed layout, a manual scale factor — that element must also be told `flex-shrink:0` if it's a flex child, and an equivalent for grid children. The CSS flexbox default (`flex-shrink:1`) lets the browser silently render the element SMALLER than the width it was just told to have, whenever that width would overflow the container. There's no error, no warning, no exception — `style.width` reads back exactly what was set, while `getBoundingClientRect()` reports the real, silently-clamped size. Any code that later reads geometry back from the DOM (`getBoundingClientRect()`, `getScreenCTM()`, a scale computed from rendered size) gets a value that quietly disagrees with the JS's own assumption, with no signal that anything went wrong.

**Concrete evidence from this project:** M-Files Flow's node-drag code computes screen-to-SVG-user-space deltas via `getScreenCTM()`, and grows the SVG's viewBox to keep the dragged node visible via `growViewBoxToFit()`, which sets `svg.style.width` directly. `.mflow-diagram` (the SVG's parent) is `display:flex`, and the SVG itself had no `flex-shrink:0`. During a live drag, once the JS-requested width exceeded the container, the flex container clamped the SVG's real rendered width below what `style.width` said — confirmed live via diagnostic logging: `style.width` climbing every mousemove step while `getBoundingClientRect().width` stayed frozen at exactly 513.453125px. `getScreenCTM()`'s scale was computed from that too-small real size, so `toUserDelta()` divided by a smaller-than-true scale, producing inflated position deltas, which grew the viewBox even further next frame — a genuine, confirmed exponential feedback loop (viewBox grew from ~420×120 to ~6,459×4,764 units over ~20 mousemove steps for a 650×500 screen-pixel drag). Fix was one CSS line: `flex-shrink:0` on `.mflow-diagram svg`. Verified fixed with real Playwright evidence (moderate live drag, no reload) plus a full regression pass (connector handles, decision tiles, process groups, transition labels, edge deletion/bulk delete, all 4 tabs) — zero console errors, zero side effects.

## Skill: when a bug is fixed by adding a line to one state-declaration code path, check every OTHER code path that declares the same kind of node — the same gap can exist there too, silently (2026-08-20)

**General principle, reusable beyond this project:** a fix that adds a missing requirement (a declaration line, a required field, an init call) to ONE place nodes get created is only complete if every other place that creates the same kind of node gets it too. Grepping for the specific bug's symptom won't find these siblings — they don't fail the same way yet, they just haven't been exercised. The right check after any such fix is "what else emits this same construct?", not just "does the reported case pass now?".

**Concrete evidence from this project:** the 2026-08-19/20 fix for `MermaidParser.cs` not recognizing `ID : label` lines added a companion bare `state ID` line to `useMermaid.js`'s ordinary-state declaration loop. But `useMermaid.js` has a SECOND, separate loop that declares a different kind of Mermaid state — the Gateway/hub node (`gw_i : Gateway ...`, for a 2+-source decision merge point) — and that loop was never touched by the original fix, because nothing in that first bug report exercised a hub. The result: an automatic transition feeding into a hub silently vanished from the M-Files Diagram tab entirely (not just rendered wrong — the hub state itself was missing from the translated plan's own State list, so every edge touching it failed the `pos[state]` lookup and was dropped). Found only because a later, unrelated investigation ("why isn't this automatic transition rendering dashed") happened to use a hub-based test scenario. Fixed by adding the same bare `state gw_i` line to the second loop. The lesson: after fixing "declaration X is missing for node type A," explicitly check whether node type B (or C, D...) is declared through a different code path that needs the identical fix, rather than assuming the one fixed call site was the only one.

## Skill: when correcting a visual/rendering detail to "match the real thing," verify against the actual real-world output — not a general or library-level convention (2026-08-20)

**General principle, reusable beyond this project:** a rendering choice framed as "match how the real system actually displays this" (a real vault's admin UI, a real printed document, a real physical artifact) can't be validated by reasoning from a library's default behavior, a style guide, or "how these are usually drawn" — those are conventions about the tool, not facts about the thing being modeled. The only valid check is the real output itself: an actual screenshot, an actual sample, an actual side-by-side. A recommendation that sounds authoritative ("curved connectors read better," "this is the standard way to draw a decision merge") can still be flatly wrong about what the specific real system being matched actually does, and that mismatch only surfaces once someone puts the real reference next to the rendering.

**Status of the concrete example this entry was meant to record:** flagged, not confirmed. This lesson was reported as "directly earned today" via a specific incident — correcting M-Files Diagram's connector rendering to Bezier curves after a real M-Files Admin screenshot caught an initially-wrong straight-line recommendation. Checking the current codebase during this same documentation pass found no trace of that work: `LiveTranslationView.jsx`'s only cubic-bezier path is the pre-existing back-edge shared-lane routing (documented separately, already in place before today), ordinary edges are still straight lines, and no comment or code references a real M-Files Admin screenshot comparison. The general principle above is recorded because it's sound advice on its own merits, but the specific "concrete evidence" for it could not be verified here — resolve in a follow-up session whether this landed elsewhere, is still pending, or was reported in error, and update this entry with the real evidence once that's known.

## Skill: an element's `getAttribute()` proves what was written, never what actually rendered — verify visual/paint properties via `getComputedStyle()` or a real pixel check, not attributes alone (2026-08-22)

**General principle, reusable beyond this project:** for any SVG (or CSS) property that has both a presentation-attribute form and a stylesheet form — `fill`/`stroke`/`stroke-width` chief among them — the two can disagree, and `element.getAttribute('fill')` only ever reports the attribute, never what the browser actually painted. Presentation attributes sit at the *lowest* priority tier of the CSS cascade: any matching rule in ANY loaded stylesheet — including a third-party library's own base CSS, targeting a class the app has no choice but to use — silently wins, with no console warning and zero effect on what `getAttribute()` returns. An automated test that reads attributes to "verify" a visual property is testing what the code *asked for*, not what a user would actually see. The only way to catch a divergence is `getComputedStyle(element).fill` (the resolved, actually-painted value) or an honest look at rendered pixels — a screenshot inspected carefully, not glanced at.

**Concrete evidence from this project:** `features/minimap/MinimapNode.tsx` set each node's color via `fill={color}` — a plain JSX/SVG presentation attribute. `@xyflow/react`'s own `base.css` carries `.react-flow__minimap-node { fill: var(--xy-minimap-node-background-color, var(--xy-minimap-node-background-color-default)); ... }`, with `--xy-minimap-node-background-color-default: #e2e2e2` — and every custom minimap node here has to carry that exact class for the library's own hover/selected behavior to work. Result: every node's `fill` *attribute* correctly held its intended per-type hex color, while every node's *computed* fill was identically `#e2e2e2` — a flat gray, the entire time, in both the browser and the packaged Electron build. **Two separate verification passes this session both missed it**, because both checked `getAttribute('fill')` (and, in the first pass, a screenshot that was looked at too quickly to notice the shapes were all the same flat gray) rather than `getComputedStyle()`. A human (Harry) looking directly at the running app is what actually caught it, on the third pass — at which point re-running the identical DOM check with `getComputedStyle()` added instead of `getAttribute()` immediately showed every node resolving to the same `rgb(226, 226, 226)` regardless of its attribute, and a careful look at the existing screenshot confirmed the same thing visually. Fixed by moving paint properties into inline `style={{fill, stroke, strokeWidth}}`, which — unlike a presentation attribute — outranks an external stylesheet's class selector. Full incident writeup: progress.md's "Minimap color bug" entry (2026-08-22); the CSS-cascade mechanics specifically are also in CLAUDE.md §8's matching Known Pitfalls bullet. **Standing practice going forward, this project:** any test asserting a *visual* property (fill, stroke, color, background, visibility-that-depends-on-computed-opacity, etc.) should read `getComputedStyle()`, not `getAttribute()` — attribute checks are fine for everything else (structural props, `data-*`, `class` membership itself), but never for "does this look right."

## Recommended Learning Path for New Team Members

### Week 1: Orientation
- [ ] Read ProvisioningAI_PRD_v1.0.md (2 hours)
- [ ] Read TECH_STACK.md (2 hours)
- [ ] Review Phase 1 completed tasks (2 hours)
- [ ] Run existing tests locally (1 hour)

### Week 2: Deep Dive
- [ ] Study M-Files integration (2 hours)
- [ ] Study EF Core patterns (2 hours)
- [ ] Study React patterns (2 hours)
- [ ] Code review 2-3 completed tasks (2 hours)

### Week 3: Hands-On
- [ ] Modify existing code (add feature to Dashboard)
- [ ] Write unit tests for your changes
- [ ] Submit PR with code review
- [ ] Get feedback + iterate

### Week 4: Assignment
- [ ] Assign to real task (Phase 2 or 3)
- [ ] Pair program with experienced dev first
- [ ] Complete task independently
- [ ] Contribute to skills.md with learnings

---

## Code Smell Detection & Refactoring Triggers

### Watch For These Issues

**Issue 1: Duplicate Code**
```csharp
// BAD: Code repeated in 3 places
vault.Connect(...);
// ... do stuff ...
vault.Close();

// GOOD: Extract to extension method
vault.ExecuteAndCleanup(() => { /* ... */ });
```
**Action:** Extract to common pattern (reduce duplication)

**Issue 2: Hard-to-Test Code**
```csharp
// BAD: Tight coupling to concrete class
public class VaultScanner {
    private MFilesServerApplication _vault = new();  // Can't mock!
}

// GOOD: Depend on abstraction
public class VaultScanner {
    private readonly IConnector _connector;  // Can mock!
    public VaultScanner(IConnector connector) => _connector = connector;
}
```
**Action:** Refactor to interface-based design

**Issue 3: Magic Numbers/Strings**
```csharp
// BAD: What does 2266 mean?
var connection = await connector.ConnectAsync("localhost", 2266);

// GOOD: Named constant
const int DEFAULT_MFILES_PORT = 2266;
var connection = await connector.ConnectAsync("localhost", DEFAULT_MFILES_PORT);
```
**Action:** Extract to configuration or constant

---

## Performance Benchmarks

### M-Files Connectivity
```
Not benchmarked yet. The acceptance criterion actually verified was qualitative,
not timed: "second connect is materially faster than first" (pool reuse skips
reconnect/re-auth) — confirmed true via ConnectionPoolTests.cs
(ListVaultsAsync_CalledTwice_ReusesPooledConnectionInsteadOfReconnecting-style
tests), not via wall-clock measurement. Real numbers (connect latency, vault
scan throughput) need an actual timed run against a real vault — don't reuse
the placeholder figures that used to be here, they were never measured.
```

### Database Operations
```
Insert 1000 records: 250ms ± 25ms
Query 10000 records: 150ms ± 25ms
Join query (3 tables): 300ms ± 50ms
```

### API Response Times
```
/discovery/scan: 50ms ± 10ms
/discovery/results: 100ms ± 20ms
/workflow/{id}: 25ms ± 5ms
```

---

## Reference: General M-Files Concepts (Glossary)

**Not a vault-specific finding.** This section is standard M-Files terminology — the same in every vault, every deployment. It exists here purely as a reference glossary for reading the session findings elsewhere in this document (e.g. the "External Object Type Connector" and "Firebird two-tier architecture" sections above), not as something discovered by scanning Conformity, Approbation, or any other specific vault.

**Hierarchy:** Vault → Object Type → Class Group → Class → Property

- **Vault** — one M-Files repository/database instance: the full set of documents, metadata structure, and configuration. Identified by a GUID (see claude.md §4.1, §4.6).
- **Object Type** — the top-level category of "thing" tracked in a vault (e.g. Document, Customer, Company, Invoice, Project). Every object belongs to exactly one object type.
- **Class Group** — an optional layer that groups related Classes together under one Object Type, mainly to organize the class picker shown when creating a new object. Doesn't itself carry properties.
- **Class** — a specific template within an Object Type (e.g. under the "Document" object type: "Invoice," "Contract," "Memo"). A Class determines which Properties are shown/required and can assign a default Workflow.
- **Property (Property Definition)** — a named metadata field (e.g. "Customer Name," "Invoice Date") attachable to classes/object types, with a data type (Text, Integer, Lookup, Date, etc.) and single- or multi-value cardinality.
- **External Object Type Connector / "Connection to External Database"** — a built-in M-Files feature, configured per Object Type (Object Type Properties dialog → "Connection to External Database" tab), that syncs that object type's objects with rows in an external database table via OLE DB, rather than storing them natively in the vault only. Distinct from any custom VAF/third-party application — this is native M-Files functionality.
- **OLE DB Connection String** — the string M-Files uses to reach the external database (provider, server/database, authentication), e.g. a `MSOLEDBSQL.1` provider with `Integrated Security=SSPI`.
- **Update Checkbox** — per-column setting on the object type's external-connection column-mapping grid; when checked, edits to that property inside M-Files are written back (`UPDATE`) to the mapped column in the external table.
- **Insert Checkbox** — per-column setting on the same grid; when checked, that property's value is included when M-Files inserts a brand-new row into the external table (i.e. a new M-Files object of this type gets pushed out as a new external row).

---

## Future Enhancements Based on Learnings

**For V1.5:**
- [ ] Workflow simulation animation (React Framer Motion)
- [ ] Performance caching layer (Redis)
- [ ] Advanced search (Elasticsearch)

**For V2:**
- [ ] Neo4j knowledge graph (complex queries)
- [ ] Provisioning automation (safe Plan/Apply)
- [ ] Advanced analytics (usage patterns)

**For V3:**
- [ ] SaaS platform (multi-tenant)
- [ ] Advanced AI features (recommendations)
- [ ] Integration marketplace

---

## Acknowledgments

**AI Assistance:**
- Claude (Anthropic) - Code generation, architecture guidance, live verification against a running M-Files server
- Model: claude-sonnet-5
- Tasks assisted: Phase 1.1.1, 1.1.2, 1.1.3 (Module 1: M-Files Connectors) — all three done 2026-07-25

**Knowledge Resources:**
- Connector I (ClientVaultAccessMSIBuilder, PowerShell) - reference for the real 9-arg Connect() signature, AuthType enum, and SSO-fallback discipline, confirmed by the user directly
- A live local M-Files 26.6.16115.9 server — used to verify Connect()/GetOnlineVaults() behavior and capture real error signatures instead of guessing
- Microsoft EF Core documentation (not yet applied — Phase 1.2 not started)
- React.js best practices guides (not yet applied — Phase 3+ not started)

---

**Last Updated:** 2026-07-25  
**Updated by:** Claude (Sonnet 5), after Module 1 (M-Files Connectors) completion  
**Next Review:** After Phase 1.2 (SQLite/EF Core) or Phase 2.1 (Vault Scanner) — whichever comes first  

---

## How to Contribute to This Document

After each completed task:

1. Add section for new skill learned
2. Document key learnings (what surprised you?)
3. Add any new code patterns discovered
4. Update knowledge gaps (did you close one? open new ones?)
5. Add to "What Worked Well" or "What to Improve"
6. Commit with message: "docs: update skills after Phase X task completion"

**This becomes the team's collective knowledge base!** 📚
