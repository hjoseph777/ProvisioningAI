namespace ProvisioningAI.Discovery.Services;

/// <summary>Result of scanning property definitions (Stage 3).</summary>
public sealed record PropertyDefScanResult(string VaultGuid, int PropertyDefsScanned);
