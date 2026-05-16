"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type SignupAnswers = {
  firstName: string;
  role: string;
  channelsPicked: string[];
  dailyVolume: string;
  topPain: string;
};

/**
 * Called right after the auth provider creates the session. Persists the
 * value-first signup answers on the user's profile + bootstraps placeholder
 * channel accounts. Idempotent: re-running it just refreshes the columns.
 */
export async function applySignupAnswers(answers: SignupAnswers): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const firstName = answers.firstName.trim() || null;
  await supabase
    .from("profiles")
    .update({
      ...(firstName ? { full_name: firstName } : {}),
      role: answers.role || null,
      daily_volume: answers.dailyVolume || null,
      top_pain: answers.topPain || null,
      channels_picked: answers.channelsPicked.length ? answers.channelsPicked : null,
      onboarded_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  // Intent (which channels the user wants to plug in) is captured in
  // profiles.channels_picked. We deliberately do NOT pre-create rows in
  // channel_accounts: that table is the source of truth for *actually linked*
  // accounts and any placeholder there would lie to the UI.

  revalidatePath("/app", "layout");
}
