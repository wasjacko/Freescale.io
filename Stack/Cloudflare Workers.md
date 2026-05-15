---
title: Cloudflare Workers
type: stack
category: compute-platform
status: confirmed
role: edge-runtime
cost_monthly: 5
created: 2026-05-15
tags:
  - stack/edge
  - confirmed
---

# Cloudflare Workers

Plateforme d'exécution serverless globale qui fait tourner [[Hono]] sur **300+ data centers**.

## Comment ça marche

> [!example] Magic
> Tu écris une fonction. Cloudflare la déploie en **<30 secondes** sur tous ses data centers. Quand un user fait une requête, **le data center le plus proche exécute la fonction**.
> Pas de serveur à provisionner. Pas de scaling à configurer. Pas de region à choisir.

## Différences vs serveurs classiques

| | Workers | Node.js serveur (AWS EC2/Heroku) |
|---|---|---|
| Cold start | ~1 ms | 100-500 ms |
| Régions | Toutes (auto) | Une seule (sauf multi-region setup complexe) |
| Pricing | Pay per request | Pay per heure (même idle) |
| Limites | 50ms CPU/req, 128 MB RAM | Plein contrôle |
| Node APIs | Subset (Web standard) | Tout |

## Limitations à connaître

> [!warning] Pas de Node.js natif
> Pas de `fs`, pas de `child_process`. Que des APIs Web (fetch, Request, Response, Crypto, ReadableStream…).
> Pour notre cas (webhooks + AI proxy), c'est suffisant.

> [!warning] 50ms CPU max par requête
> Pour les jobs longs (parse PDF, image processing), on délègue à **Inngest** (queue avec retry).

> [!warning] Pas de connexion persistante DB
> Pas de pool de connexions Postgres. On utilise **Supabase REST API** (PostgREST) ou Hyperdrive de Cloudflare pour pool.

## Bindings (configuration)

```toml
# wrangler.toml
name = "freescale-api"
main = "src/index.ts"
compatibility_date = "2026-05-15"

[vars]
ENVIRONMENT = "production"

[[r2_buckets]]
binding = "ATTACHMENTS"
bucket_name = "freescale-attachments"

[[kv_namespaces]]
binding = "RATE_LIMITS"
id = "abc123..."
```

## Pricing

| Plan | Coût | Limites |
|---|---|---|
| Free | 0 € | 100k req/jour, 10ms CPU |
| **Paid** ⭐ | **5 €/mo** | 10M req/mo, 50ms CPU + 5 €/M req au-delà |

À l'échelle MVP (<1k users), on reste très en dessous de 10M req/mo.

## Services Cloudflare complémentaires utilisés

- **R2** — storage S3-compatible sans egress fees ([[Cloudflare R2]])
- **KV** — key-value store pour rate limiting et cache
- **Queues** — alternative à Inngest si on veut tout chez Cloudflare
- **Hyperdrive** — pool de connexions Postgres (si on en a besoin plus tard)

## Liens

- [Workers docs](https://developers.cloudflare.com/workers/)
- [Pricing](https://workers.cloudflare.com/#plans)
