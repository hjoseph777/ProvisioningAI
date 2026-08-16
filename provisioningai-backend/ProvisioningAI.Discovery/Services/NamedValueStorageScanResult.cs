namespace ProvisioningAI.Discovery.Services;

/// <summary>Result of Stage 8: Named Value Storage (per installed application).</summary>
public sealed record NamedValueStorageScanResult(string VaultGuid, int ApplicationsScanned, int EntriesScanned);
