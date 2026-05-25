const REQUIRED_SUPABASE_ENV = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
] as const;

type RequiredSupabaseEnv = (typeof REQUIRED_SUPABASE_ENV)[number];

export function requireSupabaseEnvValue(
  name: RequiredSupabaseEnv,
  value: string | undefined
): string {
  if (!value || value.includes("placeholder")) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function getRequiredSupabaseEnv(name: RequiredSupabaseEnv): string {
  return requireSupabaseEnvValue(name, process.env[name]);
}
