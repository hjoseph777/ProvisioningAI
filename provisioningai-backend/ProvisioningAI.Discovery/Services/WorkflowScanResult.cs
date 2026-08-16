namespace ProvisioningAI.Discovery.Services;

/// <summary>Result of Stage 5: workflows, states, transitions.</summary>
public sealed record WorkflowScanResult(
    string VaultGuid,
    int WorkflowsScanned,
    int StatesScanned,
    int TransitionsScanned,
    int IntegrationTouchingStatesCount,
    int IntegrationTouchingTransitionsCount);
