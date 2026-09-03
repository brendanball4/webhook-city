using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WebhookCity.Api.Common;
using WebhookCity.Api.Data;
using WebhookCity.Api.Models;
using EndpointModel = WebhookCity.Api.Models.Endpoint;

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

        var rawBody = await ReadBodyAsync();
        if (rawBody is null)
            return StatusCode(StatusCodes.Status413PayloadTooLarge);

        if (!IsSecretValid(endpoint, rawBody))
            return Unauthorized();

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

        if (endpoint.Project!.SlackNotificationsEnabled &&
            !string.IsNullOrWhiteSpace(endpoint.Project.SlackWebhookUrl))
        {
            _db.SlackDeliveries.Add(new SlackDelivery
            {
                Id = Guid.NewGuid(),
                Event = ev,
                EventId = ev.Id,
                Status = "pending",
                CreatedAt = DateTimeOffset.UtcNow,
                NextAttemptAt = DateTimeOffset.UtcNow,
            });
        }

        await _db.SaveChangesAsync();

        return Accepted(new { id = ev.Id, receivedAt = ev.ReceivedAt });
    }

    private bool IsSecretValid(EndpointModel endpoint, ReadOnlySpan<byte> rawBody)
    {
        // Apple signs the exact request bytes with HMAC-SHA256. Xcode Cloud
        // endpoints require this signature instead of receiving the secret.
        if (endpoint.Source.Equals("xcode-cloud", StringComparison.OrdinalIgnoreCase))
        {
            return WebhookSignatureVerifier.VerifyApple(
                Request.Headers["X-Apple-Signature"].FirstOrDefault(),
                endpoint.SecretToken,
                rawBody);
        }

        // Accept the secret via header or query string for flexibility with senders.
        var provided = Request.Headers["X-Webhook-Secret"].FirstOrDefault()
                       ?? Request.Query["secret"].FirstOrDefault();
        return !string.IsNullOrEmpty(provided) &&
               CryptographicOperations.FixedTimeEquals(
                   Encoding.UTF8.GetBytes(provided),
                   Encoding.UTF8.GetBytes(endpoint.SecretToken));
    }

    private async Task<byte[]?> ReadBodyAsync()
    {
        // Buffering is enabled by middleware so the body is always rewindable,
        // even when [ApiController] form-binding has already read the stream.
        Request.EnableBuffering();
        if (Request.Body.CanSeek)
            Request.Body.Position = 0;

        if (Request.ContentLength > MaxBodyBytes)
            return null;

        using var output = new MemoryStream();
        var buffer = new byte[16 * 1024];
        int read;
        while ((read = await Request.Body.ReadAsync(buffer)) > 0)
        {
            if (output.Length + read > MaxBodyBytes)
            {
                if (Request.Body.CanSeek)
                    Request.Body.Position = 0;
                return null;
            }

            await output.WriteAsync(buffer.AsMemory(0, read));
        }

        if (Request.Body.CanSeek)
            Request.Body.Position = 0;

        return output.ToArray();
    }

    private static JsonDocument? TryParseJson(ReadOnlyMemory<byte> raw)
    {
        if (raw.IsEmpty || string.IsNullOrWhiteSpace(Encoding.UTF8.GetString(raw.Span)))
            return null;
        try
        {
            return JsonDocument.Parse(raw);
        }
        catch (JsonException)
        {
            // Non-JSON payloads are wrapped so we always store valid jsonb.
            return JsonDocument.Parse(JsonSerializer.Serialize(
                new { raw = Encoding.UTF8.GetString(raw.Span) }));
        }
    }

    private JsonDocument CaptureHeaders()
    {
        var dict = new Dictionary<string, string>();
        foreach (var header in Request.Headers)
        {
            // Don't persist the secret in the stored headers.
            if (header.Key.Equals("X-Webhook-Secret", StringComparison.OrdinalIgnoreCase) ||
                header.Key.Equals("X-Apple-Signature", StringComparison.OrdinalIgnoreCase))
                continue;
            dict[header.Key] = header.Value.ToString();
        }
        return JsonDocument.Parse(JsonSerializer.Serialize(dict));
    }
}
