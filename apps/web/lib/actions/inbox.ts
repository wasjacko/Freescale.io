"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  getValidAccessToken,
  sendGmailMessage,
  getMessageMetadata,
  type GmailAttachment,
} from "@/lib/gmail";

const MAX_ATTACHMENT_BYTES = 20 * 1024 * 1024; // 20 MB safe (Gmail allows 25 MB total)
const MAX_TOTAL_ATTACHMENTS = 25 * 1024 * 1024;

function parseAddressList(raw: string): Array<{ name: string | null; email: string }> {
  return raw
    .split(/[,;\n]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((entry) => {
      const m = entry.match(/^\s*(?:"?([^"<]+)"?\s*)?<?([^<>\s]+@[^<>\s]+)>?\s*$/);
      return {
        name: m?.[1]?.trim().replace(/^"|"$/g, "") || null,
        email: m?.[2]?.trim() || entry,
      };
    })
    .filter((a) => /@/.test(a.email));
}

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
      to: [{ name: contact?.display_name ?? null, email: contact?.email ?? "" }],
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

/**
 * Email-aware reply with Cc and attachments. Called from the rich composer
 * when the active conversation lives on a Gmail-style channel. Errors throw
 * so the client can render them inline.
 */
export async function sendEmailReply(formData: FormData): Promise<void> {
  const conversationId = String(formData.get("conversationId") ?? "");
  const text = String(formData.get("text") ?? "").trim();
  const ccRaw = String(formData.get("cc") ?? "");
  const cc = parseAddressList(ccRaw);
  if (!conversationId) throw new Error("Conversation manquante.");
  if (!text && !formData.has("files")) throw new Error("Message vide.");

  // Collect files from FormData
  const attachments: GmailAttachment[] = [];
  let totalSize = 0;
  for (const entry of formData.getAll("files")) {
    if (!(entry instanceof File) || entry.size === 0) continue;
    if (entry.size > MAX_ATTACHMENT_BYTES) {
      throw new Error(`Pièce trop lourde : ${entry.name} (max 20 Mo par fichier).`);
    }
    totalSize += entry.size;
    if (totalSize > MAX_TOTAL_ATTACHMENTS) {
      throw new Error("Total des pièces > 25 Mo (limite Gmail).");
    }
    const bytes = Buffer.from(await entry.arrayBuffer());
    attachments.push({
      filename: entry.name || "file",
      mimeType: entry.type || "application/octet-stream",
      bytes,
    });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié.");

  const { data: conv } = await supabase
    .from("conversations")
    .select(
      "id, workspace_id, external_thread_id, subject, channel_account_id, contacts(email, display_name)"
    )
    .eq("id", conversationId)
    .single();
  if (!conv) throw new Error("Conversation introuvable.");
  if (!conv.channel_account_id) throw new Error("Aucun canal lié à cette conversation.");

  const { data: account } = await supabase
    .from("channel_accounts")
    .select("kind, external_id, encrypted_tokens, status")
    .eq("id", conv.channel_account_id)
    .single();
  if (!account || account.kind !== "gmail" || !account.encrypted_tokens) {
    throw new Error("Cette conversation n'est pas branchée à Gmail.");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle();

  const tokenInfo = await getValidAccessToken(account.encrypted_tokens as string);
  if (tokenInfo.updatedBlob) {
    await supabase
      .from("channel_accounts")
      .update({ encrypted_tokens: tokenInfo.updatedBlob })
      .eq("id", conv.channel_account_id as string);
  }

  // Threading: find last message and pull its Message-ID
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
  if (!contact?.email) throw new Error("Pas de destinataire pour cette conversation.");
  const subject = conv.subject
    ? /^re:/i.test(conv.subject as string)
      ? (conv.subject as string)
      : `Re: ${conv.subject}`
    : "Re:";

  const sendOpts: Parameters<typeof sendGmailMessage>[1] = {
    from: { name: profile?.full_name ?? null, email: account.external_id as string },
    to: [{ name: contact.display_name ?? null, email: contact.email }],
    subject,
    body: text,
  };
  if (cc.length) sendOpts.cc = cc;
  if (attachments.length) sendOpts.attachments = attachments;
  if (conv.external_thread_id) sendOpts.threadId = conv.external_thread_id as string;
  if (inReplyTo) sendOpts.inReplyTo = inReplyTo;
  if (references.length) sendOpts.references = references;

  const sent = await sendGmailMessage(tokenInfo.accessToken, sendOpts);

  const now = new Date().toISOString();
  await supabase.from("messages").insert({
    conversation_id: conversationId,
    workspace_id: conv.workspace_id,
    direction: "out",
    external_id: sent.id,
    body_text: text,
    sent_at: now,
    metadata: {
      subject,
      from: { name: profile?.full_name ?? null, email: account.external_id },
      to: [contact.email],
      cc: cc.map((c) => c.email),
      attachments: attachments.map((a) => ({
        filename: a.filename,
        mimeType: a.mimeType,
        size: a.bytes.length,
      })),
      messageId: sent.messageId,
    },
  });
  await supabase
    .from("conversations")
    .update({
      preview: text.slice(0, 140).replace(/\s+/g, " ").trim(),
      last_message_at: now,
      ...(sent.threadId && conv.external_thread_id !== sent.threadId
        ? { external_thread_id: sent.threadId }
        : {}),
    })
    .eq("id", conversationId);

  revalidatePath("/app", "layout");
}

/**
 * Update an existing task — used by the "Edit task" inline editor.
 * Only writes the fields the caller explicitly passes (partial update),
 * so changing just a priority doesn't clobber the title.
 */
export async function updateTask(
  taskId: string,
  input: {
    title?: string;
    description?: string | null;
    priority?: "urgent" | "high" | "medium" | "low";
    due?: string | null;
    status?: "todo" | "in-progress" | "awaiting-reply" | "done";
  }
): Promise<{ ok: boolean; error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "unauthenticated" };

  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (input.title !== undefined) patch.title = input.title.trim();
  if (input.description !== undefined) patch.description = input.description;
  if (input.priority !== undefined) patch.priority = input.priority;
  if (input.status !== undefined) patch.status = input.status;
  if (input.due !== undefined) {
    if (!input.due) patch.due_at = null;
    else if (/^\d{4}-\d{2}-\d{2}$/.test(input.due)) {
      const d = new Date(`${input.due}T23:59:00`);
      patch.due_at = isNaN(d.getTime()) ? null : d.toISOString();
    } else {
      const d = new Date(input.due);
      patch.due_at = isNaN(d.getTime()) ? null : d.toISOString();
    }
  }

  const { error } = await supabase.from("tasks").update(patch).eq("id", taskId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/app", "layout");
  return { ok: true, error: null };
}

export async function deleteTask(
  taskId: string
): Promise<{ ok: boolean; error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "unauthenticated" };

  const { error } = await supabase.from("tasks").delete().eq("id", taskId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/app", "layout");
  return { ok: true, error: null };
}

export async function toggleTaskDone(taskId: string, done: boolean) {
  const supabase = await createClient();
  // Cascade the done state to children. Marking a parent done implies all
  // its subtasks are done too (no half-completed parents). Un-checking a
  // parent leaves children alone — the user explicitly re-opens what they
  // want; some subtasks might genuinely be done while the parent isn't.
  await supabase
    .from("tasks")
    .update({
      status: done ? "done" : "todo",
      completed_at: done ? new Date().toISOString() : null,
    })
    .eq("id", taskId);
  if (done) {
    await supabase
      .from("tasks")
      .update({
        status: "done",
        completed_at: new Date().toISOString(),
      })
      .eq("parent_task_id", taskId);
  }
  revalidatePath("/");
}

/**
 * Persist a manual order for a list of task ids. The caller passes the
 * IDs in their desired display order; we assign monotonically increasing
 * sortable_index values and write them in a single multi-update. We do
 * this in one round-trip via a CTE-style approach using a temp values
 * list — but supabase-js doesn't support that, so we fall back to a
 * loop that batches all updates and awaits Promise.all (still ≤30ms
 * round-trip for ~50 rows).
 */
export async function reorderTasks(
  taskIds: string[]
): Promise<{ ok: boolean; error: string | null }> {
  if (taskIds.length === 0) return { ok: true, error: null };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "unauthenticated" };

  // Step the indexes by 1000 so future inserts between two rows have
  // room to slot in without a full rewrite (LexoRank-lite).
  const base = Date.now();
  const updates = taskIds.map((id, idx) =>
    supabase
      .from("tasks")
      .update({ sortable_index: base + idx * 1000 })
      .eq("id", id)
  );
  const results = await Promise.all(updates);
  const firstErr = results.find((r) => r.error);
  if (firstErr?.error) return { ok: false, error: firstErr.error.message };
  revalidatePath("/app", "layout");
  return { ok: true, error: null };
}

/**
 * Create a task manually from the TasksView "New task" button (or
 * anywhere else that needs a one-off task without Mue context).
 *
 * Resolves the user's workspace via owner_id so we don't need the
 * client to pass it. Returns the new task id on success so callers
 * can do optimistic UI rather than a full refresh if they prefer.
 */
export async function createTask(input: {
  title: string;
  description?: string | null;
  priority?: "urgent" | "high" | "medium" | "low";
  conversationId?: string | null;
  due?: string | null; // ISO date YYYY-MM-DD or full timestamp
  parentTaskId?: string | null;
}): Promise<{ ok: boolean; taskId: string | null; error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, taskId: null, error: "unauthenticated" };

  const title = input.title.trim();
  if (!title) return { ok: false, taskId: null, error: "Title is required." };

  const { data: workspace } = await supabase
    .from("workspaces")
    .select("id")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (!workspace?.id) {
    return { ok: false, taskId: null, error: "no workspace" };
  }

  // Normalise the due date: accept "YYYY-MM-DD" by widening to end-of-day
  // local time (so "due tomorrow" doesn't expire at 00:00 of that day).
  let dueAt: string | null = null;
  if (input.due) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(input.due)) {
      const d = new Date(`${input.due}T23:59:00`);
      dueAt = isNaN(d.getTime()) ? null : d.toISOString();
    } else {
      const d = new Date(input.due);
      dueAt = isNaN(d.getTime()) ? null : d.toISOString();
    }
  }

  // sortable_index: append-at-end by default. Use the current epoch
  // milliseconds so freshly-created tasks sort last among their peers.
  const sortableIndex = Date.now();

  const { data: inserted, error } = await supabase
    .from("tasks")
    .insert({
      workspace_id: workspace.id,
      conversation_id: input.conversationId ?? null,
      title,
      description: input.description ?? null,
      priority: input.priority ?? "medium",
      status: "todo",
      due_at: dueAt,
      ai_generated: false,
      parent_task_id: input.parentTaskId ?? null,
      sortable_index: sortableIndex,
    })
    .select("id")
    .single();

  if (error) return { ok: false, taskId: null, error: error.message };
  revalidatePath("/app", "layout");
  return { ok: true, taskId: (inserted?.id as string) ?? null, error: null };
}
