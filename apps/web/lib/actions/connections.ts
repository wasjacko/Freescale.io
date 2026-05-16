"use server";

import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  extractMessageContent,
  getMessage,
  getValidAccessToken,
  listRecentMessages,
} from "@/lib/gmail";

// Personal email providers — for those we want a Gravatar (real photo if the
// owner has one, otherwise a colored initial via UI fallback). For any other
// domain we treat the sender as a business and pull the favicon, which
// produces a real company logo for things like noreply@mobbin.com.
const PERSONAL_EMAIL_DOMAINS = new Set([
  "gmail.com", "googlemail.com", "yahoo.com", "yahoo.fr", "outlook.com",
  "hotmail.com", "hotmail.fr", "live.com", "icloud.com", "me.com",
  "mac.com", "aol.com", "proton.me", "protonmail.com", "pm.me",
  "free.fr", "orange.fr", "wanadoo.fr", "sfr.fr", "laposte.net",
]);

/**
 * Strip subdomains down to the registrable domain. Handles the common
 * ccTLD+SLD shape (.co.uk, .com.au, .co.jp, .gov.fr, etc.) by keeping the
 * last 3 parts when the 2nd-to-last is 2-3 chars. Not bulletproof against
 * the full Public Suffix List, but covers ~99% of email senders we see.
 *
 *   notifications.partenaire.meilleurtaux.com → meilleurtaux.com
 *   accounts.google.com                       → google.com
 *   news.bbc.co.uk                            → bbc.co.uk
 *   ionos.fr                                  → ionos.fr
 */
function rootDomain(domain: string): string {
  const parts = domain.split(".");
  if (parts.length <= 2) return domain;
  const lastTld = parts[parts.length - 1] ?? "";
  const secondLast = parts[parts.length - 2] ?? "";
  // ccTLD pattern: 2-letter TLD + short SLD ("co", "com", "gov", "ac", "or")
  if (
    lastTld.length === 2 &&
    secondLast.length <= 3 &&
    /^[a-z]+$/.test(secondLast)
  ) {
    return parts.slice(-3).join(".");
  }
  return parts.slice(-2).join(".");
}

function avatarUrlFor(email: string): string {
  const domain = email.split("@")[1]?.toLowerCase().trim() ?? "";
  if (!domain) return "";
  if (PERSONAL_EMAIL_DOMAINS.has(domain)) {
    const md5 = createHash("md5").update(email.trim().toLowerCase()).digest("hex");
    // d=404 so the <img> fires onerror when no real Gravatar exists, letting
    // the UI fall back to colored initials. Better than a generic identicon.
    return `https://www.gravatar.com/avatar/${md5}?s=200&d=404`;
  }
  // Business domain → icon.horse on the ROOT domain. Returns up to 256x256
  // PNG of the real logo for known sites; subdomains often 504 on icon.horse
  // so stripping is mandatory ("partenaire.meilleurtaux.com" was failing).
  return `https://icon.horse/icon/${rootDomain(domain)}`;
}

export type SyncReport = {
  fetched: number;
  newConversations: number;
  newMessages: number;
  errors: string[];
};

export async function syncGmail(channelAccountId: string): Promise<SyncReport> {
  const report: SyncReport = { fetched: 0, newConversations: 0, newMessages: 0, errors: [] };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const { data: account, error: accountErr } = await supabase
    .from("channel_accounts")
    .select("id, workspace_id, encrypted_tokens, external_id")
    .eq("id", channelAccountId)
    .eq("kind", "gmail")
    .maybeSingle();
  if (accountErr || !account?.encrypted_tokens) {
    report.errors.push("Compte Gmail introuvable ou non lié.");
    return report;
  }

  let accessToken: string;
  try {
    const refreshed = await getValidAccessToken(account.encrypted_tokens as string);
    accessToken = refreshed.accessToken;
    if (refreshed.updatedBlob) {
      await supabase
        .from("channel_accounts")
        .update({ encrypted_tokens: refreshed.updatedBlob })
        .eq("id", account.id);
    }
  } catch (err) {
    report.errors.push(err instanceof Error ? err.message : "Refresh failed");
    return report;
  }

  let messageList: { id: string; threadId: string }[] = [];
  try {
    messageList = await listRecentMessages(accessToken, 50);
  } catch (err) {
    report.errors.push(err instanceof Error ? err.message : "Listing failed");
    return report;
  }
  report.fetched = messageList.length;

  // Group by threadId so we create one conversation per thread.
  const threadGroups = new Map<string, string[]>();
  for (const m of messageList) {
    const arr = threadGroups.get(m.threadId) ?? [];
    arr.push(m.id);
    threadGroups.set(m.threadId, arr);
  }

  // Find which threads we already have so we skip them on the cheap path.
  const threadIds = [...threadGroups.keys()];
  const { data: existingConvs } = await supabase
    .from("conversations")
    .select("id, external_thread_id")
    .eq("workspace_id", account.workspace_id)
    .eq("channel_account_id", account.id)
    .in("external_thread_id", threadIds);
  const existingMap = new Map(
    (existingConvs ?? []).map((c) => [c.external_thread_id as string, c.id as string])
  );

  // Find existing message external_ids to dedupe
  const messageIds = messageList.map((m) => m.id);
  const { data: existingMsgs } = await supabase
    .from("messages")
    .select("external_id")
    .eq("workspace_id", account.workspace_id)
    .in("external_id", messageIds);
  const existingMessageIds = new Set(
    (existingMsgs ?? []).map((m) => m.external_id as string).filter(Boolean)
  );

  for (const [threadId, ids] of threadGroups) {
    // Fetch message contents
    const fetched = await Promise.all(
      ids.map((id) =>
        getMessage(accessToken, id).catch((err) => {
          report.errors.push(`${id}: ${err instanceof Error ? err.message : err}`);
          return null;
        })
      )
    );
    const parsed = fetched
      .filter((m): m is NonNullable<typeof m> => m !== null)
      .map((m) => ({ raw: m, content: extractMessageContent(m) }))
      .sort((a, b) => a.content.date.getTime() - b.content.date.getTime());
    if (parsed.length === 0) continue;

    const newest = parsed[parsed.length - 1];
    if (!newest) continue;

    // Resolve or create the contact (matched on the "from" email of the most
    // recent inbound message).
    const lastInbound = [...parsed].reverse().find(
      (p) => p.content.from.email.toLowerCase() !== account.external_id.toLowerCase()
    );
    const contactEmail = lastInbound?.content.from.email ?? newest.content.from.email;
    const contactName =
      lastInbound?.content.from.name ?? newest.content.from.name ?? contactEmail;

    let contactId: string | null = null;
    if (contactEmail) {
      const { data: existingContact } = await supabase
        .from("contacts")
        .select("id")
        .eq("workspace_id", account.workspace_id)
        .eq("email", contactEmail)
        .maybeSingle();
      if (existingContact?.id) {
        contactId = existingContact.id as string;
      } else {
        const { data: newContact } = await supabase
          .from("contacts")
          .insert({
            workspace_id: account.workspace_id,
            display_name: contactName || contactEmail,
            email: contactEmail,
            avatar_url: avatarUrlFor(contactEmail),
          })
          .select("id")
          .single();
        contactId = (newContact?.id as string) ?? null;
      }
    }

    // Upsert the conversation
    let conversationId = existingMap.get(threadId) ?? null;
    if (!conversationId) {
      const { data: newConv } = await supabase
        .from("conversations")
        .insert({
          workspace_id: account.workspace_id,
          channel_account_id: account.id,
          contact_id: contactId,
          external_thread_id: threadId,
          subject: newest.content.subject || null,
          preview: newest.content.text.slice(0, 140).replace(/\s+/g, " ").trim(),
          last_message_at: newest.content.date.toISOString(),
          unread_count: parsed.filter((p) =>
            (p.raw.labelIds ?? []).includes("UNREAD")
          ).length,
        })
        .select("id")
        .single();
      conversationId = (newConv?.id as string) ?? null;
      if (conversationId) report.newConversations += 1;
    } else {
      // Refresh preview / last_message_at on existing threads
      await supabase
        .from("conversations")
        .update({
          preview: newest.content.text.slice(0, 140).replace(/\s+/g, " ").trim(),
          last_message_at: newest.content.date.toISOString(),
        })
        .eq("id", conversationId);
    }
    if (!conversationId) continue;

    // Insert messages we don't have yet
    const toInsert = parsed
      .filter((p) => !existingMessageIds.has(p.raw.id))
      .map((p) => {
        const isOutbound =
          p.content.from.email.toLowerCase() === account.external_id.toLowerCase();
        return {
          conversation_id: conversationId,
          workspace_id: account.workspace_id,
          direction: isOutbound ? ("out" as const) : ("in" as const),
          external_id: p.raw.id,
          body_text: p.content.text || null,
          body_html: p.content.html || null,
          sent_at: p.content.date.toISOString(),
          metadata: {
            subject: p.content.subject,
            from: p.content.from,
            to: p.content.to,
            labels: p.raw.labelIds ?? [],
          },
        };
      });
    if (toInsert.length) {
      const { error: insErr } = await supabase.from("messages").insert(toInsert);
      if (insErr) {
        report.errors.push(`messages insert: ${insErr.message}`);
      } else {
        report.newMessages += toInsert.length;
      }
    }
  }

  await supabase
    .from("channel_accounts")
    .update({ last_synced_at: new Date().toISOString() })
    .eq("id", account.id);

  revalidatePath("/app", "layout");
  return report;
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
