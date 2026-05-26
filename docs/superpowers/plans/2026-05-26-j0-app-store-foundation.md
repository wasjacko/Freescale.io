# J0 App Store Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Freescale publication-ready at the foundation level by documenting the Apple/Google launch gates and shipping the missing public privacy, terms, support, and account-deletion surfaces required before an iPhone beta.

**Architecture:** J0 does not create the Expo client or mobile API yet. It establishes the compliance contract in versioned documentation and adds factual public Next.js pages backed by a single typed content module, so the login and marketing surfaces no longer point to missing legal/support routes. Apple Developer enrollment, Supabase Apple credentials, and Google OAuth verification remain explicit owner-operated gates because their secrets and accounts cannot be created in source control.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, Vitest, CSS, Supabase Auth, Apple App Store Connect, Google OAuth Console.

---

## Scope Boundary

J0 implements repository-side launch readiness and records account-side work. It does not:

- create `apps/mobile` or configure EAS builds; that begins in J2 after the API/auth contracts exist;
- enable Apple login in the web or native UI without Apple credentials;
- change Stripe billing;
- claim Gmail distribution readiness before Google confirms restricted-scope verification.

The public policy content uses the already published product contact
`hello@freescale.app`. Before an App Store submission or production push of
the policy pages, the owner must confirm that this mailbox is monitored and
provide the legal identity/address of the data controller for the final
privacy wording.

## File Map

**Create**

- `docs/app-store/J0_COMPLIANCE_CHECKLIST.md` - source of truth for Apple,
  Google, commerce, contact, and review-status gates.
- `apps/web/lib/public-compliance.ts` - typed factual copy for public policy
  pages and shared contact constants.
- `apps/web/lib/public-compliance.test.ts` - structural tests that lock the
  required routes, contact, deletion disclosure, and footer links.
- `apps/web/components/legal/PublicPolicyPage.tsx` - shared public policy
  layout.
- `apps/web/app/privacy/page.tsx` - public privacy policy route.
- `apps/web/app/terms/page.tsx` - public terms route already referenced by
  authentication.
- `apps/web/app/support/page.tsx` - public support URL for App Store metadata.
- `apps/web/app/account-deletion/page.tsx` - public deletion explanation and
  logged-in route to initiate deletion.

**Modify**

- `apps/web/app/page.tsx` - expose support/privacy/terms/deletion links from
  the marketing footer.
- `apps/web/app/pricing/page.tsx` - expose the same public links on the
  commercial web-only page.
- `apps/web/app/globals.css` - responsive policy/support layout styling.

## Owner Checkpoints Outside The Repo

These steps cannot be performed through source code. They are part of J0 and
must be marked in `docs/app-store/J0_COMPLIANCE_CHECKLIST.md` with evidence
links or dates once completed.

- Apple Developer Program membership is active for the publishing account.
- Bundle ID `site.freescale.app` and App Store Connect record `Freescale` are
  available or registered.
- The app remains a free companion: no iPhone price, external-upgrade CTA, or
  in-app purchase in V1.
- `hello@freescale.app` receives support and privacy messages, and the final
  legal identity/address of the controller is confirmed.
- Google Cloud OAuth status is checked for
  `https://www.googleapis.com/auth/gmail.modify`; because it is restricted
  and Freescale stores/transmits mail data, the required verification and
  security assessment are opened if not already completed.
- Apple Sign in credentials and redirect identifiers are obtained for future
  Supabase/Expo configuration; no secret is committed.

### Task 1: Add The Publication Compliance Register

**Files:**
- Create: `docs/app-store/J0_COMPLIANCE_CHECKLIST.md`

- [ ] **Step 1: Create the checklist with known decisions and owner-operated gates**

Create the document with this complete starting state:

```markdown
# Freescale iPhone - J0 Compliance Checklist

## Product Decision

- Distribution model: free companion iPhone app for the Freescale web service.
- Commerce in iPhone V1: prohibited; no price, paywall, checkout, subscribe CTA, or external purchase link.
- Web commerce: Stripe pricing and checkout remain on `https://www.freescale.site`.
- Native value required for review: task-first navigation, offline task cache/sync, local reminders, native auth and account deletion.

## Identifiers

| Item | Target value | Status | Evidence required |
| --- | --- | --- | --- |
| App name | Freescale | Decision recorded | App Store Connect URL once created |
| iOS bundle identifier | `site.freescale.app` | To register in Apple Developer | Identifier screenshot/URL |
| Deep-link scheme | `freescale` | Reserved for Expo phase | `app.config.ts` in J2 |
| Website | `https://www.freescale.site` | Existing production domain | Live URL check |
| Support contact | `hello@freescale.app` | Owner must confirm monitored inbox | Successful test email date |

## Apple Gates

| Requirement | Current status | Completion evidence |
| --- | --- | --- |
| Apple Developer Program membership | Owner action required | Team ID and enrollment confirmation |
| App Store Connect app record | Owner action required | App record URL |
| Sign in with Apple capability | Owner action required | Service/App ID and key configured securely |
| Privacy policy URL | Repo work in J0 | Live `/privacy` URL |
| Support URL | Repo work in J0 | Live `/support` URL |
| Account deletion initiation | Web already exists; native required in J2/J3 | TestFlight screen recording |
| No native purchase CTA | Design locked; verify per build | Review checklist result |

## Google Gmail Gate

Freescale currently requests `https://www.googleapis.com/auth/gmail.modify`
and `https://www.googleapis.com/auth/gmail.send`. Google classifies
`gmail.modify` as a restricted scope. Freescale stores or transmits mailbox
content server-side, so public distribution must not be considered cleared
until Google OAuth verification and any required security assessment are
confirmed.

| Requirement | Current status | Completion evidence |
| --- | --- | --- |
| OAuth consent project owner access | Owner action required | Project identifier recorded privately |
| Restricted-scope verification status checked | Owner action required | Console status and date |
| Security assessment requirement confirmed | Owner action required | Google response/status |
| Review/demo account behavior without Gmail | Product requirement recorded | Native J2 test |

## Legal And Support Copy Gate

The repository may ship public informational routes using the existing
contact `hello@freescale.app`. Before App Store submission or publication of
final legal wording, the owner must confirm:

- the mailbox is monitored;
- the legal name and postal address of the data controller;
- the countries offered at launch;
- the final list of subprocessors for infrastructure, email, payment and Mue.

## Official References

- Apple App Review Guidelines: <https://developer.apple.com/app-store/review/guidelines/>
- Apple account deletion: <https://developer.apple.com/support/offering-account-deletion-in-your-app/>
- Google Gmail scopes: <https://developers.google.com/workspace/gmail/api/auth/scopes>
- Supabase Sign in with Apple: <https://supabase.com/docs/guides/auth/auth-apple>
- Supabase native mobile deep linking: <https://supabase.com/docs/guides/auth/native-mobile-deep-linking>
```

- [ ] **Step 2: Commit the compliance register**

```bash
git add docs/app-store/J0_COMPLIANCE_CHECKLIST.md
git commit -m "Document App Store compliance gates"
```

Expected: one documentation commit; no credential or secret enters git.

### Task 2: Lock The Required Public Surface With Failing Tests

**Files:**
- Create: `apps/web/lib/public-compliance.test.ts`

- [ ] **Step 1: Write a failing structural test for missing public pages and navigation**

```ts
import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

async function source(path: string) {
  return readFile(new URL(path, import.meta.url), "utf8").catch(() => "");
}

describe("public App Store compliance surfaces", () => {
  it("publishes public privacy, terms, support and deletion pages", async () => {
    const [privacy, terms, support, deletion] = await Promise.all([
      source("../app/privacy/page.tsx"),
      source("../app/terms/page.tsx"),
      source("../app/support/page.tsx"),
      source("../app/account-deletion/page.tsx"),
    ]);

    expect(privacy).toContain("privacyPolicy");
    expect(terms).toContain("termsOfService");
    expect(support).toContain("supportInformation");
    expect(deletion).toContain("accountDeletionInformation");
  });

  it("discloses contact and the existing deletion initiation path", async () => {
    const content = await source("./public-compliance.ts");

    expect(content).toContain("hello@freescale.app");
    expect(content).toContain("/app/settings/profile");
    expect(content).toContain("Supprimer mon compte");
    expect(content).toContain("Mue");
  });

  it("links compliance routes from public product surfaces", async () => {
    const [landing, pricing] = await Promise.all([
      source("../app/page.tsx"),
      source("../app/pricing/page.tsx"),
    ]);

    for (const path of ["/support", "/privacy", "/terms", "/account-deletion"]) {
      expect(landing).toContain(path);
      expect(pricing).toContain(path);
    }
  });
});
```

- [ ] **Step 2: Run the test and verify it fails before implementation**

Run:

```bash
pnpm --filter @freescale/web test -- lib/public-compliance.test.ts
```

Expected: FAIL because `public-compliance.ts` and the four public route files
do not yet exist and the landing/pricing footers do not contain all links.

- [ ] **Step 3: Commit the red test**

```bash
git add apps/web/lib/public-compliance.test.ts
git commit -m "test: require public App Store compliance pages"
```

### Task 3: Implement Typed Public Compliance Content And Routes

**Files:**
- Create: `apps/web/lib/public-compliance.ts`
- Create: `apps/web/components/legal/PublicPolicyPage.tsx`
- Create: `apps/web/app/privacy/page.tsx`
- Create: `apps/web/app/terms/page.tsx`
- Create: `apps/web/app/support/page.tsx`
- Create: `apps/web/app/account-deletion/page.tsx`

- [ ] **Step 1: Add a typed, centralized content model**

Create `apps/web/lib/public-compliance.ts`:

```ts
export const PUBLIC_CONTACT_EMAIL = "hello@freescale.app";
export const PUBLIC_POLICY_UPDATED_AT = "26 mai 2026";

export type PublicPolicy = {
  eyebrow: string;
  title: string;
  introduction: string;
  sections: Array<{ title: string; paragraphs: string[]; items?: string[] }>;
  action?: { label: string; href: string };
};

export const privacyPolicy: PublicPolicy = {
  eyebrow: "Confidentialité",
  title: "Politique de confidentialité",
  introduction:
    "Freescale centralise des conversations et des tâches pour aider ses utilisateurs à agir. Cette page décrit les données traitées et les choix disponibles.",
  sections: [
    {
      title: "Responsable et contact",
      paragraphs: [
        `Le service Freescale est joignable à ${PUBLIC_CONTACT_EMAIL} pour toute question relative aux données personnelles ou à l'exercice de vos droits.`,
      ],
    },
    {
      title: "Données traitées",
      paragraphs: ["Nous traitons uniquement les données nécessaires au fonctionnement demandé."],
      items: [
        "Identité de compte : nom, adresse email, avatar et informations d'espace de travail.",
        "Données connectées : jetons d'autorisation chiffrés et conversations des canaux que vous reliez volontairement.",
        "Données de travail : tâches, échéances, événements, modèles et préférences.",
        "Demandes Mue : contenu transmis lorsque vous lancez explicitement une analyse ou une assistance.",
        "Facturation web : état du plan et références nécessaires au paiement Stripe sur le site.",
      ],
    },
    {
      title: "Finalités et services utilisés",
      paragraphs: [
        "Ces données servent à authentifier le compte, synchroniser les canaux choisis, afficher l'inbox et les tâches, exécuter une demande Mue et fournir l'assistance.",
        "Freescale s'appuie notamment sur Supabase pour les comptes et données, Google ou Microsoft pour les canaux autorisés, Stripe pour la facturation web et un fournisseur de modèle IA configuré pour les demandes Mue explicites.",
      ],
    },
    {
      title: "Contrôle et suppression",
      paragraphs: [
        "Vous pouvez déconnecter un canal depuis les réglages. Vous pouvez initier la suppression définitive de votre compte depuis Réglages > Profil > Supprimer mon compte ; la suppression efface le profil, les workspaces, les jetons connectés, les conversations, les tâches et les événements associés.",
        `Pour exercer un droit d'accès, de rectification ou de suppression si vous ne pouvez plus vous connecter, écrivez à ${PUBLIC_CONTACT_EMAIL}.`,
      ],
    },
  ],
  action: { label: "Comment supprimer mon compte", href: "/account-deletion" },
};

export const termsOfService: PublicPolicy = {
  eyebrow: "Conditions",
  title: "Conditions d'utilisation",
  introduction:
    "En utilisant Freescale, vous confiez au service l'organisation des messages et tâches que vous choisissez de connecter.",
  sections: [
    {
      title: "Compte et accès",
      paragraphs: [
        "Vous êtes responsable de votre compte et des connexions de canaux que vous autorisez. Vous pouvez retirer une connexion ou supprimer votre compte depuis les réglages.",
      ],
    },
    {
      title: "Mue",
      paragraphs: [
        "Mue fournit une aide à la lecture, à la rédaction ou à la collecte de tâches uniquement lorsque vous la sollicitez. Ses suggestions doivent être vérifiées avant envoi ou création d'une action.",
      ],
    },
    {
      title: "Abonnement",
      paragraphs: [
        "La version iPhone compagnon ne permet pas l'achat d'un abonnement. Les offres, essais et paiements éventuellement proposés sont gérés sur le site web Freescale.",
      ],
    },
    {
      title: "Contact",
      paragraphs: [`Questions relatives au service : ${PUBLIC_CONTACT_EMAIL}.`],
    },
  ],
};

export const supportInformation: PublicPolicy = {
  eyebrow: "Support",
  title: "Comment pouvons-nous vous aider ?",
  introduction:
    "Pour un problème de connexion, de synchronisation, de tâches ou de confidentialité, contactez l'équipe Freescale.",
  sections: [
    {
      title: "Obtenir de l'aide",
      paragraphs: [
        `Écrivez à ${PUBLIC_CONTACT_EMAIL} en indiquant l'adresse de votre compte et le problème rencontré. Ne transmettez jamais de mot de passe ou de jeton d'accès.`,
      ],
    },
    {
      title: "Compte et données",
      paragraphs: [
        "La déconnexion d'un canal et la suppression du compte se pilotent depuis les réglages lorsque vous êtes connecté.",
      ],
    },
  ],
  action: { label: "Écrire au support", href: `mailto:${PUBLIC_CONTACT_EMAIL}` },
};

export const accountDeletionInformation: PublicPolicy = {
  eyebrow: "Compte",
  title: "Supprimer votre compte Freescale",
  introduction:
    "Vous gardez le contrôle : la suppression du compte peut être initiée directement dans Freescale.",
  sections: [
    {
      title: "Depuis le service",
      paragraphs: [
        "Connectez-vous, ouvrez Réglages > Profil, puis la zone dangereuse et choisissez Supprimer mon compte. Après confirmation, la suppression est immédiate et irréversible.",
      ],
    },
    {
      title: "Données supprimées",
      paragraphs: [
        "La suppression efface votre profil, vos workspaces, les comptes connectés et leurs jetons, les conversations, les messages, les contacts, les tâches et les événements associés.",
      ],
    },
    {
      title: "Si vous ne pouvez plus vous connecter",
      paragraphs: [
        `Contactez ${PUBLIC_CONTACT_EMAIL} depuis l'adresse liée à votre compte afin que nous puissions traiter votre demande en sécurité.`,
      ],
    },
  ],
  action: { label: "Ouvrir les réglages du profil", href: "/app/settings/profile" },
};
```

- [ ] **Step 2: Add the reusable public policy layout**

Create `apps/web/components/legal/PublicPolicyPage.tsx`:

```tsx
import { MueAvatar } from "@/components/MueAvatar";
import { PUBLIC_CONTACT_EMAIL, PUBLIC_POLICY_UPDATED_AT, type PublicPolicy } from "@/lib/public-compliance";
import Link from "next/link";

export function PublicPolicyPage({ policy }: { policy: PublicPolicy }) {
  return (
    <div className="policy-page">
      <header className="policy-nav">
        <Link href="/" className="policy-brand">
          <span className="policy-brand-mark"><MueAvatar /></span>
          <span>Freescale</span>
        </Link>
        <nav aria-label="Informations">
          <Link href="/privacy">Confidentialité</Link>
          <Link href="/support">Support</Link>
          <Link href="/welcome" className="policy-nav-action">Se connecter</Link>
        </nav>
      </header>
      <main className="policy-main">
        <p className="policy-eyebrow">{policy.eyebrow}</p>
        <h1>{policy.title}</h1>
        <p className="policy-updated">Mis à jour le {PUBLIC_POLICY_UPDATED_AT}</p>
        <p className="policy-intro">{policy.introduction}</p>
        {policy.action &&
          (policy.action.href.startsWith("mailto:") ? (
            <a href={policy.action.href} className="policy-action">
              {policy.action.label}
            </a>
          ) : (
            <Link href={policy.action.href as never} className="policy-action">
              {policy.action.label}
            </Link>
          ))}
        <div className="policy-sections">
          {policy.sections.map((section) => (
            <section key={section.title}>
              <h2>{section.title}</h2>
              {section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
              {section.items && (
                <ul>{section.items.map((item) => <li key={item}>{item}</li>)}</ul>
              )}
            </section>
          ))}
        </div>
      </main>
      <footer className="policy-footer">
        <span>Freescale</span>
        <a href={`mailto:${PUBLIC_CONTACT_EMAIL}`}>{PUBLIC_CONTACT_EMAIL}</a>
        <Link href="/terms">Conditions</Link>
        <Link href="/account-deletion">Suppression du compte</Link>
      </footer>
    </div>
  );
}
```

- [ ] **Step 3: Add the four public route entries**

Create `apps/web/app/privacy/page.tsx`:

```tsx
import { PublicPolicyPage } from "@/components/legal/PublicPolicyPage";
import { privacyPolicy } from "@/lib/public-compliance";

export const metadata = { title: "Confidentialité · Freescale" };

export default function PrivacyPage() {
  return <PublicPolicyPage policy={privacyPolicy} />;
}
```

Create `apps/web/app/terms/page.tsx`:

```tsx
import { PublicPolicyPage } from "@/components/legal/PublicPolicyPage";
import { termsOfService } from "@/lib/public-compliance";

export const metadata = { title: "Conditions d'utilisation · Freescale" };

export default function TermsPage() {
  return <PublicPolicyPage policy={termsOfService} />;
}
```

Create `apps/web/app/support/page.tsx`:

```tsx
import { PublicPolicyPage } from "@/components/legal/PublicPolicyPage";
import { supportInformation } from "@/lib/public-compliance";

export const metadata = { title: "Support · Freescale" };

export default function SupportPage() {
  return <PublicPolicyPage policy={supportInformation} />;
}
```

Create `apps/web/app/account-deletion/page.tsx`:

```tsx
import { PublicPolicyPage } from "@/components/legal/PublicPolicyPage";
import { accountDeletionInformation } from "@/lib/public-compliance";

export const metadata = { title: "Supprimer mon compte · Freescale" };

export default function AccountDeletionPage() {
  return <PublicPolicyPage policy={accountDeletionInformation} />;
}
```

- [ ] **Step 4: Run the test to observe the remaining navigation failure**

Run:

```bash
pnpm --filter @freescale/web test -- lib/public-compliance.test.ts
```

Expected: the route/content assertions PASS, while footer link assertions
still FAIL because landing and pricing are updated in Task 4.

- [ ] **Step 5: Commit typed public routes**

```bash
git add apps/web/lib/public-compliance.ts apps/web/components/legal/PublicPolicyPage.tsx apps/web/app/privacy/page.tsx apps/web/app/terms/page.tsx apps/web/app/support/page.tsx apps/web/app/account-deletion/page.tsx
git commit -m "feat: add public compliance pages"
```

### Task 4: Expose Public Compliance Links And Premium Responsive Styling

**Files:**
- Modify: `apps/web/app/page.tsx`
- Modify: `apps/web/app/pricing/page.tsx`
- Modify: `apps/web/app/globals.css`

- [ ] **Step 1: Add legal/support links to the landing footer**

Replace the contents of the existing `.land-foot-links` block in
`apps/web/app/page.tsx` with:

```tsx
<div className="land-foot-links">
  <a href="mailto:hello@freescale.app">hello@freescale.app</a>
  <Link href="/support">Support</Link>
  <Link href="/privacy">Confidentialité</Link>
  <Link href="/terms">Conditions</Link>
  <Link href="/account-deletion">Supprimer mon compte</Link>
  <Link href="/sign-in">Se connecter</Link>
  <span className="land-foot-meta">© 2026</span>
</div>
```

- [ ] **Step 2: Add a public footer to the pricing route**

Append after `</main>` inside `apps/web/app/pricing/page.tsx`:

```tsx
<footer className="land-foot">
  <div className="land-foot-inner">
    <span className="land-foot-logo">Freescale</span>
    <div className="land-foot-links">
      <a href="mailto:hello@freescale.app">hello@freescale.app</a>
      <Link href="/support">Support</Link>
      <Link href="/privacy">Confidentialité</Link>
      <Link href="/terms">Conditions</Link>
      <Link href="/account-deletion">Supprimer mon compte</Link>
    </div>
  </div>
</footer>
```

- [ ] **Step 3: Add responsive policy styles**

Append to `apps/web/app/globals.css`:

```css
/* Public policy and App Store support surfaces */
.policy-page {
  min-height: 100vh;
  background: #fff;
  color: #0f172a;
  font-family: var(--font-sans);
}
.policy-nav {
  height: 72px;
  max-width: 1120px;
  margin: 0 auto;
  padding: 0 24px;
  border-bottom: 1px solid #eef0f5;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
}
.policy-brand {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  color: #101828;
  text-decoration: none;
  font-size: 18px;
  font-weight: 600;
}
.policy-brand-mark {
  width: 30px;
  height: 30px;
  display: grid;
  place-items: center;
}
.policy-brand-mark svg {
  width: 100%;
  height: 100%;
}
.policy-nav nav {
  display: flex;
  align-items: center;
  gap: 22px;
}
.policy-nav nav a {
  color: #536176;
  font-size: 14px;
  font-weight: 500;
  text-decoration: none;
}
.policy-nav .policy-nav-action {
  min-height: 42px;
  padding: 0 18px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  background: #0f172a;
  color: #fff;
}
.policy-main {
  max-width: 760px;
  margin: 0 auto;
  padding: 72px 24px 88px;
}
.policy-eyebrow {
  margin: 0 0 14px;
  font-size: 13px;
  font-weight: 600;
  color: #5b6cff;
}
.policy-main h1 {
  margin: 0;
  font-size: 48px;
  line-height: 1.12;
  font-weight: 600;
  color: #0f172a;
}
.policy-updated {
  margin: 14px 0 32px;
  color: #8a94a6;
  font-size: 13px;
}
.policy-intro {
  margin: 0 0 28px;
  color: #465368;
  font-size: 18px;
  line-height: 1.6;
}
.policy-action {
  display: inline-flex;
  align-items: center;
  min-height: 44px;
  margin-bottom: 42px;
  padding: 0 20px;
  border-radius: 999px;
  background: #0f172a;
  color: #fff;
  text-decoration: none;
  font-size: 14px;
  font-weight: 600;
}
.policy-sections {
  display: flex;
  flex-direction: column;
  gap: 38px;
}
.policy-sections section {
  border-top: 1px solid #eef0f5;
  padding-top: 28px;
}
.policy-sections h2 {
  margin: 0 0 12px;
  color: #101828;
  font-size: 21px;
  font-weight: 600;
}
.policy-sections p,
.policy-sections li {
  color: #536176;
  font-size: 15px;
  line-height: 1.7;
}
.policy-sections p {
  margin: 0 0 10px;
}
.policy-sections ul {
  margin: 14px 0 0;
  padding-left: 20px;
}
.policy-footer {
  max-width: 1120px;
  margin: 0 auto;
  padding: 28px 24px 40px;
  border-top: 1px solid #eef0f5;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 18px 24px;
  color: #8a94a6;
  font-size: 13px;
}
.policy-footer a {
  color: #536176;
  text-decoration: none;
}
@media (max-width: 640px) {
  .policy-nav {
    height: 64px;
    padding: 0 16px;
  }
  .policy-nav nav a:not(.policy-nav-action) {
    display: none;
  }
  .policy-main {
    padding: 48px 16px 64px;
  }
  .policy-main h1 {
    font-size: 34px;
  }
  .policy-intro {
    font-size: 16px;
  }
  .policy-action {
    width: 100%;
    justify-content: center;
  }
  .policy-sections {
    gap: 30px;
  }
  .policy-footer {
    padding: 24px 16px 32px;
    flex-direction: column;
    align-items: flex-start;
  }
}
```

- [ ] **Step 4: Run the required test to verify the implementation is green**

Run:

```bash
pnpm --filter @freescale/web test -- lib/public-compliance.test.ts
```

Expected: PASS for all three public-compliance tests.

- [ ] **Step 5: Commit navigation and styling**

```bash
git add apps/web/app/page.tsx apps/web/app/pricing/page.tsx apps/web/app/globals.css
git commit -m "feat: expose App Store support and policy links"
```

### Task 5: Verify The J0 Repository Deliverables

**Files:**
- Review: `docs/app-store/J0_COMPLIANCE_CHECKLIST.md`
- Review: `apps/web/app/privacy/page.tsx`
- Review: `apps/web/app/terms/page.tsx`
- Review: `apps/web/app/support/page.tsx`
- Review: `apps/web/app/account-deletion/page.tsx`

- [ ] **Step 1: Run targeted and full web quality checks**

Run:

```bash
pnpm --filter @freescale/web test -- lib/public-compliance.test.ts components/auth/WelcomeScreen.test.ts
pnpm --filter @freescale/web lint
pnpm --filter @freescale/web typecheck
pnpm --filter @freescale/web build
```

Expected: each command exits with status `0`. If unrelated existing failures
appear, record the exact failure in the handoff rather than masking it.

- [ ] **Step 2: Verify public routes visually on desktop and mobile**

Start or reuse the local Next server, then inspect:

```text
http://localhost:3000/privacy
http://localhost:3000/terms
http://localhost:3000/support
http://localhost:3000/account-deletion
http://localhost:3000/welcome
```

Check at `390 x 844` and `1440 x 1024`:

- links from `/welcome`, landing and pricing reach non-404 public pages;
- headings, long policy copy and mail link fit without horizontal scrolling;
- the account-deletion action is clear and routes to authenticated settings;
- no iPhone purchasing or upgrade language is introduced by these public
  compliance pages.

- [ ] **Step 3: Record owner-dependent blockers without fabricating completion**

Update only the status cells in `docs/app-store/J0_COMPLIANCE_CHECKLIST.md`
for evidence actually supplied by the owner. Leave Apple membership,
credentials, Google verification and monitored-contact confirmation as
`Owner action required` until evidence is received.

- [ ] **Step 4: Commit any evidence-only checklist update**

```bash
git add docs/app-store/J0_COMPLIANCE_CHECKLIST.md
git commit -m "docs: record J0 compliance verification status"
```

Expected: skip this commit when no new owner evidence is available.

## J0 Exit Criteria

J0 repository work is complete only when:

- the four public routes render and are linked from both authentication and
  public web surfaces;
- automated tests, lint, typecheck and build have been run with recorded
  results;
- the compliance register exists and does not imply Apple/Google account
  tasks are complete without evidence.

J0 is publication-unblocked only when the owner additionally confirms:

- Apple Developer membership and App Store record;
- monitored support/legal contact and final data-controller identity;
- Google OAuth restricted-scope verification/security-assessment status.

## References

- Apple App Review Guidelines:
  <https://developer.apple.com/app-store/review/guidelines/>
- Apple account deletion requirement:
  <https://developer.apple.com/support/offering-account-deletion-in-your-app/>
- Google Gmail scope classification:
  <https://developers.google.com/workspace/gmail/api/auth/scopes>
- Supabase Sign in with Apple:
  <https://supabase.com/docs/guides/auth/auth-apple>
