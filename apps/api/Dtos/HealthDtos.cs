using WebhookCity.Api.Models;

namespace WebhookCity.Api.Dtos;

/// <summary>Health summary for one endpoint/source within a project.</summary>
public record EndpointHealth(
    Guid EndpointId,
    string Source,
    string Slug,
    EventKind Kind,
    DateTimeOffset? LastSeenAt,
    string? LastStatus,
    string Health, // healthy | failing | pending | active | idle
    int Total,
    int SuccessCount,
    int ErrorCount,
    int PendingCount,
    double FailureRate,
    IReadOnlyList<string?> RecentStatuses); // chronological, up to 20
