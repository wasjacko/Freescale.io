---
title: Step 08 — Design tokens → Tailwind theme
type: roadmap-step
phase: 1
step: 8
status: done
completed: 2026-05-15
tags:
  - step/done
  - phase/1
  - foundation
  - tailwind
---

# Step 08 — Design tokens → Tailwind theme

> [!success] ✅ Done — 2026-05-15
> Tous les design tokens (couleurs, radii, shadows, typo) sont accessibles via les utility classes Tailwind générées depuis un bloc `@theme` dans `globals.css`.

## 🎯 Différence avec Tailwind v3 (que j'avais initialement annoncé)

> [!warning] Pas de `tailwind.config.ts`
> En **Tailwind v4** (`4.3.0` installé), la config passe **directement par un bloc `@theme` dans le CSS**. Plus de `tailwind.config.ts`. C'est plus simple, plus rapide, et 100% colocated avec les styles.

## 📐 Structure mise en place

### 1. `apps/web/app/globals.css` — bloc `@theme`

```css
@import "tailwindcss";

@theme {
  /* Colors → text-{name}, bg-{name}, border-{name} */
  --color-ink: #0F172A;
  --color-accent: #5B6CFF;
  --color-canvas: #FFFFFF;
  /* … 25 colors */

  /* Radii → rounded-{name} */
  --radius-sm: 12px;
  --radius-md: 16px;
  --radius-lg: 20px;
  --radius-xl: 24px;

  /* Shadows → shadow-{name} */
  --shadow-soft: 0 1px 2px ..., 0 4px 14px ...;
  --shadow-floating: 0 10px 40px ...;

  /* Typography → font-{name} */
  --font-sans: "Geist", "SF Pro Display", system-ui, sans-serif;
}
```

### 2. `apps/web/postcss.config.mjs`

```js
export default {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};
```

### 3. `apps/web/lib/design-tokens.ts`

Export TypeScript des tokens pour usage en JS (inline styles, canvas, dynamic colors).

## 🧪 Vérification

CSS compilé inspecté :

```css
.bg-accent     { background-color: var(--color-accent); }
.rounded-xl    { border-radius: var(--radius-xl); }
.shadow-soft   { box-shadow: var(--shadow-soft); }
.text-canvas   { color: var(--color-canvas); }
```

✓ Toutes les utilities sont générées par le JIT à partir des classes utilisées dans le code source.

## 🔗 Cohabitation avec le CSS legacy

Les 3500 lignes de CSS portées depuis `index.html` utilisent encore `var(--ink)`, `var(--r-xl)`, etc. Pour la backward-compat, le bloc `:root` mirror les mêmes valeurs :

```css
@theme { --color-ink: #0F172A; }   /* → text-ink utility */
:root  { --ink: #0F172A; }         /* → var(--ink) legacy */
```

Au fur et à mesure qu'on réécrit un composant en utility-first, on peut supprimer son `var(--xxx)` legacy correspondant.

## ⚠️ Pourquoi le premier essai a échoué

Tailwind 4.3.0 était installé via `pnpm` mais **sans le plugin PostCSS v4** → le `@import "tailwindcss"` était lu en CSS brut, sans génération d'utilities.

**Fix** : `pnpm add -D @tailwindcss/postcss` + `postcss.config.mjs`.

## ➡️ Prochaine étape

[[Steps/Step 09 - Storybook]] — Storybook + Chromatic pour le visual regression sur les composants.
