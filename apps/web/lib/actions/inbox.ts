"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function markConversationRead(conversationId: string) {
  const supabase = await createClient();
  await supabase
    .from("conversations")
    .update({ unread_count: 0 })
    .eq("id", conversationId);
  revalidatePath("/");
}

export async function markConversationUnread(conversationId: string) {
  const supabase = await createClient();
  await supabase
    .from("conversations")
    .update({ unread_count: 1 })
    .eq("id", conversationId);
  revalidatePath("/");
}

export async function archiveConversation(conversationId: string) {
  const supabase = await createClient();
  await supabase
    .from("conversations")
    .update({ archived: true })
    .eq("id", conversationId);
  revalidatePath("/");
}

export async function toggleConversationStar(conversationId: string, starred: boolean) {
  const supabase = await createClient();
  await supabase
    .from("conversations")
    .update({ starred })
    .eq("id", conversationId);
  revalidatePath("/");
}

export async function sendMessage(conversationId: string, text: string) {
  const trimmed = text.trim();
  if (!trimmed) return;
  const supabase = await createClient();
  const { data: conv } = await supabase
    .from("conversations")
    .select("workspace_id")
    .eq("id", conversationId)
    .single();
  if (!conv) return;
  const now = new Date().toISOString();
  await supabase.from("messages").insert({
    conversation_id: conversationId,
    workspace_id: conv.workspace_id,
    direction: "out",
    body_text: trimmed,
    sent_at: now,
  });
  await supabase
    .from("conversations")
    .update({
      preview: trimmed.slice(0, 80),
      last_message_at: now,
    })
    .eq("id", conversationId);
  revalidatePath("/");
}

export async function toggleTaskDone(taskId: string, done: boolean) {
  const supabase = await createClient();
  await supabase
    .from("tasks")
    .update({
      status: done ? "done" : "todo",
      completed_at: done ? new Date().toISOString() : null,
    })
    .eq("id", taskId);
  revalidatePath("/");
}
