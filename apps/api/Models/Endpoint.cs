namespace WebhookCity.Api.Models;

/// <summary>
/// A unique ingest URL within a project. External services POST events here.
/// </summary>
public class Endpoint
{
    public Guid Id { get; set; }

    public Guid ProjectId { get; set; }
    public Project? Project { get; set; }

    /// <summary>URL-safe identifier; combined with the project slug to form the ingest URL.</summary>
    public required string Slug { get; set; }

    /// <summary>Origin service, e.g. netlify | circleci | github | custom.</summary>
    public required string Source { get; set; }

    /// <summary>Shared secret used to validate inbound POSTs.</summary>
    public required string SecretToken { get; set; }

    public DateTimeOffset CreatedAt { get; set; }

    public ICollection<Event> Events { get; set; } = new List<Event>();
}
