"use server";

import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  extractMessageContent,
  getProfile,
  getThread,
  getValidAccessToken,
  listHistory,
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

/**
 * Mirror Gmail's "Primary" tab semantics at the thread level. Returns true
 * when a message is what Gmail would surface in the default Inbox view:
 *
 *   - Has the INBOX label (not archived, not in spam/trash)
 *   - AND either has CATEGORY_PERSONAL, or has no CATEGORY_* label at all
 *     (Gmail puts un-categorized inbox mail in Primary by default)
 *
 * This excludes Promotions / Social / Updates / Forums — the categories
 * Gmail collapses behind separate tabs. Without this filter, Freescale was
 * showing LinkedIn-Social and Promotions newsletters next to the real
 * inbox, which the user perceives as "invented" mail.
 */
function isInPrimaryTab(labelIds: string[] | undefined): boolean {
  const labels = labelIds ?? [];
  if (!labels.includes("INBOX")) return false;
  if (labels.includes("CATEGORY_PERSONAL")) return true;
  return !labels.some(
    (l) => l.startsWith("CATEGORY_") && l !== "CATEGORY_PERSONAL"
  );
}

/**
 * Full Gmail enumeration — used for the FIRST sync of an account, and as a
 * fallback when the History API cursor has aged out (> ~7 days). Pulls up
 * to 800 of the most recent messages across all categories, dedupes them
 * down to unique thread IDs, and reports how many message ids we saw.
 *
 * We sync THREADS (not individual messages) because Gmail's model is
 * thread-first: a single thread can contain dozens of messages, and we
 * always want the full conversation in our DB regardless of how many of
 * its messages happened to surface in messages.list.
 */
async function doFullList(
  accessToken: string,
  report: SyncReport
): Promise<string[]> {
  const messages = await listRecentMessages(accessToken, 800);
  report.fetched = messages.length;
  const threadIds = new Set<string>();
  for (const m of messages) threadIds.add(m.threadId);
  return [...threadIds];
}

export async function syncGmail(channelAccountId: string): Promise<SyncReport> {
  const report: SyncReport = { fetched: 0, newConversations: 0, newMessages: 0, errors: [] };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const { data: account, error: accountErr } = await supabase
    .from("channel_accounts")
    .select("id, workspace_id, encrypted_tokens, external_id, history_id")
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

  // ─── Decide the sync strategy ─────────────────────────────────────────
  // - No history_id stored → initial full sync (paginate messages.list up
  //   to the cap, then capture the current profile.historyId as our cursor).
  // - history_id present → incremental via users.history.list. If the API
  //   returns 404 (cursor > ~7 days old), we fall back to a fresh full sync.
  // This is the same approach Superhuman / Missive / Front use: full once,
  // then deltas — way faster than re-listing every tick and the only way
  // to catch deletes / label changes without re-walking every thread.
  let threadIds: string[];
  let nextHistoryId: string | null = null;

  const storedHistoryId = (account.history_id as string | null) ?? null;
  if (storedHistoryId) {
    try {
      const delta = await listHistory(accessToken, storedHistoryId);
      if (delta.expired) {
        // Cursor aged out — do a fresh full sync below
        threadIds = await doFullList(accessToken, report);
        nextHistoryId = (await getProfile(accessToken)).historyId;
      } else {
        const ids = new Set<string>();
        for (const m of delta.addedMessages) ids.add(m.threadId);
        for (const m of delta.labelsAdded) ids.add(m.threadId);
        for (const m of delta.labelsRemoved) ids.add(m.threadId);
        threadIds = [...ids];
        nextHistoryId = delta.newHistoryId;
        report.fetched = delta.addedMessages.length;

        // Apply deletions (rare, but the History API is the only way we
        // ever learn about them)
        for (const d of delta.deletedMessages) {
          await supabase
            .from("messages")
            .delete()
            .eq("workspace_id", account.workspace_id)
            .eq("external_id", d.id);
        }
      }
    } catch (err) {
      report.errors.push(err instanceof Error ? err.message : "History failed");
      return report;
    }
  } else {
    threadIds = await doFullList(accessToken, report);
    try {
      nextHistoryId = (await getProfile(accessToken)).historyId;
    } catch {
      // best-effort
    }
  }

  if (threadIds.length === 0) {
    if (nextHistoryId) {
      await supabase
        .from("channel_accounts")
        .update({ history_id: nextHistoryId, last_synced_at: new Date().toISOString() })
        .eq("id", account.id);
    } else {
      await supabase
        .from("channel_accounts")
        .update({ last_synced_at: new Date().toISOString() })
        .eq("id", account.id);
    }
    return report;
  }

  // Find which threads we already have so we can update vs insert
  const { data: existingConvs } = await supabase
    .from("conversations")
    .select("id, external_thread_id")
    .eq("workspace_id", account.workspace_id)
    .eq("channel_account_id", account.id)
    .in("external_thread_id", threadIds);
  const existingMap = new Map(
    (existingConvs ?? []).map((c) => [c.external_thread_id as string, c.id as string])
  );

  // Find existing message external_ids to dedupe inserts. We query across
  // the workspace so a re-sync after a wipe doesn't double-write.
  const { data: existingMsgs } = await supabase
    .from("messages")
    .select("external_id")
    .eq("workspace_id", account.workspace_id);
  const existingMessageIds = new Set(
    (existingMsgs ?? []).map((m) => m.external_id as string).filter(Boolean)
  );

  for (const threadId of threadIds) {
    // Fetch the FULL thread — gives us every message in it, not just the
    // most recent one that surfaced in messages.list. Without this the user
    // opens a thread and only sees the last 1-2 messages, missing the
    // context of the conversation they're replying in.
    let thread: Awaited<ReturnType<typeof getThread>>;
    try {
      thread = await getThread(accessToken, threadId);
    } catch (err) {
      report.errors.push(`${threadId}: ${err instanceof Error ? err.message : err}`);
      continue;
    }

    const parsed = thread.messages
      .map((m) => ({ raw: m, content: extractMessageContent(m) }))
      .sort((a, b) => a.content.date.getTime() - b.content.date.getTime());
    if (parsed.length === 0) continue;

    // Primary-tab gate. The full-sync query already filters at the message
    // level, but History API deltas surface every label change in the
    // mailbox — so a thread that got moved OUT of Primary needs to be
    // removed from Freescale (and a thread that moved INTO Primary needs
    // to be inserted even though the cursor was on the wrong label).
    const isAnyInPrimary = parsed.some((p) => isInPrimaryTab(p.raw.labelIds));
    if (!isAnyInPrimary) {
      const existingId = existingMap.get(threadId);
      if (existingId) {
        await supabase.from("conversations").delete().eq("id", existingId);
      }
      continue;
    }

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

    // Explicit insert vs update. The unique index
    // (workspace_id, channel_account_id, external_thread_id) makes the
    // INSERT race-safe: on conflict we catch the 23505 and switch to the
    // UPDATE path. No silent data loss from .single() returning nothing.
    // Always prefer Gmail's own snippet for the sidebar preview. It's
    // pre-cleaned text the API guarantees is safe to display — no
    // mojibake, no HTML noise, no quoted-printable leftovers.
    const preview = (newest.content.snippet || newest.content.text)
      .slice(0, 140)
      .replace(/\s+/g, " ")
      .trim();
    const unreadCount = parsed.filter((p) => (p.raw.labelIds ?? []).includes("UNREAD")).length;
    const lastMessageAt = newest.content.date.toISOString();

    let conversationId = existingMap.get(threadId) ?? null;
    if (conversationId) {
      await supabase
        .from("conversations")
        .update({
          contact_id: contactId,
          subject: newest.content.subject || null,
          preview,
          last_message_at: lastMessageAt,
          unread_count: unreadCount,
        })
        .eq("id", conversationId);
    } else {
      const { data: inserted, error: insErr } = await supabase
        .from("conversations")
        .insert({
          workspace_id: account.workspace_id,
          channel_account_id: account.id,
          contact_id: contactId,
          external_thread_id: threadId,
          subject: newest.content.subject || null,
          preview,
          last_message_at: lastMessageAt,
          unread_count: unreadCount,
        })
        .select("id")
        .single();
      if (insErr) {
        // Most likely the unique index caught a race against another sync.
        // Look up the row another worker just wrote and treat it as ours.
        const { data: existing } = await supabase
          .from("conversations")
          .select("id")
          .eq("workspace_id", account.workspace_id)
          .eq("channel_account_id", account.id)
          .eq("external_thread_id", threadId)
          .maybeSingle();
        conversationId = (existing?.id as string) ?? null;
        if (!conversationId) {
          report.errors.push(`conv insert: ${insErr.message}`);
        }
      } else {
        conversationId = (inserted?.id as string) ?? null;
        if (conversationId) report.newConversations += 1;
      }
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
            messageId: p.content.messageId,
            references: p.content.references,
          },
        };
      });
    if (toInsert.length) {
      // UPSERT against the existing unique (conversation_id, external_id)
      // partial index → race-safe: if another sync just inserted the same
      // message id, we no-op instead of erroring.
      const { error: insErr } = await supabase
        .from("messages")
        .upsert(toInsert, {
          onConflict: "conversation_id,external_id",
          ignoreDuplicates: true,
        });
      if (insErr) {
        report.errors.push(`messages insert: ${insErr.message}`);
      } else {
        report.newMessages += toInsert.length;
      }
    }
  }

  // Persist the new history cursor alongside last_synced_at. Next sync
  // tick will call users.history.list?startHistoryId=<this> and only pull
  // the deltas — way cheaper than re-listing 800 messages every minute.
  await supabase
    .from("channel_accounts")
    .update({
      last_synced_at: new Date().toISOString(),
      ...(nextHistoryId ? { history_id: nextHistoryId } : {}),
    })
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
