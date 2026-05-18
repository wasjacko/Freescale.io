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
 * Approximate Gmail's Principale-tab inclusion rule for the History
 * API delta path (where we can't re-run the search query). Keep a
 * thread when it has INBOX and is NOT explicitly in Promotions /
 * Social / Forums. We deliberately ALLOW CATEGORY_UPDATES — the debug
 * page showed that most of the user's actual Primary mail (Doctolib,
 * IONOS, verification codes, transactional notifications) carries
 * CATEGORY_UPDATES + IMPORTANT and Gmail surfaces them in Principale
 * via the "include important emails" setting.
 *
 * Excluding Updates wholesale would silently drop most of the user's
 * inbox; including them errs on the side of showing too much, which
 * the user can archive in one click.
 */
function isInPrimaryTab(labelIds: string[] | undefined): boolean {
  const labels = labelIds ?? [];
  if (!labels.includes("INBOX")) return false;
  return !labels.some(
    (l) =>
      l === "CATEGORY_PROMOTIONS" ||
      l === "CATEGORY_SOCIAL" ||
      l === "CATEGORY_FORUMS"
  );
}

/**
 * Full Gmail enumeration — used for the FIRST sync of an account, and as a
 * fallback when the History API cursor has aged out (> ~7 days). Pulls up
 * to 200 of the most recent Primary-tab messages, dedupes them down to
 * unique thread IDs, and reports how many message ids we saw.
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
  const messages = await listRecentMessages(accessToken, 1000);
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
    // Token refresh failed: usually invalid_grant (user revoked the
    // grant from their Google account, or the refresh_token rotated
    // out and we missed it). Flag the channel as needs_reauth so the
    // SyncErrorBanner surfaces a 1-click reconnect CTA.
    const msg = err instanceof Error ? err.message : "Refresh failed";
    report.errors.push(msg);
    await supabase
      .from("channel_accounts")
      .update({
        status: "needs_reauth",
        last_sync_error: msg,
        last_sync_error_at: new Date().toISOString(),
      })
      .eq("id", account.id);
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

  // ─── Batched fetch + batched DB writes ─────────────────────────────────
  // Old per-thread write loop did 4 DB calls per thread (contact SELECT,
  // contact INSERT, conv INSERT/UPDATE, messages UPSERT) — fine for 200
  // threads but burns ~150s on 1000 threads, well over Vercel's 60s
  // server-action budget. Refactored to do constant-cost DB work per
  // batch regardless of size: 5 queries total per batch of N threads
  // (contacts SELECT, contacts UPSERT, conversations UPSERT, messages
  // UPSERT, optional conversations DELETE for primary→other moves).
  //
  // Fetch fanout bumped to 16 concurrent — Gmail allows 250 quota units
  // per second per user, threads.get costs 10, so 25 concurrent is the
  // ceiling. 16 stays well under with room for the parallel messages.list
  // pagination running upstream.
  const BATCH_SIZE = 16;
  type FetchedThread =
    | { ok: true; threadId: string; thread: Awaited<ReturnType<typeof getThread>> }
    | { ok: false; threadId: string; error: unknown };

  for (let i = 0; i < threadIds.length; i += BATCH_SIZE) {
    const batch = threadIds.slice(i, i + BATCH_SIZE);
    const fetched: FetchedThread[] = await Promise.all(
      batch.map(
        (threadId): Promise<FetchedThread> =>
          getThread(accessToken, threadId)
            .then((thread) => ({ ok: true as const, threadId, thread }))
            .catch((error) => ({ ok: false as const, threadId, error }))
      )
    );

    // ── Pass 1: parse + filter + collect everything we need to write ──
    type ThreadPayload = {
      threadId: string;
      contactEmail: string;
      contactName: string;
      subject: string;
      preview: string;
      lastMessageAt: string;
      unreadCount: number;
      messages: Array<{
        external_id: string;
        direction: "in" | "out";
        body_text: string | null;
        body_html: string | null;
        sent_at: string;
        metadata: Record<string, unknown>;
      }>;
    };
    const toUpsert: ThreadPayload[] = [];
    const toDelete: string[] = []; // existing conv ids to remove (Primary → other)
    const contactEmailsInBatch = new Set<string>();

    for (const entry of fetched) {
      if (!entry.ok) {
        report.errors.push(
          `${entry.threadId}: ${entry.error instanceof Error ? entry.error.message : String(entry.error)}`
        );
        continue;
      }
      const { threadId, thread } = entry;
      const parsed = thread.messages
        .map((m) => ({ raw: m, content: extractMessageContent(m) }))
        .sort((a, b) => a.content.date.getTime() - b.content.date.getTime());
      if (parsed.length === 0) continue;

      // Primary-tab gate — see isInPrimaryTab() comment for rationale.
      const isAnyInPrimary = parsed.some((p) => isInPrimaryTab(p.raw.labelIds));
      if (!isAnyInPrimary) {
        const existingId = existingMap.get(threadId);
        if (existingId) toDelete.push(existingId);
        continue;
      }

      const newest = parsed[parsed.length - 1];
      if (!newest) continue;

      const lastInbound = [...parsed].reverse().find(
        (p) => p.content.from.email.toLowerCase() !== account.external_id.toLowerCase()
      );
      const contactEmail = lastInbound?.content.from.email ?? newest.content.from.email;
      const contactName =
        lastInbound?.content.from.name ?? newest.content.from.name ?? contactEmail;
      if (contactEmail) contactEmailsInBatch.add(contactEmail);

      const preview = (newest.content.snippet || newest.content.text)
        .slice(0, 140)
        .replace(/\s+/g, " ")
        .trim();
      const unreadCount = parsed.filter((p) => (p.raw.labelIds ?? []).includes("UNREAD")).length;
      const lastMessageAt = newest.content.date.toISOString();

      toUpsert.push({
        threadId,
        contactEmail,
        contactName,
        subject: newest.content.subject || "",
        preview,
        lastMessageAt,
        unreadCount,
        messages: parsed
          .filter((p) => !existingMessageIds.has(p.raw.id))
          .map((p) => {
            const isOutbound =
              p.content.from.email.toLowerCase() === account.external_id.toLowerCase();
            return {
              external_id: p.raw.id,
              direction: isOutbound ? ("out" as const) : ("in" as const),
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
          }),
      });
    }

    // ── Pass 2: batched DB writes (1-5 queries regardless of batch size) ──

    // (a) Delete conversations that moved out of Primary
    if (toDelete.length > 0) {
      await supabase.from("conversations").delete().in("id", toDelete);
      for (const id of toDelete) {
        // Drop them from existingMap so we don't try to reuse later
        for (const [tid, cid] of existingMap.entries()) {
          if (cid === id) existingMap.delete(tid);
        }
      }
    }

    if (toUpsert.length === 0) continue;

    // (b) Resolve contacts: fetch existing for this batch, then plain
    // INSERT for the missing ones. Avoiding upsert here because the
    // contacts unique index is partial (where email is not null) and
    // Supabase's onConflict resolution doesn't always match partial
    // indexes cleanly — silent insert failures were dropping contact
    // links and (downstream) messages.
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
        for (const t of toUpsert) {
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
          report.errors.push(`contacts insert: ${insErr.message}`);
        } else {
          for (const c of inserted ?? []) {
            contactByEmail.set(c.email as string, c.id as string);
          }
        }
      }
    }

    // (c) Conversations: split INSERT (new) vs UPDATE (existing) instead
    // of upsert. Two batched paths give us reliable returning rows even
    // when the unique index resolution is fuzzy. Most batches during
    // initial sync are 100% inserts so this is one INSERT query for the
    // whole batch.
    const convByThread = new Map<string, string>();
    const newConvs = toUpsert.filter((t) => !existingMap.has(t.threadId));
    const existingConvsToUpdate = toUpsert.filter((t) => existingMap.has(t.threadId));

    if (newConvs.length > 0) {
      const { data: insertedConvs, error: convErr } = await supabase
        .from("conversations")
        .insert(
          newConvs.map((t) => ({
            workspace_id: account.workspace_id,
            channel_account_id: account.id,
            contact_id: contactByEmail.get(t.contactEmail) ?? null,
            external_thread_id: t.threadId,
            subject: t.subject || null,
            preview: t.preview,
            last_message_at: t.lastMessageAt,
            unread_count: t.unreadCount,
          }))
        )
        .select("id, external_thread_id");

      if (convErr) {
        report.errors.push(`conv insert: ${convErr.message}`);
      } else {
        for (const c of insertedConvs ?? []) {
          convByThread.set(c.external_thread_id as string, c.id as string);
          existingMap.set(c.external_thread_id as string, c.id as string);
          report.newConversations += 1;
        }
      }

      // Defensive fallback: if any newConvs are still missing from
      // convByThread, re-SELECT them. Catches cases where the INSERT
      // succeeds but .select() returns an incomplete set (RLS quirks,
      // PostgREST limits) — without this, messages for those threads
      // get orphaned and the right panel is blank.
      const stillMissing = newConvs.filter((t) => !convByThread.has(t.threadId));
      if (stillMissing.length > 0) {
        const { data: recovered } = await supabase
          .from("conversations")
          .select("id, external_thread_id")
          .eq("workspace_id", account.workspace_id)
          .eq("channel_account_id", account.id)
          .in(
            "external_thread_id",
            stillMissing.map((t) => t.threadId)
          );
        for (const c of recovered ?? []) {
          if (!convByThread.has(c.external_thread_id as string)) {
            convByThread.set(c.external_thread_id as string, c.id as string);
            existingMap.set(c.external_thread_id as string, c.id as string);
            if (!convErr) report.newConversations += 1;
          }
        }
      }
    }

    // UPDATE existing conversations (sequential — usually a tiny set
    // during History API delta paths, zero during initial sync).
    for (const t of existingConvsToUpdate) {
      const convId = existingMap.get(t.threadId)!;
      convByThread.set(t.threadId, convId);
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

    // (d) Upsert messages
    const messagesPayload: Array<{
      conversation_id: string;
      workspace_id: string;
      direction: "in" | "out";
      external_id: string;
      body_text: string | null;
      body_html: string | null;
      sent_at: string;
      metadata: Record<string, unknown>;
    }> = [];
    for (const t of toUpsert) {
      const convId = convByThread.get(t.threadId);
      if (!convId) continue;
      for (const m of t.messages) {
        messagesPayload.push({
          conversation_id: convId,
          workspace_id: account.workspace_id,
          direction: m.direction,
          external_id: m.external_id,
          body_text: m.body_text,
          body_html: m.body_html,
          sent_at: m.sent_at,
          metadata: m.metadata,
        });
        existingMessageIds.add(m.external_id);
      }
    }
    if (messagesPayload.length > 0) {
      // Try batch upsert first — fast path. If anything in the batch
      // violates a constraint (one bad row poisons the whole INSERT in
      // Postgres), fall back to inserting one message at a time so a
      // single broken row doesn't drop the other 15.
      const { error: batchErr } = await supabase
        .from("messages")
        .upsert(messagesPayload, {
          onConflict: "conversation_id,external_id",
          ignoreDuplicates: true,
        });

      if (!batchErr) {
        report.newMessages += messagesPayload.length;
      } else {
        report.errors.push(`messages batch failed (${batchErr.message}) — retrying per-message`);
        // eslint-disable-next-line no-console
        console.error("messages batch upsert failed:", batchErr);
        let okCount = 0;
        for (const m of messagesPayload) {
          const { error: oneErr } = await supabase
            .from("messages")
            .upsert([m], {
              onConflict: "conversation_id,external_id",
              ignoreDuplicates: true,
            });
          if (oneErr) {
            report.errors.push(
              `msg ${m.external_id}: ${oneErr.message.slice(0, 100)}`
            );
            // eslint-disable-next-line no-console
            console.error(`messages single insert failed (${m.external_id}):`, oneErr, {
              conv: m.conversation_id,
              direction: m.direction,
              hasText: !!m.body_text,
              textLen: m.body_text?.length ?? 0,
              hasHtml: !!m.body_html,
              htmlLen: m.body_html?.length ?? 0,
              metadataKeys: Object.keys(m.metadata ?? {}),
            });
          } else {
            okCount += 1;
          }
        }
        report.newMessages += okCount;
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
