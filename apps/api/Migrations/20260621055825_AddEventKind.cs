using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace WebhookCity.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddEventKind : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Kind",
                table: "Events",
                type: "text",
                nullable: false,
                // Existing events predate the webhook/log split — backfill as Webhook.
                defaultValue: "Webhook");

            migrationBuilder.AddColumn<string>(
                name: "Kind",
                table: "Endpoints",
                type: "text",
                nullable: false,
                // Existing endpoints predate the split — backfill as Webhook.
                defaultValue: "Webhook");

            migrationBuilder.CreateIndex(
                name: "IX_Events_ProjectId_Kind_ReceivedAt",
                table: "Events",
                columns: new[] { "ProjectId", "Kind", "ReceivedAt" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Events_ProjectId_Kind_ReceivedAt",
                table: "Events");

            migrationBuilder.DropColumn(
                name: "Kind",
                table: "Events");

            migrationBuilder.DropColumn(
                name: "Kind",
                table: "Endpoints");
        }
    }
}
