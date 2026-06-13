---
title: Connexions canaux (intégrations)
tags:
  - stack
  - technique
  - integrations
date: 2026-06-13
---

# 🔌 Connexions canaux — architecture technique

> Mémoire de référence : comment Freescale connecte et synchronise les canaux
> (Gmail, Outlook, LinkedIn, Slack, Instagram, WhatsApp). À reprendre plus tard.

## Vue d'ensemble

```
UI (Réglages → Connexions)
   │  clic « Connecter »
   ▼
/auth/<canal>/start  ──OAuth──▶  Provider (Google / Microsoft / Unipile)
   │                                   │ code
   ▼                                   ▼
/auth/<canal>/callback ──exchangeCode──▶ tokens chiffrés
   │
   ▼
Supabase: table `channel_accounts` (encrypted_tokens, external_id, history_id, kind, workspace_id)
   │
   ▼
runChannelSync(channelAccountId)  →  adapter.sync()  →  upsert conversations + messages
```

## Pièces clés (`apps/web/lib/channels/`)

| Fichier | Rôle |
|---|---|
| `registry.ts` | Catalogue des providers : `kind`, `label`, `ready`, `startPath`, `emailLike`, `syncable`, `capabilities` (`oauth`/`sync`/`send`/`attachments`/`webhook`). **Gmail + Outlook = `ready: true`**. |
| `adapter.ts` | Interface `ChannelAdapter` : `buildAuthUrl(state)`, `exchangeCode(code) → { encryptedTokens, externalId }`, `sync(...)`. Types normalisés `NormalizedThread` / `NormalizedMessage`. |
| `registry-server.ts` | Câblage des adaptateurs (`server-only`) : `gmail → gmailAdapter`, `outlook → outlookAdapter`, `linkedin/slack/instagram/whatsapp → new UnipileAdapter(kind)`. |
| `gmail-adapter.ts` | Adaptateur Gmail (OAuth Google, sync via `history_id`). |
| `outlook-adapter.ts` | Adaptateur Outlook/Microsoft Graph. |
| `unipile-adapter.ts` | Adaptateur générique **Unipile** pour LinkedIn / Slack / Instagram / WhatsApp (un seul provider tiers couvre 4 canaux). |
| `engine.ts` | `runChannelSync(channelAccountId)` : lit `channel_accounts`, déchiffre les tokens, appelle `adapter.sync`, upsert les conversations/messages, `revalidatePath`. |

## OAuth — routes (`apps/web/app/auth/`)

- `/auth/gmail/start` → `/auth/gmail/callback`
- `/auth/outlook/start` → `/auth/outlook/callback`
- `/auth/callback` (Supabase Auth — login app), `/auth/sign-out`

Le flow : `start` construit l'URL OAuth (scopes mail) → l'utilisateur autorise → `callback` échange le `code` contre des tokens via `adapter.exchangeCode`, qui renvoie un **blob chiffré** stocké tel quel.

## 🔐 Chiffrement des tokens

- `lib/encryption.ts` → **libsodium-wrappers** (`encryptJSON` / `decryptJSON`).
- Les tokens OAuth ne sont **jamais** stockés en clair : `channel_accounts.encrypted_tokens` contient le blob chiffré.
- Rafraîchissement : `lib/gmail.ts` / `lib/outlook.ts` → `decryptJSON` → refresh si expiré → `encryptJSON` du nouveau blob (mis à jour en base).
- Clé de chiffrement = variable d'env serveur (jamais commitée — `.env.local`).

## Base de données — `channel_accounts`

Colonnes utilisées : `id`, `workspace_id`, `encrypted_tokens`, `external_id`, `history_id` (curseur de sync incrémentale), `kind` (`ChannelId`). Voir la migration `supabase/migrations/…_relational_foundations.sql`.

## Variables d'env nécessaires (voir `.env.example`)

`GOOGLE_OAUTH_CLIENT_ID` / `GOOGLE_OAUTH_CLIENT_SECRET`, `MICROSOFT_CLIENT_ID` / `MICROSOFT_CLIENT_SECRET` / `MICROSOFT_TENANT_ID`, `UNIPILE_API_KEY` / `UNIPILE_API_URL`, + la clé de chiffrement. Toutes **vides** dans `.env.example`, à remplir en local/prod.

## À reprendre plus tard

- iCloud / IMAP, Discord, Telegram, SMS = `ready: false` dans le registry (pas encore d'adaptateur).
- Webhooks temps réel (capability `webhook`) — pour le push instantané au lieu du polling.

Liens : [[Supabase]] · [[Next.js]] · [[Claude API]] · [[ARCHITECTURE]]
