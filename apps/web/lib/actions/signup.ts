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

  // Bootstrap channel placeholders so the dashboard knows what to surface.
  const { data: workspace } = await supabase
    .from("workspaces")
    .select("id")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (workspace?.id && answers.channelsPicked.length) {
    const rows = answers.channelsPicked
      .filter((kind) =>
        ["gmail", "instagram", "whatsapp", "slack", "discord"].includes(kind)
      )
      .map((kind) => ({
        workspace_id: workspace.id as string,
        kind,
        external_id: `pending:${kind}`,
        display_name: null,
        status: "pending",
      }));
    if (rows.length) {
      await supabase.from("channel_accounts").upsert(rows, {
        onConflict: "workspace_id,kind,external_id",
        ignoreDuplicates: true,
      });
    }
  }

  revalidatePath("/app", "layout");
}
