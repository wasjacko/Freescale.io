import { describe, expect, it } from "vitest";
import { buildProfileUpdateForStripeEvent, verifyStripeSignature } from "./stripe-webhook";

async function hmacSha256Hex(secret: string, payload: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  return [...new Uint8Array(signature)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

describe("Stripe webhook helpers", () => {
  it("accepts a valid Stripe signature", async () => {
    const rawBody = JSON.stringify({ id: "evt_test", type: "checkout.session.completed" });
    const timestamp = 1_779_444_800;
    const secret = "whsec_test_secret";
    const digest = await hmacSha256Hex(secret, `${timestamp}.${rawBody}`);

    await expect(
      verifyStripeSignature(rawBody, `t=${timestamp},v1=${digest}`, secret, 300, timestamp + 60)
    ).resolves.toBe(true);
  });

  it("rejects tampered or stale Stripe signatures", async () => {
    const rawBody = JSON.stringify({ id: "evt_test", type: "checkout.session.completed" });
    const timestamp = 1_779_444_800;
    const secret = "whsec_test_secret";
    const digest = await hmacSha256Hex(secret, `${timestamp}.${rawBody}`);

    await expect(
      verifyStripeSignature(`${rawBody} `, `t=${timestamp},v1=${digest}`, secret, 300, timestamp)
    ).resolves.toBe(false);
    await expect(
      verifyStripeSignature(rawBody, `t=${timestamp},v1=${digest}`, secret, 300, timestamp + 600)
    ).resolves.toBe(false);
  });

  it("maps subscription updates to a profile patch by Stripe customer", () => {
    const periodEnd = Date.parse("2026-05-22T08:00:00.000Z") / 1000;

    expect(
      buildProfileUpdateForStripeEvent({
        type: "customer.subscription.updated",
        data: {
          object: {
            id: "sub_123",
            customer: "cus_123",
            status: "active",
            current_period_end: periodEnd,
            metadata: { plan: "pro" },
          },
        },
      })
    ).toEqual({
      match: { column: "stripe_customer_id", value: "cus_123" },
      values: {
        billing_period_end: "2026-05-22T08:00:00.000Z",
        billing_status: "active",
        plan: "pro",
        stripe_subscription_id: "sub_123",
      },
    });
  });
});
