import type { Task } from "@/lib/types";

export type TodayTaskSections = {
  now: Task[];
  later: Task[];
  doneToday: Task[];
  openCount: number;
};

type Options = {
  nowLimit?: number;
  laterLimit?: number;
};

function rankTask(task: Task): number {
  if (task.priority === "high") return 0;
  if (task.isToday) return 1;
  if (task.priority === "medium") return 2;
  return 3;
}

function validDueTime(task: Task): number | null {
  if (!task.dueAtIso) return null;
  const time = Date.parse(task.dueAtIso);
  return Number.isNaN(time) ? null : time;
}

function byUsefulOrder(a: Task, b: Task) {
  const rankDiff = rankTask(a) - rankTask(b);
  if (rankDiff !== 0) return rankDiff;
  const aDueTime = validDueTime(a);
  const bDueTime = validDueTime(b);
  if (aDueTime !== null && bDueTime !== null) {
    const dueDiff = aDueTime - bDueTime;
    if (dueDiff !== 0) return dueDiff;
  }
  if (aDueTime !== null) return -1;
  if (bDueTime !== null) return 1;
  return (a.sortableIndex ?? 0) - (b.sortableIndex ?? 0);
}

export function getTodayTaskSections(tasks: Task[], options: Options = {}): TodayTaskSections {
  const nowLimit = options.nowLimit ?? 4;
  const laterLimit = options.laterLimit ?? 4;
  const topLevel = tasks.filter((task) => !task.parentTaskId);
  const doneToday = topLevel.filter((task) => task.isDone || task.status === "done");
  const open = topLevel.filter((task) => !task.isDone && task.status !== "done");
  const urgent = open
    .filter((task) => task.priority === "high" || task.isToday)
    .sort(byUsefulOrder);
  const urgentIds = new Set(urgent.map((task) => task.id));
  const remaining = open
    .filter((task) => !urgentIds.has(task.id))
    .sort(byUsefulOrder);
  const now = urgent.slice(0, nowLimit);
  const overflowNow = urgent.slice(nowLimit);
  const later = [...overflowNow, ...remaining].slice(0, laterLimit);

  return {
    now,
    later,
    doneToday,
    openCount: open.length,
  };
}
