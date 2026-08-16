using System.Runtime.InteropServices;

namespace ProvisioningAI.MFilesConnectors;

/// <summary>
/// COM objects don't get garbage collected on their own — the RCW (runtime
/// callable wrapper) has to be released explicitly or the underlying MFilesAPI
/// handle leaks for the life of the process. Mirrors the Close-ComObjectSafe
/// discipline from Connector I: safe against null, against objects that
/// aren't actually COM (skips them rather than throwing), and against
/// double-release (ObjectDisposedException/InvalidComObjectException are
/// swallowed since "already released" is the outcome we wanted anyway).
/// </summary>
public static class ComObjectExtensions
{
    public static void CloseComObjectSafe(this object? comObject)
    {
        if (comObject is null) return;
        if (!Marshal.IsComObject(comObject)) return;

        try
        {
            Marshal.ReleaseComObject(comObject);
        }
        catch (Exception ex) when (ex is InvalidComObjectException or ObjectDisposedException)
        {
            // Already released — nothing left to do.
        }
    }
}
