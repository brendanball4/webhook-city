namespace WebhookCity.Api.Dtos;

public record ConfigureSlackRequest(string WebhookUrl);

public record SlackIntegrationResponse(bool Configured, bool Enabled);
