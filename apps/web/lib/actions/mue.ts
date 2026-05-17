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
 * Routing: this version hits a custom Anthropic-compatible endpoint
 * (aiapiflow.com proxy) using ANTHROPIC_BASE_URL + ANTHROPIC_AUTH_TOKEN.
 * The SDK reads those env vars automatically — same code path works
 * locally and on Vercel. No CLI subprocess needed (Vercel serverless
 * has no shell binaries to call).
 *
 * Privacy note: with a proxy, the user's email thread contents transit
 * through aiapiflow.com on the way to Claude. The user explicitly
 * configured this — they own the trade-off.
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

Output strict JSON only, no prose, no markdown fences:
{"suggestions":[{"label":"<3-4 word UI label>","text":"<the reply>"}]}

The "label" is what we show on the button (e.g. "Confirmer le rendez-vous", "Demander plus d'infos", "Décliner poliment"). The "text" is what we paste in the composer when clicked.`;

export type ReplySuggestion = { label: string; text: string };

export async function suggestReplies(
  conversationId: string
): Promise<{ suggestions: ReplySuggestion[]; error: string | null }> {
  const baseUrl = process.env.ANTHROPIC_BASE_URL;
  const authToken = process.env.ANTHROPIC_AUTH_TOKEN;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!authToken && !apiKey) {
    return {
      suggestions: [],
      error:
        "Aucun credential Claude configuré (ANTHROPIC_AUTH_TOKEN ou ANTHROPIC_API_KEY).",
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

  // Bound each message body — long newsletter bodies blow context windows
  // for no signal. Cap at 2000 chars per message.
  const transcript = parsed
    .map((p) => {
      const isOut = p.from.email.toLowerCase() === userEmail;
      const senderLabel = isOut ? "Me" : `${p.from.name ?? p.from.email}`;
      const body = (p.text || p.snippet || "").slice(0, 2000).trim();
      return `--- ${senderLabel} (${p.date.toISOString()})\nSubject: ${p.subject}\n${body}`;
    })
    .join("\n\n");

  const userMessage = `Conversation thread (oldest → newest):\n\n${transcript}\n\nGenerate three reply drafts for me to send next.`;

  // SDK auto-reads ANTHROPIC_BASE_URL + ANTHROPIC_AUTH_TOKEN from env;
  // we only set explicitly when overriding (custom hostnames need authToken
  // form which uses "Authorization: Bearer" vs the x-api-key header).
  const client = new Anthropic({
    ...(baseUrl ? { baseURL: baseUrl } : {}),
    ...(authToken ? { authToken } : {}),
    ...(apiKey && !authToken ? { apiKey } : {}),
  });

  // aiapiflow.com requires the dated model ID — the bare alias
  // `claude-haiku-4-5` returns a "channel pricing restriction" 400.
  // Allow override via env so swapping to direct Anthropic (which uses
  // aliases) is one-line later.
  const model = process.env.ANTHROPIC_MODEL ?? "claude-haiku-4-5-20251001";

  let raw: string;
  try {
    const resp = await client.messages.create({
      model,
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

// ───────────────────────────────────────────────────────────────────────
// Shared helpers for the three side-panel Mue actions (summary, tasks,
// translation). All three need the same conv-fetch + Claude-call dance,
// only the prompt and output schema differ.
// ───────────────────────────────────────────────────────────────────────

function buildAnthropicClient(): Anthropic | null {
  const baseUrl = process.env.ANTHROPIC_BASE_URL;
  const authToken = process.env.ANTHROPIC_AUTH_TOKEN;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!authToken && !apiKey) return null;
  return new Anthropic({
    ...(baseUrl ? { baseURL: baseUrl } : {}),
    ...(authToken ? { authToken } : {}),
    ...(apiKey && !authToken ? { apiKey } : {}),
  });
}

async function fetchThreadTranscript(
  conversationId: string
): Promise<{ transcript: string | null; error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { transcript: null, error: "unauthenticated" };

  const { data: conv, error: convErr } = await supabase
    .from("conversations")
    .select(
      "external_thread_id, channel_account_id, channel_accounts(kind, encrypted_tokens, external_id)"
    )
    .eq("id", conversationId)
    .maybeSingle();
  if (convErr || !conv) {
    return { transcript: null, error: `conv lookup: ${convErr?.message ?? "not found"}` };
  }
  if (!conv.external_thread_id) {
    return { transcript: null, error: "no external_thread_id on conv" };
  }

  const rawAccount = conv.channel_accounts as unknown;
  const account = Array.isArray(rawAccount) ? rawAccount[0] : rawAccount;
  const tokens = (account as { encrypted_tokens?: string } | null)?.encrypted_tokens;
  const externalId = (account as { external_id?: string } | null)?.external_id ?? "";
  const kind = (account as { kind?: string } | null)?.kind;
  if (!tokens || kind !== "gmail") {
    return { transcript: null, error: "no Gmail token for this conversation" };
  }

  const { accessToken } = await getValidAccessToken(tokens);
  let thread: Awaited<ReturnType<typeof getThread>>;
  try {
    thread = await getThread(accessToken, conv.external_thread_id as string);
  } catch (err) {
    return { transcript: null, error: err instanceof Error ? err.message : String(err) };
  }

  const userEmail = externalId.toLowerCase();
  const parsed = thread.messages
    .map((m) => extractMessageContent(m))
    .sort((a, b) => a.date.getTime() - b.date.getTime());
  if (parsed.length === 0) return { transcript: null, error: "empty thread" };

  const transcript = parsed
    .map((p) => {
      const isOut = p.from.email.toLowerCase() === userEmail;
      const senderLabel = isOut ? "Me" : `${p.from.name ?? p.from.email}`;
      const body = (p.text || p.snippet || "").slice(0, 3000).trim();
      return `--- ${senderLabel} (${p.date.toISOString()})\nSubject: ${p.subject}\n${body}`;
    })
    .join("\n\n");

  return { transcript, error: null };
}

async function callClaude(
  client: Anthropic,
  systemPrompt: string,
  userMessage: string,
  maxTokens = 1024
): Promise<string> {
  const model = process.env.ANTHROPIC_MODEL ?? "claude-haiku-4-5-20251001";
  const resp = await client.messages.create({
    model,
    max_tokens: maxTokens,
    system: systemPrompt,
    messages: [{ role: "user", content: userMessage }],
  });
  const block = resp.content.find((b) => b.type === "text");
  return block && "text" in block ? block.text : "";
}

// ─── 1. Résumer la conversation ────────────────────────────────────────

const SUMMARY_SYSTEM = `You summarize email conversations for an inbox app. Read the full thread (oldest → newest) and produce a concise summary in the SAME LANGUAGE as the thread.

Output strict JSON, no fences:
{"tldr": "<one sentence, max 25 words>", "bullets": ["<key point>", "<key point>", ...] }

Rules:
- 3 to 5 bullets max. Each bullet ≤ 15 words.
- Focus on decisions, action items, open questions. Skip pleasantries.
- If something is undecided or blocked, call it out.`;

export type ThreadSummary = { tldr: string; bullets: string[] };

export async function summarizeThread(
  conversationId: string
): Promise<{ summary: ThreadSummary | null; error: string | null }> {
  const client = buildAnthropicClient();
  if (!client) return { summary: null, error: "ANTHROPIC credentials not set" };

  const { transcript, error } = await fetchThreadTranscript(conversationId);
  if (!transcript) return { summary: null, error: error ?? "no transcript" };

  let raw: string;
  try {
    raw = await callClaude(
      client,
      SUMMARY_SYSTEM,
      `Conversation thread (oldest → newest):\n\n${transcript}\n\nReturn the JSON summary now.`,
      512
    );
  } catch (err) {
    return { summary: null, error: err instanceof Error ? err.message : String(err) };
  }

  const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "").trim();
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  const slice =
    firstBrace >= 0 && lastBrace > firstBrace
      ? cleaned.slice(firstBrace, lastBrace + 1)
      : cleaned;
  try {
    const parsed = JSON.parse(slice) as { tldr?: string; bullets?: string[] };
    if (!parsed.tldr || !Array.isArray(parsed.bullets)) {
      return { summary: null, error: "malformed summary response" };
    }
    return {
      summary: {
        tldr: parsed.tldr,
        bullets: parsed.bullets.filter((b) => typeof b === "string").slice(0, 5),
      },
      error: null,
    };
  } catch (err) {
    return {
      summary: null,
      error: `parse: ${err instanceof Error ? err.message : err} — raw: ${raw.slice(0, 200)}`,
    };
  }
}

// ─── 2. Suggérer des tâches ────────────────────────────────────────────

const TASKS_SYSTEM = `You extract concrete action items from an email conversation. The user wants a list of TODOs they should do as a result of this thread.

Output strict JSON, no fences:
{"tasks": [{"title": "<short imperative>", "priority": "high"|"medium"|"low", "due": "<ISO date or null>"}]}

Rules:
- 0 to 5 tasks. Only include real, actionable items (not "be polite", "remember to think about it").
- Each title ≤ 80 chars, in the SAME LANGUAGE as the thread.
- priority: "high" if blocking or time-sensitive, "low" if optional, "medium" otherwise.
- due: ISO 8601 date (YYYY-MM-DD) ONLY when explicitly mentioned in the thread. null otherwise.
- If the thread has no actionable items, return {"tasks": []}.`;

export type SuggestedTask = {
  title: string;
  priority: "high" | "medium" | "low";
  due: string | null;
};

export async function suggestTasks(
  conversationId: string
): Promise<{ tasks: SuggestedTask[]; error: string | null }> {
  const client = buildAnthropicClient();
  if (!client) return { tasks: [], error: "ANTHROPIC credentials not set" };

  const { transcript, error } = await fetchThreadTranscript(conversationId);
  if (!transcript) return { tasks: [], error: error ?? "no transcript" };

  let raw: string;
  try {
    raw = await callClaude(
      client,
      TASKS_SYSTEM,
      `Conversation thread (oldest → newest):\n\n${transcript}\n\nReturn the JSON task list now.`,
      512
    );
  } catch (err) {
    return { tasks: [], error: err instanceof Error ? err.message : String(err) };
  }

  const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "").trim();
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  const slice =
    firstBrace >= 0 && lastBrace > firstBrace
      ? cleaned.slice(firstBrace, lastBrace + 1)
      : cleaned;
  try {
    const parsed = JSON.parse(slice) as { tasks?: SuggestedTask[] };
    const tasks = (parsed.tasks ?? [])
      .filter((t) => t && typeof t.title === "string")
      .slice(0, 5)
      .map((t) => ({
        title: t.title,
        priority:
          t.priority === "high" || t.priority === "low" ? t.priority : ("medium" as const),
        due: typeof t.due === "string" ? t.due : null,
      }));
    return { tasks, error: null };
  } catch (err) {
    return {
      tasks: [],
      error: `parse: ${err instanceof Error ? err.message : err} — raw: ${raw.slice(0, 200)}`,
    };
  }
}

// ─── 3. Traduire la conversation ───────────────────────────────────────

const TRANSLATE_SYSTEM = `You translate email conversations. Translate every message in the thread into the target language while preserving each sender's identity and timestamp.

Output strict JSON, no fences:
{"messages": [{"sender": "<as given>", "date": "<as given>", "translated": "<the translation>"}]}

Rules:
- Keep the SAME number of messages as the input, in the SAME order.
- "translated" is the message body in the target language, kept concise and natural.
- Do NOT translate the sender name or the date.
- If a message is already in the target language, copy it verbatim.`;

export type TranslatedMessage = {
  sender: string;
  date: string;
  translated: string;
};

// ─── 4. Brief du jour ──────────────────────────────────────────────────

const BRIEFING_SYSTEM = `You are Mue, the user's inbox copilot. Produce a concise morning briefing based on the user's recent conversations — what they should pay attention to TODAY.

Output strict JSON, no fences:
{"headline": "<one warm sentence in French, max 18 words>", "highlights": [{"who": "<sender>", "why": "<one-line reason this matters>", "action": "<short verb-led next step>" }]}

Rules:
- 0 to 5 highlights. Skip pure noise (newsletters, transactional notifications) unless something is truly urgent.
- Each "why" ≤ 12 words. Each "action" ≤ 8 words.
- French output.
- "headline" sets the tone — friendly, direct. Mention how many real conversations need attention.`;

export type DailyBriefingHighlight = {
  who: string;
  why: string;
  action: string;
};
export type DailyBriefing = {
  headline: string;
  highlights: DailyBriefingHighlight[];
};

export async function dailyBriefing(): Promise<{
  briefing: DailyBriefing | null;
  error: string | null;
}> {
  const client = buildAnthropicClient();
  if (!client) return { briefing: null, error: "ANTHROPIC credentials not set" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { briefing: null, error: "unauthenticated" };

  const { data: workspace } = await supabase
    .from("workspaces")
    .select("id")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (!workspace?.id) return { briefing: null, error: "no workspace" };

  // Recent client conversations — the brief focuses on what matters,
  // not the newsletter flood. Fall back to top-20 last-active if Mue
  // hasn't classified anything yet.
  const { data: classified } = await supabase
    .from("conversations")
    .select(
      "id, subject, preview, last_message_at, category, contacts(display_name, email)"
    )
    .eq("workspace_id", workspace.id)
    .eq("archived", false)
    .eq("category", "client")
    .order("last_message_at", { ascending: false })
    .limit(25);

  let convs = classified ?? [];
  if (convs.length === 0) {
    const { data: fallback } = await supabase
      .from("conversations")
      .select(
        "id, subject, preview, last_message_at, category, contacts(display_name, email)"
      )
      .eq("workspace_id", workspace.id)
      .eq("archived", false)
      .order("last_message_at", { ascending: false })
      .limit(20);
    convs = fallback ?? [];
  }

  if (convs.length === 0) {
    return {
      briefing: {
        headline: "Inbox vide — profitez de la pause.",
        highlights: [],
      },
      error: null,
    };
  }

  const transcript = convs
    .map((c, i) => {
      const contact = Array.isArray(c.contacts) ? c.contacts[0] : c.contacts;
      const name = (contact?.display_name as string) || (contact?.email as string) || "?";
      const subject = ((c.subject as string) || "(no subject)").slice(0, 100);
      const preview = ((c.preview as string) || "").slice(0, 220).replace(/\s+/g, " ").trim();
      return `${i + 1}. From: ${name}\n   Subject: ${subject}\n   Preview: ${preview}`;
    })
    .join("\n\n");

  let raw: string;
  try {
    raw = await callClaude(
      client,
      BRIEFING_SYSTEM,
      `Recent client conversations (most recent first):\n\n${transcript}\n\nGenerate the briefing JSON now.`,
      1024
    );
  } catch (err) {
    return { briefing: null, error: err instanceof Error ? err.message : String(err) };
  }

  const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "").trim();
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  const slice =
    firstBrace >= 0 && lastBrace > firstBrace
      ? cleaned.slice(firstBrace, lastBrace + 1)
      : cleaned;
  try {
    const parsed = JSON.parse(slice) as {
      headline?: string;
      highlights?: DailyBriefingHighlight[];
    };
    if (!parsed.headline) return { briefing: null, error: "malformed briefing" };
    return {
      briefing: {
        headline: parsed.headline,
        highlights: (parsed.highlights ?? [])
          .filter(
            (h) =>
              h && typeof h.who === "string" && typeof h.why === "string" && typeof h.action === "string"
          )
          .slice(0, 5),
      },
      error: null,
    };
  } catch (err) {
    return {
      briefing: null,
      error: `parse: ${err instanceof Error ? err.message : err} — raw: ${raw.slice(0, 200)}`,
    };
  }
}

export async function translateThread(
  conversationId: string,
  targetLang: string
): Promise<{ messages: TranslatedMessage[]; error: string | null }> {
  const client = buildAnthropicClient();
  if (!client) return { messages: [], error: "ANTHROPIC credentials not set" };

  const { transcript, error } = await fetchThreadTranscript(conversationId);
  if (!transcript) return { messages: [], error: error ?? "no transcript" };

  let raw: string;
  try {
    raw = await callClaude(
      client,
      TRANSLATE_SYSTEM,
      `Target language: ${targetLang}\n\nConversation thread (oldest → newest):\n\n${transcript}\n\nReturn the JSON translation now.`,
      2048
    );
  } catch (err) {
    return { messages: [], error: err instanceof Error ? err.message : String(err) };
  }

  const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "").trim();
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  const slice =
    firstBrace >= 0 && lastBrace > firstBrace
      ? cleaned.slice(firstBrace, lastBrace + 1)
      : cleaned;
  try {
    const parsed = JSON.parse(slice) as { messages?: TranslatedMessage[] };
    const messages = (parsed.messages ?? []).filter(
      (m) =>
        m &&
        typeof m.sender === "string" &&
        typeof m.date === "string" &&
        typeof m.translated === "string"
    );
    return { messages, error: null };
  } catch (err) {
    return {
      messages: [],
      error: `parse: ${err instanceof Error ? err.message : err} — raw: ${raw.slice(0, 200)}`,
    };
  }
}
