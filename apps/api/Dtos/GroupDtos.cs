namespace WebhookCity.Api.Dtos;

public record CreateGroupRequest(string Name, string? Color);

public record UpdateGroupRequest(string Name, string? Color);

public record GroupResponse(
    Guid Id,
    string Name,
    string Slug,
    string? Color,
    DateTimeOffset CreatedAt,
    int ProjectCount);
