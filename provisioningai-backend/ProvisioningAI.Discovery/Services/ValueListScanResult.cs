namespace ProvisioningAI.Discovery.Services;

/// <summary>
/// Result of scanning value lists and their items (Stage 2). GetValueLists()
/// mixes real object types and true value lists in one COM collection — this
/// count reflects only the RealObjectType == false subset actually written.
/// </summary>
public sealed record ValueListScanResult(
    string VaultGuid,
    int ValueListsScanned,
    int ValueListItemsScanned);
