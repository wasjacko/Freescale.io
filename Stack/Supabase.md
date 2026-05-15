---
title: Supabase
type: stack
category: backend
status: confirmed
role: db-auth-realtime-storage
cost_monthly: 25
created: 2026-05-15
tags:
  - stack/backend
  - confirmed
aliases:
  - Supabase Pro
  - Backend-as-a-Service
---

# Supabase

> [!success] Confirmé par l'utilisateur le 2026-05-15
> Supabase couvre 4 besoins critiques en un seul SDK : **DB + Auth + Realtime + Storage**.

## Rôle dans [[Freescale]]

| Capability | Usage chez nous |
|---|---|
| **Postgres** | Toutes les données (users, conversations, messages, tasks, calendar_events) |
| **Auth** | Sign up / Sign in / Google OAuth / magic links |
| **Realtime** | Push instantané des nouveaux messages vers le client |
| **Storage** | Attachments (images, PDFs, fichiers partagés dans les chats) |
| **Edge Functions** | (optionnel) — on préfère [[Hono]] sur [[Cloudflare Workers]] |
| **pgvector** | Embeddings pour Mue (RAG sur conversations) |

## Pourquoi Supabase

> [!tip] Forces
> - **Tout-en-un** : 1 SDK couvre 4 services → moins d'auth tokens à gérer
> - **Postgres** → pas de NoSQL maison comme Firebase, on peut faire des **vraies jointures**
> - **Row-Level Security (RLS)** → chaque user ne voit que sa data, géré au niveau DB
> - **Realtime** sur les `postgres_changes` → on écoute les `INSERT` sur la table `messages` et on push au client
> - **pgvector intégré** → embeddings dans la même DB que les conversations (1 query au lieu de 2 services)
> - **Open source** : si Supabase coule, on self-host (pas de vendor lock-in)
> - **Branching** Pro tier : DB de preview par PR, comme Vercel mais pour la data

> [!warning] Limites
> - **Pas de scheduled functions intégré** → on utilise Inngest pour les jobs cron (refresh tokens OAuth, etc.)
> - **Storage egress** : ~9$ par TB de download au-delà du tier gratuit (vs [[Cloudflare R2]] qui est gratuit en egress)
> - **Pas de queue robuste** → on prend Inngest pour les jobs background

## Decisions de schema (futur step 21-30)

> [!example] Tables principales
> - `users` (id, email, name, avatar, timezone, locale)
> - `workspaces` + `workspace_members`
> - `channel_accounts` (workspace_id, channel_type, oauth_token_encrypted, refresh_token_encrypted)
> - `conversations` (id, workspace_id, channel_account_id, contact_id, last_message_at)
> - `messages` (id, conversation_id, direction: 'in'|'out', text, attachments, sent_at)
> - `contacts` (id, name, channel_handle, avatar_url) + merge algorithm
> - `tasks`, `calendar_events`, `event_attendees`
> - `mue_memories` (workspace_id, embedding, content, source_conversation_id)

## Configuration cible

```bash
# Init local Supabase
npx supabase init
npx supabase start  # Docker-based local dev
npx supabase migration new init_schema
```

Migrations vivent dans `supabase/migrations/` et sont versionnées dans [[GitHub]].

## Sécurité

> [!danger] Tokens OAuth sensibles
> Les tokens Gmail/Slack/Instagram **doivent être chiffrés** côté DB (libsodium).
> Master key dans [[Vercel]] env. Jamais en plain text.

> [!warning] RLS obligatoire
> Toute table avec des données user **doit** avoir une policy `auth.uid() = user_id` (ou via workspace_member).
> Sans RLS = leak data entre tenants. ==Step 27 dans la roadmap.==

## Pricing

| Plan | Coût | Limites |
|---|---|---|
| Free | 0 € | 500 MB DB, 1 GB storage, 50k MAU |
| **Pro** ⭐ | **25 €/mo** | 8 GB DB, 100 GB storage, 100k MAU, daily backups, PITR |
| Team | 599 €/mo | SOC2, SSO, support prioritaire |

## Alternatives écartées

| Alternative | Pourquoi non |
|---|---|
| Firebase | Firestore NoSQL = pas de SQL, vendor lock-in fort, pas de pgvector |
| Neon | Postgres seul, faut ajouter Auth0/Clerk + service realtime + service storage = 4 vendors |
| PlanetScale | MySQL, pas de pgvector pour Mue, pas d'Auth |
| AWS RDS + Cognito + AppSync | Trop d'ops, courbe AWS, coûts opaques |

## Liens utiles

- [Pricing](https://supabase.com/pricing)
- [JS SDK](https://supabase.com/docs/reference/javascript)
- [Auth helpers Next.js](https://supabase.com/docs/guides/auth/server-side/nextjs)
- [Realtime](https://supabase.com/docs/guides/realtime)
- [pgvector](https://supabase.com/docs/guides/database/extensions/pgvector)
