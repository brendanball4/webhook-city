using WebhookCity.Api.Models;

namespace WebhookCity.Api.Services;

public record SendResult(bool Success, bool Retryable, string? Error);

/// <summary>
/// One chat platform Webhook City can relay to. Adding a provider means adding
/// an implementation and registering it — nothing else in the pipeline changes.
/// </summary>
public interface IChatWebhookClient
{
    IntegrationProvider Provider { get; }

    /// <summary>Guards against pasting an arbitrary URL that would then be POSTed to.</summary>
    bool IsValidWebhookUrl(string? value, out Uri? uri);

    Task<SendResult> SendAsync(
        string webhookUrl,
        EventNotification notification,
        CancellationToken cancellationToken = default);
}

/// <summary>Finds the client for a given provider.</summary>
public sealed class ChatWebhookClientResolver(IEnumerable<IChatWebhookClient> clients)
{
    public IChatWebhookClient? For(IntegrationProvider provider) =>
        clients.FirstOrDefault(client => client.Provider == provider);
}
