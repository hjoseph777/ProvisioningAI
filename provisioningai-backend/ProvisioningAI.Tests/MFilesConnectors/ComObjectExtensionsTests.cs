using ProvisioningAI.MFilesConnectors;

namespace ProvisioningAI.Tests.MFilesConnectors;

public class ComObjectExtensionsTests
{
    [Fact]
    public void CloseComObjectSafe_Null_DoesNotThrow()
    {
        object? nothing = null;
        var ex = Record.Exception(() => nothing.CloseComObjectSafe());
        Assert.Null(ex);
    }

    [Fact]
    public void CloseComObjectSafe_PlainClrObject_DoesNotThrow()
    {
        // Not a COM object — Marshal.IsComObject is false, so this must be a no-op, not a crash.
        var plain = new object();
        var ex = Record.Exception(() => plain.CloseComObjectSafe());
        Assert.Null(ex);
    }

    [Fact]
    public void CloseComObjectSafe_CalledTwice_DoesNotThrow()
    {
        var plain = new object();
        plain.CloseComObjectSafe();
        var ex = Record.Exception(() => plain.CloseComObjectSafe());
        Assert.Null(ex);
    }

    [Fact]
    public void CloseComObjectSafe_RealComObject_ReleasesWithoutThrowing()
    {
        // WScript.Shell ships with every Windows install — used here only to exercise the real
        // Marshal.IsComObject(true) -> Marshal.ReleaseComObject path, nothing to do with M-Files.
        var type = Type.GetTypeFromProgID("WScript.Shell");
        if (type is null) return; // not present on this machine — skip rather than fail the suite

        var comObject = Activator.CreateInstance(type)!;
        Assert.True(System.Runtime.InteropServices.Marshal.IsComObject(comObject));

        var ex = Record.Exception(() => comObject.CloseComObjectSafe());

        Assert.Null(ex);
    }
}
