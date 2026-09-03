namespace WebhookCity.Api.Auth;

/// <summary>JWT signing/lifetime settings, bound from the "Jwt" config section.</summary>
public class JwtOptions
{
    public const string SectionName = "Jwt";

    /// <summary>
    /// HMAC signing key. The value in appsettings is a development placeholder —
    /// override it in any real deployment via the Jwt__Key environment variable.
    /// </summary>
    public string Key { get; set; } = string.Empty;

    public string Issuer { get; set; } = "webhook-city";
    public string Audience { get; set; } = "webhook-city";

    /// <summary>Short-lived; the client keeps it in memory only.</summary>
    public int AccessTokenMinutes { get; set; } = 15;

    /// <summary>Long-lived; delivered as an httpOnly cookie and rotated on use.</summary>
    public int RefreshTokenDays { get; set; } = 30;

    /// <summary>
    /// SameSite mode for the refresh cookie: "Lax" | "None" | "Strict".
    /// Use "None" when the frontend and API are on different sites (e.g. a
    /// Netlify frontend calling an API on your own domain) — browsers drop the
    /// cookie otherwise. "None" additionally requires the cookie to be Secure,
    /// so the API must be served over HTTPS.
    /// </summary>
    public string CookieSameSite { get; set; } = "Lax";

    /// <summary>
    /// Force the Secure flag even when the app sees plain HTTP — needed when a
    /// reverse proxy or Cloudflare tunnel terminates TLS in front of Kestrel.
    /// </summary>
    public bool CookieSecure { get; set; }
}
