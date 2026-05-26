import type {
  CreateMobileTaskRequest,
  MobileTask,
  MobileTaskPriority,
  MobileTaskStatus,
  MobileTodayResponse,
} from "@freescale/types";
import type { UserSupabaseClient } from "./supabase";
import { MobileRouteError } from "./workspace";

const TASK_SELECT =
  "id,title,description,status,priority,due_at,completed_at,created_at,updated_at";
const PRIORITIES = new Set<MobileTaskPriority>(["low", "medium", "high", "urgent"]);

type TaskRow = {
  id?: unknown;
  title?: unknown;
  description?: unknown;
  status?: unknown;
  priority?: unknown;
  due_at?: unknown;
  completed_at?: unknown;
  created_at?: unknown;
  updated_at?: unknown;
};

type ValidCreateTask = {
  title: string;
  description: string | null;
  priority: MobileTaskPriority;
  dueAt: string | null;
};

export type ValidationResult<T> = { ok: true; value: T } | { ok: false; message: string };

function taskStatus(value: unknown): MobileTaskStatus {
  if (
    value === "todo" ||
    value === "in_progress" ||
    value === "awaiting_reply" ||
    value === "done"
  ) {
    return value;
  }
  return "todo";
}

function taskPriority(value: unknown): MobileTaskPriority {
  return PRIORITIES.has(value as MobileTaskPriority) ? (value as MobileTaskPriority) : "medium";
}

export function toMobileTask(row: TaskRow): MobileTask {
  const createdAt = typeof row.created_at === "string" ? row.created_at : new Date(0).toISOString();
  return {
    id: typeof row.id === "string" ? row.id : "",
    title: typeof row.title === "string" ? row.title : "",
    description: typeof row.description === "string" ? row.description : null,
    status: taskStatus(row.status),
    priority: taskPriority(row.priority),
    dueAt: typeof row.due_at === "string" ? row.due_at : null,
    completedAt: typeof row.completed_at === "string" ? row.completed_at : null,
    createdAt,
    updatedAt: typeof row.updated_at === "string" ? row.updated_at : createdAt,
  };
}

async function requireTasks(response: Response): Promise<MobileTask[]> {
  if (!response.ok) {
    throw new MobileRouteError("upstream_error", 502, "Impossible de charger les tâches.");
  }
  const rows = (await response.json()) as unknown;
  return Array.isArray(rows) ? rows.map((row) => toMobileTask(row as TaskRow)) : [];
}

export async function listMobileTasks(
  client: UserSupabaseClient,
  workspaceId: string,
  onlyOpen = false
): Promise<MobileTask[]> {
  const openFilter = onlyOpen ? "&status=neq.done" : "";
  const response = await client.request(
    `/rest/v1/tasks?select=${TASK_SELECT}&workspace_id=eq.${encodeURIComponent(workspaceId)}${openFilter}&order=updated_at.desc&limit=200`
  );
  return requireTasks(response);
}

function validCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function todayDate(queryDate: string | undefined): ValidationResult<string> {
  if (queryDate === undefined) {
    return { ok: true, value: new Date().toISOString().slice(0, 10) };
  }
  if (!validCalendarDate(queryDate)) {
    return { ok: false, message: "Date invalide." };
  }
  return { ok: true, value: queryDate };
}

export function buildToday(tasks: MobileTask[], date: string): MobileTodayResponse {
  const open = tasks.filter((task) => task.status !== "done");
  const now = open.filter(
    (task) =>
      task.priority === "urgent" ||
      task.priority === "high" ||
      (task.dueAt !== null && task.dueAt.slice(0, 10) <= date)
  );
  const selected = new Set(now.map((task) => task.id));
  return {
    date,
    generatedAt: new Date().toISOString(),
    now,
    later: open.filter((task) => !selected.has(task.id)),
    openCount: open.length,
  };
}

export function validateCreateTask(payload: unknown): ValidationResult<ValidCreateTask> {
  if (!payload || typeof payload !== "object") {
    return { ok: false, message: "Corps de requête invalide." };
  }
  const input = payload as CreateMobileTaskRequest;
  const title = typeof input.title === "string" ? input.title.trim() : "";
  if (!title) {
    return { ok: false, message: "Le titre est requis." };
  }
  if (input.priority !== undefined && !PRIORITIES.has(input.priority)) {
    return { ok: false, message: "Priorité invalide." };
  }
  if (
    input.description !== undefined &&
    input.description !== null &&
    typeof input.description !== "string"
  ) {
    return { ok: false, message: "Description invalide." };
  }

  let dueAt: string | null = null;
  if (input.dueAt !== undefined && input.dueAt !== null) {
    if (typeof input.dueAt !== "string") {
      return { ok: false, message: "Échéance invalide." };
    }
    const due = new Date(input.dueAt);
    if (Number.isNaN(due.getTime())) {
      return { ok: false, message: "Échéance invalide." };
    }
    dueAt = due.toISOString();
  }

  return {
    ok: true,
    value: {
      title,
      description: typeof input.description === "string" ? input.description.trim() : null,
      priority: input.priority ?? "medium",
      dueAt,
    },
  };
}

export async function createMobileTask(
  client: UserSupabaseClient,
  workspaceId: string,
  input: ValidCreateTask
): Promise<MobileTask> {
  const response = await client.request(`/rest/v1/tasks?select=${TASK_SELECT}`, {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({
      workspace_id: workspaceId,
      title: input.title,
      description: input.description,
      priority: input.priority,
      due_at: input.dueAt,
      status: "todo",
      ai_generated: false,
    }),
  });
  const tasks = await requireTasks(response);
  const task = tasks[0];
  if (!task) {
    throw new MobileRouteError("upstream_error", 502, "Impossible de créer la tâche.");
  }
  return task;
}

export async function completeMobileTask(
  client: UserSupabaseClient,
  workspaceId: string,
  taskId: string
): Promise<MobileTask> {
  const response = await client.request(
    `/rest/v1/tasks?select=${TASK_SELECT}&id=eq.${encodeURIComponent(taskId)}&workspace_id=eq.${encodeURIComponent(workspaceId)}`,
    {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({
        status: "done",
        completed_at: new Date().toISOString(),
      }),
    }
  );
  const tasks = await requireTasks(response);
  const task = tasks[0];
  if (!task) {
    throw new MobileRouteError("task_not_found", 404, "Tâche introuvable.");
  }
  return task;
}
