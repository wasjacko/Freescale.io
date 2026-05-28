# Mobile App Direction C Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the validated mobile-first Direction C for the signed-in Freescale web app: premium Mue-led `Aujourd'hui`, real task capture, mobile bottom navigation, full-screen conversation, and `Plus`.

**Architecture:** This plan delivers the web mobile `/app` slice first, without changing the native iPhone roadmap. It introduces focused mobile shell components, refactors `TodayView` so tasks work without Mue or channels, and updates CSS under mobile breakpoints while preserving the desktop sidebar/column experience.

**Tech Stack:** Next.js 15 App Router, React 19, Zustand, Supabase server actions, Vitest, custom CSS in `apps/web/app/globals.css`.

---

## File Structure

Create:

- `apps/web/components/mobile/MobileBottomNav.tsx` - bottom navigation for mobile web.
- `apps/web/components/mobile/MobileMoreView.tsx` - mobile `Plus` destination for Mue, tools, settings, support, account.
- `apps/web/components/TodayBriefCard.tsx` - isolated Mue brief card with non-blocking states.
- `apps/web/components/QuickTaskCapture.tsx` - quick manual task creation.
- `apps/web/lib/today.ts` - pure helpers for deriving `Aujourd'hui` task lists and labels.
- `apps/web/lib/today.test.ts` - unit tests for the task derivation helpers.

Modify:

- `apps/web/lib/types.ts` - add `more` to `ViewId`.
- `apps/web/lib/store.ts` - handle persisted invalid views and keep `today` as default.
- `apps/web/components/AppShell.tsx` - mount mobile bottom nav and `MobileMoreView`.
- `apps/web/components/Sidebar.tsx` - keep desktop nav unchanged, ensure mobile bottom nav handles `Plus`.
- `apps/web/components/TodayView.tsx` - refactor away from Mue-blocking startup and no-channel replacement.
- `apps/web/components/TasksView.tsx` - make Mue collection non-destructive; suggestions require confirmation.
- `apps/web/components/TodayView.test.ts` - update static behavioral tests for Direction C.
- `apps/web/app/globals.css` - mobile shell, Direction C visual system, bottom nav, `Plus`, conversation and task refinements.

Do not commit `.superpowers/`; it contains temporary brainstorming mockups only.

---

### Task 1: Today Helpers And Tests

**Files:**
- Create: `apps/web/lib/today.ts`
- Create: `apps/web/lib/today.test.ts`

- [ ] **Step 1: Write failing tests for task derivation**

Create `apps/web/lib/today.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { getTodayTaskSections } from "./today";
import type { Task } from "./types";

const baseTask = (overrides: Partial<Task>): Task => ({
  id: overrides.id ?? "task-1",
  title: overrides.title ?? "Task",
  priority: overrides.priority ?? "medium",
  dueLabel: overrides.dueLabel ?? "No due date",
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
});
```

- [ ] **Step 2: Run tests and confirm failure**

Run:

```bash
npm run test -- today.test.ts
```

Expected: FAIL because `apps/web/lib/today.ts` does not exist.

- [ ] **Step 3: Add helper implementation**

Create `apps/web/lib/today.ts`:

```ts
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

function byUsefulOrder(a: Task, b: Task) {
  const rankDiff = rankTask(a) - rankTask(b);
  if (rankDiff !== 0) return rankDiff;
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
  const remaining = open
    .filter((task) => !urgent.some((urgentTask) => urgentTask.id === task.id))
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
```

- [ ] **Step 4: Run helper tests**

Run:

```bash
npm run test -- today.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/today.ts apps/web/lib/today.test.ts
git commit -m "test: add today task derivation"
```

---

### Task 2: Mobile View Type And Bottom Navigation

**Files:**
- Create: `apps/web/components/mobile/MobileBottomNav.tsx`
- Modify: `apps/web/lib/types.ts`
- Modify: `apps/web/lib/store.ts`
- Modify: `apps/web/components/AppShell.tsx`
- Modify: `apps/web/components/TodayView.test.ts`

- [ ] **Step 1: Write failing static test expectations**

Modify the second test in `apps/web/components/TodayView.test.ts` so it checks the new mobile shell:

```ts
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
    expect(sidebar).toContain('label: "Aujourd\\'hui"');
    expect(bottomNav).toContain('label: "Plus"');
    expect(bottomNav).toContain('setView("more")');
  });
```

- [ ] **Step 2: Run the test and confirm failure**

Run:

```bash
npm run test -- TodayView.test.ts
```

Expected: FAIL because `MobileBottomNav.tsx` does not exist and `ViewId` does not include `more`.

- [ ] **Step 3: Add `more` to view types and migrate stale persisted state**

Modify `apps/web/lib/types.ts`:

```ts
export type ViewId = "today" | "inbox" | "tasks" | "calendar" | "ai-knowledge" | "more";
```

Modify `apps/web/lib/store.ts`:

```ts
const VALID_VIEWS = new Set<ViewId>(["today", "inbox", "tasks", "calendar", "ai-knowledge", "more"]);

function normalizeView(view: unknown): ViewId {
  return typeof view === "string" && VALID_VIEWS.has(view as ViewId) ? (view as ViewId) : "today";
}
```

Then update the store body:

```ts
      setView: (view) => set({ view }),
```

stays unchanged, and replace the `migrate` callback with:

```ts
      migrate: (persistedState, version) => {
        const stored = persistedState as Partial<State>;
        if (version < 1) {
          return { ...stored, view: "today", activeConvId: "" } as State;
        }
        return { ...stored, view: normalizeView(stored.view), activeConvId: stored.activeConvId ?? "" } as State;
      },
```

- [ ] **Step 4: Create mobile bottom nav**

Create `apps/web/components/mobile/MobileBottomNav.tsx`:

```tsx
"use client";

import { Icon } from "@/components/icons/Icon";
import { useData } from "@/lib/contexts/DataContext";
import { useApp } from "@/lib/store";
import type { ViewId } from "@/lib/types";

type Item = {
  id: ViewId;
  label: string;
  icon: string;
  count?: number | null;
};

export function MobileBottomNav() {
  const { view, setView, setActiveConv } = useApp();
  const { conversations, tasks } = useData();
  const unread = conversations.filter((conversation) => conversation.unread).length;
  const openTasks = tasks.filter((task) => task.status !== "done").length;

  const items: Item[] = [
    { id: "today", label: "Aujourd'hui", icon: "i-spark" },
    { id: "inbox", label: "Inbox", icon: "i-inbox", count: unread },
    { id: "tasks", label: "Taches", icon: "i-task", count: openTasks },
    { id: "calendar", label: "Agenda", icon: "i-cal" },
    { id: "more", label: "Plus", icon: "i-more" },
  ];

  return (
    <nav className="mobile-bottom-nav" aria-label="Navigation principale mobile">
      {items.map((item) => {
        const active = view === item.id;
        return (
          <button
            key={item.id}
            type="button"
            className={`mobile-bottom-nav-item ${active ? "is-active" : ""}`}
            aria-current={active ? "page" : undefined}
            onClick={() => {
              setView(item.id);
              if (item.id === "inbox") setActiveConv("");
            }}
          >
            <span className="mobile-bottom-nav-icon">
              <Icon name={item.icon} />
              {item.count ? <span className="mobile-bottom-nav-count">{item.count}</span> : null}
            </span>
            <span>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
```

- [ ] **Step 5: Mount mobile nav in AppShell**

Modify `apps/web/components/AppShell.tsx` imports:

```tsx
import { MobileBottomNav } from "@/components/mobile/MobileBottomNav";
```

Add `<MobileBottomNav />` inside the `.app` wrapper after `.workspace`:

```tsx
        <div className="workspace">
          ...
          <MuePanel />
        </div>
        <MobileBottomNav />
```

- [ ] **Step 6: Run the shell test**

Run:

```bash
npm run test -- TodayView.test.ts
```

Expected: PASS for the shell wiring test. Other Today tests may still fail until Task 4 updates `TodayView`.

- [ ] **Step 7: Commit**

```bash
git add apps/web/components/mobile/MobileBottomNav.tsx apps/web/lib/types.ts apps/web/lib/store.ts apps/web/components/AppShell.tsx apps/web/components/TodayView.test.ts
git commit -m "feat: add mobile bottom navigation"
```

---

### Task 3: Mobile `Plus` Destination

**Files:**
- Create: `apps/web/components/mobile/MobileMoreView.tsx`
- Modify: `apps/web/components/AppShell.tsx`
- Modify: `apps/web/app/globals.css`
- Modify: `apps/web/components/TodayView.test.ts`

- [ ] **Step 1: Add test expectations for `Plus`**

Add this assertion to the shell test in `apps/web/components/TodayView.test.ts`:

```ts
    expect(shell).toContain("<MobileMoreView");
```

- [ ] **Step 2: Run the test and confirm failure**

Run:

```bash
npm run test -- TodayView.test.ts
```

Expected: FAIL because `MobileMoreView` is not mounted.

- [ ] **Step 3: Create `MobileMoreView`**

Create `apps/web/components/mobile/MobileMoreView.tsx`:

```tsx
"use client";

import { Icon } from "@/components/icons/Icon";
import type { CurrentUser } from "@/lib/auth";
import { useData } from "@/lib/contexts/DataContext";
import { useApp } from "@/lib/store";
import Link from "next/link";

export function MobileMoreView({ user }: { user: CurrentUser | null }) {
  const { view, setView } = useApp();
  const { channels } = useData();
  const shown = view === "more";

  return (
    <section className="mobile-more-view" aria-label="Plus" hidden={!shown}>
      <header className="mobile-more-head">
        <p>Compte et outils</p>
        <h1>Plus</h1>
      </header>

      <button type="button" className="mobile-more-mue" onClick={() => setView("ai-knowledge")}>
        <span className="mobile-more-mue-icon">
          <Icon name="i-spark" />
        </span>
        <span>
          <strong>Mue Copilot</strong>
          <small>Resumer, extraire et rediger</small>
        </span>
        <Icon name="i-chevron-down" />
      </button>

      <div className="mobile-more-list" role="list">
        <button type="button" className="mobile-more-row" onClick={() => setView("ai-knowledge")}>
          <Icon name="i-book" />
          <span>AI Knowledge</span>
          <small>Beta</small>
        </button>
        <Link href="/app/settings/connections" className="mobile-more-row">
          <Icon name="i-globe" />
          <span>Canaux connectes</span>
          <small>{channels.length}</small>
        </Link>
        <button type="button" className="mobile-more-row" onClick={() => setView("calendar")}>
          <Icon name="i-cal" />
          <span>Calendriers</span>
          <small>Ouvrir</small>
        </button>
      </div>

      <div className="mobile-more-list" role="list">
        <Link href="/app/settings/profile" className="mobile-more-row">
          <Icon name="i-settings" />
          <span>Parametres</span>
          <small>Compte</small>
        </Link>
        <Link href="/support" className="mobile-more-row">
          <Icon name="i-info" />
          <span>Aide et support</span>
          <small>Ouvrir</small>
        </Link>
        <Link href="/privacy" className="mobile-more-row">
          <Icon name="i-lock" />
          <span>Confidentialite</span>
          <small>Lire</small>
        </Link>
      </div>

      <div className="mobile-more-account">
        <span className="mobile-more-avatar">{user?.firstName?.[0] ?? "?"}</span>
        <span>
          <strong>{user?.firstName ?? "Compte"}</strong>
          <small>{user?.email ?? "Non connecte"}</small>
        </span>
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Mount `MobileMoreView`**

Modify `apps/web/components/AppShell.tsx` imports:

```tsx
import { MobileMoreView } from "@/components/mobile/MobileMoreView";
```

Render it in `.workspace` after `AIKnowledgeView` and before `MuePanel`:

```tsx
          <AIKnowledgeView />
          <MobileMoreView user={user} />
          <MuePanel />
```

- [ ] **Step 5: Add initial CSS visibility**

Add to `apps/web/app/globals.css` before the landing section:

```css
.mobile-bottom-nav,
.mobile-more-view {
  display: none;
}

.mobile-more-view[hidden] {
  display: none !important;
}
```

Mobile-specific styling is added in Task 6.

- [ ] **Step 6: Run tests**

Run:

```bash
npm run test -- TodayView.test.ts
```

Expected: PASS for `Plus` mounting expectations.

- [ ] **Step 7: Commit**

```bash
git add apps/web/components/mobile/MobileMoreView.tsx apps/web/components/AppShell.tsx apps/web/app/globals.css apps/web/components/TodayView.test.ts
git commit -m "feat: add mobile plus view"
```

---

### Task 4: Direction C `Aujourd'hui`

**Files:**
- Create: `apps/web/components/TodayBriefCard.tsx`
- Create: `apps/web/components/QuickTaskCapture.tsx`
- Modify: `apps/web/components/TodayView.tsx`
- Modify: `apps/web/components/TodayView.test.ts`

- [ ] **Step 1: Replace Today tests for Direction C behavior**

Replace the first test in `apps/web/components/TodayView.test.ts` with:

```ts
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
```

- [ ] **Step 2: Run tests and confirm failure**

Run:

```bash
npm run test -- TodayView.test.ts
```

Expected: FAIL because `TodayView` still imports `NoChannelsHero`, calls `dailyBriefing` on view load, and does not use the new components.

- [ ] **Step 3: Create `TodayBriefCard`**

Create `apps/web/components/TodayBriefCard.tsx`:

```tsx
"use client";

import { Icon } from "@/components/icons/Icon";
import type { DailyBriefing } from "@/lib/actions/mue";

type Props = {
  state: "idle" | "loading" | "result" | "error" | "no-channel";
  data: DailyBriefing | null;
  hasChannels: boolean;
  onRequest: () => void;
  onConnectChannel: () => void;
};

export function TodayBriefCard({ state, data, hasChannels, onRequest, onConnectChannel }: Props) {
  const actionCount = data?.items.length ?? 0;
  const title =
    state === "loading"
      ? "Mue prepare votre brief."
      : state === "error"
        ? "Le brief reviendra bientot."
        : state === "no-channel"
          ? "Connectez un canal pour collecter depuis vos messages."
          : actionCount > 0
            ? `${actionCount} action${actionCount > 1 ? "s" : ""} meritent votre attention.`
            : "Mue peut preparer vos prochaines actions.";
  const copy =
    state === "result" && data?.headline
      ? data.headline
      : "Les suggestions seront confirmees une par une avant de devenir des taches.";

  return (
    <section className={`today-brief-card is-${state}`} aria-label="Brief Mue du jour">
      <div className="today-brief-card-top">
        <span>
          <Icon name="i-spark" />
          Mue - brief du jour
        </span>
        <span aria-hidden>...</span>
      </div>
      <h2>{title}</h2>
      <p>{copy}</p>
      <button
        type="button"
        className="today-brief-card-action"
        onClick={hasChannels ? onRequest : onConnectChannel}
        disabled={state === "loading"}
      >
        {state === "loading"
          ? "Analyse en cours"
          : hasChannels
            ? "Voir les suggestions"
            : "Connecter un canal"}
      </button>
    </section>
  );
}
```

- [ ] **Step 4: Create `QuickTaskCapture`**

Create `apps/web/components/QuickTaskCapture.tsx`:

```tsx
"use client";

import { createTask } from "@/lib/actions/inbox";
import { useToast } from "@/lib/hooks/useToast";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export function QuickTaskCapture() {
  const router = useRouter();
  const push = useToast((state) => state.push);
  const [title, setTitle] = useState("");
  const [pending, startTransition] = useTransition();

  const submit = () => {
    const trimmed = title.trim();
    if (!trimmed || pending) return;
    startTransition(async () => {
      const result = await createTask({ title: trimmed, priority: "medium" });
      if (!result.ok) {
        push({ kind: "error", text: result.error ?? "Creation impossible." });
        return;
      }
      setTitle("");
      push({ kind: "info", text: "Tache ajoutee.", duration: 2200 });
      router.refresh();
    });
  };

  return (
    <form
      className="quick-task-capture"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <label className="sr-only" htmlFor="quick-task-title">
        Ajouter une tache
      </label>
      <input
        id="quick-task-title"
        type="text"
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        placeholder="Ajouter une tache..."
      />
      <button type="submit" disabled={!title.trim() || pending}>
        {pending ? "Ajout" : "Ajouter"}
      </button>
    </form>
  );
}
```

- [ ] **Step 5: Refactor `TodayView`**

Modify `apps/web/components/TodayView.tsx`:

- Remove `NoChannelsHero` import.
- Keep `dailyBriefing` and `createTaskFromBrief`.
- Import `TodayBriefCard`, `QuickTaskCapture`, and `getTodayTaskSections`.
- Initialize brief as idle: `const [brief, setBrief] = useState<BriefState>({ kind: "idle" });`.
- Remove the `useEffect` that calls `loadBrief()` automatically.
- Compute `const sections = getTodayTaskSections(tasks, { nowLimit: 4, laterLimit: 3 });`.
- Render `TodayBriefCard`, `QuickTaskCapture`, and real task rows.

Use this render shape:

```tsx
  const sections = getTodayTaskSections(tasks, { nowLimit: 4, laterLimit: 3 });
  const hasChannels = channels.length > 0;
  const briefState =
    !hasChannels && brief.kind === "idle"
      ? "no-channel"
      : brief.kind === "loading"
        ? "loading"
        : brief.kind === "error"
          ? "error"
          : brief.kind === "result"
            ? "result"
            : "idle";

  return (
    <section className="today-view today-view-direction-c" aria-label="Aujourd'hui">
      <header className="today-hero">
        <div className="today-date">
          <Icon name="i-spark" />
          <span>{user?.firstName ? `Bonjour ${user.firstName}` : "Aujourd'hui"}</span>
          <span aria-hidden="true">·</span>
          <time>{dateLabel}</time>
        </div>
      </header>

      <TodayBriefCard
        state={briefState}
        data={brief.kind === "result" ? brief.data : null}
        hasChannels={hasChannels}
        onRequest={() => void loadBrief(true)}
        onConnectChannel={() => setView("inbox")}
      />

      <QuickTaskCapture />

      <main className="today-priorities" aria-live="polite">
        <div className="today-section-head">
          <h2>À faire maintenant</h2>
          <span>{sections.now.length}</span>
        </div>
        {sections.now.length === 0 ? (
          <div className="today-empty">
            <strong>Votre journee est degagee.</strong>
            <p>Ajoutez une tache ou collectez des actions depuis vos conversations avec Mue.</p>
            <button type="button" onClick={() => setView("tasks")}>
              Ouvrir mes taches
            </button>
          </div>
        ) : (
          <div className="today-task-list">
            {sections.now.map((task) => (
              <article key={task.id} className={`today-task-row is-${task.priority}`}>
                <button
                  type="button"
                  className={`task-check ${task.isDone ? "is-done" : ""}`}
                  aria-label="Marquer la tache terminee"
                  onClick={() => void toggleTask(task.id, true)}
                />
                <div>
                  <h3>{task.title}</h3>
                  <p>{task.dueLabel}</p>
                </div>
                {task.priority === "high" && <span className="today-task-priority">Urgent</span>}
              </article>
            ))}
          </div>
        )}
      </main>
    </section>
  );
```

Keep the existing `handleCreateTask` for Mue suggestions, but place Mue result rendering below the task list only when `brief.kind === "result" && items.length > 0`.

- [ ] **Step 6: Run tests**

Run:

```bash
npm run test -- TodayView.test.ts today.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/web/components/TodayBriefCard.tsx apps/web/components/QuickTaskCapture.tsx apps/web/components/TodayView.tsx apps/web/components/TodayView.test.ts
git commit -m "feat: refactor today for mobile direction c"
```

---

### Task 5: Non-Destructive Mue Collection In Tasks

**Files:**
- Modify: `apps/web/components/TasksView.tsx`
- Modify: `apps/web/components/TodayView.test.ts`

- [ ] **Step 1: Add static regression test**

Add to `apps/web/components/TodayView.test.ts`:

```ts
  it("does not bulk-create tasks from Mue without confirmation", async () => {
    const tasksView = await source("./TasksView.tsx");

    expect(tasksView).not.toContain("for (const item of res.briefing.items)");
    expect(tasksView).not.toContain("Mue a créé");
    expect(tasksView).toContain("suggestedTasks");
    expect(tasksView).toContain("Créer cette tâche");
  });
```

- [ ] **Step 2: Run test and confirm failure**

Run:

```bash
npm run test -- TodayView.test.ts
```

Expected: FAIL because `TasksView` currently loops through Mue items and creates tasks automatically.

- [ ] **Step 3: Add suggestion state to `TasksView`**

In `apps/web/components/TasksView.tsx`, add state near existing `analyzing`:

```tsx
  const [suggestedTasks, setSuggestedTasks] = useState<
    Array<{
      conversationId: string;
      title: string;
      why: string;
      priority: "high" | "medium" | "low";
      due: string | null;
    }>
  >([]);
  const [creatingSuggestionId, setCreatingSuggestionId] = useState<string | null>(null);
```

Replace `handleAnalyze` with:

```tsx
  const handleAnalyze = () => {
    startAnalyzing(async () => {
      try {
        const res = await dailyBriefing();
        if (res.error || !res.briefing) {
          push({ kind: "error", text: `Mue : ${res.error ?? "impossible"}`, duration: 4000 });
          return;
        }
        if (res.briefing.items.length === 0) {
          setSuggestedTasks([]);
          push({ text: res.briefing.headline ?? "Rien d'actionnable detecte." });
          return;
        }
        setSuggestedTasks(res.briefing.items);
        push({
          text: `${res.briefing.items.length} suggestion${res.briefing.items.length > 1 ? "s" : ""} a confirmer.`,
          duration: 2800,
        });
      } catch (err) {
        push({
          kind: "error",
          text: err instanceof Error ? err.message : "Analyse impossible.",
          duration: 4000,
        });
      }
    });
  };
```

Add this function below `handleAnalyze`:

```tsx
  const createSuggestedTask = async (item: (typeof suggestedTasks)[number]) => {
    if (creatingSuggestionId) return;
    setCreatingSuggestionId(item.conversationId);
    const result = await createTask({
      title: item.title,
      description: item.why,
      priority: item.priority,
      conversationId: item.conversationId,
      due: item.due,
    });
    setCreatingSuggestionId(null);
    if (!result.ok) {
      push({ kind: "error", text: result.error ?? "Creation impossible." });
      return;
    }
    setSuggestedTasks((current) =>
      current.filter((suggestion) => suggestion.conversationId !== item.conversationId)
    );
    push({ kind: "info", text: "Tache creee.", duration: 2200 });
    router.refresh();
  };
```

Render suggestions after `.scan-banner`:

```tsx
      {suggestedTasks.length > 0 && (
        <div className="task-mue-suggestions" aria-label="Suggestions Mue">
          {suggestedTasks.map((item) => (
            <article key={item.conversationId} className="task-mue-suggestion">
              <div>
                <strong>{item.title}</strong>
                <p>{item.why}</p>
              </div>
              <button
                type="button"
                onClick={() => void createSuggestedTask(item)}
                disabled={creatingSuggestionId === item.conversationId}
              >
                {creatingSuggestionId === item.conversationId ? "Creation" : "Créer cette tâche"}
              </button>
            </article>
          ))}
        </div>
      )}
```

- [ ] **Step 4: Run tests**

Run:

```bash
npm run test -- TodayView.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/TasksView.tsx apps/web/components/TodayView.test.ts
git commit -m "fix: require confirmation for mue task collection"
```

---

### Task 6: Mobile CSS For Direction C

**Files:**
- Modify: `apps/web/app/globals.css`

- [ ] **Step 1: Add mobile shell CSS**

Add this block before the landing CSS section in `apps/web/app/globals.css`:

```css
@media (max-width: 767px) {
  body {
    overflow: auto;
    background: #f4f5f8;
  }

  .app {
    grid-template-columns: 1fr;
    min-height: 100dvh;
    padding-bottom: calc(72px + env(safe-area-inset-bottom));
  }

  .sidebar {
    display: none;
  }

  .workspace {
    grid-template-columns: 1fr;
    padding: 0;
    gap: 0;
  }

  .mobile-bottom-nav {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 60;
    min-height: calc(64px + env(safe-area-inset-bottom));
    padding: 7px 10px calc(10px + env(safe-area-inset-bottom));
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    border-top: 1px solid rgba(15, 23, 42, 0.08);
    background: rgba(255, 255, 255, 0.96);
    backdrop-filter: blur(16px);
  }

  .mobile-bottom-nav-item {
    min-height: 44px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 4px;
    border-radius: 14px;
    color: #8290a5;
    background: transparent;
    font-size: 10px;
    font-weight: 500;
  }

  .mobile-bottom-nav-item.is-active {
    color: #101625;
    font-weight: 600;
  }

  .mobile-bottom-nav-icon {
    position: relative;
    width: 30px;
    height: 24px;
    display: grid;
    place-items: center;
    border-radius: 999px;
  }

  .mobile-bottom-nav-item.is-active .mobile-bottom-nav-icon {
    background: #101625;
    color: #fff;
  }

  .mobile-bottom-nav-icon .icon {
    width: 15px;
    height: 15px;
  }

  .mobile-bottom-nav-count {
    position: absolute;
    top: -5px;
    right: -8px;
    min-width: 17px;
    height: 17px;
    padding: 0 5px;
    display: grid;
    place-items: center;
    border-radius: 999px;
    background: #584cf2;
    color: #fff;
    font-size: 9px;
    font-weight: 700;
  }
}
```

- [ ] **Step 2: Add Direction C Today CSS**

Append inside the same mobile media query:

```css
  .today-view-direction-c {
    display: flex;
    min-height: auto;
    padding: 22px 16px 24px;
    gap: 14px;
    border: 0;
    border-radius: 0;
    background: #f4f5f8;
    box-shadow: none;
    overflow: visible;
  }

  .today-view-direction-c .today-hero {
    width: 100%;
  }

  .today-view-direction-c .today-date {
    margin-bottom: 4px;
  }

  .today-brief-card {
    position: relative;
    overflow: hidden;
    padding: 18px 16px 15px;
    border-radius: 24px;
    color: #fff;
    background: linear-gradient(137deg, #101524 0%, #282354 47%, #6355fa 100%);
  }

  .today-brief-card::after {
    content: "";
    position: absolute;
    right: -42px;
    top: -53px;
    width: 148px;
    height: 148px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(253, 128, 94, 0.92) 0%, rgba(253, 128, 94, 0.18) 35%, transparent 69%);
  }

  .today-brief-card > * {
    position: relative;
    z-index: 1;
  }

  .today-brief-card-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
    color: #d6d3ff;
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
  }

  .today-brief-card-top span:first-child {
    display: inline-flex;
    align-items: center;
    gap: 7px;
  }

  .today-brief-card h2 {
    margin: 13px 0 7px;
    max-width: 260px;
    color: #fff;
    font-size: 22px;
    line-height: 1.14;
    letter-spacing: -0.4px;
  }

  .today-brief-card p {
    max-width: 270px;
    margin: 0 0 14px;
    color: #dedcff;
    font-size: 13px;
    line-height: 1.42;
  }

  .today-brief-card-action,
  .quick-task-capture button {
    min-height: 44px;
    border-radius: 999px;
    font-size: 13px;
    font-weight: 700;
  }

  .today-brief-card-action {
    width: 100%;
    color: #101625;
    background: #fff;
  }

  .quick-task-capture {
    min-height: 58px;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 4px 5px 4px 13px;
    border: 1px solid rgba(15, 23, 42, 0.08);
    border-radius: 16px;
    background: #fff;
  }

  .quick-task-capture input {
    min-width: 0;
    flex: 1;
    border: 0;
    outline: 0;
    color: #0b101d;
    background: transparent;
    font-size: 16px;
  }

  .quick-task-capture button {
    padding: 0 16px;
    color: #fff;
    background: #101625;
  }

  .quick-task-capture button:disabled {
    opacity: 0.48;
  }

  .today-task-list {
    overflow: hidden;
    border: 1px solid rgba(15, 23, 42, 0.08);
    border-radius: 18px;
    background: #fff;
  }

  .today-task-row {
    min-height: 62px;
    display: grid;
    grid-template-columns: 32px minmax(0, 1fr) auto;
    gap: 9px;
    align-items: center;
    padding: 10px;
    border-bottom: 1px solid #f0f2f6;
  }

  .today-task-row:last-child {
    border-bottom: 0;
  }

  .today-task-row h3 {
    margin: 0;
    color: #0b101d;
    font-size: 13px;
    line-height: 1.3;
  }

  .today-task-row p {
    margin: 3px 0 0;
    color: #8b96a8;
    font-size: 11px;
  }

  .today-task-priority {
    min-height: 24px;
    padding: 0 8px;
    display: inline-flex;
    align-items: center;
    border-radius: 999px;
    color: #bb4427;
    background: #fff0eb;
    font-size: 10px;
    font-weight: 700;
  }
```

- [ ] **Step 3: Add mobile `Plus` CSS**

Append inside the same mobile media query:

```css
  .app.view-more .conv-shell,
  .app.view-more .tasks-view,
  .app.view-more .calendar-view,
  .app.view-more .ai-view,
  .app.view-more .today-view,
  .app.view-more .copilot {
    display: none;
  }

  .app.view-more .mobile-more-view {
    display: block;
  }

  .mobile-more-view {
    min-height: calc(100dvh - 72px);
    padding: 24px 16px 96px;
    background: #f4f5f8;
  }

  .mobile-more-head p {
    margin: 0 0 3px;
    color: #8b96a8;
    font-size: 12px;
  }

  .mobile-more-head h1 {
    margin: 0 0 17px;
    color: #0b101d;
    font-size: 30px;
    line-height: 1.1;
    letter-spacing: -0.7px;
  }

  .mobile-more-mue,
  .mobile-more-list,
  .mobile-more-account {
    border: 1px solid rgba(15, 23, 42, 0.08);
    background: #fff;
  }

  .mobile-more-mue {
    width: 100%;
    min-height: 84px;
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 13px;
    margin-bottom: 12px;
    border-radius: 20px;
    background: linear-gradient(108deg, #fff1eb 0%, #f3f1ff 56%, #eaf8ff 100%);
    text-align: left;
  }

  .mobile-more-mue-icon {
    width: 48px;
    height: 48px;
    flex: none;
    display: grid;
    place-items: center;
    border-radius: 16px;
    color: #fff;
    background: linear-gradient(135deg, #fc7955, #584cf2);
  }

  .mobile-more-mue strong,
  .mobile-more-account strong {
    display: block;
    color: #0b101d;
    font-size: 14px;
  }

  .mobile-more-mue small,
  .mobile-more-account small {
    display: block;
    margin-top: 3px;
    color: #566277;
    font-size: 12px;
  }

  .mobile-more-list {
    overflow: hidden;
    margin-bottom: 12px;
    border-radius: 18px;
  }

  .mobile-more-row {
    min-height: 54px;
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 0 13px;
    border-bottom: 1px solid #f0f2f6;
    color: #0b101d;
    text-decoration: none;
    background: #fff;
    font-size: 14px;
    font-weight: 500;
  }

  .mobile-more-row:last-child {
    border-bottom: 0;
  }

  .mobile-more-row .icon {
    width: 18px;
    height: 18px;
    color: #566277;
  }

  .mobile-more-row small {
    margin-left: auto;
    color: #8b96a8;
    font-size: 12px;
  }

  .mobile-more-account {
    min-height: 58px;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 11px;
    border-radius: 18px;
  }

  .mobile-more-avatar {
    width: 38px;
    height: 38px;
    display: grid;
    place-items: center;
    border-radius: 999px;
    background: #101625;
    color: #fff;
    font-size: 13px;
    font-weight: 700;
  }
```

- [ ] **Step 4: Add mobile thread and task polish**

Append inside the same media query:

```css
  .app.view-inbox[data-active-conv="1"] {
    padding-bottom: 0;
  }

  .app.view-inbox[data-active-conv="1"] .mobile-bottom-nav {
    display: none;
  }

  .app.view-inbox[data-active-conv="1"] .conv-shell {
    min-height: 100dvh;
  }

  .app.view-tasks .tasks-view {
    padding: 24px 16px 96px;
    border: 0;
    border-radius: 0;
    background: #f4f5f8;
    box-shadow: none;
  }

  .app.view-tasks .tasks-head h1 {
    font-size: 30px;
    line-height: 1.1;
    letter-spacing: -0.7px;
  }

  .app.view-tasks .btn-new-task,
  .app.view-tasks .btn-analyze {
    min-height: 44px;
  }

  .app.view-tasks .task-tab {
    min-height: 44px;
    border-radius: 999px;
  }

  .task-mue-suggestions {
    display: grid;
    gap: 9px;
    margin: 0 0 14px;
  }

  .task-mue-suggestion {
    padding: 12px;
    border: 1px solid #ece9ff;
    border-radius: 16px;
    background: linear-gradient(110deg, #fff5f0, #f2f1ff);
  }

  .task-mue-suggestion strong {
    display: block;
    color: #0b101d;
    font-size: 13px;
  }

  .task-mue-suggestion p {
    margin: 4px 0 10px;
    color: #566277;
    font-size: 12px;
    line-height: 1.4;
  }

  .task-mue-suggestion button {
    min-height: 44px;
    width: 100%;
    border-radius: 999px;
    color: #fff;
    background: #101625;
    font-size: 13px;
    font-weight: 700;
  }
```

- [ ] **Step 5: Run lint and tests**

Run:

```bash
npm run test -- TodayView.test.ts today.test.ts
npm run lint
```

Expected: both commands PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/web/app/globals.css
git commit -m "style: add mobile direction c shell"
```

---

### Task 7: Visual Verification And Final Fixes

**Files:**
- Modify only files needed to fix observed mobile defects.

- [ ] **Step 1: Start the dev server**

Run:

```bash
npm run dev
```

Expected: Next.js dev server starts, usually on `http://localhost:3000`.

- [ ] **Step 2: Open `/app` at mobile widths**

Use the Browser plugin or Playwright. Check these widths:

```text
375 x 812
390 x 844
430 x 932
768 x 1024
1440 x 960
```

Expected:

- `Aujourd'hui` shows Mue brief, quick task capture, and real tasks.
- Bottom nav is visible on main mobile screens.
- Sidebar is hidden on mobile.
- `Plus` opens from the bottom nav.
- Conversation hides bottom nav and keeps composer usable.
- No horizontal scroll.
- No button text overflow.

- [ ] **Step 3: Fix any visual defect with the smallest scoped change**

If text overflows a pill, increase width, allow wrapping, or reduce label length. If bottom nav masks content, increase bottom padding on the affected view. If a target is under `44px`, increase min-height.

Use this exact verification note in the commit body:

```text
Verified mobile widths: 375, 390, 430, 768, desktop.
```

- [ ] **Step 4: Run full local verification**

Run:

```bash
npm run test
npm run lint
npm run typecheck
```

Expected: PASS.

- [ ] **Step 5: Commit final fixes**

If fixes were needed:

```bash
git add apps/web
git commit -m "fix: polish mobile direction c verification"
```

If no fixes were needed:

```bash
git status --short
```

Expected: no tracked source changes left uncommitted.

---

## Self-Review

Spec coverage:

- Direction C premium Mue-led `Aujourd'hui`: Task 4 and Task 6.
- Tasks useful without Mue or channels: Task 1, Task 4.
- Mobile bottom navigation with `Plus`: Task 2 and Task 3.
- Conversation full-screen on mobile: Task 6 and Task 7.
- Non-destructive Mue suggestions: Task 5.
- Mobile accessibility and `44px` targets: Task 6 and Task 7.
- Visual verification before push: Task 7.

Scope intentionally excluded from this implementation plan:

- Native iPhone Expo app.
- Android.
- App Store commerce policy work.
- Full desktop redesign.
- Landing page redesign.
