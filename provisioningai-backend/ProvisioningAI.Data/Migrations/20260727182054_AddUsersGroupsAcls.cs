using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ProvisioningAI.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddUsersGroupsAcls : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "NamedAclType",
                table: "NamedAcls",
                type: "INTEGER",
                nullable: true);

            migrationBuilder.AddUniqueConstraint(
                name: "AK_UserGroups_VaultGuid_Guid",
                table: "UserGroups",
                columns: new[] { "VaultGuid", "Guid" });

            migrationBuilder.CreateTable(
                name: "UserAccounts",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    VaultGuid = table.Column<string>(type: "TEXT", nullable: false),
                    Guid = table.Column<string>(type: "TEXT", nullable: false),
                    MFilesId = table.Column<int>(type: "INTEGER", nullable: false),
                    LoginName = table.Column<string>(type: "TEXT", nullable: false),
                    VaultRoles = table.Column<int>(type: "INTEGER", nullable: false),
                    InternalUser = table.Column<bool>(type: "INTEGER", nullable: false),
                    Enabled = table.Column<bool>(type: "INTEGER", nullable: false),
                    LastSeenScanId = table.Column<int>(type: "INTEGER", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UserAccounts", x => x.Id);
                    table.UniqueConstraint("AK_UserAccounts_VaultGuid_Guid", x => new { x.VaultGuid, x.Guid });
                    table.CheckConstraint("CK_UserAccounts_Guid_Format", "length(\"Guid\") = 38 AND \"Guid\" LIKE '{%}'");
                    table.CheckConstraint("CK_UserAccounts_VaultGuid_Format", "length(\"VaultGuid\") = 38 AND \"VaultGuid\" LIKE '{%}'");
                    table.ForeignKey(
                        name: "FK_UserAccounts_DiscoveryScans_LastSeenScanId",
                        column: x => x.LastSeenScanId,
                        principalTable: "DiscoveryScans",
                        principalColumn: "ScanId",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_UserAccounts_VaultStructures_VaultGuid",
                        column: x => x.VaultGuid,
                        principalTable: "VaultStructures",
                        principalColumn: "VaultGuid",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "UserGroupMembers",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    VaultGuid = table.Column<string>(type: "TEXT", nullable: false),
                    UserGroupGuid = table.Column<string>(type: "TEXT", nullable: false),
                    MemberUserAccountGuid = table.Column<string>(type: "TEXT", nullable: false),
                    LastSeenScanId = table.Column<int>(type: "INTEGER", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UserGroupMembers", x => x.Id);
                    table.CheckConstraint("CK_UserGroupMembers_MemberUserAccountGuid_Format", "length(\"MemberUserAccountGuid\") = 38 AND \"MemberUserAccountGuid\" LIKE '{%}'");
                    table.CheckConstraint("CK_UserGroupMembers_UserGroupGuid_Format", "length(\"UserGroupGuid\") = 38 AND \"UserGroupGuid\" LIKE '{%}'");
                    table.CheckConstraint("CK_UserGroupMembers_VaultGuid_Format", "length(\"VaultGuid\") = 38 AND \"VaultGuid\" LIKE '{%}'");
                    table.ForeignKey(
                        name: "FK_UserGroupMembers_DiscoveryScans_LastSeenScanId",
                        column: x => x.LastSeenScanId,
                        principalTable: "DiscoveryScans",
                        principalColumn: "ScanId",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_UserGroupMembers_UserAccounts_VaultGuid_MemberUserAccountGuid",
                        columns: x => new { x.VaultGuid, x.MemberUserAccountGuid },
                        principalTable: "UserAccounts",
                        principalColumns: new[] { "VaultGuid", "Guid" },
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_UserGroupMembers_UserGroups_VaultGuid_UserGroupGuid",
                        columns: x => new { x.VaultGuid, x.UserGroupGuid },
                        principalTable: "UserGroups",
                        principalColumns: new[] { "VaultGuid", "Guid" },
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_UserGroupMembers_VaultStructures_VaultGuid",
                        column: x => x.VaultGuid,
                        principalTable: "VaultStructures",
                        principalColumn: "VaultGuid",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_UserAccounts_LastSeenScanId",
                table: "UserAccounts",
                column: "LastSeenScanId");

            migrationBuilder.CreateIndex(
                name: "IX_UserAccounts_VaultGuid_Guid",
                table: "UserAccounts",
                columns: new[] { "VaultGuid", "Guid" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_UserGroupMembers_LastSeenScanId",
                table: "UserGroupMembers",
                column: "LastSeenScanId");

            migrationBuilder.CreateIndex(
                name: "IX_UserGroupMembers_VaultGuid_MemberUserAccountGuid",
                table: "UserGroupMembers",
                columns: new[] { "VaultGuid", "MemberUserAccountGuid" });

            migrationBuilder.CreateIndex(
                name: "IX_UserGroupMembers_VaultGuid_UserGroupGuid_MemberUserAccountGuid",
                table: "UserGroupMembers",
                columns: new[] { "VaultGuid", "UserGroupGuid", "MemberUserAccountGuid" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "UserGroupMembers");

            migrationBuilder.DropTable(
                name: "UserAccounts");

            migrationBuilder.DropUniqueConstraint(
                name: "AK_UserGroups_VaultGuid_Guid",
                table: "UserGroups");

            migrationBuilder.DropColumn(
                name: "NamedAclType",
                table: "NamedAcls");
        }
    }
}
