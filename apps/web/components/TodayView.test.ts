import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

async function source(path: string) {
  return readFile(new URL(path, import.meta.url), "utf8").catch(() => "");
}

describe("Today operational home", () => {
  it("renders a Mue brief with concrete next actions", async () => {
    const content = await source("./TodayView.tsx");

    expect(content).toContain("dailyBriefing");
    expect(content).toContain("À traiter maintenant");
    expect(content).toContain("createTaskFromBrief");
    expect(content).toContain('view === "today"');
    expect(content).toContain('setView("inbox")');
  });

  it("is wired as the application's default mobile destination", async () => {
    const [types, store, shell, sidebar, bottomNav] = await Promise.all([
      source("../lib/types.ts"),
      source("../lib/store.ts"),
      source("./AppShell.tsx"),
      source("./Sidebar.tsx"),
      source("./mobile/MobileBottomNav.tsx"),
    ]);

    expect(types).toContain('"today"');
    expect(types).toContain('"more"');
    expect(store).toContain('view: "today"');
    expect(shell).toContain("<TodayView");
    expect(shell).toContain("<MobileBottomNav");
    expect(sidebar).toContain('label: "Aujourd\'hui"');
    expect(bottomNav).toContain('label: "Plus"');
    expect(bottomNav).toContain('setView("more")');
  });

  it("does not interrupt returning users with old acquisition prompts", async () => {
    const [muePanel, trialBanner] = await Promise.all([
      source("./MuePanel.tsx"),
      source("./billing/TrialBanner.tsx"),
    ]);

    expect(muePanel).not.toContain("FirstActionBanner");
    expect(trialBanner).toContain("if (!expired && !urgent) return null;");
  });
});
