using WebhookCity.Api.Models;

namespace WebhookCity.Api.Dtos;

public record CreateProjectRequest(
    string Name,
    ProjectCapability Capability = ProjectCapability.Both,
    Guid? GroupId = null);

/// <summary>Move a project to a group, or to ungrouped (null).</summary>
public record UpdateProjectGroupRequest(Guid? GroupId);

public record ProjectResponse(
    Guid Id,
    string Name,
    string Slug,
    ProjectCapability Capability,
    Guid? GroupId,
    DateTimeOffset CreatedAt,
    int EndpointCount);

public record ProjectDetailResponse(
    Guid Id,
    string Name,
    string Slug,
    ProjectCapability Capability,
    Guid? GroupId,
    DateTimeOffset CreatedAt,
    IReadOnlyList<EndpointResponse> Endpoints);
