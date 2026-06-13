"use server";

import { runChannelSync } from "@/lib/channels/engine";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export type SyncReport = {
  fetched: number;
  newConversations: number;
  newMessages: number;
  errors: string[];
};

export async function syncGmail(channelAccountId: string): Promise<SyncReport> {
  return runChannelSync(channelAccountId);
}

export async function syncOutlook(channelAccountId: string): Promise<SyncReport> {
  return runChannelSync(channelAccountId);
}

export async function syncChannel(channelAccountId: string): Promise<SyncReport> {
  return runChannelSync(channelAccountId);
}

export async function disconnectChannel(channelAccountId: string): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");
  await supabase
    .from("channel_accounts")
    .update({ status: "revoked", encrypted_tokens: null })
    .eq("id", channelAccountId);
  revalidatePath("/app", "layout");
}
