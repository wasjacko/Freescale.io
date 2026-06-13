import { describe, expect, it } from "vitest";
import {
  MUE_SOLO_ACTION_LIMIT,
  getMueUsageLimit,
  getTrialState,
  resolveCheckoutPriceId,
} from "./billing";

describe("billing helpers", () => {
  it("limits Mue actions on the free solo plan and leaves paid plans unlimited", () => {
    expect(MUE_SOLO_ACTION_LIMIT).toBe(50);
    expect(getMueUsageLimit("free")).toBe(50);
    expect(getMueUsageLimit("pro")).toBeNull();
    expect(getMueUsageLimit("team")).toBeNull();
  });

  it("resolves the configured Stripe price for a paid plan and billing interval", () => {
    const env = {
      STRIPE_PRO_MONTHLY_PRICE_ID: "price_pro_monthly",
      STRIPE_PRO_YEARLY_PRICE_ID: "price_pro_yearly",
      STRIPE_TEAM_MONTHLY_PRICE_ID: "price_team_monthly",
      STRIPE_SOLO_MONTHLY_PRICE_ID: "price_solo_monthly",
    };

    expect(resolveCheckoutPriceId({ plan: "pro", interval: "monthly", env })).toEqual({
      envKey: "STRIPE_PRO_MONTHLY_PRICE_ID",
      priceId: "price_pro_monthly",
    });
    expect(resolveCheckoutPriceId({ plan: "pro", interval: "yearly", env })).toEqual({
      envKey: "STRIPE_PRO_YEARLY_PRICE_ID",
      priceId: "price_pro_yearly",
    });
    expect(resolveCheckoutPriceId({ plan: "team", interval: "yearly", env })).toEqual({
      envKey: "STRIPE_TEAM_YEARLY_PRICE_ID",
      priceId: null,
    });
    expect(resolveCheckoutPriceId({ plan: "free", interval: "monthly", env })).toEqual({
      envKey: "STRIPE_SOLO_MONTHLY_PRICE_ID",
      priceId: "price_solo_monthly",
    });
  });

  it("computes trial countdown state from the profile trial end date", () => {
    const now = new Date("2026-05-22T08:00:00.000Z");

    expect(
      getTrialState({
        plan: "free",
        trialEndsAt: "2026-05-25T07:00:00.000Z",
        billingStatus: "trialing",
        now,
      })
    ).toEqual({ daysRemaining: 3, status: "active" });

    expect(
      getTrialState({
        plan: "free",
        trialEndsAt: "2026-05-21T08:00:00.000Z",
        billingStatus: "trial_expired",
        now,
      })
    ).toEqual({ daysRemaining: 0, status: "expired" });

    expect(
      getTrialState({
        plan: "pro",
        trialEndsAt: "2026-05-21T08:00:00.000Z",
        now,
      })
    ).toEqual({ daysRemaining: null, status: "paid" });

    expect(
      getTrialState({
        plan: "free",
        trialEndsAt: "2026-05-21T08:00:00.000Z",
        billingStatus: "active",
        now,
      })
    ).toEqual({ daysRemaining: null, status: "paid" });
  });
});
