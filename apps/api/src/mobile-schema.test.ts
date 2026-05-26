import { describe, expect, it } from "vitest";
import migration from "../../../supabase/migrations/20260526211500_tasks_updated_at.sql?raw";

describe("mobile task synchronization schema", () => {
  it("maintains an updated_at cursor for every task mutation", () => {
    expect(migration).toContain("add column if not exists updated_at timestamptz");
    expect(migration).toContain("tasks_touch_updated_at");
    expect(migration).toContain("public.touch_updated_at()");
  });
});
