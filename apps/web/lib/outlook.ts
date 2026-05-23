import "server-only";
import { appUrl } from "@/lib/app-url";
import { decryptJSON, encryptJSON } from "@/lib/encryption";
import {
  OUTLOOK_SCOPES,
  type OutlookGraphMessage,
  buildOutlookAuthorizeUrl,
  normalizeOutlookRecipients,
} from "@/lib/outlook-normalize";

export type OutlookTokens = {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  scope?: string;
  token_type?: string;
};

type OutlookTokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope?: string;
  token_type?: string;
};

type OutlookProfile = {
  id: string;
  displayName?: string | null;
  mail?: string | null;
  userPrincipalName?: string | null;
};

function tenantId(): string {
  return process.env.MICROSOFT_TENANT_ID || "common";
}

function redirectUri(): string {
  return `${appUrl()}/auth/outlook/callback`;
}

function tokenEndpoint(): string {
  return `https://login.microsoftonline.com/${tenantId()}/oauth2/v2.0/token`;
}

function microsoftCredentials() {
  const clientId = process.env.MICROSOFT_CLIENT_ID;
  const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("Microsoft OAuth credentials missing.");
  return { clientId, clientSecret };
}

export function buildOutlookAuthUrl(state: string): string {
  const clientId = process.env.MICROSOFT_CLIENT_ID;
  if (!clientId) throw new Error("MICROSOFT_CLIENT_ID is not set.");
  return buildOutlookAuthorizeUrl({
    state,
    clientId,
    redirectUri: redirectUri(),
    tenantId: tenantId(),
  }).toString();
}

export async function exchangeOutlookCode(
  code: string
): Promise<OutlookTokens & { email: string; displayName: string | null }> {
  const { clientId, clientSecret } = microsoftCredentials();
  const res = await fetch(tokenEndpoint(), {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri(),
      grant_type: "authorization_code",
      scope: OUTLOOK_SCOPES.join(" "),
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Outlook token exchange failed: ${res.status} ${text}`);
  }

  const data = (await res.json()) as OutlookTokenResponse;
  if (!data.refresh_token) {
    throw new Error("No Outlook refresh_token returned. Check offline_access consent.");
  }

  const profile = await getOutlookProfile(data.access_token);
  const email = profile.mail || profile.userPrincipalName;
  if (!email) throw new Error("Outlook profile did not include an email address.");

  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: Date.now() + data.expires_in * 1000,
    ...(data.scope ? { scope: data.scope } : {}),
    ...(data.token_type ? { token_type: data.token_type } : {}),
    email,
    displayName: profile.displayName ?? null,
  };
}

export async function refreshOutlookAccessToken(refreshToken: string): Promise<OutlookTokens> {
  const { clientId, clientSecret } = microsoftCredentials();
  const res = await fetch(tokenEndpoint(), {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
      scope: OUTLOOK_SCOPES.join(" "),
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Outlook token refresh failed: ${res.status} ${text}`);
  }

  const data = (await res.json()) as OutlookTokenResponse;
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token ?? refreshToken,
    expires_at: Date.now() + data.expires_in * 1000,
    ...(data.scope ? { scope: data.scope } : {}),
    ...(data.token_type ? { token_type: data.token_type } : {}),
  };
}

export async function getValidOutlookAccessToken(
  encryptedBlob: string
): Promise<{ accessToken: string; updatedBlob: string | null; refreshToken: string }> {
  const tokens = await decryptJSON<OutlookTokens>(encryptedBlob);
  if (tokens.expires_at - Date.now() > 60_000) {
    return {
      accessToken: tokens.access_token,
      updatedBlob: null,
      refreshToken: tokens.refresh_token,
    };
  }

  const refreshed = await refreshOutlookAccessToken(tokens.refresh_token);
  const updatedBlob = await encryptJSON(refreshed);
  return {
    accessToken: refreshed.access_token,
    updatedBlob,
    refreshToken: refreshed.refresh_token,
  };
}

async function graphJSON<T>(accessToken: string, url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      Prefer: 'outlook.body-content-type="html"',
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Microsoft Graph failed: ${res.status} ${text}`);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export async function getOutlookProfile(accessToken: string): Promise<OutlookProfile> {
  return graphJSON<OutlookProfile>(
    accessToken,
    "https://graph.microsoft.com/v1.0/me?$select=id,displayName,mail,userPrincipalName"
  );
}

export async function listOutlookMessages(
  accessToken: string,
  maxResults = 200
): Promise<OutlookGraphMessage[]> {
  const messages: OutlookGraphMessage[] = [];
  const fields = [
    "id",
    "conversationId",
    "subject",
    "bodyPreview",
    "receivedDateTime",
    "sentDateTime",
    "createdDateTime",
    "isRead",
    "internetMessageId",
    "from",
    "toRecipients",
    "ccRecipients",
    "body",
    "hasAttachments",
  ];
  let url = `https://graph.microsoft.com/v1.0/me/mailFolders/inbox/messages?${new URLSearchParams({
    $top: String(Math.min(50, maxResults)),
    $orderby: "receivedDateTime desc",
    $select: fields.join(","),
  }).toString()}`;

  while (url && messages.length < maxResults) {
    const data = await graphJSON<{
      value?: OutlookGraphMessage[];
      "@odata.nextLink"?: string;
    }>(accessToken, url);
    if (data.value?.length) messages.push(...data.value);
    url = data["@odata.nextLink"] ?? "";
  }

  return messages.slice(0, maxResults);
}

export type OutlookAttachment = {
  filename: string;
  mimeType: string;
  bytes: Buffer;
};

export async function sendOutlookMessage(
  accessToken: string,
  input: {
    from?: { name?: string | null; email: string };
    to: Array<{ name?: string | null; email: string }>;
    cc?: Array<{ name?: string | null; email: string }>;
    subject: string;
    body: string;
    attachments?: OutlookAttachment[];
  }
): Promise<{ id: string }> {
  const message: Record<string, unknown> = {
    subject: input.subject || "(no subject)",
    body: {
      contentType: "Text",
      content: input.body,
    },
    toRecipients: normalizeOutlookRecipients(input.to),
  };
  if (input.cc?.length) message.ccRecipients = normalizeOutlookRecipients(input.cc);
  if (input.attachments?.length) {
    message.attachments = input.attachments.map((attachment) => ({
      "@odata.type": "#microsoft.graph.fileAttachment",
      name: attachment.filename,
      contentType: attachment.mimeType,
      contentBytes: attachment.bytes.toString("base64"),
    }));
  }

  await graphJSON<void>(accessToken, "https://graph.microsoft.com/v1.0/me/sendMail", {
    method: "POST",
    body: JSON.stringify({
      message,
      saveToSentItems: true,
    }),
  });

  return { id: `outlook-sent-${Date.now()}` };
}
