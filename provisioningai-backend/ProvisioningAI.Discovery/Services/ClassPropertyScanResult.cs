namespace ProvisioningAI.Discovery.Services;

/// <summary>Result of scanning class&lt;-&gt;property associations (required/optional).</summary>
public sealed record ClassPropertyScanResult(string VaultGuid, int AssociationsScanned);
