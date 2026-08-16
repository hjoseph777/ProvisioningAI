using System.Linq;
using Microsoft.EntityFrameworkCore;
using ProvisioningAI.Data.Models;

namespace ProvisioningAI.Data.Repositories;

public class WorkflowTransitionRepository : GenericRepository<WorkflowTransition>
{
    public WorkflowTransitionRepository(ProvisioningAiDbContext context) : base(context)
    {
    }

    protected override IQueryable<WorkflowTransition> MatchEntity(IQueryable<WorkflowTransition> query, WorkflowTransition incoming)
    {
        return query.Where(e => 
            e.VaultGuid == incoming.VaultGuid && 
            e.WorkflowGuid == incoming.WorkflowGuid && 
            e.MFilesId == incoming.MFilesId);
    }
}
