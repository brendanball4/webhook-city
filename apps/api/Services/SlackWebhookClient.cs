using System.Net.Http.Json;
using WebhookCity.Api.Models;

namespace WebhookCity.Api.Services;

public sealed class SlackWebhookClient(HttpClient httpClient) : IChatWebhookClient
{
    public IntegrationProvider Provider => IntegrationProvider.Slack;

    public bool IsValidWebhookUrl(string? value, out Uri? uri)
    {
        uri = null;
        if (!Uri.TryCreate(value, UriKind.Absolute, out var candidate) ||
            candidate.Scheme != Uri.UriSchemeHttps ||
            (candidate.Host != "hooks.slack.com" && candidate.Host != "hooks.slack-gov.com") ||
            !candidate.AbsolutePath.StartsWith("/services/", StringComparison.Ordinal))
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
            return new(false, false, "Invalid Slack Incoming Webhook URL.");

        using var response = await httpClient.PostAsJsonAsync(
            uri,
            new { text = Render(notification) },
            cancellationToken);

        if (response.IsSuccessStatusCode)
            return new(true, false, null);

        var responseText = await response.Content.ReadAsStringAsync(cancellationToken);
        var retryable = (int)response.StatusCode == 429 || (int)response.StatusCode >= 500;
        var error = $"Slack returned {(int)response.StatusCode}: {responseText}";
        return new(false, retryable, error[..Math.Min(error.Length, 500)]);
    }

    /// <summary>Slack mrkdwn: single asterisks for bold, and &amp;/&lt;/&gt; must be escaped.</summary>
    private static string Render(EventNotification notification) =>
        $"*{Escape(notification.ProjectName)}* — {Escape(notification.Summary)}";

    private static string Escape(string value) => value
        .Replace("&", "&amp;", StringComparison.Ordinal)
        .Replace("<", "&lt;", StringComparison.Ordinal)
        .Replace(">", "&gt;", StringComparison.Ordinal);
}
