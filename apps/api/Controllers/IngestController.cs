using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WebhookCity.Api.Common;
using WebhookCity.Api.Data;
using WebhookCity.Api.Models;

namespace WebhookCity.Api.Controllers;

[ApiController]
[Route("ingest")]
public class IngestController : ControllerBase
{
    private const int DefaultRetentionDays = 30;
    private const long MaxBodyBytes = 256 * 1024; // 256 KB cap

    private readonly WebhookCityDbContext _db;

    public IngestController(WebhookCityDbContext db) => _db = db;

    /// <summary>
    /// Public ingest endpoint. External services POST here; we validate the secret,
    /// store the payload, and (later) push it to the live feed.
    /// </summary>
    [HttpPost("{projectSlug}/{endpointSlug}")]
    public async Task<IActionResult> Ingest(string projectSlug, string endpointSlug)
    {
        var endpoint = await _db.Endpoints
            .Include(e => e.Project)
            .FirstOrDefaultAsync(e =>
                e.Slug == endpointSlug && e.Project!.Slug == projectSlug);

        if (endpoint is null)
            return NotFound();

        if (!IsSecretValid(endpoint.SecretToken))
            return Unauthorized();

        var rawBody = await ReadBodyAsync();
        var body = TryParseJson(rawBody);
        var headers = CaptureHeaders();

        var ev = new Event
        {
            Id = Guid.NewGuid(),
            EndpointId = endpoint.Id,
            ProjectId = endpoint.ProjectId,
            ReceivedAt = DateTimeOffset.UtcNow,
            Source = endpoint.Source,
            Kind = endpoint.Kind,
            Status = StatusParser.Parse(endpoint.Source, body),
            Method = Request.Method,
            Headers = headers,
            Body = body,
            RetentionExpiresAt = DateTimeOffset.UtcNow.AddDays(DefaultRetentionDays),
        };

        _db.Events.Add(ev);
        await _db.SaveChangesAsync();

        return Accepted(new { id = ev.Id, receivedAt = ev.ReceivedAt });
    }

    private bool IsSecretValid(string expected)
    {
        // Accept the secret via header or query string for flexibility with senders.
        var provided = Request.Headers["X-Webhook-Secret"].FirstOrDefault()
                       ?? Request.Query["secret"].FirstOrDefault();
        return !string.IsNullOrEmpty(provided) && provided == expected;
    }

    private async Task<string> ReadBodyAsync()
    {
        // Buffering is enabled by middleware so the body is always rewindable,
        // even when [ApiController] form-binding has already read the stream.
        Request.EnableBuffering();
        if (Request.Body.CanSeek)
            Request.Body.Position = 0;

        using var reader = new StreamReader(
            Request.Body, Encoding.UTF8, leaveOpen: true);
        var raw = await reader.ReadToEndAsync();

        if (Request.Body.CanSeek)
            Request.Body.Position = 0;

        // Guard against oversized payloads.
        return raw.Length > MaxBodyBytes ? raw[..(int)MaxBodyBytes] : raw;
    }

    private static JsonDocument? TryParseJson(string raw)
    {
        if (string.IsNullOrWhiteSpace(raw))
            return null;
        try
        {
            return JsonDocument.Parse(raw);
        }
        catch (JsonException)
        {
            // Non-JSON payloads are wrapped so we always store valid jsonb.
            return JsonDocument.Parse(JsonSerializer.Serialize(new { raw }));
        }
    }

    private JsonDocument CaptureHeaders()
    {
        var dict = new Dictionary<string, string>();
        foreach (var header in Request.Headers)
        {
            // Don't persist the secret in the stored headers.
            if (header.Key.Equals("X-Webhook-Secret", StringComparison.OrdinalIgnoreCase))
                continue;
            dict[header.Key] = header.Value.ToString();
        }
        return JsonDocument.Parse(JsonSerializer.Serialize(dict));
    }
}
