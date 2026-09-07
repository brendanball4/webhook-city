namespace WebhookCity.Api.Models;

/// <summary>
/// A durable outbound delivery queued after its source event is stored.
/// Provider-agnostic: the target is resolved through <see cref="Integration"/>.
/// </summary>
public class IntegrationDelivery
{
    public Guid Id { get; set; }

    public Guid EventId { get; set; }
    public Event? Event { get; set; }

    public Guid IntegrationId { get; set; }
    public Integration? Integration { get; set; }

    /// <summary>pending | sent | failed</summary>
    public required string Status { get; set; }

    public int Attempts { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset NextAttemptAt { get; set; }
    public DateTimeOffset? SentAt { get; set; }
    public string? LastError { get; set; }
}
