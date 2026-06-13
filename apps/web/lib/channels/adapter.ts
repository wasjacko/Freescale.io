import type { ChannelId } from "@/lib/types";

export interface NormalizedMessage {
  externalId: string;
  direction: "in" | "out";
  bodyText: string | null;
  bodyHtml: string | null;
  sentAt: string;
  metadata: Record<string, unknown>;
}

export interface NormalizedThread {
  externalThreadId: string;
  contactEmail: string;
  contactName: string;
  subject: string;
  preview: string;
  lastMessageAt: string;
  unreadCount: number;
  messages: NormalizedMessage[];
}

export interface SyncResult {
  fetchedCount: number;
  newHistoryId: string | null;
  threads: NormalizedThread[];
  toDeleteExternalThreadIds?: string[]; // External thread IDs of conversations to delete (e.g. moved out of inbox)
  deletedMessages?: string[]; // external IDs of messages to delete
}

export interface ChannelAdapter {
  kind: ChannelId;

  /** Build OAuth URL or starting path to begin authorization */
  buildAuthUrl(state: string): string;

  /** Exchange code for credentials blob and metadata */
  exchangeCode(code: string): Promise<{
    encryptedTokens: string;
    externalId: string;
    displayName: string;
  }>;

  /** Refresh the current credentials blob */
  refreshTokens(encryptedTokens: string): Promise<{
    accessToken: string;
    updatedBlob?: string | null;
  }>;

  /**
   * Run a full or incremental sync with the provider.
   * Renders the provider API data and formats it into normalized structures.
   */
  sync(params: {
    accessToken: string;
    storedHistoryId: string | null;
    account: {
      id: string;
      external_id: string;
      workspace_id: string;
    };
    existingMessageIds: Set<string>;
    existingThreadMap: Map<string, string>;
  }): Promise<SyncResult>;

  /** Send a message on this channel */
  sendMessage(params: {
    accessToken: string;
    externalThreadId: string;
    text: string;
    subject?: string | undefined;
    toEmail?: string | undefined;
    replyToMessageId?: string | undefined;
  }): Promise<{ externalId: string }>;
}
