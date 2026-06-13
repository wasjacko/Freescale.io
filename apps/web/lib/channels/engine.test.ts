import { beforeEach, describe, expect, it, vi } from "vitest";
import { createClient } from "../supabase/server";
import { runChannelSync } from "./engine";
import { getChannelAdapter } from "./registry-server";

vi.mock("../supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("./registry-server", () => ({
  getChannelAdapter: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/encryption", () => ({
  decryptJSON: vi.fn(),
  encryptJSON: vi.fn(),
}));

vi.mock("@/lib/app-url", () => ({
  appUrl: vi.fn(),
}));

vi.mock("@/lib/outlook-normalize", () => ({
  mapOutlookMessage: vi.fn(),
}));

vi.mock("server-only", () => ({}));

describe("Sync Engine", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // biome-ignore lint/suspicious/noExplicitAny: mock data representation
  const createMockChain = (data: any, error: any = null) => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      upsert: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      single: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockReturnThis(),
      // biome-ignore lint/suspicious/noThenProperty: mock thenable for Supabase query chaining
      then: vi.fn().mockImplementation((resolve) => resolve({ data, error })),
    };
    return chain;
  };

  it("handles an empty sync report successfully", async () => {
    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user_123" } } }),
      },
      from: vi.fn(),
    };
    // biome-ignore lint/suspicious/noExplicitAny: mock method injection
    (createClient as any).mockResolvedValue(mockSupabase);

    const mockAdapter = {
      kind: "gmail",
      refreshTokens: vi.fn().mockResolvedValue({ accessToken: "access_123" }),
      sync: vi.fn().mockResolvedValue({
        fetchedCount: 0,
        newHistoryId: "hist_101",
        threads: [],
      }),
    };
    // biome-ignore lint/suspicious/noExplicitAny: mock method injection
    (getChannelAdapter as any).mockReturnValue(mockAdapter);

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === "channel_accounts") {
        return createMockChain({
          id: "acct_123",
          workspace_id: "work_123",
          encrypted_tokens: "tokens_blob",
          external_id: "test@example.com",
          history_id: "hist_100",
          kind: "gmail",
        });
      }
      return createMockChain([]);
    });

    const report = await runChannelSync("acct_123");

    expect(mockAdapter.refreshTokens).toHaveBeenCalledWith("tokens_blob");
    expect(mockAdapter.sync).toHaveBeenCalled();
    expect(report.fetched).toBe(0);
    expect(report.newConversations).toBe(0);
    expect(report.newMessages).toBe(0);
    expect(report.errors).toHaveLength(0);
  });

  it("handles a normal sync with new conversations and messages", async () => {
    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user_123" } } }),
      },
      from: vi.fn(),
    };
    // biome-ignore lint/suspicious/noExplicitAny: mock method injection
    (createClient as any).mockResolvedValue(mockSupabase);

    const mockAdapter = {
      kind: "gmail",
      refreshTokens: vi.fn().mockResolvedValue({ accessToken: "access_123" }),
      sync: vi.fn().mockResolvedValue({
        fetchedCount: 1,
        newHistoryId: "hist_102",
        threads: [
          {
            externalThreadId: "thread_456",
            contactEmail: "client@example.com",
            contactName: "Jean Client",
            subject: "Abonnement",
            preview: "Bonjour...",
            lastMessageAt: "2026-05-22T08:00:00.000Z",
            unreadCount: 1,
            messages: [
              {
                externalId: "msg_789",
                direction: "in",
                bodyText: "Bonjour...",
                bodyHtml: null,
                sentAt: "2026-05-22T08:00:00.000Z",
                metadata: {},
              },
            ],
          },
        ],
      }),
    };
    // biome-ignore lint/suspicious/noExplicitAny: mock method injection
    (getChannelAdapter as any).mockReturnValue(mockAdapter);

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === "channel_accounts") {
        return createMockChain({
          id: "acct_123",
          workspace_id: "work_123",
          encrypted_tokens: "tokens_blob",
          external_id: "test@example.com",
          history_id: "hist_100",
          kind: "gmail",
        });
      }
      if (table === "conversations") {
        // Return empty on select (so conversation is treated as new),
        // but return inserted conversation when insert is called.
        const chain = createMockChain([]);
        chain.insert = vi.fn().mockImplementation(() => {
          // biome-ignore lint/suspicious/noThenProperty: mock thenable for Supabase query chaining
          chain.then = vi.fn().mockImplementation((resolve) =>
            resolve({
              data: [{ id: "conv_999", external_thread_id: "thread_456" }],
              error: null,
            })
          );
          return chain;
        });
        return chain;
      }
      if (table === "contacts") {
        return createMockChain([{ id: "contact_111", email: "client@example.com" }]);
      }
      return createMockChain([]);
    });

    const report = await runChannelSync("acct_123");

    expect(report.fetched).toBe(1);
    expect(report.newConversations).toBe(1);
    expect(report.newMessages).toBe(1);
    expect(report.errors).toHaveLength(0);
  });
});
