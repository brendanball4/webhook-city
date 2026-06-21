using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WebhookCity.Api.Common;
using WebhookCity.Api.Data;
using WebhookCity.Api.Dtos;
using WebhookCity.Api.Models;

namespace WebhookCity.Api.Controllers;

[ApiController]
[Route("api/projects/{projectSlug}/events")]
public class EventsController : ControllerBase
{
    private readonly WebhookCityDbContext _db;

    public EventsController(WebhookCityDbContext db) => _db = db;

    /// <summary>List a project's events, newest first. Supports simple cursor paging via `before`.</summary>
    [HttpGet]
    public async Task<ActionResult<IEnumerable<EventResponse>>> List(
        string projectSlug,
        [FromQuery] int take = 50,
        [FromQuery] DateTimeOffset? before = null,
        [FromQuery] EventKind? kind = null)
    {
        var project = await _db.Projects
            .FirstOrDefaultAsync(p => p.Slug == projectSlug);

        if (project is null)
            return NotFound();

        take = Math.Clamp(take, 1, 200);

        var query = _db.Events
            .Where(e => e.ProjectId == project.Id);

        if (kind is not null)
            query = query.Where(e => e.Kind == kind);

        if (before is not null)
            query = query.Where(e => e.ReceivedAt < before);

        var events = await query
            .OrderByDescending(e => e.ReceivedAt)
            .Take(take)
            .ToListAsync();

        return Ok(events.Select(Mapping.ToResponse));
    }
}
