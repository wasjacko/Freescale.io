import { AppShell } from "@/components/AppShell";
import { getCurrentUser } from "@/lib/auth";

export default async function HomePage() {
  const user = await getCurrentUser();
  return <AppShell user={user} />;
}
