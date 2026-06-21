using System.Text.Json;

namespace WebhookCity.Api.Common;

/// <summary>
/// Best-effort extraction of a normalized status (success | error | pending)
/// from a webhook payload. Heuristic and source-aware; returns null if unknown.
/// </summary>
public static class StatusParser
{
    private static readonly string[] StatusFields =
        { "status", "state", "conclusion", "result", "outcome" };

    private static readonly HashSet<string> SuccessValues = new(StringComparer.OrdinalIgnoreCase)
        { "success", "succeeded", "passed", "ready", "ok", "complete", "completed", "ready_to_merge" };

    private static readonly HashSet<string> ErrorValues = new(StringComparer.OrdinalIgnoreCase)
        { "error", "failed", "failure", "errored", "cancelled", "canceled", "timed_out" };

    private static readonly HashSet<string> PendingValues = new(StringComparer.OrdinalIgnoreCase)
        { "pending", "building", "running", "in_progress", "queued", "processing", "started" };

    public static string? Parse(string source, JsonDocument? body)
    {
        if (body is null || body.RootElement.ValueKind != JsonValueKind.Object)
            return null;

        foreach (var field in StatusFields)
        {
            if (body.RootElement.TryGetProperty(field, out var prop) &&
                prop.ValueKind == JsonValueKind.String)
            {
                var value = prop.GetString();
                var normalized = Normalize(value);
                if (normalized is not null)
                    return normalized;
            }
        }

        return null;
    }

    private static string? Normalize(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
            return null;
        if (SuccessValues.Contains(value)) return "success";
        if (ErrorValues.Contains(value)) return "error";
        if (PendingValues.Contains(value)) return "pending";
        return null;
    }
}
