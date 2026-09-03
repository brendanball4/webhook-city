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

    /// <summary>What this project collects: webhooks, logs, or both.</summary>
    public ProjectCapability Capability { get; set; } = ProjectCapability.Both;

    /// <summary>Optional group this project belongs to (null = ungrouped).</summary>
    public Guid? GroupId { get; set; }
    public Group? Group { get; set; }

    public DateTimeOffset CreatedAt { get; set; }

    /// <summary>Project-specific Slack Incoming Webhook URL. Never expose in API responses.</summary>
    public string? SlackWebhookUrl { get; set; }

    public bool SlackNotificationsEnabled { get; set; }

    public ICollection<Endpoint> Endpoints { get; set; } = new List<Endpoint>();
    public ICollection<Event> Events { get; set; } = new List<Event>();
}
