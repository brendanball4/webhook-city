namespace WebhookCity.Api.Dtos;

public record RegisterRequest(string Email, string Password, string? DisplayName);

public record LoginRequest(string Email, string Password);

public record UserResponse(Guid Id, string Email, string? DisplayName);

/// <summary>
/// The access token is returned in the body for the client to hold in memory.
/// The refresh token is never in the body — it is set as an httpOnly cookie.
/// </summary>
public record AuthResponse(string AccessToken, int ExpiresInSeconds, UserResponse User);

public record ChangePasswordRequest(string CurrentPassword, string NewPassword);

public record UpdateProfileRequest(string? DisplayName);
