"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

/**
 * Toggle a conversation's starred state. Star is purely user-facing
 * (the UI shows a gold ⭐ in the conv row); it has no impact on sync
 * or AI behaviour. Persisted on the conversations row directly.
 */
export async function toggleConversationStar(
  conversationId: string,
  starred: boolean
): Promise<{ ok: boolean; error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "unauthenticated" };

  const { error } = await supabase
    .from("conversations")
    .update({ starred })
    .eq("id", conversationId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/app", "layout");
  return { ok: true, error: null };
}

/**
 * Snooze a conversation until a future moment. The inbox query
 * filters out rows where snoozed_until > now(), so the user stops
 * seeing the thread until that time. Pass null to un-snooze.
 *
 * The label parameter is purely cosmetic — the caller passes the
 * human-readable description so the toast can confirm what just
 * happened ("Snoozed until tomorrow morning").
 */
export async function snoozeConversation(
  conversationId: string,
  until: string | null
): Promise<{ ok: boolean; error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "unauthenticated" };

  const { error } = await supabase
    .from("conversations")
    .update({ snoozed_until: until })
    .eq("id", conversationId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/app", "layout");
  return { ok: true, error: null };
}

/**
 * Manual category assignment. Mue's classifier writes this column
 * automatically (see classifyAllUncategorized), but the user can
 * override / correct it from the conv's right-click menu.
 *
 * Setting category to null clears it (the conv becomes "à trier"
 * again and Mue can re-classify it on the next triage run).
 *
 * `category_confidence` is forced to 1.0 on manual override so the
 * row is treated as ground-truth and Mue won't auto-overwrite it.
 */
export async function setConversationCategory(
  conversationId: string,
  category: "client" | "promo" | "notif" | "other" | null
): Promise<{ ok: boolean; error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "unauthenticated" };

  const { error } = await supabase
    .from("conversations")
    .update({
      category,
      category_confidence: category === null ? null : 1.0,
    })
    .eq("id", conversationId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/app", "layout");
  return { ok: true, error: null };
}

/**
 * Replace the full tag set on a conversation. Tags are normalized to
 * lowercase trimmed strings of 1-24 chars; duplicates are dropped.
 * Passing an empty array clears all tags.
 */
export async function setConversationTags(
  conversationId: string,
  tags: string[]
): Promise<{ ok: boolean; tags: string[]; error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, tags: [], error: "unauthenticated" };

  const normalized = Array.from(
    new Set(tags.map((t) => t.trim().toLowerCase()).filter((t) => t.length > 0 && t.length <= 24))
  ).slice(0, 12);

  const { error } = await supabase
    .from("conversations")
    .update({ tags: normalized })
    .eq("id", conversationId);
  if (error) return { ok: false, tags: [], error: error.message };
  revalidatePath("/app", "layout");
  return { ok: true, tags: normalized, error: null };
}

/**
 * Bulk-apply an action to many conversations at once. Used by the
 * inbox's bulk-select mode: archive all, mark all read, snooze all, etc.
 */
export async function bulkConversationAction(
  conversationIds: string[],
  action: "archive" | "mark-read" | "mark-unread" | "star" | "unstar" | "snooze",
  snoozeUntilIso?: string | null
): Promise<{ ok: boolean; count: number; error: string | null }> {
  if (conversationIds.length === 0) {
    return { ok: true, count: 0, error: null };
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, count: 0, error: "unauthenticated" };

  let patch: Record<string, unknown> = {};
  switch (action) {
    case "archive":
      patch = { archived: true };
      break;
    case "mark-read":
      patch = { unread_count: 0 };
      break;
    case "mark-unread":
      patch = { unread_count: 1 };
      break;
    case "star":
      patch = { starred: true };
      break;
    case "unstar":
      patch = { starred: false };
      break;
    case "snooze":
      patch = { snoozed_until: snoozeUntilIso ?? null };
      break;
  }

  const { error } = await supabase.from("conversations").update(patch).in("id", conversationIds);
  if (error) return { ok: false, count: 0, error: error.message };
  revalidatePath("/app", "layout");
  return { ok: true, count: conversationIds.length, error: null };
}
