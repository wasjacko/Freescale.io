import "server-only";
import { createClient } from "@/lib/supabase/server";
import {
  adaptConversation,
  adaptMessage,
  adaptTask,
  adaptCalendarEvent,
  adaptUpcoming,
} from "./adapters";
import type { CalEvent, Conversation, Message, Task, UpcomingEvent } from "@/lib/types";

export type InboxData = {
  workspaceId: string | null;
  conversations: Conversation[];
  messagesByConv: Record<string, Message[]>;
  tasks: Task[];
  events: CalEvent[];
  upcoming: UpcomingEvent[];
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
    };
  }

  const [convsRes, tasksRes, eventsRes] = await Promise.all([
    supabase
      .from("conversations")
      .select(
        "id, preview, subject, last_message_at, unread_count, archived, contacts(display_name, avatar_url, email), channel_accounts(kind)"
      )
      .eq("workspace_id", workspaceId)
      .eq("archived", false)
      .order("last_message_at", { ascending: false })
      .limit(50),
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
  ]);

  const convs = (convsRes.data ?? []) as Record<string, unknown>[];
  const conversations = convs.map(adaptConversation);

  let messagesByConv: Record<string, Message[]> = {};
  if (convs.length) {
    const convIds = convs.map((c) => c.id as string);
    const { data: msgs } = await supabase
      .from("messages")
      .select("id, conversation_id, direction, body_text, sent_at, metadata")
      .in("conversation_id", convIds)
      .order("sent_at", { ascending: true });
    messagesByConv = ((msgs ?? []) as Record<string, unknown>[]).reduce<Record<string, Message[]>>(
      (acc, row) => {
        const cid = row.conversation_id as string;
        const list = acc[cid] ?? (acc[cid] = []);
        list.push(adaptMessage(row));
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

  return { workspaceId, conversations, messagesByConv, tasks, events, upcoming };
}
