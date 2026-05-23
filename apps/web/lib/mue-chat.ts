export type MueMemory = {
  kind: string;
  content: string;
};

export type MueChatHistoryItem = {
  role: "user" | "mue";
  content: string;
};

export type MueProfileContext = {
  persona?: string | null;
  styleProfile?: string | null;
};

export type AskMueMessages = {
  system: string;
  user: string;
};

export type MueTone = "formal" | "casual" | "friendly";

export function normalizeMueQuestion(input: string): string | null {
  const normalized = input.replace(/\s+/g, " ").trim();
  if (!normalized) return null;
  return normalized.slice(0, 1200);
}

export function parseMueAnswer(raw: string): string {
  return raw
    .replace(/^```(?:markdown|md|text)?\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim();
}

export function buildAskMueMessages({
  question,
  transcript,
  memories,
  history = [],
  profile,
}: {
  question: string;
  transcript: string | null;
  memories: MueMemory[];
  history?: MueChatHistoryItem[];
  profile?: MueProfileContext | null;
}): AskMueMessages {
  const memoryBlock =
    memories.length > 0
      ? memories.map((memory) => `- [${memory.kind}] ${memory.content}`).join("\n")
      : "No saved Mue memories.";
  const historyBlock =
    history.length > 0
      ? history
          .slice(-10)
          .map((message) => `[${message.role}] ${compactForPrompt(message.content, 700)}`)
          .join("\n")
      : "No previous Ask Mue messages.";
  const persona = profile?.persona?.trim() || "No custom Mue persona.";
  const styleProfile = profile?.styleProfile?.trim() || "No learned writing style yet.";

  return {
    system: `You are Ask Mue, the private AI copilot inside Freescale.

Answer the user's question using the active conversation and saved memories.
Be concrete, concise, and operational. If the user asks what to reply, produce a ready-to-send draft.
Use the same language as the user. Respect the user's custom persona and learned writing style.
Never invent facts that are not present in context.
If the context is missing, say what you can infer and what you still need.`,
    user: `User Mue persona:
${persona}

Learned writing style:
${styleProfile}

Saved Mue memories:
${memoryBlock}

Recent Ask Mue chat history:
${historyBlock}

Active conversation transcript:
${transcript?.trim() || "No active conversation transcript."}

User question:
${question}`,
  };
}

function compactForPrompt(value: string, max = 1200): string {
  const compacted = value.replace(/\s+/g, " ").trim();
  if (compacted.length <= max) return compacted;
  return `${compacted.slice(0, max - 3)}...`;
}

function compactLine(value: string | null): string | null {
  const line = value?.replace(/\s+/g, " ").trim();
  if (!line) return null;
  return line.length > 220 ? `${line.slice(0, 217)}...` : line;
}

export function buildLocalAskMueFallback({
  question,
  transcript,
  memories,
  reason,
}: {
  question: string;
  transcript: string | null;
  memories: MueMemory[];
  reason: string;
}): string {
  const transcriptLines = (transcript ?? "")
    .split(/\n+/)
    .map((line) => compactLine(line))
    .filter((line): line is string => Boolean(line))
    .filter((line) => !line.startsWith("---") && !line.startsWith("Subject:"));
  const lastContext = transcriptLines.at(-1);
  const memory = memories.map((item) => compactLine(item.content)).find(Boolean);

  const contextSentence = lastContext
    ? `Dernier signal de la conversation : "${lastContext}"`
    : "Je n'ai pas encore de conversation active exploitable.";
  const memorySentence = memory ? `Mémoire utile : ${memory}` : "Aucune mémoire Mue sauvegardée.";

  return `Je suis en mode secours (${reason}). ${contextSentence}

${memorySentence}

Pour ta question "${question}", ma recommandation immédiate : réponds de façon courte, confirme le point demandé, puis propose l'étape suivante.`;
}

export function buildToneRewriteMessages({
  draft,
  tone,
  transcript,
  memories,
  profile,
}: {
  draft: string;
  tone: MueTone;
  transcript: string | null;
  memories: MueMemory[];
  profile?: MueProfileContext | null;
}): AskMueMessages {
  const memoryBlock =
    memories.length > 0
      ? memories.map((memory) => `- [${memory.kind}] ${memory.content}`).join("\n")
      : "No saved Mue memories.";
  const persona = profile?.persona?.trim() || "No custom Mue persona.";
  const styleProfile = profile?.styleProfile?.trim() || "No learned writing style yet.";

  return {
    system: `You rewrite email drafts inside Freescale.

Return strict JSON only, no markdown fences:
{"text":"<rewritten draft>"}

Rules:
- Keep the same language as the draft.
- Preserve factual meaning, commitments, dates, names, links, and numbers.
- Do not add a greeting or signature.
- Do not invent details.
- Rewrite only the body text.
- Respect the requested tone, the user's persona, and learned writing style.`,
    user: `Target tone: ${tone}

User Mue persona:
${persona}

Learned writing style:
${styleProfile}

Saved Mue memories:
${memoryBlock}

Active conversation transcript:
${transcript?.trim() || "No active conversation transcript."}

Draft to rewrite:
${draft.trim()}`,
  };
}

export function parseToneRewrite(raw: string): string {
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim();
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  const jsonSlice =
    firstBrace >= 0 && lastBrace > firstBrace ? cleaned.slice(firstBrace, lastBrace + 1) : cleaned;

  try {
    const parsed = JSON.parse(jsonSlice) as { text?: unknown };
    if (typeof parsed.text === "string") return parsed.text.trim();
  } catch {
    // Fall through to plain text parsing below.
  }

  return cleaned;
}

export function buildLocalToneRewriteFallback({
  draft,
  tone,
  reason,
}: {
  draft: string;
  tone: MueTone;
  reason: string;
}): string {
  const cleanDraft = draft.trim();
  if (tone === "formal") {
    return `Bonjour,\n\n${cleanDraft}\n\nJe reste disponible pour avancer sur ce point.`;
  }
  if (tone === "friendly") {
    return `${cleanDraft}\n\nDis-moi si ça te va, je peux avancer comme ça.`;
  }
  return `${cleanDraft}\n\nNote: Mue a gardé une version simple (${reason}).`;
}
