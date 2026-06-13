import { describe, expect, it, vi } from "vitest";
import {
  CHANNEL_PROVIDER_REGISTRY,
  channelProviderLabel,
  isEmailLikeChannel,
  isProviderReady,
  syncableChannelKinds,
} from "./registry";

// Mock server-only for Vitest runtime compatibility
vi.mock("server-only", () => ({}));

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

describe("channel provider registry", () => {
  it("marks Gmail and Outlook as email-like sync providers", () => {
    expect(isEmailLikeChannel("gmail")).toBe(true);
    expect(isEmailLikeChannel("outlook")).toBe(true);
    expect(syncableChannelKinds()).toContain("gmail");
    expect(syncableChannelKinds()).toContain("outlook");
    expect(syncableChannelKinds()).toContain("slack");
    expect(syncableChannelKinds()).toContain("linkedin");
  });

  it("marks configured messagers as ready", () => {
    expect(isProviderReady("slack")).toBe(true);
    expect(isProviderReady("linkedin")).toBe(true);
    expect(isProviderReady("whatsapp")).toBe(true);
  });

  it("has a public label for every registered provider", () => {
    for (const provider of CHANNEL_PROVIDER_REGISTRY) {
      expect(channelProviderLabel(provider.kind)).toBe(provider.label);
    }
  });
});
