using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WebhookCity.Api.Auth;
using WebhookCity.Api.Common;
using WebhookCity.Api.Data;
using WebhookCity.Api.Dtos;

namespace WebhookCity.Api.Controllers;

[ApiController]
[Route("api/projects/{projectSlug}/health")]
[Authorize]
public class HealthController : ControllerBase
{
    // How many recent events to scan for last-status and the per-endpoint strip.
    private const int RecentScan = 500;
    private const int StripLength = 20;

    private readonly WebhookCityDbContext _db;

    private readonly ProjectAccess _access;

    public HealthController(WebhookCityDbContext db, ProjectAccess access)
    {
        _db = db;
        _access = access;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<EndpointHealth>>> Get(string projectSlug)
    {
        var found = await _access.FindAsync(
            projectSlug, AccessLevel.Viewer, q => q.Include(p => p.Endpoints));

        if (found is null)
            return NotFound();

        var project = found.Value.Project;

        // One pass for counts + last-seen, keyed by endpoint.
        var aggregates = await _db.Events
            .Where(e => e.ProjectId == project.Id)
            .GroupBy(e => e.EndpointId)
            .Select(g => new
            {
                EndpointId = g.Key,
                Total = g.Count(),
                LastSeen = (DateTimeOffset?)g.Max(e => e.ReceivedAt),
                Success = g.Count(e => e.Status == "success"),
                Error = g.Count(e => e.Status == "error"),
                Pending = g.Count(e => e.Status == "pending"),
            })
            .ToDictionaryAsync(x => x.EndpointId);

        // Recent events (newest first) drive last-status and the strip.
        var recent = await _db.Events
            .Where(e => e.ProjectId == project.Id)
            .OrderByDescending(e => e.ReceivedAt)
            .Select(e => new { e.EndpointId, e.Status })
            .Take(RecentScan)
            .ToListAsync();

        var recentByEndpoint = recent
            .GroupBy(e => e.EndpointId)
            .ToDictionary(g => g.Key, g => g.Select(e => e.Status).ToList());

        var result = project.Endpoints
            .OrderBy(e => e.CreatedAt)
            .Select(ep =>
            {
                aggregates.TryGetValue(ep.Id, out var agg);
                var total = agg?.Total ?? 0;
                var errors = agg?.Error ?? 0;

                recentByEndpoint.TryGetValue(ep.Id, out var recentStatuses);
                var lastStatus = recentStatuses?.FirstOrDefault();

                // Strip: oldest→newest for left-to-right reading.
                var strip = (recentStatuses ?? new List<string?>())
                    .Take(StripLength)
                    .Reverse()
                    .ToList();

                return new EndpointHealth(
                    ep.Id,
                    ep.Source,
                    ep.Slug,
                    ep.Kind,
                    agg?.LastSeen,
                    lastStatus,
                    HealthEvaluator.Evaluate(total, lastStatus),
                    total,
                    agg?.Success ?? 0,
                    errors,
                    agg?.Pending ?? 0,
                    total == 0 ? 0 : Math.Round((double)errors / total, 3),
                    strip);
            })
            .ToList();

        return Ok(result);
    }
}
