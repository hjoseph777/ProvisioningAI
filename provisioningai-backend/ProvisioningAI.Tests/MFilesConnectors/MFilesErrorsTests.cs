using System.Runtime.InteropServices;
using ProvisioningAI.MFilesConnectors;

namespace ProvisioningAI.Tests.MFilesConnectors;

public class MFilesErrorsTests
{
    // Message text and HResult below are copied verbatim from a live M-Files 26.6 server —
    // see MFilesErrors.cs's doc comment for how these were captured.

    [Fact]
    public void Translate_AuthenticationFailedHResult_ReturnsAuthenticationException()
    {
        var comEx = new COMException("Authentication failed.", unchecked((int)0x8004001A));

        var result = MFilesErrors.Translate(comEx);

        Assert.IsType<MFilesAuthenticationException>(result);
    }

    [Fact]
    public void Translate_LoginFailedMessageWithoutMatchingHResult_ReturnsAuthenticationException()
    {
        // Distinct from the HResult-based test above: same outcome, reached via the message-text
        // fallback branch instead, for a generic (non-COM) exception with no HResult to key off.
        var ex = new InvalidOperationException("Login failed for user 'svc-account'.");

        var result = MFilesErrors.Translate(ex);

        Assert.IsType<MFilesAuthenticationException>(result);
    }

    [Fact]
    public void Translate_VaultDoesNotExistMessage_ReturnsVaultNotFoundException()
    {
        var comEx = new COMException("The specified document vault does not exist.", unchecked((int)0x80040001));

        var result = MFilesErrors.Translate(comEx, "{12345678-1234-1234-1234-123456789012}");

        var notFound = Assert.IsType<MFilesVaultNotFoundException>(result);
        Assert.Equal("{12345678-1234-1234-1234-123456789012}", notFound.VaultGuid);
    }

    [Fact]
    public void Translate_NetworkProblemsMessage_ReturnsVaultOfflineException()
    {
        var comEx = new COMException(
            "Network problems are preventing M-Files from communicating with the server.",
            unchecked((int)0x80040001));

        var result = MFilesErrors.Translate(comEx);

        Assert.IsType<MFilesVaultOfflineException>(result);
    }

    [Fact]
    public void Translate_AccessDeniedMessage_ReturnsPermissionDeniedException()
    {
        var comEx = new COMException("Access to the object is denied.", unchecked((int)0x80040001));

        var result = MFilesErrors.Translate(comEx);

        Assert.IsType<MFilesPermissionDeniedException>(result);
    }

    [Fact]
    public void Translate_AlreadyTypedException_PassesThroughUnchanged()
    {
        var already = new MFilesPermissionDeniedException("already classified");

        var result = MFilesErrors.Translate(already);

        Assert.Same(already, result);
    }

    [Fact]
    public void Translate_UnrecognizedComFailure_StillReturnsATypedMFilesException()
    {
        var comEx = new COMException("Something M-Files has never said before.", unchecked((int)0x80040001));

        var result = MFilesErrors.Translate(comEx);

        // Never leak a raw COMException to the caller — even an unrecognized failure gets typed.
        Assert.IsAssignableFrom<MFilesException>(result);
    }
}
