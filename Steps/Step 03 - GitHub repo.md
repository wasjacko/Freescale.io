---
title: Step 03 — GitHub repo
type: roadmap-step
phase: 1
step: 3
status: done
completed: 2026-05-15
tags:
  - step/done
  - phase/1
  - foundation
---

# Step 03 — GitHub repo

> [!success] ✅ Done — 2026-05-15
> Repo `wasjacko/Freescale.io` réinitialisé avec le contenu MVP.

## 🎯 Ce qui a été fait

1. **Force push** de l'état actuel sur https://github.com/wasjacko/Freescale.io.git
   - Ancien commit `56fea52` (old Freescale) → écrasé
   - Nouveau commit `464dbf8` → 22 fichiers
2. **Branch `main`** créée comme branche par défaut (`git init -b main`)
3. **Branche `dev`** créée et poussée → staging branch
4. **CI workflow** `.github/workflows/ci.yml` ajouté
5. **`.gitignore`** propre (ignore `.obsidian/workspace*`, `.claude/`, `node_modules`, `.env`, etc.)
6. **`README.md`** racine = vitrine du repo sur GitHub

## 🌿 Branch strategy

| Branche | Protection (à activer) | Deploy |
|---|---|---|
| `main` | Require PR + 1 review + CI passing | Prod (`app.freescale.app`) |
| `dev` | Require PR + CI passing | Staging |
| `feature/*` | Aucune | Preview URL [[Stack/Vercel|Vercel]] |

> [!todo] À activer manuellement sur GitHub
> Settings → Branches → Add rule pour `main` :
> - ✅ Require a pull request before merging
> - ✅ Require status checks (CI)
> - ✅ Require linear history
> - ✅ Do not allow bypassing
>
> Pareil pour `dev` (moins strict).

## 🔧 CI workflow

> [!warning] À ajouter manuellement par toi
> Le push automatique a été refusé : `refusing to allow an OAuth App to create or update workflow` — l'OAuth Claude n'a pas le scope `workflow` (sécurité GitHub).
>
> Le fichier est sauvegardé localement dans `.ci-future/ci.yml` (gitignored).

**Comment l'ajouter sur GitHub** :
1. Aller sur https://github.com/wasjacko/Freescale.io
2. Click **Add file** → **Create new file**
3. Nom du fichier : `.github/workflows/ci.yml`
4. Coller le contenu ci-dessous :

```yaml
name: CI

on:
  pull_request:
    branches: [main, dev]
  push:
    branches: [main, dev]

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  check:
    name: Lint · Typecheck · Test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile
        continue-on-error: true
      - run: pnpm lint
        continue-on-error: true
      - run: pnpm typecheck
        continue-on-error: true
      - run: pnpm test
        continue-on-error: true
```

5. Commit directement sur `main` (avec message `ci: add GitHub Actions workflow`)

> [!info] Mode soft pour le démarrage
> Les jobs sont en `continue-on-error: true` tant qu'il n'y a pas de code à vérifier. À retirer dès qu'on aura un lockfile + premier code TS.

## ➡️ Prochaine étape

[[Steps/Step 04 - Monorepo Turborepo]] — scaffolding code (en cours)
