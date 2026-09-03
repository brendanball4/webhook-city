namespace WebhookCity.Api.Models;

/// <summary>An account that owns projects and can be invited to others'.</summary>
public class User
{
    public Guid Id { get; set; }

    /// <summary>Stored lowercase so lookups and uniqueness are case-insensitive.</summary>
    public required string Email { get; set; }

    /// <summary>PBKDF2 hash produced by <see cref="Microsoft.AspNetCore.Identity.PasswordHasher{T}"/>.</summary>
    public required string PasswordHash { get; set; }

    public string? DisplayName { get; set; }

    public DateTimeOffset CreatedAt { get; set; }

    public ICollection<Project> OwnedProjects { get; set; } = new List<Project>();
    public ICollection<Group> OwnedGroups { get; set; } = new List<Group>();
    public ICollection<ProjectMember> Memberships { get; set; } = new List<ProjectMember>();
}
