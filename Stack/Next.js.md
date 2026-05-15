---
title: Next.js
type: stack
category: frontend-framework
status: confirmed
role: full-stack-framework
version: "15"
cost_monthly: 0
created: 2026-05-15
tags:
  - stack/frontend
  - confirmed
aliases:
  - Next.js 15
  - App Router
---

# Next.js

Framework React full-stack qui héberge l'app Freescale, déployé sur [[Vercel]].

## Version : **15** (App Router)

> [!info] Pourquoi App Router et pas Pages Router
> App Router = nouveau système (post v13). Permet :
> - **React Server Components** (RSC) par défaut → rendu côté serveur, 0 JS envoyé pour les parties statiques
> - **Server Actions** → appeler une fonction serveur depuis un composant comme une fonction normale
> - **Layouts persistants** → la sidebar ne re-render pas entre pages
> - **Streaming + Suspense** → contenu progressif
> - **File-based routing** → `app/inbox/page.tsx` → `/inbox`

## Architecture cible

```
apps/web/
├── app/
│   ├── (auth)/              # Route group (pas dans l'URL)
│   │   ├── login/page.tsx
│   │   └── signup/page.tsx
│   ├── (app)/               # App authentifiée
│   │   ├── layout.tsx       # Sidebar + Yuka layout persistant
│   │   ├── inbox/
│   │   │   ├── page.tsx
│   │   │   └── [convId]/page.tsx
│   │   ├── tasks/page.tsx
│   │   ├── calendar/page.tsx
│   │   └── ai-knowledge/page.tsx
│   ├── api/                 # Route handlers (webhooks etc)
│   ├── layout.tsx
│   └── globals.css
├── components/              # UI components (port du HTML actuel)
├── lib/                     # Utils client + serveur
└── middleware.ts            # Auth + redirects
```

## Server Components vs Client Components

> [!example] Quand utiliser quoi
> - **Server Component (par défaut)** : fetch data depuis [[Supabase]], render HTML — pas d'interactivité
> - **Client Component** (`"use client"`) : useState, useEffect, animations, onClick handlers

```tsx
// app/inbox/page.tsx (Server Component)
import { getConversations } from "@/lib/supabase";

export default async function InboxPage() {
  const conversations = await getConversations();  // Fetch côté serveur
  return <InboxClient initialConversations={conversations} />;
}

// components/InboxClient.tsx (Client Component)
"use client";
export function InboxClient({ initialConversations }) {
  const [active, setActive] = useState(initialConversations[0]);
  return <div>...</div>;
}
```

## Server Actions

Au lieu d'écrire une route API + un fetch côté client :

```tsx
// app/actions/send-message.ts
"use server";
export async function sendMessage(convId: string, text: string) {
  const supabase = createServerClient();
  await supabase.from("messages").insert({ conversation_id: convId, text });
  revalidatePath(`/inbox/${convId}`);
}

// Component
<form action={sendMessage}>...</form>
```

## Middleware

`middleware.ts` à la racine du projet — intercepte les requests :
- Auth check → redirect `/login` si pas connecté
- Workspace check → vérifier que l'user a accès au workspace dans l'URL
- A/B testing (futur)

## Coût

Open source, gratuit. Coûts viennent de l'hébergeur ([[Vercel]]).

## Liens utiles

- [Next.js 15 docs](https://nextjs.org/docs)
- [App Router guide](https://nextjs.org/docs/app)
- [Server Components](https://react.dev/reference/rsc/server-components)
- [Supabase + Next.js](https://supabase.com/docs/guides/auth/server-side/nextjs)
