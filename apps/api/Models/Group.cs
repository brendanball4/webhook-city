namespace WebhookCity.Api.Models;

/// <summary>
/// A flat grouping of projects, e.g. all projects for one client.
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

    public DateTimeOffset CreatedAt { get; set; }

    public ICollection<Project> Projects { get; set; } = new List<Project>();
}
