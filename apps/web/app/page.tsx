import { AppShell } from "@/components/AppShell";
import { DataProvider } from "@/lib/contexts/DataContext";
import { getCurrentUser } from "@/lib/auth";
import { getInboxData } from "@/lib/data/queries";

export default async function HomePage() {
  const [user, data] = await Promise.all([getCurrentUser(), getInboxData()]);
  return (
    <DataProvider initial={data}>
      <AppShell user={user} initialActiveConvId={data.conversations[0]?.id ?? ""} />
    </DataProvider>
  );
}
