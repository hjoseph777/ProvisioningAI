using System;
using System.Linq;
using ProvisioningAI.Data.Models;

namespace ProvisioningAI.Data.Repositories;

public class NamedValueStorageRepository : GenericRepository<NamedValueStorage>
{
    public NamedValueStorageRepository(ProvisioningAiDbContext context) : base(context)
    {
    }

    protected override IQueryable<NamedValueStorage> MatchEntity(IQueryable<NamedValueStorage> query, NamedValueStorage incoming)
    {
        return query.Where(e => 
            e.VaultGuid == incoming.VaultGuid && 
            e.Module == incoming.Module && 
            e.Key == incoming.Key);
    }

    protected override void ApplyUpdate(NamedValueStorage existing, NamedValueStorage incoming, int currentScanId)
    {
        // Preserve Classification.
        // If Value changes on a 'static' row, signal it by setting ValueChangedAt.
        if (existing.Classification == "static" && existing.Value != incoming.Value)
        {
            incoming.ValueChangedAt = DateTime.UtcNow;
        }
        else
        {
            // Preserve the original ValueChangedAt if it didn't just change, or keep it null.
            incoming.ValueChangedAt = existing.ValueChangedAt;
        }

        // Force incoming Classification to match existing so SetValues doesn't overwrite it
        incoming = incoming with { Classification = existing.Classification };

        base.ApplyUpdate(existing, incoming, currentScanId);
    }
}
