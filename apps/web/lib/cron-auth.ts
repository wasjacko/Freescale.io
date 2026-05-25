export type CronAuthorizationStatus = "authorized" | "misconfigured" | "unauthorized";

export function getCronAuthorizationStatus(
  cronSecret: string | undefined,
  authorizationHeader: string | null
): CronAuthorizationStatus {
  if (!cronSecret) return "misconfigured";
  return authorizationHeader === `Bearer ${cronSecret}` ? "authorized" : "unauthorized";
}
