using System.Text.Json;
using WebhookCity.Api.Models;

namespace WebhookCity.Api.Dtos;

public record EventResponse(
    Guid Id,
    Guid EndpointId,
    Guid ProjectId,
    DateTimeOffset ReceivedAt,
    string Source,
    EventKind Kind,
    string? Status,
    string Method,
    JsonElement? Headers,
    JsonElement? Body);
