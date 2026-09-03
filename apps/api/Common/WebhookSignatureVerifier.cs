using System.Security.Cryptography;
using System.Text;

namespace WebhookCity.Api.Common;

/// <summary>Validates signatures sent by Apple webhook services.</summary>
public static class WebhookSignatureVerifier
{
    private const string AppleSignaturePrefix = "hmacsha256=";

    public static bool VerifyApple(string? signatureHeader, string secret, ReadOnlySpan<byte> body)
    {
        if (string.IsNullOrWhiteSpace(signatureHeader) || string.IsNullOrEmpty(secret))
            return false;

        if (!signatureHeader.StartsWith(
                AppleSignaturePrefix,
                StringComparison.OrdinalIgnoreCase))
        {
            return false;
        }

        var providedHex = signatureHeader[AppleSignaturePrefix.Length..];
        if (providedHex.Length != 64 || providedHex.Any(character => !Uri.IsHexDigit(character)))
            return false;

        var provided = Convert.FromHexString(providedHex);
        var expected = HMACSHA256.HashData(Encoding.UTF8.GetBytes(secret), body);
        return CryptographicOperations.FixedTimeEquals(provided, expected);
    }
}
