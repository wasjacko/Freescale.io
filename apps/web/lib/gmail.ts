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

/**
 * Initial / full-resync message list. Returns messages explicitly tagged
 * by Gmail as CATEGORY_PERSONAL (the Primary tab classifier output).
 *
 * Why strict `category:primary` rather than `in:inbox -category:X...`:
 * Gmail leaves a lot of inbox mail un-categorised (random shopping
 * notifications, old newsletters, ancient sales outreach). The
 * negative-filter approach treats "no category" as "Primary by
 * default", which mirrors Gmail's UI rendering but pulls in months of
 * cruft that the user never thinks of as Primary. Strict matching on
 * CATEGORY_PERSONAL gives exactly the mail Gmail's classifier picked
 * for the Primary tab — which is what the user actually wants to see
 * in a focused inbox view.
 *
 * Trade-off: brand-new mail (arrived in the last minute or two) may
 * not be categorised yet and will be skipped this tick. The History
 * API catches it on the next sync once Gmail's labeller has run.
 *
 * 200 keeps the first sync under Vercel's 60s server-action ceiling.
 */
export async function listRecentMessages(
  accessToken: string,
  maxResults = 200
): Promise<{ id: string; threadId: string }[]> {
  const collected: { id: string; threadId: string }[] = [];
  let pageToken: string | undefined;

  while (collected.length < maxResults) {
    const params = new URLSearchParams({
      maxResults: String(Math.min(100, maxResults - collected.length)),
      q: "category:primary",
    });
    if (pageToken) params.set("pageToken", pageToken);

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
      nextPageToken?: string;
    };
    if (data.messages?.length) collected.push(...data.messages);
    if (!data.nextPageToken) break;
    pageToken = data.nextPageToken;
  }
  return collected;
}

/**
 * Fetch the user's profile — used to grab the current historyId that we
 * persist as a cursor after the initial full sync.
 */
export async function getProfile(
  accessToken: string
): Promise<{ emailAddress: string; messagesTotal: number; threadsTotal: number; historyId: string }> {
  const res = await fetch(
    "https://gmail.googleapis.com/gmail/v1/users/me/profile",
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Gmail getProfile failed: ${res.status} ${text}`);
  }
  return (await res.json()) as {
    emailAddress: string;
    messagesTotal: number;
    threadsTotal: number;
    historyId: string;
  };
}

/**
 * History API event surface we care about. Each one carries enough info
 * to reconcile our local DB without re-listing every message.
 */
export type HistoryDelta = {
  newHistoryId: string;
  /** Cursor expired (>7 days) — caller MUST do a full resync. */
  expired: boolean;
  addedMessages: Array<{ id: string; threadId: string }>;
  deletedMessages: Array<{ id: string; threadId: string }>;
  labelsAdded: Array<{ id: string; threadId: string; labelIds: string[] }>;
  labelsRemoved: Array<{ id: string; threadId: string; labelIds: string[] }>;
};

/**
 * users.history.list — Gmail's INCREMENTAL change feed. Returns every
 * mutation since `startHistoryId`. Cursor expires after ~7 days; we
 * surface that via `expired: true` so the caller can fall back to a full
 * resync.
 */
export async function listHistory(
  accessToken: string,
  startHistoryId: string
): Promise<HistoryDelta> {
  const collected = {
    addedMessages: [] as HistoryDelta["addedMessages"],
    deletedMessages: [] as HistoryDelta["deletedMessages"],
    labelsAdded: [] as HistoryDelta["labelsAdded"],
    labelsRemoved: [] as HistoryDelta["labelsRemoved"],
  };
  let pageToken: string | undefined;
  let latestHistoryId = startHistoryId;

  while (true) {
    const params = new URLSearchParams({
      startHistoryId,
      maxResults: "500",
    });
    if (pageToken) params.set("pageToken", pageToken);

    const res = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/history?${params}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (res.status === 404) {
      return { ...collected, newHistoryId: startHistoryId, expired: true };
    }
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Gmail history.list failed: ${res.status} ${text}`);
    }

    type HistoryItem = {
      id: string;
      messages?: Array<{ id: string; threadId: string; labelIds?: string[] }>;
      messagesAdded?: Array<{
        message: { id: string; threadId: string; labelIds?: string[] };
      }>;
      messagesDeleted?: Array<{
        message: { id: string; threadId: string };
      }>;
      labelsAdded?: Array<{
        message: { id: string; threadId: string };
        labelIds: string[];
      }>;
      labelsRemoved?: Array<{
        message: { id: string; threadId: string };
        labelIds: string[];
      }>;
    };
    const data = (await res.json()) as {
      history?: HistoryItem[];
      historyId?: string;
      nextPageToken?: string;
    };
    if (data.historyId) latestHistoryId = data.historyId;
    for (const item of data.history ?? []) {
      for (const a of item.messagesAdded ?? []) {
        collected.addedMessages.push({ id: a.message.id, threadId: a.message.threadId });
      }
      for (const d of item.messagesDeleted ?? []) {
        collected.deletedMessages.push({ id: d.message.id, threadId: d.message.threadId });
      }
      for (const la of item.labelsAdded ?? []) {
        collected.labelsAdded.push({
          id: la.message.id,
          threadId: la.message.threadId,
          labelIds: la.labelIds,
        });
      }
      for (const lr of item.labelsRemoved ?? []) {
        collected.labelsRemoved.push({
          id: lr.message.id,
          threadId: lr.message.threadId,
          labelIds: lr.labelIds,
        });
      }
    }
    if (!data.nextPageToken) break;
    pageToken = data.nextPageToken;
  }

  return { ...collected, newHistoryId: latestHistoryId, expired: false };
}

/**
 * Fetch every message in a Gmail thread (vs. only the latest one surfaced
 * by messages.list). Used during sync so the user opens a conversation
 * and sees the full prior history, not just the last reply.
 */
export async function getThread(
  accessToken: string,
  threadId: string
): Promise<{ id: string; messages: GmailMessage[] }> {
  const res = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/threads/${threadId}?format=full`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Gmail threads.get(${threadId}) failed: ${res.status} ${text}`);
  }
  const data = (await res.json()) as { id: string; messages?: GmailMessage[] };
  return { id: data.id, messages: data.messages ?? [] };
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

/**
 * Cheap metadata-only fetch — used at send time to pull the previous
 * message's Message-ID header for In-Reply-To / References threading.
 */
export async function getMessageMetadata(
  accessToken: string,
  id: string,
  headers: string[] = ["Message-Id", "Subject", "References", "In-Reply-To"]
): Promise<Record<string, string>> {
  const params = new URLSearchParams();
  params.append("format", "metadata");
  for (const h of headers) params.append("metadataHeaders", h);
  const res = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?${params}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Gmail metadata(${id}) failed: ${res.status} ${text}`);
  }
  const data = (await res.json()) as GmailMessage;
  const out: Record<string, string> = {};
  for (const h of data.payload?.headers ?? []) {
    out[h.name.toLowerCase()] = h.value;
  }
  return out;
}

/* ===========================================================================
 * SEND
 * =========================================================================== */

/** Encode a string with RFC 2047 "encoded-word" only if it has non-ASCII. */
function encodeMimeWord(s: string): string {
  // eslint-disable-next-line no-control-regex
  if (/^[\x00-\x7f]*$/.test(s)) return s;
  return "=?UTF-8?B?" + Buffer.from(s, "utf-8").toString("base64") + "?=";
}

function base64Url(buf: Buffer | string): string {
  const b = (typeof buf === "string" ? Buffer.from(buf, "utf-8") : buf).toString("base64");
  return b.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function formatAddress(addr: { name?: string | null; email: string }): string {
  return addr.name ? `${encodeMimeWord(addr.name)} <${addr.email}>` : addr.email;
}

function b64Wrap(bytes: Buffer): string {
  return bytes.toString("base64").match(/.{1,76}/g)?.join("\r\n") ?? "";
}

export type GmailAttachment = {
  filename: string;
  mimeType: string;
  bytes: Buffer;
};

/**
 * Build an RFC 5322 message ready to base64url-encode for Gmail's
 * users.messages.send endpoint. Supports To/Cc/Bcc, threading headers,
 * and attachments via multipart/mixed.
 */
function buildRawMessage(opts: {
  from: { name?: string | null; email: string };
  to: Array<{ name?: string | null; email: string }>;
  cc?: Array<{ name?: string | null; email: string }>;
  bcc?: Array<{ name?: string | null; email: string }>;
  subject: string;
  body: string;
  inReplyTo?: string;
  references?: string[];
  attachments?: GmailAttachment[];
}): string {
  const headers: string[] = [
    `From: ${formatAddress(opts.from)}`,
    `To: ${opts.to.map(formatAddress).join(", ")}`,
  ];
  if (opts.cc && opts.cc.length) headers.push(`Cc: ${opts.cc.map(formatAddress).join(", ")}`);
  if (opts.bcc && opts.bcc.length) headers.push(`Bcc: ${opts.bcc.map(formatAddress).join(", ")}`);
  headers.push(`Subject: ${encodeMimeWord(opts.subject || "(no subject)")}`);
  headers.push(`Date: ${new Date().toUTCString()}`);
  headers.push(`MIME-Version: 1.0`);
  if (opts.inReplyTo) headers.push(`In-Reply-To: ${opts.inReplyTo}`);
  if (opts.references && opts.references.length) {
    headers.push(`References: ${opts.references.join(" ")}`);
  }

  const hasAttachments = !!opts.attachments && opts.attachments.length > 0;

  if (!hasAttachments) {
    // Simple text/plain body
    headers.push(`Content-Type: text/plain; charset=UTF-8`);
    headers.push(`Content-Transfer-Encoding: base64`);
    const bodyB64 = b64Wrap(Buffer.from(opts.body, "utf-8"));
    return `${headers.join("\r\n")}\r\n\r\n${bodyB64}`;
  }

  // multipart/mixed → one text/plain part + N file parts
  const boundary = `----=_freescale_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`;
  headers.push(`Content-Type: multipart/mixed; boundary="${boundary}"`);

  const parts: string[] = [];
  // Body part
  parts.push(
    [
      `--${boundary}`,
      `Content-Type: text/plain; charset=UTF-8`,
      `Content-Transfer-Encoding: base64`,
      ``,
      b64Wrap(Buffer.from(opts.body, "utf-8")),
    ].join("\r\n")
  );

  // Attachment parts
  for (const att of opts.attachments ?? []) {
    parts.push(
      [
        `--${boundary}`,
        `Content-Type: ${att.mimeType}; name="${encodeMimeWord(att.filename)}"`,
        `Content-Disposition: attachment; filename="${encodeMimeWord(att.filename)}"`,
        `Content-Transfer-Encoding: base64`,
        ``,
        b64Wrap(att.bytes),
      ].join("\r\n")
    );
  }
  parts.push(`--${boundary}--`);

  return `${headers.join("\r\n")}\r\n\r\n${parts.join("\r\n")}`;
}

export async function sendGmailMessage(
  accessToken: string,
  opts: {
    from: { name?: string | null; email: string };
    to: Array<{ name?: string | null; email: string }>;
    cc?: Array<{ name?: string | null; email: string }>;
    bcc?: Array<{ name?: string | null; email: string }>;
    subject: string;
    body: string;
    threadId?: string;
    inReplyTo?: string;
    references?: string[];
    attachments?: GmailAttachment[];
  }
): Promise<{ id: string; threadId: string; messageId: string | null }> {
  const raw = buildRawMessage(opts);
  const payload: Record<string, unknown> = { raw: base64Url(raw) };
  if (opts.threadId) payload.threadId = opts.threadId;

  const res = await fetch(
    "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    }
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Gmail send failed: ${res.status} ${text}`);
  }
  const data = (await res.json()) as { id: string; threadId: string };

  // Best-effort: fetch the sent message's Message-ID so we can store it for
  // future threading (the next reply needs it as In-Reply-To).
  let messageId: string | null = null;
  try {
    const meta = await getMessageMetadata(accessToken, data.id, ["Message-Id"]);
    messageId = meta["message-id"] ?? null;
  } catch {
    // ignore — threading from our side will still work via threadId
  }
  return { id: data.id, threadId: data.threadId, messageId };
}

/** Return raw bytes from a base64url-encoded string (no charset assumption). */
function decodeBase64UrlBytes(input: string): Buffer {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const pad = normalized.length % 4 ? "====".slice(normalized.length % 4) : "";
  return Buffer.from(normalized + pad, "base64");
}

/**
 * Decode quoted-printable text (RFC 2045) → raw bytes. Charset interpretation
 * is intentionally separate so we can honor each part's Content-Type.
 */
function decodeQuotedPrintableBytes(input: string): Buffer {
  // Drop soft line breaks ("=" at end of line)
  const cleaned = input.replace(/=\r?\n/g, "");
  const bytes: number[] = [];
  for (let i = 0; i < cleaned.length; i++) {
    if (cleaned[i] === "=" && i + 2 < cleaned.length) {
      const hex = cleaned.slice(i + 1, i + 3);
      if (/^[0-9A-Fa-f]{2}$/.test(hex)) {
        bytes.push(parseInt(hex, 16));
        i += 2;
        continue;
      }
    }
    bytes.push(cleaned.charCodeAt(i) & 0xff);
  }
  return Buffer.from(bytes);
}

function getHeader(part: GmailMessagePart, name: string): string | undefined {
  return part.headers?.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value;
}

/** Pull charset=... out of the Content-Type header (case-insensitive). */
function getCharset(part: GmailMessagePart): string {
  const ct = getHeader(part, "content-type") ?? "";
  const match = ct.match(/charset\s*=\s*"?([^";\s]+)/i);
  const raw = (match?.[1] ?? "utf-8").toLowerCase();
  // Normalize aliases TextDecoder accepts. windows-1252 is the de-facto
  // superset of ISO-8859-1 most French senders actually use (Outlook,
  // IONOS, French ISPs), so we map there for safer accent decoding.
  if (raw === "iso-8859-1" || raw === "latin-1" || raw === "latin1") return "windows-1252";
  return raw;
}

/**
 * Try to decode bytes with the given charset. Returns null if the result is
 * suspect (contains the U+FFFD replacement character → invalid sequences
 * for that charset).
 */
function tryDecode(bytes: Buffer, charset: string): string | null {
  try {
    const out = new TextDecoder(charset, { fatal: false }).decode(bytes);
    return out.includes("�") ? null : out;
  } catch {
    return null;
  }
}

/**
 * Detect classic UTF-8-misread-as-Latin1 mojibake patterns. Looks for
 * sequences where a UTF-8 lead byte (0xC2-0xC3) has been decoded as Latin-1
 * and produces a 2-char artifact ("Ã©" for é, "Ã§" for ç, "Â " for non-
 * breaking space, etc). Common when an MTA double-encodes.
 */
function mojibakeRatio(s: string): number {
  if (!s) return 0;
  const matches = s.match(/[ÂÃ][-¿]/g);
  return (matches?.length ?? 0) / Math.max(s.length, 1);
}

/**
 * Reverse mojibake by re-interpreting the string's low-byte view as UTF-8.
 * If the string was originally UTF-8 bytes mistakenly decoded as Latin-1,
 * this round-trip restores the original characters.
 */
function fixMojibake(s: string): string {
  const bytes = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) bytes[i] = s.charCodeAt(i) & 0xff;
  return new TextDecoder("utf-8", { fatal: false }).decode(bytes);
}

/**
 * Decode a message part body honoring both Content-Transfer-Encoding
 * (quoted-printable / base64 / 7bit / 8bit) AND the Content-Type charset
 * (utf-8, windows-1252, iso-8859-15, ...). Many French senders LIE about
 * their charset (declare utf-8 but ship Latin-1), so we run a candidate
 * cascade: declared → windows-1252 → utf-8 (lossy), keeping the first one
 * that decodes cleanly (no U+FFFD characters).
 */
function decodePart(part: GmailMessagePart): string {
  const raw = part.body?.data;
  if (!raw) return "";

  // base64url → raw byte buffer (Gmail's body.data is always base64url)
  const transportBytes = decodeBase64UrlBytes(raw);

  // Unwrap the transfer encoding if needed → final byte buffer
  const enc = (getHeader(part, "content-transfer-encoding") ?? "").toLowerCase();
  let bodyBytes: Buffer;
  if (enc === "quoted-printable") {
    bodyBytes = decodeQuotedPrintableBytes(transportBytes.toString("latin1"));
  } else if (enc === "base64") {
    bodyBytes = Buffer.from(transportBytes.toString("latin1"), "base64");
  } else {
    bodyBytes = transportBytes;
  }

  const declared = getCharset(part);
  // Candidate cascade — first non-suspect decode wins
  const candidates = [
    declared,
    "windows-1252",
    "iso-8859-15",
    "utf-8",
  ].filter((c, i, arr) => arr.indexOf(c) === i);

  let decoded: string | null = null;
  for (const cs of candidates) {
    const out = tryDecode(bodyBytes, cs);
    if (out !== null) {
      decoded = out;
      break;
    }
  }
  if (decoded === null) {
    try {
      decoded = new TextDecoder("utf-8", { fatal: false }).decode(bodyBytes);
    } catch {
      decoded = bodyBytes.toString("latin1");
    }
  }

  // Mojibake repair: if the "clean" decode is full of Ã/Â artifacts
  // (UTF-8 misread as Latin-1 somewhere upstream), re-interpret as UTF-8.
  // Only keep the repair if it lowers the mojibake ratio meaningfully.
  if (mojibakeRatio(decoded) > 0.005) {
    const repaired = fixMojibake(decoded);
    if (mojibakeRatio(repaired) < mojibakeRatio(decoded) && !repaired.includes("�")) {
      return repaired;
    }
  }
  return decoded;
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

/**
 * Decode RFC 2047 "encoded-word" header values like
 *   =?UTF-8?B?Q3LDqWVy?=  →  Créer
 *   =?ISO-8859-1?Q?Cr=E9er?=  →  Créer
 * Plain ASCII passes through unchanged.
 */
function decodeMimeHeader(raw: string): string {
  if (!raw) return "";
  // Replace each encoded-word block. Adjacent ones with only whitespace
  // between are joined per RFC 2047 §6.2.
  const compacted = raw.replace(
    /=\?([^?]+)\?([QqBb])\?([^?]*)\?=\s+(?==\?)/g,
    "=?$1?$2?$3?="
  );
  return compacted.replace(
    /=\?([^?]+)\?([QqBb])\?([^?]*)\?=/g,
    (_, charsetRaw: string, mode: string, payload: string) => {
      try {
        const cs = (() => {
          const lower = charsetRaw.toLowerCase();
          if (lower === "iso-8859-1" || lower === "latin-1" || lower === "latin1")
            return "windows-1252";
          return lower;
        })();
        let bytes: Buffer;
        if (mode.toUpperCase() === "B") {
          bytes = Buffer.from(payload, "base64");
        } else {
          // Q-encoding: like quoted-printable but underscores are spaces
          const qp = payload.replace(/_/g, " ");
          const out: number[] = [];
          for (let i = 0; i < qp.length; i++) {
            if (qp[i] === "=" && i + 2 < qp.length && /^[0-9A-Fa-f]{2}$/.test(qp.slice(i + 1, i + 3))) {
              out.push(parseInt(qp.slice(i + 1, i + 3), 16));
              i += 2;
            } else {
              out.push(qp.charCodeAt(i) & 0xff);
            }
          }
          bytes = Buffer.from(out);
        }
        return new TextDecoder(cs, { fatal: false }).decode(bytes);
      } catch {
        return payload;
      }
    }
  );
}

export function extractMessageContent(message: GmailMessage): {
  text: string;
  html: string;
  snippet: string;
  from: { name: string | null; email: string };
  to: string[];
  subject: string;
  date: Date;
  messageId: string;
  references: string[];
} {
  const headers = message.payload?.headers ?? [];
  const headerMap = new Map(headers.map((h) => [h.name.toLowerCase(), h.value]));

  const fromRaw = decodeMimeHeader(headerMap.get("from") ?? "");
  const matchFrom = fromRaw.match(/^\s*(?:"?([^"<]+)"?\s*)?<?([^<>\s]+@[^<>\s]+)>?\s*$/);
  const from = {
    name: matchFrom?.[1]?.trim().replace(/^"|"$/g, "") ?? null,
    email: matchFrom?.[2]?.trim() ?? fromRaw,
  };

  const toRaw = decodeMimeHeader(headerMap.get("to") ?? "");
  const to = toRaw
    .split(",")
    .map((s) => s.match(/<?([^<>\s]+@[^<>\s]+)>?/)?.[1]?.trim())
    .filter((s): s is string => Boolean(s));

  const subject = decodeMimeHeader(headerMap.get("subject") ?? "");
  const dateHeader = headerMap.get("date");
  const date = dateHeader
    ? new Date(dateHeader)
    : new Date(Number(message.internalDate ?? Date.now()));
  const messageId = headerMap.get("message-id") ?? "";
  const referencesRaw = headerMap.get("references") ?? "";
  const references = referencesRaw
    .split(/\s+/)
    .map((s) => s.trim())
    .filter((s) => s.startsWith("<") && s.endsWith(">"));

  const textPart = findPart(message.payload, (p) => p.mimeType === "text/plain" && !!p.body?.data);
  const htmlPart = findPart(message.payload, (p) => p.mimeType === "text/html" && !!p.body?.data);
  const snippet = message.snippet ?? "";

  const rawText = textPart ? decodePart(textPart) : "";
  const text = looksLikeGarbage(rawText) || !rawText.trim() ? snippet : rawText;

  const rawHtml = htmlPart ? decodePart(htmlPart) : "";
  const html = looksLikeGarbage(rawHtml) ? "" : rawHtml;

  return { text, html, snippet, from, to, subject, date, messageId, references };
}

/**
 * Heuristic: detect when decoded text isn't actually text. We flag:
 *   - U+FFFD (replacement) above ~2 %
 *   - C0 control bytes (< 0x20, excluding TAB/LF/CR) above ~5 %
 *   - C1 control bytes (0x80–0x9F) above ~5 %   ← this catches the bug
 *     that just appeared: DKIM / PGP blobs decoded as Latin-1 surface as
 *     a stream of   ½ … which are otherwise valid Unicode
 *     code units but never appear in real human text
 *   - Any combined non-printable above ~10 %
 */
function looksLikeGarbage(s: string): boolean {
  if (!s) return false;
  const sample = s.slice(0, 2000);
  const total = sample.length;
  if (total < 20) return false;
  let replacement = 0;
  let c0 = 0;
  let c1 = 0;
  for (let i = 0; i < total; i++) {
    const code = sample.charCodeAt(i);
    if (code === 0xfffd) replacement++;
    else if (code < 0x20 && code !== 0x09 && code !== 0x0a && code !== 0x0d) c0++;
    else if (code >= 0x80 && code <= 0x9f) c1++;
  }
  if (replacement / total > 0.02) return true;
  if (c0 / total > 0.05) return true;
  if (c1 / total > 0.05) return true;
  if ((replacement + c0 + c1) / total > 0.10) return true;
  return false;
}
