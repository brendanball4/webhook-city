using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WebhookCity.Api.Auth;
using WebhookCity.Api.Common;
using WebhookCity.Api.Data;
using WebhookCity.Api.Dtos;
using WebhookCity.Api.Models;

namespace WebhookCity.Api.Controllers;

[ApiController]
[Route("api/projects")]
[Authorize]
public class ProjectsController : ControllerBase
{
    private readonly WebhookCityDbContext _db;
    private readonly ProjectAccess _access;

    public ProjectsController(WebhookCityDbContext db, ProjectAccess access)
    {
        _db = db;
        _access = access;
    }

    /// <summary>Projects the caller owns or has been given access to.</summary>
    [HttpGet]
    public async Task<ActionResult<IEnumerable<ProjectResponse>>> List()
    {
        var userId = _access.RequireUserId();

        var projects = await _access.VisibleProjects()
            .OrderByDescending(p => p.CreatedAt)
            .Select(p => new ProjectResponse(
                p.Id,
                p.Name,
                p.Slug,
                p.Capability,
                p.GroupId,
                p.OwnerId == userId
                    ? "Owner"
                    : p.Members
                        .Where(m => m.UserId == userId)
                        .Select(m => m.Role.ToString())
                        .FirstOrDefault()!,
                p.CreatedAt,
                p.Endpoints.Count))
            .ToListAsync();

        return Ok(projects);
    }

    [HttpGet("{slug}")]
    public async Task<ActionResult<ProjectDetailResponse>> Get(string slug)
    {
        var found = await _access.FindAsync(
            slug, AccessLevel.Viewer, q => q.Include(p => p.Endpoints));

        if (found is null)
            return NotFound();

        var (project, level) = found.Value;
        return Ok(Mapping.ToDetail(
            project,
            includeSecrets: level >= AccessLevel.Editor,
            role: level.ToString()));
    }

    [HttpPost]
    public async Task<ActionResult<ProjectResponse>> Create(CreateProjectRequest request)
    {
        var userId = _access.RequireUserId();

        if (string.IsNullOrWhiteSpace(request.Name))
            return BadRequest("Name is required.");

        if (!Enum.IsDefined(request.Capability))
            return BadRequest("Invalid capability.");

        // Only the caller's own groups are valid targets.
        if (request.GroupId is { } gid &&
            !await _db.Groups.AnyAsync(g => g.Id == gid && g.OwnerId == userId))
            return BadRequest("Group not found.");

        var slug = await SlugGenerator.UniqueSlugAsync(
            SlugGenerator.Slugify(request.Name),
            s => _db.Projects.AnyAsync(p => p.Slug == s));

        var project = new Project
        {
            Id = Guid.NewGuid(),
            Name = request.Name.Trim(),
            Slug = slug,
            Capability = request.Capability,
            GroupId = request.GroupId,
            OwnerId = userId,
            CreatedAt = DateTimeOffset.UtcNow,
        };

        _db.Projects.Add(project);
        await _db.SaveChangesAsync();

        var response = new ProjectResponse(
            project.Id, project.Name, project.Slug, project.Capability,
            project.GroupId, "Owner", project.CreatedAt, 0);

        return CreatedAtAction(nameof(Get), new { slug = project.Slug }, response);
    }

    [HttpDelete("{slug}")]
    public async Task<IActionResult> Delete(string slug)
    {
        // Only the owner may delete; editors cannot destroy someone else's project.
        var found = await _access.FindAsync(slug, AccessLevel.Owner);
        if (found is null)
            return NotFound();

        // Endpoints, events and memberships cascade-delete via their FK configuration.
        _db.Projects.Remove(found.Value.Project);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    /// <summary>
    /// Move a project into one of the caller's groups, or out to ungrouped.
    /// Owner-only: groups are personal organization, not shared structure.
    /// </summary>
    [HttpPut("{slug}/group")]
    public async Task<ActionResult<ProjectResponse>> SetGroup(
        string slug, UpdateProjectGroupRequest request)
    {
        var userId = _access.RequireUserId();

        var found = await _access.FindAsync(
            slug, AccessLevel.Owner, q => q.Include(p => p.Endpoints));

        if (found is null)
            return NotFound();

        if (request.GroupId is { } gid &&
            !await _db.Groups.AnyAsync(g => g.Id == gid && g.OwnerId == userId))
            return BadRequest("Group not found.");

        var project = found.Value.Project;
        project.GroupId = request.GroupId;
        await _db.SaveChangesAsync();

        return Ok(new ProjectResponse(
            project.Id, project.Name, project.Slug, project.Capability,
            project.GroupId, "Owner", project.CreatedAt, project.Endpoints.Count));
    }
}
