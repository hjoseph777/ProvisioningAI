using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ProvisioningAI.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddViewHierarchyAndSearchConditions : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsCommon",
                table: "Views",
                type: "INTEGER",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "ParentViewGuid",
                table: "Views",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SearchConditionsExported",
                table: "Views",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddUniqueConstraint(
                name: "AK_Views_VaultGuid_Guid",
                table: "Views",
                columns: new[] { "VaultGuid", "Guid" });

            migrationBuilder.CreateIndex(
                name: "IX_Views_VaultGuid_ParentViewGuid",
                table: "Views",
                columns: new[] { "VaultGuid", "ParentViewGuid" });

            migrationBuilder.AddCheckConstraint(
                name: "CK_Views_ParentViewGuid_Format",
                table: "Views",
                sql: "length(\"ParentViewGuid\") = 38 AND \"ParentViewGuid\" LIKE '{%}'");

            migrationBuilder.AddForeignKey(
                name: "FK_Views_Views_VaultGuid_ParentViewGuid",
                table: "Views",
                columns: new[] { "VaultGuid", "ParentViewGuid" },
                principalTable: "Views",
                principalColumns: new[] { "VaultGuid", "Guid" },
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Views_Views_VaultGuid_ParentViewGuid",
                table: "Views");

            migrationBuilder.DropUniqueConstraint(
                name: "AK_Views_VaultGuid_Guid",
                table: "Views");

            migrationBuilder.DropIndex(
                name: "IX_Views_VaultGuid_ParentViewGuid",
                table: "Views");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Views_ParentViewGuid_Format",
                table: "Views");

            migrationBuilder.DropColumn(
                name: "IsCommon",
                table: "Views");

            migrationBuilder.DropColumn(
                name: "ParentViewGuid",
                table: "Views");

            migrationBuilder.DropColumn(
                name: "SearchConditionsExported",
                table: "Views");
        }
    }
}
