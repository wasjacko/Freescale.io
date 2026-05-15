---
title: Step 04 — Monorepo Turborepo
type: roadmap-step
phase: 1
step: 4
status: in-progress
started: 2026-05-15
tags:
  - step/in-progress
  - phase/1
  - foundation
---

# Step 04 — Monorepo Turborepo

> [!info] Statut : scaffolding committed, install à faire
> Structure de fichiers en place. `pnpm install` doit être lancé pour générer le lockfile.

## 🎯 Objectif

Mettre en place un monorepo Turborepo avec workspaces pour partager du code entre :
- `apps/web` ([[Stack/Next.js|Next.js]] — app SaaS)
- `apps/api` ([[Stack/Hono|Hono]] sur [[Stack/Cloudflare Workers|Cloudflare Workers]])
- 6 packages partagés (`ui`, `db`, `ai`, `channels`, `types`, `config`)

## 📁 Structure scaffoldée

```
freescale/
├── package.json              # Root — workspaces config
├── pnpm-workspace.yaml       # pnpm workspaces declaration
├── turbo.json                # Turborepo task pipeline
├── tsconfig.base.json        # TS strict config partagé
├── biome.json                # Lint + format
├── .nvmrc                    # Node 20
│
├── apps/
│   ├── web/                  # @freescale/web
│   │   ├── app/
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx
│   │   │   └── globals.css
│   │   ├── next.config.ts
│   │   ├── tsconfig.json
│   │   ├── package.json
│   │   └── .env.example
│   │
│   └── api/                  # @freescale/api
│       ├── src/
│       │   └── index.ts      # Hono entry
│       ├── wrangler.toml
│       ├── tsconfig.json
│       └── package.json
│
└── packages/
    ├── ui/                   # @freescale/ui — composants partagés
    ├── db/                   # @freescale/db — Supabase client + types
    ├── ai/                   # @freescale/ai — wrappers Claude + prompts
    ├── channels/             # @freescale/channels — Gmail/Slack/IG adapters
    ├── types/                # @freescale/types — Message, Conversation, …
    └── config/               # @freescale/config — Tailwind, ESLint shared
```

## ⚙️ Décisions

### pnpm vs npm vs yarn

> [!important] Choix : pnpm 9
> - **3× plus rapide** que npm sur les installs monorepo
> - **Disk space** : symlinks au lieu de copies (économise ~10 GB sur un projet de cette taille)
> - **Standard** pour Turborepo + monorepos (Vercel, Linear, Cal.com, …)
> - **Strict** : empêche `phantom dependencies`

### Turborepo vs Nx vs Lerna

> [!important] Choix : Turborepo
> - Créé par [[Stack/Vercel|Vercel]] → intégration parfaite
> - **Cache distribué** gratuit (via Vercel remote cache)
> - Config minimale (`turbo.json` = ~30 lignes vs Nx ~200)
> - Pas de plugins requis pour Next.js / TypeScript

### Biome vs ESLint + Prettier

> [!important] Choix : Biome
> - **15× plus rapide** que ESLint + Prettier
> - Lint + format dans **un seul outil** (config unifiée)
> - 1 dépendance au lieu de 8 (ESLint + 6 plugins + Prettier)
> - Compatible avec 95% des règles ESLint courantes

## 🚀 Commandes (une fois install fait)

```bash
# Install — à lancer en premier
pnpm install

# Dev — lance web + api en parallèle
pnpm dev

# Build — tout le monorepo
pnpm build

# Lint + Format + Typecheck
pnpm lint
pnpm format
pnpm typecheck
```

## ⚠️ TODO

- [ ] Lancer `pnpm install` sur la machine de dev → générer `pnpm-lock.yaml`
- [ ] Vérifier que `pnpm dev` démarre web (port 3000) + api (port 8787)
- [ ] Retirer les `continue-on-error: true` du CI workflow une fois lockfile présent
- [ ] [[Steps/Step 05 - CI-CD Vercel]] : connecter Vercel au repo
- [ ] [[Steps/Step 07 - Migration UI]] : porter `index.html` vers les composants React dans `apps/web/`

## 📦 Versions des deps clés

| Package | Version | Pourquoi cette version |
|---|---|---|
| `next` | 15.x | App Router stable, RSC, Server Actions |
| `react` | 19.x | Compatible Next 15, useActionState |
| `hono` | 4.x | Stable, ~12kb |
| `@supabase/supabase-js` | 2.45+ | Compatible auth-helpers |
| `@supabase/ssr` | 0.5+ | Server-side Auth pour Next |
| `tailwindcss` | 4.0 alpha | Plus rapide, CSS-first config |
| `typescript` | 5.6 | Stable |
| `turbo` | 2.3+ | Dernier majeur stable |
| `biome` | 1.9 | Lint + format |

## ➡️ Prochaine étape

[[Steps/Step 05 - CI-CD Vercel]] — connecter [[Stack/Vercel|Vercel]] au repo GitHub pour deploy auto.
