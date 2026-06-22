namespace WebhookCity.Api.Common;

/// <summary>Derives an endpoint's health label from its event history.</summary>
public static class HealthEvaluator
{
    /// <summary>
    /// healthy  — last event succeeded
    /// failing  — last event errored
    /// pending  — last event is in-progress
    /// active   — has events but no parseable status
    /// idle     — no events yet
    /// </summary>
    public static string Evaluate(int total, string? lastStatus) => (total, lastStatus) switch
    {
        (0, _) => "idle",
        (_, "success") => "healthy",
        (_, "error") => "failing",
        (_, "pending") => "pending",
        _ => "active",
    };
}
