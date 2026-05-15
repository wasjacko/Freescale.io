---
title: Step 02 — Domain freescale.app
type: roadmap-step
phase: 1
step: 2
status: pending
tags:
  - step/pending
  - phase/1
  - foundation
  - action-required
---

# Step 02 — Domain `freescale.app`

> [!todo] Action utilisateur requise
> Cette étape demande un achat → carte bancaire. Je ne peux pas l'exécuter à ta place.

## 🎯 Objectif

Obtenir le domaine `freescale.app` + configurer DNS pour pointer vers [[Stack/Vercel|Vercel]] (front) et un sous-domaine pour [[Stack/Cloudflare Workers|Cloudflare Workers]] (API).

## 🏪 Où acheter

==Recommandation : Cloudflare Registrar==

| Registrar | `.app` price | Pourquoi |
|---|---|---|
| **Cloudflare Registrar** ⭐ | ~12 €/an (cost) | Prix coûtant, DNS + CDN + SSL inclus, integration native CF Workers |
| Porkbun | ~13 €/an | DX moderne, prix corrects |
| Namecheap | ~15 €/an | Populaire, classique |
| GoDaddy | 20+ €/an | ❌ Évite, upsells aggressifs |

> [!info] Pourquoi `.app`
> - **HTTPS-only enforced** par Google (TLD sécurisé) → bon signal de confiance
> - **Disponible** au moment où j'écris (à vérifier dans le checkout)
> - Renvoie "application" — clair pour un SaaS

## 📋 Checklist

- [ ] Vérifier dispo sur [Cloudflare Registrar](https://dash.cloudflare.com/?to=/:account/domains/register)
- [ ] Acheter `freescale.app` (~12 €/an)
- [ ] (Bonus) Acheter `freescale.io` et `freescale.com` si dispo ($$ mais marque protégée)
- [ ] Activer auto-renew
- [ ] Ajouter 2FA sur le compte registrar

## 🌐 Configuration DNS (après achat)

Une fois le domaine acquis, configurer les enregistrements suivants :

```dns
# Type    Name                  Value                                TTL    Proxied
A         @                     76.76.21.21                          auto   ✅ (Vercel front)
CNAME     app                   cname.vercel-dns.com                 auto   ✅
CNAME     api                   freescale-api.workers.dev            auto   ✅
CNAME     www                   freescale.app                        auto   ✅

# Email — Resend (étape Resend setup)
TXT       @                     v=spf1 include:_spf.resend.com -all  auto
TXT       resend._domainkey     [provided by Resend]                 auto
TXT       _dmarc                v=DMARC1; p=quarantine; rua=mailto:dmarc@freescale.app
```

## 🎁 Sous-domaines réservés

| Sous-domaine | Usage |
|---|---|
| `freescale.app` | Landing marketing |
| `app.freescale.app` | App SaaS principale ([[Stack/Vercel|Vercel]] + [[Stack/Next.js|Next.js]]) |
| `api.freescale.app` | Edge API ([[Stack/Cloudflare Workers|CF Workers]] + [[Stack/Hono|Hono]]) |
| `docs.freescale.app` | Documentation (étape 88) |
| `status.freescale.app` | Status page (étape 98) |
| `auth.freescale.app` | (futur) OAuth callbacks |

## 📧 Email setup (post-achat)

> [!info] Email de marque
> Pour `hello@freescale.app`, `support@freescale.app`, etc.
> Options :
> - **Cloudflare Email Routing** (gratuit) → forward vers Gmail perso
> - **Google Workspace** (6 €/mo) si on veut un vrai email professionnel
>
> Recommandation : commencer par Email Routing, upgrade à Workspace au launch.

## ➡️ Prochaine étape

[[Steps/Step 03 - GitHub repo]] — pendant que tu achètes le domaine, je peux commencer.
