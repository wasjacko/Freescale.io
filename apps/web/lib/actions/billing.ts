"use server";

import { appUrl } from "@/lib/app-url";
import {
  type BillingInterval,
  type PaidPlan,
  type PlanTier,
  formatPlanLabel,
  getMueUsageLimit,
  getTrialState,
  resolveCheckoutPriceId,
} from "@/lib/billing";
import { createClient } from "@/lib/supabase/server";
import Stripe from "stripe";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

type BillingProfile = {
  id: string;
  email: string;
  full_name: string | null;
  plan: PlanTier;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  billing_status: string;
  billing_period_end: string | null;
  trial_ends_at: string | null;
};

export type BillingOverview = {
  billingPeriodEnd: string | null;
  billingStatus: string;
  mueUsage: {
    count: number;
    limit: number | null;
    periodEnd: string | null;
  };
  plan: PlanTier;
  planLabel: string;
  stripeCustomerId: string | null;
  trial: ReturnType<typeof getTrialState>;
};

type BillingContext =
  | {
      ok: true;
      error: null;
      profile: BillingProfile;
      supabase: SupabaseServerClient;
      userId: string;
      workspaceId: string | null;
    }
  | { ok: false; error: string };

async function getBillingContext(): Promise<BillingContext> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "unauthenticated" };

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select(
      "id, email, full_name, plan, stripe_customer_id, stripe_subscription_id, billing_status, billing_period_end, trial_ends_at"
    )
    .eq("id", user.id)
    .maybeSingle();

  if (profileError || !profile) {
    return { ok: false, error: profileError?.message ?? "profile not found" };
  }

  const { data: workspace } = await supabase
    .from("workspaces")
    .select("id")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  return {
    error: null,
    ok: true,
    profile: profile as BillingProfile,
    supabase,
    userId: user.id,
    workspaceId: (workspace?.id as string | undefined) ?? null,
  };
}

function getStripeClient(): { client: Stripe | null; error: string | null } {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    return {
      client: null,
      error: "STRIPE_SECRET_KEY manquant. Configure Stripe avant d'activer le paiement.",
    };
  }

  return { client: new Stripe(secretKey), error: null };
}

async function ensureStripeCustomer({
  profile,
  stripe,
  supabase,
}: {
  profile: BillingProfile;
  stripe: Stripe;
  supabase: SupabaseServerClient;
}): Promise<{ customerId: string | null; error: string | null }> {
  if (profile.stripe_customer_id) return { customerId: profile.stripe_customer_id, error: null };

  try {
    const customerParams: Stripe.CustomerCreateParams = {
      email: profile.email,
      metadata: {
        user_id: profile.id,
      },
    };
    if (profile.full_name) customerParams.name = profile.full_name;

    const customer = await stripe.customers.create(customerParams);

    const { error } = await supabase
      .from("profiles")
      .update({ stripe_customer_id: customer.id })
      .eq("id", profile.id);

    if (error) return { customerId: null, error: error.message };
    return { customerId: customer.id, error: null };
  } catch (err) {
    return {
      customerId: null,
      error: err instanceof Error ? err.message : "Création client Stripe impossible.",
    };
  }
}

export async function getBillingOverview(): Promise<{
  overview: BillingOverview | null;
  error: string | null;
}> {
  const context = await getBillingContext();
  if (!context.ok) return { overview: null, error: context.error };

  const limit = getMueUsageLimit(context.profile.plan);
  let usageCount = 0;
  let usagePeriodEnd: string | null = null;

  if (context.workspaceId) {
    const { data } = await context.supabase
      .from("usage_counters")
      .select("count, period_end")
      .eq("workspace_id", context.workspaceId)
      .eq("user_id", context.userId)
      .eq("key", "mue_action")
      .order("period_start", { ascending: false })
      .limit(1)
      .maybeSingle();

    usageCount = (data?.count as number | undefined) ?? 0;
    usagePeriodEnd = (data?.period_end as string | undefined) ?? null;
  }

  return {
    overview: {
      billingPeriodEnd: context.profile.billing_period_end,
      billingStatus: context.profile.billing_status,
      mueUsage: {
        count: usageCount,
        limit,
        periodEnd: usagePeriodEnd,
      },
      plan: context.profile.plan,
      planLabel: formatPlanLabel(context.profile.plan),
      stripeCustomerId: context.profile.stripe_customer_id,
      trial: getTrialState({
        plan: context.profile.plan,
        trialEndsAt: context.profile.trial_ends_at,
      }),
    },
    error: null,
  };
}

export async function startCheckout(input: {
  interval: BillingInterval;
  plan: PaidPlan;
}): Promise<{ url: string | null; error: string | null }> {
  const context = await getBillingContext();
  if (!context.ok) return { url: null, error: context.error };

  const { priceId, envKey } = resolveCheckoutPriceId({
    plan: input.plan,
    interval: input.interval,
  });
  if (!priceId) {
    return { url: null, error: `${envKey} manquant. Ajoute le Price ID Stripe.` };
  }

  const { client: stripe, error: stripeError } = getStripeClient();
  if (!stripe) return { url: null, error: stripeError };

  const customer = await ensureStripeCustomer({
    profile: context.profile,
    stripe,
    supabase: context.supabase,
  });
  if (!customer.customerId) return { url: null, error: customer.error };

  try {
    const baseUrl = appUrl();
    const session = await stripe.checkout.sessions.create({
      allow_promotion_codes: true,
      cancel_url: `${baseUrl}/pricing?checkout=cancelled`,
      client_reference_id: context.userId,
      customer: customer.customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      metadata: {
        interval: input.interval,
        plan: input.plan,
        user_id: context.userId,
      },
      mode: "subscription",
      subscription_data: {
        metadata: {
          interval: input.interval,
          plan: input.plan,
          user_id: context.userId,
        },
      },
      success_url: `${baseUrl}/app/settings/billing?checkout=success`,
    });

    return { url: session.url, error: session.url ? null : "Stripe n'a pas retourné d'URL." };
  } catch (err) {
    return {
      url: null,
      error: err instanceof Error ? err.message : "Checkout Stripe impossible.",
    };
  }
}

export async function createBillingPortalSession(): Promise<{
  url: string | null;
  error: string | null;
}> {
  const context = await getBillingContext();
  if (!context.ok) return { url: null, error: context.error };

  const { client: stripe, error: stripeError } = getStripeClient();
  if (!stripe) return { url: null, error: stripeError };

  const customer = await ensureStripeCustomer({
    profile: context.profile,
    stripe,
    supabase: context.supabase,
  });
  if (!customer.customerId) return { url: null, error: customer.error };

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: customer.customerId,
      return_url: `${appUrl()}/app/settings/billing`,
    });
    return { url: session.url, error: null };
  } catch (err) {
    return {
      url: null,
      error: err instanceof Error ? err.message : "Portail Stripe indisponible.",
    };
  }
}

export async function consumeMueAction(): Promise<{
  allowed: boolean;
  count: number | null;
  error: string | null;
  limit: number | null;
}> {
  const context = await getBillingContext();
  if (!context.ok) return { allowed: false, count: null, error: context.error, limit: null };
  if (!context.workspaceId) {
    return { allowed: false, count: null, error: "no workspace", limit: null };
  }

  const limit = getMueUsageLimit(context.profile.plan);
  const trial = getTrialState({
    plan: context.profile.plan,
    trialEndsAt: context.profile.trial_ends_at,
  });
  if (trial.status === "expired") {
    return {
      allowed: false,
      count: null,
      error: "Essai terminé. Passez à Pro pour relancer les actions Mue.",
      limit,
    };
  }

  if (limit === null) return { allowed: true, count: null, error: null, limit: null };

  const { data, error } = await context.supabase.rpc("increment_usage_counter", {
    p_key: "mue_action",
    p_limit: limit,
    p_workspace_id: context.workspaceId,
  });

  if (error) {
    // Do not brick Mue during migrations or local setup. Billing UI still
    // exposes the missing counter once the migration is applied.
    return { allowed: true, count: null, error: null, limit };
  }

  const row = Array.isArray(data) ? data[0] : null;
  const count = row?.current_count ?? null;
  if (row?.limited) {
    return {
      allowed: false,
      count,
      error: `Limite Mue atteinte (${limit} actions ce mois-ci). Passez à Pro pour continuer.`,
      limit,
    };
  }

  return { allowed: true, count, error: null, limit };
}
