# 🦎 Freescale

> Inbox unifié multi-canaux (Gmail / Instagram / WhatsApp / Slack / Discord) avec un copilot IA — **Mue** — qui résume, répond, et transforme les conversations en actions.

**Cible** : freelances et solopreneurs qui jonglent entre 5+ canaux clients tous les jours.

---

## 📂 Structure du repo

| Path | Description |
|---|---|
| `index.html` | Prototype HTML/CSS/JS de l'UI (~4000 lignes, production-quality design) |
| `Freescale.md` | Hub Obsidian — point d'entrée du vault |
| `ROADMAP.md` | Roadmap 100 étapes vers le launch |
| `ARCHITECTURE.md` | Architecture Decision Record (ADR-001) — stack et justifications |
| `DESIGN.md` | Design system (tokens, motion, principles) |
| `Stack/` | Notes Obsidian par technologie (Vercel, Supabase, …) |
| `Steps/` | Notes Obsidian par étape de la roadmap |

## 🛠 Stack technique

**Confirmé** :
- [Vercel](./Stack/Vercel.md) — hosting front
- [Supabase](./Stack/Supabase.md) — DB + Auth + Realtime + Storage
- [GitHub](./Stack/GitHub.md) — source control + CI
- [Next.js 15](./Stack/Next.js.md) — framework full-stack
- [Hono](./Stack/Hono.md) + [Cloudflare Workers](./Stack/Cloudflare%20Workers.md) — webhooks edge
- [Claude API](./Stack/Claude%20API.md) — cerveau de Mue
- [Stripe](./Stack/Stripe.md) — paiements
- [Resend](./Stack/Resend.md) — emails transactionnels

Détails complets dans [ARCHITECTURE.md](./ARCHITECTURE.md).

## 🚀 État actuel

- ✅ Prototype HTML/CSS/JS complet (Inbox, Tasks, Calendar, AI Knowledge, Mue copilot)
- ✅ Stack décidé et documenté
- ⏳ Migration Next.js en cours
- ⏳ Backend Supabase à monter
- ⏳ Intégrations Gmail + Slack pour le MVP

## 📋 Roadmap

100 étapes documentées dans [ROADMAP.md](./ROADMAP.md).

**Chemin critique 90 jours** :
- Semaines 1-2 : Foundation (stack, repo, monorepo, migration UI)
- Semaines 3-4 : Auth + intégrations Gmail/Slack
- Semaines 5-6 : Mue (Claude API)
- Semaines 7-8 : Billing + landing + launch

## 🦎 Mue

L'IA de Freescale est un **bébé salamandre pixel-art** avec grosse tête lavande/rose. Elle :
- Résume les conversations longues
- Suggère 3 réponses contextuelles
- Extrait les tâches des messages
- Adapte son ton à chaque user (AI Knowledge personnel)

## 📜 Licence

À définir (privé pour le moment).

---

> Built with 🦎 by Wassim Jacko · @wasjacko
