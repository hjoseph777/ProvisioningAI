using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using ProvisioningAI.MFilesConnectors;

namespace ProvisioningAI.Tests.MFilesConnectors;

public class ConnectorFactoryTests
{
    private static IServiceProvider BuildServices()
    {
        var configuration = new ConfigurationBuilder().Build(); // empty config — options just fall back to their defaults
        var services = new ServiceCollection();
        services.AddLogging();
        services.AddMFilesConnectors(configuration);
        return services.BuildServiceProvider();
    }

    [Fact]
    public void AddMFilesConnectors_RegistersResolvableFactory()
    {
        var provider = BuildServices();

        var factory = provider.GetService<IMFilesConnectorFactory>();

        Assert.NotNull(factory);
    }

    [Fact]
    public void Create_Com_ResolvesMFilesComConnector()
    {
        var factory = BuildServices().GetRequiredService<IMFilesConnectorFactory>();

        var connector = factory.Create(MFilesConnectorTransport.Com);

        Assert.IsType<MFilesComConnector>(connector);
    }

    [Fact]
    public void Create_Rest_ResolvesMFilesRestConnector()
    {
        var factory = BuildServices().GetRequiredService<IMFilesConnectorFactory>();

        var connector = factory.Create(MFilesConnectorTransport.Rest);

        Assert.IsType<MFilesRestConnector>(connector);
    }

    [Fact]
    public void Create_UnknownTransport_ThrowsArgumentOutOfRangeException()
    {
        var factory = BuildServices().GetRequiredService<IMFilesConnectorFactory>();

        Assert.Throws<ArgumentOutOfRangeException>(() => factory.Create((MFilesConnectorTransport)999));
    }
}
