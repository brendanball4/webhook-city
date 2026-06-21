using WebhookCity.Api.Models;

namespace WebhookCity.Api.Dtos;

public record CreateEndpointRequest(string Source, string? Slug, EventKind? Kind);

public record EndpointResponse(
    Guid Id,
    string Slug,
    string Source,
    EventKind Kind,
    string SecretToken,
    DateTimeOffset CreatedAt,
    string IngestPath);
