import { MueAvatar } from "@/components/MueAvatar";
import {
  PUBLIC_CONTACT_EMAIL,
  PUBLIC_POLICY_UPDATED_AT,
  type PublicPolicy,
} from "@/lib/public-compliance";
import Link from "next/link";

export function PublicPolicyPage({ policy }: { policy: PublicPolicy }) {
  return (
    <div className="policy-page">
      <header className="policy-nav">
        <Link href="/" className="policy-brand">
          <span className="policy-brand-mark">
            <MueAvatar />
          </span>
          <span>Freescale</span>
        </Link>
        <nav aria-label="Informations">
          <Link href="/privacy">Confidentialité</Link>
          <Link href="/support">Support</Link>
          <Link href="/app" className="policy-nav-action">
            Ouvrir l'app
          </Link>
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
              {section.paragraphs.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
              {section.items && (
                <ul>
                  {section.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>
      </main>
      <footer className="policy-footer">
        <span>Freescale</span>
        <a href={`mailto:${PUBLIC_CONTACT_EMAIL}`}>{PUBLIC_CONTACT_EMAIL}</a>
        <Link href="/support">Support</Link>
        <Link href="/privacy">Confidentialité</Link>
        <Link href="/terms">Conditions</Link>
        <Link href="/account-deletion">Suppression du compte</Link>
      </footer>
    </div>
  );
}
