import { describe, expect, it } from "vitest";
import {
  canAssignConversation,
  canConnectChannels,
  canInviteTeammates,
  canManageWorkspace,
  extractMentionHandles,
  formatActivityEvent,
  normalizeInviteEmail,
  normalizeWorkspaceName,
  roleAllowed,
} from "./collaboration";

describe("collaboration helpers", () => {
  it("normalizes workspace names without accepting empty labels", () => {
    expect(normalizeWorkspaceName("  Agence   Freescale  ")).toBe("Agence Freescale");
    expect(normalizeWorkspaceName("    ")).toBe(null);
    expect(normalizeWorkspaceName("x".repeat(90))).toHaveLength(64);
  });

  it("normalizes invite emails", () => {
    expect(normalizeInviteEmail("  SARAH@Example.COM ")).toBe("sarah@example.com");
    expect(normalizeInviteEmail("not-an-email")).toBe(null);
  });

  it("enforces default collaboration permissions by role", () => {
    expect(canManageWorkspace("owner")).toBe(true);
    expect(canManageWorkspace("admin")).toBe(false);
    expect(canInviteTeammates("admin")).toBe(true);
    expect(canInviteTeammates("member")).toBe(false);
    expect(canConnectChannels("admin")).toBe(true);
    expect(canConnectChannels("member")).toBe(false);
    expect(canAssignConversation("member")).toBe(true);
  });

  it("supports owner-configured granular role gates", () => {
    expect(roleAllowed("member", ["owner", "admin"])).toBe(false);
    expect(roleAllowed("member", ["owner", "member"])).toBe(true);
    expect(roleAllowed("owner", [])).toBe(true);
  });

  it("extracts unique mention handles from internal notes", () => {
    expect(extractMentionHandles("Ping @Sarah.L, @mike and @Sarah.L demain.")).toEqual([
      "sarah.l",
      "mike",
    ]);
  });

  it("formats activity events for the timeline", () => {
    expect(formatActivityEvent("assigned", "Alex", { assigneeName: "Sarah" })).toBe(
      "Alex a assigné la conversation à Sarah."
    );
    expect(formatActivityEvent("note_created", "Alex", {})).toBe("Alex a ajouté une note interne.");
    expect(formatActivityEvent("unknown", "Alex", {})).toBe("Alex a mis à jour la conversation.");
  });
});
