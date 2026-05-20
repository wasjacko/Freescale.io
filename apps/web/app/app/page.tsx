import { AppShell } from "@/components/AppShell";
import { DataProvider } from "@/lib/contexts/DataContext";
import { getCurrentUser } from "@/lib/auth";
import { getInboxData } from "@/lib/data/queries";

/**
 * /app — the dashboard. After the auth-first onboarding refactor this
 * page no longer blocks on an "onboarded_at" flag. New users land here
 * directly after auth; if they have no inbox connected yet, the inbox
 * panel renders the NoChannelsHero CTA inline (single decision per
 * screen, audit-aligned).
 *
 * The middleware already gates the route behind a valid session, so
 * we don't need an extra redirect here.
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
