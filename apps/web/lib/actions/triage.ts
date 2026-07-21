"use server";

import { createClient } from "@/lib/supabase/server";
import { type Category as RuleCategory, quickClassify } from "@/lib/triage-rules";
import { getActiveWorkspaceId } from "@/lib/workspace";
import Anthropic from "@anthropic-ai/sdk";
import { revalidatePath } from "next/cache";

/**
 * Mue Triage — classify each conversation into one of four buckets so the
 * inbox can default to "clients only" and bury the noise (newsletters,
 * notifications) behind dedicated tabs.
 *
 * Strategy: batch-classify uncategorised conversations. Each API call
 * processes up to BATCH_SIZE conversations, giving Claude their sender
 * + subject + preview, and getting back JSON. Cap is set so a typical
 * input fits well under the model's context — bodies are bounded to
 * 300 chars each to keep token cost predictable.
 *
 * Categories:
 *  - client: real-human correspondence (customers, partners, vendors,
 *    colleagues, friends). What the user actually wants to see.
 *  - promo: marketing, newsletters, sales pitches.
 *  - notif: transactional / automated (receipts, alerts, password
 *    resets, GitHub notifs, calendar invites).
 *  - other: doesn't fit cleanly.
 */

export type Category = RuleCategory;

/**
 * Fast deterministic triage — runs the rule-based quickClassify on every
 * uncategorized conv in the user's workspace and writes the result in
 * bulk. No external API, no env vars, runs in ~100ms for 500 convs.
 *
 * Designed to be called automatically when the user first opens the
 * inbox with uncategorized mail — fills the tabs immediately. Mue's
 * LLM classifier (classifyAllUncategorized) is still available via the
 * ✨ button for users who want to refine the ambiguous cases.
 */
export async function triageHeuristic(): Promise<{
  classified: number;
  byCategory: Record<Category, number>;
  errors: string[];
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {
      classified: 0,
      byCategory: {
        client: 0,
        prospect: 0,
        prestataire: 0,
        collaborateur: 0,
        promo: 0,
        notif: 0,
        other: 0,
      },
      errors: ["unauthenticated"],
    };
  }

  const workspaceId = await getActiveWorkspaceId(supabase, user.id);
  if (!workspaceId) {
    return {
      classified: 0,
      byCategory: {
        client: 0,
        prospect: 0,
        prestataire: 0,
        collaborateur: 0,
        promo: 0,
        notif: 0,
        other: 0,
      },
      errors: ["no workspace"],
    };
  }

  // Pull uncategorized convs. If the category column doesn't exist yet
  // (migration 20260517180000 not applied), the .is() throws and we
  // surface a clear error instead of looping forever.
  const { data: convs, error: convErr } = await supabase
    .from("conversations")
    .select("id, subject, preview, contacts(display_name, email)")
    .eq("workspace_id", workspaceId)
    .is("category", null)
    .limit(500);
  if (convErr) {
    return {
      classified: 0,
      byCategory: {
        client: 0,
        prospect: 0,
        prestataire: 0,
        collaborateur: 0,
        promo: 0,
        notif: 0,
        other: 0,
      },
      errors: [`SELECT failed: ${convErr.message} (migration 20260517180000 may not be applied)`],
    };
  }
  if (!convs?.length) {
    return {
      classified: 0,
      byCategory: {
        client: 0,
        prospect: 0,
        prestataire: 0,
        collaborateur: 0,
        promo: 0,
        notif: 0,
        other: 0,
      },
      errors: [],
    };
  }

  // Classify in-memory, then bulk-write per category (4 UPDATEs max).
  const byCategory: Record<Category, string[]> = {
    client: [],
    prospect: [],
    prestataire: [],
    collaborateur: [],
    promo: [],
    notif: [],
    other: [],
  };
  for (const c of convs) {
    const contact = Array.isArray(c.contacts) ? c.contacts[0] : c.contacts;
    const cat = quickClassify({
      fromEmail: (contact?.email as string) ?? "",
      subject: (c.subject as string) ?? "",
      preview: (c.preview as string) ?? "",
    });
    byCategory[cat].push(c.id as string);
  }

  const errors: string[] = [];
  let classified = 0;
  for (const cat of ["client", "promo", "notif", "other"] as Category[]) {
    const ids = byCategory[cat];
    if (ids.length === 0) continue;
    const { error: upErr } = await supabase
      .from("conversations")
      .update({ category: cat, category_confidence: 0.6 })
      .in("id", ids);
    if (upErr) {
      errors.push(`${cat}: ${upErr.message}`);
    } else {
      classified += ids.length;
    }
  }

  revalidatePath("/app", "layout");
  return {
    classified,
    byCategory: {
      client: byCategory.client.length,
      prospect: byCategory.prospect.length,
      prestataire: byCategory.prestataire.length,
      collaborateur: byCategory.collaborateur.length,
      promo: byCategory.promo.length,
      notif: byCategory.notif.length,
      other: byCategory.other.length,
    },
    errors,
  };
}

const SYSTEM_PROMPT = `You triage email conversations for an inbox app. Each conversation gets exactly one category:

- "client"  → real-human correspondence: a customer, prospect, partner, vendor, freelancer, colleague, friend, or family member. Personal tone, back-and-forth potential, name in the From header. THIS IS THE USER'S MOST IMPORTANT BUCKET.
- "promo"   → marketing / newsletters / sales pitches / promotional offers / "you might like…" content. Unsubscribe links visible, broadcast tone.
- "notif"   → transactional or automated: receipts, order confirmations, shipping updates, password resets, 2FA codes, alerts, GitHub/Linear/Notion notifications, calendar invites, system messages from SaaS tools.
- "other"   → doesn't fit cleanly anywhere above.

Bias: if a noreply@ / no-reply@ / notification@ / hello@brand sender writes pure broadcast or templated content, it is NOT client. Real client correspondence comes from named individuals at non-mass-mailer addresses.

For each input conversation, return ONE object: {"id": "<the conv id you were given>", "category": "client"|"promo"|"notif"|"other"}.

Return ONLY a JSON array of those objects, in the same order as input. No prose, no markdown fences.`;

type ConvInput = {
  id: string;
  fromName: string;
  fromEmail: string;
  subject: string;
  preview: string;
};

const BATCH_SIZE = 20;

function buildAnthropicClient(): Anthropic | null {
  const baseUrl = process.env.ANTHROPIC_BASE_URL;
  const authToken = process.env.ANTHROPIC_AUTH_TOKEN;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!authToken && !apiKey) return null;
  return new Anthropic({
    ...(baseUrl ? { baseURL: baseUrl } : {}),
    ...(authToken ? { authToken } : {}),
    ...(apiKey && !authToken ? { apiKey } : {}),
  });
}

async function classifyBatch(
  client: Anthropic,
  model: string,
  batch: ConvInput[]
): Promise<Map<string, Category>> {
  const transcript = batch
    .map(
      (c, i) =>
        `${i + 1}. id="${c.id}"
   From: ${c.fromName || "(no name)"} <${c.fromEmail || "(no email)"}>
   Subject: ${c.subject || "(no subject)"}
   Preview: ${c.preview.slice(0, 300).replace(/\s+/g, " ").trim()}`
    )
    .join("\n\n");

  const out = new Map<string, Category>();

  try {
    const resp = await client.messages.create({
      model,
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Classify these ${batch.length} conversations:\n\n${transcript}\n\nReturn the JSON array now.`,
        },
      ],
    });
    const block = resp.content.find((b) => b.type === "text");
    const raw = block && "text" in block ? block.text : "";
    const cleaned = raw
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```\s*$/i, "")
      .trim();
    const firstBracket = cleaned.indexOf("[");
    const lastBracket = cleaned.lastIndexOf("]");
    const slice =
      firstBracket >= 0 && lastBracket > firstBracket
        ? cleaned.slice(firstBracket, lastBracket + 1)
        : cleaned;
    const parsed = JSON.parse(slice) as Array<{ id: string; category: string }>;
    for (const row of parsed) {
      const cat = row.category as Category;
      if (cat === "client" || cat === "promo" || cat === "notif" || cat === "other") {
        out.set(row.id, cat);
      }
    }
  } catch {
    // Swallow — uncategorized convs in this batch get a default of "other"
    // so they're still triaged (and the user can re-run later).
    for (const c of batch) out.set(c.id, "other");
  }

  return out;
}

export async function classifyAllUncategorized(): Promise<{
  classified: number;
  total: number;
  errors: string[];
}> {
  const client = buildAnthropicClient();
  if (!client) {
    return {
      classified: 0,
      total: 0,
      errors: ["ANTHROPIC_AUTH_TOKEN / ANTHROPIC_API_KEY not set"],
    };
  }
  const model = process.env.ANTHROPIC_MODEL ?? "claude-haiku-4-5-20251001";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { classified: 0, total: 0, errors: ["unauthenticated"] };

  const workspaceId = await getActiveWorkspaceId(supabase, user.id);
  if (!workspaceId) {
    return { classified: 0, total: 0, errors: ["no workspace"] };
  }

  // Pull uncategorised conversations + the data we need to classify them.
  const { data: convs, error: convErr } = await supabase
    .from("conversations")
    .select("id, subject, preview, contacts(display_name, email)")
    .eq("workspace_id", workspaceId)
    .is("category", null)
    .limit(500);

  if (convErr) {
    return { classified: 0, total: 0, errors: [convErr.message] };
  }
  if (!convs?.length) return { classified: 0, total: 0, errors: [] };

  const inputs: ConvInput[] = convs.map((c) => {
    const contact = Array.isArray(c.contacts) ? c.contacts[0] : c.contacts;
    return {
      id: c.id as string,
      fromName: (contact?.display_name as string) ?? "",
      fromEmail: (contact?.email as string) ?? "",
      subject: (c.subject as string) ?? "",
      preview: (c.preview as string) ?? "",
    };
  });

  const errors: string[] = [];
  let classified = 0;

  for (let i = 0; i < inputs.length; i += BATCH_SIZE) {
    const batch = inputs.slice(i, i + BATCH_SIZE);
    const results = await classifyBatch(client, model, batch);

    // Update DB per category — one UPDATE per category × N IDs is cheaper
    // than per-conv writes. The IN list is small (≤ 20 ids per category).
    const byCategory = new Map<Category, string[]>();
    for (const [id, cat] of results) {
      const list = byCategory.get(cat) ?? [];
      list.push(id);
      byCategory.set(cat, list);
    }

    for (const [category, ids] of byCategory) {
      const { error: upErr } = await supabase
        .from("conversations")
        .update({ category })
        .in("id", ids);
      if (upErr) {
        errors.push(`batch ${i} ${category}: ${upErr.message}`);
      } else {
        classified += ids.length;
      }
    }
  }

  revalidatePath("/app", "layout");
  return { classified, total: inputs.length, errors };
}

/**
 * Manually reclassify a single conversation. Used when the user disagrees
 * with Mue's pick and moves a thread between tabs.
 */
export async function setConversationCategory(
  conversationId: string,
  category: Category
): Promise<{ ok: boolean; error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "unauthenticated" };

  const { error } = await supabase
    .from("conversations")
    .update({ category })
    .eq("id", conversationId);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/app", "layout");
  return { ok: true, error: null };
}
