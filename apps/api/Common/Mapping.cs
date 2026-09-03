using WebhookCity.Api.Dtos;
using WebhookCity.Api.Models;
using Endpoint = WebhookCity.Api.Models.Endpoint;

namespace WebhookCity.Api.Common;

/// <summary>Maps domain entities to response DTOs.</summary>
public static class Mapping
{
    /// <param name="includeSecret">
    /// Viewers must never receive the ingest secret — with it they could forge
    /// events. Only owners and editors get the real value.
    /// </param>
    public static EndpointResponse ToResponse(Endpoint e, bool includeSecret = true) => new(
        e.Id,
        e.Slug,
        e.Source,
        e.Kind,
        includeSecret ? e.SecretToken : null,
        e.CreatedAt,
        $"/ingest/{e.Project?.Slug}/{e.Slug}");

    public static ProjectDetailResponse ToDetail(
        Project p, bool includeSecrets = true, string role = "Owner") => new(
        p.Id,
        p.Name,
        p.Slug,
        p.Capability,
        p.GroupId,
        role,
        p.CreatedAt,
        p.Endpoints
            .OrderBy(e => e.CreatedAt)
            .Select(e =>
            {
                // Ensure IngestPath can resolve the project slug.
                e.Project ??= p;
                return ToResponse(e, includeSecrets);
            })
            .ToList());

    public static GroupResponse ToResponse(Group g) => new(
        g.Id,
        g.Name,
        g.Slug,
        g.Color,
        g.ParentId,
        g.CreatedAt,
        g.Projects?.Count ?? 0);

    public static EventResponse ToResponse(Event ev) => new(
        ev.Id,
        ev.EndpointId,
        ev.ProjectId,
        ev.ReceivedAt,
        ev.Source,
        ev.Kind,
        ev.Status,
        ev.Method,
        ev.Headers?.RootElement,
        ev.Body?.RootElement);
}
