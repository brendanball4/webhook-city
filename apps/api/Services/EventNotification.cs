namespace WebhookCity.Api.Services;

/// <summary>
/// A provider-neutral description of something worth announcing. Each provider
/// renders this into its own markup, so payload interpretation lives in exactly
/// one place rather than being forked per chat platform.
/// </summary>
/// <param name="Summary">
/// Plain text. May contain backtick code spans (understood by both Slack and
/// Discord) but no bold/link markup and no provider-specific escaping.
/// </param>
public sealed record EventNotification(
    string ProjectName,
    string Source,
    string? Status,
    string Summary);
