using Microsoft.EntityFrameworkCore;
using ProvisioningAI.Data.Models;
using ProvisioningAI.Data.Converters;

namespace ProvisioningAI.Data;

public class ProvisioningAiDbContext : DbContext
{
    public ProvisioningAiDbContext(DbContextOptions<ProvisioningAiDbContext> options)
        : base(options)
    {
    }

    public DbSet<VaultStructure> VaultStructures => Set<VaultStructure>();
    public DbSet<ObjectType> ObjectTypes => Set<ObjectType>();
    public DbSet<Property> Properties => Set<Property>();
    public DbSet<Workflow> Workflows => Set<Workflow>();
    public DbSet<WorkflowState> WorkflowStates => Set<WorkflowState>();
    public DbSet<WorkflowTransition> WorkflowTransitions => Set<WorkflowTransition>();
    public DbSet<IntegrationPoint> IntegrationPoints => Set<IntegrationPoint>();
    public DbSet<MappingTemplate> MappingTemplates => Set<MappingTemplate>();
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();
    public DbSet<DiscoveryScan> DiscoveryScans => Set<DiscoveryScan>();

    // New structural stages
    public DbSet<ValueList> ValueLists => Set<ValueList>();
    public DbSet<ValueListItem> ValueListItems => Set<ValueListItem>();
    public DbSet<Class> Classes => Set<Class>();
    public DbSet<ClassProperty> ClassProperties => Set<ClassProperty>();
    public DbSet<NamedAcl> NamedAcls => Set<NamedAcl>();
    public DbSet<UserAccount> UserAccounts => Set<UserAccount>();
    public DbSet<UserGroup> UserGroups => Set<UserGroup>();
    public DbSet<UserGroupMember> UserGroupMembers => Set<UserGroupMember>();
    public DbSet<NamedValueStorage> NamedValueStorages => Set<NamedValueStorage>();
    public DbSet<View> Views => Set<View>();



    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Primary Keys for entities lacking default 'Id' convention
        modelBuilder.Entity<AuditLog>().HasKey(a => a.AuditId);
        modelBuilder.Entity<DiscoveryScan>().HasKey(d => d.ScanId);
        modelBuilder.Entity<MappingTemplate>().HasKey(m => m.TemplateId);
        
        // NamedValueStorage uses composite key since it lacks a single Guid/Id
        modelBuilder.Entity<NamedValueStorage>()
            .HasKey(n => new { n.VaultGuid, n.Module, n.Key });
        
        modelBuilder.Entity<NamedValueStorage>()
            .Property(nvs => nvs.Classification)
            .HasDefaultValue("unclassified");
        
        modelBuilder.Entity<NamedValueStorage>()
            .HasCheckConstraint("CK_NamedValueStorage_Classification", "Classification IN ('customer', 'static', 'unclassified', 'artifact')");
        
        // Ensure NVS Module and Key are case-sensitive via BINARY collation
        modelBuilder.Entity<NamedValueStorage>().Property(nvs => nvs.Module).UseCollation("BINARY");
        modelBuilder.Entity<NamedValueStorage>().Property(nvs => nvs.Key).UseCollation("BINARY");

        // WorkflowTransition logic identity is MFilesId within a workflow
        modelBuilder.Entity<WorkflowTransition>()
            .HasIndex(t => new { t.VaultGuid, t.WorkflowGuid, t.MFilesId })
            .IsUnique();

        // FK from every entity table to vaults(vault_guid)
        modelBuilder.Entity<ObjectType>().HasOne<VaultStructure>().WithMany().HasForeignKey(e => e.VaultGuid).HasPrincipalKey(v => v.VaultGuid);
        modelBuilder.Entity<Property>().HasOne<VaultStructure>().WithMany().HasForeignKey(e => e.VaultGuid).HasPrincipalKey(v => v.VaultGuid);
        modelBuilder.Entity<Workflow>().HasOne<VaultStructure>().WithMany().HasForeignKey(e => e.VaultGuid).HasPrincipalKey(v => v.VaultGuid);
        modelBuilder.Entity<WorkflowState>().HasOne<VaultStructure>().WithMany().HasForeignKey(e => e.VaultGuid).HasPrincipalKey(v => v.VaultGuid);
        modelBuilder.Entity<WorkflowTransition>().HasOne<VaultStructure>().WithMany().HasForeignKey(e => e.VaultGuid).HasPrincipalKey(v => v.VaultGuid);
        modelBuilder.Entity<IntegrationPoint>().HasOne<VaultStructure>().WithMany().HasForeignKey(e => e.VaultGuid).HasPrincipalKey(v => v.VaultGuid);
        modelBuilder.Entity<MappingTemplate>().HasOne<VaultStructure>().WithMany().HasForeignKey(e => e.VaultGuid).HasPrincipalKey(v => v.VaultGuid);
        modelBuilder.Entity<AuditLog>().HasOne<VaultStructure>().WithMany().HasForeignKey(e => e.VaultGuid).HasPrincipalKey(v => v.VaultGuid);
        modelBuilder.Entity<DiscoveryScan>().HasOne<VaultStructure>().WithMany().HasForeignKey(e => e.VaultGuid).HasPrincipalKey(v => v.VaultGuid);
        
        // New entities Vault FK
        modelBuilder.Entity<ValueList>().HasOne<VaultStructure>().WithMany().HasForeignKey(e => e.VaultGuid).HasPrincipalKey(v => v.VaultGuid);
        modelBuilder.Entity<ValueListItem>().HasOne<VaultStructure>().WithMany().HasForeignKey(e => e.VaultGuid).HasPrincipalKey(v => v.VaultGuid);
        modelBuilder.Entity<Class>().HasOne<VaultStructure>().WithMany().HasForeignKey(e => e.VaultGuid).HasPrincipalKey(v => v.VaultGuid);
        modelBuilder.Entity<ClassProperty>().HasOne<VaultStructure>().WithMany().HasForeignKey(e => e.VaultGuid).HasPrincipalKey(v => v.VaultGuid);
        modelBuilder.Entity<NamedAcl>().HasOne<VaultStructure>().WithMany().HasForeignKey(e => e.VaultGuid).HasPrincipalKey(v => v.VaultGuid);
        modelBuilder.Entity<UserAccount>().HasOne<VaultStructure>().WithMany().HasForeignKey(e => e.VaultGuid).HasPrincipalKey(v => v.VaultGuid);
        modelBuilder.Entity<UserGroup>().HasOne<VaultStructure>().WithMany().HasForeignKey(e => e.VaultGuid).HasPrincipalKey(v => v.VaultGuid);
        modelBuilder.Entity<UserGroupMember>().HasOne<VaultStructure>().WithMany().HasForeignKey(e => e.VaultGuid).HasPrincipalKey(v => v.VaultGuid);
        modelBuilder.Entity<NamedValueStorage>().HasOne<VaultStructure>().WithMany().HasForeignKey(e => e.VaultGuid).HasPrincipalKey(v => v.VaultGuid);
        modelBuilder.Entity<View>().HasOne<VaultStructure>().WithMany().HasForeignKey(e => e.VaultGuid).HasPrincipalKey(v => v.VaultGuid);

        // ValueListItem -> ValueList
        modelBuilder.Entity<ValueListItem>()
            .HasOne<ValueList>().WithMany()
            .HasForeignKey(vli => new { vli.VaultGuid, vli.ValueListGuid })
            .HasPrincipalKey(vl => new { vl.VaultGuid, vl.Guid });

        // Class -> ObjectType
        modelBuilder.Entity<Class>()
            .HasOne<ObjectType>().WithMany()
            .HasForeignKey(c => new { c.VaultGuid, c.ObjectTypeGuid })
            .HasPrincipalKey(ot => new { ot.VaultGuid, ot.Guid });

        // ClassProperty -> Class, ClassProperty -> Property
        modelBuilder.Entity<ClassProperty>()
            .HasOne<Class>().WithMany()
            .HasForeignKey(cp => new { cp.VaultGuid, cp.ClassGuid })
            .HasPrincipalKey(c => new { c.VaultGuid, c.Guid });

        modelBuilder.Entity<ClassProperty>()
            .HasOne<Property>().WithMany()
            .HasForeignKey(cp => new { cp.VaultGuid, cp.PropertyGuid })
            .HasPrincipalKey(p => new { p.VaultGuid, p.Guid });

        // UserGroupMember -> UserGroup, UserGroupMember -> UserAccount
        modelBuilder.Entity<UserGroupMember>()
            .HasOne<UserGroup>().WithMany()
            .HasForeignKey(m => new { m.VaultGuid, m.UserGroupGuid })
            .HasPrincipalKey(g => new { g.VaultGuid, g.Guid });

        modelBuilder.Entity<UserGroupMember>()
            .HasOne<UserAccount>().WithMany()
            .HasForeignKey(m => new { m.VaultGuid, m.MemberUserAccountGuid })
            .HasPrincipalKey(u => new { u.VaultGuid, u.Guid });

        // View -> parent View (self-referencing hierarchy; nullable, no parent for top-level views)
        modelBuilder.Entity<View>()
            .HasOne<View>().WithMany()
            .HasForeignKey(v => new { v.VaultGuid, v.ParentViewGuid })
            .HasPrincipalKey(v => new { v.VaultGuid, v.Guid })
            .OnDelete(DeleteBehavior.Restrict);

        // Workflow Hierarchy FKs
        modelBuilder.Entity<WorkflowState>()
            .HasOne<Workflow>().WithMany()
            .HasForeignKey(ws => new { ws.VaultGuid, ws.WorkflowGuid })
            .HasPrincipalKey(w => new { w.VaultGuid, w.Guid });

        modelBuilder.Entity<WorkflowTransition>()
            .HasOne<Workflow>().WithMany()
            .HasForeignKey(wt => new { wt.VaultGuid, wt.WorkflowGuid })
            .HasPrincipalKey(w => new { w.VaultGuid, w.Guid });

        modelBuilder.Entity<WorkflowTransition>()
            .HasOne<WorkflowState>().WithMany()
            .HasForeignKey(wt => new { wt.VaultGuid, wt.FromStateGuid })
            .HasPrincipalKey(ws => new { ws.VaultGuid, ws.Guid });

        modelBuilder.Entity<WorkflowTransition>()
            .HasOne<WorkflowState>().WithMany()
            .HasForeignKey(wt => new { wt.VaultGuid, wt.ToStateGuid })
            .HasPrincipalKey(ws => new { ws.VaultGuid, ws.Guid });

        // Enforce NON-EMPTY GUID AT THE DB via CHECK constraints and set Canonical format
        // Also map LastSeenScanId to all entities that have it
        var canonicalGuidConverter = new CanonicalGuidConverter();
        foreach (var entityType in modelBuilder.Model.GetEntityTypes())
        {
            var tableName = entityType.GetTableName();
            if (tableName != null)
            {
                // Map LastSeenScanId if the property exists
                if (entityType.ClrType.GetProperty("LastSeenScanId") != null)
                {
                    modelBuilder.Entity(entityType.ClrType)
                        .HasOne(typeof(DiscoveryScan))
                        .WithMany()
                        .HasForeignKey("LastSeenScanId")
                        .OnDelete(DeleteBehavior.SetNull);
                        
                    modelBuilder.Entity(entityType.ClrType)
                        .HasIndex("LastSeenScanId");
                }

                foreach (var property in entityType.GetProperties())
                {
                    if (property.Name.EndsWith("Guid") && property.ClrType == typeof(string))
                    {
                        // 1. Enforce uppercase braces via EF Core value conversion on save/read
                        property.SetValueConverter(canonicalGuidConverter);

                        // 2. Add CHECK constraint on DB column
                        var columnName = property.GetColumnName();
                        entityType.AddCheckConstraint(
                            $"CK_{tableName}_{columnName}_Format",
                            $"length(\"{columnName}\") = 38 AND \"{columnName}\" LIKE '{{%}}'"
                        );
                    }
                }
            }
        }
    }
}
