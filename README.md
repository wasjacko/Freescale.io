# Airtable Design System

An unofficial design-system recreation for **Airtable** — the AI-powered app-building platform used by over 500,000 teams. This package bundles the brand's visual foundations, tokenized colors and type, real product assets, UI-kit recreations of the app and marketing site, and ready-to-prototype React components.

> **Source:** All context was gathered from the public Airtable marketing site at https://www.airtable.com and the Airtable web app at https://airtable.com (inspector + published product screenshots). **No internal Airtable code or Figma libraries were provided**, so any values below represent best-effort observation and pattern-matching rather than an official export. Substitutions are flagged.

---

## Product & company context

Airtable is a no-code / low-code relational-database platform. Its positioning in 2026 is an **"AI app-building platform"**, bundling:

| Surface | What it is |
|---|---|
| **Marketing site** (`www.airtable.com`) | Cream-on-near-black editorial site selling the platform, solutions and enterprise capabilities. |
| **Product app** (`airtable.com/…`) | The core relational-spreadsheet product — bases, tables, grid/kanban/calendar/gallery views, interfaces, automations. |
| **Omni** | AI app-builder assistant, shown as a monochrome spherical mark. |
| **AI Agents** | Agents that act on records at scale. |
| **Interfaces / Portals** | Custom dashboards & external-facing views for guests. |
| **Platform features** | Automations, HyperDB, Reporting, Views, Governance, AI. |

Headline copy on the landing page (Apr 2026):
> *"All your teams, all their workflows—connected in one workspace."*
> *"Build AI-powered workflows that unify data, maximize collaboration, and set your teams up for long-term success. No code required."*

Trusted-by ribbon lists OpenAI, Anthropic, Harvey, Scale, Mercor, Amazon, Walmart, Netflix, J&J, Airbnb, Amex, HBO, Google, Hilton, NYT, Williams-Sonoma, Ford, Coca-Cola.

---

## Contents / file index

```
README.md                     ← you are here
SKILL.md                      ← Agent SKill entry (cross-compatible)
colors_and_type.css           ← all color + type + spacing + radius + shadow tokens
fonts/                        ← (empty — Airtable Sans is proprietary, see note)
assets/
  airtable-logomark.svg       ← 4-color A/cube mark
  airtable-wordmark.svg       ← mark + wordmark (wordmark recreated, not official)
  customer-logos/*.svg        ← 18 "trusted by" customer logos
  product/*.png|webp|gif|svg  ← product screenshots, Omni mark, bento cards
  marketing-nav-*.webp        ← marketing menu illustrations
preview/                      ← design-system cards (see Design System tab)
ui_kits/
  app/                        ← Airtable product app recreation (bases / grid view)
  marketing/                  ← Airtable.com marketing site recreation
```

---

## Content fundamentals — how Airtable writes

**Voice.** Confident, pragmatic, enterprise-friendly. Reads like a B2B SaaS built for operators and IT leaders, not a quirky maker tool. Historically Airtable's voice was more playful ("Organize anything with anyone from anywhere") but the 2025–2026 rebrand skews serious, AI-forward, and outcomes-driven.

**Person.** Collective "you / your teams." Rarely "we." Product capabilities are described as what **you** can now do. Example: *"Deploy thousands of agents inside your apps"*, *"Build AI-powered workflows that unify data."*

**Casing.** **Sentence case** everywhere — nav items, buttons, section headers, card titles, eyebrows. Never ALL CAPS in UI. Only the "NEW" ribbon badge on nav items uses uppercase, tracked out slightly. Examples seen on the site: *"Airtable Platform"*, *"AI App Building"*, *"See all integrations"*, *"Book demo"*, *"Sign up for free"*, *"Start building with Airtable"*.

**Copy patterns.**
- **Hero pattern:** one tight declarative H1 that promises the outcome (≤12 words, often with an em dash) + one sub-line explaining how + 2 CTAs.
- **Section headers:** ambitious statement ("The path to 10x every person in your organization", "Don't just ask AI. Deploy it.") followed by a short explainer.
- **Card copy:** 2–3 sentences, benefit-first. No adjectives for the sake of it.
- **"NEW" badge:** red-pink pill, uppercase, right of item name.

**Punctuation.** Em dashes (—) appear frequently to set up a promise. Oxford-comma lists. Periods on full sentences; dropped on nav labels and short card labels.

**Emoji.** **Never** in marketing. In-product, users can add emoji as field values but the chrome itself is emoji-free.

**Tone examples from the live site (do not reuse verbatim — match the register):**
- *"Production apps at prototype speed."*
- *"Streamline your team's critical data through conversational building."*
- *"Say hello to Omni."*
- *"The power of AI with the industrial-grade platform your business demands."*

---

## Visual foundations

### Palette philosophy
Airtable's palette has **two halves**:

1. **Brand chromatic accents** — the 4 logomark colors (yellow, cyan-blue, pink-red, and a purple/green supporting pair). Used sparingly, at small scale: in the mark, in one accent graphic per section, in field/select chips, in status dots. **Almost never as full backgrounds.**
2. **Warm neutrals** — the entire marketing site lives on **`--off-white` (#F9F9F7)** and **`--cream` (#F1EFE8)** with near-black text **`--gray-800` (#1D1F25)**. The product app uses a slightly cooler **#F4F5F7** canvas with white card surfaces.

Product-internal color is dominated by the **field/select swatch system** (~20 pastel backgrounds each paired with a 600-weight darker foreground) — these are the exact chip colors you see on cell select-options.

### Typography
- **Primary face:** Airtable Sans — a proprietary geometric sans close to **Graphik** / **Söhne**. Letterforms have moderate apertures and near-circular o/c/e. **Not available publicly.**
- **Our substitution:** **Inter** (Google Fonts) at 400/500/600/700. ⚠️ *Please provide Airtable Sans woff2 files to drop into `fonts/` if you have them.*
- **Display behavior:** Headlines tight (line-height 1.04–1.15), tight tracking (−0.018em → −0.025em). Weights are 500–600 for display; 700 reserved for CTAs.
- **Body:** 16–18px, leading 1.55, `--fg-2` (mid-gray) for running copy — not pure black.
- **Eyebrows:** sentence case, semibold, 13px. Never uppercase.
- **Editorial accent:** a serif (we substitute **Newsreader**) appears occasionally in blog / customer-story pull quotes; primary UI is sans only.

### Spacing & layout
- 4-pt base grid. Section vertical rhythm on marketing is huge — 96–128px between sections on desktop.
- Max content width ≈ 1200–1280px, centered.
- Sections rotate between `--off-white` and `--cream` to create rhythm; no gradient backgrounds, no patterned textures.

### Backgrounds & imagery
- **No gradients** on page backgrounds.
- **No hand-drawn illustrations or textures.** Imagery is almost entirely **photographic product screenshots** pulled from real bases, often composited against a soft background.
- **Hero video loops** of the product are common — always soft, UI-centric motion.
- Customer logos are **monochrome** (charcoal on cream). No colored brand logos in the trusted-by strip.
- Full-bleed imagery is rare; most visuals sit in a **rounded-corner (16–28px) card** with a subtle border.

### Animation & motion
- Short, calm motion. `cubic-bezier(0.2, 0.8, 0.2, 1)`, 120–220ms for micro-interactions.
- Hover on links/buttons: opacity shift to ~0.88 **or** a ~6% darker fill. No scale bounces.
- Press: a flat fill shift, no shrink.
- Scroll-linked reveals: gentle fade+translate (8px), no parallax, no typewriter effects.

### Borders
- Near-everything uses a **1px hairline** at `rgba(0,0,0,0.06-0.08)` — visible but quiet.
- Focus ring: **2px #2D7FF9** offset outline (Airtable's "select-blue" — same as the field-blue-dark token).

### Shadows & elevation
- Shadows are **barely-there**. Default card shadow is effectively `0 1px 2px rgba(0,0,0,0.06)` + the hairline border. Popovers and modals graduate to `0 10px 30px rgba(0,0,0,0.08)`.
- No inner shadows. No glow/neon effects. No colored shadows.

### Corner radii
- Inputs, cell editors: **6px** (`--r-sm`).
- Buttons: **8px** (`--r-md`).
- Cards, panels: **12–16px** (`--r-lg` / `--r-xl`).
- Hero imagery and feature cards: **20–28px** (`--r-2xl` / `--r-3xl`).
- Tags / chips: pill (`--r-pill`).

### Transparency & blur
- Sticky header uses a **white 80% backdrop-blur** on marketing. In-app modals use a 40% black scrim, no blur.
- No frosted-glass card surfaces anywhere else.

### Card anatomy (marketing)
```
 ┌────────────────────────────────┐
 │ ▶ eyebrow (13px semibold)      │
 │                                │
 │ Heading (H2, 28–44px)          │
 │ Short supporting line of body  │
 │                                │
 │ [ Primary button ]  Link arrow→│
 │                                │
 │  ┌──────────────────────────┐  │
 │  │  product screenshot or    │  │
 │  │  bento illustration       │  │
 │  │  (radius 16–20px)         │  │
 │  └──────────────────────────┘  │
 └────────────────────────────────┘
 bg: cream or off-white. Border: 1px hairline. Shadow: --shadow-sm.
```

---

## Iconography

Airtable's in-product iconography is a **custom, proprietary monochrome icon set** — simple 16×16 and 20×20 glyphs with a consistent ~1.5px stroke, rounded joins, designed to read well at small sizes in dense grids. Common icons: grid view, kanban, calendar, gallery, form, timeline, gantt, chevron-down, plus, search, filter, sort, hide-fields, bolt (automations), person, lock, link-records.

**We do not have the official icon set.** ⚠️ **Substitution flag:** This system links **[Lucide](https://lucide.dev)** (via CDN) as the closest match — clean, consistent 1.5px stroke, rounded joins, same general visual weight. Use via `<i data-lucide="grid">` or the React bindings.

**Emoji.** Emoji are never used in Airtable's marketing or product chrome. Inside the product, users may add emoji as content inside cells, base icons, or view names — but the chrome itself is emoji-free.

**Unicode glyphs.** Occasionally — `→` for "learn more" links, `×` for close, `✓` for confirmation checks.

**Logo / brand marks.**
- `assets/airtable-logomark.svg` — the 4-color geometric "A / stacked cube" mark, recreated from public visuals. Colors: `#FCB400`, `#18BFFF`, `#F82B60`.
- `assets/airtable-wordmark.svg` — mark + "airtable" wordmark set in Inter (substitute). **The real wordmark uses Airtable Sans.**
- `assets/product/omni-logo.svg` — the monochrome spherical Omni mark, pulled directly from the marketing site.
- `assets/customer-logos/*.svg` — 18 real customer logos pulled directly from Airtable's `static.airtable.com` CDN (OpenAI, Anthropic, Google, Amazon, Netflix, Ford, etc).

---

## How to use this system

1. Link `colors_and_type.css` from any prototype HTML.
2. Import assets from `assets/` directly — do not re-fetch from the CDN.
3. Start from a UI kit in `ui_kits/<product>/` for high-fidelity flows.
4. Use the `.at-*` utility classes (`.at-display-xl`, `.at-body`, `.at-eyebrow`) or raw tokens (`var(--fg-1)`, `var(--r-xl)`).
5. When in doubt about color, default to **#1D1F25 on #F9F9F7** with a **chromatic accent used once per screen**, not on every element.

---

## Caveats / known gaps

- **No official source files.** Everything here was pattern-matched from public pages. Hex values, type-metric ratios, and motion curves are best-effort.
- **Airtable Sans is substituted with Inter.** Please drop woff2 files into `fonts/` if you have them; swap the `@import` line in `colors_and_type.css`.
- **Icon set is substituted with Lucide.** If you have the real Airtable icon sprite, replace CDN link in UI kits.
- **No real in-app screenshots of grid view.** The product UI kit is a faithful recreation based on many published screenshots, but cell-level micro-details (resize handles, exact cell padding, expand-record chrome) are approximations.
- **Wordmark typeface.** The "airtable" wordmark in `assets/airtable-wordmark.svg` is set in Inter, not the real Airtable Sans.
