"use client";

import { CheckoutButton, PortalButton } from "@/components/billing/BillingButtons";
import type { BillingOverview } from "@/lib/actions/billing";
import { useEffect, useState } from "react";

function formatDate(value: string | null): string {
  if (!value) return "Non défini";
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(new Date(value));
}

function usageLabel(overview: BillingOverview): string {
  const limit = overview.mueUsage.limit;
  if (limit === null) return "Illimité";
  return `${overview.mueUsage.count} / ${limit}`;
}

export function BillingSettings({ overview }: { overview: BillingOverview }) {
  const [annualModalOpen, setAnnualModalOpen] = useState(false);

  useEffect(() => {
    if (overview.plan !== "free") return;
    const dismissed = window.localStorage.getItem("fs-annual-upsell-dismissed");
    if (!dismissed) setAnnualModalOpen(true);
  }, [overview.plan]);

  const closeAnnualModal = () => {
    window.localStorage.setItem("fs-annual-upsell-dismissed", "1");
    setAnnualModalOpen(false);
  };

  return (
    <div className="settings-section">
      <header className="settings-head">
        <h1>Abonnement</h1>
        <p>Plan, essai, factures Stripe et limites Mue. Le cockpit reste volontairement simple.</p>
      </header>

      <section className="settings-card billing-summary-card">
        <div className="billing-summary-top">
          <div>
            <span className="billing-kicker">Plan actuel</span>
            <h2>{overview.planLabel}</h2>
            <p>
              Statut: <strong>{overview.billingStatus}</strong>
            </p>
          </div>
          <span className={`billing-plan-pill is-${overview.plan}`}>{overview.planLabel}</span>
        </div>

        <div className="billing-metrics">
          <div>
            <span>Essai</span>
            <strong>
              {overview.trial.status === "paid"
                ? "Plan payant"
                : overview.trial.status === "active"
                  ? `${overview.trial.daysRemaining} jours`
                  : overview.trial.status === "expired"
                    ? "Terminé"
                    : "Non défini"}
            </strong>
          </div>
          <div>
            <span>Actions Mue</span>
            <strong>{usageLabel(overview)}</strong>
          </div>
          <div>
            <span>Renouvellement</span>
            <strong>{formatDate(overview.billingPeriodEnd)}</strong>
          </div>
        </div>

        {overview.mueUsage.limit !== null && (
          <div className="billing-usage-bar" aria-label="Utilisation Mue">
            <span
              style={{
                width: `${Math.min(100, (overview.mueUsage.count / overview.mueUsage.limit) * 100)}%`,
              }}
            />
          </div>
        )}

        <div className="billing-summary-actions">
          <CheckoutButton interval="monthly" plan="pro" variant="primary">
            Upgrade Pro mensuel
          </CheckoutButton>
          <CheckoutButton interval="yearly" plan="pro" variant="secondary">
            Pro annuel -2 mois
          </CheckoutButton>
          {overview.stripeCustomerId && <PortalButton />}
        </div>
      </section>

      <section className="billing-plan-grid">
        <article className="settings-card billing-plan-card">
          <span className="billing-kicker">Solo</span>
          <h3>Essai 14 jours</h3>
          <p>Pour connecter l'inbox, tester Mue et valider le workflow sans carte bancaire.</p>
          <ul>
            <li>Inbox unifiée</li>
            <li>50 actions Mue / mois</li>
            <li>Historique et tâches</li>
          </ul>
        </article>
        <article className="settings-card billing-plan-card is-featured">
          <span className="billing-kicker">Pro</span>
          <h3>Mue sans plafond</h3>
          <p>Pour garder la boîte client actionnable au quotidien, avec facturation Stripe.</p>
          <ul>
            <li>Actions Mue illimitées</li>
            <li>Portail factures Stripe</li>
            <li>Rappels et priorités</li>
          </ul>
          <CheckoutButton interval="monthly" plan="pro" variant="primary">
            Choisir Pro
          </CheckoutButton>
        </article>
        <article className="settings-card billing-plan-card">
          <span className="billing-kicker">Team</span>
          <h3>Pour studios</h3>
          <p>Préparé pour les équipes qui veulent partager l'inbox et les workflows client.</p>
          <ul>
            <li>Usage Mue illimité</li>
            <li>Billing centralisé</li>
            <li>Workspace multi-membres</li>
          </ul>
          <CheckoutButton interval="monthly" plan="team" variant="secondary">
            Choisir Team
          </CheckoutButton>
        </article>
      </section>

      {annualModalOpen && (
        <div className="billing-modal-backdrop" role="presentation">
          <div
            className="billing-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="annual-title"
          >
            <span className="billing-kicker">Offre annuelle</span>
            <h2 id="annual-title">Deux mois économisés avec Pro annuel.</h2>
            <p>
              Si Freescale devient ton poste de pilotage client, l'annuel réduit le coût et garde
              Mue disponible toute l'année.
            </p>
            <div className="billing-modal-actions">
              <CheckoutButton interval="yearly" plan="pro" variant="primary">
                Voir Pro annuel
              </CheckoutButton>
              <button type="button" className="set-btn" onClick={closeAnnualModal}>
                Plus tard
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
