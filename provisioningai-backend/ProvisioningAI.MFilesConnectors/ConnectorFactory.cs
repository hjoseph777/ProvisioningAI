using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;

namespace ProvisioningAI.MFilesConnectors;

public enum MFilesConnectorTransport { Com, Rest }

/// <summary>Resolves the requested transport's connector — callers pick COM (admin surface) or REST (searches/metadata), never the concrete class.</summary>
public interface IMFilesConnectorFactory
{
    IMFilesConnector Create(MFilesConnectorTransport transport);
}

public sealed class MFilesConnectorFactory : IMFilesConnectorFactory
{
    private readonly IServiceProvider _serviceProvider;

    public MFilesConnectorFactory(IServiceProvider serviceProvider) => _serviceProvider = serviceProvider;

    public IMFilesConnector Create(MFilesConnectorTransport transport) => transport switch
    {
        MFilesConnectorTransport.Com => _serviceProvider.GetRequiredService<MFilesComConnector>(),
        MFilesConnectorTransport.Rest => _serviceProvider.GetRequiredService<MFilesRestConnector>(),
        _ => throw new ArgumentOutOfRangeException(nameof(transport), transport, null),
    };
}

/// <summary>DI registration entry point — call from the API host's Program.cs (Phase 3), e.g. builder.Services.AddMFilesConnectors(builder.Configuration).</summary>
public static class MFilesConnectorsServiceCollectionExtensions
{
    public static IServiceCollection AddMFilesConnectors(this IServiceCollection services, IConfiguration configuration)
    {
        services.Configure<MFilesComConnectorOptions>(configuration.GetSection("MFiles:Com"));
        services.Configure<MFilesRestConnectorOptions>(configuration.GetSection("MFiles:Rest"));
        services.Configure<ConnectionPoolOptions>(configuration.GetSection("MFiles:Pool"));

        services.AddSingleton(sp => new ConnectionPool(sp.GetRequiredService<IOptions<ConnectionPoolOptions>>().Value));
        services.AddTransient<MFilesComConnector>();

        services.AddHttpClient(nameof(MFilesRestConnector), (sp, client) =>
        {
            var restOptions = sp.GetRequiredService<IOptions<MFilesRestConnectorOptions>>().Value;
            client.BaseAddress = new Uri(restOptions.BaseUrl);
        });
        services.AddTransient<MFilesRestConnector>();

        services.AddSingleton<IMFilesConnectorFactory, MFilesConnectorFactory>();

        return services;
    }
}
