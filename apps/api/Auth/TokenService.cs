using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using WebhookCity.Api.Data;
using WebhookCity.Api.Models;

namespace WebhookCity.Api.Auth;

/// <summary>Issues access tokens and manages rotating refresh tokens.</summary>
public class TokenService
{
    private readonly WebhookCityDbContext _db;
    private readonly JwtOptions _options;

    public TokenService(WebhookCityDbContext db, IOptions<JwtOptions> options)
    {
        _db = db;
        _options = options.Value;
    }

    public string CreateAccessToken(User user)
    {
        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new Claim(JwtRegisteredClaimNames.Email, user.Email),
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
        };

        var credentials = new SigningCredentials(
            new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_options.Key)),
            SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer: _options.Issuer,
            audience: _options.Audience,
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(_options.AccessTokenMinutes),
            signingCredentials: credentials);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    /// <summary>Creates a refresh token, storing only its hash. Returns the raw value.</summary>
    public async Task<string> IssueRefreshTokenAsync(Guid userId)
    {
        var raw = GenerateRawToken();

        _db.RefreshTokens.Add(new RefreshToken
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            TokenHash = Hash(raw),
            CreatedAt = DateTimeOffset.UtcNow,
            ExpiresAt = DateTimeOffset.UtcNow.AddDays(_options.RefreshTokenDays),
        });
        await _db.SaveChangesAsync();

        return raw;
    }

    /// <summary>
    /// Validates a refresh token and rotates it: the presented token is revoked
    /// and a fresh one issued, so a stolen token is single-use.
    /// </summary>
    public async Task<(User User, string RefreshToken)?> RotateAsync(string rawToken)
    {
        var hash = Hash(rawToken);
        var stored = await _db.RefreshTokens
            .Include(t => t.User)
            .FirstOrDefaultAsync(t => t.TokenHash == hash);

        if (stored?.User is null || !stored.IsActive(DateTimeOffset.UtcNow))
            return null;

        stored.RevokedAt = DateTimeOffset.UtcNow;
        var replacement = await IssueRefreshTokenAsync(stored.UserId);

        return (stored.User, replacement);
    }

    /// <summary>Revokes a single refresh token (logout). Safe to call with an unknown token.</summary>
    public async Task RevokeAsync(string rawToken)
    {
        var hash = Hash(rawToken);
        var stored = await _db.RefreshTokens.FirstOrDefaultAsync(t => t.TokenHash == hash);
        if (stored is null || stored.RevokedAt is not null)
            return;

        stored.RevokedAt = DateTimeOffset.UtcNow;
        await _db.SaveChangesAsync();
    }

    /// <summary>
    /// Revokes every outstanding refresh token for a user. Used on password
    /// change and "sign out everywhere" so a stolen token cannot outlive either.
    /// </summary>
    public async Task RevokeAllForUserAsync(Guid userId)
    {
        await _db.RefreshTokens
            .Where(t => t.UserId == userId && t.RevokedAt == null)
            .ExecuteUpdateAsync(s => s.SetProperty(
                t => t.RevokedAt, DateTimeOffset.UtcNow));
    }

    private static string GenerateRawToken()
    {
        var bytes = RandomNumberGenerator.GetBytes(32);
        return Convert.ToBase64String(bytes)
            .Replace('+', '-').Replace('/', '_').TrimEnd('=');
    }

    private static string Hash(string value) =>
        Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(value)));
}
