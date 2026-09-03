using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using WebhookCity.Api.Auth;
using WebhookCity.Api.Data;
using WebhookCity.Api.Dtos;
using WebhookCity.Api.Services;

namespace WebhookCity.Api.Controllers;

[ApiController]
[Route("api/projects/{projectSlug}/integrations/slack")]
[Authorize]
public class SlackIntegrationController(
    WebhookCityDbContext db,
    SlackWebhookClient slack,
    ProjectAccess access) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<SlackIntegrationResponse>> Get(string projectSlug)
    {
        var found = await access.FindAsync(projectSlug, AccessLevel.Viewer);
        if (found is null)
            return NotFound();

        var project = found.Value.Project;

        return Ok(new SlackIntegrationResponse(
            !string.IsNullOrWhiteSpace(project.SlackWebhookUrl),
            project.SlackNotificationsEnabled));
    }

    [HttpPut]
    public async Task<ActionResult<SlackIntegrationResponse>> Configure(
        string projectSlug,
        ConfigureSlackRequest request)
    {
        var found = await access.FindAsync(projectSlug, AccessLevel.Owner);
        if (found is null)
            return NotFound();

        var project = found.Value.Project;

        if (!SlackWebhookClient.IsValidWebhookUrl(request.WebhookUrl, out _))
            return BadRequest("Enter a valid Slack Incoming Webhook URL.");

        project.SlackWebhookUrl = request.WebhookUrl.Trim();
        project.SlackNotificationsEnabled = true;
        await db.SaveChangesAsync();

        return Ok(new SlackIntegrationResponse(true, true));
    }

    [HttpPost("test")]
    public async Task<IActionResult> Test(string projectSlug, CancellationToken cancellationToken)
    {
        var found = await access.FindAsync(projectSlug, AccessLevel.Owner);
        if (found is null)
            return NotFound();

        var project = found.Value.Project;
        if (!project.SlackNotificationsEnabled || string.IsNullOrWhiteSpace(project.SlackWebhookUrl))
            return BadRequest("Configure Slack first.");

        var result = await slack.SendAsync(
            project.SlackWebhookUrl,
            SlackMessageFormatter.TestMessage(project),
            cancellationToken);

        return result.Success
            ? Ok(new { delivered = true })
            : StatusCode(StatusCodes.Status502BadGateway, result.Error);
    }

    [HttpDelete]
    public async Task<IActionResult> Delete(string projectSlug)
    {
        var found = await access.FindAsync(projectSlug, AccessLevel.Owner);
        if (found is null)
            return NotFound();

        var project = found.Value.Project;

        project.SlackWebhookUrl = null;
        project.SlackNotificationsEnabled = false;
        await db.SaveChangesAsync();
        return NoContent();
    }
}
