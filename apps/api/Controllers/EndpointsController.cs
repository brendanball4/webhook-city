using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WebhookCity.Api.Common;
using WebhookCity.Api.Data;
using WebhookCity.Api.Dtos;
using WebhookCity.Api.Models;
using Endpoint = WebhookCity.Api.Models.Endpoint;

namespace WebhookCity.Api.Controllers;

[ApiController]
[Route("api/projects/{projectSlug}/endpoints")]
public class EndpointsController : ControllerBase
{
    private readonly WebhookCityDbContext _db;

    public EndpointsController(WebhookCityDbContext db) => _db = db;

    [HttpGet]
    public async Task<ActionResult<IEnumerable<EndpointResponse>>> List(string projectSlug)
    {
        var project = await _db.Projects
            .Include(p => p.Endpoints)
            .FirstOrDefaultAsync(p => p.Slug == projectSlug);

        if (project is null)
            return NotFound();

        var responses = project.Endpoints
            .OrderBy(e => e.CreatedAt)
            .Select(e => { e.Project = project; return Mapping.ToResponse(e); });

        return Ok(responses);
    }

    [HttpPost]
    public async Task<ActionResult<EndpointResponse>> Create(
        string projectSlug, CreateEndpointRequest request)
    {
        var project = await _db.Projects
            .FirstOrDefaultAsync(p => p.Slug == projectSlug);

        if (project is null)
            return NotFound();

        if (string.IsNullOrWhiteSpace(request.Source))
            return BadRequest("Source is required.");

        if (request.Kind is { } k && !Enum.IsDefined(k))
            return BadRequest("Invalid kind.");

        // A single-capability project forces the kind; a "Both" project lets the
        // caller choose (defaulting to Webhook).
        var kind = project.Capability switch
        {
            ProjectCapability.Webhooks => EventKind.Webhook,
            ProjectCapability.Logs => EventKind.Log,
            _ => request.Kind ?? EventKind.Webhook,
        };

        var baseSlug = string.IsNullOrWhiteSpace(request.Slug)
            ? SlugGenerator.Slugify(request.Source)
            : SlugGenerator.Slugify(request.Slug);

        var slug = baseSlug;
        var suffix = 1;
        while (await _db.Endpoints.AnyAsync(e => e.ProjectId == project.Id && e.Slug == slug))
            slug = $"{baseSlug}-{++suffix}";

        var endpoint = new Endpoint
        {
            Id = Guid.NewGuid(),
            ProjectId = project.Id,
            Project = project,
            Slug = slug,
            Source = request.Source.Trim().ToLowerInvariant(),
            Kind = kind,
            SecretToken = SlugGenerator.RandomToken(32),
            CreatedAt = DateTimeOffset.UtcNow,
        };

        _db.Endpoints.Add(endpoint);
        await _db.SaveChangesAsync();

        return Ok(Mapping.ToResponse(endpoint));
    }
}
