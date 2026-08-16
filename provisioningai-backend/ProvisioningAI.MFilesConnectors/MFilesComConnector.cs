using System.Diagnostics;
using System.Net;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace ProvisioningAI.MFilesConnectors;

public sealed class MFilesComConnectorOptions
{
    public string Server { get; set; } = "localhost";
    public string Endpoint { get; set; } = "2266";
    public string ProtocolSequence { get; set; } = "ncacn_ip_tcp";

    /// <summary>Fallback credentials, tried only if Windows SSO fails twice. Leave null/empty to disable the fallback.</summary>
    public string? Username { get; set; }
    public string? Password { get; set; }
}

/// <summary>
/// COM connector for the M-Files admin surface (server-level connect, vault
/// enumeration). Every method here is the only place in the solution allowed
/// to reference a COM type — everything above this class depends on
/// IMFilesConnector instead.
///
/// Connect() signature, AuthType enum, and the SSO-first/fallback sequence
/// are confirmed against a live MFilesAPI installation (Connector I,
/// ClientVaultAccessMSIBuilder), not guessed — see the constants and
/// ConnectWithSsoFallback below.
/// </summary>
public sealed class MFilesComConnector : IMFilesConnector
{
    private const string ServerApplicationProgId = "MFilesAPI.MFilesServerApplication";

    // MFAuthType enum, confirmed against Interop.MFilesApi.dll.
    private const int MFAuthTypeLoggedOnWindowsUser = 1; // Windows SSO — no credentials
    private const int MFAuthTypeSpecificMFilesUser = 3;  // explicit username/password

    private static readonly TimeSpan DefaultSsoRetryDelay = TimeSpan.FromSeconds(10);

    private readonly MFilesComConnectorOptions _options;
    private readonly ConnectionPool _pool;
    private readonly ILogger<MFilesComConnector> _logger;
    private readonly Func<object> _serverApplicationFactory;
    private readonly TimeSpan _ssoRetryDelay;

    public MFilesComConnector(IOptions<MFilesComConnectorOptions> options, ConnectionPool pool, ILogger<MFilesComConnector> logger)
        : this(options, pool, logger, CreateServerApplication, DefaultSsoRetryDelay)
    {
    }

    // Internal seam for tests: a plain C# object with matching Connect(...)/GetOnlineVaults()
    // methods flows through the same `dynamic` call sites as a real COM object, since DLR
    // dispatch doesn't care whether the target is COM or a CLR type — it just needs the members.
    // That's what makes "successful connect / auth failure / vault-not-found" testable without
    // a live vault, per the brief's "no test may require a live vault" constraint. ssoRetryDelay
    // is also overridable here so the retry-then-fallback path doesn't cost a real 10s per test.
    internal MFilesComConnector(
        IOptions<MFilesComConnectorOptions> options,
        ConnectionPool pool,
        ILogger<MFilesComConnector> logger,
        Func<object> serverApplicationFactory,
        TimeSpan ssoRetryDelay)
    {
        _options = options.Value;
        _pool = pool;
        _logger = logger;
        _serverApplicationFactory = serverApplicationFactory;
        _ssoRetryDelay = ssoRetryDelay;
    }

    public async Task<IReadOnlyList<VaultInfo>> ListVaultsAsync(CancellationToken cancellationToken = default)
    {
        var key = $"{_options.Server}:{_options.Endpoint}";
        var stopwatch = Stopwatch.StartNew();
        var session = await _pool.AcquireAsync(key, ConnectAsync, cancellationToken).ConfigureAwait(false);

        try
        {
            var vaults = await Task.Run(() => EnumerateVaults(session.ServerApplication), cancellationToken).ConfigureAwait(false);
            _pool.Release(key, session);
            return vaults;
        }
        catch (Exception ex)
        {
            // The session itself may be in a bad state after a failure mid-call — don't hand it back for reuse.
            _pool.Discard(session);
            throw MFilesErrors.Translate(ex);
        }
        finally
        {
            stopwatch.Stop();
            _logger.LogInformation(
                "Listed vaults on {Server}:{Endpoint} in {ElapsedMs}ms",
                _options.Server, _options.Endpoint, stopwatch.ElapsedMilliseconds);
        }
    }

    private static IReadOnlyList<VaultInfo> EnumerateVaults(object serverApplication)
    {
        dynamic srvApp = serverApplication;
        object onlineVaults = srvApp.GetOnlineVaults();
        var result = new List<VaultInfo>();
        try
        {
            foreach (dynamic vault in (System.Collections.IEnumerable)onlineVaults)
            {
                try
                {
                    result.Add(new VaultInfo((string)vault.GUID, (string)vault.Name));
                }
                finally
                {
                    ((object)vault).CloseComObjectSafe();
                }
            }
        }
        finally
        {
            onlineVaults.CloseComObjectSafe();
        }
        return result;
    }

    public async Task<IVaultHandle> LogInToVaultAsync(string vaultGuid, CancellationToken cancellationToken = default)
    {
        var key = $"{_options.Server}:{_options.Endpoint}";
        var stopwatch = Stopwatch.StartNew();
        var session = await _pool.AcquireAsync(key, ConnectAsync, cancellationToken).ConfigureAwait(false);

        try
        {
            var handle = await Task.Run(() => LogInToVaultCore(session, vaultGuid), cancellationToken).ConfigureAwait(false);
            // The server-level session is still good regardless of vault-login outcome — release it for reuse.
            _pool.Release(key, session);
            return handle;
        }
        catch (Exception ex)
        {
            _pool.Discard(session);
            throw MFilesErrors.Translate(ex, vaultGuid);
        }
        finally
        {
            stopwatch.Stop();
            _logger.LogInformation(
                "Logged into vault {VaultGuid} on {Server}:{Endpoint} in {ElapsedMs}ms",
                vaultGuid, _options.Server, _options.Endpoint, stopwatch.ElapsedMilliseconds);
        }
    }

    private VaultHandle LogInToVaultCore(PooledMFilesSession session, string vaultGuid)
    {
        dynamic srvApp = session.ServerApplication;
        // Reuse whichever identity actually authenticated the server session — SSO passes no
        // credentials, the fallback path passes the same M-Files username/password used to Connect().
        var username = session.AuthTypeUsed == MFAuthTypeSpecificMFilesUser ? _options.Username : null;
        var password = session.AuthTypeUsed == MFAuthTypeSpecificMFilesUser ? (_options.Password ?? "") : null;
        dynamic vault = srvApp.LogInAsUserToVault(vaultGuid, null, session.AuthTypeUsed, username, password, null);
        // vault.GUID comes back empty on a live server (confirmed 2026-07-26) — carry the caller's GUID instead.
        return new VaultHandle((object)vault, vaultGuid, (string)vault.Name);
    }

    private Task<PooledMFilesSession> ConnectAsync(CancellationToken cancellationToken)
        => Task.Run(ConnectWithSsoFallback, cancellationToken);

    /// <summary>
    /// SSO-first, with the fallback order Connector I uses:
    ///   1. Try Windows SSO (AuthType 1). Retry once after a delay — a slow
    ///      COM response otherwise reads as "SSO unavailable" and falls back
    ///      to credentials that were never actually needed.
    ///   2. On a second SSO failure, release that server object and create a
    ///      FRESH MFilesServerApplication — do not reuse an instance that
    ///      failed to authenticate — then connect with AuthType 3 if
    ///      credentials were configured.
    ///   3. The plaintext password is cleared in a finally block. Note: .NET
    ///      strings are immutable, so this clears the *reference*, not the
    ///      original memory — real scrubbing would need the caller to supply
    ///      credentials as SecureString/char[] instead of string. Flagged,
    ///      not solved, here.
    /// </summary>
    private PooledMFilesSession ConnectWithSsoFallback()
    {
        var localComputerName = Dns.GetHostName();
        var srvApp = _serverApplicationFactory();

        try
        {
            Connect(srvApp, MFAuthTypeLoggedOnWindowsUser, "", "", localComputerName);
            _logger.LogInformation("Connected via Windows SSO to {Server}:{Endpoint}", _options.Server, _options.Endpoint);
            return new PooledMFilesSession { ServerApplication = srvApp, AuthTypeUsed = MFAuthTypeLoggedOnWindowsUser };
        }
        catch (Exception firstAttempt)
        {
            _logger.LogWarning(firstAttempt, "SSO connect failed on first attempt to {Server}, retrying once", _options.Server);
            Thread.Sleep(_ssoRetryDelay);

            try
            {
                Connect(srvApp, MFAuthTypeLoggedOnWindowsUser, "", "", localComputerName);
                _logger.LogInformation("Connected via Windows SSO to {Server}:{Endpoint} (second attempt)", _options.Server, _options.Endpoint);
                return new PooledMFilesSession { ServerApplication = srvApp, AuthTypeUsed = MFAuthTypeLoggedOnWindowsUser };
            }
            catch (Exception secondAttempt)
            {
                srvApp.CloseComObjectSafe(); // failed twice — don't reuse this instance

                if (string.IsNullOrEmpty(_options.Username))
                    throw MFilesErrors.Translate(secondAttempt);

                return ConnectWithCredentials(localComputerName);
            }
        }
    }

    private PooledMFilesSession ConnectWithCredentials(string localComputerName)
    {
        var freshSrvApp = _serverApplicationFactory();
        var password = _options.Password ?? "";
        try
        {
            Connect(freshSrvApp, MFAuthTypeSpecificMFilesUser, _options.Username!, password, localComputerName);
            _logger.LogInformation(
                "Connected via M-Files credentials to {Server}:{Endpoint} (SSO unavailable)", _options.Server, _options.Endpoint);
            return new PooledMFilesSession { ServerApplication = freshSrvApp, AuthTypeUsed = MFAuthTypeSpecificMFilesUser };
        }
        catch (Exception ex)
        {
            freshSrvApp.CloseComObjectSafe();
            throw MFilesErrors.Translate(ex);
        }
        finally
        {
            password = string.Empty;
        }
    }

    private void Connect(object serverApplication, int authType, string username, string password, string localComputerName)
    {
        dynamic srvApp = serverApplication;
        srvApp.Connect(
            authType, username, password,
            /* Domain */ "",
            _options.ProtocolSequence, _options.Server, _options.Endpoint,
            localComputerName,
            /* AllowAnonymousConnection */ false);
    }

    private static object CreateServerApplication()
    {
        var type = Type.GetTypeFromProgID(ServerApplicationProgId)
            ?? throw new InvalidOperationException($"COM class '{ServerApplicationProgId}' is not registered on this machine.");
        return Activator.CreateInstance(type)
            ?? throw new InvalidOperationException($"Could not activate COM class '{ServerApplicationProgId}'.");
    }
}
