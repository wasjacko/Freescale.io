"use server";

import { extractMessageContent, getThread, getValidAccessToken } from "@/lib/gmail";
import { createClient } from "@/lib/supabase/server";
import type { Message } from "@/lib/types";

/**
 * Live-fetch messages for a conversation directly from Gmail when the user
 * opens it. Sidesteps the brittle DB insert path entirely — we keep
 * conversations in our DB for the inbox list, but the actual message bodies
 * are pulled on-demand from Gmail's threads.get endpoint.
 *
 * This is the approach Superhuman / Missive use: cache metadata locally for
 * fast list rendering, but stream the full content from the source when the
 * user actually clicks a thread. Trade-off is one extra round-trip per
 * conversation open (~200-400ms), but it eliminates the whole class of
 * "messages aren't in the DB" bugs we've been chasing.
 */
export async function getConversationMessages(
  conversationId: string
): Promise<{ messages: Message[]; error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { messages: [], error: "unauthenticated" };

  // Resolve the conversation's Gmail thread id + the channel account that
  // owns it. The channel_accounts join gives us the encrypted tokens we
  // need to make the Gmail API call.
  const { data: conv, error: convErr } = await supabase
    .from("conversations")
    .select(
      "external_thread_id, channel_account_id, channel_accounts(kind, encrypted_tokens, external_id)"
    )
    .eq("id", conversationId)
    .maybeSingle();

  if (convErr || !conv) {
    return { messages: [], error: `conv lookup: ${convErr?.message ?? "not found"}` };
  }
  if (!conv.external_thread_id) {
    return { messages: [], error: "no external_thread_id on conv" };
  }

  // Supabase joins always come back as either an object or array depending
  // on the relationship cardinality — normalise to a single object.
  const rawAccount = conv.channel_accounts as unknown;
  const account = Array.isArray(rawAccount) ? (rawAccount[0] ?? null) : (rawAccount ?? null);
  const tokens = (account as { encrypted_tokens?: string } | null)?.encrypted_tokens;
  const externalId = (account as { external_id?: string } | null)?.external_id ?? "";
  const kind = (account as { kind?: string } | null)?.kind;

  if (!tokens || kind !== "gmail") {
    return { messages: [], error: "no Gmail token for this conversation" };
  }

  const { accessToken, updatedBlob } = await getValidAccessToken(tokens);
  if (updatedBlob) {
    await supabase
      .from("channel_accounts")
      .update({ encrypted_tokens: updatedBlob })
      .eq("id", conv.channel_account_id as string);
  }

  let thread: Awaited<ReturnType<typeof getThread>>;
  try {
    thread = await getThread(accessToken, conv.external_thread_id as string);
  } catch (err) {
    return {
      messages: [],
      error: err instanceof Error ? err.message : String(err),
    };
  }

  const userEmail = externalId.toLowerCase();
  const messages: Message[] = thread.messages
    .map((m) => ({ raw: m, content: extractMessageContent(m) }))
    .sort((a, b) => a.content.date.getTime() - b.content.date.getTime())
    .map((p) => {
      const isOut = p.content.from.email.toLowerCase() === userEmail;
      const sent = p.content.date;
      const msg: Message = {
        id: p.raw.id,
        dir: isOut ? "out" : "in",
        text: p.content.text || "",
        time: sent.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
        dateLong: sent.toLocaleString("fr-FR", {
          weekday: "short",
          day: "numeric",
          month: "short",
          hour: "numeric",
          minute: "2-digit",
        }),
      };
      if (p.content.subject) msg.subject = p.content.subject;
      if (p.content.from.name) msg.senderName = p.content.from.name;
      if (p.content.from.email) msg.senderEmail = p.content.from.email;
      if (p.content.html) msg.bodyHtml = p.content.html;
      return msg;
    });

  return { messages, error: null };
}
