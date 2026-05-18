"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

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
