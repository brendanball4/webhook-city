using WebhookCity.Api.Models;

namespace WebhookCity.Api.Dtos;

public record CreateEndpointRequest(string Source, string? Slug, EventKind? Kind);

public record EndpointResponse(
    Guid Id,
    string Slug,
    string Source,
    EventKind Kind,
    /// <summary>Null for Viewers — only owners and editors receive the ingest secret.</summary>
    string? SecretToken,
    DateTimeOffset CreatedAt,
    string IngestPath);
