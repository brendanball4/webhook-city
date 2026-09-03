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

        var appStoreConnectStatus = ParseAppStoreConnect(body.RootElement);
        if (appStoreConnectStatus is not null)
            return appStoreConnectStatus;

        if (source.Equals("xcode-cloud", StringComparison.OrdinalIgnoreCase))
        {
            var xcodeCloudStatus = ParseXcodeCloud(body.RootElement);
            if (xcodeCloudStatus is not null)
                return xcodeCloudStatus;
        }

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

    private static string? ParseAppStoreConnect(JsonElement root)
    {
        if (!TryGetNestedString(root, out var dataType, "data", "type"))
            return null;

        if (dataType is "buildUploadStateUpdated" or "backgroundAssetVersionStateUpdated" &&
            TryGetNestedString(root, out var newState, "data", "attributes", "newState"))
        {
            return newState.ToUpperInvariant() switch
            {
                "COMPLETE" => "success",
                "FAILED" => "error",
                "AWAITING_UPLOAD" or "PROCESSING" => "pending",
                _ => null,
            };
        }

        return null;
    }

    private static string? ParseXcodeCloud(JsonElement root)
    {
        if (TryGetNestedString(
                root,
                out var completionStatus,
                "ciBuildRun", "attributes", "completionStatus"))
        {
            var normalized = Normalize(completionStatus);
            if (normalized is not null)
                return normalized;

            if (completionStatus.Equals("SKIPPED", StringComparison.OrdinalIgnoreCase))
                return "success";
        }

        if (TryGetNestedString(
                root,
                out var executionProgress,
                "ciBuildRun", "attributes", "executionProgress"))
        {
            var normalized = Normalize(executionProgress);
            if (normalized is not null)
                return normalized;
        }

        if (TryGetNestedString(root, out var eventType, "metadata", "attributes", "eventType") &&
            (eventType.Equals("BUILD_CREATED", StringComparison.OrdinalIgnoreCase) ||
             eventType.Equals("BUILD_STARTED", StringComparison.OrdinalIgnoreCase)))
        {
            return "pending";
        }

        return null;
    }

    private static bool TryGetNestedString(
        JsonElement element,
        out string value,
        params string[] path)
    {
        foreach (var segment in path)
        {
            if (element.ValueKind != JsonValueKind.Object ||
                !element.TryGetProperty(segment, out element))
            {
                value = string.Empty;
                return false;
            }
        }

        value = element.ValueKind == JsonValueKind.String
            ? element.GetString() ?? string.Empty
            : string.Empty;
        return value.Length > 0;
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
