import { MOBILE_API_VERSION, type MobileTask } from "@freescale/types";
import { describe, expect, it } from "vitest";

describe("mobile API contracts", () => {
  it("publishes a stable v1 task contract", () => {
    const task: MobileTask = {
      id: "task_1",
      title: "Preparer le dossier",
      description: null,
      status: "todo",
      priority: "high",
      dueAt: null,
      completedAt: null,
      createdAt: "2026-05-26T10:00:00.000Z",
      updatedAt: "2026-05-26T10:00:00.000Z",
    };

    expect(MOBILE_API_VERSION).toBe("v1");
    expect(task.status).toBe("todo");
  });
});
