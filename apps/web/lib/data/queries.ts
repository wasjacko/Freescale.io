import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { CalEvent, ChannelId, Conversation, Message, Task, UpcomingEvent } from "@/lib/types";
import {
  adaptCalendarEvent,
  adaptConversation,
  adaptMessage,
  adaptTask,
  adaptUpcoming,
} from "./adapters";

export type ConnectedChannel = {
  id: string;
  kind: ChannelId;
  displayName: string;
  conversationCount: number;
  unreadCount: number;
  status: "active" | "needs_reauth" | string;
  lastSyncError: string | null;
};

export type InboxData = {
  workspaceId: string | null;
  conversations: Conversation[];
  messagesByConv: Record<string, Message[]>;
  tasks: Task[];
  events: CalEvent[];
  upcoming: UpcomingEvent[];
  channels: ConnectedChannel[];
};

export async function getCurrentWorkspaceId(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("workspaces")
    .select("id")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  return (data?.id as string | null) ?? null;
}

export async function getInboxData(): Promise<InboxData> {
  const supabase = await createClient();
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) {
    return {
      workspaceId: null,
      conversations: [],
      messagesByConv: {},
      tasks: [],
      events: [],
      upcoming: [],
      channels: [],
    };
  }

  // Inbox SELECT — kept to columns guaranteed by the init schema, so the
  // query NEVER fails because of an unapplied migration. The optional
  // feature columns (category, snoozed_until, tags) are fetched in a
  // separate best-effort query below and merged client-side; if they
  // don't exist in the user's Supabase yet, the inbox still loads
  // without those features instead of returning empty.
  //
  // Background: 0823b7b → df836e9 → 3ec84cb tried to fix "no Gmail
  // channel after connect" by stripping last_sync_error from the
  // channel SELECT. That fixed ONE missing column, but category /
  // snoozed_until / tags can be missing too on the same DB — any one
  // of them rejects the WHOLE SELECT and the inbox goes empty.
  const [convsRes, tasksRes, eventsRes, channelsRes] = await Promise.all([
    supabase
      .from("conversations")
      .select(
        "id, preview, subject, last_message_at, unread_count, archived, starred, contacts(display_name, avatar_url, email), channel_accounts(kind)"
      )
      .eq("workspace_id", workspaceId)
      .eq("archived", false)
      .order("last_message_at", { ascending: false })
      .limit(150),
    supabase
      .from("tasks")
      .select(
        "id, title, status, priority, due_at, parent_task_id, sortable_index, conversations(contacts(display_name, avatar_url), channel_accounts(kind))"
      )
      .eq("workspace_id", workspaceId)
      .neq("status", "done")
      // Manual order first (sortable_index), with due_at as tiebreaker so
      // newly-created tasks still surface by their deadline when the user
      // hasn't reordered yet.
      .order("sortable_index", { ascending: true, nullsFirst: false })
      .order("due_at", { ascending: true, nullsFirst: false })
      .limit(50),
    supabase
      .from("calendar_events")
      .select("id, title, starts_at, ends_at, channel")
      .eq("workspace_id", workspaceId)
      .order("starts_at", { ascending: true })
      .limit(100),
    supabase
      .from("channel_accounts")
      // last_sync_error / last_sync_error_at are added by migration
      // 20260518140000 — NOT included in the SELECT so the inbox query
      // doesn't crash when that migration hasn't been applied to prod.
      // The SyncErrorBanner only needs `status` to trigger the
      // needs_reauth CTA, which is on the original init schema.
      .select("id, kind, display_name, external_id, status")
      .eq("workspace_id", workspaceId)
      .in("status", ["active", "needs_reauth"])
      .not("encrypted_tokens", "is", null)
      .order("connected_at", { ascending: true }),
  ]);

  const convs = (convsRes.data ?? []) as Record<string, unknown>[];

  // Best-effort second query for the optional feature columns. If the
  // user's Supabase has applied the relevant migrations, we merge the
  // extras into each conv row by id; if PostgREST rejects it because
  // a column is missing, we skip merging and the adapter falls back
  // to safe defaults (category=null, snoozedUntilIso=null, tags=[]).
  // This way the inbox loads regardless of migration state, and
  // features re-activate automatically once migrations are applied.
  if (convs.length > 0) {
    const ids = convs.map((c) => c.id as string);
    const { data: extras, error: extrasErr } = await supabase
      .from("conversations")
      .select("id, category, snoozed_until, tags")
      .in("id", ids);
    if (!extrasErr && extras) {
      const extrasById = new Map<string, Record<string, unknown>>();
      for (const e of extras as Record<string, unknown>[]) {
        extrasById.set(e.id as string, e);
      }
      const now = new Date();
      for (const c of convs) {
        const ex = extrasById.get(c.id as string);
        if (ex) {
          c.category = ex.category;
          c.snoozed_until = ex.snoozed_until;
          c.tags = ex.tags;
        }
      }
      // Client-side snooze filter — only applied when the column was
      // actually returned (otherwise the field is undefined and the
      // conv stays visible, which is what we want pre-migration).
      const visible = convs.filter((c) => {
        const su = c.snoozed_until as string | null | undefined;
        if (!su) return true;
        return new Date(su) <= now;
      });
      convs.length = 0;
      convs.push(...visible);
    }
  }

  const conversations = convs.map(adaptConversation);

  let messagesByConv: Record<string, Message[]> = {};
  if (convs.length) {
    const convIdSet = new Set(convs.map((c) => c.id as string));
    // CRITICAL: do NOT use .in("conversation_id", [N UUIDs]) here. With
    // 100+ conversations the URL crosses PostgREST's request-line limit
    // (~4 KB) and Supabase silently returns an empty array — the right
    // panel goes blank even though messages are in the table. Fetching
    // by workspace_id instead keeps the URL tiny, and we filter to the
    // visible-conversation set in memory below.
    const { data: msgs } = await supabase
      .from("messages")
      .select("id, conversation_id, direction, body_text, body_html, sent_at, metadata")
      .eq("workspace_id", workspaceId)
      .order("sent_at", { ascending: true });
    // Build a lookup of contact email → avatar_url so we can stamp each
    // inbound email with its sender's avatar (gravatar / favicon).
    const contactByEmail = new Map<string, string>();
    for (const c of convs) {
      const contact = (c.contacts ?? null) as Record<string, unknown> | null;
      const email = (contact?.email as string)?.toLowerCase();
      const avatar = contact?.avatar_url as string | null;
      if (email && avatar) contactByEmail.set(email, avatar);
    }

    messagesByConv = ((msgs ?? []) as Record<string, unknown>[]).reduce<Record<string, Message[]>>(
      (acc, row) => {
        const cid = row.conversation_id as string;
        // Drop messages whose conversation isn't in the top-150 page.
        if (!convIdSet.has(cid)) return acc;
        const msg = adaptMessage(row);
        if (msg.senderEmail) {
          const avatar = contactByEmail.get(msg.senderEmail.toLowerCase());
          if (avatar) msg.senderAvatarUrl = avatar;
        }
        const list = acc[cid] ?? [];
        list.push(msg);
        acc[cid] = list;
        return acc;
      },
      {}
    );
  }

  const tasks = ((tasksRes.data ?? []) as Record<string, unknown>[]).map(adaptTask);

  // Calendar grid renders the current week (Sun..Sat), starting at the most recent Sunday.
  const now = new Date();
  const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
  const eventRows = (eventsRes.data ?? []) as Record<string, unknown>[];
  const events = eventRows
    .map((row) => adaptCalendarEvent(row, weekStart))
    .filter((e): e is CalEvent => e !== null);

  const upcoming = eventRows
    .filter((row) => new Date(row.starts_at as string) > now)
    .slice(0, 4)
    .map(adaptUpcoming);

  // Per-channel rollup so the sidebar can show real counts of what's actually
  // connected. We could push this into Postgres (count() group by), but the
  // conversation set we already loaded is small enough to bucket in-memory.
  const channelAccounts = (channelsRes.data ?? []) as Record<string, unknown>[];
  const channels: ConnectedChannel[] = channelAccounts.map((acc) => {
    const kind = (acc.kind as ChannelId) ?? "gmail";
    const convsForKind = conversations.filter((c) => c.channel === kind);
    return {
      id: acc.id as string,
      kind,
      displayName: (acc.display_name as string) || (acc.external_id as string) || kind,
      conversationCount: convsForKind.length,
      unreadCount: convsForKind.filter((c) => c.unread).length,
      status: (acc.status as string) ?? "active",
      // Column is added by migration 20260518140000 — we no longer
      // request it (see SELECT above). The SyncErrorBanner falls back
      // to its needs_reauth code path which only needs `status`.
      lastSyncError: null,
    };
  });

  return {
    workspaceId,
    conversations,
    messagesByConv,
    tasks,
    events,
    upcoming,
    channels,
  };
}
