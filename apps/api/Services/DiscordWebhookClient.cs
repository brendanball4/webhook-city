using System.Net.Http.Json;
using WebhookCity.Api.Models;

namespace WebhookCity.Api.Services;

public sealed class DiscordWebhookClient(HttpClient httpClient) : IChatWebhookClient
{
    // Discord embed colours are decimal ints.
    private const int Green = 0x2ECC71;
    private const int Red = 0xE74C3C;
    private const int Amber = 0xF1C40F;
    private const int Grey = 0x95A5A6;

    private static readonly string[] AllowedHosts =
    {
        "discord.com", "discordapp.com", "ptb.discord.com", "canary.discord.com",
    };

    public IntegrationProvider Provider => IntegrationProvider.Discord;

    public bool IsValidWebhookUrl(string? value, out Uri? uri)
    {
        uri = null;
        if (!Uri.TryCreate(value, UriKind.Absolute, out var candidate) ||
            candidate.Scheme != Uri.UriSchemeHttps ||
            !AllowedHosts.Contains(candidate.Host) ||
            !candidate.AbsolutePath.StartsWith("/api/webhooks/", StringComparison.Ordinal))
        {
            return false;
        }

        uri = candidate;
        return true;
    }

    public async Task<SendResult> SendAsync(
        string webhookUrl,
        EventNotification notification,
        CancellationToken cancellationToken = default)
    {
        if (!IsValidWebhookUrl(webhookUrl, out var uri))
            return new(false, false, "Invalid Discord webhook URL.");

        var payload = new
        {
            embeds = new[]
            {
                new
                {
                    title = Truncate(notification.ProjectName, 256),
                    description = Truncate(notification.Summary, 4096),
                    color = ColorFor(notification.Status),
                    footer = new { text = Truncate(notification.Source, 2048) },
                    timestamp = DateTimeOffset.UtcNow.ToString("o"),
                },
            },
        };

        using var response = await httpClient.PostAsJsonAsync(uri, payload, cancellationToken);

        if (response.IsSuccessStatusCode)
            return new(true, false, null);

        var responseText = await response.Content.ReadAsStringAsync(cancellationToken);
        // Discord rate-limits aggressively per-webhook; 429 is worth retrying.
        var retryable = (int)response.StatusCode == 429 || (int)response.StatusCode >= 500;
        var error = $"Discord returned {(int)response.StatusCode}: {responseText}";
        return new(false, retryable, error[..Math.Min(error.Length, 500)]);
    }

    private static int ColorFor(string? status) => status switch
    {
        "success" => Green,
        "error" => Red,
        "pending" => Amber,
        _ => Grey,
    };

    private static string Truncate(string value, int max) =>
        value.Length <= max ? value : value[..max];
}
