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

  it("keeps recurring job alerts out of client conversations", () => {
    expect(
      quickClassify({
        fromEmail: "alerte@meteojob.com",
        subject: "20+ nouvelles offres reperees pour vous",
        preview: "Alternance Webdesigner selon vos criteres.",
      })
    ).toBe("notif");

    expect(
      quickClassify({
        fromEmail: "hello@emplois-trabajo.org",
        subject: "10 nouvelles offres d'Alternance",
        preview: "Des entreprises recrutent aujourd'hui.",
      })
    ).toBe("notif");
  });

  it("routes clear French retail discounts to promotions", () => {
    expect(
      quickClassify({
        fromEmail: "prive@zalando.fr",
        subject: "Jusqu'a 75% de remise",
        preview: "Mode, chaussures et maison.",
      })
    ).toBe("promo");
  });
});
