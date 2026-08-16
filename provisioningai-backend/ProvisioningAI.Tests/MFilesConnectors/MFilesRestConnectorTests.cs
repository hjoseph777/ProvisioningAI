using System.Net;
using System.Net.Http.Json;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Moq;
using ProvisioningAI.MFilesConnectors;

namespace ProvisioningAI.Tests.MFilesConnectors;

public class MFilesRestConnectorTests
{
    // Queue-based fake transport — no network, no live server. Each SendAsync call pops the
    // next canned response (or throws, to simulate a transient network failure).
    private sealed class FakeHttpMessageHandler : HttpMessageHandler
    {
        private readonly Queue<Func<HttpResponseMessage>> _responses = new();
        public int CallCount { get; private set; }

        public void Enqueue(Func<HttpResponseMessage> response) => _responses.Enqueue(response);

        /// <summary>Simulates a network-level failure (DNS, connection reset, timeout) rather than an HTTP status code.</summary>
        public void EnqueueNetworkFailure() => _responses.Enqueue(() => throw new HttpRequestException("Simulated network failure."));

        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            CallCount++;
            if (_responses.Count == 0)
                throw new InvalidOperationException("Fake transport ran out of canned responses — test set up too few.");
            return Task.FromResult(_responses.Dequeue()());
        }
    }

    private static HttpResponseMessage TokenResponse(string token = "tok-123") =>
        new(HttpStatusCode.OK) { Content = JsonContent.Create(new { Value = token }) };

    private static HttpResponseMessage VaultsResponse(params (string Guid, string Name)[] vaults) =>
        new(HttpStatusCode.OK) { Content = JsonContent.Create(vaults.Select(v => new { GUID = v.Guid, Name = v.Name }).ToList()) };

    private static (MFilesRestConnector connector, FakeHttpMessageHandler handler) BuildConnector(MFilesRestConnectorOptions? options = null)
    {
        var handler = new FakeHttpMessageHandler();

        // Real IHttpClientFactory hands back a fresh HttpClient wrapper per call (backed by a
        // pooled handler) — mirror that here rather than returning one already-used instance,
        // since HttpClient throws if BaseAddress/headers are touched after its first request.
        var factory = new Mock<IHttpClientFactory>();
        factory.Setup(f => f.CreateClient(nameof(MFilesRestConnector)))
            .Returns(() => new HttpClient(handler, disposeHandler: false) { BaseAddress = new Uri("https://fake.local/REST/") });

        var connector = new MFilesRestConnector(
            factory.Object,
            Options.Create(options ?? new MFilesRestConnectorOptions
            {
                MaxRetries = 2,
                RetryBaseDelay = TimeSpan.FromMilliseconds(1), // fast retries in tests
            }),
            NullLogger<MFilesRestConnector>.Instance);

        return (connector, handler);
    }

    [Fact]
    public async Task ListVaultsAsync_SuccessfulCall_ReturnsMappedVaults()
    {
        var (connector, handler) = BuildConnector();
        handler.Enqueue(() => TokenResponse());
        handler.Enqueue(() => VaultsResponse(("{A}", "Conformity"), ("{B}", "Approbation")));

        var vaults = await connector.ListVaultsAsync();

        Assert.Equal(2, vaults.Count);
        Assert.Contains(vaults, v => v.Guid == "{A}" && v.Name == "Conformity");
    }

    [Fact]
    public async Task ListVaultsAsync_TokenRequestFails_ThrowsAuthenticationException()
    {
        var (connector, handler) = BuildConnector();
        handler.Enqueue(() => new HttpResponseMessage(HttpStatusCode.Unauthorized));

        await Assert.ThrowsAsync<MFilesAuthenticationException>(() => connector.ListVaultsAsync());
    }

    [Fact]
    public async Task ListVaultsAsync_ExpiredToken_RefreshesOnceAndRetries()
    {
        var (connector, handler) = BuildConnector();
        handler.Enqueue(() => TokenResponse("stale-token"));
        handler.Enqueue(() => new HttpResponseMessage(HttpStatusCode.Unauthorized)); // token rejected
        handler.Enqueue(() => TokenResponse("fresh-token"));
        handler.Enqueue(() => VaultsResponse(("{A}", "Conformity")));

        var vaults = await connector.ListVaultsAsync();

        Assert.Single(vaults);
        Assert.Equal(4, handler.CallCount); // token, 401, refresh-token, success — refreshed exactly once, not looped
    }

    [Fact]
    public async Task ListVaultsAsync_NotFound_ThrowsVaultNotFoundException()
    {
        var (connector, handler) = BuildConnector();
        handler.Enqueue(() => TokenResponse());
        handler.Enqueue(() => new HttpResponseMessage(HttpStatusCode.NotFound));

        await Assert.ThrowsAsync<MFilesVaultNotFoundException>(() => connector.ListVaultsAsync());
    }

    [Fact]
    public async Task ListVaultsAsync_Forbidden_ThrowsPermissionDeniedException()
    {
        var (connector, handler) = BuildConnector();
        handler.Enqueue(() => TokenResponse());
        handler.Enqueue(() => new HttpResponseMessage(HttpStatusCode.Forbidden));

        await Assert.ThrowsAsync<MFilesPermissionDeniedException>(() => connector.ListVaultsAsync());
    }

    [Fact]
    public async Task ListVaultsAsync_TransientNetworkFailure_RetriesThenSucceeds()
    {
        var (connector, handler) = BuildConnector();
        handler.Enqueue(() => TokenResponse());
        handler.EnqueueNetworkFailure();
        handler.Enqueue(() => VaultsResponse(("{A}", "Conformity")));

        var vaults = await connector.ListVaultsAsync();

        Assert.Single(vaults);
    }

    [Fact]
    public async Task ListVaultsAsync_TransientServerError_RetriesThenSucceeds()
    {
        var (connector, handler) = BuildConnector();
        handler.Enqueue(() => TokenResponse());
        handler.Enqueue(() => new HttpResponseMessage(HttpStatusCode.ServiceUnavailable));
        handler.Enqueue(() => VaultsResponse(("{A}", "Conformity")));

        var vaults = await connector.ListVaultsAsync();

        Assert.Single(vaults);
    }

    [Fact]
    public async Task ListVaultsAsync_PersistentServerError_ThrowsAfterExhaustingRetries()
    {
        var (connector, handler) = BuildConnector(new MFilesRestConnectorOptions { MaxRetries = 2, RetryBaseDelay = TimeSpan.FromMilliseconds(1) });
        handler.Enqueue(() => TokenResponse());
        handler.Enqueue(() => new HttpResponseMessage(HttpStatusCode.ServiceUnavailable));
        handler.Enqueue(() => new HttpResponseMessage(HttpStatusCode.ServiceUnavailable));
        handler.Enqueue(() => new HttpResponseMessage(HttpStatusCode.ServiceUnavailable));

        await Assert.ThrowsAsync<MFilesVaultOfflineException>(() => connector.ListVaultsAsync());
    }

    [Fact]
    public async Task ListVaultsAsync_NotFound_DoesNotRetry()
    {
        var (connector, handler) = BuildConnector();
        handler.Enqueue(() => TokenResponse());
        handler.Enqueue(() => new HttpResponseMessage(HttpStatusCode.NotFound));
        // No further responses queued — if the connector retried 404, the fake transport would
        // throw "ran out of canned responses" instead of the expected typed exception.

        await Assert.ThrowsAsync<MFilesVaultNotFoundException>(() => connector.ListVaultsAsync());
        Assert.Equal(2, handler.CallCount); // token + one vaults call, no retry
    }
}
