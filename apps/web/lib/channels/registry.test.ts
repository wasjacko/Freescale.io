import { describe, expect, it } from "vitest";
import {
  CHANNEL_PROVIDER_REGISTRY,
  channelProviderLabel,
  isEmailLikeChannel,
  isProviderReady,
  syncableChannelKinds,
} from "./registry";

describe("channel provider registry", () => {
  it("marks Gmail and Outlook as email-like sync providers", () => {
    expect(isEmailLikeChannel("gmail")).toBe(true);
    expect(isEmailLikeChannel("outlook")).toBe(true);
    expect(syncableChannelKinds()).toEqual(["gmail", "outlook"]);
  });

  it("keeps social providers visible but not ready until credentials exist", () => {
    expect(isProviderReady("slack")).toBe(false);
    expect(isProviderReady("linkedin")).toBe(false);
    expect(isProviderReady("whatsapp")).toBe(false);
  });

  it("has a public label for every registered provider", () => {
    for (const provider of CHANNEL_PROVIDER_REGISTRY) {
      expect(channelProviderLabel(provider.kind)).toBe(provider.label);
    }
  });
});
