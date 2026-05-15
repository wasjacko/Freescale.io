import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, avatar_url, email")
    .eq("id", user.id)
    .maybeSingle();

  // Note: we intentionally do NOT short-circuit when onboarded_at is set.
  // During dev we want to walk through this flow even on an existing account.
  const fullName = (profile?.full_name as string) ?? "";
  const [firstName = "", ...rest] = fullName.split(/\s+/);
  const lastName = rest.join(" ");

  return (
    <OnboardingWizard
      initial={{
        firstName,
        lastName,
        avatarUrl: (profile?.avatar_url as string | null) ?? null,
        email: (profile?.email as string) ?? user.email ?? "",
      }}
    />
  );
}
