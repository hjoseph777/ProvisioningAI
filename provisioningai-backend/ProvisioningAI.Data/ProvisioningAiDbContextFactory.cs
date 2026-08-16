using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace ProvisioningAI.Data;

public class ProvisioningAiDbContextFactory : IDesignTimeDbContextFactory<ProvisioningAiDbContext>
{
    public ProvisioningAiDbContext CreateDbContext(string[] args)
    {
        var optionsBuilder = new DbContextOptionsBuilder<ProvisioningAiDbContext>();
        optionsBuilder.UseSqlite("Data Source=provisioning.db;Foreign Keys=True");

        return new ProvisioningAiDbContext(optionsBuilder.Options);
    }
}
