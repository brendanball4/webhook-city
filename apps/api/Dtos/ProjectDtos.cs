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
    /// <summary>Caller's relationship to this project: Owner | Editor | Viewer.</summary>
    string Role,
    DateTimeOffset CreatedAt,
    int EndpointCount);

public record ProjectDetailResponse(
    Guid Id,
    string Name,
    string Slug,
    ProjectCapability Capability,
    Guid? GroupId,
    string Role,
    DateTimeOffset CreatedAt,
    IReadOnlyList<EndpointResponse> Endpoints);

/// <summary>A person a project has been shared with.</summary>
public record ProjectMemberResponse(
    Guid UserId,
    string Email,
    string? DisplayName,
    string Role,
    DateTimeOffset CreatedAt);

public record ShareProjectRequest(string Email, ProjectRole Role);

public record UpdateMemberRoleRequest(ProjectRole Role);
