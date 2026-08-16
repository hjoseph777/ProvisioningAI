using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ProvisioningAI.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddWorkflowStateGuardAndActions : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Actions",
                table: "WorkflowStates",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "GuardConditions",
                table: "WorkflowStates",
                type: "TEXT",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Actions",
                table: "WorkflowStates");

            migrationBuilder.DropColumn(
                name: "GuardConditions",
                table: "WorkflowStates");
        }
    }
}
