"use client";

import { CheckoutButton } from "@/components/billing/BillingButtons";
import { type BillingOverview, getBillingOverview } from "@/lib/actions/billing";
import Link from "next/link";
import { useEffect, useState } from "react";

export function TrialBanner() {
  const [overview, setOverview] = useState<BillingOverview | null>(null);

  useEffect(() => {
    let alive = true;
    getBillingOverview().then((result) => {
      if (alive) setOverview(result.overview);
    });
    return () => {
      alive = false;
    };
  }, []);

  if (!overview || overview.plan !== "free" || overview.trial.status === "none") return null;

  const expired = overview.trial.status === "expired";
  const days = overview.trial.daysRemaining ?? 0;
  const urgent = !expired && days <= 3;

  return (
    <div className={`trial-banner ${expired ? "is-expired" : urgent ? "is-urgent" : ""}`}>
      <div>
        <strong>
          {expired ? "Votre essai Freescale est terminé." : `${days} j d'essai restants.`}
        </strong>
        <span>
          {expired
            ? "Passez à Pro pour continuer les actions Mue sans interruption."
            : urgent
              ? "Dernière ligne droite: gardez Mue actif avec un plan Pro."
              : "Le plan Solo inclut 50 actions Mue par mois pendant l'essai."}
        </span>
      </div>
      <div className="trial-banner-actions">
        <CheckoutButton interval="monthly" plan="pro" variant="primary">
          Passer à Pro
        </CheckoutButton>
        <Link href={"/app/settings/billing" as never} className="set-btn">
          Détails
        </Link>
      </div>
    </div>
  );
}
