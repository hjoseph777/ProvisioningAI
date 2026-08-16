using System.Collections.Generic;
using System.Threading.Tasks;

namespace ProvisioningAI.Data.Repositories;

public interface IRepository<TEntity> where TEntity : class
{
    Task UpsertAsync(TEntity entity, int currentScanId);
    Task UpsertManyAsync(IEnumerable<TEntity> entities, int currentScanId);

    /// <summary>
    /// Same upsert loop as UpsertManyAsync, but opens no transaction of its own —
    /// for callers who need multiple entity types committed as one atomic unit
    /// and must wrap them in a single outer transaction themselves.
    /// </summary>
    Task UpsertManyNoTransactionAsync(IEnumerable<TEntity> entities, int currentScanId);

    Task<IReadOnlyList<TEntity>> GetAllForVaultAsync(string vaultGuid);
    Task DeleteUnseenAsync(string vaultGuid, int currentScanId);
}
