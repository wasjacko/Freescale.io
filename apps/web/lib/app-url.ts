/**
 * Canonical app URL. Used as the origin for OAuth redirects, magic
 * links and email confirmation links so the user always lands back
 * on the production domain (freescale.site) regardless of which
 * alias they arrived from (vercel.app preview, branch deploys, etc.).
 *
 * Resolution order:
 *   1. NEXT_PUBLIC_APP_URL env var (set in Vercel → production canonical)
 *   2. window.location.origin (browser fallback, used in local dev)
 *   3. "https://freescale.site" (last-resort default)
 *
 * Note: this is intentionally a function, not a const, so it picks up
 * the env var at call time. Reading env vars at module top-level can
 * miss late-resolved values in some Next.js setups.
 */
export function appUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  }
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  return "https://freescale.site";
}
