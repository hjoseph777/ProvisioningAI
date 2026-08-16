// Auth probe: tries every available authentication path for vault login.
// Reports exactly which succeeds, and reads vault.Name from the logged-in handle.
// Run: dotnet run -- [mfiles-username] [mfiles-password]
// If no args, skips the explicit-credentials path.

using MFilesAPI;

const string Server = "localhost";
const string Endpoint = "2266";

string? explicitUser = args.Length > 0 ? args[0] : null;
string? explicitPass = args.Length > 1 ? args[1] : null;

var serverApp = new MFilesServerApplication();
serverApp.Connect(
    MFAuthType.MFAuthTypeLoggedOnWindowsUser,
    "", "", "", "ncacn_ip_tcp", Server, Endpoint, "", false);

Console.WriteLine($"Server connect: OK (as {Environment.UserDomainName}\\{Environment.UserName})");

foreach (IVaultOnServer vs in serverApp.GetOnlineVaults())
{
    Console.WriteLine($"\n--- Vault: {vs.Name}  GUID: {vs.GUID} ---");

    // Path 1: Windows SSO (current user — DESKTOP-DKCS42P\owner)
    TryLogin(serverApp, vs.GUID, MFAuthType.MFAuthTypeLoggedOnWindowsUser, null, null, "SSO (current Windows user)");

    // Path 2: Specific Windows user (domain account) — requires impersonation not available here
    // Skipped: can't switch Windows identity from this process without the domain password.
    
    // Path 3: M-Files native user credentials (if vault has M-Files users)
    if (explicitUser is not null)
    {
        TryLogin(serverApp, vs.GUID, MFAuthType.MFAuthTypeSpecificMFilesUser, explicitUser, explicitPass ?? "", $"M-Files user ({explicitUser})");
    }
    else
    {
        Console.WriteLine("  [skipped] M-Files native user — run with: dotnet run -- <username> <password>");
    }
}

static void TryLogin(MFilesServerApplication srvApp, string vaultGuid, MFAuthType authType, string? user, string? pass, string label)
{
    try
    {
        dynamic dyn = srvApp;
        dynamic vault = dyn.LogInAsUserToVault(vaultGuid, null, (int)authType, user, pass ?? "", null);
        string vaultName = (string)vault.Name;
        string vaultGuidFromHandle = (string)vault.GUID; // known to be empty live — print anyway
        Console.WriteLine($"  [OK]  {label}");
        Console.WriteLine($"        vault.Name = \"{vaultName}\"");
        Console.WriteLine($"        vault.GUID = \"{vaultGuidFromHandle}\" (expected empty on live server)");
        vault.LogOutSilent();
    }
    catch (Exception ex)
    {
        Console.WriteLine($"  [FAIL] {label}: {ex.Message.Split('\n')[0].Trim()}");
    }
}
