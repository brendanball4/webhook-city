using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using WebhookCity.Api.Data;
using WebhookCity.Api.Models;

namespace WebhookCity.Api.Auth;

/// <summary>What the current user may do on a project. Ordered least → most.</summary>
public enum AccessLevel
{
    None = 0,
    Viewer = 1,
    Editor = 2,
    Owner = 3,
}

/// <summary>
/// Single place that answers "who is calling and what may they do here".
/// Every project-scoped controller goes through this so the rules live once.
/// </summary>
public class ProjectAccess
{
    private readonly WebhookCityDbContext _db;
    private readonly IHttpContextAccessor _http;

    public ProjectAccess(WebhookCityDbContext db, IHttpContextAccessor http)
    {
        _db = db;
        _http = http;
    }

    /// <summary>Current user's id, or null when unauthenticated.</summary>
    public Guid? CurrentUserId
    {
        get
        {
            var principal = _http.HttpContext?.User;
            var raw = principal?.FindFirstValue(JwtRegisteredClaimNames.Sub)
                      ?? principal?.FindFirstValue(ClaimTypes.NameIdentifier);
            return Guid.TryParse(raw, out var id) ? id : null;
        }
    }

    public Guid RequireUserId() =>
        CurrentUserId ?? throw new InvalidOperationException("No authenticated user.");

    /// <summary>Access level the current user has on a project.</summary>
    public async Task<AccessLevel> LevelForAsync(Project project)
    {
        var userId = CurrentUserId;
        if (userId is null) return AccessLevel.None;
        if (project.OwnerId == userId) return AccessLevel.Owner;

        var member = await _db.ProjectMembers
            .FirstOrDefaultAsync(m => m.ProjectId == project.Id && m.UserId == userId);

        return member is null
            ? AccessLevel.None
            : member.Role == ProjectRole.Editor ? AccessLevel.Editor : AccessLevel.Viewer;
    }

    /// <summary>
    /// Loads a project by slug only if the current user meets <paramref name="required"/>.
    /// Returns null when it does not exist or is not visible — callers return 404 either
    /// way so the API never reveals that someone else's project exists.
    /// </summary>
    public async Task<(Project Project, AccessLevel Level)?> FindAsync(
        string slug,
        AccessLevel required = AccessLevel.Viewer,
        Func<IQueryable<Project>, IQueryable<Project>>? include = null)
    {
        IQueryable<Project> query = _db.Projects;
        if (include is not null) query = include(query);

        var project = await query.FirstOrDefaultAsync(p => p.Slug == slug);
        if (project is null) return null;

        var level = await LevelForAsync(project);
        return level >= required ? (project, level) : null;
    }

    /// <summary>Projects the current user owns or has been given access to.</summary>
    public IQueryable<Project> VisibleProjects()
    {
        var userId = CurrentUserId;
        return _db.Projects.Where(p =>
            p.OwnerId == userId ||
            p.Members.Any(m => m.UserId == userId));
    }
}
