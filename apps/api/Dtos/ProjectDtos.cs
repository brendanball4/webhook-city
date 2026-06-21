namespace WebhookCity.Api.Dtos;

public record CreateProjectRequest(string Name);

public record ProjectResponse(
    Guid Id,
    string Name,
    string Slug,
    DateTimeOffset CreatedAt,
    int EndpointCount);

public record ProjectDetailResponse(
    Guid Id,
    string Name,
    string Slug,
    DateTimeOffset CreatedAt,
    IReadOnlyList<EndpointResponse> Endpoints);
