import { acceptWorkspaceInvite } from "@/lib/actions/collaboration";
import Link from "next/link";
import { redirect } from "next/navigation";

export const metadata = { title: "Invitation · Freescale" };

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const result = await acceptWorkspaceInvite(token);
  if (result.ok) redirect("/app/settings/team?joined=1");

  return (
    <main className="invite-page">
      <section className="invite-card">
        <span className="invite-mark">F</span>
        <h1>Invitation indisponible</h1>
        <p>{result.error ?? "Le lien d'invitation n'est plus valide."}</p>
        <Link href="/app/settings/team">Retour à Freescale</Link>
      </section>
    </main>
  );
}
