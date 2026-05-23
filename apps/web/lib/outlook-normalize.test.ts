import { describe, expect, it } from "vitest";
import {
  buildOutlookAuthorizeUrl,
  mapOutlookMessage,
  normalizeOutlookRecipients,
} from "./outlook-normalize";

describe("outlook normalization", () => {
  it("maps incoming Graph messages into Freescale conversations", () => {
    const mapped = mapOutlookMessage(
      {
        id: "msg-1",
        conversationId: "thread-1",
        subject: "Landing page feedback",
        bodyPreview: "Can we make the CTA stronger?",
        receivedDateTime: "2026-05-22T09:30:00Z",
        isRead: false,
        internetMessageId: "<msg-1@example.com>",
        from: { emailAddress: { name: "Sarah Johnson", address: "sarah@example.com" } },
        toRecipients: [{ emailAddress: { name: "Alex", address: "alex@freescale.site" } }],
        body: {
          contentType: "html",
          content: "<p>Can we make the CTA stronger?</p>",
        },
      },
      "alex@freescale.site"
    );

    expect(mapped).toMatchObject({
      externalId: "msg-1",
      threadId: "thread-1",
      direction: "in",
      contactEmail: "sarah@example.com",
      contactName: "Sarah Johnson",
      subject: "Landing page feedback",
      preview: "Can we make the CTA stronger?",
      unread: true,
      bodyHtml: "<p>Can we make the CTA stronger?</p>",
      metadata: {
        provider: "outlook",
        internetMessageId: "<msg-1@example.com>",
      },
    });
  });

  it("maps outbound Graph messages against the connected mailbox", () => {
    const mapped = mapOutlookMessage(
      {
        id: "msg-2",
        conversationId: "thread-1",
        subject: "Re: Landing page feedback",
        bodyPreview: "Done, I pushed a new version.",
        sentDateTime: "2026-05-22T09:40:00Z",
        isRead: true,
        from: { emailAddress: { name: "Alex", address: "alex@freescale.site" } },
        toRecipients: [{ emailAddress: { name: "Sarah", address: "sarah@example.com" } }],
        body: { contentType: "text", content: "Done, I pushed a new version." },
      },
      "alex@freescale.site"
    );

    expect(mapped.direction).toBe("out");
    expect(mapped.contactEmail).toBe("sarah@example.com");
    expect(mapped.bodyText).toBe("Done, I pushed a new version.");
  });

  it("normalizes recipient objects for Graph sendMail", () => {
    expect(
      normalizeOutlookRecipients([
        { name: "Sarah", email: "sarah@example.com" },
        { name: null, email: "mike@example.com" },
      ])
    ).toEqual([
      { emailAddress: { name: "Sarah", address: "sarah@example.com" } },
      { emailAddress: { address: "mike@example.com" } },
    ]);
  });

  it("builds the Microsoft OAuth authorize URL with offline mail scopes", () => {
    const url = buildOutlookAuthorizeUrl({
      state: "state-123",
      clientId: "client-123",
      redirectUri: "https://freescale.site/auth/outlook/callback",
      tenantId: "common",
    });

    expect(url.origin).toBe("https://login.microsoftonline.com");
    expect(url.pathname).toBe("/common/oauth2/v2.0/authorize");
    expect(url.searchParams.get("client_id")).toBe("client-123");
    expect(url.searchParams.get("state")).toBe("state-123");
    expect(url.searchParams.get("scope")).toContain("offline_access");
    expect(url.searchParams.get("scope")).toContain("Mail.ReadWrite");
    expect(url.searchParams.get("scope")).toContain("Mail.Send");
  });
});
