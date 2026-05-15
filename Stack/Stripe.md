---
title: Stripe
type: stack
category: payments
status: confirmed
role: billing
created: 2026-05-15
tags:
  - stack/payments
---

# Stripe

Industry standard pour les paiements. Gère subscriptions, invoicing, et conformité fiscale (Stripe Tax).

## Configuration cible

**3 Products / Prices** :

| Tier | Price | Quotas |
|---|---|---|
| Free | 0 € | 1 channel, 100 messages/mo, 0 Mue calls |
| **Pro** | **19 €/mo** | Unlimited channels, unlimited messages, 1k Mue calls/mo |
| **Team** | **49 €/seat/mo** | Pro + workspace partagé + SSO |

## Flow

1. User clique "Upgrade" → redirect Stripe Checkout
2. Checkout success → webhook `checkout.session.completed` reçu par [[Hono]] sur [[Cloudflare Workers]]
3. Webhook met à jour `users.stripe_customer_id` + `users.plan` dans [[Supabase]]
4. App lit le plan via RLS

## Stripe Tax

> [!success] Gère TVA/Tax automatiquement
> France 20%, US states, UK 20%, etc. — Stripe collecte et fournit les rapports.
> ~0.5% de fee additionnel mais évite des semaines de comptabilité.

## Webhook events à gérer

- `checkout.session.completed` → activate plan
- `customer.subscription.updated` → change tier
- `customer.subscription.deleted` → downgrade to free
- `invoice.payment_failed` → email user + grace period
- `customer.deleted` → cleanup workspace

## Coût

- Standard : 2.9% + 0.30 € par transaction
- Stripe Tax : +0.5% du montant
- Pas de coût fixe mensuel

## Liens

- [Stripe Docs](https://stripe.com/docs)
- [Pricing](https://stripe.com/pricing)
- [Stripe Tax](https://stripe.com/tax)
