"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type OnboardingPayload = {
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  channelPick: string;
  importHistory: string;
  shared: boolean;
};

export async function saveProfileStep(firstName: string, lastName: string, avatarUrl: string | null) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const fullName = [firstName, lastName].filter(Boolean).join(" ").trim() || null;
  await supabase
    .from("profiles")
    .update({
      full_name: fullName,
      ...(avatarUrl ? { avatar_url: avatarUrl } : {}),
    })
    .eq("id", user.id);
  revalidatePath("/onboarding");
}

export async function completeOnboarding(payload: OnboardingPayload) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const fullName =
    [payload.firstName, payload.lastName].filter(Boolean).join(" ").trim() || null;

  await supabase
    .from("profiles")
    .update({
      full_name: fullName,
      ...(payload.avatarUrl ? { avatar_url: payload.avatarUrl } : {}),
      onboarded_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  revalidatePath("/", "layout");
}
