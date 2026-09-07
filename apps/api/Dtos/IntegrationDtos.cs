using WebhookCity.Api.Models;

namespace WebhookCity.Api.Dtos;

/// <summary>
/// Note the absence of WebhookUrl: it is a credential and is never returned.
/// Callers only learn that one is configured.
/// </summary>
public record IntegrationResponse(
    Guid Id,
    IntegrationProvider Provider,
    string Name,
    bool Enabled,
    DateTimeOffset CreatedAt,
    /// <summary>Empty means the integration listens to every endpoint.</summary>
    IReadOnlyList<Guid> EndpointIds);

public record CreateIntegrationRequest(
    IntegrationProvider Provider,
    string Name,
    string WebhookUrl,
    List<Guid>? EndpointIds);

/// <summary>WebhookUrl is optional — omit it to keep the stored one.</summary>
public record UpdateIntegrationRequest(
    string Name,
    bool Enabled,
    string? WebhookUrl,
    List<Guid>? EndpointIds);
