using Microsoft.EntityFrameworkCore;
using WebhookCity.Api.Data;

namespace WebhookCity.Api.Services;

/// <summary>
/// Drains the outbound delivery queue. Provider-agnostic: it resolves the right
/// chat client from the delivery's integration, so new providers need no changes
/// here.
/// </summary>
public sealed class IntegrationDeliveryWorker(
    IServiceScopeFactory scopeFactory,
    ILogger<IntegrationDeliveryWorker> logger) : BackgroundService
{
    private const int MaxAttempts = 5;

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                var found = await DeliverNextAsync(stoppingToken);
                if (!found)
                    await Task.Delay(TimeSpan.FromSeconds(2), stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception exception)
            {
                logger.LogError(exception, "Integration delivery worker failed.");
                await Task.Delay(TimeSpan.FromSeconds(5), stoppingToken);
            }
        }
    }

    private async Task<bool> DeliverNextAsync(CancellationToken cancellationToken)
    {
        using var scope = scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<WebhookCityDbContext>();
        var resolver = scope.ServiceProvider.GetRequiredService<ChatWebhookClientResolver>();
        var now = DateTimeOffset.UtcNow;

        var delivery = await db.IntegrationDeliveries
            .Include(d => d.Integration)
            .Include(d => d.Event)!
            .ThenInclude(e => e!.Project)
            .Where(d => d.Status == "pending" && d.NextAttemptAt <= now)
            .OrderBy(d => d.NextAttemptAt)
            .FirstOrDefaultAsync(cancellationToken);

        if (delivery is null)
            return false;

        delivery.Attempts++;

        SendResult result;
        var integration = delivery.Integration;
        var project = delivery.Event?.Project;
        var client = integration is null ? null : resolver.For(integration.Provider);

        if (integration is null || project is null || delivery.Event is null)
        {
            result = new(false, false, "Delivery is missing its integration or event.");
        }
        else if (!integration.Enabled)
        {
            result = new(false, false, "Integration is no longer enabled.");
        }
        else if (client is null)
        {
            result = new(false, false, $"No client for provider {integration.Provider}.");
        }
        else
        {
            try
            {
                result = await client.SendAsync(
                    integration.WebhookUrl,
                    EventNotificationBuilder.Build(project, delivery.Event),
                    cancellationToken);
            }
            catch (HttpRequestException exception)
            {
                result = new(false, true, exception.Message);
            }
        }

        if (result.Success)
        {
            delivery.Status = "sent";
            delivery.SentAt = DateTimeOffset.UtcNow;
            delivery.LastError = null;
        }
        else if (!result.Retryable || delivery.Attempts >= MaxAttempts)
        {
            delivery.Status = "failed";
            delivery.LastError = result.Error;
        }
        else
        {
            delivery.NextAttemptAt = DateTimeOffset.UtcNow.AddSeconds(
                Math.Pow(2, delivery.Attempts));
            delivery.LastError = result.Error;
        }

        await db.SaveChangesAsync(cancellationToken);
        return true;
    }
}
