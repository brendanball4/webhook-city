using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using WebhookCity.Api.Auth;
using WebhookCity.Api.Data;
using WebhookCity.Api.Dtos;
using WebhookCity.Api.Models;

namespace WebhookCity.Api.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private const string RefreshCookie = "wc_refresh";
    private const int MinPasswordLength = 8;

    private readonly WebhookCityDbContext _db;
    private readonly TokenService _tokens;
    private readonly IPasswordHasher<User> _hasher;
    private readonly ProjectAccess _access;
    private readonly JwtOptions _options;

    public AuthController(
        WebhookCityDbContext db,
        TokenService tokens,
        IPasswordHasher<User> hasher,
        ProjectAccess access,
        IOptions<JwtOptions> options)
    {
        _db = db;
        _tokens = tokens;
        _hasher = hasher;
        _access = access;
        _options = options.Value;
    }

    [AllowAnonymous]
    [HttpPost("register")]
    public async Task<ActionResult<AuthResponse>> Register(RegisterRequest request)
    {
        var email = Normalize(request.Email);

        if (!IsValidEmail(email))
            return BadRequest("A valid email is required.");
        if (string.IsNullOrWhiteSpace(request.Password) ||
            request.Password.Length < MinPasswordLength)
            return BadRequest($"Password must be at least {MinPasswordLength} characters.");
        if (await _db.Users.AnyAsync(u => u.Email == email))
            return Conflict("An account with that email already exists.");

        var isFirstAccount = !await _db.Users.AnyAsync();

        var user = new User
        {
            Id = Guid.NewGuid(),
            Email = email,
            PasswordHash = string.Empty,
            DisplayName = string.IsNullOrWhiteSpace(request.DisplayName)
                ? null
                : request.DisplayName.Trim(),
            CreatedAt = DateTimeOffset.UtcNow,
        };
        user.PasswordHash = _hasher.HashPassword(user, request.Password);

        _db.Users.Add(user);
        await _db.SaveChangesAsync();

        // Data created before auth existed has no owner; the first account adopts it.
        if (isFirstAccount)
            await ClaimOwnerlessResourcesAsync(user.Id);

        return await IssueAsync(user);
    }

    [AllowAnonymous]
    [HttpPost("login")]
    public async Task<ActionResult<AuthResponse>> Login(LoginRequest request)
    {
        var email = Normalize(request.Email);
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Email == email);

        // Same response whether the account is missing or the password is wrong,
        // so the endpoint cannot be used to enumerate registered emails.
        if (user is null)
            return Unauthorized("Invalid email or password.");

        var result = _hasher.VerifyHashedPassword(user, user.PasswordHash, request.Password);
        if (result == PasswordVerificationResult.Failed)
            return Unauthorized("Invalid email or password.");

        if (result == PasswordVerificationResult.SuccessRehashNeeded)
        {
            user.PasswordHash = _hasher.HashPassword(user, request.Password);
            await _db.SaveChangesAsync();
        }

        return await IssueAsync(user);
    }

    [AllowAnonymous]
    [HttpPost("refresh")]
    public async Task<ActionResult<AuthResponse>> Refresh()
    {
        var raw = Request.Cookies[RefreshCookie];
        if (string.IsNullOrEmpty(raw))
            return Unauthorized("No refresh token.");

        var rotated = await _tokens.RotateAsync(raw);
        if (rotated is null)
        {
            ClearRefreshCookie();
            return Unauthorized("Invalid or expired refresh token.");
        }

        SetRefreshCookie(rotated.Value.RefreshToken);
        return Ok(BuildResponse(rotated.Value.User));
    }

    [AllowAnonymous]
    [HttpPost("logout")]
    public async Task<IActionResult> Logout()
    {
        var raw = Request.Cookies[RefreshCookie];
        if (!string.IsNullOrEmpty(raw))
            await _tokens.RevokeAsync(raw);

        ClearRefreshCookie();
        return NoContent();
    }

    [Authorize]
    [HttpGet("me")]
    public async Task<ActionResult<UserResponse>> Me()
    {
        var userId = _access.CurrentUserId;
        var user = userId is null
            ? null
            : await _db.Users.FirstOrDefaultAsync(u => u.Id == userId);

        if (user is null)
            return Unauthorized();

        return Ok(new UserResponse(user.Id, user.Email, user.DisplayName));
    }

    private async Task<ActionResult<AuthResponse>> IssueAsync(User user)
    {
        var refresh = await _tokens.IssueRefreshTokenAsync(user.Id);
        SetRefreshCookie(refresh);
        return Ok(BuildResponse(user));
    }

    private AuthResponse BuildResponse(User user) => new(
        _tokens.CreateAccessToken(user),
        _options.AccessTokenMinutes * 60,
        new UserResponse(user.Id, user.Email, user.DisplayName));

    private void SetRefreshCookie(string value) =>
        Response.Cookies.Append(RefreshCookie, value, new CookieOptions
        {
            HttpOnly = true,
            Secure = Request.IsHttps,
            SameSite = SameSiteMode.Lax,
            // Only ever sent to the auth endpoints that need it.
            Path = "/api/auth",
            Expires = DateTimeOffset.UtcNow.AddDays(_options.RefreshTokenDays),
        });

    private void ClearRefreshCookie() =>
        Response.Cookies.Delete(RefreshCookie, new CookieOptions
        {
            HttpOnly = true,
            Secure = Request.IsHttps,
            SameSite = SameSiteMode.Lax,
            Path = "/api/auth",
        });

    /// <summary>Adopts pre-auth projects and groups so existing data is not stranded.</summary>
    private async Task ClaimOwnerlessResourcesAsync(Guid userId)
    {
        await _db.Projects
            .Where(p => p.OwnerId == null)
            .ExecuteUpdateAsync(s => s.SetProperty(p => p.OwnerId, userId));

        await _db.Groups
            .Where(g => g.OwnerId == null)
            .ExecuteUpdateAsync(s => s.SetProperty(g => g.OwnerId, userId));
    }

    private static string Normalize(string? email) =>
        (email ?? string.Empty).Trim().ToLowerInvariant();

    private static bool IsValidEmail(string email) =>
        !string.IsNullOrWhiteSpace(email) && new EmailAddressAttribute().IsValid(email);
}
