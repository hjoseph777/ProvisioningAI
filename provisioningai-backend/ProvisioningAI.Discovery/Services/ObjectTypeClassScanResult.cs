namespace ProvisioningAI.Discovery.Services;

/// <summary>Result of scanning object types and classes together (Stage 4).</summary>
public sealed record ObjectTypeClassScanResult(string VaultGuid, int ObjectTypesScanned, int ClassesScanned);
