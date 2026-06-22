using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WebhookCity.Api.Common;
using WebhookCity.Api.Data;
using WebhookCity.Api.Dtos;
using WebhookCity.Api.Models;

namespace WebhookCity.Api.Controllers;

[ApiController]
[Route("api/groups")]
public class GroupsController : ControllerBase
{
    private readonly WebhookCityDbContext _db;

    public GroupsController(WebhookCityDbContext db) => _db = db;

    [HttpGet]
    public async Task<ActionResult<IEnumerable<GroupResponse>>> List()
    {
        var groups = await _db.Groups
            .OrderBy(g => g.Name)
            .Select(g => new GroupResponse(
                g.Id, g.Name, g.Slug, g.Color, g.CreatedAt, g.Projects.Count))
            .ToListAsync();

        return Ok(groups);
    }

    [HttpPost]
    public async Task<ActionResult<GroupResponse>> Create(CreateGroupRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
            return BadRequest("Name is required.");

        var slug = await SlugGenerator.UniqueSlugAsync(
            SlugGenerator.Slugify(request.Name),
            s => _db.Groups.AnyAsync(g => g.Slug == s));

        var group = new Group
        {
            Id = Guid.NewGuid(),
            Name = request.Name.Trim(),
            Slug = slug,
            Color = request.Color,
            CreatedAt = DateTimeOffset.UtcNow,
        };

        _db.Groups.Add(group);
        await _db.SaveChangesAsync();

        return Ok(Mapping.ToResponse(group));
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<GroupResponse>> Update(Guid id, UpdateGroupRequest request)
    {
        var group = await _db.Groups.FirstOrDefaultAsync(g => g.Id == id);
        if (group is null)
            return NotFound();

        if (string.IsNullOrWhiteSpace(request.Name))
            return BadRequest("Name is required.");

        group.Name = request.Name.Trim();
        group.Color = request.Color;
        await _db.SaveChangesAsync();

        return Ok(Mapping.ToResponse(group));
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var group = await _db.Groups.FirstOrDefaultAsync(g => g.Id == id);
        if (group is null)
            return NotFound();

        // Projects are orphaned (GroupId set null), never deleted, via the FK config.
        _db.Groups.Remove(group);
        await _db.SaveChangesAsync();
        return NoContent();
    }
}
