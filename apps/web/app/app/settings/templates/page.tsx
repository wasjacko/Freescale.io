import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { listEmailTemplates } from "@/lib/actions/email-templates";
import { TemplatesManager } from "@/components/settings/TemplatesManager";

export const metadata = { title: "Modèles · Freescale" };

export default async function TemplatesSettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const templates = await listEmailTemplates();
  return <TemplatesManager initial={templates} />;
}
