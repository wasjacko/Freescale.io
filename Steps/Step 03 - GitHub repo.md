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

```yaml
# .github/workflows/ci.yml
name: CI
on: [pull_request, push]
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - checkout
      - setup pnpm 9 + Node 20
      - pnpm install --frozen-lockfile
      - pnpm lint / typecheck / test
```

> [!info] Mode soft pour le démarrage
> Les jobs sont en `continue-on-error: true` tant qu'il n'y a pas de code à vérifier — sinon chaque PR serait rouge alors qu'il n'y a rien à linter. À retirer dès qu'on aura un lockfile + premier code TS.

## ➡️ Prochaine étape

[[Steps/Step 04 - Monorepo Turborepo]] — scaffolding code (en cours)
