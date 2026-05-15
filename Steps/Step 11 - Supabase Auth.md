---
title: Step 11 — Supabase Auth (email + Google OAuth)
type: roadmap-step
phase: 2
step: 11
status: done
completed: 2026-05-15
tags:
  - step/done
  - phase/2
  - auth
---

# Step 11 — Supabase Auth

> [!success] ✅ Done — 2026-05-15
> Auth Supabase live en prod. Email + Google OAuth fonctionnels. Apple skippé pour MVP.

## 🎯 Ce qui marche

- **Google OAuth** : click "Continue with Google" → Google consent → retour `/auth/callback` → session créée → `/`
- **Email + password** : signup envoie email de confirmation, login direct
- **Middleware auth gate** : `/`, `/inbox`, etc. redirigent vers `/login?next=…` si non auth
- **Sidebar dynamique** : photo de profil Google + prénom + email du user connecté (au lieu de "Alexandre" hardcodé)
- **Mue greeting** : adapte le prénom user sur la vue Calendar
- **Sign out** : cog → menu Account → "Sign out" (rouge) → POST `/auth/sign-out` → cookie cleared → redirect `/login`
- **Graceful degradation** : si Supabase env vars manquent, middleware passe en transparent (pas de 500)

## 🔑 Configuration utilisée

### Supabase
- Project : `zskvdvybgillldwjtvvi.supabase.co`
- Anon key : `sb_publishable_…` (format nouveau, depuis fin 2024)
- Site URL : `https://freescale-io.vercel.app`
- Redirect URLs : `https://freescale-io.vercel.app/**` + `http://localhost:3000/**`

### Google Cloud
- Project : `freescale`
- OAuth Client : Web application
- Authorized redirect URI : `https://zskvdvybgillldwjtvvi.supabase.co/auth/v1/callback`
- Mode : Test (publication publique = à faire plus tard, demande review Google)

### Vercel env vars (production + preview + development)
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## 📁 Code structure

```
apps/web/
├── middleware.ts                        # Next middleware
├── lib/
│   ├── auth.ts                          # getCurrentUser() server helper
│   └── supabase/
│       ├── client.ts                    # Browser client
│       ├── server.ts                    # Server client w/ cookies
│       └── middleware.ts                # Session refresh + auth gate
├── app/
│   ├── (auth)/
│   │   ├── layout.tsx                   # Auth shell
│   │   ├── login/page.tsx
│   │   └── signup/page.tsx
│   ├── auth/
│   │   ├── callback/route.ts            # OAuth code exchange
│   │   └── sign-out/route.ts
│   └── page.tsx                         # Fetches user, passes to AppShell
└── components/auth/AuthForm.tsx         # Email + Google + Apple UI
```

## ⚠️ Pièges rencontrés

> [!warning] MIDDLEWARE_INVOCATION_FAILED 500
> Cause : middleware tentait `createServerClient(undefined, undefined, …)` quand les env Vercel n'étaient pas encore setées.
> Fix : detect placeholder / missing values → `return NextResponse.next()` sans gate.

> [!warning] Redirect vers localhost après login Google
> Cause : Site URL Supabase = `http://localhost:3000` par défaut.
> Fix : Settings → Auth → URL Configuration → Site URL = `https://freescale-io.vercel.app`.

> [!warning] Google profile picture 404
> Cause : Next.js Image whitelist par défaut bloquait `lh3.googleusercontent.com`.
> Fix : ajouter pattern dans `next.config.ts`.

## 🔜 À faire plus tard

- [ ] **Apple OAuth** : Services ID + key file Apple Developer (post-MVP)
- [ ] **Publier OAuth consent screen** Google (vérification ~quelques jours pour usage public)
- [ ] **Magic link** comme alternative au password (déjà supporté par Supabase, juste UI à wirer)
- [ ] **2FA TOTP** (Step 16 roadmap)
- [ ] **Profile page** pour éditer name/avatar/timezone (Step 15)

## ➡️ Prochaine étape

[[Steps/Step 21 - Database schema]] — schema Postgres pour les conversations, channels, messages, tasks, etc.
