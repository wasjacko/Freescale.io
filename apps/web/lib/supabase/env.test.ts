import { describe, expect, it } from "vitest";
import { requireSupabaseEnvValue } from "./env";

describe("Supabase public environment validation", () => {
  it("accepts a provided public Supabase value", () => {
    expect(requireSupabaseEnvValue("NEXT_PUBLIC_SUPABASE_URL", "https://project.supabase.co")).toBe(
      "https://project.supabase.co"
    );
  });

  it("rejects an absent public Supabase value", () => {
    expect(() => requireSupabaseEnvValue("NEXT_PUBLIC_SUPABASE_URL", undefined)).toThrow(
      "Missing required environment variable: NEXT_PUBLIC_SUPABASE_URL"
    );
  });

  it("rejects placeholder public Supabase values", () => {
    expect(() =>
      requireSupabaseEnvValue("NEXT_PUBLIC_SUPABASE_ANON_KEY", "placeholder-key")
    ).toThrow("Missing required environment variable: NEXT_PUBLIC_SUPABASE_ANON_KEY");
  });
});
