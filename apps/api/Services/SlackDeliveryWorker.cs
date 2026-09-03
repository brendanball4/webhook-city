using Microsoft.EntityFrameworkCore;
using WebhookCity.Api.Data;

namespace WebhookCity.Api.Services;

public sealed class SlackDeliveryWorker(
    IServiceScopeFactory scopeFactory,
    ILogger<SlackDeliveryWorker> logger) : BackgroundService
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
                logger.LogError(exception, "Slack delivery worker failed.");
                await Task.Delay(TimeSpan.FromSeconds(5), stoppingToken);
            }
        }
    }

    private async Task<bool> DeliverNextAsync(CancellationToken cancellationToken)
    {
        using var scope = scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<WebhookCityDbContext>();
        var slack = scope.ServiceProvider.GetRequiredService<SlackWebhookClient>();
        var now = DateTimeOffset.UtcNow;

        var delivery = await db.SlackDeliveries
            .Include(d => d.Event)!
            .ThenInclude(e => e!.Project)
            .Where(d => d.Status == "pending" && d.NextAttemptAt <= now)
            .OrderBy(d => d.NextAttemptAt)
            .FirstOrDefaultAsync(cancellationToken);

        if (delivery?.Event?.Project is not { } project)
            return false;

        delivery.Attempts++;
        SlackSendResult result;
        if (!project.SlackNotificationsEnabled ||
            string.IsNullOrWhiteSpace(project.SlackWebhookUrl))
        {
            result = new(false, false, "Slack integration is no longer enabled.");
        }
        else
        {
            try
            {
                result = await slack.SendAsync(
                    project.SlackWebhookUrl,
                    SlackMessageFormatter.Format(project, delivery.Event),
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
