namespace WebhookCity.Api.Models;

/// <summary>Chat platform an integration delivers to.</summary>
public enum IntegrationProvider
{
    Slack,
    Discord,
}

/// <summary>
/// A configured outbound destination for a project's events, e.g. a Slack or
/// Discord incoming webhook. A project may have several.
/// </summary>
public class Integration
{
    public Guid Id { get; set; }

    public Guid ProjectId { get; set; }
    public Project? Project { get; set; }

    public IntegrationProvider Provider { get; set; }

    /// <summary>Human label, e.g. "Deploys channel".</summary>
    public required string Name { get; set; }

    /// <summary>
    /// Incoming webhook URL. This is a credential — never return it in an API
    /// response; expose only whether one is configured.
    /// </summary>
    public required string WebhookUrl { get; set; }

    public bool Enabled { get; set; } = true;

    public DateTimeOffset CreatedAt { get; set; }

    /// <summary>
    /// Endpoints this integration listens to. An EMPTY collection means
    /// "every endpoint in the project" rather than "none".
    /// </summary>
    public ICollection<IntegrationEndpoint> Endpoints { get; set; } = new List<IntegrationEndpoint>();
}

/// <summary>Scopes an integration to a specific endpoint.</summary>
public class IntegrationEndpoint
{
    public Guid IntegrationId { get; set; }
    public Integration? Integration { get; set; }

    public Guid EndpointId { get; set; }
    public Endpoint? Endpoint { get; set; }
}
