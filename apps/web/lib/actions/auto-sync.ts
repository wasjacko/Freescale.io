"use server";

import { syncChannel } from "@/lib/actions/connections";
import { isSyncableChannel } from "@/lib/channels/registry";
import { createClient } from "@/lib/supabase/server";
import { getActiveWorkspaceId } from "@/lib/workspace";
import { revalidatePath } from "next/cache";

/**
 * Trigger background syncs on every channel that hasn't refreshed in a while.
 * Called from the client on /app mount and on visibility-change. Cheap when
 * everything is fresh (a single query), still tens of seconds on a real sync.
 * Sync sequentially so each provider can refresh tokens and write safely.
 */
export async function autoSyncStaleChannels(staleAfterMs = 5 * 60_000): Promise<{
  ran: number;
  newMessages: number;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ran: 0, newMessages: 0 };

  const workspaceId = await getActiveWorkspaceId(supabase, user.id);
  if (!workspaceId) return { ran: 0, newMessages: 0 };

  const { data: accounts } = await supabase
    .from("channel_accounts")
    .select("id, kind, last_synced_at, status")
    .eq("workspace_id", workspaceId)
    .eq("status", "active")
    .not("encrypted_tokens", "is", null);

  const now = Date.now();
  const stale = (accounts ?? []).filter((a) => {
    if (!a.last_synced_at) return true;
    return now - new Date(a.last_synced_at as string).getTime() > staleAfterMs;
  });

  let totalNew = 0;
  for (const account of stale) {
    if (!isSyncableChannel(account.kind as string)) continue;
    try {
      const report = await syncChannel(account.id as string);
      totalNew += report.newMessages;
    } catch (err) {
      console.error("auto-sync failed for", account.id, err);
    }
  }

  if (totalNew > 0) {
    revalidatePath("/app", "layout");
  }
  return { ran: stale.length, newMessages: totalNew };
}
