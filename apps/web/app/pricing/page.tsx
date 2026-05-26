import { MueAvatar } from "@/components/MueAvatar";
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

        <section className="pricing-grid" aria-label="Plans Freescale">
          <article className="pricing-card">
            <span className="billing-kicker">Solo</span>
            <h2>0€</h2>
            <p>Essai 14 jours pour valider l'inbox et les premières actions Mue.</p>
            <ul>
              <li>Inbox Gmail + canaux prêts à connecter</li>
              <li>50 actions Mue / mois</li>
              <li>Tâches et mémoire Mue</li>
            </ul>
            <Link href={START_HREF} className="land-btn land-btn-pill">
              Commencer
            </Link>
          </article>

          <article className="pricing-card is-featured">
            <span className="billing-kicker">Pro</span>
            <h2>À configurer</h2>
            <p>Le plan principal: Mue sans plafond et billing Stripe complet.</p>
            <ul>
              <li>Actions Mue illimitées</li>
              <li>Checkout + portail factures Stripe</li>
              <li>Paywall propre après l'essai</li>
            </ul>
            <Link href={START_HREF} className="land-btn land-btn-pill-dark">
              Passer à Pro
            </Link>
          </article>

          <article className="pricing-card">
            <span className="billing-kicker">Team</span>
            <h2>Sur mesure</h2>
            <p>Pour studios et équipes qui veulent centraliser les conversations client.</p>
            <ul>
              <li>Usage Mue illimité</li>
              <li>Workspace partagé</li>
              <li>Facturation centralisée</li>
            </ul>
            <a href="mailto:hello@freescale.app" className="land-btn land-btn-pill">
              Nous contacter
            </a>
          </article>
        </section>
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
