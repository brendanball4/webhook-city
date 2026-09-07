using System.Text.Json;
using WebhookCity.Api.Models;

namespace WebhookCity.Api.Services;

public static class EventNotificationBuilder
{
    public static EventNotification Build(Project project, Event webhookEvent)
    {
        var summary = Summarize(webhookEvent);
        return new EventNotification(
            project.Name, webhookEvent.Source, webhookEvent.Status, summary);
    }

    public static EventNotification TestMessage(Project project) =>
        new(project.Name, "webhook-city", "success",
            "Webhook City connected successfully");

    private static string Summarize(Event webhookEvent)
    {
        var root = webhookEvent.Body?.RootElement;
        if (root is not { ValueKind: JsonValueKind.Object })
            return $"Webhook received from `{webhookEvent.Source}`";

        if (TryNested(root.Value, out var dataType, "data", "type"))
            return FormatAppStoreConnect(dataType, root.Value);

        if (TryNested(root.Value, out var eventType, "metadata", "attributes", "eventType"))
            return FormatXcodeCloud(eventType, root.Value);

        return $"`{webhookEvent.Source}` webhook received";
    }

    private static string FormatAppStoreConnect(string dataType, JsonElement root)
    {
        var state = Attribute(root, "newState") ?? Attribute(root, "newValue");
        var oldState = Attribute(root, "oldState") ?? Attribute(root, "oldValue");
        var transition = oldState is not null && state is not null
            ? $" (`{oldState}` → `{state}`)"
            : state is not null ? $" (`{state}`)" : string.Empty;

        return dataType switch
        {
            "webhookPingCreated" => "Apple webhook test received",
            "betaFeedbackScreenshotSubmissionCreated" =>
                "New TestFlight screenshot feedback received",
            "betaFeedbackCrashSubmissionCreated" =>
                "New TestFlight crash report received",
            "buildUploadStateUpdated" when state == "COMPLETE" =>
                $"Build upload processing completed{transition}",
            "buildUploadStateUpdated" when state == "FAILED" =>
                $"Build upload processing failed{transition}",
            "buildUploadStateUpdated" => $"Build upload state changed{transition}",
            "appStoreVersionAppVersionStateUpdated" =>
                $"App Store version state changed{transition}",
            "buildBetaDetailExternalBuildStateUpdated" =>
                $"External TestFlight build state changed{transition}",
            "backgroundAssetVersionAppStoreReleaseStateUpdated" =>
                $"Background asset App Store release changed{transition}",
            "backgroundAssetVersionExternalBetaReleaseStateUpdated" =>
                $"Background asset external beta release changed{transition}",
            "backgroundAssetVersionInternalBetaReleaseCreated" =>
                "Background asset internal TestFlight release created",
            "backgroundAssetVersionStateUpdated" when state == "FAILED" =>
                $"Background asset processing failed{transition}",
            "backgroundAssetVersionStateUpdated" =>
                $"Background asset state changed{transition}",
            _ => $"Apple event `{dataType}` received{transition}",
        };
    }

    private static string FormatXcodeCloud(string eventType, JsonElement root)
    {
        var status = Nested(root, "ciBuildRun", "attributes", "completionStatus");
        return eventType switch
        {
            "BUILD_CREATED" => "Xcode Cloud build created",
            "BUILD_STARTED" => "Xcode Cloud build started",
            "BUILD_COMPLETED" when status == "SUCCEEDED" => "Xcode Cloud build passed",
            "BUILD_COMPLETED" when status is "FAILED" or "ERRORED" =>
                $"Xcode Cloud build {status.ToLowerInvariant()}",
            "BUILD_COMPLETED" when status == "CANCELED" => "Xcode Cloud build canceled",
            "BUILD_COMPLETED" => $"Xcode Cloud build completed (`{status ?? "unknown"}`)",
            _ => $"Xcode Cloud event `{eventType}` received",
        };
    }

    private static string? Attribute(JsonElement root, string name) =>
        Nested(root, "data", "attributes", name);

    private static string? Nested(JsonElement root, params string[] path) =>
        TryNested(root, out var value, path) ? value : null;

    private static bool TryNested(JsonElement element, out string value, params string[] path)
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
            : element.ToString();
        return value.Length > 0;
    }

}
