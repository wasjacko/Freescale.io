---
title: Claude API
type: stack
category: ai
status: confirmed
role: ai-brain
provider: Anthropic
model: claude-sonnet-4-5
cost_monthly: 50-300
created: 2026-05-15
tags:
  - stack/ai
  - confirmed
aliases:
  - Anthropic API
  - Claude Sonnet 4.5
---

# Claude API

L'IA qui anime **Mue** (le bébé salamandre).

## Modèle utilisé : **Claude Sonnet 4.5**

> [!info] Pourquoi Claude et pas GPT-4o
> - **Meilleur en français** (mesurable sur benchmarks comme `frenchbench`)
> - **Prompt caching natif** — divise le coût des conversations longues par ~10
> - **Tool use robuste** pour les actions (créer task, programmer event)
> - **Context 200k tokens** suffit pour gérer l'historique d'une conv + AI Knowledge

## Cas d'usage chez nous

### 1. Smart replies (étape 67)

3 suggestions de réponses contextuelles dans le composer.

```ts
const completion = await anthropic.messages.create({
  model: "claude-sonnet-4-5",
  max_tokens: 300,
  system: SYSTEM_PROMPT_MUE,
  messages: [
    { role: "user", content: `Conversation:\n${convHistory}\n\nDraft 3 reply options, JSON array.` }
  ]
});
```

### 2. Summarize (étape 68)

Résumé d'une conv longue.

### 3. Translate (étape 69)

Traduction native.

### 4. Task extraction (étape 66)

```
Sarah dit: "Tu peux ajouter les logos clients sous le hero ?"
→ Mue détecte l'action → crée task: "Ajouter client logos sous hero - Sarah Johnson"
```

### 5. RAG sur AI Knowledge (étape 63)

L'utilisateur écrit du contexte dans la page AI Knowledge. C'est embeddé via pgvector dans [[Supabase]]. À chaque requête à Mue, on récupère les 5 chunks les plus pertinents et on les injecte dans le system prompt.

## Prompt caching — le killer feature

> [!success] Économie majeure
> Sans cache : 100k tokens en input × 50 messages = 5M tokens facturés
> Avec cache : 100k tokens × 1 (cache) + 1k tokens × 49 nouveau = ~150k tokens facturés
> **= 30× moins cher** sur les conversations longues.

```ts
const response = await anthropic.messages.create({
  model: "claude-sonnet-4-5",
  system: [
    {
      type: "text",
      text: LARGE_CONVERSATION_HISTORY,
      cache_control: { type: "ephemeral" }  // ← cache magic
    }
  ],
  messages: [{ role: "user", content: latestUserMessage }]
});
```

## Pricing (au 2026-05-15)

| Type | Coût (input / output) |
|---|---|
| Standard | $3 / $15 par M tokens |
| **Cached read** | **$0.30 / $15** par M tokens (90% off l'input) |
| Cached write | $3.75 / $15 par M tokens |

> [!example] Estimation MVP
> 100 users actifs × 10 conv/jour × 1 Mue call/conv × 2k tokens = 2M tokens/jour
> = ~6 €/jour = ~180 €/mois avec caching agressif

## System prompt Mue (draft)

```
You are Mue, a friendly AI copilot helping a freelance professional manage their multi-channel inbox (Gmail, Slack, Instagram, WhatsApp).
Your tone is warm, concise, and slightly playful — like a thoughtful colleague.
You speak the user's language (default French unless conversation is in English).
You never invent facts: if you don't know, say "I'd need more context".
When suggesting replies, propose 3 options: one formal, one casual, one short.
```

## Sécurité

> [!danger] Pas de PII dans les logs
> Le contenu des conversations user **passe par Anthropic**. Vérifier la conformité avec les ToS pour la donnée user finale (mention dans Privacy Policy).
> Anthropic n'utilise pas les données API pour entraîner ses modèles (par défaut depuis 2023).

## Liens

- [Anthropic Console](https://console.anthropic.com)
- [Claude API docs](https://docs.anthropic.com)
- [Prompt caching](https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching)
- [Pricing](https://www.anthropic.com/pricing#anthropic-api)
