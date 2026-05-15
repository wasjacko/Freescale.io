---
title: Step 01 — Stack decision
type: roadmap-step
phase: 1
step: 1
status: done
completed: 2026-05-15
tags:
  - step/done
  - phase/1
  - foundation
---

# Step 01 — Stack decision

> [!success] ✅ Done — 2026-05-15
> Stack technique fixé et documenté. Voir aussi `ARCHITECTURE.md` à la racine du repo.

## 🎯 Décision

Fondation triple confirmée par l'utilisateur :
- [[Stack/Vercel|Vercel]] — hosting frontend
- [[Stack/Supabase|Supabase]] — DB + Auth + Realtime + Storage
- [[Stack/GitHub|GitHub]] — source control + CI

Complétée par :
- [[Stack/Next.js|Next.js 15]] (App Router) — framework full-stack
- [[Stack/Hono|Hono]] + [[Stack/Cloudflare Workers|Cloudflare Workers]] — webhooks edge
- [[Stack/Claude API|Claude Sonnet 4.5]] — cerveau de Mue
- [[Stack/Stripe|Stripe]] — paiements
- [[Stack/Resend|Resend]] — emails transactionnels

## 🧠 Critères de décision

==Les 4 contraintes qui ont orienté tous les choix :==

> [!important] 1. Time-to-MVP
> Doit pouvoir ship en **90 jours**. Tout choix qui demande des semaines de setup est écarté.

> [!important] 2. Coût ≤ 150 €/mo
> Survie 6 mois sans revenu. Pas d'AWS, pas de Datadog, pas de services à 500 €/mo.

> [!important] 3. Pas de vendor lock-in
> [[Stack/Supabase|Postgres]], [[Stack/Stripe|Stripe]], standard. On peut toujours migrer.

> [!important] 4. Scaling 0 → 100k users
> Pas besoin de refactor à 1000 users. Edge + serverless natif.

## 💭 Concepts clés expliqués

### Edge API

==Code qui tourne sur 300+ data centers en parallèle.==

Au lieu d'un serveur unique (ex: AWS Paris), [[Stack/Cloudflare Workers|Cloudflare Workers]] exécute le code au plus proche de l'utilisateur. User Tokyo → exécution Tokyo. User Paris → exécution Paris. **Latence < 50ms partout.**

[[Stack/Hono|Hono]] est juste le framework minimaliste (~12kb) qui tourne sur cette plateforme.

> [!quote] Analogie
> Un serveur classique = UPS qui ramène tout au hub de Roissy.
> L'edge = Amazon avec un entrepôt dans chaque ville.

### App Router (Next.js 15)

Le nouveau système de routing de [[Stack/Next.js|Next.js]] :
- Fichier `app/inbox/page.tsx` → URL `/inbox`
- **React Server Components** par défaut : rendu serveur, **0 JS** envoyé pour les parties statiques
- **Server Actions** : appeler une fonction côté serveur depuis un composant comme une fonction normale, sans API route
- **Layouts persistants** : la sidebar ne re-render pas quand on change de page
- **Streaming + Suspense** : la page se construit en streaming

### TypeScript strict

TypeScript = JavaScript + types. **Strict mode** active tous les flags de vérification :

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitOverride": true
  }
}
```

Concrètement : `null` et `undefined` sont explicites, pas de `any` implicite, IntelliSense magique, refactoring sans peur. ~35% de bugs runtime attrapés au compile time.

### Prompt caching ([[Stack/Claude API|Claude]])

Claude permet de cacher les ==parties répétitives d'un prompt== (system prompt + historique conv). Sur une conversation de 50 messages, on évite de re-payer le tokenisation des 49 premiers à chaque nouveau message.

**Économie : ~90% sur les conv longues.** Sans ça, l'API coûterait 10× plus cher en prod.

## 📚 Documentation produite

> [!example] Fichiers de référence
> - [[Freescale]] — main hub Obsidian
> - `ROADMAP.md` à la racine (100 étapes)
> - `ARCHITECTURE.md` à la racine (ADR détaillé)
> - 3 notes stack confirmées : [[Stack/Vercel|Vercel]], [[Stack/Supabase|Supabase]], [[Stack/GitHub|GitHub]]

## ➡️ Prochaine étape

[[Steps/Step 02 - Domain|Step 02 — Acheter le domaine `freescale.app`]]

> [!todo] Action utilisateur requise
> - Ouvrir [Cloudflare Registrar](https://dash.cloudflare.com/?to=/:account/domains/register)
> - Acheter `freescale.app` (~10-12 €/an)
> - Confirmer dans [[Steps/Step 02 - Domain]]

Pendant ce temps, on peut enchaîner sur :
- [[Steps/Step 03 - GitHub repo]] (création repo)
- [[Steps/Step 04 - Monorepo Turborepo]] (scaffolding code)
