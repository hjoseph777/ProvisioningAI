using ProvisioningAI.MFilesConnectors;

namespace ProvisioningAI.Tests.MFilesConnectors;

public class ConnectionPoolTests
{
    private static PooledMFilesSession NewFakeSession() => new() { ServerApplication = new object(), AuthTypeUsed = 1 };

    [Fact]
    public async Task AcquireAsync_NoIdleSession_CallsFactory()
    {
        var pool = new ConnectionPool(new ConnectionPoolOptions { MaxConnections = 2 });
        var factoryCalls = 0;

        var session = await pool.AcquireAsync("key", _ => { factoryCalls++; return Task.FromResult(NewFakeSession()); });

        Assert.Equal(1, factoryCalls);
        Assert.NotNull(session);
    }

    [Fact]
    public async Task Release_ThenAcquireSameKey_ReusesSessionWithoutCallingFactoryAgain()
    {
        var pool = new ConnectionPool(new ConnectionPoolOptions { MaxConnections = 2 });
        var factoryCalls = 0;
        Task<PooledMFilesSession> Factory(CancellationToken _) { factoryCalls++; return Task.FromResult(NewFakeSession()); }

        var first = await pool.AcquireAsync("key", Factory);
        pool.Release("key", first);
        var second = await pool.AcquireAsync("key", Factory);

        Assert.Equal(1, factoryCalls); // second acquire reused the pooled session — no second connect
        Assert.Same(first, second);
    }

    [Fact]
    public async Task Acquire_PastCapacity_ThrowsPoolExhaustedAfterTimeout()
    {
        var pool = new ConnectionPool(new ConnectionPoolOptions
        {
            MaxConnections = 1,
            AcquireTimeout = TimeSpan.FromMilliseconds(100),
        });

        // Hold the only slot open (never released).
        await pool.AcquireAsync("key", _ => Task.FromResult(NewFakeSession()));

        await Assert.ThrowsAsync<MFilesPoolExhaustedException>(
            () => pool.AcquireAsync("key", _ => Task.FromResult(NewFakeSession())));
    }

    [Fact]
    public async Task Acquire_FactoryThrows_ReleasesCapacitySlotForTheNextCaller()
    {
        var pool = new ConnectionPool(new ConnectionPoolOptions { MaxConnections = 1 });

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            pool.AcquireAsync("key", _ => throw new InvalidOperationException("boom")));

        // If the failed attempt hadn't released its slot, this would hang/throw PoolExhausted instead.
        var session = await pool.AcquireAsync("key", _ => Task.FromResult(NewFakeSession()));
        Assert.NotNull(session);
    }

    [Fact]
    public async Task Discard_ReleasesSlotButDoesNotPoolTheSessionForReuse()
    {
        var pool = new ConnectionPool(new ConnectionPoolOptions { MaxConnections = 1 });
        var factoryCalls = 0;
        Task<PooledMFilesSession> Factory(CancellationToken _) { factoryCalls++; return Task.FromResult(NewFakeSession()); }

        var session = await pool.AcquireAsync("key", Factory);
        pool.Discard(session); // simulates "errored mid-use" — not returned to the idle bag

        var next = await pool.AcquireAsync("key", Factory);

        Assert.Equal(2, factoryCalls); // discarded session wasn't reused — a fresh one was created
        Assert.NotSame(session, next);
    }

    [Fact]
    public async Task Acquire_IdleSessionOlderThanTimeout_IsNotReused()
    {
        var pool = new ConnectionPool(new ConnectionPoolOptions
        {
            MaxConnections = 2,
            IdleTimeout = TimeSpan.FromMilliseconds(1),
        });
        var factoryCalls = 0;
        Task<PooledMFilesSession> Factory(CancellationToken _) { factoryCalls++; return Task.FromResult(NewFakeSession()); }

        var first = await pool.AcquireAsync("key", Factory);
        pool.Release("key", first);
        await Task.Delay(50); // let it age past the 1ms idle timeout

        var second = await pool.AcquireAsync("key", Factory);

        Assert.Equal(2, factoryCalls); // stale session was discarded, not handed back
        Assert.NotSame(first, second);
    }

    [Fact]
    public async Task Dispose_ReleasesAllIdleSessions()
    {
        var pool = new ConnectionPool(new ConnectionPoolOptions { MaxConnections = 2 });
        var first = await pool.AcquireAsync("a", _ => Task.FromResult(NewFakeSession()));
        var second = await pool.AcquireAsync("b", _ => Task.FromResult(NewFakeSession()));
        pool.Release("a", first);
        pool.Release("b", second);

        var ex = Record.Exception(() => pool.Dispose());

        Assert.Null(ex);
    }
}
