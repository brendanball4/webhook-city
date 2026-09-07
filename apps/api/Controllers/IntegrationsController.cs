using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WebhookCity.Api.Auth;
using WebhookCity.Api.Data;
using WebhookCity.Api.Dtos;
using WebhookCity.Api.Models;
using WebhookCity.Api.Services;

namespace WebhookCity.Api.Controllers;

/// <summary>
/// Outbound integrations for a project (Slack, Discord, ...). Reads are open to
/// anyone with project access; writes are owner-only because the webhook URL is
/// a credential for the owner's workspace.
/// </summary>
[ApiController]
[Route("api/projects/{projectSlug}/integrations")]
[Authorize]
public class IntegrationsController(
    WebhookCityDbContext db,
    ProjectAccess access,
    ChatWebhookClientResolver clients) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IEnumerable<IntegrationResponse>>> List(string projectSlug)
    {
        var found = await access.FindAsync(projectSlug, AccessLevel.Viewer);
        if (found is null)
            return NotFound();

        var integrations = await db.Integrations
            .Where(i => i.ProjectId == found.Value.Project.Id)
            .Include(i => i.Endpoints)
            .OrderBy(i => i.CreatedAt)
            .ToListAsync();

        return Ok(integrations.Select(ToResponse));
    }

    [HttpPost]
    public async Task<ActionResult<IntegrationResponse>> Create(
        string projectSlug, CreateIntegrationRequest request)
    {
        var found = await access.FindAsync(projectSlug, AccessLevel.Owner);
        if (found is null)
            return NotFound();

        if (!Enum.IsDefined(request.Provider))
            return BadRequest("Unknown provider.");
        if (string.IsNullOrWhiteSpace(request.Name))
            return BadRequest("Name is required.");

        var client = clients.For(request.Provider);
        if (client is null || !client.IsValidWebhookUrl(request.WebhookUrl, out _))
            return BadRequest($"Enter a valid {request.Provider} webhook URL.");

        var endpointIds = await ValidEndpointIdsAsync(found.Value.Project.Id, request.EndpointIds);

        var integration = new Integration
        {
            Id = Guid.NewGuid(),
            ProjectId = found.Value.Project.Id,
            Provider = request.Provider,
            Name = request.Name.Trim(),
            WebhookUrl = request.WebhookUrl.Trim(),
            Enabled = true,
            CreatedAt = DateTimeOffset.UtcNow,
            Endpoints = endpointIds
                .Select(id => new IntegrationEndpoint { EndpointId = id })
                .ToList(),
        };

        db.Integrations.Add(integration);
        await db.SaveChangesAsync();

        return Ok(ToResponse(integration));
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<IntegrationResponse>> Update(
        string projectSlug, Guid id, UpdateIntegrationRequest request)
    {
        var found = await access.FindAsync(projectSlug, AccessLevel.Owner);
        if (found is null)
            return NotFound();

        var integration = await db.Integrations
            .Include(i => i.Endpoints)
            .FirstOrDefaultAsync(i => i.Id == id && i.ProjectId == found.Value.Project.Id);

        if (integration is null)
            return NotFound();

        if (string.IsNullOrWhiteSpace(request.Name))
            return BadRequest("Name is required.");

        // A blank URL means "leave the stored credential alone".
        if (!string.IsNullOrWhiteSpace(request.WebhookUrl))
        {
            var client = clients.For(integration.Provider);
            if (client is null || !client.IsValidWebhookUrl(request.WebhookUrl, out _))
                return BadRequest($"Enter a valid {integration.Provider} webhook URL.");
            integration.WebhookUrl = request.WebhookUrl.Trim();
        }

        integration.Name = request.Name.Trim();
        integration.Enabled = request.Enabled;

        if (request.EndpointIds is not null)
        {
            var endpointIds = await ValidEndpointIdsAsync(
                found.Value.Project.Id, request.EndpointIds);

            integration.Endpoints.Clear();
            foreach (var endpointId in endpointIds)
                integration.Endpoints.Add(new IntegrationEndpoint { EndpointId = endpointId });
        }

        await db.SaveChangesAsync();
        return Ok(ToResponse(integration));
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(string projectSlug, Guid id)
    {
        var found = await access.FindAsync(projectSlug, AccessLevel.Owner);
        if (found is null)
            return NotFound();

        var integration = await db.Integrations
            .FirstOrDefaultAsync(i => i.Id == id && i.ProjectId == found.Value.Project.Id);

        if (integration is null)
            return NotFound();

        db.Integrations.Remove(integration);
        await db.SaveChangesAsync();
        return NoContent();
    }

    /// <summary>Sends a test message so the user can confirm the wiring works.</summary>
    [HttpPost("{id:guid}/test")]
    public async Task<IActionResult> Test(
        string projectSlug, Guid id, CancellationToken cancellationToken)
    {
        var found = await access.FindAsync(projectSlug, AccessLevel.Owner);
        if (found is null)
            return NotFound();

        var integration = await db.Integrations
            .FirstOrDefaultAsync(i => i.Id == id && i.ProjectId == found.Value.Project.Id);

        if (integration is null)
            return NotFound();

        var client = clients.For(integration.Provider);
        if (client is null)
            return BadRequest($"No client for provider {integration.Provider}.");

        var result = await client.SendAsync(
            integration.WebhookUrl,
            EventNotificationBuilder.TestMessage(found.Value.Project),
            cancellationToken);

        return result.Success
            ? Ok(new { delivered = true })
            : StatusCode(StatusCodes.Status502BadGateway, result.Error);
    }

    /// <summary>Keeps routing honest: only endpoints in this project may be selected.</summary>
    private async Task<List<Guid>> ValidEndpointIdsAsync(Guid projectId, List<Guid>? requested)
    {
        if (requested is null || requested.Count == 0)
            return new List<Guid>();

        return await db.Endpoints
            .Where(e => e.ProjectId == projectId && requested.Contains(e.Id))
            .Select(e => e.Id)
            .ToListAsync();
    }

    private static IntegrationResponse ToResponse(Integration integration) => new(
        integration.Id,
        integration.Provider,
        integration.Name,
        integration.Enabled,
        integration.CreatedAt,
        integration.Endpoints.Select(e => e.EndpointId).ToList());
}
