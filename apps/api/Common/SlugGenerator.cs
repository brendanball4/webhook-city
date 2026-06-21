using System.Text;

namespace WebhookCity.Api.Common;

/// <summary>Utilities for producing URL-safe slugs and secrets.</summary>
public static class SlugGenerator
{
    /// <summary>Convert arbitrary text into a lowercase, hyphenated, URL-safe slug.</summary>
    public static string Slugify(string input)
    {
        if (string.IsNullOrWhiteSpace(input))
            return RandomToken(6);

        var sb = new StringBuilder(input.Length);
        bool lastWasHyphen = false;

        foreach (var ch in input.Trim().ToLowerInvariant())
        {
            if (char.IsLetterOrDigit(ch))
            {
                sb.Append(ch);
                lastWasHyphen = false;
            }
            else if (!lastWasHyphen)
            {
                sb.Append('-');
                lastWasHyphen = true;
            }
        }

        var slug = sb.ToString().Trim('-');
        return string.IsNullOrEmpty(slug) ? RandomToken(6) : slug;
    }

    /// <summary>
    /// Produce a slug that is unique according to <paramref name="exists"/>, appending
    /// `-2`, `-3`, … until a free one is found.
    /// </summary>
    public static async Task<string> UniqueSlugAsync(
        string baseSlug, Func<string, Task<bool>> exists)
    {
        var slug = baseSlug;
        var suffix = 1;
        while (await exists(slug))
            slug = $"{baseSlug}-{++suffix}";
        return slug;
    }

    /// <summary>Generate a random URL-safe token (e.g. for endpoint slugs and secrets).</summary>
    public static string RandomToken(int length = 24)
    {
        const string alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";
        var bytes = new byte[length];
        System.Security.Cryptography.RandomNumberGenerator.Fill(bytes);

        var sb = new StringBuilder(length);
        foreach (var b in bytes)
            sb.Append(alphabet[b % alphabet.Length]);
        return sb.ToString();
    }
}
