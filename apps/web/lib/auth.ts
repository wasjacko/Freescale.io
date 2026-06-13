import { isDevNoAuth, mockCurrentUser } from "@/lib/dev-mock";
import { createClient } from "@/lib/supabase/server";

export type CurrentUser = {
  id: string;
  email: string;
  name: string;
  firstName: string;
  avatarUrl: string | null;
  role: string;
  /** Soft profiling status — null when the user hasn't been through the
   *  inline chips yet. /app uses this to decide whether to show them. */
  onboardedAt: string | null;
  profileRole: string | null;
  profileObjective: string | null;
  profileUsageMode: string | null;
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
  // DEV bypass : pas de session réelle → user mock (local uniquement).
  if (!user) return isDevNoAuth() ? mockCurrentUser() : null;

  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const fullName =
    (meta.full_name as string | undefined) ||
    (meta.name as string | undefined) ||
    (user.email?.split("@")[0] ?? "User");
  const firstName = fullName.split(/\s+/)[0] ?? fullName;
  const avatarUrl =
    (meta.avatar_url as string | undefined) || (meta.picture as string | undefined) || null;

  // Pull the soft-profiling state in the same round-trip — the inline
  // OnboardingChips component needs it to decide whether to show.
  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarded_at, role, objective, usage_mode")
    .eq("id", user.id)
    .maybeSingle();

  return {
    id: user.id,
    email: user.email ?? "",
    name: fullName,
    firstName,
    avatarUrl,
    role: (meta.role as string | undefined) ?? "Freelance",
    onboardedAt: (profile?.onboarded_at as string | null) ?? null,
    profileRole: (profile?.role as string | null) ?? null,
    profileObjective: (profile?.objective as string | null) ?? null,
    profileUsageMode: (profile?.usage_mode as string | null) ?? null,
  };
}
