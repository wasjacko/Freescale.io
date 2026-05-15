# Freescale — Architecture Decision Record

> **ADR-001** — Stack initial pour le MVP
> **Date** : 2026-05-15
> **Status** : ✅ Accepted

---

## 📐 Stack choisi

| Couche | Tech | Pourquoi |
|---|---|---|
| **Frontend** | Next.js 15 (App Router) + React 19 + Server Components | SSR/streaming, file-based routing, edge runtime, ecosystem mature |
| **Styling** | Tailwind CSS v4 + CSS variables | Tokens existants déjà compatibles, perf, design tokens cohérents |
| **UI primitives** | Radix UI + shadcn/ui (forkable) | Accessibilité native, composants headless de qualité |
| **State (client)** | Zustand + TanStack Query | Simple, typed, optimistic updates, cache HTTP intelligent |
| **Backend API** | Hono sur Cloudflare Workers (edge) | <50ms latency global, scaling auto, gratuit jusqu'à 100k req/jour |
| **Database** | Supabase Postgres + pgvector | Auth + DB + Realtime + Storage en un seul SDK |
| **Auth** | Supabase Auth | OAuth Google/Apple/GitHub natif, magic links, RLS gratuit |
| **Realtime** | Supabase Realtime (broadcast + postgres_changes) | Push messages instantané sans server custom |
| **Storage** | Cloudflare R2 (S3-compatible, no egress fees) | 90% moins cher que S3, performance globale |
| **Background jobs** | Inngest | Step functions typed, retry auto, schedules cron |
| **Search** | Postgres FTS au début, Typesense plus tard | Pas de service supplémentaire au début |
| **AI** | Anthropic Claude Sonnet 4.5 + prompt caching | Best-in-class pour les conv FR, cache divise les coûts par 10 |
| **Embeddings** | Voyage AI ou OpenAI text-embedding-3-small | Pgvector dans Supabase, pas de Pinecone |
| **Email transactional** | Resend | DX magique, React Email templates |
| **Payments** | Stripe + Stripe Tax | Standard de l'industrie, Tax handling automatique |
| **Analytics** | PostHog (self-hosted ou cloud) | Funnels, feature flags, replays en un outil |
| **Errors** | Sentry | Standard, free tier généreux |
| **Hosting** | Vercel (front) + Cloudflare (workers) + Supabase (DB) | Tier free large, deploy git-push |

---

## 🚫 Pourquoi PAS ces alternatives

- **Remix** : moins d'écosystème que Next 15, on perd les Server Actions intégrées
- **SvelteKit** : équipe doit apprendre, moins de devs disponibles
- **Express/Node** : trop de boilerplate, perf moins bonne qu'edge
- **MongoDB / Prisma+Postgres séparé** : Supabase fait tout en un, plus simple à démarrer
- **Firebase** : vendor lock-in, Realtime DB moins puissant que Postgres, no pgvector
- **OpenAI seul** : Claude est meilleur en FR + prompt caching ; on garde OpenAI pour les embeddings
- **AWS Cognito / Clerk** : Supabase Auth couvre 99% des cas + RLS intégré gratuit

---

## 🗂 Structure monorepo (étape 4)

```
freescale/
├── apps/
│   ├── web/              # Next.js — app SaaS principale
│   │   ├── app/          # App Router
│   │   ├── components/   # UI composants
│   │   ├── lib/          # Utilities côté client
│   │   └── public/
│   ├── marketing/        # Landing page (Next.js séparé)
│   └── api/              # Hono workers — Webhook receivers, IA endpoints
│
├── packages/
│   ├── ui/               # Design system partagé (boutons, inputs, …)
│   ├── db/               # Schema Supabase + migrations + types générés
│   ├── ai/               # Wrappers Claude + prompts + RAG logic
│   ├── channels/         # Adapters Gmail/Slack/Instagram/… (interface unifiée)
│   ├── config/           # Tailwind config, tsconfig partagés
│   └── types/            # Types partagés (Message, Conversation, …)
│
├── infra/
│   └── supabase/         # SQL migrations
│
├── turbo.json
├── package.json
└── pnpm-workspace.yaml
```

---

## 🌍 Environnements

| Env | URL | Branche | DB |
|---|---|---|---|
| **Dev local** | `localhost:3000` | feature/* | Supabase local (Docker) |
| **Preview** | `pr-XX.freescale.vercel.app` | PR vers dev | Supabase branch (preview) |
| **Staging** | `staging.freescale.app` | dev | Supabase staging project |
| **Production** | `app.freescale.app` | main | Supabase prod project |

---

## 📊 Tier de prix initial (coûts mensuels estimés)

| Service | Coût (0-1k users) |
|---|---|
| Vercel Pro | 20 € |
| Supabase Pro | 25 € |
| Cloudflare Workers | 5 € |
| Cloudflare R2 | 1-3 € |
| Anthropic API | 50-300 € (variable) |
| Resend | 20 € |
| Sentry | 26 € |
| PostHog | 0 € (free tier) |
| Inngest | 0 € (free tier) |
| Stripe | 2.9% + 0.30 € par transaction |
| Domaine | 12 €/an |
| **Total fixe/mois** | **~150 €** |

Le seul vrai coût variable est **Claude API** → maîtrisable avec prompt caching agressif et quota tier free.

---

## 🔒 Décisions de sécurité

- Tokens OAuth des channels **chiffrés côté DB** (libsodium) avec une master key dans Vercel env
- RLS sur toutes les tables — chaque user ne voit que sa data
- Webhook receivers **vérifient les signatures HMAC** de chaque provider
- Pas de PII dans les logs (Sentry scrubbing)
- Rate limiting par IP via Cloudflare + par user via Upstash Redis

---

## ✅ Étape 1 : Décision validée

**Stack final** : Next.js 15 + Supabase + Hono/CF Workers + Claude Sonnet 4.5 + Stripe + Vercel.

**Prochaine étape** : 2 → acheter le domaine `freescale.app`.
