import { createClient } from "@/lib/supabase/server";

export type CurrentUser = {
  id: string;
  email: string;
  name: string;
  firstName: string;
  avatarUrl: string | null;
  role: string;
};

/**
 * Server-only helper: returns the current authenticated user, formatted
 * for UI consumption. Returns null if no session (middleware should have
 * redirected, but caller can fall back gracefully).
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const fullName =
    (meta.full_name as string | undefined) ||
    (meta.name as string | undefined) ||
    (user.email?.split("@")[0] ?? "User");
  const firstName = fullName.split(/\s+/)[0] ?? fullName;
  const avatarUrl =
    (meta.avatar_url as string | undefined) ||
    (meta.picture as string | undefined) ||
    null;

  return {
    id: user.id,
    email: user.email ?? "",
    name: fullName,
    firstName,
    avatarUrl,
    role: (meta.role as string | undefined) ?? "Freelance Designer",
  };
}
