import type { Database } from "@/lib/supabase/database.types";

export const MUE_SOLO_ACTION_LIMIT = 50;
export const TRIAL_LENGTH_DAYS = 14;

export type PlanTier = Database["public"]["Enums"]["plan_tier"];
export type PaidPlan = Exclude<PlanTier, "free">;
export type BillingInterval = "monthly" | "yearly";
export type TrialStatus = "none" | "active" | "expired" | "paid";

export type CheckoutPriceResolution = {
  envKey: string;
  priceId: string | null;
};

export function getMueUsageLimit(plan: PlanTier): number | null {
  return plan === "free" ? MUE_SOLO_ACTION_LIMIT : null;
}

export function resolveCheckoutPriceId({
  plan,
  interval,
  env = process.env,
}: {
  plan: PaidPlan;
  interval: BillingInterval;
  env?: Record<string, string | undefined>;
}): CheckoutPriceResolution {
  const envKey = `STRIPE_${plan.toUpperCase()}_${interval === "monthly" ? "MONTHLY" : "YEARLY"}_PRICE_ID`;
  return { envKey, priceId: env[envKey] ?? null };
}

export function getTrialState({
  plan,
  trialEndsAt,
  now = new Date(),
}: {
  plan: PlanTier;
  trialEndsAt: string | null;
  now?: Date;
}): { status: TrialStatus; daysRemaining: number | null } {
  if (plan !== "free") return { status: "paid", daysRemaining: null };
  if (!trialEndsAt) return { status: "none", daysRemaining: null };

  const trialEnd = new Date(trialEndsAt);
  if (Number.isNaN(trialEnd.getTime())) return { status: "none", daysRemaining: null };

  const diffMs = trialEnd.getTime() - now.getTime();
  if (diffMs <= 0) return { status: "expired", daysRemaining: 0 };

  return {
    status: "active",
    daysRemaining: Math.max(1, Math.ceil(diffMs / 86_400_000)),
  };
}

export function formatPlanLabel(plan: PlanTier): string {
  if (plan === "team") return "Team";
  if (plan === "pro") return "Pro";
  return "Solo";
}
