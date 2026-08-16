using System.Collections.Concurrent;

namespace ProvisioningAI.MFilesConnectors;

/// <summary>Pool is at capacity and no connection freed up within the acquire timeout.</summary>
public sealed class MFilesPoolExhaustedException : MFilesException
{
    public MFilesPoolExhaustedException(string message) : base(message) { }
}

public sealed class ConnectionPoolOptions
{
    public int MaxConnections { get; set; } = 10;
    public TimeSpan IdleTimeout { get; set; } = TimeSpan.FromMinutes(5);
    public TimeSpan AcquireTimeout { get; set; } = TimeSpan.FromSeconds(30);
}

/// <summary>
/// One pooled COM session — the authenticated MFilesServerApplication instance.
/// Kept alive between calls so a repeat connect skips re-authentication.
/// AuthTypeUsed records which identity actually succeeded (SSO vs. credential
/// fallback), so a later per-vault login reuses the same identity instead of
/// guessing — the server connect and the vault login are separate M-Files
/// authentication steps even though they share one COM session.
/// </summary>
public sealed class PooledMFilesSession
{
    public required object ServerApplication { get; init; }
    public required int AuthTypeUsed { get; init; }
    public DateTimeOffset LastUsed { get; set; } = DateTimeOffset.UtcNow;

    public void Dispose() => ServerApplication.CloseComObjectSafe();
}

/// <summary>
/// Bounded, thread-safe pool of authenticated COM sessions keyed by server
/// identity. Acquiring past capacity blocks up to AcquireTimeout before
/// throwing MFilesPoolExhaustedException — deliberately distinct from a
/// connection failure, since the server may be perfectly healthy and simply
/// busy serving other requests.
/// </summary>
public sealed class ConnectionPool : IDisposable
{
    private readonly ConnectionPoolOptions _options;
    private readonly SemaphoreSlim _capacity;
    private readonly ConcurrentDictionary<string, ConcurrentBag<PooledMFilesSession>> _idle = new();

    public ConnectionPool(ConnectionPoolOptions options)
    {
        _options = options;
        _capacity = new SemaphoreSlim(options.MaxConnections, options.MaxConnections);
    }

    public async Task<PooledMFilesSession> AcquireAsync(
        string key,
        Func<CancellationToken, Task<PooledMFilesSession>> factory,
        CancellationToken cancellationToken = default)
    {
        var acquired = await _capacity.WaitAsync(_options.AcquireTimeout, cancellationToken).ConfigureAwait(false);
        if (!acquired)
        {
            throw new MFilesPoolExhaustedException(
                $"Connection pool exhausted: all {_options.MaxConnections} connections in use and none freed within {_options.AcquireTimeout}.");
        }

        try
        {
            var bag = _idle.GetOrAdd(key, static _ => new ConcurrentBag<PooledMFilesSession>());
            while (bag.TryTake(out var pooled))
            {
                if (DateTimeOffset.UtcNow - pooled.LastUsed <= _options.IdleTimeout)
                {
                    pooled.LastUsed = DateTimeOffset.UtcNow;
                    return pooled;
                }
                pooled.Dispose(); // idle too long — release its COM handle rather than hand back a stale session
            }

            return await factory(cancellationToken).ConfigureAwait(false);
        }
        catch
        {
            _capacity.Release(); // never handed out a usable connection — give the slot back
            throw;
        }
    }

    public void Release(string key, PooledMFilesSession session)
    {
        session.LastUsed = DateTimeOffset.UtcNow;
        _idle.GetOrAdd(key, static _ => new ConcurrentBag<PooledMFilesSession>()).Add(session);
        _capacity.Release();
    }

    /// <summary>The session errored mid-use — release its COM handle and free the slot without pooling it for reuse.</summary>
    public void Discard(PooledMFilesSession session)
    {
        session.Dispose();
        _capacity.Release();
    }

    public void Dispose()
    {
        foreach (var bag in _idle.Values)
            while (bag.TryTake(out var pooled))
                pooled.Dispose();
        _capacity.Dispose();
    }
}
