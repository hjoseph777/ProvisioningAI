using System.Linq;
using Microsoft.EntityFrameworkCore;
using ProvisioningAI.Data.Models;

namespace ProvisioningAI.Data.Repositories;

public class ClassPropertyRepository : GenericRepository<ClassProperty>
{
    public ClassPropertyRepository(ProvisioningAiDbContext context) : base(context)
    {
    }

    protected override IQueryable<ClassProperty> MatchEntity(IQueryable<ClassProperty> query, ClassProperty incoming)
    {
        return query.Where(e =>
            e.VaultGuid == incoming.VaultGuid &&
            e.ClassGuid == incoming.ClassGuid &&
            e.PropertyGuid == incoming.PropertyGuid);
    }
}
