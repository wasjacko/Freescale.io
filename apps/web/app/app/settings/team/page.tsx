import { TeamSettings } from "@/components/settings/TeamSettings";
import { getTeamSettingsData } from "@/lib/actions/collaboration";

export const metadata = { title: "Équipe · Freescale" };

export default async function TeamPage() {
  const data = await getTeamSettingsData();
  return <TeamSettings initial={data} />;
}
