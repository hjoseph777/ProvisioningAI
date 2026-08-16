using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ProvisioningAI.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddClassProperty : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddUniqueConstraint(
                name: "AK_Properties_VaultGuid_Guid",
                table: "Properties",
                columns: new[] { "VaultGuid", "Guid" });

            migrationBuilder.AddUniqueConstraint(
                name: "AK_Classes_VaultGuid_Guid",
                table: "Classes",
                columns: new[] { "VaultGuid", "Guid" });

            migrationBuilder.CreateTable(
                name: "ClassProperties",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    VaultGuid = table.Column<string>(type: "TEXT", nullable: false),
                    ClassGuid = table.Column<string>(type: "TEXT", nullable: false),
                    PropertyGuid = table.Column<string>(type: "TEXT", nullable: false),
                    IsRequired = table.Column<bool>(type: "INTEGER", nullable: false),
                    LastSeenScanId = table.Column<int>(type: "INTEGER", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ClassProperties", x => x.Id);
                    table.CheckConstraint("CK_ClassProperties_ClassGuid_Format", "length(\"ClassGuid\") = 38 AND \"ClassGuid\" LIKE '{%}'");
                    table.CheckConstraint("CK_ClassProperties_PropertyGuid_Format", "length(\"PropertyGuid\") = 38 AND \"PropertyGuid\" LIKE '{%}'");
                    table.CheckConstraint("CK_ClassProperties_VaultGuid_Format", "length(\"VaultGuid\") = 38 AND \"VaultGuid\" LIKE '{%}'");
                    table.ForeignKey(
                        name: "FK_ClassProperties_Classes_VaultGuid_ClassGuid",
                        columns: x => new { x.VaultGuid, x.ClassGuid },
                        principalTable: "Classes",
                        principalColumns: new[] { "VaultGuid", "Guid" },
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ClassProperties_DiscoveryScans_LastSeenScanId",
                        column: x => x.LastSeenScanId,
                        principalTable: "DiscoveryScans",
                        principalColumn: "ScanId",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_ClassProperties_Properties_VaultGuid_PropertyGuid",
                        columns: x => new { x.VaultGuid, x.PropertyGuid },
                        principalTable: "Properties",
                        principalColumns: new[] { "VaultGuid", "Guid" },
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ClassProperties_VaultStructures_VaultGuid",
                        column: x => x.VaultGuid,
                        principalTable: "VaultStructures",
                        principalColumn: "VaultGuid",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ClassProperties_LastSeenScanId",
                table: "ClassProperties",
                column: "LastSeenScanId");

            migrationBuilder.CreateIndex(
                name: "IX_ClassProperties_VaultGuid_ClassGuid_PropertyGuid",
                table: "ClassProperties",
                columns: new[] { "VaultGuid", "ClassGuid", "PropertyGuid" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ClassProperties_VaultGuid_PropertyGuid",
                table: "ClassProperties",
                columns: new[] { "VaultGuid", "PropertyGuid" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ClassProperties");

            migrationBuilder.DropUniqueConstraint(
                name: "AK_Properties_VaultGuid_Guid",
                table: "Properties");

            migrationBuilder.DropUniqueConstraint(
                name: "AK_Classes_VaultGuid_Guid",
                table: "Classes");
        }
    }
}
