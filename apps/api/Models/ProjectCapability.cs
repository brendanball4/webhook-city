namespace WebhookCity.Api.Models;

/// <summary>
/// What a project is set up to collect. Chosen at creation time.
/// </summary>
public enum ProjectCapability
{
    /// <summary>Receive webhook events at public ingest endpoints.</summary>
    Webhooks,

    /// <summary>Store logs piped in from your own services.</summary>
    Logs,

    /// <summary>Both webhooks and log storage.</summary>
    Both,
}
