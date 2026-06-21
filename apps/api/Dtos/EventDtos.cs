using System.Text.Json;

namespace WebhookCity.Api.Dtos;

public record EventResponse(
    Guid Id,
    Guid EndpointId,
    Guid ProjectId,
    DateTimeOffset ReceivedAt,
    string Source,
    string? Status,
    string Method,
    JsonElement? Headers,
    JsonElement? Body);
