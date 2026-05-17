import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProfileForm } from "@/components/settings/ProfileForm";
import { DangerZone } from "@/components/settings/DangerZone";

export const metadata = { title: "Profil · Freescale" };

export default async function ProfileSettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, avatar_url, timezone, locale, email")
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
        }}
      />
      <DangerZone email={profileEmail} />
    </>
  );
}
