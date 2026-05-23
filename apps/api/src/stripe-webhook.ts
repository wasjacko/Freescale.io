type StripeMetadata = Record<string, string | undefined>;

type StripeObject = {
  id?: string;
  customer?: string | { id?: string };
  subscription?: string | { id?: string };
  status?: string;
  current_period_end?: number;
  metadata?: StripeMetadata;
};

export type StripeWebhookEvent = {
  type: string;
  data?: {
    object?: StripeObject;
  };
};

export type ProfileUpdate = {
  match: { column: "id" | "stripe_customer_id"; value: string };
  values: {
    billing_period_end?: string | null;
    billing_status?: string;
    plan?: "free" | "pro" | "team";
    stripe_customer_id?: string;
    stripe_subscription_id?: string | null;
    trial_ends_at?: string | null;
  };
};

type StripeSignatureParts = {
  timestamp: number;
  signatures: string[];
};

function parseStripeSignatureHeader(header: string | null): StripeSignatureParts | null {
  if (!header) return null;

  const parts = header.split(",").reduce(
    (acc, part) => {
      const [key, value] = part.split("=");
      if (key === "t" && value) acc.timestamp = Number(value);
      if (key === "v1" && value) acc.signatures.push(value);
      return acc;
    },
    { timestamp: Number.NaN, signatures: [] as string[] }
  );

  if (!Number.isFinite(parts.timestamp) || parts.signatures.length === 0) return null;
  return parts;
}

function timingSafeEqual(left: string, right: string): boolean {
  if (left.length !== right.length) return false;

  let diff = 0;
  for (let i = 0; i < left.length; i++) {
    diff |= left.charCodeAt(i) ^ right.charCodeAt(i);
  }
  return diff === 0;
}

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

export async function verifyStripeSignature(
  rawBody: string,
  signatureHeader: string | null,
  webhookSecret: string,
  toleranceSeconds = 300,
  nowSeconds = Math.floor(Date.now() / 1000)
): Promise<boolean> {
  const parsed = parseStripeSignatureHeader(signatureHeader);
  if (!parsed || !webhookSecret) return false;
  if (Math.abs(nowSeconds - parsed.timestamp) > toleranceSeconds) return false;

  const expected = await hmacSha256Hex(webhookSecret, `${parsed.timestamp}.${rawBody}`);
  return parsed.signatures.some((signature) => timingSafeEqual(signature, expected));
}

function stringId(value: StripeObject["customer"]): string | null {
  if (typeof value === "string" && value) return value;
  if (value && typeof value === "object" && typeof value.id === "string") return value.id;
  return null;
}

function normalizePlan(value: string | undefined): "free" | "pro" | "team" | null {
  if (value === "free" || value === "pro" || value === "team") return value;
  if (value === "solo") return "free";
  return null;
}

function periodEndToIso(value: number | undefined): string | null {
  if (!value || !Number.isFinite(value)) return null;
  return new Date(value * 1000).toISOString();
}

export function buildProfileUpdateForStripeEvent(event: StripeWebhookEvent): ProfileUpdate | null {
  const object = event.data?.object;
  if (!object) return null;

  if (event.type === "checkout.session.completed") {
    const userId = object.metadata?.user_id;
    const customerId = stringId(object.customer);
    const subscriptionId = stringId(object.subscription);
    const plan = normalizePlan(object.metadata?.plan) ?? "pro";
    if (!userId || !customerId) return null;

    return {
      match: { column: "id", value: userId },
      values: {
        billing_status: subscriptionId ? "active" : "checkout_completed",
        plan,
        stripe_customer_id: customerId,
        stripe_subscription_id: subscriptionId,
        trial_ends_at: null,
      },
    };
  }

  if (
    event.type === "customer.subscription.created" ||
    event.type === "customer.subscription.updated"
  ) {
    const customerId = stringId(object.customer);
    const plan = normalizePlan(object.metadata?.plan);
    if (!customerId) return null;

    return {
      match: { column: "stripe_customer_id", value: customerId },
      values: {
        billing_period_end: periodEndToIso(object.current_period_end),
        billing_status: object.status ?? "unknown",
        ...(plan ? { plan } : {}),
        stripe_subscription_id: object.id ?? null,
      },
    };
  }

  if (event.type === "customer.subscription.deleted") {
    const customerId = stringId(object.customer);
    if (!customerId) return null;

    return {
      match: { column: "stripe_customer_id", value: customerId },
      values: {
        billing_period_end: periodEndToIso(object.current_period_end),
        billing_status: object.status ?? "canceled",
        plan: "free",
        stripe_subscription_id: null,
      },
    };
  }

  return null;
}
