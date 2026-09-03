namespace WebhookCity.Api.Models;

/// <summary>
/// A long-lived refresh token, stored hashed so a database leak cannot be
/// replayed against the API. Rotated on every use.
/// </summary>
public class RefreshToken
{
    public Guid Id { get; set; }

    public Guid UserId { get; set; }
    public User? User { get; set; }

    /// <summary>SHA-256 of the opaque token handed to the client.</summary>
    public required string TokenHash { get; set; }

    public DateTimeOffset ExpiresAt { get; set; }
    public DateTimeOffset CreatedAt { get; set; }

    /// <summary>Set when rotated or logged out; a revoked token is never accepted.</summary>
    public DateTimeOffset? RevokedAt { get; set; }

    public bool IsActive(DateTimeOffset now) => RevokedAt is null && ExpiresAt > now;
}
