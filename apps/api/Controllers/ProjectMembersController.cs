using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WebhookCity.Api.Auth;
using WebhookCity.Api.Data;
using WebhookCity.Api.Dtos;
using WebhookCity.Api.Models;

namespace WebhookCity.Api.Controllers;

/// <summary>Sharing: who else can see a project, and at what level.</summary>
[ApiController]
[Route("api/projects/{projectSlug}/members")]
[Authorize]
public class ProjectMembersController : ControllerBase
{
    private readonly WebhookCityDbContext _db;
    private readonly ProjectAccess _access;

    public ProjectMembersController(WebhookCityDbContext db, ProjectAccess access)
    {
        _db = db;
        _access = access;
    }

    /// <summary>Anyone with access can see who else is on the project.</summary>
    [HttpGet]
    public async Task<ActionResult<IEnumerable<ProjectMemberResponse>>> List(string projectSlug)
    {
        var found = await _access.FindAsync(projectSlug, AccessLevel.Viewer);
        if (found is null)
            return NotFound();

        var members = await _db.ProjectMembers
            .Where(m => m.ProjectId == found.Value.Project.Id)
            .Include(m => m.User)
            .OrderBy(m => m.CreatedAt)
            .Select(m => new ProjectMemberResponse(
                m.UserId, m.User!.Email, m.User.DisplayName, m.Role.ToString(), m.CreatedAt))
            .ToListAsync();

        return Ok(members);
    }

    /// <summary>Share the project with an existing account, by email.</summary>
    [HttpPost]
    public async Task<ActionResult<ProjectMemberResponse>> Share(
        string projectSlug, ShareProjectRequest request)
    {
        var found = await _access.FindAsync(projectSlug, AccessLevel.Owner);
        if (found is null)
            return NotFound();

        if (!Enum.IsDefined(request.Role))
            return BadRequest("Invalid role.");

        var email = (request.Email ?? string.Empty).Trim().ToLowerInvariant();
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Email == email);
        if (user is null)
            return NotFound("No account with that email. They need to sign up first.");

        var project = found.Value.Project;

        if (user.Id == project.OwnerId)
            return BadRequest("That person already owns this project.");

        var existing = await _db.ProjectMembers
            .FirstOrDefaultAsync(m => m.ProjectId == project.Id && m.UserId == user.Id);

        if (existing is not null)
        {
            // Re-sharing simply updates the role rather than erroring.
            existing.Role = request.Role;
            await _db.SaveChangesAsync();
            return Ok(new ProjectMemberResponse(
                user.Id, user.Email, user.DisplayName, existing.Role.ToString(), existing.CreatedAt));
        }

        var member = new ProjectMember
        {
            ProjectId = project.Id,
            UserId = user.Id,
            Role = request.Role,
            CreatedAt = DateTimeOffset.UtcNow,
        };

        _db.ProjectMembers.Add(member);
        await _db.SaveChangesAsync();

        return Ok(new ProjectMemberResponse(
            user.Id, user.Email, user.DisplayName, member.Role.ToString(), member.CreatedAt));
    }

    [HttpPut("{userId:guid}")]
    public async Task<ActionResult<ProjectMemberResponse>> UpdateRole(
        string projectSlug, Guid userId, UpdateMemberRoleRequest request)
    {
        var found = await _access.FindAsync(projectSlug, AccessLevel.Owner);
        if (found is null)
            return NotFound();

        if (!Enum.IsDefined(request.Role))
            return BadRequest("Invalid role.");

        var member = await _db.ProjectMembers
            .Include(m => m.User)
            .FirstOrDefaultAsync(m =>
                m.ProjectId == found.Value.Project.Id && m.UserId == userId);

        if (member is null)
            return NotFound();

        member.Role = request.Role;
        await _db.SaveChangesAsync();

        return Ok(new ProjectMemberResponse(
            member.UserId, member.User!.Email, member.User.DisplayName,
            member.Role.ToString(), member.CreatedAt));
    }

    /// <summary>Revoke access. Owners can remove anyone; members can remove themselves.</summary>
    [HttpDelete("{userId:guid}")]
    public async Task<IActionResult> Remove(string projectSlug, Guid userId)
    {
        var callerId = _access.RequireUserId();
        var removingSelf = callerId == userId;

        var found = await _access.FindAsync(
            projectSlug, removingSelf ? AccessLevel.Viewer : AccessLevel.Owner);

        if (found is null)
            return NotFound();

        var member = await _db.ProjectMembers
            .FirstOrDefaultAsync(m =>
                m.ProjectId == found.Value.Project.Id && m.UserId == userId);

        if (member is null)
            return NotFound();

        _db.ProjectMembers.Remove(member);
        await _db.SaveChangesAsync();
        return NoContent();
    }
}
