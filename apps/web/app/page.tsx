import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";

/**
 * Landing page — temporairement retirée.
 * Placeholder minimal en attendant la nouvelle version.
 *
 * On conserve la logique de routing : un utilisateur déjà connecté
 * est envoyé directement vers /app (sauf flash signout / deleted).
 */
export default async function LandingPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const params = await searchParams;
  const hasFlashIntent = params.signedout !== undefined || params.deleted !== undefined;

  // The hosted Sites build is an interactive product demo: open Freescale
  // directly instead of showing the temporary marketing placeholder.
  if (process.env.DEMO_MODE === "1" && !hasFlashIntent) {
    redirect("/app");
  }

  if (!hasFlashIntent) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) redirect("/app");
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 20,
        background: "#fafafa",
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Inter", system-ui, sans-serif',
        color: "#0f172a",
        padding: 24,
      }}
    >
      <span
        style={{
          display: "grid",
          placeItems: "center",
          width: 56,
          height: 56,
          background: "#000",
          borderRadius: 14,
        }}
      >
        <svg width="34" height="34" viewBox="0 0 100 100" aria-hidden>
          <rect x="25.5" y="21.5" width="11.5" height="57" fill="#fff" />
          <rect x="25.5" y="21.5" width="49" height="11.5" fill="#fff" />
          <rect x="25.5" y="46" width="41" height="11.5" fill="#fff" />
        </svg>
      </span>

      <div style={{ textAlign: "center" }}>
        <h1 style={{ fontSize: 24, fontWeight: 600, letterSpacing: "-0.02em", margin: 0 }}>
          Freescale
        </h1>
        <p style={{ fontSize: 14, color: "#6b7280", marginTop: 6 }}>
          Landing en construction · nouvelle version bientôt
        </p>
      </div>

      <Link
        href={"/app" as never}
        style={{
          display: "inline-flex",
          alignItems: "center",
          height: 42,
          padding: "0 22px",
          background: "#000",
          color: "#fff",
          borderRadius: 10,
          fontSize: 14,
          fontWeight: 500,
          textDecoration: "none",
        }}
      >
        Accéder à l'app →
      </Link>

      <footer style={{ display: "flex", gap: 16, marginTop: 40, fontSize: 12 }}>
        <Link href="/support" style={{ color: "#6b7280", textDecoration: "none" }}>
          Support
        </Link>
        <Link href="/privacy" style={{ color: "#6b7280", textDecoration: "none" }}>
          Confidentialité
        </Link>
        <Link href="/terms" style={{ color: "#6b7280", textDecoration: "none" }}>
          Conditions
        </Link>
        <Link href="/account-deletion" style={{ color: "#6b7280", textDecoration: "none" }}>
          Supprimer mon compte
        </Link>
      </footer>
    </main>
  );
}
