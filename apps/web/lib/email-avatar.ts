import { createHash } from "node:crypto";

// Personal email providers — for those we want a Gravatar (real photo if the
// owner has one, otherwise a colored initial via UI fallback). For any other
// domain we treat the sender as a business and pull the favicon, which
// produces a real company logo for things like noreply@mobbin.com.
const PERSONAL_EMAIL_DOMAINS = new Set([
  "gmail.com",
  "googlemail.com",
  "yahoo.com",
  "yahoo.fr",
  "outlook.com",
  "hotmail.com",
  "hotmail.fr",
  "live.com",
  "icloud.com",
  "me.com",
  "mac.com",
  "aol.com",
  "proton.me",
  "protonmail.com",
  "pm.me",
  "free.fr",
  "orange.fr",
  "wanadoo.fr",
  "sfr.fr",
  "laposte.net",
]);

function rootDomain(domain: string): string {
  const parts = domain.split(".");
  if (parts.length <= 2) return domain;
  const lastTld = parts[parts.length - 1] ?? "";
  const secondLast = parts[parts.length - 2] ?? "";
  if (lastTld.length === 2 && secondLast.length <= 3 && /^[a-z]+$/.test(secondLast)) {
    return parts.slice(-3).join(".");
  }
  return parts.slice(-2).join(".");
}

export function avatarUrlFor(email: string): string {
  const domain = email.split("@")[1]?.toLowerCase().trim() ?? "";
  if (!domain) return "";
  if (PERSONAL_EMAIL_DOMAINS.has(domain)) {
    const md5 = createHash("md5").update(email.trim().toLowerCase()).digest("hex");
    return `https://www.gravatar.com/avatar/${md5}?s=200&d=404`;
  }
  return `https://icon.horse/icon/${rootDomain(domain)}`;
}
