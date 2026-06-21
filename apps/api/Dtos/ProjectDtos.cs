using WebhookCity.Api.Models;

namespace WebhookCity.Api.Dtos;

public record CreateProjectRequest(string Name, ProjectCapability Capability = ProjectCapability.Both);

public record ProjectResponse(
    Guid Id,
    string Name,
    string Slug,
    ProjectCapability Capability,
    DateTimeOffset CreatedAt,
    int EndpointCount);

public record ProjectDetailResponse(
    Guid Id,
    string Name,
    string Slug,
    ProjectCapability Capability,
    DateTimeOffset CreatedAt,
    IReadOnlyList<EndpointResponse> Endpoints);
