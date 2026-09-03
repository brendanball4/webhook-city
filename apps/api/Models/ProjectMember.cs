namespace WebhookCity.Api.Models;

/// <summary>What a shared-with user may do on a project. The owner is implicit
/// via <see cref="Project.OwnerId"/> and always outranks these.</summary>
public enum ProjectRole
{
    /// <summary>Read events, health and endpoints. Never sees ingest secrets.</summary>
    Viewer,

    /// <summary>Manage endpoints and see ingest secrets. Cannot delete or re-share the project.</summary>
    Editor,
}

/// <summary>Grants a user access to a project they do not own.</summary>
public class ProjectMember
{
    public Guid ProjectId { get; set; }
    public Project? Project { get; set; }

    public Guid UserId { get; set; }
    public User? User { get; set; }

    public ProjectRole Role { get; set; }

    public DateTimeOffset CreatedAt { get; set; }
}
