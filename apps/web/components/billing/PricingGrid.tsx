"use client";

import Link from "next/link";
import { useState } from "react";

export function PricingGrid() {
  const [billingInterval, setBillingInterval] = useState<"monthly" | "yearly">("monthly");

  const startHref = (plan: string) => {
    return `/welcome?next=%2Fapp%2Fsettings%2Fbilling&plan=${plan}&interval=${billingInterval}` as never;
  };

  return (
    <>
      <div className="pricing-toggle-container">
        <span
          className={`pricing-toggle-label ${billingInterval === "monthly" ? "is-active" : ""}`}
          onClick={() => setBillingInterval("monthly")}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setBillingInterval("monthly");
            }
          }}
          role="button"
          tabIndex={0}
        >
          Mensuel
        </span>
        <button
          type="button"
          className={`pricing-toggle-switch ${billingInterval === "yearly" ? "is-yearly" : ""}`}
          onClick={() => setBillingInterval(billingInterval === "monthly" ? "yearly" : "monthly")}
          aria-label="Toggle billing interval"
        >
          <span className="pricing-toggle-handle" />
        </button>
        <span
          className={`pricing-toggle-label ${billingInterval === "yearly" ? "is-active" : ""}`}
          onClick={() => setBillingInterval("yearly")}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setBillingInterval("yearly");
            }
          }}
          role="button"
          tabIndex={0}
        >
          Annuel
          <span className="pricing-save-badge">-50%</span>
        </span>
      </div>

      <div className="pricing-grid" aria-label="Plans Freescale">
        <article className="pricing-card">
          <span className="billing-kicker">Solo</span>
          <h2>
            {billingInterval === "monthly" ? "19€" : "9,50€"}
            <span style={{ fontSize: 14, fontWeight: 400, color: "#5b6475" }}> / mois</span>
          </h2>
          {billingInterval === "yearly" && (
            <p style={{ margin: "-12px 0 0", fontSize: 12, color: "#16a34a", fontWeight: 500 }}>
              Facturé 114€ / an
            </p>
          )}
          <p>Pour connecter l'inbox, tester Mue et piloter son activité en solo.</p>
          <ul>
            <li>Inbox Gmail + canaux prêts à connecter</li>
            <li>50 actions Mue / mois</li>
            <li>Tâches et mémoire Mue</li>
          </ul>
          <Link href={startHref("solo")} className="land-btn land-btn-pill">
            Commencer l'essai
          </Link>
        </article>

        <article className="pricing-card is-featured">
          <span className="billing-kicker">Pro</span>
          <h2>
            {billingInterval === "monthly" ? "39€" : "19,50€"}
            <span style={{ fontSize: 14, fontWeight: 400, color: "rgba(255, 255, 255, 0.7)" }}>
              {" "}
              / mois
            </span>
          </h2>
          {billingInterval === "yearly" && (
            <p style={{ margin: "-12px 0 0", fontSize: 12, color: "#4ade80", fontWeight: 500 }}>
              Facturé 234€ / an
            </p>
          )}
          <p>Le plan principal : Mue sans plafond et priorisation intelligente.</p>
          <ul>
            <li>Actions Mue illimitées</li>
            <li>Rappels intelligents et priorités</li>
            <li>Traduction instantanée des messages</li>
          </ul>
          <Link href={startHref("pro")} className="land-btn land-btn-pill-dark">
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
      </div>
    </>
  );
}
