"use server";

import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import {
  extractMessageContent,
  getThread,
  getValidAccessToken,
} from "@/lib/gmail";

/**
 * Mue — the Freescale AI copilot. First feature wired: contextual reply
 * suggestions. Reads the active conversation from Gmail (same live-fetch
 * path as the thread view), feeds it to Claude, and returns three reply
 * drafts the user can one-click into the composer.
 *
 * Why server-side: the Anthropic API key is a server-only secret. Doing
 * this in a Server Action also lets us reuse the existing Gmail token
 * refresh path without re-implementing it client-side.
 */

const SYSTEM_PROMPT = `You are Mue, the in-app copilot for Freescale — a unified-inbox SaaS. The user is composing a REPLY to an email conversation and wants three short, ready-to-send draft suggestions.

Rules:
- Generate EXACTLY three distinct reply drafts.
- Each draft must be self-contained, polite, professional, and in the SAME LANGUAGE as the most recent message.
- Match the conversation tone (formal vs casual) the user has been using.
- Cover three different stances when relevant: (a) accept/proceed, (b) ask for clarification or info, (c) polite decline / defer.
- If the most recent message is purely informational (no question / no action requested), generate (a) a thank-you/acknowledgment, (b) a follow-up question, (c) a brief opinion.
- NO greeting line ("Bonjour …" / "Hi …") and NO signature ("Cordialement, …" / "Best, …"). The composer already handles those.
- 1-3 sentences each. Concise. No flourishes.

Return strict JSON: { "suggestions": [{ "label": string (3-4 word UI label), "text": string (the reply) }] }

The "label" is what we show on the button (e.g. "Confirmer le rendez-vous", "Demander plus d'infos", "Décliner poliment"). The "text" is what we paste in the composer when clicked.`;

export type ReplySuggestion = { label: string; text: string };

export async function suggestReplies(
  conversationId: string
): Promise<{ suggestions: ReplySuggestion[]; error: string | null }> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return {
      suggestions: [],
      error: "ANTHROPIC_API_KEY not set on the server. Add it to .env.local + Vercel env.",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { suggestions: [], error: "unauthenticated" };

  const { data: conv, error: convErr } = await supabase
    .from("conversations")
    .select(
      "external_thread_id, channel_account_id, channel_accounts(kind, encrypted_tokens, external_id)"
    )
    .eq("id", conversationId)
    .maybeSingle();

  if (convErr || !conv) {
    return { suggestions: [], error: `conv lookup: ${convErr?.message ?? "not found"}` };
  }
  if (!conv.external_thread_id) {
    return { suggestions: [], error: "no external_thread_id on conv" };
  }

  const rawAccount = conv.channel_accounts as unknown;
  const account = Array.isArray(rawAccount) ? rawAccount[0] : rawAccount;
  const tokens = (account as { encrypted_tokens?: string } | null)?.encrypted_tokens;
  const externalId = (account as { external_id?: string } | null)?.external_id ?? "";
  const kind = (account as { kind?: string } | null)?.kind;

  if (!tokens || kind !== "gmail") {
    return { suggestions: [], error: "no Gmail token for this conversation" };
  }

  const { accessToken } = await getValidAccessToken(tokens);

  let thread: Awaited<ReturnType<typeof getThread>>;
  try {
    thread = await getThread(accessToken, conv.external_thread_id as string);
  } catch (err) {
    return {
      suggestions: [],
      error: err instanceof Error ? err.message : String(err),
    };
  }

  const userEmail = externalId.toLowerCase();
  const parsed = thread.messages
    .map((m) => extractMessageContent(m))
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  if (parsed.length === 0) {
    return { suggestions: [], error: "empty thread" };
  }

  // Compose the transcript Claude sees. Keep it bounded — long newsletter
  // bodies blow the context window and add no signal. Cap each message
  // body at 2000 chars; usually plenty for a real conversation.
  const transcript = parsed
    .map((p) => {
      const isOut = p.from.email.toLowerCase() === userEmail;
      const senderLabel = isOut ? "Me" : `${p.from.name ?? p.from.email}`;
      const body = (p.text || p.snippet || "").slice(0, 2000).trim();
      return `--- ${senderLabel} (${p.date.toISOString()})\nSubject: ${p.subject}\n${body}`;
    })
    .join("\n\n");

  const userMessage = `Conversation thread (oldest → newest):\n\n${transcript}\n\nGenerate three reply drafts for me to send next.`;

  const client = new Anthropic({ apiKey });
  let raw: string;
  try {
    const resp = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userMessage }],
    });
    const block = resp.content.find((b) => b.type === "text");
    raw = block && "text" in block ? block.text : "";
  } catch (err) {
    return {
      suggestions: [],
      error: err instanceof Error ? err.message : String(err),
    };
  }

  // Parse the JSON Claude returns. Be defensive: if the model wrapped it
  // in prose or fenced it in ``` blocks, strip those before JSON.parse.
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim();
  // Find first { and last } to extract the JSON object
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  const jsonSlice =
    firstBrace >= 0 && lastBrace > firstBrace
      ? cleaned.slice(firstBrace, lastBrace + 1)
      : cleaned;

  try {
    const parsedJson = JSON.parse(jsonSlice) as { suggestions?: ReplySuggestion[] };
    const suggestions = (parsedJson.suggestions ?? [])
      .filter((s) => s && typeof s.label === "string" && typeof s.text === "string")
      .slice(0, 3);
    return { suggestions, error: null };
  } catch (err) {
    return {
      suggestions: [],
      error: `parse: ${err instanceof Error ? err.message : err} — raw: ${raw.slice(0, 200)}`,
    };
  }
}
