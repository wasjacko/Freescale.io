import "server-only";
import { decryptJSON, encryptJSON } from "@/lib/encryption";

const GMAIL_SCOPES = [
  "https://www.googleapis.com/auth/gmail.modify",
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/userinfo.email",
];

export type GmailTokens = {
  access_token: string;
  refresh_token: string;
  expires_at: number; // epoch ms
  scope?: string;
  token_type?: string;
};

function getOrigin(): string {
  return process.env.NEXT_PUBLIC_APP_URL || "https://freescale-io.vercel.app";
}

export function buildGmailAuthUrl(state: string): string {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  if (!clientId) throw new Error("GOOGLE_OAUTH_CLIENT_ID is not set.");
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: `${getOrigin()}/auth/gmail/callback`,
    response_type: "code",
    scope: GMAIL_SCOPES.join(" "),
    access_type: "offline",
    prompt: "consent",
    state,
    include_granted_scopes: "true",
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

export async function exchangeGmailCode(code: string): Promise<GmailTokens & { email: string }> {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("Google OAuth credentials missing.");

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: `${getOrigin()}/auth/gmail/callback`,
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Token exchange failed: ${res.status} ${text}`);
  }
  const data = (await res.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
    scope: string;
    token_type: string;
  };
  if (!data.refresh_token) {
    throw new Error(
      "No refresh_token returned. Make sure prompt=consent + access_type=offline are set and the user revoked previous consent."
    );
  }

  // Fetch the user's Gmail address (the actual mailbox we're connecting)
  const meRes = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/profile", {
    headers: { Authorization: `Bearer ${data.access_token}` },
  });
  if (!meRes.ok) throw new Error("Failed to fetch Gmail profile.");
  const me = (await meRes.json()) as { emailAddress: string };

  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: Date.now() + data.expires_in * 1000,
    scope: data.scope,
    token_type: data.token_type,
    email: me.emailAddress,
  };
}

export async function refreshGmailAccessToken(refreshToken: string): Promise<GmailTokens> {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("Google OAuth credentials missing.");

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Token refresh failed: ${res.status} ${text}`);
  }
  const data = (await res.json()) as {
    access_token: string;
    expires_in: number;
    scope?: string;
    token_type?: string;
  };
  return {
    access_token: data.access_token,
    refresh_token: refreshToken, // Google doesn't rotate on refresh by default
    expires_at: Date.now() + data.expires_in * 1000,
    ...(data.scope ? { scope: data.scope } : {}),
    ...(data.token_type ? { token_type: data.token_type } : {}),
  };
}

/**
 * Resolve a fresh access token for a channel account, refreshing if needed.
 * Returns the access token and (if it changed) the updated encrypted blob so
 * the caller can persist it.
 */
export async function getValidAccessToken(
  encryptedBlob: string
): Promise<{ accessToken: string; updatedBlob: string | null; refreshToken: string }> {
  const tokens = await decryptJSON<GmailTokens>(encryptedBlob);
  // Refresh 60s before actual expiry to avoid races.
  if (tokens.expires_at - Date.now() > 60_000) {
    return { accessToken: tokens.access_token, updatedBlob: null, refreshToken: tokens.refresh_token };
  }
  const refreshed = await refreshGmailAccessToken(tokens.refresh_token);
  const updatedBlob = await encryptJSON(refreshed);
  return { accessToken: refreshed.access_token, updatedBlob, refreshToken: refreshed.refresh_token };
}

// ---------------------------------------------------------------------------
// Gmail API helpers (REST, no SDK)
// ---------------------------------------------------------------------------

type GmailHeader = { name: string; value: string };
type GmailMessagePart = {
  partId?: string;
  mimeType?: string;
  filename?: string;
  headers?: GmailHeader[];
  body?: { size?: number; data?: string; attachmentId?: string };
  parts?: GmailMessagePart[];
};
export type GmailMessage = {
  id: string;
  threadId: string;
  labelIds?: string[];
  snippet?: string;
  internalDate?: string;
  payload?: GmailMessagePart;
};

export async function listRecentMessages(
  accessToken: string,
  maxResults = 50
): Promise<{ id: string; threadId: string }[]> {
  const params = new URLSearchParams({
    maxResults: String(maxResults),
    // Skip spam and the chat / draft folders for the first sync — we want real
    // inbox conversations only.
    q: "in:inbox -in:chats",
  });
  const res = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages?${params}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Gmail messages.list failed: ${res.status} ${text}`);
  }
  const data = (await res.json()) as {
    messages?: { id: string; threadId: string }[];
  };
  return data.messages ?? [];
}

export async function getMessage(accessToken: string, id: string): Promise<GmailMessage> {
  const res = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=full`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Gmail messages.get(${id}) failed: ${res.status} ${text}`);
  }
  return (await res.json()) as GmailMessage;
}

function decodeBase64Url(input: string): string {
  // Gmail uses base64url; Node Buffer handles "base64" with normalization
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const pad = normalized.length % 4 ? "====".slice(normalized.length % 4) : "";
  try {
    return Buffer.from(normalized + pad, "base64").toString("utf-8");
  } catch {
    return "";
  }
}

function findPart(
  part: GmailMessagePart | undefined,
  predicate: (p: GmailMessagePart) => boolean
): GmailMessagePart | null {
  if (!part) return null;
  if (predicate(part)) return part;
  for (const child of part.parts ?? []) {
    const found = findPart(child, predicate);
    if (found) return found;
  }
  return null;
}

export function extractMessageContent(message: GmailMessage): {
  text: string;
  html: string;
  from: { name: string | null; email: string };
  to: string[];
  subject: string;
  date: Date;
} {
  const headers = message.payload?.headers ?? [];
  const headerMap = new Map(headers.map((h) => [h.name.toLowerCase(), h.value]));

  const fromRaw = headerMap.get("from") ?? "";
  const matchFrom = fromRaw.match(/^\s*(?:"?([^"<]+)"?\s*)?<?([^<>\s]+@[^<>\s]+)>?\s*$/);
  const from = {
    name: matchFrom?.[1]?.trim().replace(/^"|"$/g, "") ?? null,
    email: matchFrom?.[2]?.trim() ?? fromRaw,
  };

  const toRaw = headerMap.get("to") ?? "";
  const to = toRaw
    .split(",")
    .map((s) => s.match(/<?([^<>\s]+@[^<>\s]+)>?/)?.[1]?.trim())
    .filter((s): s is string => Boolean(s));

  const subject = headerMap.get("subject") ?? "";
  const dateHeader = headerMap.get("date");
  const date = dateHeader
    ? new Date(dateHeader)
    : new Date(Number(message.internalDate ?? Date.now()));

  const textPart = findPart(message.payload, (p) => p.mimeType === "text/plain" && !!p.body?.data);
  const htmlPart = findPart(message.payload, (p) => p.mimeType === "text/html" && !!p.body?.data);
  const text = textPart?.body?.data ? decodeBase64Url(textPart.body.data) : (message.snippet ?? "");
  const html = htmlPart?.body?.data ? decodeBase64Url(htmlPart.body.data) : "";

  return { text, html, from, to, subject, date };
}
