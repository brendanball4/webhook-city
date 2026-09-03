using System.Net.Http.Json;

namespace WebhookCity.Api.Services;

public sealed class SlackWebhookClient(HttpClient httpClient)
{
    public static bool IsValidWebhookUrl(string? value, out Uri? uri)
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

    public async Task<SlackSendResult> SendAsync(
        string webhookUrl,
        string message,
        CancellationToken cancellationToken = default)
    {
        if (!IsValidWebhookUrl(webhookUrl, out var uri))
            return new(false, false, "Invalid Slack Incoming Webhook URL.");

        using var response = await httpClient.PostAsJsonAsync(
            uri,
            new { text = message },
            cancellationToken);

        if (response.IsSuccessStatusCode)
            return new(true, false, null);

        var responseText = await response.Content.ReadAsStringAsync(cancellationToken);
        var retryable = (int)response.StatusCode == 429 || (int)response.StatusCode >= 500;
        var error = $"Slack returned {(int)response.StatusCode}: {responseText}";
        return new(false, retryable, error[..Math.Min(error.Length, 500)]);
    }
}

public record SlackSendResult(bool Success, bool Retryable, string? Error);
