import { describe, expect, it } from "vitest";
import { quickClassify } from "./triage-rules";

describe("quickClassify", () => {
  it("routes transactional no-reply messages to notifications", () => {
    expect(
      quickClassify({
        fromEmail: "noreply@stripe.com",
        subject: "Invoice paid for May",
        preview: "Your receipt is attached.",
      })
    ).toBe("notif");
  });

  it("lets promotional subjects override a no-reply sender", () => {
    expect(
      quickClassify({
        fromEmail: "no-reply@brand.com",
        subject: "Black Friday sale -50%",
        preview: "The offer ends tonight.",
      })
    ).toBe("promo");
  });

  it("detects newsletters from unsubscribe signals", () => {
    expect(
      quickClassify({
        fromEmail: "team@studio.com",
        subject: "Weekly product digest",
        preview: "View in browser or unsubscribe from this newsletter.",
      })
    ).toBe("promo");
  });

  it("keeps ordinary human messages in the client bucket", () => {
    expect(
      quickClassify({
        fromEmail: "sarah@acme.com",
        subject: "Thoughts on the landing page",
        preview: "Can we make the headline a bit shorter?",
      })
    ).toBe("client");
  });
});
