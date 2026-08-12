import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

async function source(path: string) {
  return readFile(new URL(path, import.meta.url), "utf8").catch(() => "");
}

describe("Today operational home", () => {
  it("renders Direction C without making Mue a startup blocker", async () => {
    const content = await source("./TodayView.tsx");

    expect(content).toContain("<TodayBriefCard");
    expect(content).toContain("<QuickTaskCapture");
    expect(content).toContain("getTodayTaskSections");
    expect(content).toContain("À faire maintenant");
    expect(content).not.toContain("channels.length === 0");
    expect(content).not.toContain("void loadBrief();");
    expect(content).not.toContain("<NoChannelsHero");
  });

  it("is wired as the application's default mobile destination", async () => {
    const [types, store, shell, sidebar, bottomNav, moreView] = await Promise.all([
      source("../lib/types.ts"),
      source("../lib/store.ts"),
      source("./AppShell.tsx"),
      source("./Sidebar.tsx"),
      source("./mobile/MobileBottomNav.tsx"),
      source("./mobile/MobileMoreView.tsx"),
    ]);

    expect(types).toContain('"today"');
    expect(types).toContain('"more"');
    expect(store).toContain('view: "today"');
    expect(shell).toContain("<TodayView");
    expect(shell).toContain("<MobileBottomNav");
    expect(shell).toContain("<MobileMoreView");
    expect(sidebar).toContain('label: "Aujourd\'hui"');
    expect(bottomNav).toContain('label: "Plus"');
    expect(bottomNav).toContain('setView("more")');
    expect(moreView).toContain("MobileMoreView");
  });

  it("does not interrupt returning users with old acquisition prompts", async () => {
    const [muePanel, trialBanner] = await Promise.all([
      source("./MuePanel.tsx"),
      source("./billing/TrialBanner.tsx"),
    ]);

    expect(muePanel).not.toContain("FirstActionBanner");
    expect(trialBanner).toContain("if (!expired && !urgent) return null;");
  });

  it("does not bulk-create tasks from Mue without confirmation", async () => {
    const tasksView = await source("./TasksView.tsx");

    expect(tasksView).not.toContain("for (const item of res.briefing.items)");
    expect(tasksView).not.toContain("Mue a créé");
    expect(tasksView).toContain("suggestedTasks");
    expect(tasksView).toContain("Créer cette tâche");
  });

  it("keeps task capture usable in app-only local mode", async () => {
    const [dataContext, quickCapture, newTaskModal, tasksView] = await Promise.all([
      source("../lib/contexts/DataContext.tsx"),
      source("./QuickTaskCapture.tsx"),
      source("./NewTaskModal.tsx"),
      source("./TasksView.tsx"),
    ]);

    expect(dataContext).toContain("LOCAL_TASKS_KEY");
    expect(dataContext).toContain("makeLocalTask");
    expect(dataContext).toContain("!initial.activeWorkspaceId");
    expect(quickCapture).toContain("useData()");
    expect(newTaskModal).toContain("useData()");
    expect(tasksView).toContain("toggleTask, createTask");
  });
});
