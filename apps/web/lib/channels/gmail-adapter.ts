import {
  buildGmailAuthUrl,
  exchangeGmailCode,
  extractMessageContent,
  getProfile,
  getThread,
  getValidAccessToken,
  listHistory,
  listRecentMessages,
  sendGmailMessage,
} from "../gmail";
import type { ChannelAdapter, NormalizedThread, SyncResult } from "./adapter";

function isInInbox(labelIds: string[] | undefined): boolean {
  return (labelIds ?? []).includes("INBOX");
}

export const gmailAdapter: ChannelAdapter = {
  kind: "gmail",

  buildAuthUrl(state: string): string {
    return buildGmailAuthUrl(state);
  },

  async exchangeCode(code: string) {
    const tokens = await exchangeGmailCode(code);
    const { encryptJSON } = await import("../encryption");
    const encryptedTokens = await encryptJSON({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: tokens.expires_at,
      scope: tokens.scope,
      token_type: tokens.token_type,
    });
    return {
      encryptedTokens,
      externalId: tokens.email,
      displayName: tokens.email,
    };
  },

  async refreshTokens(encryptedTokens: string) {
    const refreshed = await getValidAccessToken(encryptedTokens);
    return {
      accessToken: refreshed.accessToken,
      updatedBlob: refreshed.updatedBlob,
    };
  },

  async sendMessage(params) {
    const result = await sendGmailMessage(params.accessToken, {
      from: { email: "me" },
      to: [{ email: params.toEmail ?? "" }],
      subject: params.subject ?? "Re:",
      body: params.text,
      threadId: params.externalThreadId,
      inReplyTo: params.replyToMessageId,
      references: params.replyToMessageId ? [params.replyToMessageId] : [],
    });
    return { externalId: result.id };
  },

  async sync(params): Promise<SyncResult> {
    const { accessToken, storedHistoryId, account, existingMessageIds, existingThreadMap } = params;

    let threadIds: string[];
    let nextHistoryId: string | null = null;
    let fetchedCount = 0;
    const toDeleteExternalThreadIds: string[] = [];
    const deletedMessages: string[] = [];

    const doFullList = async (report: { fetched: number }): Promise<string[]> => {
      const messages = await listRecentMessages(accessToken, 1000);
      report.fetched = messages.length;
      const tIds = new Set<string>();
      for (const m of messages) tIds.add(m.threadId);
      return [...tIds];
    };

    const report = { fetched: 0 };

    if (storedHistoryId) {
      try {
        const delta = await listHistory(accessToken, storedHistoryId);
        if (delta.expired) {
          threadIds = await doFullList(report);
          try {
            nextHistoryId = (await getProfile(accessToken)).historyId;
          } catch {}
        } else {
          const ids = new Set<string>();
          for (const m of delta.addedMessages) ids.add(m.threadId);
          for (const m of delta.labelsAdded) ids.add(m.threadId);
          for (const m of delta.labelsRemoved) ids.add(m.threadId);
          threadIds = [...ids];
          nextHistoryId = delta.newHistoryId;
          report.fetched = delta.addedMessages.length;

          for (const d of delta.deletedMessages) {
            deletedMessages.push(d.id);
          }
        }
      } catch {
        // Fallback to full list on delta failure
        threadIds = await doFullList(report);
        try {
          nextHistoryId = (await getProfile(accessToken)).historyId;
        } catch {}
      }
    } else {
      threadIds = await doFullList(report);
      try {
        nextHistoryId = (await getProfile(accessToken)).historyId;
      } catch {}
    }

    fetchedCount = report.fetched;

    if (threadIds.length === 0) {
      return {
        fetchedCount,
        newHistoryId: nextHistoryId,
        threads: [],
        toDeleteExternalThreadIds,
        deletedMessages,
      };
    }

    const BATCH_SIZE = 16;
    type FetchedThread =
      // biome-ignore lint/suspicious/noExplicitAny: Gmail thread representation
      { ok: true; threadId: string; thread: any } | { ok: false; threadId: string; error: unknown };

    const threads: NormalizedThread[] = [];

    for (let i = 0; i < threadIds.length; i += BATCH_SIZE) {
      const batch = threadIds.slice(i, i + BATCH_SIZE);
      const fetched: FetchedThread[] = await Promise.all(
        batch.map(
          (threadId): Promise<FetchedThread> =>
            getThread(accessToken, threadId)
              .then((thread) => ({ ok: true as const, threadId, thread }))
              .catch((error) => ({ ok: false as const, threadId, error }))
        )
      );

      for (const entry of fetched) {
        if (!entry.ok) continue;
        const { threadId, thread } = entry;
        const parsed = thread.messages
          // biome-ignore lint/suspicious/noExplicitAny: Gmail message representation
          .map((m: any) => ({ raw: m, content: extractMessageContent(m) }))
          // biome-ignore lint/suspicious/noExplicitAny: sort comparison objects
          .sort((a: any, b: any) => a.content.date.getTime() - b.content.date.getTime());
        if (parsed.length === 0) continue;

        // biome-ignore lint/suspicious/noExplicitAny: parsed message object
        const isAnyInInbox = parsed.some((p: any) => isInInbox(p.raw.labelIds));
        if (!isAnyInInbox) {
          if (existingThreadMap.has(threadId)) {
            toDeleteExternalThreadIds.push(threadId);
          }
          continue;
        }

        const newest = parsed[parsed.length - 1];
        if (!newest) continue;

        const lastInbound = [...parsed]
          .reverse()
          .find((p) => p.content.from.email.toLowerCase() !== account.external_id.toLowerCase());
        const contactEmail = lastInbound?.content.from.email ?? newest.content.from.email;
        const contactName =
          lastInbound?.content.from.name ?? newest.content.from.name ?? contactEmail;

        const preview = (newest.content.snippet || newest.content.text)
          .slice(0, 140)
          .replace(/\s+/g, " ")
          .trim();
        // biome-ignore lint/suspicious/noExplicitAny: parsed message object
        const unreadCount = parsed.filter((p: any) =>
          (p.raw.labelIds ?? []).includes("UNREAD")
        ).length;
        const lastMessageAt = newest.content.date.toISOString();

        threads.push({
          externalThreadId: threadId,
          contactEmail,
          contactName,
          subject: newest.content.subject || "",
          preview,
          lastMessageAt,
          unreadCount,
          messages: parsed
            // biome-ignore lint/suspicious/noExplicitAny: parsed message object
            .filter((p: any) => !existingMessageIds.has(p.raw.id))
            // biome-ignore lint/suspicious/noExplicitAny: parsed message object
            .map((p: any) => {
              const isOutbound =
                p.content.from.email.toLowerCase() === account.external_id.toLowerCase();
              return {
                externalId: p.raw.id,
                direction: isOutbound ? ("out" as const) : ("in" as const),
                bodyText: p.content.text || null,
                bodyHtml: p.content.html || null,
                sentAt: p.content.date.toISOString(),
                metadata: {
                  subject: p.content.subject,
                  from: p.content.from,
                  to: p.content.to,
                  labels: p.raw.labelIds ?? [],
                  messageId: p.content.messageId,
                  references: p.content.references,
                },
              };
            }),
        });
      }
    }

    return {
      fetchedCount,
      newHistoryId: nextHistoryId,
      threads,
      toDeleteExternalThreadIds,
      deletedMessages,
    };
  },
};
