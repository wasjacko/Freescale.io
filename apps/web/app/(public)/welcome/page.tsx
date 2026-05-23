import { WelcomeScreen } from "@/components/auth/WelcomeScreen";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Suspense } from "react";

export const metadata = { title: "Bienvenue · Freescale" };

/**
 * /welcome — unified auth entry. Replaces the old /sign-up wizard and
 * the separate /sign-in form. New and returning users land here; the
 * post-auth callback handles the routing decision (resume / dashboard /
 * inbox connect modal).
 */
export default async function WelcomePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const params = await searchParams;
  const hasIntentParam =
    params.switch !== undefined || params.signedout !== undefined || params.deleted !== undefined;

  // Already signed in and not explicitly trying to switch / re-auth?
  // Send them straight to the app — no point re-running the welcome.
  if (!hasIntentParam) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) redirect("/app");
  }

  return (
    <Suspense>
      <WelcomeScreen />
    </Suspense>
  );
}
