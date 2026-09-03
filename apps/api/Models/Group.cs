namespace WebhookCity.Api.Models;

/// <summary>
/// A hierarchical grouping of projects, e.g. client / product family.
/// A project belongs to zero or one group.
/// </summary>
public class Group
{
    public Guid Id { get; set; }

    public required string Name { get; set; }

    /// <summary>URL-safe identifier.</summary>
    public required string Slug { get; set; }

    /// <summary>Optional accent color (hex) for the group's dot/label.</summary>
    public string? Color { get; set; }

    public Guid? ParentId { get; set; }
    public Group? Parent { get; set; }
    public ICollection<Group> Children { get; set; } = new List<Group>();

    /// <summary>
    /// Account that owns this group. Groups are personal organization — shared
    /// projects appear under "Shared with me" rather than in someone else's tree.
    /// </summary>
    public Guid? OwnerId { get; set; }
    public User? Owner { get; set; }

    public DateTimeOffset CreatedAt { get; set; }

    public ICollection<Project> Projects { get; set; } = new List<Project>();
}
