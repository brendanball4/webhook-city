using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WebhookCity.Api.Data;
using WebhookCity.Api.Dtos;
using WebhookCity.Api.Services;

namespace WebhookCity.Api.Controllers;

[ApiController]
[Route("api/projects/{projectSlug}/integrations/slack")]
public class SlackIntegrationController(
    WebhookCityDbContext db,
    SlackWebhookClient slack) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<SlackIntegrationResponse>> Get(string projectSlug)
    {
        var project = await db.Projects.FirstOrDefaultAsync(p => p.Slug == projectSlug);
        if (project is null)
            return NotFound();

        return Ok(new SlackIntegrationResponse(
            !string.IsNullOrWhiteSpace(project.SlackWebhookUrl),
            project.SlackNotificationsEnabled));
    }

    [HttpPut]
    public async Task<ActionResult<SlackIntegrationResponse>> Configure(
        string projectSlug,
        ConfigureSlackRequest request)
    {
        var project = await db.Projects.FirstOrDefaultAsync(p => p.Slug == projectSlug);
        if (project is null)
            return NotFound();

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
        var project = await db.Projects.FirstOrDefaultAsync(p => p.Slug == projectSlug);
        if (project is null)
            return NotFound();
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
        var project = await db.Projects.FirstOrDefaultAsync(p => p.Slug == projectSlug);
        if (project is null)
            return NotFound();

        project.SlackWebhookUrl = null;
        project.SlackNotificationsEnabled = false;
        await db.SaveChangesAsync();
        return NoContent();
    }
}
