import { describe, expect, it } from "vitest";
import { getTodayTaskSections } from "./today";
import type { Task } from "./types";

const baseTask = (overrides: Partial<Task>): Task => ({
  id: overrides.id ?? "task-1",
  title: overrides.title ?? "Task",
  priority: overrides.priority ?? "medium",
  dueLabel: overrides.dueLabel ?? "No due date",
  dueAtIso: overrides.dueAtIso ?? null,
  isToday: overrides.isToday ?? false,
  isDone: overrides.isDone ?? false,
  avatar: overrides.avatar ?? { kind: "initials", text: "FS" },
  channel: overrides.channel ?? "gmail",
  status: overrides.status ?? "todo",
  parentTaskId: overrides.parentTaskId ?? null,
  sortableIndex: overrides.sortableIndex ?? 0,
});

describe("getTodayTaskSections", () => {
  it("puts high priority and today tasks into now", () => {
    const sections = getTodayTaskSections([
      baseTask({ id: "high", title: "High", priority: "high", dueLabel: "Next week" }),
      baseTask({ id: "today", title: "Today", priority: "medium", dueLabel: "Today", isToday: true }),
      baseTask({ id: "later", title: "Later", priority: "low", dueLabel: "Friday" }),
    ]);

    expect(sections.now.map((task) => task.id)).toEqual(["high", "today"]);
    expect(sections.later.map((task) => task.id)).toEqual(["later"]);
  });

  it("excludes done tasks from open sections", () => {
    const sections = getTodayTaskSections([
      baseTask({ id: "done", title: "Done", isDone: true, status: "done", isToday: true }),
      baseTask({ id: "open", title: "Open", isToday: true }),
    ]);

    expect(sections.now.map((task) => task.id)).toEqual(["open"]);
    expect(sections.doneToday.map((task) => task.id)).toEqual(["done"]);
  });

  it("limits now tasks without losing later tasks", () => {
    const sections = getTodayTaskSections(
      [
        baseTask({ id: "1", priority: "high", sortableIndex: 1 }),
        baseTask({ id: "2", priority: "high", sortableIndex: 2 }),
        baseTask({ id: "3", priority: "high", sortableIndex: 3 }),
        baseTask({ id: "4", priority: "high", sortableIndex: 4 }),
        baseTask({ id: "5", priority: "medium", sortableIndex: 5 }),
      ],
      { nowLimit: 3, laterLimit: 2 }
    );

    expect(sections.now.map((task) => task.id)).toEqual(["1", "2", "3"]);
    expect(sections.later.map((task) => task.id)).toEqual(["4", "5"]);
  });

  it("orders same-priority tasks by due date before sortable index", () => {
    const sections = getTodayTaskSections([
      baseTask({
        id: "undated",
        priority: "high",
        dueAtIso: null,
        sortableIndex: 0,
      }),
      baseTask({
        id: "later-due",
        priority: "high",
        dueAtIso: "2026-06-05T10:00:00.000Z",
        sortableIndex: 1,
      }),
      baseTask({
        id: "earlier-due",
        priority: "high",
        dueAtIso: "2026-05-30T10:00:00.000Z",
        sortableIndex: 2,
      }),
    ]);

    expect(sections.now.map((task) => task.id)).toEqual([
      "earlier-due",
      "later-due",
      "undated",
    ]);
  });
});
