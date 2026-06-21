using System.Text.Json;

namespace WebhookCity.Api.Models;

/// <summary>
/// A single webhook/log entry received at an endpoint. The heavy, append-only table.
/// </summary>
public class Event
{
    public Guid Id { get; set; }

    public Guid EndpointId { get; set; }
    public Endpoint? Endpoint { get; set; }

    /// <summary>Denormalized from the endpoint for fast per-project feed queries.</summary>
    public Guid ProjectId { get; set; }
    public Project? Project { get; set; }

    public DateTimeOffset ReceivedAt { get; set; }

    /// <summary>Origin service copied from the endpoint at ingest time.</summary>
    public required string Source { get; set; }

    /// <summary>Parsed outcome for filtering/coloring, e.g. success | error | pending.</summary>
    public string? Status { get; set; }

    /// <summary>HTTP method of the inbound request.</summary>
    public required string Method { get; set; }

    /// <summary>Raw request headers stored as jsonb.</summary>
    public JsonDocument? Headers { get; set; }

    /// <summary>Raw request payload stored as jsonb.</summary>
    public JsonDocument? Body { get; set; }

    /// <summary>When this event becomes eligible for retention cleanup.</summary>
    public DateTimeOffset RetentionExpiresAt { get; set; }
}
