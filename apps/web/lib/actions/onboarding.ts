"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

/**
 * Soft profiling answers — saved inline in /app via the OnboardingChips
 * component. Non-blocking by design (each question is skippable, the
 * whole card is dismissable). When the user clicks "Terminer" or
 * "Plus tard", we mark profile.onboarded_at so the card never resurfaces.
 *
 * Audit alignment: 3 short questions max, collected AFTER first value
 * (the user has already seen their inbox), each answer stored as a
 * single string on profiles. No multi-step wizard, no blocking gate.
 */
export type OnboardingAnswers = {
  role?: string | null;
  objective?: string | null;
  usageMode?: string | null;
};

export async function saveOnboardingAnswers(
  answers: OnboardingAnswers
): Promise<{ ok: boolean; error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "unauthenticated" };

  // Build the update payload — only include keys the user actually
  // touched. NULL means "skipped"; we still want to mark them as
  // onboarded so we stop nagging.
  const payload: Record<string, unknown> = {
    onboarded_at: new Date().toISOString(),
  };
  if (answers.role !== undefined) payload.role = answers.role || null;
  if (answers.objective !== undefined) payload.objective = answers.objective || null;
  if (answers.usageMode !== undefined) payload.usage_mode = answers.usageMode || null;

  const { error } = await supabase.from("profiles").update(payload).eq("id", user.id);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/app", "layout");
  return { ok: true, error: null };
}

/**
 * Dismiss without saving any answers — just marks onboarded so the
 * card doesn't reappear. The user can still fill in role/objective/
 * usage_mode later via /app/settings/profile.
 */
export async function dismissOnboarding(): Promise<{
  ok: boolean;
  error: string | null;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "unauthenticated" };

  const { error } = await supabase
    .from("profiles")
    .update({ onboarded_at: new Date().toISOString() })
    .eq("id", user.id);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/app", "layout");
  return { ok: true, error: null };
}
