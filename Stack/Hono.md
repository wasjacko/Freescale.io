---
title: Hono
type: stack
category: api-framework
status: confirmed
role: edge-api
cost_monthly: 0
created: 2026-05-15
tags:
  - stack/backend
  - edge
---

# Hono

Framework minimaliste (~12kb) pour écrire des API qui tournent sur l'edge (Cloudflare Workers, Deno, Bun).

## Rôle dans [[Freescale]]

Hono porte les endpoints qui doivent être **rapides et déployés globalement** :
- **Webhook receivers** : Gmail Pub/Sub, Slack Events, Instagram webhooks, Stripe webhooks
- **Mue API** : endpoints `/chat`, `/summarize`, `/translate` (proxy vers [[Claude API]])
- **Health checks** + monitoring endpoints

Le reste de l'API (Server Actions dans [[Next.js]]) reste dans `apps/web` pour la simplicité.

## Pourquoi Hono et pas Express

| | Hono | Express |
|---|---|---|
| Taille | 12 kb | 600 kb |
| Cold start | ~1 ms | ~150 ms |
| Edge ready | ✅ | ❌ (Node only) |
| TypeScript-first | ✅ | ⚠️ via @types |
| Routing perf | ~3× plus rapide | baseline |

## Structure cible

```
apps/api/
├── src/
│   ├── index.ts             # Entry point
│   ├── routes/
│   │   ├── webhooks/
│   │   │   ├── gmail.ts
│   │   │   ├── slack.ts
│   │   │   └── stripe.ts
│   │   └── mue/
│   │       ├── chat.ts
│   │       └── summarize.ts
│   ├── middleware/
│   │   ├── verify-signature.ts
│   │   └── rate-limit.ts
│   └── lib/
│       ├── supabase.ts
│       └── anthropic.ts
├── wrangler.toml            # Cloudflare config
└── package.json
```

## Exemple type — webhook Gmail

```ts
import { Hono } from "hono";
import { verify } from "./middleware/verify-signature";

const app = new Hono<{ Bindings: Env }>();

app.post("/webhooks/gmail", verify("gmail"), async (c) => {
  const payload = await c.req.json();
  // → enqueue Inngest job to process message
  await c.env.INNGEST.send({ name: "gmail/new-message", data: payload });
  return c.json({ ok: true });
});

export default app;
```

## Lien direct

- [Hono docs](https://hono.dev)
- [Hono + Cloudflare Workers](https://hono.dev/getting-started/cloudflare-workers)

## Voir aussi

[[Cloudflare Workers]] — la plateforme qui exécute Hono.
