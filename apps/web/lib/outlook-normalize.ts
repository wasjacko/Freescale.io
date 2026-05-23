export const OUTLOOK_SCOPES = [
  "offline_access",
  "openid",
  "profile",
  "email",
  "User.Read",
  "Mail.ReadWrite",
  "Mail.Send",
];

type OutlookEmailAddress = {
  emailAddress?: {
    name?: string | null;
    address?: string | null;
  } | null;
};

export type OutlookGraphMessage = {
  id: string;
  conversationId?: string | null;
  subject?: string | null;
  bodyPreview?: string | null;
  receivedDateTime?: string | null;
  sentDateTime?: string | null;
  createdDateTime?: string | null;
  isRead?: boolean | null;
  internetMessageId?: string | null;
  hasAttachments?: boolean | null;
  from?: OutlookEmailAddress | null;
  toRecipients?: OutlookEmailAddress[] | null;
  ccRecipients?: OutlookEmailAddress[] | null;
  body?: {
    contentType?: "text" | "html" | string | null;
    content?: string | null;
  } | null;
};

export type NormalizedOutlookMessage = {
  externalId: string;
  threadId: string;
  direction: "in" | "out";
  contactEmail: string;
  contactName: string;
  subject: string;
  preview: string;
  sentAt: string;
  unread: boolean;
  bodyText: string | null;
  bodyHtml: string | null;
  metadata: Record<string, unknown>;
};

export function buildOutlookAuthorizeUrl(input: {
  state: string;
  clientId: string;
  redirectUri: string;
  tenantId?: string | null;
}): URL {
  const tenant = input.tenantId || "common";
  const url = new URL(`https://login.microsoftonline.com/${tenant}/oauth2/v2.0/authorize`);
  url.searchParams.set("client_id", input.clientId);
  url.searchParams.set("redirect_uri", input.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", OUTLOOK_SCOPES.join(" "));
  url.searchParams.set("state", input.state);
  url.searchParams.set("prompt", "select_account");
  return url;
}

export function normalizeOutlookRecipients(
  recipients: Array<{ name?: string | null; email: string }>
) {
  return recipients.map((recipient) => ({
    emailAddress: {
      ...(recipient.name ? { name: recipient.name } : {}),
      address: recipient.email,
    },
  }));
}

function stripHtml(value: string): string {
  return value
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function addressOf(value: OutlookEmailAddress | null | undefined) {
  const email = value?.emailAddress?.address?.trim() ?? "";
  return {
    email,
    name: value?.emailAddress?.name?.trim() || email,
  };
}

function firstRecipient(recipients: OutlookEmailAddress[] | null | undefined, ownerEmail: string) {
  const owner = ownerEmail.toLowerCase();
  const match = (recipients ?? [])
    .map(addressOf)
    .find((recipient) => recipient.email && recipient.email.toLowerCase() !== owner);
  return match ?? { email: "", name: "" };
}

export function mapOutlookMessage(
  message: OutlookGraphMessage,
  ownerEmail: string
): NormalizedOutlookMessage {
  const owner = ownerEmail.toLowerCase();
  const from = addressOf(message.from);
  const isOutbound = !!from.email && from.email.toLowerCase() === owner;
  const contact = isOutbound
    ? firstRecipient(message.toRecipients, ownerEmail)
    : from.email
      ? from
      : firstRecipient(message.toRecipients, ownerEmail);

  const rawBody = message.body?.content?.trim() ?? "";
  const isHtml = message.body?.contentType?.toLowerCase() === "html";
  const bodyText = isHtml ? stripHtml(rawBody) : rawBody || (message.bodyPreview ?? "");
  const sentAt =
    message.receivedDateTime ??
    message.sentDateTime ??
    message.createdDateTime ??
    new Date().toISOString();
  const preview = (message.bodyPreview || bodyText || "").slice(0, 140).replace(/\s+/g, " ").trim();

  return {
    externalId: message.id,
    threadId: message.conversationId || message.id,
    direction: isOutbound ? "out" : "in",
    contactEmail: contact.email,
    contactName: contact.name || contact.email,
    subject: message.subject ?? "",
    preview,
    sentAt,
    unread: !message.isRead && !isOutbound,
    bodyText: bodyText || null,
    bodyHtml: isHtml ? rawBody || null : null,
    metadata: {
      provider: "outlook",
      subject: message.subject ?? "",
      from,
      to: (message.toRecipients ?? []).map(addressOf).filter((a) => a.email),
      cc: (message.ccRecipients ?? []).map(addressOf).filter((a) => a.email),
      internetMessageId: message.internetMessageId ?? null,
      hasAttachments: !!message.hasAttachments,
    },
  };
}
