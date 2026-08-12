import { AppShell } from "@/components/AppShell";
import { getCurrentUser } from "@/lib/auth";
import { DataProvider } from "@/lib/contexts/DataContext";
import { getInboxData } from "@/lib/data/queries";

/**
 * /app — the product. Freescale now opens directly on the SaaS surface:
 * authenticated users get live workspace data, while anonymous/local sessions
 * get an app-ready empty state instead of an auth wall.
 */
export default async function HomePage() {
  const [authUser, data] = await Promise.all([getCurrentUser(), getInboxData()]);
  return (
    <DataProvider initial={data}>
      {/* AppShell defaults to showing the inbox list — no need to preselect a
          conversation. The user opens a thread by clicking it. */}
      <AppShell user={authUser} />
    </DataProvider>
  );
}
