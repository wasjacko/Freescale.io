import { revalidatePath } from "next/cache";
import type { SyncReport } from "../actions/connections";
import { avatarUrlFor } from "../email-avatar";
import { createClient } from "../supabase/server";
import type { ChannelId } from "../types";
import type { SyncResult } from "./adapter";
import { getChannelAdapter } from "./registry-server";

export async function runChannelSync(channelAccountId: string): Promise<SyncReport> {
  const report: SyncReport = { fetched: 0, newConversations: 0, newMessages: 0, errors: [] };
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    report.errors.push("Utilisateur non authentifié.");
    return report;
  }

  const { data: account, error: accountErr } = await supabase
    .from("channel_accounts")
    .select("id, workspace_id, encrypted_tokens, external_id, history_id, kind")
    .eq("id", channelAccountId)
    .maybeSingle();

  if (accountErr || !account || !account.encrypted_tokens) {
    report.errors.push("Compte de canal introuvable ou non lié.");
    return report;
  }

  const adapter = getChannelAdapter(account.kind as ChannelId);
  if (!adapter) {
    report.errors.push(`Aucun adaptateur configuré pour le canal: ${account.kind}`);
    return report;
  }

  // 1. Refresh credentials
  let accessToken: string;
  try {
    const refreshed = await adapter.refreshTokens(account.encrypted_tokens as string);
    accessToken = refreshed.accessToken;
    if (refreshed.updatedBlob) {
      await supabase
        .from("channel_accounts")
        .update({ encrypted_tokens: refreshed.updatedBlob })
        .eq("id", account.id);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Rafraîchissement des tokens échoué";
    report.errors.push(msg);
    await supabase.from("channel_accounts").update({ status: "needs_reauth" }).eq("id", account.id);
    return report;
  }

  // 2. Fetch existing database structures for deduplication
  const { data: existingConvs } = await supabase
    .from("conversations")
    .select("id, external_thread_id")
    .eq("workspace_id", account.workspace_id)
    .eq("channel_account_id", account.id);

  const existingThreadMap = new Map<string, string>(
    (existingConvs ?? []).map((c) => [c.external_thread_id as string, c.id as string])
  );

  const { data: existingMsgs } = await supabase
    .from("messages")
    .select("external_id")
    .eq("workspace_id", account.workspace_id);

  const existingMessageIds = new Set<string>(
    (existingMsgs ?? []).map((m) => m.external_id as string).filter(Boolean)
  );

  // 3. Call adapter sync
  let syncResult: SyncResult;
  try {
    syncResult = await adapter.sync({
      accessToken,
      storedHistoryId: (account.history_id as string | null) ?? null,
      account: {
        id: account.id,
        external_id: account.external_id as string,
        workspace_id: account.workspace_id as string,
      },
      existingMessageIds,
      existingThreadMap,
    });
    report.fetched = syncResult.fetchedCount;
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erreur de synchronisation de l'adaptateur";
    report.errors.push(msg);
    return report;
  }

  // 4. Handle Deletions (if supported/returned by the adapter)
  if (syncResult.toDeleteExternalThreadIds && syncResult.toDeleteExternalThreadIds.length > 0) {
    await supabase
      .from("conversations")
      .delete()
      .eq("channel_account_id", account.id)
      .in("external_thread_id", syncResult.toDeleteExternalThreadIds);
    for (const extId of syncResult.toDeleteExternalThreadIds) {
      existingThreadMap.delete(extId);
    }
  }

  if (syncResult.deletedMessages && syncResult.deletedMessages.length > 0) {
    await supabase
      .from("messages")
      .delete()
      .eq("workspace_id", account.workspace_id)
      .in("external_id", syncResult.deletedMessages);
  }

  if (syncResult.threads.length === 0) {
    await supabase
      .from("channel_accounts")
      .update({
        last_synced_at: new Date().toISOString(),
        ...(syncResult.newHistoryId ? { history_id: syncResult.newHistoryId } : {}),
      })
      .eq("id", account.id);
    return report;
  }

  // 5. Batch Resolve Contacts
  const contactEmailsInBatch = new Set<string>(
    syncResult.threads.map((t) => t.contactEmail).filter(Boolean)
  );
  const contactByEmail = new Map<string, string>();

  if (contactEmailsInBatch.size > 0) {
    const { data: existingContacts } = await supabase
      .from("contacts")
      .select("id, email")
      .eq("workspace_id", account.workspace_id)
      .in("email", [...contactEmailsInBatch]);

    for (const c of existingContacts ?? []) {
      contactByEmail.set(c.email as string, c.id as string);
    }

    const missing = [...contactEmailsInBatch].filter((e) => !contactByEmail.has(e));
    if (missing.length > 0) {
      const nameByEmail = new Map<string, string>();
      for (const t of syncResult.threads) {
        if (missing.includes(t.contactEmail) && !nameByEmail.has(t.contactEmail)) {
          nameByEmail.set(t.contactEmail, t.contactName || t.contactEmail);
        }
      }

      const { data: inserted, error: insErr } = await supabase
        .from("contacts")
        .insert(
          missing.map((email) => ({
            workspace_id: account.workspace_id,
            display_name: nameByEmail.get(email) ?? email,
            email,
            avatar_url: avatarUrlFor(email),
          }))
        )
        .select("id, email");

      if (insErr) {
        report.errors.push(`Insertion contacts: ${insErr.message}`);
      } else {
        for (const c of inserted ?? []) {
          contactByEmail.set(c.email as string, c.id as string);
        }
      }
    }
  }

  // 6. Conversations UPSERT (Split Insert vs Update for accuracy)
  const convByThread = new Map<string, string>();
  const newConvs = syncResult.threads.filter((t) => !existingThreadMap.has(t.externalThreadId));
  const existingConvsToUpdate = syncResult.threads.filter((t) =>
    existingThreadMap.has(t.externalThreadId)
  );

  if (newConvs.length > 0) {
    const { data: insertedConvs, error: convErr } = await supabase
      .from("conversations")
      .insert(
        newConvs.map((t) => ({
          workspace_id: account.workspace_id,
          channel_account_id: account.id,
          contact_id: contactByEmail.get(t.contactEmail) ?? null,
          external_thread_id: t.externalThreadId,
          subject: t.subject || null,
          preview: t.preview,
          last_message_at: t.lastMessageAt,
          unread_count: t.unreadCount,
        }))
      )
      .select("id, external_thread_id");

    if (convErr) {
      report.errors.push(`Insertion conversation: ${convErr.message}`);
    } else {
      for (const c of insertedConvs ?? []) {
        convByThread.set(c.external_thread_id as string, c.id as string);
        existingThreadMap.set(c.external_thread_id as string, c.id as string);
        report.newConversations += 1;
      }
    }

    // Recovery path in case Postgres returns incomplete results due to RLS/limits
    const stillMissing = newConvs.filter((t) => !convByThread.has(t.externalThreadId));
    if (stillMissing.length > 0) {
      const { data: recovered } = await supabase
        .from("conversations")
        .select("id, external_thread_id")
        .eq("workspace_id", account.workspace_id)
        .eq("channel_account_id", account.id)
        .in(
          "external_thread_id",
          stillMissing.map((t) => t.externalThreadId)
        );

      for (const c of recovered ?? []) {
        if (!convByThread.has(c.external_thread_id as string)) {
          convByThread.set(c.external_thread_id as string, c.id as string);
          existingThreadMap.set(c.external_thread_id as string, c.id as string);
          if (!convErr) report.newConversations += 1;
        }
      }
    }
  }

  // Update existing conversations
  for (const t of existingConvsToUpdate) {
    const convId = existingThreadMap.get(t.externalThreadId);
    if (!convId) continue;
    convByThread.set(t.externalThreadId, convId);
    await supabase
      .from("conversations")
      .update({
        contact_id: contactByEmail.get(t.contactEmail) ?? null,
        subject: t.subject || null,
        preview: t.preview,
        last_message_at: t.lastMessageAt,
        unread_count: t.unreadCount,
      })
      .eq("id", convId);
  }

  // 7. Messages UPSERT
  // biome-ignore lint/suspicious/noExplicitAny: Supabase payload payload representation
  const messagesPayload: any[] = [];
  for (const t of syncResult.threads) {
    const convId = convByThread.get(t.externalThreadId);
    if (!convId) continue;

    for (const m of t.messages) {
      if (existingMessageIds.has(m.externalId)) continue;
      messagesPayload.push({
        conversation_id: convId,
        workspace_id: account.workspace_id,
        direction: m.direction,
        external_id: m.externalId,
        body_text: m.bodyText,
        body_html: m.bodyHtml,
        sent_at: m.sentAt,
        metadata: m.metadata,
      });
      existingMessageIds.add(m.externalId);
    }
  }

  if (messagesPayload.length > 0) {
    const { error: batchErr } = await supabase.from("messages").upsert(messagesPayload, {
      onConflict: "conversation_id,external_id",
      ignoreDuplicates: true,
    });

    if (!batchErr) {
      report.newMessages += messagesPayload.length;
    } else {
      report.errors.push(
        `Échec de l'upsert par lot des messages (${batchErr.message}) — passage en mode individuel`
      );
      let okCount = 0;
      for (const m of messagesPayload) {
        const { error: oneErr } = await supabase.from("messages").upsert([m], {
          onConflict: "conversation_id,external_id",
          ignoreDuplicates: true,
        });
        if (oneErr) {
          report.errors.push(`Message ${m.external_id}: ${oneErr.message.slice(0, 100)}`);
        } else {
          okCount += 1;
        }
      }
      report.newMessages += okCount;
    }
  }

  // 8. Update account metadata
  await supabase
    .from("channel_accounts")
    .update({
      last_synced_at: new Date().toISOString(),
      ...(syncResult.newHistoryId ? { history_id: syncResult.newHistoryId } : {}),
    })
    .eq("id", account.id);

  revalidatePath("/app", "layout");
  return report;
}

export async function sendChannelMessage(params: {
  channelAccountId: string;
  externalThreadId: string;
  text: string;
  subject?: string;
  toEmail?: string;
  replyToMessageId?: string;
}): Promise<{ externalId: string }> {
  const supabase = await createClient();
  const { data: account } = await supabase
    .from("channel_accounts")
    .select("encrypted_tokens, kind")
    .eq("id", params.channelAccountId)
    .single();

  if (!account || !account.encrypted_tokens) {
    throw new Error("Compte de canal introuvable ou non lié.");
  }

  const adapter = getChannelAdapter(account.kind as ChannelId);
  if (!adapter) {
    throw new Error(`Aucun adaptateur configuré pour le canal: ${account.kind}`);
  }

  const { accessToken } = await adapter.refreshTokens(account.encrypted_tokens);
  return adapter.sendMessage({
    accessToken,
    externalThreadId: params.externalThreadId,
    text: params.text,
    subject: params.subject,
    toEmail: params.toEmail,
    replyToMessageId: params.replyToMessageId,
  });
}
