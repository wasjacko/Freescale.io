import { describe, expect, it } from "vitest";
import type { Conversation } from "./types";
import {
  awaitingMyReply,
  isAwaitingMyReply,
  isFollowupDue,
  relationalUrgency,
  sortByUrgency,
} from "./urgency";

const hAgo = (h: number) => new Date(Date.now() - h * 3_600_000).toISOString();

const conv = (over: Partial<Conversation>): Conversation => ({
  id: "x",
  name: "X",
  preview: "",
  lastAtIso: hAgo(1),
  avatar: { kind: "initials", text: "X", bg: "#eee" },
  channel: "gmail",
  group: "today",
  ...over,
});

describe("relationalUrgency", () => {
  it("un client qui attend ma réponse passe avant une notif", () => {
    const client = conv({ category: "client", lastInboundAt: hAgo(3), lastOutboundAt: hAgo(10) });
    const notif = conv({ category: "notif", lastAtIso: hAgo(1) });
    expect(isAwaitingMyReply(client)).toBe(true);
    expect(relationalUrgency(client)).toBeGreaterThan(relationalUrgency(notif));
  });

  it("détecte une relance due quand la balle traîne dans leur camp", () => {
    const c = conv({ category: "client", lastOutboundAt: hAgo(72), lastInboundAt: hAgo(120) });
    expect(isFollowupDue(c)).toBe(true);
    expect(isAwaitingMyReply(c)).toBe(false);
  });

  it("un fil snoozé coule tout en bas", () => {
    const hot = conv({ category: "client", lastInboundAt: hAgo(2), lastOutboundAt: hAgo(20) });
    const snoozed = conv({
      category: "client",
      lastInboundAt: hAgo(2),
      snoozedUntilIso: new Date(Date.now() + 3_600_000).toISOString(),
    });
    expect(relationalUrgency(hot)).toBeGreaterThan(relationalUrgency(snoozed));
  });

  it("trie le plus urgent en premier, sans muter l'entrée", () => {
    const notif = conv({ id: "n", category: "notif", lastAtIso: hAgo(1) });
    const client = conv({
      id: "c",
      category: "client",
      lastInboundAt: hAgo(5),
      lastOutboundAt: hAgo(30),
    });
    const input = [notif, client];
    const sorted = sortByUrgency(input);
    expect(sorted[0]?.id).toBe("c");
    expect(input[0]?.id).toBe("n");
  });

  it("awaitingMyReply ne garde que les fils où le client attend", () => {
    const a = conv({
      id: "a",
      category: "client",
      lastInboundAt: hAgo(2),
      lastOutboundAt: hAgo(20),
    });
    const b = conv({
      id: "b",
      category: "client",
      lastOutboundAt: hAgo(2),
      lastInboundAt: hAgo(20),
    });
    const res = awaitingMyReply([a, b]);
    expect(res.map((c) => c.id)).toEqual(["a"]);
  });
});
