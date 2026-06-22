using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WebhookCity.Api.Common;
using WebhookCity.Api.Data;
using WebhookCity.Api.Dtos;
using WebhookCity.Api.Models;

namespace WebhookCity.Api.Controllers;

[ApiController]
[Route("api/projects")]
public class ProjectsController : ControllerBase
{
    private readonly WebhookCityDbContext _db;

    public ProjectsController(WebhookCityDbContext db) => _db = db;

    [HttpGet]
    public async Task<ActionResult<IEnumerable<ProjectResponse>>> List()
    {
        var projects = await _db.Projects
            .OrderByDescending(p => p.CreatedAt)
            .Select(p => new ProjectResponse(
                p.Id, p.Name, p.Slug, p.Capability, p.GroupId, p.CreatedAt, p.Endpoints.Count))
            .ToListAsync();

        return Ok(projects);
    }

    [HttpGet("{slug}")]
    public async Task<ActionResult<ProjectDetailResponse>> Get(string slug)
    {
        var project = await _db.Projects
            .Include(p => p.Endpoints)
            .FirstOrDefaultAsync(p => p.Slug == slug);

        if (project is null)
            return NotFound();

        return Ok(Mapping.ToDetail(project));
    }

    [HttpPost]
    public async Task<ActionResult<ProjectResponse>> Create(CreateProjectRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
            return BadRequest("Name is required.");

        if (!Enum.IsDefined(request.Capability))
            return BadRequest("Invalid capability.");

        if (request.GroupId is { } gid && !await _db.Groups.AnyAsync(g => g.Id == gid))
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
            CreatedAt = DateTimeOffset.UtcNow,
        };

        _db.Projects.Add(project);
        await _db.SaveChangesAsync();

        var response = new ProjectResponse(
            project.Id, project.Name, project.Slug, project.Capability,
            project.GroupId, project.CreatedAt, 0);

        return CreatedAtAction(nameof(Get), new { slug = project.Slug }, response);
    }

    [HttpDelete("{slug}")]
    public async Task<IActionResult> Delete(string slug)
    {
        var project = await _db.Projects.FirstOrDefaultAsync(p => p.Slug == slug);
        if (project is null)
            return NotFound();

        // Endpoints and events cascade-delete via their FK configuration.
        _db.Projects.Remove(project);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    /// <summary>Move a project into a group, or out to ungrouped (null GroupId).</summary>
    [HttpPut("{slug}/group")]
    public async Task<ActionResult<ProjectResponse>> SetGroup(
        string slug, UpdateProjectGroupRequest request)
    {
        var project = await _db.Projects
            .Include(p => p.Endpoints)
            .FirstOrDefaultAsync(p => p.Slug == slug);

        if (project is null)
            return NotFound();

        if (request.GroupId is { } gid && !await _db.Groups.AnyAsync(g => g.Id == gid))
            return BadRequest("Group not found.");

        project.GroupId = request.GroupId;
        await _db.SaveChangesAsync();

        return Ok(new ProjectResponse(
            project.Id, project.Name, project.Slug, project.Capability,
            project.GroupId, project.CreatedAt, project.Endpoints.Count));
    }
}
