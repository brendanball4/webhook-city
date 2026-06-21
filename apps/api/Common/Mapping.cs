using WebhookCity.Api.Dtos;
using WebhookCity.Api.Models;
using Endpoint = WebhookCity.Api.Models.Endpoint;

namespace WebhookCity.Api.Common;

/// <summary>Maps domain entities to response DTOs.</summary>
public static class Mapping
{
    public static EndpointResponse ToResponse(Endpoint e) => new(
        e.Id,
        e.Slug,
        e.Source,
        e.SecretToken,
        e.CreatedAt,
        $"/ingest/{e.Project?.Slug}/{e.Slug}");

    public static ProjectDetailResponse ToDetail(Project p) => new(
        p.Id,
        p.Name,
        p.Slug,
        p.Capability,
        p.CreatedAt,
        p.Endpoints
            .OrderBy(e => e.CreatedAt)
            .Select(e =>
            {
                // Ensure IngestPath can resolve the project slug.
                e.Project ??= p;
                return ToResponse(e);
            })
            .ToList());

    public static EventResponse ToResponse(Event ev) => new(
        ev.Id,
        ev.EndpointId,
        ev.ProjectId,
        ev.ReceivedAt,
        ev.Source,
        ev.Status,
        ev.Method,
        ev.Headers?.RootElement,
        ev.Body?.RootElement);
}
