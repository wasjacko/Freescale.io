import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { DataProvider } from "@/lib/contexts/DataContext";
import { getCurrentUser } from "@/lib/auth";
import { getInboxData } from "@/lib/data/queries";
import { createClient } from "@/lib/supabase/server";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("onboarded_at")
      .eq("id", user.id)
      .maybeSingle();
    if (!profile?.onboarded_at) redirect("/sign-up");
  }

  const [authUser, data] = await Promise.all([getCurrentUser(), getInboxData()]);
  return (
    <DataProvider initial={data}>
      <AppShell user={authUser} initialActiveConvId={data.conversations[0]?.id ?? ""} />
    </DataProvider>
  );
}
