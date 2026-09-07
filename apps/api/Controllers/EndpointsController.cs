using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WebhookCity.Api.Auth;
using WebhookCity.Api.Common;
using WebhookCity.Api.Data;
using WebhookCity.Api.Dtos;
using WebhookCity.Api.Models;
using Endpoint = WebhookCity.Api.Models.Endpoint;

namespace WebhookCity.Api.Controllers;

[ApiController]
[Route("api/projects/{projectSlug}/endpoints")]
[Authorize]
public class EndpointsController : ControllerBase
{
    private readonly WebhookCityDbContext _db;
    private readonly ProjectAccess _access;

    public EndpointsController(WebhookCityDbContext db, ProjectAccess access)
    {
        _db = db;
        _access = access;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<EndpointResponse>>> List(string projectSlug)
    {
        var found = await _access.FindAsync(
            projectSlug, AccessLevel.Viewer, q => q.Include(p => p.Endpoints));

        if (found is null)
            return NotFound();

        var (project, level) = found.Value;
        var includeSecrets = level >= AccessLevel.Editor;

        var responses = project.Endpoints
            .OrderBy(e => e.CreatedAt)
            .Select(e => { e.Project = project; return Mapping.ToResponse(e, includeSecrets); });

        return Ok(responses);
    }

    [HttpPost]
    public async Task<ActionResult<EndpointResponse>> Create(
        string projectSlug, CreateEndpointRequest request)
    {
        var found = await _access.FindAsync(projectSlug, AccessLevel.Editor);
        if (found is null)
            return NotFound();

        var project = found.Value.Project;

        if (string.IsNullOrWhiteSpace(request.Source))
            return BadRequest("Source is required.");

        if (request.Kind is { } k && !Enum.IsDefined(k))
            return BadRequest("Invalid kind.");

        // Any project can add either kind at any time. The caller chooses; if
        // omitted, default from the project's current capability.
        var kind = request.Kind
            ?? (project.Capability == ProjectCapability.Logs
                ? EventKind.Log
                : EventKind.Webhook);

        // Adding the "other" kind grows the project to support both.
        var requiredCapability = kind == EventKind.Webhook
            ? ProjectCapability.Webhooks
            : ProjectCapability.Logs;
        if (project.Capability != ProjectCapability.Both &&
            project.Capability != requiredCapability)
        {
            project.Capability = ProjectCapability.Both;
        }

        var baseSlug = SlugGenerator.Slugify(
            string.IsNullOrWhiteSpace(request.Slug) ? request.Source : request.Slug);

        var slug = await SlugGenerator.UniqueSlugAsync(
            baseSlug,
            s => _db.Endpoints.AnyAsync(e => e.ProjectId == project.Id && e.Slug == s));

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

    /// <summary>
    /// Rename an endpoint's display label. The slug is deliberately NOT changed:
    /// it forms the public ingest URL that external services already point at,
    /// so renaming must never break delivery.
    /// </summary>
    [HttpPut("{endpointSlug}")]
    public async Task<ActionResult<EndpointResponse>> Rename(
        string projectSlug, string endpointSlug, RenameEndpointRequest request)
    {
        var found = await _access.FindAsync(projectSlug, AccessLevel.Editor);
        if (found is null)
            return NotFound();

        if (string.IsNullOrWhiteSpace(request.Source))
            return BadRequest("Name is required.");

        var endpoint = await _db.Endpoints
            .FirstOrDefaultAsync(e =>
                e.Slug == endpointSlug && e.ProjectId == found.Value.Project.Id);

        if (endpoint is null)
            return NotFound();

        endpoint.Source = request.Source.Trim().ToLowerInvariant();
        await _db.SaveChangesAsync();

        endpoint.Project = found.Value.Project;
        return Ok(Mapping.ToResponse(endpoint, includeSecret: true));
    }

    [HttpDelete("{endpointSlug}")]
    public async Task<IActionResult> Delete(string projectSlug, string endpointSlug)
    {
        var found = await _access.FindAsync(projectSlug, AccessLevel.Editor);
        if (found is null)
            return NotFound();

        var endpoint = await _db.Endpoints
            .FirstOrDefaultAsync(e =>
                e.Slug == endpointSlug && e.ProjectId == found.Value.Project.Id);

        if (endpoint is null)
            return NotFound();

        // The endpoint's events cascade-delete via their FK configuration.
        _db.Endpoints.Remove(endpoint);
        await _db.SaveChangesAsync();
        return NoContent();
    }
}
