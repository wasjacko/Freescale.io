import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ConnectionsList } from "@/components/settings/ConnectionsList";

export const metadata = { title: "Connexions · Freescale" };

type SearchParams = Record<string, string | string[] | undefined>;

export default async function ConnectionsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const { data: workspace } = await supabase
    .from("workspaces")
    .select("id, name")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  // Only surface accounts that actually carry credentials. Anything else is a
  // placeholder row (seed data, pending OAuth that never completed, etc.) and
  // would mislead the user into clicking Sync on a non-linked account.
  const { data: accounts } = workspace?.id
    ? await supabase
        .from("channel_accounts")
        .select("id, kind, external_id, display_name, status, last_synced_at, connected_at")
        .eq("workspace_id", workspace.id)
        .not("encrypted_tokens", "is", null)
        .order("connected_at", { ascending: false })
    : { data: [] };

  const sp = await searchParams;
  const flash =
    typeof sp.connected === "string"
      ? { kind: "ok" as const, text: `Connecté à ${sp.connected}.` }
      : typeof sp.error === "string"
      ? { kind: "err" as const, text: decodeURIComponent(sp.error) }
      : null;

  return (
    <ConnectionsList
      accounts={(accounts ?? []) as never}
      flash={flash}
    />
  );
}
