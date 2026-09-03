using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace WebhookCity.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddSlackNotifications : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "SlackNotificationsEnabled",
                table: "Projects",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "SlackWebhookUrl",
                table: "Projects",
                type: "text",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "SlackDeliveries",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    EventId = table.Column<Guid>(type: "uuid", nullable: false),
                    Status = table.Column<string>(type: "text", nullable: false),
                    Attempts = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    NextAttemptAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    SentAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    LastError = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SlackDeliveries", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SlackDeliveries_Events_EventId",
                        column: x => x.EventId,
                        principalTable: "Events",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_SlackDeliveries_EventId",
                table: "SlackDeliveries",
                column: "EventId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_SlackDeliveries_Status_NextAttemptAt",
                table: "SlackDeliveries",
                columns: new[] { "Status", "NextAttemptAt" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "SlackDeliveries");

            migrationBuilder.DropColumn(
                name: "SlackNotificationsEnabled",
                table: "Projects");

            migrationBuilder.DropColumn(
                name: "SlackWebhookUrl",
                table: "Projects");
        }
    }
}
