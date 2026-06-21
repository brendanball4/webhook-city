using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace WebhookCity.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddProjectCapability : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Capability",
                table: "Projects",
                type: "text",
                nullable: false,
                // Backfill pre-existing projects (created before this column) as "Both".
                defaultValue: "Both");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Capability",
                table: "Projects");
        }
    }
}
