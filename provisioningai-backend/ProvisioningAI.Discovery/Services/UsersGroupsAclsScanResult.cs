namespace ProvisioningAI.Discovery.Services;

/// <summary>Result of Stage 6: users, groups, named ACLs.</summary>
public sealed record UsersGroupsAclsScanResult(
    string VaultGuid, int UserAccountsScanned, int UserGroupsScanned, int MembershipsScanned, int NamedAclsScanned);
