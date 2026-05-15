import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { DataProvider } from "@/lib/contexts/DataContext";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { getInboxData } from "@/lib/data/queries";
import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, avatar_url, onboarded_at, email")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.onboarded_at) redirect("/app");

  const fullName = (profile?.full_name as string) ?? "";
  const [firstName = "", ...rest] = fullName.split(/\s+/);
  const lastName = rest.join(" ");

  const [authUser, data] = await Promise.all([getCurrentUser(), getInboxData()]);

  return (
    <>
      <DataProvider initial={data}>
        <AppShell user={authUser} initialActiveConvId={data.conversations[0]?.id ?? ""} />
      </DataProvider>
      <OnboardingWizard
        initial={{
          firstName,
          lastName,
          avatarUrl: (profile?.avatar_url as string | null) ?? null,
          email: (profile?.email as string) ?? user.email ?? "",
        }}
      />
    </>
  );
}
