import type { ChannelId } from "../types";
import type { ChannelAdapter, SyncResult } from "./adapter";

export class UnipileAdapter implements ChannelAdapter {
  constructor(public kind: ChannelId) {}

  buildAuthUrl(state: string): string {
    const baseUrl = process.env.UNIPILE_API_URL || "https://api1.unipile.com";
    // Hosted flow to link a new messaging account using Unipile
    return `${baseUrl}/api/v1/users/link?provider=${this.kind}&state=${state}`;
  }

  async exchangeCode(code: string) {
    // Unipile links return an account_id representing the connected account
    return {
      encryptedTokens: JSON.stringify({ account_id: code }),
      externalId: `unipile_${this.kind}_${code}`,
      displayName: `Unipile ${this.kind.toUpperCase()}`,
    };
  }

  async refreshTokens(encryptedTokens: string) {
    const parsed = JSON.parse(encryptedTokens);
    return {
      accessToken: parsed.account_id as string,
    };
  }

  async sendMessage(params: {
    accessToken: string;
    externalThreadId: string;
    text: string;
  }) {
    const baseUrl = process.env.UNIPILE_API_URL || "https://api1.unipile.com";
    const apiKey = process.env.UNIPILE_API_KEY;

    if (!apiKey) {
      // Stub response for development/testing
      return { externalId: `mock_unipile_msg_${Date.now()}` };
    }

    const response = await fetch(`${baseUrl}/api/v1/chats/${params.externalThreadId}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-KEY": apiKey,
      },
      body: JSON.stringify({
        text: params.text,
      }),
    });

    if (!response.ok) {
      throw new Error(`Unipile send message failed: ${response.statusText}`);
    }

    const data = await response.json();
    return { externalId: data.message_id || `unipile_${Date.now()}` };
  }

  async sync(params: Parameters<ChannelAdapter["sync"]>[0]): Promise<SyncResult> {
    const { accessToken, existingMessageIds, existingThreadMap } = params;
    const baseUrl = process.env.UNIPILE_API_URL || "https://api1.unipile.com";
    const apiKey = process.env.UNIPILE_API_KEY;

    if (!apiKey) {
      // In development/test mode without API keys, return an empty sync
      return {
        fetchedCount: 0,
        newHistoryId: null,
        threads: [],
      };
    }

    // 1. Fetch conversations from Unipile
    const chatResponse = await fetch(`${baseUrl}/api/v1/chats?account_id=${accessToken}`, {
      headers: { "X-API-KEY": apiKey },
    });
    if (!chatResponse.ok) {
      throw new Error(`Failed to fetch Unipile chats: ${chatResponse.statusText}`);
    }
    const chatData = await chatResponse.json();
    const chats = chatData.items || [];

    const threads = [];

    // 2. Fetch and normalize messages for each chat
    for (const chat of chats) {
      const chatMessagesResponse = await fetch(
        `${baseUrl}/api/v1/chats/${chat.id}/messages?limit=20`,
        { headers: { "X-API-KEY": apiKey } }
      );
      if (!chatMessagesResponse.ok) continue;
      const msgData = await chatMessagesResponse.json();
      const rawMessages = msgData.items || [];

      const messages = rawMessages
        // biome-ignore lint/suspicious/noExplicitAny: Unipile message representation
        .map((m: any) => ({
          externalId: m.id,
          direction: m.sender_type === "user" ? ("out" as const) : ("in" as const),
          bodyText: m.text || null,
          bodyHtml: null,
          sentAt: m.timestamp || new Date().toISOString(),
          metadata: {
            unipile_message: m,
          },
        }))
        // biome-ignore lint/suspicious/noExplicitAny: Unipile message representation
        .filter((m: any) => !existingMessageIds.has(m.externalId));

      if (messages.length === 0 && existingThreadMap.has(chat.id)) {
        continue;
      }

      threads.push({
        externalThreadId: chat.id,
        contactEmail: chat.recipient_id || `chat_${chat.id}@unipile.local`,
        contactName: chat.name || chat.recipient_name || "Contact",
        subject: `Conversation ${this.kind}`,
        preview: chat.preview || "Nouveau message",
        lastMessageAt: chat.updated_at || new Date().toISOString(),
        unreadCount: chat.unread_count || 0,
        messages,
      });
    }

    return {
      fetchedCount: chats.length,
      newHistoryId: null,
      threads,
    };
  }
}
