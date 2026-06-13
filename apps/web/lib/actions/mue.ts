"use server";

import { consumeMueAction } from "@/lib/actions/billing";
import {
  isDevNoAuth,
  mockAskMueAnswer,
  mockDailyBriefing,
  mockReplySuggestions,
  mockSuggestedTasks,
  mockThreadSummary,
  mockToneRewrite,
  mockTranslatedMessages,
} from "@/lib/dev-mock";
import { extractMessageContent, getThread, getValidAccessToken } from "@/lib/gmail";
import {
  type MueChatHistoryItem,
  type MueMemory,
  type MueProfileContext,
  type MueTone,
  buildAskMueMessages,
  buildLocalAskMueFallback,
  buildLocalToneRewriteFallback,
  buildToneRewriteMessages,
  normalizeMueQuestion,
  parseMueAnswer,
  parseToneRewrite,
} from "@/lib/mue-chat";
import { createClient } from "@/lib/supabase/server";
import { getActiveWorkspaceId } from "@/lib/workspace";
import Anthropic from "@anthropic-ai/sdk";

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
type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

async function getPrimaryWorkspaceId(
  supabase: SupabaseServerClient
): Promise<{ workspaceId: string | null; error: string | null }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { workspaceId: null, error: "unauthenticated" };

  const workspaceId = await getActiveWorkspaceId(supabase, user.id);
  return { workspaceId, error: workspaceId ? null : "no workspace" };
}

export async function suggestReplies(
  conversationId: string
): Promise<{ suggestions: ReplySuggestion[]; error: string | null }> {
  if (isDevNoAuth()) return { suggestions: mockReplySuggestions(conversationId), error: null };
  const baseUrl = process.env.ANTHROPIC_BASE_URL;
  const authToken = process.env.ANTHROPIC_AUTH_TOKEN;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!authToken && !apiKey) {
    return {
      suggestions: [],
      error: "Aucun credential Claude configuré (ANTHROPIC_AUTH_TOKEN ou ANTHROPIC_API_KEY).",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { suggestions: [], error: "unauthenticated" };

  const usage = await consumeMueAction();
  if (!usage.allowed) {
    return { suggestions: [], error: usage.error ?? "Limite Mue atteinte." };
  }

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

  // Mue rédige dans TON style (profil appris) + ta mémoire — plus du Claude
  // générique. (ton/langue PAR CLIENT viendra avec la migration contacts.)
  const workspaceId = await getActiveWorkspaceId(supabase, user.id);
  const [profileCtx, memories] = await Promise.all([
    fetchMueProfileContext(supabase, user.id),
    workspaceId ? fetchMueMemories(supabase, workspaceId) : Promise.resolve([]),
  ]);
  const styleAddendum = [
    profileCtx.styleProfile
      ? `\n\nSTYLE D'ÉCRITURE DE L'UTILISATEUR — imite-le fidèlement (tournures, longueur, formules de politesse, niveau de langue) :\n${profileCtx.styleProfile}`
      : "",
    memories.length
      ? `\n\nCONTEXTE MÉMORISÉ (utilise-le si pertinent) :\n${memories.map((m) => `- ${m.content}`).join("\n")}`
      : "",
  ].join("");

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
      system: SYSTEM_PROMPT + styleAddendum,
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
    firstBrace >= 0 && lastBrace > firstBrace ? cleaned.slice(firstBrace, lastBrace + 1) : cleaned;

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

function contactNameFromJoin(rawContact: unknown): string {
  const contact = Array.isArray(rawContact) ? rawContact[0] : rawContact;
  if (!contact || typeof contact !== "object") return "Contact";
  const record = contact as Record<string, unknown>;
  const displayName = typeof record.display_name === "string" ? record.display_name : null;
  const email = typeof record.email === "string" ? record.email : null;
  return displayName || email || "Contact";
}

async function fetchCachedConversationTranscript(
  supabase: SupabaseServerClient,
  conversationId: string,
  workspaceId: string
): Promise<{ transcript: string | null; error: string | null }> {
  const { data: conversation, error: convError } = await supabase
    .from("conversations")
    .select("id, subject, preview, contacts(display_name, email)")
    .eq("id", conversationId)
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (convError || !conversation) {
    return { transcript: null, error: convError?.message ?? "conversation not found" };
  }

  const { data: rows, error: messageError } = await supabase
    .from("messages")
    .select("direction, body_text, sent_at")
    .eq("conversation_id", conversationId)
    .eq("workspace_id", workspaceId)
    .order("sent_at", { ascending: true })
    .limit(40);

  if (messageError) {
    return { transcript: null, error: messageError.message };
  }

  const messages = (rows ?? []) as Array<Record<string, unknown>>;
  const contactName = contactNameFromJoin((conversation as Record<string, unknown>).contacts);
  const subject =
    typeof conversation.subject === "string" && conversation.subject.trim()
      ? conversation.subject.trim()
      : "(no subject)";

  if (messages.length === 0) {
    const preview =
      typeof conversation.preview === "string" && conversation.preview.trim()
        ? conversation.preview.trim()
        : "";
    return {
      transcript: `--- ${contactName}\nSubject: ${subject}\n${preview}`,
      error: null,
    };
  }

  const transcript = messages
    .map((message) => {
      const direction = message.direction === "out" ? "Me" : contactName;
      const sentAt = typeof message.sent_at === "string" ? message.sent_at : "";
      const body = typeof message.body_text === "string" ? message.body_text : "";
      return `--- ${direction} (${sentAt})\nSubject: ${subject}\n${body.slice(0, 2500).trim()}`;
    })
    .join("\n\n");

  return { transcript, error: null };
}

async function fetchMueMemories(
  supabase: SupabaseServerClient,
  workspaceId: string
): Promise<MueMemory[]> {
  const { data } = await supabase
    .from("mue_memories")
    .select("kind, content")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false })
    .limit(12);

  return ((data ?? []) as Array<Record<string, unknown>>)
    .map((row) => ({
      kind: typeof row.kind === "string" ? row.kind : "fact",
      content: typeof row.content === "string" ? row.content.trim() : "",
    }))
    .filter((memory) => memory.content.length > 0);
}

async function fetchMueProfileContext(
  supabase: SupabaseServerClient,
  userId: string
): Promise<MueProfileContext> {
  const { data } = await supabase
    .from("profiles")
    .select("mue_persona, mue_style_profile")
    .eq("id", userId)
    .maybeSingle();

  return {
    persona: (data?.mue_persona as string | null) ?? null,
    styleProfile: (data?.mue_style_profile as string | null) ?? null,
  };
}

async function fetchMueChatHistory(
  supabase: SupabaseServerClient,
  workspaceId: string,
  conversationId?: string | null,
  limit = 10
): Promise<MueChatHistoryItem[]> {
  let query = supabase
    .from("mue_chat_messages")
    .select("role, content")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false })
    .limit(limit);

  query = conversationId
    ? query.eq("conversation_id", conversationId)
    : query.is("conversation_id", null);

  const { data } = await query;
  return ((data ?? []) as Array<Record<string, unknown>>)
    .reverse()
    .map((row) => ({
      role: row.role === "user" ? ("user" as const) : ("mue" as const),
      content: typeof row.content === "string" ? row.content : "",
    }))
    .filter((message) => message.content.trim().length > 0);
}

async function persistMueChatMessage(
  supabase: SupabaseServerClient,
  input: {
    workspaceId: string;
    conversationId?: string | null;
    role: "user" | "mue";
    content: string;
    metadata?: Record<string, unknown>;
  }
) {
  const content = input.content.trim();
  if (!content) return;
  await supabase.from("mue_chat_messages").insert({
    workspace_id: input.workspaceId,
    conversation_id: input.conversationId ?? null,
    role: input.role,
    content: content.slice(0, 12_000),
    metadata: input.metadata ?? {},
  });
}

export type MueChatMessageRow = {
  id: string;
  role: "user" | "mue";
  content: string;
  createdAt: string;
};

export async function listMueChatMessages(input?: {
  conversationId?: string | null;
}): Promise<{ messages: MueChatMessageRow[]; error: string | null }> {
  if (isDevNoAuth()) return { messages: [], error: null };
  const supabase = await createClient();
  const { workspaceId, error } = await getPrimaryWorkspaceId(supabase);
  if (!workspaceId) return { messages: [], error: error ?? "no workspace" };

  let query = supabase
    .from("mue_chat_messages")
    .select("id, role, content, created_at")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: true })
    .limit(60);

  query = input?.conversationId
    ? query.eq("conversation_id", input.conversationId)
    : query.is("conversation_id", null);

  const { data, error: queryError } = await query;
  if (queryError) return { messages: [], error: queryError.message };

  const messages = ((data ?? []) as Array<Record<string, unknown>>).map((row) => ({
    id: String(row.id),
    role: row.role === "user" ? ("user" as const) : ("mue" as const),
    content: typeof row.content === "string" ? row.content : "",
    createdAt: typeof row.created_at === "string" ? row.created_at : "",
  }));

  return { messages, error: null };
}

export async function clearMueChat(input?: {
  conversationId?: string | null;
}): Promise<{ ok: boolean; error: string | null }> {
  if (isDevNoAuth()) return { ok: true, error: null };
  const supabase = await createClient();
  const { workspaceId, error } = await getPrimaryWorkspaceId(supabase);
  if (!workspaceId) return { ok: false, error: error ?? "no workspace" };

  let query = supabase.from("mue_chat_messages").delete().eq("workspace_id", workspaceId);
  query = input?.conversationId
    ? query.eq("conversation_id", input.conversationId)
    : query.is("conversation_id", null);
  const { error: deleteError } = await query;
  return { ok: !deleteError, error: deleteError?.message ?? null };
}

function normalizeMemoryKind(kind: string): string {
  const normalized = kind.trim().toLowerCase();
  if (normalized === "preferences") return "preference";
  if (normalized === "processes") return "process";
  if (normalized === "anything") return "fact";
  if (["client", "project", "preference", "process", "fact"].includes(normalized)) {
    return normalized;
  }
  return "fact";
}

export type AskMueResult = { answer: string | null; error: string | null };

export async function askMue(input: {
  conversationId?: string | null;
  question: string;
}): Promise<AskMueResult> {
  const question = normalizeMueQuestion(input.question);
  if (!question) return { answer: null, error: "Question vide." };
  if (isDevNoAuth()) return { answer: mockAskMueAnswer(question), error: null };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { answer: null, error: "unauthenticated" };

  const { workspaceId, error: workspaceError } = await getPrimaryWorkspaceId(supabase);
  if (!workspaceId) return { answer: null, error: workspaceError ?? "no workspace" };

  const usage = await consumeMueAction();
  if (!usage.allowed) return { answer: null, error: usage.error ?? "Limite Mue atteinte." };

  const memories = await fetchMueMemories(supabase, workspaceId);
  const profile = await fetchMueProfileContext(supabase, user.id);
  const history = await fetchMueChatHistory(supabase, workspaceId, input.conversationId, 10);
  let transcript: string | null = null;

  if (input.conversationId) {
    const liveThread = await fetchThreadTranscript(input.conversationId);
    if (liveThread.transcript) {
      transcript = liveThread.transcript;
    } else {
      const cachedThread = await fetchCachedConversationTranscript(
        supabase,
        input.conversationId,
        workspaceId
      );
      transcript = cachedThread.transcript;
    }
  }

  await persistMueChatMessage(supabase, {
    workspaceId,
    conversationId: input.conversationId ?? null,
    role: "user",
    content: question,
  });

  const messages = buildAskMueMessages({ question, transcript, memories, history, profile });
  const fallback = (reason: string) =>
    buildLocalAskMueFallback({
      question,
      transcript,
      memories,
      reason,
    });

  const client = buildAnthropicClient();
  if (!client) {
    const answer = fallback("clé IA absente");
    await persistMueChatMessage(supabase, {
      workspaceId,
      conversationId: input.conversationId ?? null,
      role: "mue",
      content: answer,
      metadata: { fallback: true, reason: "clé IA absente" },
    });
    return {
      answer,
      error: null,
    };
  }

  try {
    const raw = await callClaude(client, messages.system, messages.user, 900);
    const answer = parseMueAnswer(raw);
    if (answer) {
      await persistMueChatMessage(supabase, {
        workspaceId,
        conversationId: input.conversationId ?? null,
        role: "mue",
        content: answer,
      });
    }
    return {
      answer: answer || null,
      error: answer ? null : "Réponse Mue vide.",
    };
  } catch (err) {
    const rawError = err instanceof Error ? err.message : String(err);
    const reason = /quota|429|rate/i.test(rawError) ? "quota IA épuisé" : "modèle IA indisponible";
    const answer = fallback(reason);
    await persistMueChatMessage(supabase, {
      workspaceId,
      conversationId: input.conversationId ?? null,
      role: "mue",
      content: answer,
      metadata: { fallback: true, reason },
    });
    return { answer, error: null };
  }
}

export type MueMemoryRow = {
  id: string;
  kind: string;
  content: string;
  createdAt: string;
};

export async function listMueMemories(): Promise<{
  memories: MueMemoryRow[];
  error: string | null;
}> {
  const supabase = await createClient();
  const { workspaceId, error } = await getPrimaryWorkspaceId(supabase);
  if (!workspaceId) return { memories: [], error: error ?? "no workspace" };

  const { data, error: queryError } = await supabase
    .from("mue_memories")
    .select("id, kind, content, created_at")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false })
    .limit(20);

  if (queryError) return { memories: [], error: queryError.message };

  const memories = ((data ?? []) as Array<Record<string, unknown>>).map((row) => ({
    id: String(row.id),
    kind: typeof row.kind === "string" ? row.kind : "fact",
    content: typeof row.content === "string" ? row.content : "",
    createdAt: typeof row.created_at === "string" ? row.created_at : "",
  }));

  return { memories, error: null };
}

export async function saveMueMemory(input: {
  kind: string;
  content: string;
}): Promise<{ ok: boolean; error: string | null }> {
  const content = input.content.replace(/\s+/g, " ").trim().slice(0, 4000);
  if (!content) return { ok: false, error: "Mémoire vide." };

  const supabase = await createClient();
  const { workspaceId, error } = await getPrimaryWorkspaceId(supabase);
  if (!workspaceId) return { ok: false, error: error ?? "no workspace" };

  const { error: insertError } = await supabase.from("mue_memories").insert({
    workspace_id: workspaceId,
    kind: normalizeMemoryKind(input.kind),
    content,
    source_conversation_id: null,
    embedding: null,
  });

  if (insertError) return { ok: false, error: insertError.message };
  return { ok: true, error: null };
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

async function fetchBestConversationTranscript(
  supabase: SupabaseServerClient,
  conversationId: string | null | undefined,
  workspaceId: string
): Promise<string | null> {
  if (!conversationId) return null;
  const liveThread = await fetchThreadTranscript(conversationId);
  if (liveThread.transcript) return liveThread.transcript;
  const cachedThread = await fetchCachedConversationTranscript(
    supabase,
    conversationId,
    workspaceId
  );
  return cachedThread.transcript;
}

export async function rewriteDraftTone(input: {
  conversationId?: string | null;
  text: string;
  tone: MueTone;
}): Promise<{ text: string | null; error: string | null }> {
  const draft = input.text.trim().slice(0, 8000);
  if (!draft) return { text: null, error: "Draft vide." };
  if (isDevNoAuth()) return { text: mockToneRewrite(input.text, input.tone), error: null };
  const tone: MueTone = ["formal", "casual", "friendly"].includes(input.tone)
    ? input.tone
    : "friendly";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { text: null, error: "unauthenticated" };

  const { workspaceId, error: workspaceError } = await getPrimaryWorkspaceId(supabase);
  if (!workspaceId) return { text: null, error: workspaceError ?? "no workspace" };

  const usage = await consumeMueAction();
  if (!usage.allowed) return { text: null, error: usage.error ?? "Limite Mue atteinte." };

  const [memories, profile, transcript] = await Promise.all([
    fetchMueMemories(supabase, workspaceId),
    fetchMueProfileContext(supabase, user.id),
    fetchBestConversationTranscript(supabase, input.conversationId, workspaceId),
  ]);
  const messages = buildToneRewriteMessages({ draft, tone, transcript, memories, profile });
  const client = buildAnthropicClient();
  if (!client) {
    return {
      text: buildLocalToneRewriteFallback({ draft, tone, reason: "clé IA absente" }),
      error: null,
    };
  }

  try {
    const raw = await callClaude(client, messages.system, messages.user, 700);
    const rewritten = parseToneRewrite(raw);
    return { text: rewritten || draft, error: null };
  } catch (err) {
    const reason = err instanceof Error ? err.message : "modèle IA indisponible";
    return {
      text: buildLocalToneRewriteFallback({ draft, tone, reason }),
      error: null,
    };
  }
}

function buildLocalStyleProfile(sentMessages: string[]): string {
  const joined = sentMessages.join("\n").toLowerCase();
  const avgLength =
    sentMessages.reduce((sum, message) => sum + message.length, 0) /
    Math.max(sentMessages.length, 1);
  const usesFrench = /bonjour|merci|cordialement|bien à vous|salut|ça|je vous/.test(joined);
  const signoff = /cordialement|bien à vous|bonne journée/.test(joined)
    ? "avec formules de politesse"
    : "sans formule finale lourde";
  const density =
    avgLength > 900
      ? "réponses détaillées"
      : avgLength > 350
        ? "réponses structurées"
        : "réponses courtes";
  const language = usesFrench ? "français prioritaire" : "langue du contact";
  return `Style observé: ${density}, ${language}, ${signoff}. Préférer des phrases claires, une prochaine étape explicite, et éviter les formulations vagues.`;
}

export async function learnMueStyleFromSentMail(): Promise<{
  styleProfile: string | null;
  error: string | null;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { styleProfile: null, error: "unauthenticated" };

  const { workspaceId, error: workspaceError } = await getPrimaryWorkspaceId(supabase);
  if (!workspaceId) return { styleProfile: null, error: workspaceError ?? "no workspace" };

  const { data, error } = await supabase
    .from("messages")
    .select("body_text")
    .eq("workspace_id", workspaceId)
    .eq("direction", "out")
    .not("body_text", "is", null)
    .order("sent_at", { ascending: false })
    .limit(20);

  if (error) return { styleProfile: null, error: error.message };
  const sentMessages = ((data ?? []) as Array<Record<string, unknown>>)
    .map((row) => (typeof row.body_text === "string" ? row.body_text.trim() : ""))
    .filter((body) => body.length > 20);
  if (sentMessages.length === 0) {
    return { styleProfile: null, error: "Aucun email envoyé exploitable pour apprendre le style." };
  }

  let styleProfile = buildLocalStyleProfile(sentMessages);
  const client = buildAnthropicClient();
  if (client) {
    const usage = await consumeMueAction();
    if (!usage.allowed) return { styleProfile: null, error: usage.error ?? "Limite Mue atteinte." };

    const prompt = `Analyze these sent email snippets and produce a compact writing style profile in French.

Rules:
- Max 7 bullets.
- Describe tone, sentence length, greeting/signoff habits, directness, and preferred structure.
- Do not quote private content.
- Make it useful for rewriting future replies in the user's voice.

Sent snippets:
${sentMessages.map((message, index) => `${index + 1}. ${message.slice(0, 1200)}`).join("\n\n")}`;

    try {
      const raw = await callClaude(
        client,
        "You create concise private writing-style profiles for an email copilot.",
        prompt,
        700
      );
      const parsed = parseMueAnswer(raw);
      if (parsed) styleProfile = parsed.slice(0, 4000);
    } catch {
      // Keep deterministic local profile.
    }
  }

  await supabase
    .from("profiles")
    .update({
      mue_style_profile: styleProfile,
      mue_style_updated_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  return { styleProfile, error: null };
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
  if (isDevNoAuth()) return { summary: mockThreadSummary(conversationId), error: null };
  const client = buildAnthropicClient();
  if (!client) return { summary: null, error: "ANTHROPIC credentials not set" };

  const supabase = await createClient();
  const { workspaceId, error: workspaceError } = await getPrimaryWorkspaceId(supabase);
  if (!workspaceId) return { summary: null, error: workspaceError ?? "no workspace" };

  const transcript = await fetchBestConversationTranscript(supabase, conversationId, workspaceId);
  if (!transcript) return { summary: null, error: "no transcript found" };

  const usage = await consumeMueAction();
  if (!usage.allowed) return { summary: null, error: usage.error ?? "Limite Mue atteinte." };

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

  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim();
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  const slice =
    firstBrace >= 0 && lastBrace > firstBrace ? cleaned.slice(firstBrace, lastBrace + 1) : cleaned;
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
  if (isDevNoAuth()) return { tasks: mockSuggestedTasks(conversationId), error: null };
  const client = buildAnthropicClient();
  if (!client) return { tasks: [], error: "ANTHROPIC credentials not set" };

  const supabase = await createClient();
  const { workspaceId, error: workspaceError } = await getPrimaryWorkspaceId(supabase);
  if (!workspaceId) return { tasks: [], error: workspaceError ?? "no workspace" };

  const transcript = await fetchBestConversationTranscript(supabase, conversationId, workspaceId);
  if (!transcript) return { tasks: [], error: "no transcript found" };

  const usage = await consumeMueAction();
  if (!usage.allowed) return { tasks: [], error: usage.error ?? "Limite Mue atteinte." };

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

  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim();
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  const slice =
    firstBrace >= 0 && lastBrace > firstBrace ? cleaned.slice(firstBrace, lastBrace + 1) : cleaned;
  try {
    const parsed = JSON.parse(slice) as { tasks?: SuggestedTask[] };
    const tasks = (parsed.tasks ?? [])
      .filter((t) => t && typeof t.title === "string")
      .slice(0, 5)
      .map((t) => ({
        title: t.title,
        priority: t.priority === "high" || t.priority === "low" ? t.priority : ("medium" as const),
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

const BRIEFING_SYSTEM = `You are Mue, the user's inbox copilot. Scan the user's recent conversations and extract CONCRETE ACTION ITEMS they should do today. Each item must reference the conversation it came from.

Output strict JSON, no fences:
{
  "headline": "<one warm sentence in French, max 18 words>",
  "items": [
    {
      "conv_index": <1-based index of the conversation in the input list>,
      "title": "<imperative French verb-led title, max 70 chars>",
      "why": "<one-line context, max 15 words>",
      "priority": "high" | "medium" | "low",
      "due": "<ISO date YYYY-MM-DD or null>"
    }
  ]
}

Rules:
- 0 to 6 items. ONLY include real actionable items the user needs to do (reply, follow-up, schedule, send, decide, review). Skip pure FYI / pleasantries / generic newsletters.
- Each title is an IMPERATIVE in French: "Répondre à X concernant…", "Confirmer le RDV…", "Envoyer le devis à…", "Relancer Y sur…", "Préparer le brief pour…".
- priority: "high" if the user is blocking someone or there's a deadline today/tomorrow. "low" if it's nice-to-do. "medium" otherwise.
- due: ISO date ONLY when the conversation explicitly mentions a date. null otherwise.
- conv_index: the number of the conversation in the input list (1-based, integer).
- French throughout. No emoji. No markdown.
- headline tone: friendly, direct ("Voici ce qui mérite votre attention ce matin." / "X messages prioritaires à traiter aujourd'hui.").
- If nothing actionable: {"headline": "Inbox calme — rien d'urgent ce matin.", "items": []}.`;

export type DailyBriefingItem = {
  conversationId: string;
  contactName: string;
  title: string;
  why: string;
  priority: "high" | "medium" | "low";
  due: string | null;
  imageUrl?: string | null;
  timeAgo?: string | null;
  avatars?: Array<{ kind: "initials" | "image"; text?: string; bg?: string; url?: string }>;
};
export type DailyBriefing = {
  headline: string;
  items: DailyBriefingItem[];
};

export async function dailyBriefing(): Promise<{
  briefing: DailyBriefing | null;
  error: string | null;
}> {
  if (isDevNoAuth()) return { briefing: mockDailyBriefing(), error: null };
  const client = buildAnthropicClient();
  if (!client) return { briefing: null, error: "ANTHROPIC credentials not set" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { briefing: null, error: "unauthenticated" };

  const workspaceId = await getActiveWorkspaceId(supabase, user.id);
  if (!workspaceId) return { briefing: null, error: "no workspace" };

  // Recent client conversations — the brief focuses on what matters,
  // not the newsletter flood. Fall back to top-20 last-active if Mue
  // hasn't classified anything yet.
  const { data: classified } = await supabase
    .from("conversations")
    .select("id, subject, preview, last_message_at, category, contacts(display_name, email)")
    .eq("workspace_id", workspaceId)
    .eq("archived", false)
    .eq("category", "client")
    .order("last_message_at", { ascending: false })
    .limit(25);

  let convs = classified ?? [];
  if (convs.length === 0) {
    const { data: fallback } = await supabase
      .from("conversations")
      .select("id, subject, preview, last_message_at, category, contacts(display_name, email)")
      .eq("workspace_id", workspaceId)
      .eq("archived", false)
      .order("last_message_at", { ascending: false })
      .limit(20);
    convs = fallback ?? [];
  }

  if (convs.length === 0) {
    return {
      briefing: {
        headline: "Inbox vide — profitez de la pause.",
        items: [],
      },
      error: null,
    };
  }

  const usage = await consumeMueAction();
  if (!usage.allowed) return { briefing: null, error: usage.error ?? "Limite Mue atteinte." };

  // Build a numbered list Claude can reference back by index, and a parallel
  // lookup of (index → conv id + contact name) so we can hydrate the AI's
  // conv_index pointers back to real IDs for the task-creation buttons.
  const convByIndex = new Map<number, { id: string; contactName: string }>();
  const transcript = convs
    .map((c, i) => {
      const contact = Array.isArray(c.contacts) ? c.contacts[0] : c.contacts;
      const name = (contact?.display_name as string) || (contact?.email as string) || "?";
      const subject = ((c.subject as string) || "(no subject)").slice(0, 100);
      const preview = ((c.preview as string) || "").slice(0, 220).replace(/\s+/g, " ").trim();
      convByIndex.set(i + 1, { id: c.id as string, contactName: name });
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

  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim();
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  const slice =
    firstBrace >= 0 && lastBrace > firstBrace ? cleaned.slice(firstBrace, lastBrace + 1) : cleaned;
  try {
    const parsed = JSON.parse(slice) as {
      headline?: string;
      items?: Array<{
        conv_index?: number;
        title?: string;
        why?: string;
        priority?: string;
        due?: string | null;
      }>;
    };
    if (!parsed.headline) return { briefing: null, error: "malformed briefing" };
    const items: DailyBriefingItem[] = (parsed.items ?? [])
      .map((it) => {
        if (!it || typeof it.title !== "string" || typeof it.conv_index !== "number") {
          return null;
        }
        const convRef = convByIndex.get(it.conv_index);
        if (!convRef) return null;
        const priority =
          it.priority === "high" || it.priority === "low" ? it.priority : ("medium" as const);
        return {
          conversationId: convRef.id,
          contactName: convRef.contactName,
          title: it.title,
          why: typeof it.why === "string" ? it.why : "",
          priority,
          due: typeof it.due === "string" && it.due ? it.due : null,
        };
      })
      .filter((x): x is DailyBriefingItem => x !== null)
      .slice(0, 6);
    return { briefing: { headline: parsed.headline, items }, error: null };
  } catch (err) {
    return {
      briefing: null,
      error: `parse: ${err instanceof Error ? err.message : err} — raw: ${raw.slice(0, 200)}`,
    };
  }
}

/**
 * Persist a briefing item into the tasks table. Called when the user
 * clicks "Créer cette tâche" on a briefing highlight. We pass through
 * the conversation reference so the task is anchored to the original
 * thread for context.
 */
export async function createTaskFromBrief(input: {
  conversationId: string;
  title: string;
  description?: string;
  priority?: "high" | "medium" | "low";
  due?: string | null;
}): Promise<{ ok: boolean; error: string | null }> {
  if (isDevNoAuth()) return { ok: true, error: null };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "unauthenticated" };

  const workspaceId = await getActiveWorkspaceId(supabase, user.id);
  if (!workspaceId) return { ok: false, error: "no workspace" };

  const { error } = await supabase.from("tasks").insert({
    workspace_id: workspaceId,
    conversation_id: input.conversationId,
    title: input.title,
    description: input.description ?? null,
    priority: input.priority ?? "medium",
    status: "todo",
    due_at: input.due ? new Date(input.due).toISOString() : null,
    ai_generated: true,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true, error: null };
}

export async function translateThread(
  conversationId: string,
  targetLang: string
): Promise<{ messages: TranslatedMessage[]; error: string | null }> {
  if (isDevNoAuth())
    return { messages: mockTranslatedMessages(conversationId, targetLang), error: null };
  const client = buildAnthropicClient();
  if (!client) return { messages: [], error: "ANTHROPIC credentials not set" };

  const supabase = await createClient();
  const { workspaceId, error: workspaceError } = await getPrimaryWorkspaceId(supabase);
  if (!workspaceId) return { messages: [], error: workspaceError ?? "no workspace" };

  const transcript = await fetchBestConversationTranscript(supabase, conversationId, workspaceId);
  if (!transcript) return { messages: [], error: "no transcript found" };

  const usage = await consumeMueAction();
  if (!usage.allowed) return { messages: [], error: usage.error ?? "Limite Mue atteinte." };

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

  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim();
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  const slice =
    firstBrace >= 0 && lastBrace > firstBrace ? cleaned.slice(firstBrace, lastBrace + 1) : cleaned;
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
