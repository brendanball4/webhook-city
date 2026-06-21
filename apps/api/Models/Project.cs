namespace WebhookCity.Api.Models;

/// <summary>
/// A workspace that owns webhook endpoints and their event logs.
/// </summary>
public class Project
{
    public Guid Id { get; set; }

    public required string Name { get; set; }

    /// <summary>URL-safe identifier used in the public ingest URL.</summary>
    public required string Slug { get; set; }

    public DateTimeOffset CreatedAt { get; set; }

    public ICollection<Endpoint> Endpoints { get; set; } = new List<Endpoint>();
    public ICollection<Event> Events { get; set; } = new List<Event>();
}
