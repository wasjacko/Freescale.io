import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("mobile task synchronization schema", () => {
  it("maintains an updated_at cursor for every task mutation", async () => {
    const migration = await readFile(
      new URL("../../../supabase/migrations/20260526211500_tasks_updated_at.sql", import.meta.url),
      "utf8"
    ).catch(() => "");

    expect(migration).toContain("add column if not exists updated_at timestamptz");
    expect(migration).toContain("tasks_touch_updated_at");
    expect(migration).toContain("public.touch_updated_at()");
  });
});
