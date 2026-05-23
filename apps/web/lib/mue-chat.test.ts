import { describe, expect, it } from "vitest";
import {
  buildAskMueMessages,
  buildLocalAskMueFallback,
  buildLocalToneRewriteFallback,
  buildToneRewriteMessages,
  normalizeMueQuestion,
  parseMueAnswer,
  parseToneRewrite,
} from "./mue-chat";

describe("normalizeMueQuestion", () => {
  it("trims questions and rejects empty input", () => {
    expect(normalizeMueQuestion("  Que dois-je répondre ?  ")).toBe("Que dois-je répondre ?");
    expect(normalizeMueQuestion("   ")).toBeNull();
  });
});

describe("buildAskMueMessages", () => {
  it("includes the user question, current thread, and saved memories", () => {
    const messages = buildAskMueMessages({
      question: "Que dois-je faire maintenant ?",
      transcript: "--- Sarah\nCan we add logos below the hero?",
      memories: [
        { kind: "preference", content: "Je préfère des réponses courtes." },
        { kind: "client", content: "Sarah aime les validations rapides." },
      ],
    });

    expect(messages.system).toContain("Ask Mue");
    expect(messages.user).toContain("Que dois-je faire maintenant ?");
    expect(messages.user).toContain("Can we add logos");
    expect(messages.user).toContain("[preference] Je préfère des réponses courtes.");
    expect(messages.user).toContain("[client] Sarah aime les validations rapides.");
  });

  it("includes persisted chat history and user style context", () => {
    const messages = buildAskMueMessages({
      question: "Et si je veux être plus direct ?",
      transcript: "--- Sarah\nCan we add logos below the hero?",
      memories: [],
      history: [
        { role: "user", content: "Résume-moi le risque." },
        { role: "mue", content: "Le risque principal est le scope creep." },
      ],
      profile: {
        persona: "Réponds comme un COO B2B, jamais trop familier.",
        styleProfile: "Phrases courtes, ton direct, une seule prochaine étape.",
      },
    });

    expect(messages.user).toContain("Recent Ask Mue chat history");
    expect(messages.user).toContain("[user] Résume-moi le risque.");
    expect(messages.user).toContain("[mue] Le risque principal est le scope creep.");
    expect(messages.user).toContain("Réponds comme un COO B2B");
    expect(messages.user).toContain("Phrases courtes, ton direct");
  });

  it("uses explicit fallback text when no thread or memory exists", () => {
    const messages = buildAskMueMessages({
      question: "Aide-moi",
      transcript: null,
      memories: [],
    });

    expect(messages.user).toContain("No active conversation transcript");
    expect(messages.user).toContain("No saved Mue memories");
  });
});

describe("tone rewrite helpers", () => {
  it("builds a tone rewrite prompt with the requested tone and profile context", () => {
    const messages = buildToneRewriteMessages({
      draft: "Ok je m'en occupe demain.",
      tone: "formal",
      transcript: "--- Sarah\nCan you make this more polished?",
      memories: [{ kind: "preference", content: "Toujours proposer une prochaine étape." }],
      profile: {
        persona: "Communication premium B2B.",
        styleProfile: "Bref, précis, sans emojis.",
      },
    });

    expect(messages.system).toContain("rewrite");
    expect(messages.user).toContain("Target tone: formal");
    expect(messages.user).toContain("Ok je m'en occupe demain.");
    expect(messages.user).toContain("Communication premium B2B.");
    expect(messages.user).toContain("[preference] Toujours proposer une prochaine étape.");
  });

  it("parses fenced JSON tone rewrite responses", () => {
    expect(parseToneRewrite('```json\n{"text":"Bien reçu, je m’en occupe demain."}\n```')).toBe(
      "Bien reçu, je m’en occupe demain."
    );
  });

  it("provides a deterministic fallback rewrite when AI is unavailable", () => {
    const formal = buildLocalToneRewriteFallback({
      draft: "ok je fais ça demain",
      tone: "formal",
      reason: "clé IA absente",
    });

    expect(formal).toContain("Bonjour");
    expect(formal).toContain("ok je fais ça demain");
  });
});

describe("parseMueAnswer", () => {
  it("strips markdown fences and whitespace from model output", () => {
    expect(parseMueAnswer("```markdown\nRéponds simplement.\n```")).toBe("Réponds simplement.");
  });
});

describe("buildLocalAskMueFallback", () => {
  it("returns a useful mode-secours answer when the model provider is unavailable", () => {
    const answer = buildLocalAskMueFallback({
      question: "Que dois-je répondre ?",
      transcript: "--- Sarah\nCan we add logos below the hero?",
      memories: [{ kind: "preference", content: "Répondre court et direct." }],
      reason: "quota IA épuisé",
    });

    expect(answer).toContain("mode secours");
    expect(answer).toContain("quota IA épuisé");
    expect(answer).toContain("Can we add logos below the hero?");
    expect(answer).toContain("Répondre court et direct.");
  });
});
