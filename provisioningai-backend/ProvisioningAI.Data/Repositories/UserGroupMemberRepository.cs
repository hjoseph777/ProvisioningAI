using System.Linq;
using Microsoft.EntityFrameworkCore;
using ProvisioningAI.Data.Models;

namespace ProvisioningAI.Data.Repositories;

public class UserGroupMemberRepository : GenericRepository<UserGroupMember>
{
    public UserGroupMemberRepository(ProvisioningAiDbContext context) : base(context)
    {
    }

    protected override IQueryable<UserGroupMember> MatchEntity(IQueryable<UserGroupMember> query, UserGroupMember incoming)
    {
        return query.Where(e =>
            e.VaultGuid == incoming.VaultGuid &&
            e.UserGroupGuid == incoming.UserGroupGuid &&
            e.MemberUserAccountGuid == incoming.MemberUserAccountGuid);
    }
}
