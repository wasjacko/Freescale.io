import { TemplatesManager } from "@/components/settings/TemplatesManager";
import { listEmailTemplates } from "@/lib/actions/email-templates";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

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
