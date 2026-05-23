import { BillingSettings } from "@/components/settings/BillingSettings";
import { getBillingOverview } from "@/lib/actions/billing";
import Link from "next/link";

export const metadata = { title: "Abonnement · Freescale" };

export default async function BillingPage() {
  const { overview, error } = await getBillingOverview();

  if (!overview) {
    return (
      <div className="settings-section">
        <header className="settings-head">
          <h1>Abonnement</h1>
          <p>Impossible de charger l'état billing pour le moment.</p>
        </header>
        <div className="settings-card billing-empty">
          <p>{error ?? "Erreur inconnue."}</p>
          <Link href={"/app" as never} className="set-btn set-btn-primary">
            Retour à l'app
          </Link>
        </div>
      </div>
    );
  }

  return <BillingSettings overview={overview} />;
}
