---
title: Vercel
type: stack
category: hosting
status: confirmed
role: frontend-hosting
cost_monthly: 20
created: 2026-05-15
tags:
  - stack/hosting
  - confirmed
aliases:
  - Vercel Pro
---

# Vercel

> [!success] Confirmé par l'utilisateur le 2026-05-15
> Vercel sera l'hébergeur du front [[Next.js]] et probablement de la landing marketing.

## Rôle dans [[Freescale]]

Vercel sert à :
- Héberger l'app principale `app.freescale.app` ([[Next.js]] App Router)
- Héberger la landing `freescale.app` (étape 86)
- Preview deploys automatiques sur chaque PR GitHub
- Edge functions (Server Actions, Route Handlers)

## Pourquoi Vercel

> [!tip] Forces
> - **Deploy git-push** : tu push, ça déploie. Zero config.
> - **Preview URLs** automatiques par PR — tu peux tester chaque feature avant merge
> - **Edge Functions** intégrées — Server Components et Server Actions tournent en edge
> - **CDN global** — assets servis depuis 100+ points of presence
> - **Image Optimization** automatique (`next/image`)
> - Créé par l'équipe Next.js → meilleur support du framework

> [!warning] Limites
> - **Bandwidth** Pro tier : 1 TB/mo (suffisant à <50k MAU)
> - **Build time** 6000 min/mo (large)
> - **Pas de Postgres natif** — on utilise [[Supabase]] séparé
> - Pas terrible pour les long-running tasks (>60s) → on délègue à [[Cloudflare Workers]] + Inngest

## Configuration cible

```bash
# Project linked to GitHub via Vercel dashboard
vercel link
vercel env pull .env.local
```

### Variables d'environnement requises

| Variable | Source | Visibility |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | [[Supabase]] | client |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | [[Supabase]] | client |
| `SUPABASE_SERVICE_ROLE_KEY` | [[Supabase]] | server-only |
| `ANTHROPIC_API_KEY` | [[Claude API]] | server-only |
| `STRIPE_SECRET_KEY` | [[Stripe]] | server-only |
| `STRIPE_WEBHOOK_SECRET` | [[Stripe]] | server-only |
| `RESEND_API_KEY` | [[Resend]] | server-only |

## Domaines

Une fois le domaine acheté (étape 2) :
- `app.freescale.app` → l'app SaaS (Next.js)
- `freescale.app` → la landing
- `*.freescale.app` → preview deploys sur sous-domaines

## Alternatives écartées

| Alternative | Pourquoi non |
|---|---|
| Netlify | Moins bon support Next.js App Router (RSC, streaming) |
| Cloudflare Pages | Pas encore mature pour Next.js complet (workers oui, mais front Next pas idéal) |
| AWS Amplify | DX brutale, config XML-like, vendor lock-in fort |
| Self-host (Coolify, Dokploy) | Trop d'ops pour un MVP en 90j |

## Liens utiles

- [Pricing Vercel](https://vercel.com/pricing)
- [Vercel + Next.js docs](https://vercel.com/docs/frameworks/nextjs)
- [Vercel CLI](https://vercel.com/docs/cli)
