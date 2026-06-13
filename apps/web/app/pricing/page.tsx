import { MueAvatar } from "@/components/MueAvatar";
import { PricingGrid } from "@/components/billing/PricingGrid";
import { Sprite } from "@/components/icons/Sprite";
import Link from "next/link";

export const metadata = {
  title: "Pricing · Freescale",
  description: "Plans Freescale Solo, Pro et Team pour l'inbox client avec Mue.",
};

const START_HREF = "/welcome?next=%2Fapp%2Fsettings%2Fbilling" as never;

export default function PricingPage() {
  return (
    <div className="land pricing-page">
      <Sprite />
      <div className="land-nav-wrap">
        <header className="land-nav">
          <Link href="/" className="land-logo">
            <span className="land-logo-mark">
              <MueAvatar />
            </span>
            <span className="land-logo-word">Freescale</span>
          </Link>
          <nav className="land-links" aria-label="Pricing navigation">
            <Link href="/">Produit</Link>
            <Link href="/pricing">Pricing</Link>
            <Link href="/welcome">Login</Link>
          </nav>
          <div className="land-cta">
            <Link href={START_HREF} className="land-btn land-btn-pill-dark">
              Démarrer l'essai
            </Link>
          </div>
        </header>
      </div>

      <main className="pricing-main">
        <section className="pricing-hero">
          <span className="land-eyebrow">
            <span className="land-eyebrow-dot" />
            14 jours d'essai · sans carte
          </span>
          <h1>Un prix simple pour garder les clients au clair.</h1>
          <p>
            Solo pour tester, Pro pour travailler tous les jours avec Mue, Team pour les studios qui
            partagent l'inbox.
          </p>
        </section>

        <PricingGrid />
      </main>
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
    </div>
  );
}
