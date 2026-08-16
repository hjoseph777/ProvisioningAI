using System.Net;
using System.Net.Http.Json;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace ProvisioningAI.MFilesConnectors;

public sealed class MFilesRestConnectorOptions
{
    public string BaseUrl { get; set; } = "https://localhost/REST/";
    public string? Username { get; set; }
    public string? Password { get; set; }
    public string VaultGuid { get; set; } = "";
    public int MaxRetries { get; set; } = 3;
    public TimeSpan RetryBaseDelay { get; set; } = TimeSpan.FromMilliseconds(250);
}

/// <summary>
/// REST connector — searches and metadata reads over HTTP, platform-
/// independent (no COM, no threading model to worry about). Covers the
/// IMFilesConnector surface it can: vault listing via
/// GET /REST/server/vaults.json, which per the M-Files REST API is available
/// without a vault-specific login (only a server-level auth token).
///
/// NOTE: implemented to the documented M-Files REST API contract. Unlike
/// MFilesComConnector, this has NOT been verified against a live server —
/// the REST/web service wasn't reachable on this dev machine (connection
/// refused on the default endpoint). Confirm the base URL and endpoint
/// availability before relying on this in an environment where it matters.
/// </summary>
public sealed class MFilesRestConnector : IMFilesConnector
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly MFilesRestConnectorOptions _options;
    private readonly ILogger<MFilesRestConnector> _logger;

    private string? _authToken;
    private readonly SemaphoreSlim _tokenLock = new(1, 1);

    public MFilesRestConnector(IHttpClientFactory httpClientFactory, IOptions<MFilesRestConnectorOptions> options, ILogger<MFilesRestConnector> logger)
    {
        _httpClientFactory = httpClientFactory;
        _options = options.Value;
        _logger = logger;
    }

    public async Task<IReadOnlyList<VaultInfo>> ListVaultsAsync(CancellationToken cancellationToken = default)
    {
        var response = await SendWithRetryAsync(HttpMethod.Get, "server/vaults.json", cancellationToken).ConfigureAwait(false);
        var vaults = await response.Content.ReadFromJsonAsync<List<RestVault>>(cancellationToken: cancellationToken).ConfigureAwait(false)
            ?? [];
        return vaults.Select(v => new VaultInfo(v.GUID, v.Name)).ToList();
    }

    /// <summary>
    /// Deferred deliberately (2026-07-26): building a real per-vault REST session/token flow
    /// was agreed as speculative until a concrete caller needs it — COM covers the admin surface
    /// Discovery needs for now. Throwing here beats a silent no-op or a half-built stub.
    /// </summary>
    public Task<IVaultHandle> LogInToVaultAsync(string vaultGuid, CancellationToken cancellationToken = default)
        => throw new NotSupportedException(
            "MFilesRestConnector does not implement per-vault login yet — deferred until a concrete REST use case exists. Use MFilesComConnector for vault sessions.");

    private async Task<string> GetAuthTokenAsync(CancellationToken cancellationToken)
    {
        if (_authToken is not null) return _authToken;

        await _tokenLock.WaitAsync(cancellationToken).ConfigureAwait(false);
        try
        {
            if (_authToken is not null) return _authToken; // another caller refreshed it while we waited

            var client = _httpClientFactory.CreateClient(nameof(MFilesRestConnector));

            var request = new RestAuthRequest
            {
                Username = _options.Username ?? "",
                Password = _options.Password ?? "",
                VaultGuid = string.IsNullOrEmpty(_options.VaultGuid) ? null : _options.VaultGuid,
            };

            var response = await client.PostAsJsonAsync("server/authenticationtokens.aspx", request, cancellationToken).ConfigureAwait(false);
            if (!response.IsSuccessStatusCode)
                throw new MFilesAuthenticationException($"Token request failed with {(int)response.StatusCode} {response.StatusCode}.");

            var body = await response.Content.ReadFromJsonAsync<RestAuthResponse>(cancellationToken: cancellationToken).ConfigureAwait(false);
            _authToken = body?.Value ?? throw new MFilesAuthenticationException("Token response did not contain a value.");
            return _authToken;
        }
        finally
        {
            _tokenLock.Release();
        }
    }

    /// <summary>
    /// Retries transient failures (network errors, 5xx, 408, 429) with
    /// exponential backoff. Deliberately does NOT retry 401 (bad/expired
    /// token — refreshed once instead, not blindly retried) or 404 (retrying
    /// a request for something that doesn't exist just wastes time).
    /// </summary>
    private async Task<HttpResponseMessage> SendWithRetryAsync(HttpMethod method, string relativeUrl, CancellationToken cancellationToken)
    {
        var client = _httpClientFactory.CreateClient(nameof(MFilesRestConnector));

        var attempt = 0;
        var refreshedTokenOnce = false;

        while (true)
        {
            attempt++;
            var token = await GetAuthTokenAsync(cancellationToken).ConfigureAwait(false);

            using var request = new HttpRequestMessage(method, relativeUrl);
            request.Headers.Add("X-Authentication-Token", token);

            HttpResponseMessage response;
            try
            {
                response = await client.SendAsync(request, cancellationToken).ConfigureAwait(false);
            }
            catch (HttpRequestException ex) when (attempt <= _options.MaxRetries)
            {
                await DelayBeforeRetry(attempt, cancellationToken).ConfigureAwait(false);
                _logger.LogWarning(ex, "Transient network failure calling {Url}, attempt {Attempt}/{MaxRetries}", relativeUrl, attempt, _options.MaxRetries);
                continue;
            }

            if (response.IsSuccessStatusCode) return response;

            if (response.StatusCode == HttpStatusCode.Unauthorized && !refreshedTokenOnce)
            {
                // Token expired or was rejected — refresh once and retry immediately, not as part of the backoff budget.
                refreshedTokenOnce = true;
                _authToken = null;
                continue;
            }

            if (response.StatusCode == HttpStatusCode.NotFound)
                throw new MFilesVaultNotFoundException(_options.VaultGuid, $"Not found: {relativeUrl}");

            if (response.StatusCode == HttpStatusCode.Unauthorized || response.StatusCode == HttpStatusCode.Forbidden)
                throw response.StatusCode == HttpStatusCode.Forbidden
                    ? new MFilesPermissionDeniedException($"Forbidden: {relativeUrl}")
                    : new MFilesAuthenticationException($"Unauthorized: {relativeUrl}");

            var isTransient = (int)response.StatusCode >= 500 || response.StatusCode == HttpStatusCode.RequestTimeout || (int)response.StatusCode == 429;
            if (isTransient && attempt <= _options.MaxRetries)
            {
                await DelayBeforeRetry(attempt, cancellationToken).ConfigureAwait(false);
                _logger.LogWarning("Transient {StatusCode} calling {Url}, attempt {Attempt}/{MaxRetries}", response.StatusCode, relativeUrl, attempt, _options.MaxRetries);
                continue;
            }

            throw new MFilesVaultOfflineException($"Request to {relativeUrl} failed with {(int)response.StatusCode} {response.StatusCode}.");
        }
    }

    private Task DelayBeforeRetry(int attempt, CancellationToken cancellationToken)
    {
        var delay = _options.RetryBaseDelay * Math.Pow(2, attempt - 1);
        return Task.Delay(delay, cancellationToken);
    }

    private sealed class RestAuthRequest
    {
        public string Username { get; set; } = "";
        public string Password { get; set; } = "";
        public string? VaultGuid { get; set; }
    }

    private sealed class RestAuthResponse
    {
        public string? Value { get; set; }
    }

    private sealed class RestVault
    {
        public string GUID { get; set; } = "";
        public string Name { get; set; } = "";
    }
}
