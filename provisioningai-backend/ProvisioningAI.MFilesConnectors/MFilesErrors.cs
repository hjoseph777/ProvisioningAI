using System.Runtime.InteropServices;

namespace ProvisioningAI.MFilesConnectors;

/// <summary>Base type for every typed M-Files error this project raises.</summary>
public abstract class MFilesException : Exception
{
    protected MFilesException(string message, Exception? inner = null) : base(message, inner) { }
}

/// <summary>Login/authentication was rejected by the server.</summary>
public sealed class MFilesAuthenticationException : MFilesException
{
    public MFilesAuthenticationException(string message, Exception? inner = null) : base(message, inner) { }
}

/// <summary>The vault GUID does not exist on this server. Vault GUID is identity — check it, not the name.</summary>
public sealed class MFilesVaultNotFoundException : MFilesException
{
    public string VaultGuid { get; }

    public MFilesVaultNotFoundException(string vaultGuid, string message, Exception? inner = null) : base(message, inner)
        => VaultGuid = vaultGuid;
}

/// <summary>
/// The caller authenticated fine but doesn't have rights to the thing being
/// requested. Kept distinct from connection/auth failure so the scanner can
/// report "you can see 12 of 823 property definitions" instead of silently
/// returning a thin result that looks like a complete one.
/// </summary>
public sealed class MFilesPermissionDeniedException : MFilesException
{
    public MFilesPermissionDeniedException(string message, Exception? inner = null) : base(message, inner) { }
}

/// <summary>The server could not be reached at all (network/gRPC failure, service down).</summary>
public sealed class MFilesVaultOfflineException : MFilesException
{
    public MFilesVaultOfflineException(string message, Exception? inner = null) : base(message, inner) { }
}

/// <summary>
/// Maps COM/gRPC failures from MFilesAPI to the typed exceptions above.
///
/// M-Files does not publish a stable HRESULT table, and in practice most
/// failures surface through the outer COMException with a generic wrapper
/// HResult (0x80040001) regardless of what actually went wrong — the real
/// signal is in the message text, not the top-level HResult. Confirmed live
/// against a running M-Files 26.6 server:
///   - bad credentials       -> HResult 0x8004001A, "Authentication failed."
///   - nonexistent vault GUID -> HResult 0x80040001, "The specified document vault does not exist."
///   - unreachable server     -> HResult 0x80040001, "Network problems are preventing M-Files
///                               from communicating with the server." / "gRPC connection ... failed."
/// Permission-denied has no live-verified sample (no restricted test account was available),
/// so it is classified by keyword only — revisit once a real case is observed.
/// </summary>
public static class MFilesErrors
{
    private const int HResultAuthenticationFailed = unchecked((int)0x8004001A);

    public static MFilesException Translate(Exception ex, string? vaultGuid = null)
    {
        if (ex is MFilesException already) return already;

        var message = ex.Message.Split('\n')[0].Trim();

        if (ex is COMException comEx && comEx.HResult == HResultAuthenticationFailed)
            return new MFilesAuthenticationException(message, comEx);

        if (Contains(message, "authentication failed") || Contains(message, "login failed"))
            return new MFilesAuthenticationException(message, ex);

        if (Contains(message, "does not exist") && Contains(message, "vault"))
            return new MFilesVaultNotFoundException(vaultGuid ?? "unknown", message, ex);

        if (Contains(message, "network problems") || Contains(message, "grpc connection") || Contains(message, "unable to connect"))
            return new MFilesVaultOfflineException(message, ex);

        if ((Contains(message, "access") && Contains(message, "denied")) || Contains(message, "insufficient permission"))
            return new MFilesPermissionDeniedException(message, ex);

        // Unclassified COM failure — surface as authentication-adjacent rather than swallowing it,
        // so callers still get a typed MFilesException instead of a raw COMException leaking out.
        return new MFilesAuthenticationException(message, ex);
    }

    private static bool Contains(string haystack, string needle)
        => haystack.Contains(needle, StringComparison.OrdinalIgnoreCase);
}
