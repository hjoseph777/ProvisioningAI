using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using ProvisioningAI.Data;
using ProvisioningAI.Data.Models;
using ProvisioningAI.Data.Repositories;
using ProvisioningAI.Discovery.Services;
using ProvisioningAI.MFilesConnectors;

namespace ProvisioningAI.Tests.Discovery;

/// <summary>
/// Unit tests for Stage 5: workflows, states, transitions.
/// No live vault — connector and vault handle are mocked; repositories run
/// against a real in-memory SQLite context.
/// </summary>
public sealed class WorkflowScannerTests : IDisposable
{
    private const string VaultGuid = "{008446DF-32AA-4E9C-8C43-9FEC4D0A1203}";
    private const string VaultName = "Conformity_CP1_Tergos.mfb";
    private const int ScanId = 1;

    private const string WorkflowGuid = "{11111111-1111-1111-1111-111111111111}";
    private const string DraftStateGuid = "{22222222-2222-2222-2222-222222222222}";
    private const string SqlReadyStateGuid = "{33333333-3333-3333-3333-333333333333}";

    private readonly ProvisioningAiDbContext _db;
    private readonly GenericRepository<ProvisioningAI.Data.Models.Workflow> _workflowRepo;
    private readonly GenericRepository<WorkflowState> _workflowStateRepo;
    private readonly WorkflowTransitionRepository _workflowTransitionRepo;
    private readonly Mock<IMFilesConnector> _connectorMock;
    private readonly Mock<IVaultHandle> _vaultHandleMock;
    private readonly WorkflowScanner _scanner;

    public WorkflowScannerTests()
    {
        var options = new DbContextOptionsBuilder<ProvisioningAiDbContext>()
            .UseSqlite("DataSource=:memory:")
            .Options;
        _db = new ProvisioningAiDbContext(options);
        _db.Database.OpenConnection();
        _db.Database.EnsureCreated();

        _db.VaultStructures.Add(VaultStructure.Create(VaultGuid, VaultName, DateTime.UtcNow));
        _db.DiscoveryScans.Add(new DiscoveryScan { ScanId = ScanId, VaultGuid = VaultGuid, VaultName = VaultName, StartedAt = DateTime.UtcNow, Status = "RUNNING" });
        _db.SaveChanges();

        _workflowRepo = new GenericRepository<ProvisioningAI.Data.Models.Workflow>(_db);
        _workflowStateRepo = new GenericRepository<WorkflowState>(_db);
        _workflowTransitionRepo = new WorkflowTransitionRepository(_db);

        _connectorMock = new Mock<IMFilesConnector>();
        _vaultHandleMock = new Mock<IVaultHandle>();
        _vaultHandleMock.SetupGet(v => v.VaultGuid).Returns(VaultGuid);
        _vaultHandleMock.SetupGet(v => v.VaultName).Returns(VaultName);
        _connectorMock
            .Setup(c => c.LogInToVaultAsync(VaultGuid, It.IsAny<CancellationToken>()))
            .ReturnsAsync(_vaultHandleMock.Object);

        _scanner = new WorkflowScanner(
            _connectorMock.Object, _db, _workflowRepo, _workflowStateRepo, _workflowTransitionRepo, NullLogger<WorkflowScanner>.Instance);
    }

    public void Dispose()
    {
        _db.Database.CloseConnection();
        _db.Dispose();
    }

    // Literal built-in value list IDs (MFBuiltInValueList.Workflows=7 / States=8,
    // see MFilesBuiltInValueListIds) — matches the existing convention in
    // ValueListScannerTests.cs rather than reaching into an internal class.
    private void SetupWorkflowGuids(params ValueListItemInfo[] items)
        => _vaultHandleMock
            .Setup(v => v.GetValueListItemsAsync(7, It.IsAny<CancellationToken>()))
            .ReturnsAsync((IReadOnlyList<ValueListItemInfo>)items);

    private void SetupStateGuids(params ValueListItemInfo[] items)
        => _vaultHandleMock
            .Setup(v => v.GetValueListItemsAsync(8, It.IsAny<CancellationToken>()))
            .ReturnsAsync((IReadOnlyList<ValueListItemInfo>)items);

    private void SetupWorkflowsAdmin(params WorkflowAdminInfo[] workflows)
        => _vaultHandleMock
            .Setup(v => v.GetWorkflowsAdminAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync((IReadOnlyList<WorkflowAdminInfo>)workflows);

    // ─── Happy path: GUID resolution, IsInitial/IsFinal, IsIntegrationTouching ──

    [Fact]
    public async Task ScanAsync_ResolvesGuidsAndDerivesInitialFinalAndIntegrationFlags()
    {
        SetupWorkflowGuids(new ValueListItemInfo(1, WorkflowGuid, "Conformity", false));
        SetupStateGuids(
            new ValueListItemInfo(10, DraftStateGuid, "Draft", false),
            new ValueListItemInfo(11, SqlReadyStateGuid, "SQL_Ready", false));
        SetupWorkflowsAdmin(new WorkflowAdminInfo(
            1, "Conformity", "AP workflow",
            [new WorkflowStateAdminInfo(10, "Draft"), new WorkflowStateAdminInfo(11, "SQL_Ready")],
            [new WorkflowTransitionAdminInfo(100, 10, 11, "Submit", 4, 0, null, "[Vendor]=~1")]));

        var result = await _scanner.ScanAsync(VaultGuid, VaultName, ScanId);

        Assert.Equal(1, result.WorkflowsScanned);
        Assert.Equal(2, result.StatesScanned);
        Assert.Equal(1, result.TransitionsScanned);
        Assert.Equal(1, result.IntegrationTouchingStatesCount);
        Assert.Equal(0, result.IntegrationTouchingTransitionsCount); // "Submit" matches no integration substring

        var workflows = await _workflowRepo.GetAllForVaultAsync(VaultGuid);
        var wf = Assert.Single(workflows);
        Assert.Equal(WorkflowGuid, wf.Guid);
        Assert.Equal("AP workflow", wf.Description);

        var states = await _workflowStateRepo.GetAllForVaultAsync(VaultGuid);
        var draft = Assert.Single(states, s => s.Name == "Draft");
        var sqlReady = Assert.Single(states, s => s.Name == "SQL_Ready");
        Assert.True(draft.IsInitial); // nothing transitions into Draft
        Assert.False(draft.IsFinal);  // Draft has an outgoing transition
        Assert.False(sqlReady.IsInitial); // Draft transitions into it
        Assert.True(sqlReady.IsFinal);     // nothing transitions out of it
        Assert.False(draft.IsIntegrationTouching);
        Assert.True(sqlReady.IsIntegrationTouching); // name contains "SQL_"

        var transitions = await _workflowTransitionRepo.GetAllForVaultAsync(VaultGuid);
        var transition = Assert.Single(transitions);
        Assert.Equal(DraftStateGuid, transition.FromStateGuid);
        Assert.Equal(SqlReadyStateGuid, transition.ToStateGuid);
        Assert.Null(transition.Actions); // no Actions concept at transition level — verified fact, not an omission
        Assert.Contains("[Vendor]=~1", transition.GuardConditions);
        Assert.Contains("\"triggerMode\":4", transition.GuardConditions);
    }

    [Fact]
    public async Task ScanAsync_StoresStateGuardAndActionsAsVerbatimJson()
    {
        SetupWorkflowGuids(new ValueListItemInfo(1, WorkflowGuid, "Conformity", false));
        SetupStateGuids(new ValueListItemInfo(10, DraftStateGuid, "UPD_CP1", false));
        SetupWorkflowsAdmin(new WorkflowAdminInfo(
            1, "Conformity", null,
            [
                new WorkflowStateAdminInfo(10, "UPD_CP1",
                    Guard: new WorkflowStateGuardInfo(PreconditionsVBScriptEnabled: true, PreconditionsVBScript: "return true"),
                    Actions: new WorkflowStateActionsInfo(
                        ActionSendNotification: true,
                        SendNotification: new WorkflowSendNotificationActionInfo("Subj", "Msg", []))),
            ],
            []));

        await _scanner.ScanAsync(VaultGuid, VaultName, ScanId);

        var states = await _workflowStateRepo.GetAllForVaultAsync(VaultGuid);
        var state = Assert.Single(states);
        Assert.Contains("\"preconditionsVBScriptEnabled\":true", state.GuardConditions);
        Assert.Contains("return true", state.GuardConditions);
        Assert.Contains("\"actionSendNotification\":true", state.Actions);
        Assert.Contains("\"subject\":\"Subj\"", state.Actions, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task ScanAsync_EntryMarkerTransition_OverridesNoIncomingEdgeHeuristic()
    {
        // Confirmed live against Conformity (2026-07-27): FromState=0 is M-Files'
        // own "workflow entry" marker, not a real state. Its ToState is the
        // authoritative initial state, even when that state ALSO has a real
        // incoming edge from another state (which the no-incoming-edge heuristic
        // alone would misread as "not initial").
        SetupWorkflowGuids(new ValueListItemInfo(1, WorkflowGuid, "Conformity", false));
        SetupStateGuids(
            new ValueListItemInfo(10, DraftStateGuid, "Draft", false),
            new ValueListItemInfo(11, SqlReadyStateGuid, "Approved", false));
        SetupWorkflowsAdmin(new WorkflowAdminInfo(
            1, "Conformity", null,
            [new WorkflowStateAdminInfo(10, "Draft"), new WorkflowStateAdminInfo(11, "Approved")],
            [
                new WorkflowTransitionAdminInfo(177, 0, 10, "", 0, 0, null, null), // entry marker
                new WorkflowTransitionAdminInfo(100, 11, 10, "Recall", 4, 0, null, null), // real edge INTO Draft too
            ]));

        var result = await _scanner.ScanAsync(VaultGuid, VaultName, ScanId);

        // Only the real edge becomes a WorkflowTransition row — the entry marker doesn't.
        Assert.Equal(1, result.TransitionsScanned);
        var transitions = await _workflowTransitionRepo.GetAllForVaultAsync(VaultGuid);
        var transition = Assert.Single(transitions);
        Assert.Equal(SqlReadyStateGuid, transition.FromStateGuid);
        Assert.Equal(DraftStateGuid, transition.ToStateGuid);

        var states = await _workflowStateRepo.GetAllForVaultAsync(VaultGuid);
        var draft = Assert.Single(states, s => s.Name == "Draft");
        Assert.True(draft.IsInitial); // entry marker wins, despite the real incoming edge from Approved
    }

    [Fact]
    public async Task ScanAsync_TransitionNameMatchesIntegrationHeuristic_FlagsTransition()
    {
        SetupWorkflowGuids(new ValueListItemInfo(1, WorkflowGuid, "Conformity", false));
        SetupStateGuids(
            new ValueListItemInfo(10, DraftStateGuid, "Draft", false),
            new ValueListItemInfo(11, SqlReadyStateGuid, "Approved", false));
        SetupWorkflowsAdmin(new WorkflowAdminInfo(
            1, "Conformity", null,
            [new WorkflowStateAdminInfo(10, "Draft"), new WorkflowStateAdminInfo(11, "Approved")],
            [new WorkflowTransitionAdminInfo(100, 10, 11, "UPD_To_CP1", 0, 0, null, null)]));

        var result = await _scanner.ScanAsync(VaultGuid, VaultName, ScanId);

        Assert.Equal(1, result.IntegrationTouchingTransitionsCount);
        var transitions = await _workflowTransitionRepo.GetAllForVaultAsync(VaultGuid);
        Assert.True(transitions[0].IsIntegrationTouching);
    }

    // ─── Data integrity: unresolvable references throw before writing anything ─

    [Fact]
    public async Task ScanAsync_WorkflowNotInBuiltInValueList_ThrowsBeforeWritingAnything()
    {
        SetupWorkflowGuids(); // empty — workflow MFilesId=1 has no matching entry
        SetupStateGuids(new ValueListItemInfo(10, DraftStateGuid, "Draft", false));
        SetupWorkflowsAdmin(new WorkflowAdminInfo(
            1, "Conformity", null, [new WorkflowStateAdminInfo(10, "Draft")], []));

        await Assert.ThrowsAsync<InvalidOperationException>(
            () => _scanner.ScanAsync(VaultGuid, VaultName, ScanId));

        Assert.Empty(await _workflowRepo.GetAllForVaultAsync(VaultGuid));
    }

    [Fact]
    public async Task ScanAsync_StateNotInBuiltInValueList_ThrowsBeforeWritingAnything()
    {
        SetupWorkflowGuids(new ValueListItemInfo(1, WorkflowGuid, "Conformity", false));
        SetupStateGuids(); // empty — state MFilesId=10 has no matching entry
        SetupWorkflowsAdmin(new WorkflowAdminInfo(
            1, "Conformity", null, [new WorkflowStateAdminInfo(10, "Draft")], []));

        await Assert.ThrowsAsync<InvalidOperationException>(
            () => _scanner.ScanAsync(VaultGuid, VaultName, ScanId));

        Assert.Empty(await _workflowStateRepo.GetAllForVaultAsync(VaultGuid));
    }

    [Fact]
    public async Task ScanAsync_TransitionReferencesUnknownState_ThrowsBeforeWritingAnything()
    {
        SetupWorkflowGuids(new ValueListItemInfo(1, WorkflowGuid, "Conformity", false));
        SetupStateGuids(new ValueListItemInfo(10, DraftStateGuid, "Draft", false));
        // Transition references ToState 999, which isn't among this workflow's states.
        SetupWorkflowsAdmin(new WorkflowAdminInfo(
            1, "Conformity", null,
            [new WorkflowStateAdminInfo(10, "Draft")],
            [new WorkflowTransitionAdminInfo(100, 10, 999, "Submit", 0, 0, null, null)]));

        await Assert.ThrowsAsync<InvalidOperationException>(
            () => _scanner.ScanAsync(VaultGuid, VaultName, ScanId));

        Assert.Empty(await _workflowTransitionRepo.GetAllForVaultAsync(VaultGuid));
    }

    [Fact]
    public async Task ScanAsync_EmptyGuid_Throws()
    {
        await Assert.ThrowsAsync<ArgumentException>(
            () => _scanner.ScanAsync("", VaultName, ScanId));
    }
}
