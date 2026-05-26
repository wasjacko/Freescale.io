import type { MobileAuthBindings } from "./auth";

export type UserSupabaseClient = {
  request(path: string, init?: RequestInit): Promise<Response>;
};

export function createUserSupabaseClient(
  env: MobileAuthBindings,
  accessToken: string
): UserSupabaseClient {
  return {
    request(path, init = {}) {
      const headers = {
        apikey: env.SUPABASE_ANON_KEY,
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        ...(init.headers as Record<string, string> | undefined),
      };

      return fetch(new URL(path, env.SUPABASE_URL).toString(), {
        ...init,
        headers,
      });
    },
  };
}
