import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import type { MobileApiVariables } from "./mobile/auth";
import { createMobileRoutes } from "./mobile/routes";
import {
  type ProfileUpdate,
  type StripeWebhookEvent,
  buildProfileUpdateForStripeEvent,
  verifyStripeSignature,
} from "./stripe-webhook";

type Env = {
  ENVIRONMENT: string;
  ANTHROPIC_API_KEY: string;
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  STRIPE_WEBHOOK_SECRET: string;
};

const app = new Hono<{ Bindings: Env; Variables: MobileApiVariables }>();

app.use("*", logger());
app.use("*", cors({ origin: ["https://app.freescale.app", "http://localhost:3000"] }));

app.get("/", (c) => c.json({ name: "freescale-api", status: "ok" }));
app.get("/health", (c) => c.json({ ok: true, env: c.env.ENVIRONMENT }));
app.route("/v1", createMobileRoutes<Env>());

async function patchProfileFromWebhook(
  env: Env,
  profileUpdate: ProfileUpdate
): Promise<{ ok: boolean; error: string | null }> {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    return { ok: false, error: "missing Supabase service env" };
  }

  const url = new URL("/rest/v1/profiles", env.SUPABASE_URL);
  url.searchParams.set(profileUpdate.match.column, `eq.${profileUpdate.match.value}`);

  const response = await fetch(url.toString(), {
    method: "PATCH",
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify(profileUpdate.values),
  });

  if (!response.ok) {
    const body = await response.text();
    return { ok: false, error: body || `Supabase ${response.status}` };
  }

  return { ok: true, error: null };
}

// Webhooks
app.post("/webhooks/gmail", (c) => c.json({ todo: "gmail webhook" }));
app.post("/webhooks/slack", (c) => c.json({ todo: "slack webhook" }));
app.post("/webhooks/stripe", async (c) => {
  const rawBody = await c.req.text();
  const signature = c.req.header("stripe-signature") ?? null;
  const webhookSecret = c.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    return c.json({ error: "missing Stripe webhook secret" }, 500);
  }

  const verified = await verifyStripeSignature(rawBody, signature, webhookSecret);
  if (!verified) {
    return c.json({ error: "invalid Stripe signature" }, 400);
  }

  let event: StripeWebhookEvent;
  try {
    event = JSON.parse(rawBody) as StripeWebhookEvent;
  } catch {
    return c.json({ error: "invalid Stripe payload" }, 400);
  }

  const profileUpdate = buildProfileUpdateForStripeEvent(event);
  if (!profileUpdate) {
    return c.json({ received: true, ignored: event.type });
  }

  const patched = await patchProfileFromWebhook(c.env, profileUpdate);
  if (!patched.ok) {
    return c.json({ error: patched.error }, 502);
  }

  return c.json({
    received: true,
    matched: profileUpdate.match.column,
    event: event.type,
  });
});

// Mue endpoints (to be implemented)
app.post("/mue/chat", (c) => c.json({ todo: "mue chat" }));
app.post("/mue/summarize", (c) => c.json({ todo: "mue summarize" }));

export default app;
