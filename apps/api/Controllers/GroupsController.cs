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
                g.Id, g.Name, g.Slug, g.Color, g.ParentId, g.CreatedAt, g.Projects.Count))
            .ToListAsync();

        return Ok(groups);
    }

    [HttpPost]
    public async Task<ActionResult<GroupResponse>> Create(CreateGroupRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
            return BadRequest("Name is required.");

        if (request.ParentId is { } parentId && !await _db.Groups.AnyAsync(g => g.Id == parentId))
            return BadRequest("Parent group does not exist.");

        var slug = await SlugGenerator.UniqueSlugAsync(
            SlugGenerator.Slugify(request.Name),
            s => _db.Groups.AnyAsync(g => g.Slug == s));

        var group = new Group
        {
            Id = Guid.NewGuid(),
            Name = request.Name.Trim(),
            Slug = slug,
            Color = request.Color,
            ParentId = request.ParentId,
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

        if (request.ParentId == id)
            return BadRequest("A group cannot contain itself.");

        if (request.ParentId is { } parentId)
        {
            var parent = await _db.Groups.FirstOrDefaultAsync(g => g.Id == parentId);
            if (parent is null)
                return BadRequest("Parent group does not exist.");

            var cursor = parent.ParentId;
            while (cursor is { } ancestorId)
            {
                if (ancestorId == id)
                    return BadRequest("A group cannot be moved inside one of its descendants.");
                cursor = await _db.Groups
                    .Where(g => g.Id == ancestorId)
                    .Select(g => g.ParentId)
                    .FirstOrDefaultAsync();
            }
        }

        group.Name = request.Name.Trim();
        group.Color = request.Color;
        group.ParentId = request.ParentId;
        await _db.SaveChangesAsync();

        return Ok(Mapping.ToResponse(group));
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var group = await _db.Groups.FirstOrDefaultAsync(g => g.Id == id);
        if (group is null)
            return NotFound();

        // Projects are orphaned and child groups move to the root via FK SetNull rules.
        _db.Groups.Remove(group);
        await _db.SaveChangesAsync();
        return NoContent();
    }
}
