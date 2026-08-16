using System.Collections;
using System.Runtime.InteropServices;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using ProvisioningAI.MFilesConnectors;

namespace ProvisioningAI.Tests.MFilesConnectors;

public class MFilesComConnectorTests
{
    // A plain CLR object with Connect(...)/GetOnlineVaults() members matching what the connector
    // calls via `dynamic` — DLR dispatch doesn't distinguish this from a real COM object, which is
    // exactly what makes MFilesComConnector's fallback logic testable without a live vault.
    // Must be `public`, not `private`/`internal`: the dynamic binder resolves member access from
    // MFilesComConnector's assembly at the call site, and InternalsVisibleTo on THIS assembly
    // only grants MFilesComConnector access to internals if declared here (it wasn't) — public
    // sidesteps the whole cross-assembly visibility question.
    public sealed class FakeServerApplication
    {
        public int ConnectCallCount { get; private set; }
        public int AuthTypeUsedOnSuccess { get; private set; }
        public Func<int, bool>? FailConnectForAuthType { get; set; }
        public List<FakeVault> Vaults { get; set; } = [];

        public void Connect(int authType, string username, string password, string domain,
            string protocolSequence, string networkAddress, string endpoint, string localComputerName, bool allowAnonymousConnection)
        {
            ConnectCallCount++;
            if (FailConnectForAuthType?.Invoke(authType) == true)
                throw new COMException("Authentication failed.", unchecked((int)0x8004001A));
            AuthTypeUsedOnSuccess = authType;
        }

        public List<FakeVault> GetOnlineVaults() => Vaults;

        public Func<string, bool>? FailLoginForVaultGuid { get; set; }
        public string? LastLoginVaultGuid { get; private set; }
        public int? LastLoginAuthType { get; private set; }

        public FakeVault LogInAsUserToVault(string vaultGuid, object? spn, int authType, string? username, string? password, object? reserved)
        {
            LastLoginVaultGuid = vaultGuid;
            LastLoginAuthType = authType;
            if (FailLoginForVaultGuid?.Invoke(vaultGuid) == true)
            {
                // Real message + HResult captured live against Conformity, 2026-07-26 — see MFilesErrors.cs.
                throw new COMException(
                    "Access denied.\nYou do not have a user account in this document vault. (Account name: \"DESKTOP-TEST\\user\")",
                    unchecked((int)0x80040001));
            }
            return Vaults.FirstOrDefault(v => v.GUID == vaultGuid) ?? new FakeVault { GUID = vaultGuid, Name = "Logged-in Vault" };
        }
    }

    public sealed class FakeVault
    {
        public string GUID { get; set; } = "";
        public string Name { get; set; } = "";
        public bool LoggedOut { get; private set; }

        // vault.GUID comes back empty on a real logged-in session (confirmed live) — this fake
        // intentionally does NOT expose that quirk, since LogInToVaultCore never reads it back.
        public void LogOutSilent() => LoggedOut = true;
    }

    private static (MFilesComConnector connector, Func<FakeServerApplication> lastCreated) BuildConnector(
        MFilesComConnectorOptions? options = null, Func<FakeServerApplication>? factory = null)
    {
        FakeServerApplication? last = null;
        factory ??= () => new FakeServerApplication { Vaults = [new FakeVault { GUID = "{GUID-1}", Name = "Conformity" }] };
        object Wrapped() { last = factory(); return last; }

        var connector = new MFilesComConnector(
            Options.Create(options ?? new MFilesComConnectorOptions()),
            new ConnectionPool(new ConnectionPoolOptions()),
            NullLogger<MFilesComConnector>.Instance,
            Wrapped,
            TimeSpan.FromMilliseconds(1)); // fast retry for tests — real production default is 10s

        return (connector, () => last!);
    }

    [Fact]
    public async Task ListVaultsAsync_SsoSucceedsFirstTry_ReturnsMappedVaults()
    {
        var (connector, _) = BuildConnector(factory: () => new FakeServerApplication
        {
            Vaults = [new FakeVault { GUID = "{A}", Name = "Conformity" }, new FakeVault { GUID = "{B}", Name = "Approbation" }],
        });

        var vaults = await connector.ListVaultsAsync();

        Assert.Equal(2, vaults.Count);
        Assert.Contains(vaults, v => v.Guid == "{A}" && v.Name == "Conformity");
        Assert.Contains(vaults, v => v.Guid == "{B}" && v.Name == "Approbation");
    }

    [Fact]
    public void PublicConstructor_DelegatesToRealServerApplicationFactoryAndDefaultRetryDelay()
    {
        // Exercises the production (non-test-seam) constructor path — doesn't connect, so it
        // doesn't need a live vault; just confirms it builds a usable IMFilesConnector.
        var connector = new MFilesComConnector(
            Options.Create(new MFilesComConnectorOptions()),
            new ConnectionPool(new ConnectionPoolOptions()),
            NullLogger<MFilesComConnector>.Instance);

        Assert.IsAssignableFrom<IMFilesConnector>(connector);
    }

    [Fact]
    public async Task ListVaultsAsync_SsoFailsOnceThenSucceedsOnRetry_ReturnsVaults()
    {
        var attempts = 0;
        var (connector, _) = BuildConnector(factory: () => new FakeServerApplication
        {
            FailConnectForAuthType = _ => ++attempts == 1, // fails only the very first Connect() call
            Vaults = [new FakeVault { GUID = "{A}", Name = "Conformity" }],
        });

        var vaults = await connector.ListVaultsAsync();

        Assert.Single(vaults);
    }

    [Fact]
    public async Task ListVaultsAsync_SsoFailsTwiceAndCredentialFallbackAlsoFails_ThrowsTranslatedException()
    {
        var options = new MFilesComConnectorOptions { Username = "svc-account", Password = "hunter2" };
        var attempt = 0;
        var (connector, _) = BuildConnector(options, factory: () =>
        {
            attempt++;
            // Both the SSO instance and the fresh credential-fallback instance fail to connect.
            return new FakeServerApplication { FailConnectForAuthType = _ => true };
        });

        await Assert.ThrowsAsync<MFilesAuthenticationException>(() => connector.ListVaultsAsync());
        Assert.Equal(2, attempt); // SSO instance, then one fresh instance for the credential attempt — no third
    }

    [Fact]
    public async Task ListVaultsAsync_SsoFailsTwiceNoCredentialsConfigured_ThrowsAuthenticationException()
    {
        var (connector, getFake) = BuildConnector(factory: () => new FakeServerApplication
        {
            FailConnectForAuthType = _ => true, // every attempt fails
        });

        await Assert.ThrowsAsync<MFilesAuthenticationException>(() => connector.ListVaultsAsync());
        Assert.Equal(2, getFake().ConnectCallCount); // confirms the "retry once" behavior actually happened
    }

    [Fact]
    public async Task ListVaultsAsync_SsoFailsTwiceCredentialsConfigured_FallsBackToMFilesUserOnFreshInstance()
    {
        var options = new MFilesComConnectorOptions { Username = "svc-account", Password = "hunter2" };
        var attempt = 0;
        var (connector, _) = BuildConnector(options, factory: () =>
        {
            attempt++;
            var instance = attempt == 1
                ? new FakeServerApplication { FailConnectForAuthType = authType => authType == 1 } // SSO instance: always fails SSO
                : new FakeServerApplication { Vaults = [new FakeVault { GUID = "{X}", Name = "Fallback Vault" }] }; // fresh instance for credential fallback
            return instance;
        });

        var vaults = await connector.ListVaultsAsync();

        Assert.Equal(2, attempt); // first (SSO) instance discarded, a FRESH instance created for the credential attempt
        Assert.Single(vaults);
        Assert.Equal("Fallback Vault", vaults[0].Name);
    }

    [Fact]
    public async Task ListVaultsAsync_ComFailureDuringEnumeration_TranslatesToTypedException()
    {
        var (connector, _) = BuildConnector(factory: () => new FakeServerApplication
        {
            Vaults = null!, // GetOnlineVaults() will NRE — proves raw exceptions get translated, not leaked
        });

        var ex = await Record.ExceptionAsync(() => connector.ListVaultsAsync());

        Assert.NotNull(ex);
        Assert.IsAssignableFrom<MFilesException>(ex);
    }

    [Fact]
    public async Task ListVaultsAsync_CalledTwice_ReusesPooledConnectionInsteadOfReconnecting()
    {
        var connectCalls = 0;
        var (connector, _) = BuildConnector(factory: () =>
        {
            connectCalls++;
            return new FakeServerApplication { Vaults = [new FakeVault { GUID = "{A}", Name = "Conformity" }] };
        });

        await connector.ListVaultsAsync();
        await connector.ListVaultsAsync();

        Assert.Equal(1, connectCalls); // second call reused the pooled session — no second Connect()
    }

    [Fact]
    public async Task LogInToVaultAsync_Success_ReturnsHandleWithCallerGuidAndRealName()
    {
        var (connector, _) = BuildConnector(factory: () => new FakeServerApplication
        {
            Vaults = [new FakeVault { GUID = "{CONFORMITY}", Name = "Conformity" }],
        });

        using var handle = await connector.LogInToVaultAsync("{CONFORMITY}");

        Assert.Equal("{CONFORMITY}", handle.VaultGuid); // from the caller's input, not read back from the COM object
        Assert.Equal("Conformity", handle.VaultName);
    }

    [Fact]
    public async Task LogInToVaultAsync_ReusesTheSameServerIdentityUsedForConnect()
    {
        var options = new MFilesComConnectorOptions { Username = "svc-account", Password = "hunter2" };
        var attempt = 0;
        var (connector, getFake) = BuildConnector(options, factory: () =>
        {
            attempt++;
            return attempt == 1
                ? new FakeServerApplication { FailConnectForAuthType = authType => authType == 1 } // force credential fallback
                : new FakeServerApplication { Vaults = [new FakeVault { GUID = "{X}", Name = "V" }] };
        });

        using var handle = await connector.LogInToVaultAsync("{X}");

        // The server connected via AuthType 3 (credential fallback) — the vault login must reuse
        // that same identity rather than hardcoding SSO (AuthType 1) regardless of what worked.
        Assert.Equal(3, getFake().LastLoginAuthType);
    }

    [Fact]
    public async Task LogInToVaultAsync_PermissionDenied_ThrowsPermissionDeniedException()
    {
        // Reproduces a real failure hit live against Conformity (2026-07-26): this Windows
        // account can reach the server (SSO/enumeration both work) but has no user account
        // inside this specific vault. Confirms MFilesErrors classifies it correctly.
        var (connector, _) = BuildConnector(factory: () => new FakeServerApplication
        {
            FailLoginForVaultGuid = _ => true,
        });

        await Assert.ThrowsAsync<MFilesPermissionDeniedException>(() => connector.LogInToVaultAsync("{NO-ACCESS}"));
    }

    [Fact]
    public async Task VaultHandle_Dispose_CallsLogOutSilent()
    {
        var fakeVault = new FakeVault { GUID = "{A}", Name = "Conformity" };
        var (connector, _) = BuildConnector(factory: () => new FakeServerApplication { Vaults = [fakeVault] });

        var handle = await connector.LogInToVaultAsync("{A}");
        handle.Dispose();

        Assert.True(fakeVault.LoggedOut);
    }
}
