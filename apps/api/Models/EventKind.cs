namespace WebhookCity.Api.Models;

/// <summary>
/// Distinguishes a received webhook from a piped application log line.
/// An event inherits its kind from the endpoint it arrived through.
/// </summary>
public enum EventKind
{
    /// <summary>A webhook delivered by an external service.</summary>
    Webhook,

    /// <summary>A log line piped in from one of your own services.</summary>
    Log,
}
