import "server-only";
import { createClient } from "@/lib/supabase/server";
import {
  adaptConversation,
  adaptMessage,
  adaptTask,
  adaptCalendarEvent,
  adaptUpcoming,
} from "./adapters";
import type { CalEvent, ChannelId, Conversation, Message, Task, UpcomingEvent } from "@/lib/types";

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

  const [convsRes, tasksRes, eventsRes, channelsRes] = await Promise.all([
    supabase
      .from("conversations")
      .select(
        "id, preview, subject, last_message_at, unread_count, archived, category, starred, snoozed_until, tags, contacts(display_name, avatar_url, email), channel_accounts(kind)"
      )
      .eq("workspace_id", workspaceId)
      .eq("archived", false)
      // Hide snoozed convs whose snoozed_until is still in the future.
      // Postgres treats null in `or` as "doesn't match", so we explicitly
      // include rows where snoozed_until is null.
      .or(`snoozed_until.is.null,snoozed_until.lt.${new Date().toISOString()}`)
      .order("last_message_at", { ascending: false })
      .limit(150),
    supabase
      .from("tasks")
      .select(
        "id, title, status, priority, due_at, conversations(contacts(display_name, avatar_url), channel_accounts(kind))"
      )
      .eq("workspace_id", workspaceId)
      .neq("status", "done")
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
      .select("id, kind, display_name, external_id, status, last_sync_error")
      .eq("workspace_id", workspaceId)
      .in("status", ["active", "needs_reauth"])
      .not("encrypted_tokens", "is", null)
      .order("connected_at", { ascending: true }),
  ]);

  const convs = (convsRes.data ?? []) as Record<string, unknown>[];
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
        const list = acc[cid] ?? (acc[cid] = []);
        list.push(msg);
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
      displayName:
        (acc.display_name as string) || (acc.external_id as string) || kind,
      conversationCount: convsForKind.length,
      unreadCount: convsForKind.filter((c) => c.unread).length,
      status: (acc.status as string) ?? "active",
      lastSyncError: (acc.last_sync_error as string | null) ?? null,
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
