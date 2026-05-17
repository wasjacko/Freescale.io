"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getValidAccessToken, sendGmailMessage, getMessageMetadata } from "@/lib/gmail";

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
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié.");

  // Load the conversation with everything we need to route the reply
  const { data: conv } = await supabase
    .from("conversations")
    .select(
      "id, workspace_id, external_thread_id, subject, channel_account_id, contacts(email, display_name)"
    )
    .eq("id", conversationId)
    .single();
  if (!conv) throw new Error("Conversation introuvable.");

  // Load profile (for the From display name) and channel account (for tokens)
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle();

  let channelKind: string | null = null;
  let externalId: string | null = null;
  let encryptedTokens: string | null = null;
  if (conv.channel_account_id) {
    const { data: account } = await supabase
      .from("channel_accounts")
      .select("kind, external_id, encrypted_tokens, status")
      .eq("id", conv.channel_account_id)
      .single();
    if (account) {
      channelKind = account.kind as string;
      externalId = account.external_id as string;
      encryptedTokens = account.encrypted_tokens as string | null;
    }
  }

  const now = new Date().toISOString();

  // ─── Gmail send path ────────────────────────────────────────────────
  if (channelKind === "gmail" && encryptedTokens && externalId) {
    // Resolve a fresh access token (refresh if expired) and persist any
    // rotated token blob.
    const tokenInfo = await getValidAccessToken(encryptedTokens);
    if (tokenInfo.updatedBlob) {
      await supabase
        .from("channel_accounts")
        .update({ encrypted_tokens: tokenInfo.updatedBlob })
        .eq("id", conv.channel_account_id as string);
    }

    // Find the latest inbound message in this thread to anchor the reply.
    // Pull Message-ID from our stored metadata if we have it; otherwise
    // fetch it on the fly from Gmail.
    const { data: lastMsg } = await supabase
      .from("messages")
      .select("external_id, metadata")
      .eq("conversation_id", conversationId)
      .order("sent_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    let inReplyTo: string | undefined;
    let references: string[] = [];
    if (lastMsg) {
      const meta = (lastMsg.metadata ?? {}) as { messageId?: string; references?: string[] };
      if (meta.messageId) {
        inReplyTo = meta.messageId;
        references = [...(meta.references ?? []), meta.messageId];
      } else if (lastMsg.external_id) {
        try {
          const headers = await getMessageMetadata(
            tokenInfo.accessToken,
            lastMsg.external_id as string,
            ["Message-Id", "References"]
          );
          if (headers["message-id"]) {
            inReplyTo = headers["message-id"];
            const refRaw = headers["references"] ?? "";
            references = [
              ...refRaw.split(/\s+/).filter((s) => s.startsWith("<") && s.endsWith(">")),
              headers["message-id"],
            ];
          }
        } catch {
          // best-effort
        }
      }
    }

    const contact = (conv.contacts ?? null) as { email?: string; display_name?: string } | null;
    const subject = conv.subject
      ? /^re:/i.test(conv.subject)
        ? conv.subject
        : `Re: ${conv.subject}`
      : "Re:";

    const sendOpts: Parameters<typeof sendGmailMessage>[1] = {
      from: { name: profile?.full_name ?? null, email: externalId },
      to: { name: contact?.display_name ?? null, email: contact?.email ?? "" },
      subject,
      body: trimmed,
    };
    if (conv.external_thread_id) sendOpts.threadId = conv.external_thread_id as string;
    if (inReplyTo) sendOpts.inReplyTo = inReplyTo;
    if (references.length) sendOpts.references = references;
    const sent = await sendGmailMessage(tokenInfo.accessToken, sendOpts);

    await supabase.from("messages").insert({
      conversation_id: conversationId,
      workspace_id: conv.workspace_id,
      direction: "out",
      external_id: sent.id,
      body_text: trimmed,
      sent_at: now,
      metadata: {
        subject,
        from: { name: profile?.full_name ?? null, email: externalId },
        to: contact?.email ? [contact.email] : [],
        messageId: sent.messageId,
      },
    });
    await supabase
      .from("conversations")
      .update({
        preview: trimmed.slice(0, 140).replace(/\s+/g, " ").trim(),
        last_message_at: now,
        ...(sent.threadId && conv.external_thread_id !== sent.threadId
          ? { external_thread_id: sent.threadId }
          : {}),
      })
      .eq("id", conversationId);

    revalidatePath("/app", "layout");
    return;
  }

  // ─── Local-only path (other channels still mock) ────────────────────
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
      preview: trimmed.slice(0, 140).replace(/\s+/g, " ").trim(),
      last_message_at: now,
    })
    .eq("id", conversationId);

  revalidatePath("/app", "layout");
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
