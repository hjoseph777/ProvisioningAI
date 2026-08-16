using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;

namespace ProvisioningAI.Data.Repositories;

public class GenericRepository<TEntity> : IRepository<TEntity> where TEntity : class
{
    protected readonly ProvisioningAiDbContext _context;

    public GenericRepository(ProvisioningAiDbContext context)
    {
        _context = context;
    }

    protected virtual object[] GetIdentityKeys(TEntity entity)
    {
        var vaultGuid = _context.Entry(entity).Property("VaultGuid").CurrentValue;
        var guid = _context.Entry(entity).Property("Guid").CurrentValue;
        return new[] { vaultGuid, guid };
    }

    protected virtual IQueryable<TEntity> MatchEntity(IQueryable<TEntity> query, TEntity incoming)
    {
        var vaultGuid = (string)_context.Entry(incoming).Property("VaultGuid").CurrentValue!;
        var guid = (string)_context.Entry(incoming).Property("Guid").CurrentValue!;
        return query.Where(e => EF.Property<string>(e, "VaultGuid") == vaultGuid && EF.Property<string>(e, "Guid") == guid);
    }

    protected virtual void ApplyUpdate(TEntity existing, TEntity incoming, int currentScanId)
    {
        var incomingValues = _context.Entry(incoming).CurrentValues.Clone();
        
        // Don't copy the EF Core Primary Key (Id)
        var pkProperty = _context.Entry(existing).Metadata.FindPrimaryKey()?.Properties.FirstOrDefault();
        if (pkProperty != null)
        {
            incomingValues[pkProperty.Name] = _context.Entry(existing).Property(pkProperty.Name).CurrentValue;
        }

        _context.Entry(existing).CurrentValues.SetValues(incomingValues);
        if (_context.Entry(existing).Metadata.FindProperty("LastSeenScanId") != null)
        {
            _context.Entry(existing).Property("LastSeenScanId").CurrentValue = currentScanId;
        }
    }

    public virtual async Task UpsertAsync(TEntity entity, int currentScanId)
    {
        var entry = _context.Entry(entity);
        if (entry.Metadata.FindProperty("LastSeenScanId") != null)
        {
            entry.Property("LastSeenScanId").CurrentValue = currentScanId;
        }

        var existing = await MatchEntity(_context.Set<TEntity>(), entity).FirstOrDefaultAsync();

        if (existing != null)
        {
            ApplyUpdate(existing, entity, currentScanId);
        }
        else
        {
            _context.Set<TEntity>().Add(entity);
        }

        await _context.SaveChangesAsync();
    }

    public virtual async Task UpsertManyAsync(IEnumerable<TEntity> entities, int currentScanId)
    {
        // Batch operations with transaction
        using var transaction = await _context.Database.BeginTransactionAsync();
        await UpsertManyNoTransactionAsync(entities, currentScanId);
        await transaction.CommitAsync();
    }

    public virtual async Task UpsertManyNoTransactionAsync(IEnumerable<TEntity> entities, int currentScanId)
    {
        foreach (var entity in entities)
        {
            var entry = _context.Entry(entity);
            if (entry.Metadata.FindProperty("LastSeenScanId") != null)
            {
                entry.Property("LastSeenScanId").CurrentValue = currentScanId;
            }

            var existing = await MatchEntity(_context.Set<TEntity>(), entity).FirstOrDefaultAsync();

            if (existing != null)
            {
                ApplyUpdate(existing, entity, currentScanId);
            }
            else
            {
                _context.Set<TEntity>().Add(entity);
            }
        }

        await _context.SaveChangesAsync();
    }

    public virtual async Task<IReadOnlyList<TEntity>> GetAllForVaultAsync(string vaultGuid)
    {
        return await _context.Set<TEntity>()
            .Where(e => EF.Property<string>(e, "VaultGuid") == vaultGuid)
            .ToListAsync();
    }

    public virtual async Task DeleteUnseenAsync(string vaultGuid, int currentScanId)
    {
        var entityType = _context.Model.FindEntityType(typeof(TEntity));
        if (entityType?.FindProperty("LastSeenScanId") != null)
        {
            await _context.Set<TEntity>()
                .Where(e => EF.Property<string>(e, "VaultGuid") == vaultGuid 
                            && EF.Property<int?>(e, "LastSeenScanId") != currentScanId)
                .ExecuteDeleteAsync();
        }
    }
}
