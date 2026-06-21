namespace WebhookCity.Api.Dtos;

public record CreateEndpointRequest(string Source, string? Slug);

public record EndpointResponse(
    Guid Id,
    string Slug,
    string Source,
    string SecretToken,
    DateTimeOffset CreatedAt,
    string IngestPath);
