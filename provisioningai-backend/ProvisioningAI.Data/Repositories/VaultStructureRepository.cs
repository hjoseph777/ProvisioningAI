using Microsoft.EntityFrameworkCore;
using ProvisioningAI.Data.Models;

namespace ProvisioningAI.Data.Repositories;

/// <summary>
/// VaultStructure is a special case: it IS the vault's own identity row, not an
/// entity scoped to a vault. Its natural key is VaultGuid alone, not (VaultGuid, Guid).
/// The generic repository's (VaultGuid, Guid) match doesn't apply here.
/// </summary>
public sealed class VaultStructureRepository
{
    private readonly ProvisioningAiDbContext _context;

    public VaultStructureRepository(ProvisioningAiDbContext context)
    {
        _context = context;
    }

    /// <summary>
    /// Returns the existing row for this vault GUID, or null if not yet indexed.
    /// </summary>
    public Task<VaultStructure?> FindByGuidAsync(string vaultGuid, CancellationToken ct = default)
        => _context.VaultStructures.FirstOrDefaultAsync(v => v.VaultGuid == vaultGuid, ct);

    /// <summary>
    /// Returns the first row whose VaultName matches (case-insensitive), or null.
    /// Used by the §4.6 foot-gun check: GUID changed but name still matches.
    /// </summary>
    public Task<VaultStructure?> FindByNameAsync(string vaultName, CancellationToken ct = default)
        => _context.VaultStructures.FirstOrDefaultAsync(
            v => v.VaultName.ToLower() == vaultName.ToLower(), ct);

    /// <summary>
    /// Upserts the vault identity row. Updates VaultName and LastScannedAt if the
    /// row already exists (name is a mutable display label; refresh every scan).
    /// </summary>
    public async Task UpsertAsync(VaultStructure incoming, CancellationToken ct = default)
    {
        var existing = await FindByGuidAsync(incoming.VaultGuid, ct);

        if (existing is not null)
        {
            // Refresh mutable display label and scan timestamp in place.
            _context.Entry(existing).CurrentValues.SetValues(new
            {
                incoming.VaultName,
                incoming.LastScannedAt
            });
        }
        else
        {
            _context.VaultStructures.Add(incoming);
        }

        await _context.SaveChangesAsync(ct);
    }

    public Task<List<VaultStructure>> GetAllAsync(CancellationToken ct = default)
        => _context.VaultStructures.ToListAsync(ct);
}
