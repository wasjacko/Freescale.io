import { redirect } from "next/navigation";

export const metadata = { title: "Créer un compte · Freescale" };

/**
 * Legacy signup route — the old wizard with 5 profiling questions has
 * been retired (audit recommended auth-first). Bounce to /welcome.
 * Profiling now happens inline in /app AFTER first value, as a soft
 * progressive-profile rather than a blocking wizard.
 */
export default function SignUpPage() {
  redirect("/welcome");
}
