import { DangerZone } from "@/components/settings/DangerZone";
import { ProfileForm } from "@/components/settings/ProfileForm";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const metadata = { title: "Profil · Freescale" };

export default async function ProfileSettingsPage() {
  // getCurrentUser() est mock-aware (DEV_NO_AUTH) : en local sans session
  // réelle on récupère l'utilisateur mock, ce qui rend les Paramètres
  // accessibles pour la simulation. La requête profil ci-dessous renvoie
  // simplement des valeurs par défaut sous l'utilisateur mock.
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "full_name, avatar_url, timezone, locale, email, signature, mue_persona, mue_style_profile, mue_style_updated_at, daily_digest_enabled"
    )
    .eq("id", user.id)
    .maybeSingle();

  const profileEmail = (profile?.email as string) ?? user.email ?? "";

  return (
    <>
      <ProfileForm
        initial={{
          fullName: (profile?.full_name as string) ?? "",
          avatarUrl: (profile?.avatar_url as string | null) ?? null,
          timezone: (profile?.timezone as string) ?? "Europe/Paris",
          locale: (profile?.locale as string) ?? "fr",
          email: profileEmail,
          signature: (profile?.signature as string | null) ?? "",
          muePersona: (profile?.mue_persona as string | null) ?? "",
          mueStyleProfile: (profile?.mue_style_profile as string | null) ?? "",
          mueStyleUpdatedAt: (profile?.mue_style_updated_at as string | null) ?? null,
          dailyDigestEnabled: !!profile?.daily_digest_enabled,
        }}
      />
      <DangerZone email={profileEmail} />
    </>
  );
}
