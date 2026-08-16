using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ProvisioningAI.Data.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "VaultStructures",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    VaultGuid = table.Column<string>(type: "TEXT", nullable: false),
                    VaultName = table.Column<string>(type: "TEXT", nullable: false),
                    LastScannedAt = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_VaultStructures", x => x.Id);
                    table.UniqueConstraint("AK_VaultStructures_VaultGuid", x => x.VaultGuid);
                    table.CheckConstraint("CK_VaultStructures_VaultGuid_Format", "length(\"VaultGuid\") = 38 AND \"VaultGuid\" LIKE '{%}'");
                });

            migrationBuilder.CreateTable(
                name: "AuditLogs",
                columns: table => new
                {
                    AuditId = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    VaultGuid = table.Column<string>(type: "TEXT", nullable: false),
                    VaultName = table.Column<string>(type: "TEXT", nullable: false),
                    Timestamp = table.Column<DateTime>(type: "TEXT", nullable: false),
                    User = table.Column<string>(type: "TEXT", nullable: false),
                    Action = table.Column<string>(type: "TEXT", nullable: false),
                    ResourceType = table.Column<string>(type: "TEXT", nullable: true),
                    ResourceId = table.Column<string>(type: "TEXT", nullable: true),
                    DetailsJson = table.Column<string>(type: "TEXT", nullable: true),
                    Severity = table.Column<string>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AuditLogs", x => x.AuditId);
                    table.CheckConstraint("CK_AuditLogs_VaultGuid_Format", "length(\"VaultGuid\") = 38 AND \"VaultGuid\" LIKE '{%}'");
                    table.ForeignKey(
                        name: "FK_AuditLogs_VaultStructures_VaultGuid",
                        column: x => x.VaultGuid,
                        principalTable: "VaultStructures",
                        principalColumn: "VaultGuid",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "DiscoveryScans",
                columns: table => new
                {
                    ScanId = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    VaultGuid = table.Column<string>(type: "TEXT", nullable: false),
                    VaultName = table.Column<string>(type: "TEXT", nullable: false),
                    StartedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    CompletedAt = table.Column<DateTime>(type: "TEXT", nullable: true),
                    ObjectsFound = table.Column<int>(type: "INTEGER", nullable: false),
                    IntegrationsFound = table.Column<int>(type: "INTEGER", nullable: false),
                    ConflictsDetectedJson = table.Column<string>(type: "TEXT", nullable: true),
                    Status = table.Column<string>(type: "TEXT", nullable: false),
                    ScanDurationMs = table.Column<long>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DiscoveryScans", x => x.ScanId);
                    table.CheckConstraint("CK_DiscoveryScans_VaultGuid_Format", "length(\"VaultGuid\") = 38 AND \"VaultGuid\" LIKE '{%}'");
                    table.ForeignKey(
                        name: "FK_DiscoveryScans_VaultStructures_VaultGuid",
                        column: x => x.VaultGuid,
                        principalTable: "VaultStructures",
                        principalColumn: "VaultGuid",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "MappingTemplates",
                columns: table => new
                {
                    TemplateId = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    VaultGuid = table.Column<string>(type: "TEXT", nullable: false),
                    VaultName = table.Column<string>(type: "TEXT", nullable: false),
                    GeneratedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    IntegrationPointsJson = table.Column<string>(type: "TEXT", nullable: false),
                    Version = table.Column<int>(type: "INTEGER", nullable: false),
                    Status = table.Column<string>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MappingTemplates", x => x.TemplateId);
                    table.CheckConstraint("CK_MappingTemplates_VaultGuid_Format", "length(\"VaultGuid\") = 38 AND \"VaultGuid\" LIKE '{%}'");
                    table.ForeignKey(
                        name: "FK_MappingTemplates_VaultStructures_VaultGuid",
                        column: x => x.VaultGuid,
                        principalTable: "VaultStructures",
                        principalColumn: "VaultGuid",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "IntegrationPoints",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    VaultGuid = table.Column<string>(type: "TEXT", nullable: false),
                    Guid = table.Column<string>(type: "TEXT", nullable: false),
                    Name = table.Column<string>(type: "TEXT", nullable: false),
                    Type = table.Column<string>(type: "TEXT", nullable: false),
                    CurrentValue = table.Column<string>(type: "TEXT", nullable: true),
                    LocationJson = table.Column<string>(type: "TEXT", nullable: false),
                    DataType = table.Column<string>(type: "TEXT", nullable: true),
                    IsRewireable = table.Column<bool>(type: "INTEGER", nullable: false),
                    LastSeenScanId = table.Column<int>(type: "INTEGER", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_IntegrationPoints", x => x.Id);
                    table.CheckConstraint("CK_IntegrationPoints_Guid_Format", "length(\"Guid\") = 38 AND \"Guid\" LIKE '{%}'");
                    table.CheckConstraint("CK_IntegrationPoints_VaultGuid_Format", "length(\"VaultGuid\") = 38 AND \"VaultGuid\" LIKE '{%}'");
                    table.ForeignKey(
                        name: "FK_IntegrationPoints_DiscoveryScans_LastSeenScanId",
                        column: x => x.LastSeenScanId,
                        principalTable: "DiscoveryScans",
                        principalColumn: "ScanId",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_IntegrationPoints_VaultStructures_VaultGuid",
                        column: x => x.VaultGuid,
                        principalTable: "VaultStructures",
                        principalColumn: "VaultGuid",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "NamedAcls",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    VaultGuid = table.Column<string>(type: "TEXT", nullable: false),
                    Guid = table.Column<string>(type: "TEXT", nullable: false),
                    MFilesId = table.Column<int>(type: "INTEGER", nullable: false),
                    Name = table.Column<string>(type: "TEXT", nullable: false),
                    AclDefinitionJson = table.Column<string>(type: "TEXT", nullable: true),
                    LastSeenScanId = table.Column<int>(type: "INTEGER", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NamedAcls", x => x.Id);
                    table.CheckConstraint("CK_NamedAcls_Guid_Format", "length(\"Guid\") = 38 AND \"Guid\" LIKE '{%}'");
                    table.CheckConstraint("CK_NamedAcls_VaultGuid_Format", "length(\"VaultGuid\") = 38 AND \"VaultGuid\" LIKE '{%}'");
                    table.ForeignKey(
                        name: "FK_NamedAcls_DiscoveryScans_LastSeenScanId",
                        column: x => x.LastSeenScanId,
                        principalTable: "DiscoveryScans",
                        principalColumn: "ScanId",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_NamedAcls_VaultStructures_VaultGuid",
                        column: x => x.VaultGuid,
                        principalTable: "VaultStructures",
                        principalColumn: "VaultGuid",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "NamedValueStorages",
                columns: table => new
                {
                    VaultGuid = table.Column<string>(type: "TEXT", nullable: false),
                    Module = table.Column<string>(type: "TEXT", nullable: false, collation: "BINARY"),
                    Key = table.Column<string>(type: "TEXT", nullable: false, collation: "BINARY"),
                    Value = table.Column<string>(type: "TEXT", nullable: false),
                    Classification = table.Column<string>(type: "TEXT", nullable: false, defaultValue: "unclassified"),
                    LastSeenScanId = table.Column<int>(type: "INTEGER", nullable: true),
                    ValueChangedAt = table.Column<DateTime>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NamedValueStorages", x => new { x.VaultGuid, x.Module, x.Key });
                    table.CheckConstraint("CK_NamedValueStorage_Classification", "Classification IN ('customer', 'static', 'unclassified', 'artifact')");
                    table.CheckConstraint("CK_NamedValueStorages_VaultGuid_Format", "length(\"VaultGuid\") = 38 AND \"VaultGuid\" LIKE '{%}'");
                    table.ForeignKey(
                        name: "FK_NamedValueStorages_DiscoveryScans_LastSeenScanId",
                        column: x => x.LastSeenScanId,
                        principalTable: "DiscoveryScans",
                        principalColumn: "ScanId",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_NamedValueStorages_VaultStructures_VaultGuid",
                        column: x => x.VaultGuid,
                        principalTable: "VaultStructures",
                        principalColumn: "VaultGuid",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ObjectTypes",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    VaultGuid = table.Column<string>(type: "TEXT", nullable: false),
                    Guid = table.Column<string>(type: "TEXT", nullable: false),
                    MFilesId = table.Column<int>(type: "INTEGER", nullable: false),
                    Name = table.Column<string>(type: "TEXT", nullable: false),
                    DisplayName = table.Column<string>(type: "TEXT", nullable: true),
                    RealObjectType = table.Column<bool>(type: "INTEGER", nullable: false),
                    LastSeenScanId = table.Column<int>(type: "INTEGER", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ObjectTypes", x => x.Id);
                    table.UniqueConstraint("AK_ObjectTypes_VaultGuid_Guid", x => new { x.VaultGuid, x.Guid });
                    table.CheckConstraint("CK_ObjectTypes_Guid_Format", "length(\"Guid\") = 38 AND \"Guid\" LIKE '{%}'");
                    table.CheckConstraint("CK_ObjectTypes_VaultGuid_Format", "length(\"VaultGuid\") = 38 AND \"VaultGuid\" LIKE '{%}'");
                    table.ForeignKey(
                        name: "FK_ObjectTypes_DiscoveryScans_LastSeenScanId",
                        column: x => x.LastSeenScanId,
                        principalTable: "DiscoveryScans",
                        principalColumn: "ScanId",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_ObjectTypes_VaultStructures_VaultGuid",
                        column: x => x.VaultGuid,
                        principalTable: "VaultStructures",
                        principalColumn: "VaultGuid",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Properties",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    VaultGuid = table.Column<string>(type: "TEXT", nullable: false),
                    Guid = table.Column<string>(type: "TEXT", nullable: false),
                    MFilesId = table.Column<int>(type: "INTEGER", nullable: false),
                    Name = table.Column<string>(type: "TEXT", nullable: false),
                    DataType = table.Column<int>(type: "INTEGER", nullable: false),
                    IsRequired = table.Column<bool>(type: "INTEGER", nullable: false),
                    LastSeenScanId = table.Column<int>(type: "INTEGER", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Properties", x => x.Id);
                    table.CheckConstraint("CK_Properties_Guid_Format", "length(\"Guid\") = 38 AND \"Guid\" LIKE '{%}'");
                    table.CheckConstraint("CK_Properties_VaultGuid_Format", "length(\"VaultGuid\") = 38 AND \"VaultGuid\" LIKE '{%}'");
                    table.ForeignKey(
                        name: "FK_Properties_DiscoveryScans_LastSeenScanId",
                        column: x => x.LastSeenScanId,
                        principalTable: "DiscoveryScans",
                        principalColumn: "ScanId",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_Properties_VaultStructures_VaultGuid",
                        column: x => x.VaultGuid,
                        principalTable: "VaultStructures",
                        principalColumn: "VaultGuid",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "UserGroups",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    VaultGuid = table.Column<string>(type: "TEXT", nullable: false),
                    Guid = table.Column<string>(type: "TEXT", nullable: false),
                    MFilesId = table.Column<int>(type: "INTEGER", nullable: false),
                    Name = table.Column<string>(type: "TEXT", nullable: false),
                    IsPredefined = table.Column<bool>(type: "INTEGER", nullable: false),
                    LastSeenScanId = table.Column<int>(type: "INTEGER", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UserGroups", x => x.Id);
                    table.CheckConstraint("CK_UserGroups_Guid_Format", "length(\"Guid\") = 38 AND \"Guid\" LIKE '{%}'");
                    table.CheckConstraint("CK_UserGroups_VaultGuid_Format", "length(\"VaultGuid\") = 38 AND \"VaultGuid\" LIKE '{%}'");
                    table.ForeignKey(
                        name: "FK_UserGroups_DiscoveryScans_LastSeenScanId",
                        column: x => x.LastSeenScanId,
                        principalTable: "DiscoveryScans",
                        principalColumn: "ScanId",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_UserGroups_VaultStructures_VaultGuid",
                        column: x => x.VaultGuid,
                        principalTable: "VaultStructures",
                        principalColumn: "VaultGuid",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ValueLists",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    VaultGuid = table.Column<string>(type: "TEXT", nullable: false),
                    Guid = table.Column<string>(type: "TEXT", nullable: false),
                    MFilesId = table.Column<int>(type: "INTEGER", nullable: false),
                    Name = table.Column<string>(type: "TEXT", nullable: false),
                    LastSeenScanId = table.Column<int>(type: "INTEGER", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ValueLists", x => x.Id);
                    table.UniqueConstraint("AK_ValueLists_VaultGuid_Guid", x => new { x.VaultGuid, x.Guid });
                    table.CheckConstraint("CK_ValueLists_Guid_Format", "length(\"Guid\") = 38 AND \"Guid\" LIKE '{%}'");
                    table.CheckConstraint("CK_ValueLists_VaultGuid_Format", "length(\"VaultGuid\") = 38 AND \"VaultGuid\" LIKE '{%}'");
                    table.ForeignKey(
                        name: "FK_ValueLists_DiscoveryScans_LastSeenScanId",
                        column: x => x.LastSeenScanId,
                        principalTable: "DiscoveryScans",
                        principalColumn: "ScanId",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_ValueLists_VaultStructures_VaultGuid",
                        column: x => x.VaultGuid,
                        principalTable: "VaultStructures",
                        principalColumn: "VaultGuid",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Views",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    VaultGuid = table.Column<string>(type: "TEXT", nullable: false),
                    Guid = table.Column<string>(type: "TEXT", nullable: false),
                    MFilesId = table.Column<int>(type: "INTEGER", nullable: false),
                    Name = table.Column<string>(type: "TEXT", nullable: false),
                    LastSeenScanId = table.Column<int>(type: "INTEGER", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Views", x => x.Id);
                    table.CheckConstraint("CK_Views_Guid_Format", "length(\"Guid\") = 38 AND \"Guid\" LIKE '{%}'");
                    table.CheckConstraint("CK_Views_VaultGuid_Format", "length(\"VaultGuid\") = 38 AND \"VaultGuid\" LIKE '{%}'");
                    table.ForeignKey(
                        name: "FK_Views_DiscoveryScans_LastSeenScanId",
                        column: x => x.LastSeenScanId,
                        principalTable: "DiscoveryScans",
                        principalColumn: "ScanId",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_Views_VaultStructures_VaultGuid",
                        column: x => x.VaultGuid,
                        principalTable: "VaultStructures",
                        principalColumn: "VaultGuid",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Workflows",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    VaultGuid = table.Column<string>(type: "TEXT", nullable: false),
                    Guid = table.Column<string>(type: "TEXT", nullable: false),
                    MFilesId = table.Column<int>(type: "INTEGER", nullable: false),
                    Name = table.Column<string>(type: "TEXT", nullable: false),
                    Description = table.Column<string>(type: "TEXT", nullable: true),
                    LastSeenScanId = table.Column<int>(type: "INTEGER", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Workflows", x => x.Id);
                    table.UniqueConstraint("AK_Workflows_VaultGuid_Guid", x => new { x.VaultGuid, x.Guid });
                    table.CheckConstraint("CK_Workflows_Guid_Format", "length(\"Guid\") = 38 AND \"Guid\" LIKE '{%}'");
                    table.CheckConstraint("CK_Workflows_VaultGuid_Format", "length(\"VaultGuid\") = 38 AND \"VaultGuid\" LIKE '{%}'");
                    table.ForeignKey(
                        name: "FK_Workflows_DiscoveryScans_LastSeenScanId",
                        column: x => x.LastSeenScanId,
                        principalTable: "DiscoveryScans",
                        principalColumn: "ScanId",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_Workflows_VaultStructures_VaultGuid",
                        column: x => x.VaultGuid,
                        principalTable: "VaultStructures",
                        principalColumn: "VaultGuid",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Classes",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    VaultGuid = table.Column<string>(type: "TEXT", nullable: false),
                    Guid = table.Column<string>(type: "TEXT", nullable: false),
                    MFilesId = table.Column<int>(type: "INTEGER", nullable: false),
                    Name = table.Column<string>(type: "TEXT", nullable: false),
                    ObjectTypeGuid = table.Column<string>(type: "TEXT", nullable: false),
                    LastSeenScanId = table.Column<int>(type: "INTEGER", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Classes", x => x.Id);
                    table.CheckConstraint("CK_Classes_Guid_Format", "length(\"Guid\") = 38 AND \"Guid\" LIKE '{%}'");
                    table.CheckConstraint("CK_Classes_ObjectTypeGuid_Format", "length(\"ObjectTypeGuid\") = 38 AND \"ObjectTypeGuid\" LIKE '{%}'");
                    table.CheckConstraint("CK_Classes_VaultGuid_Format", "length(\"VaultGuid\") = 38 AND \"VaultGuid\" LIKE '{%}'");
                    table.ForeignKey(
                        name: "FK_Classes_DiscoveryScans_LastSeenScanId",
                        column: x => x.LastSeenScanId,
                        principalTable: "DiscoveryScans",
                        principalColumn: "ScanId",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_Classes_ObjectTypes_VaultGuid_ObjectTypeGuid",
                        columns: x => new { x.VaultGuid, x.ObjectTypeGuid },
                        principalTable: "ObjectTypes",
                        principalColumns: new[] { "VaultGuid", "Guid" },
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_Classes_VaultStructures_VaultGuid",
                        column: x => x.VaultGuid,
                        principalTable: "VaultStructures",
                        principalColumn: "VaultGuid",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ValueListItems",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    VaultGuid = table.Column<string>(type: "TEXT", nullable: false),
                    Guid = table.Column<string>(type: "TEXT", nullable: false),
                    MFilesId = table.Column<int>(type: "INTEGER", nullable: false),
                    ValueListGuid = table.Column<string>(type: "TEXT", nullable: false),
                    Name = table.Column<string>(type: "TEXT", nullable: false),
                    IsDeleted = table.Column<bool>(type: "INTEGER", nullable: false),
                    LastSeenScanId = table.Column<int>(type: "INTEGER", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ValueListItems", x => x.Id);
                    table.CheckConstraint("CK_ValueListItems_Guid_Format", "length(\"Guid\") = 38 AND \"Guid\" LIKE '{%}'");
                    table.CheckConstraint("CK_ValueListItems_ValueListGuid_Format", "length(\"ValueListGuid\") = 38 AND \"ValueListGuid\" LIKE '{%}'");
                    table.CheckConstraint("CK_ValueListItems_VaultGuid_Format", "length(\"VaultGuid\") = 38 AND \"VaultGuid\" LIKE '{%}'");
                    table.ForeignKey(
                        name: "FK_ValueListItems_DiscoveryScans_LastSeenScanId",
                        column: x => x.LastSeenScanId,
                        principalTable: "DiscoveryScans",
                        principalColumn: "ScanId",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_ValueListItems_ValueLists_VaultGuid_ValueListGuid",
                        columns: x => new { x.VaultGuid, x.ValueListGuid },
                        principalTable: "ValueLists",
                        principalColumns: new[] { "VaultGuid", "Guid" },
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ValueListItems_VaultStructures_VaultGuid",
                        column: x => x.VaultGuid,
                        principalTable: "VaultStructures",
                        principalColumn: "VaultGuid",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "WorkflowStates",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    VaultGuid = table.Column<string>(type: "TEXT", nullable: false),
                    Guid = table.Column<string>(type: "TEXT", nullable: false),
                    MFilesId = table.Column<int>(type: "INTEGER", nullable: false),
                    WorkflowGuid = table.Column<string>(type: "TEXT", nullable: false),
                    Name = table.Column<string>(type: "TEXT", nullable: false),
                    IsInitial = table.Column<bool>(type: "INTEGER", nullable: false),
                    IsFinal = table.Column<bool>(type: "INTEGER", nullable: false),
                    LastSeenScanId = table.Column<int>(type: "INTEGER", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_WorkflowStates", x => x.Id);
                    table.UniqueConstraint("AK_WorkflowStates_VaultGuid_Guid", x => new { x.VaultGuid, x.Guid });
                    table.CheckConstraint("CK_WorkflowStates_Guid_Format", "length(\"Guid\") = 38 AND \"Guid\" LIKE '{%}'");
                    table.CheckConstraint("CK_WorkflowStates_VaultGuid_Format", "length(\"VaultGuid\") = 38 AND \"VaultGuid\" LIKE '{%}'");
                    table.CheckConstraint("CK_WorkflowStates_WorkflowGuid_Format", "length(\"WorkflowGuid\") = 38 AND \"WorkflowGuid\" LIKE '{%}'");
                    table.ForeignKey(
                        name: "FK_WorkflowStates_DiscoveryScans_LastSeenScanId",
                        column: x => x.LastSeenScanId,
                        principalTable: "DiscoveryScans",
                        principalColumn: "ScanId",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_WorkflowStates_VaultStructures_VaultGuid",
                        column: x => x.VaultGuid,
                        principalTable: "VaultStructures",
                        principalColumn: "VaultGuid",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_WorkflowStates_Workflows_VaultGuid_WorkflowGuid",
                        columns: x => new { x.VaultGuid, x.WorkflowGuid },
                        principalTable: "Workflows",
                        principalColumns: new[] { "VaultGuid", "Guid" },
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "WorkflowTransitions",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    VaultGuid = table.Column<string>(type: "TEXT", nullable: false),
                    WorkflowGuid = table.Column<string>(type: "TEXT", nullable: false),
                    MFilesId = table.Column<int>(type: "INTEGER", nullable: false),
                    FromStateGuid = table.Column<string>(type: "TEXT", nullable: false),
                    ToStateGuid = table.Column<string>(type: "TEXT", nullable: false),
                    GuardConditions = table.Column<string>(type: "TEXT", nullable: true),
                    Actions = table.Column<string>(type: "TEXT", nullable: true),
                    LastSeenScanId = table.Column<int>(type: "INTEGER", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_WorkflowTransitions", x => x.Id);
                    table.CheckConstraint("CK_WorkflowTransitions_FromStateGuid_Format", "length(\"FromStateGuid\") = 38 AND \"FromStateGuid\" LIKE '{%}'");
                    table.CheckConstraint("CK_WorkflowTransitions_ToStateGuid_Format", "length(\"ToStateGuid\") = 38 AND \"ToStateGuid\" LIKE '{%}'");
                    table.CheckConstraint("CK_WorkflowTransitions_VaultGuid_Format", "length(\"VaultGuid\") = 38 AND \"VaultGuid\" LIKE '{%}'");
                    table.CheckConstraint("CK_WorkflowTransitions_WorkflowGuid_Format", "length(\"WorkflowGuid\") = 38 AND \"WorkflowGuid\" LIKE '{%}'");
                    table.ForeignKey(
                        name: "FK_WorkflowTransitions_DiscoveryScans_LastSeenScanId",
                        column: x => x.LastSeenScanId,
                        principalTable: "DiscoveryScans",
                        principalColumn: "ScanId",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_WorkflowTransitions_VaultStructures_VaultGuid",
                        column: x => x.VaultGuid,
                        principalTable: "VaultStructures",
                        principalColumn: "VaultGuid",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_WorkflowTransitions_WorkflowStates_VaultGuid_FromStateGuid",
                        columns: x => new { x.VaultGuid, x.FromStateGuid },
                        principalTable: "WorkflowStates",
                        principalColumns: new[] { "VaultGuid", "Guid" },
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_WorkflowTransitions_WorkflowStates_VaultGuid_ToStateGuid",
                        columns: x => new { x.VaultGuid, x.ToStateGuid },
                        principalTable: "WorkflowStates",
                        principalColumns: new[] { "VaultGuid", "Guid" },
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_WorkflowTransitions_Workflows_VaultGuid_WorkflowGuid",
                        columns: x => new { x.VaultGuid, x.WorkflowGuid },
                        principalTable: "Workflows",
                        principalColumns: new[] { "VaultGuid", "Guid" },
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_AuditLogs_VaultGuid",
                table: "AuditLogs",
                column: "VaultGuid");

            migrationBuilder.CreateIndex(
                name: "IX_Classes_LastSeenScanId",
                table: "Classes",
                column: "LastSeenScanId");

            migrationBuilder.CreateIndex(
                name: "IX_Classes_VaultGuid_Guid",
                table: "Classes",
                columns: new[] { "VaultGuid", "Guid" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Classes_VaultGuid_ObjectTypeGuid",
                table: "Classes",
                columns: new[] { "VaultGuid", "ObjectTypeGuid" });

            migrationBuilder.CreateIndex(
                name: "IX_DiscoveryScans_VaultGuid",
                table: "DiscoveryScans",
                column: "VaultGuid");

            migrationBuilder.CreateIndex(
                name: "IX_IntegrationPoints_LastSeenScanId",
                table: "IntegrationPoints",
                column: "LastSeenScanId");

            migrationBuilder.CreateIndex(
                name: "IX_IntegrationPoints_VaultGuid_Guid",
                table: "IntegrationPoints",
                columns: new[] { "VaultGuid", "Guid" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_MappingTemplates_VaultGuid",
                table: "MappingTemplates",
                column: "VaultGuid");

            migrationBuilder.CreateIndex(
                name: "IX_NamedAcls_LastSeenScanId",
                table: "NamedAcls",
                column: "LastSeenScanId");

            migrationBuilder.CreateIndex(
                name: "IX_NamedAcls_VaultGuid_Guid",
                table: "NamedAcls",
                columns: new[] { "VaultGuid", "Guid" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_NamedValueStorages_LastSeenScanId",
                table: "NamedValueStorages",
                column: "LastSeenScanId");

            migrationBuilder.CreateIndex(
                name: "IX_ObjectTypes_LastSeenScanId",
                table: "ObjectTypes",
                column: "LastSeenScanId");

            migrationBuilder.CreateIndex(
                name: "IX_ObjectTypes_VaultGuid_Guid",
                table: "ObjectTypes",
                columns: new[] { "VaultGuid", "Guid" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Properties_LastSeenScanId",
                table: "Properties",
                column: "LastSeenScanId");

            migrationBuilder.CreateIndex(
                name: "IX_Properties_VaultGuid_Guid",
                table: "Properties",
                columns: new[] { "VaultGuid", "Guid" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_UserGroups_LastSeenScanId",
                table: "UserGroups",
                column: "LastSeenScanId");

            migrationBuilder.CreateIndex(
                name: "IX_UserGroups_VaultGuid_Guid",
                table: "UserGroups",
                columns: new[] { "VaultGuid", "Guid" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ValueListItems_LastSeenScanId",
                table: "ValueListItems",
                column: "LastSeenScanId");

            migrationBuilder.CreateIndex(
                name: "IX_ValueListItems_VaultGuid_Guid",
                table: "ValueListItems",
                columns: new[] { "VaultGuid", "Guid" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ValueListItems_VaultGuid_ValueListGuid",
                table: "ValueListItems",
                columns: new[] { "VaultGuid", "ValueListGuid" });

            migrationBuilder.CreateIndex(
                name: "IX_ValueLists_LastSeenScanId",
                table: "ValueLists",
                column: "LastSeenScanId");

            migrationBuilder.CreateIndex(
                name: "IX_ValueLists_VaultGuid_Guid",
                table: "ValueLists",
                columns: new[] { "VaultGuid", "Guid" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_VaultStructures_VaultGuid",
                table: "VaultStructures",
                column: "VaultGuid",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Views_LastSeenScanId",
                table: "Views",
                column: "LastSeenScanId");

            migrationBuilder.CreateIndex(
                name: "IX_Views_VaultGuid_Guid",
                table: "Views",
                columns: new[] { "VaultGuid", "Guid" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Workflows_LastSeenScanId",
                table: "Workflows",
                column: "LastSeenScanId");

            migrationBuilder.CreateIndex(
                name: "IX_Workflows_VaultGuid_Guid",
                table: "Workflows",
                columns: new[] { "VaultGuid", "Guid" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_WorkflowStates_LastSeenScanId",
                table: "WorkflowStates",
                column: "LastSeenScanId");

            migrationBuilder.CreateIndex(
                name: "IX_WorkflowStates_VaultGuid_Guid",
                table: "WorkflowStates",
                columns: new[] { "VaultGuid", "Guid" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_WorkflowStates_VaultGuid_WorkflowGuid",
                table: "WorkflowStates",
                columns: new[] { "VaultGuid", "WorkflowGuid" });

            migrationBuilder.CreateIndex(
                name: "IX_WorkflowTransitions_LastSeenScanId",
                table: "WorkflowTransitions",
                column: "LastSeenScanId");

            migrationBuilder.CreateIndex(
                name: "IX_WorkflowTransitions_VaultGuid_FromStateGuid",
                table: "WorkflowTransitions",
                columns: new[] { "VaultGuid", "FromStateGuid" });

            migrationBuilder.CreateIndex(
                name: "IX_WorkflowTransitions_VaultGuid_ToStateGuid",
                table: "WorkflowTransitions",
                columns: new[] { "VaultGuid", "ToStateGuid" });

            migrationBuilder.CreateIndex(
                name: "IX_WorkflowTransitions_VaultGuid_WorkflowGuid_MFilesId",
                table: "WorkflowTransitions",
                columns: new[] { "VaultGuid", "WorkflowGuid", "MFilesId" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AuditLogs");

            migrationBuilder.DropTable(
                name: "Classes");

            migrationBuilder.DropTable(
                name: "IntegrationPoints");

            migrationBuilder.DropTable(
                name: "MappingTemplates");

            migrationBuilder.DropTable(
                name: "NamedAcls");

            migrationBuilder.DropTable(
                name: "NamedValueStorages");

            migrationBuilder.DropTable(
                name: "Properties");

            migrationBuilder.DropTable(
                name: "UserGroups");

            migrationBuilder.DropTable(
                name: "ValueListItems");

            migrationBuilder.DropTable(
                name: "Views");

            migrationBuilder.DropTable(
                name: "WorkflowTransitions");

            migrationBuilder.DropTable(
                name: "ObjectTypes");

            migrationBuilder.DropTable(
                name: "ValueLists");

            migrationBuilder.DropTable(
                name: "WorkflowStates");

            migrationBuilder.DropTable(
                name: "Workflows");

            migrationBuilder.DropTable(
                name: "DiscoveryScans");

            migrationBuilder.DropTable(
                name: "VaultStructures");
        }
    }
}
