# Freescale — Roadmap 100 étapes

> **Vision** : Inbox unifié multi-canaux (Gmail, Instagram, WhatsApp, Slack, Discord, X, LinkedIn) avec un copilot IA — **Mue** — qui résume, répond, et transforme les conversations en actions.
> **Cible MVP** : freelances et solopreneurs gérant 5+ canaux clients.
> **North Star Metric** : minutes/jour économisées par utilisateur.

---

## 🏗 Phase 1 — Foundation & stack (1–10)

- [ ] **1.** Choisir le stack : **Next.js 15** (App Router) + **Supabase** (DB/Auth/Realtime/Storage) + **Hono** (edge API) + **TypeScript strict** — voir `ARCHITECTURE.md`
- [ ] **2.** Acheter domaine `freescale.app` + DNS Cloudflare
- [ ] **3.** Repo GitHub `freescale/freescale` + branch strategy `main` / `dev` / feature/*
- [ ] **4.** Monorepo Turborepo : `apps/web`, `apps/api`, `packages/ui`, `packages/db`
- [ ] **5.** CI/CD Vercel + preview deploys par PR
- [ ] **6.** Secrets : Doppler ou Vercel env
- [ ] **7.** **Migrer l'UI HTML actuelle vers React/Next** (composants : Sidebar, Inbox, Thread, Copilot, Tasks, Calendar, AI Knowledge)
- [ ] **8.** Design tokens → `tailwind.config.ts`
- [ ] **9.** Storybook + Chromatic
- [ ] **10.** Biome (lint/format) + Husky pre-commit

## 🔐 Phase 2 — Auth & users (11–20)

- [ ] **11.** Supabase Auth : email + Google + Apple OAuth
- [ ] **12.** Pages sign up / sign in
- [ ] **13.** Email de vérification + magic link
- [ ] **14.** Password reset
- [ ] **15.** Page profile (nom, avatar, fuseau, langue)
- [ ] **16.** 2FA TOTP
- [ ] **17.** Liste devices connectés + révocation
- [ ] **18.** Account deletion (GDPR)
- [ ] **19.** Onboarding wizard 3 étapes
- [ ] **20.** SSO entreprise (Clerk/WorkOS) — optionnel

## 🗄 Phase 3 — Database & schema (21–30)

- [ ] **21.** Schema `users`, `workspaces`, `workspace_members`
- [ ] **22.** Schema `channels`, `channel_accounts` (tokens encrypted)
- [ ] **23.** Schema `conversations`, `messages`, `attachments`
- [ ] **24.** Schema `contacts` + merge algorithm
- [ ] **25.** Schema `tasks`, `calendar_events`, `event_attendees`
- [ ] **26.** Schema `ai_memories` + `mue_threads`
- [ ] **27.** Row-Level Security (RLS) policies
- [ ] **28.** Migrations workflow (Supabase CLI)
- [ ] **29.** Backups + Point-in-Time Recovery
- [ ] **30.** Table `audit_log`

## 🔌 Phase 4 — Intégrations channels (31–50)

- [ ] **31.** Gmail OAuth + Pub/Sub push notifications
- [ ] **32.** Gmail send/reply/attachments
- [ ] **33.** Gmail labels sync bidirectionnel
- [ ] **34.** Instagram Business OAuth + webhooks
- [ ] **35.** Instagram DM send/receive
- [ ] **36.** Instagram médias
- [ ] **37.** WhatsApp Business Cloud API
- [ ] **38.** WhatsApp template approval
- [ ] **39.** Slack OAuth + Events API
- [ ] **40.** Slack DM + threads
- [ ] **41.** Discord OAuth + bot
- [ ] **42.** Discord DM + serveurs
- [ ] **43.** LinkedIn Sales Nav
- [ ] **44.** X/Twitter DM API v2
- [ ] **45.** Telegram bot
- [ ] **46.** SMS via Twilio
- [ ] **47.** Webhook receiver (Cloudflare Worker)
- [ ] **48.** Job scheduler refresh tokens (Inngest)
- [ ] **49.** Rate limiting par channel
- [ ] **50.** Reconnexion flow

## 💬 Phase 5 — Messaging engine (51–60)

- [ ] **51.** Realtime Supabase ou Ably
- [ ] **52.** Schema message unifié cross-channel
- [ ] **53.** Conversation threading
- [ ] **54.** Read receipts & delivery
- [ ] **55.** Typing indicators
- [ ] **56.** Upload attachments → Cloudflare R2
- [ ] **57.** Génération previews (images/PDF/vidéo)
- [ ] **58.** Search Typesense
- [ ] **59.** Préférences notifications
- [ ] **60.** Queue offline + retry

## 🤖 Phase 6 — Mue (IA Copilot) (61–70)

- [ ] **61.** Anthropic API : Claude Sonnet 4.5 + **prompt caching**
- [ ] **62.** System prompt Mue (personality)
- [ ] **63.** RAG sur 50 derniers messages d'une conv
- [ ] **64.** AI Knowledge → embeddings pgvector
- [ ] **65.** Tuning du ton sur 100 convs réelles
- [ ] **66.** Extraction de tâches automatique
- [ ] **67.** Smart replies (3 suggestions contextuelles)
- [ ] **68.** Summarize long threads
- [ ] **69.** Translate (DeepL ou Claude natif)
- [ ] **70.** Mémoire long-terme Mue

## 🛠 Phase 7 — Productivité (71–80)

- [ ] **71.** Tasks CRUD + priorités + dates + tags
- [ ] **72.** Calendar sync Google + Outlook (Nylas)
- [ ] **73.** Création event + .ics invites
- [ ] **74.** Récurrences (RRULE)
- [ ] **75.** Snooze/archive conversations
- [ ] **76.** Filtres custom + saved views
- [ ] **77.** Multi-select messages/tasks
- [ ] **78.** Tags & labels
- [ ] **79.** Templates / canned responses
- [ ] **80.** Working hours & DND mode

## 💰 Phase 8 — Pricing & billing (81–85)

- [ ] **81.** Stripe Products : Free, Pro 19€/mo, Team 49€/seat/mo
- [ ] **82.** Subscription tiers avec quotas
- [ ] **83.** Trial 14 jours sans CB
- [ ] **84.** Usage metering + warnings
- [ ] **85.** Stripe Tax + invoicing

## 📣 Phase 9 — Launch prep (86–95)

- [ ] **86.** Landing page marketing
- [ ] **87.** Page pricing comparator
- [ ] **88.** Doc site (Mintlify/Nextra)
- [ ] **89.** Public roadmap (Canny)
- [ ] **90.** Privacy Policy + ToS
- [ ] **91.** GDPR export + suppression
- [ ] **92.** Cookie consent (Klaro)
- [ ] **93.** Pentest externe
- [ ] **94.** Lighthouse 95+ + Core Web Vitals
- [ ] **95.** WCAG AA audit

## 🚦 Phase 10 — Go-live (96–100)

- [ ] **96.** PostHog analytics + feature flags
- [ ] **97.** Sentry error monitoring
- [ ] **98.** Status page (Instatus)
- [ ] **99.** Support Plain.com
- [ ] **100.** Launch Product Hunt + AppSumo

---

## 🔥 Chemin critique 90 jours (MVP en ligne)

**Sem 1-2** : 1, 2, 3, 5, 7, 11, 12, 21, 22, 23
**Sem 3-4** : 27, 31, 32, 39, 40, 51, 52
**Sem 5-6** : 61, 62, 63, 67
**Sem 7-8** : 81, 82, 86, 90, 96

Le reste : 75 étapes post-launch sur 6-12 mois.
