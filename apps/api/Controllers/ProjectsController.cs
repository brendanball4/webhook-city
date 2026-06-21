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
                p.Id, p.Name, p.Slug, p.CreatedAt, p.Endpoints.Count))
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

        var baseSlug = SlugGenerator.Slugify(request.Name);
        var slug = baseSlug;
        var suffix = 1;
        while (await _db.Projects.AnyAsync(p => p.Slug == slug))
            slug = $"{baseSlug}-{++suffix}";

        var project = new Project
        {
            Id = Guid.NewGuid(),
            Name = request.Name.Trim(),
            Slug = slug,
            CreatedAt = DateTimeOffset.UtcNow,
        };

        _db.Projects.Add(project);
        await _db.SaveChangesAsync();

        var response = new ProjectResponse(
            project.Id, project.Name, project.Slug, project.CreatedAt, 0);

        return CreatedAtAction(nameof(Get), new { slug = project.Slug }, response);
    }
}
