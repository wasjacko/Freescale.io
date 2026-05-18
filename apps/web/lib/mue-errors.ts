/**
 * Map raw Anthropic / aiapiflow errors to friendly user-facing French
 * strings. Used by every Mue action's catch block so the user gets
 * "Mue se repose un instant, retentez dans 30s" instead of
 * "Error: 429 Too Many Requests".
 *
 * Pure function — works in both client and server contexts.
 */
export function muePresentError(raw: string | Error | unknown): string {
  const msg =
    raw instanceof Error
      ? raw.message
      : typeof raw === "string"
        ? raw
        : String(raw);
  const lower = msg.toLowerCase();

  if (lower.includes("rate_limit") || lower.includes("429") || lower.includes("too many")) {
    return "Mue se repose un instant. Réessayez dans 30 secondes.";
  }
  if (lower.includes("overloaded") || lower.includes("503")) {
    return "Mue est saturée pour le moment. Réessayez d'ici une minute.";
  }
  if (
    lower.includes("invalid_request") ||
    lower.includes("400") ||
    lower.includes("malformed")
  ) {
    return "Mue n'a pas compris la requête. Si ça persiste, contactez le support.";
  }
  if (
    lower.includes("authentication") ||
    lower.includes("401") ||
    lower.includes("invalid api key") ||
    lower.includes("auth_token")
  ) {
    return "Configuration Mue invalide. (Admin: vérifier ANTHROPIC_AUTH_TOKEN.)";
  }
  if (lower.includes("channel pricing restriction") || lower.includes("no available accounts")) {
    return "Modèle Mue indisponible. (Admin: vérifier ANTHROPIC_MODEL.)";
  }
  if (lower.includes("anthropic credentials not set") || lower.includes("credentials not set")) {
    return "Mue n'est pas configurée sur le serveur.";
  }
  if (lower.includes("timeout") || lower.includes("aborted")) {
    return "Mue a mis trop de temps à répondre. Réessayez.";
  }
  // Fallback — short, generic, but not a raw stack trace.
  return "Mue est indisponible pour l'instant. Réessayez dans un instant.";
}
