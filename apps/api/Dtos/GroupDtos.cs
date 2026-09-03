namespace WebhookCity.Api.Dtos;

public record CreateGroupRequest(string Name, string? Color, Guid? ParentId = null);

public record UpdateGroupRequest(string Name, string? Color, Guid? ParentId = null);

public record GroupResponse(
    Guid Id,
    string Name,
    string Slug,
    string? Color,
    Guid? ParentId,
    DateTimeOffset CreatedAt,
    int ProjectCount);
