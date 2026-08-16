using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ProvisioningAI.Data.Migrations
{
    /// <inheritdoc />
    public partial class DropPropertyIsRequired : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "IsRequired",
                table: "Properties");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsRequired",
                table: "Properties",
                type: "INTEGER",
                nullable: false,
                defaultValue: false);
        }
    }
}
