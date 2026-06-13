import {
  buildOutlookAuthUrl,
  exchangeOutlookCode,
  getValidOutlookAccessToken,
  listOutlookMessages,
  sendOutlookMessage,
} from "../outlook";
import { mapOutlookMessage } from "../outlook-normalize";
import type { ChannelAdapter, NormalizedThread, SyncResult } from "./adapter";

export const outlookAdapter: ChannelAdapter = {
  kind: "outlook",

  buildAuthUrl(state: string): string {
    return buildOutlookAuthUrl(state);
  },

  async exchangeCode(code: string) {
    const tokens = await exchangeOutlookCode(code);
    const { encryptJSON } = await import("../encryption");
    const encryptedTokens = await encryptJSON({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: tokens.expires_at,
      token_type: tokens.token_type,
      scope: tokens.scope,
    });
    return {
      encryptedTokens,
      externalId: tokens.email,
      displayName: tokens.email,
    };
  },

  async refreshTokens(encryptedTokens: string) {
    const refreshed = await getValidOutlookAccessToken(encryptedTokens);
    return {
      accessToken: refreshed.accessToken,
      updatedBlob: refreshed.updatedBlob,
    };
  },

  async sendMessage(params) {
    const result = await sendOutlookMessage(params.accessToken, {
      to: params.toEmail ? [{ email: params.toEmail }] : [],
      subject: params.subject || "",
      body: params.text,
    });
    return { externalId: result.id };
  },

  async sync(params): Promise<SyncResult> {
    const { accessToken, account, existingMessageIds } = params;

    const rawMessages = await listOutlookMessages(accessToken, 500);
    const fetchedCount = rawMessages.length;

    const mapped = rawMessages
      .map((message) => mapOutlookMessage(message, account.external_id))
      .filter((message) => !!message.contactEmail)
      .sort((a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime());

    if (mapped.length === 0) {
      return {
        fetchedCount,
        newHistoryId: null,
        threads: [],
      };
    }

    const byThread = new Map<
      string,
      {
        threadId: string;
        contactEmail: string;
        contactName: string;
        subject: string;
        preview: string;
        lastMessageAt: string;
        unreadCount: number;
        messages: ReturnType<typeof mapOutlookMessage>[];
      }
    >();

    for (const message of mapped) {
      const existing = byThread.get(message.threadId);
      if (!existing) {
        byThread.set(message.threadId, {
          threadId: message.threadId,
          contactEmail: message.contactEmail,
          contactName: message.contactName || message.contactEmail,
          subject: message.subject,
          preview: message.preview,
          lastMessageAt: message.sentAt,
          unreadCount: message.unread ? 1 : 0,
          messages: [message],
        });
        continue;
      }
      existing.messages.push(message);
      existing.subject = message.subject || existing.subject;
      existing.preview = message.preview || existing.preview;
      existing.lastMessageAt = message.sentAt;
      existing.unreadCount += message.unread ? 1 : 0;
      if (message.direction === "in") {
        existing.contactEmail = message.contactEmail;
        existing.contactName = message.contactName || message.contactEmail;
      }
    }

    const threads: NormalizedThread[] = [];

    for (const thread of byThread.values()) {
      threads.push({
        externalThreadId: thread.threadId,
        contactEmail: thread.contactEmail,
        contactName: thread.contactName,
        subject: thread.subject,
        preview: thread.preview,
        lastMessageAt: thread.lastMessageAt,
        unreadCount: thread.unreadCount,
        messages: thread.messages
          .filter((m) => !existingMessageIds.has(m.externalId))
          .map((m) => ({
            externalId: m.externalId,
            direction: m.direction,
            bodyText: m.bodyText,
            bodyHtml: m.bodyHtml,
            sentAt: m.sentAt,
            metadata: m.metadata,
          })),
      });
    }

    return {
      fetchedCount,
      newHistoryId: null,
      threads,
    };
  },
};
