# J1 Mobile API Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Provide the authenticated, task-first JSON API that the native iPhone client can use without Gmail or Mue.

**Architecture:** The Cloudflare/Hono API validates the mobile Supabase bearer token with Supabase Auth, then forwards that same user token to PostgREST/RPC so the existing row-level security policies remain the authorization boundary. Mobile-facing request and response contracts live in `@freescale/types`; tasks gain an `updated_at` timestamp because offline mutation reconciliation cannot be based reliably on creation time alone.

**Tech Stack:** TypeScript, Hono on Cloudflare Workers, Supabase Auth/PostgREST/RPC over `fetch`, Vitest, PostgreSQL migrations, pnpm/Turbo.

---

## Scope Decisions

- J1 delivers `GET /v1/me`, `GET /v1/today`, `GET /v1/tasks`, `POST /v1/tasks`,
  `PATCH /v1/tasks/:id/complete`, and `DELETE /v1/account`.
- Endpoints always operate on the authenticated user's active workspace; no client-supplied
  workspace identifier is trusted in this phase.
- Supabase service-role access remains reserved for Stripe webhook handling. User API routes
  forward the user's token so RLS enforces workspace membership.
- `today` is task-first: it contains pending tasks grouped into `now` and `later`; it makes no
  channel or Mue request. It accepts `?date=YYYY-MM-DD` from the device so "today" follows the
  user's local calendar day, defaulting to the server's UTC day only when absent.
- J1 does not scaffold Expo, native OAuth, offline storage, conversation endpoints, Mue endpoints,
  or billing. Those remain J2/J3 work.

## File Map

- Create `packages/types/src/mobile-api.ts`: versioned serializable contracts shared by API and
  the future Expo client.
- Modify `packages/types/src/index.ts`: export the mobile contract module.
- Create `supabase/migrations/20260526211500_tasks_updated_at.sql`: add and automatically maintain
  the task synchronization timestamp.
- Modify `supabase/APPLY_PENDING.sql` and `apps/web/lib/supabase/database.types.ts`: keep manual
  deployment and generated-style local types aligned with the migration.
- Create `apps/api/src/mobile/auth.ts`: Bearer extraction and Supabase user-token validation.
- Create `apps/api/src/mobile/supabase.ts`: small authenticated PostgREST/RPC request wrapper.
- Create `apps/api/src/mobile/workspace.ts`: resolve profile and active accessible workspace.
- Create `apps/api/src/mobile/tasks.ts`: validate/normalize task inputs, map rows to contracts, and
  derive `today` groups.
- Create `apps/api/src/mobile/routes.ts`: Hono `/v1` route composition.
- Modify `apps/api/src/index.ts`, `apps/api/package.json`, and `apps/api/wrangler.toml`: mount
  routes, add shared types dependency, and document the required anonymous key secret.
- Create `apps/api/src/mobile-contracts.test.ts`, `apps/api/src/mobile-schema.test.ts`,
  `apps/api/src/mobile-auth.test.ts`, and `apps/api/src/mobile-routes.test.ts`: regression coverage.

### Task 1: Shared Mobile JSON Contracts

**Files:**
- Create: `packages/types/src/mobile-api.ts`
- Modify: `packages/types/src/index.ts`
- Modify: `apps/api/package.json`
- Test: `apps/api/src/mobile-contracts.test.ts`

- [ ] **Step 1: Write the failing contract availability test**

```ts
import { describe, expect, it } from "vitest";
import { MOBILE_API_VERSION, type MobileTask } from "@freescale/types";

describe("mobile API contracts", () => {
  it("publishes a stable v1 task contract", () => {
    const task: MobileTask = {
      id: "task_1",
      title: "Préparer le dossier",
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
```

- [ ] **Step 2: Run the test and verify RED**

Run: `pnpm --filter @freescale/api test -- src/mobile-contracts.test.ts`

Expected: FAIL because `@freescale/types` does not export `MOBILE_API_VERSION` or `MobileTask`.

- [ ] **Step 3: Implement minimal shared contracts**

`mobile-api.ts` defines:

```ts
export const MOBILE_API_VERSION = "v1";
export type MobileTaskStatus = "todo" | "in_progress" | "awaiting_reply" | "done";
export type MobileTaskPriority = "low" | "medium" | "high" | "urgent";
export type MobileTask = {
  id: string;
  title: string;
  description: string | null;
  status: MobileTaskStatus;
  priority: MobileTaskPriority;
  dueAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
};
export type MobileWorkspace = { id: string; name: string; role: "owner" | "admin" | "member" };
export type MobileProfile = { id: string; email: string; fullName: string | null; avatarUrl: string | null };
export type MobileMeResponse = { profile: MobileProfile; activeWorkspace: MobileWorkspace; workspaces: MobileWorkspace[] };
export type MobileTodayResponse = { date: string; generatedAt: string; now: MobileTask[]; later: MobileTask[]; openCount: number };
export type MobileTasksResponse = { tasks: MobileTask[] };
export type CreateMobileTaskRequest = { title: string; description?: string | null; priority?: MobileTaskPriority; dueAt?: string | null };
export type MobileApiError = { error: { code: string; message: string } };
```

Export the module from `index.ts` and add `"@freescale/types": "workspace:*"` to
`apps/api/package.json`.

- [ ] **Step 4: Verify GREEN and commit**

Run: `pnpm --filter @freescale/api test -- src/mobile-contracts.test.ts`

Expected: PASS. Commit: `feat: define mobile API contracts`.

### Task 2: Synchronization Timestamp For Tasks

**Files:**
- Create: `supabase/migrations/20260526211500_tasks_updated_at.sql`
- Modify: `supabase/APPLY_PENDING.sql`
- Modify: `apps/web/lib/supabase/database.types.ts`
- Test: `apps/api/src/mobile-schema.test.ts`

- [ ] **Step 1: Write the failing schema assertion**

```ts
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
```

- [ ] **Step 2: Run the test and verify RED**

Run: `pnpm --filter @freescale/api test -- src/mobile-schema.test.ts`

Expected: FAIL because the migration does not exist.

- [ ] **Step 3: Add the migration and aligned local schema artifacts**

Create the migration:

```sql
alter table public.tasks
  add column if not exists updated_at timestamptz not null default now();

drop trigger if exists tasks_touch_updated_at on public.tasks;
create trigger tasks_touch_updated_at
  before update on public.tasks
  for each row execute function public.touch_updated_at();
```

Mirror the SQL in `APPLY_PENDING.sql` and add `updated_at` to the local generated-style
`tasks.Row`, `tasks.Insert`, and `tasks.Update` shapes.

- [ ] **Step 4: Verify GREEN and commit**

Run: `pnpm --filter @freescale/api test -- src/mobile-schema.test.ts`

Expected: PASS. Commit: `feat: add task synchronization timestamp`.

### Task 3: Bearer Authentication And Supabase User Client

**Files:**
- Create: `apps/api/src/mobile/auth.ts`
- Create: `apps/api/src/mobile/supabase.ts`
- Modify: `apps/api/src/index.ts`
- Modify: `apps/api/wrangler.toml`
- Test: `apps/api/src/mobile-auth.test.ts`

- [ ] **Step 1: Write failing authentication tests**

Test a Hono app mounted with the mobile middleware:

```ts
it("rejects requests without a Supabase bearer session", async () => {
  const res = await app.request("/v1/me", {}, env);
  expect(res.status).toBe(401);
  await expect(res.json()).resolves.toEqual({
    error: { code: "unauthorized", message: "Authentification requise." },
  });
});

it("validates a bearer token using Supabase Auth before executing a route", async () => {
  fetchMock.mockResolvedValueOnce(json({ id: "user_1", email: "wacil@example.com" }));
  const res = await app.request("/v1/me", { headers: { Authorization: "Bearer token_1" } }, env);
  expect(fetchMock).toHaveBeenCalledWith(
    "https://supabase.example/auth/v1/user",
    expect.objectContaining({ headers: expect.objectContaining({ Authorization: "Bearer token_1" }) })
  );
});
```

- [ ] **Step 2: Run the tests and verify RED**

Run: `pnpm --filter @freescale/api test -- src/mobile-auth.test.ts`

Expected: FAIL because `/v1` authentication has not been mounted.

- [ ] **Step 3: Implement the authenticated boundary**

Add `SUPABASE_ANON_KEY` to the worker environment. `auth.ts` parses a single Bearer token,
requests `/auth/v1/user` using the anonymous API key plus bearer session, and stores
`mobileUser` and `mobileAccessToken` in Hono variables. `supabase.ts` builds PostgREST and RPC
fetches with the anonymous `apikey` and user `Authorization` header; it never sends the
service-role key for `/v1` endpoints.

- [ ] **Step 4: Verify GREEN and commit**

Run: `pnpm --filter @freescale/api test -- src/mobile-auth.test.ts`

Expected: PASS. Commit: `feat: authenticate mobile API sessions`.

### Task 4: Active Workspace And Profile Endpoint

**Files:**
- Create: `apps/api/src/mobile/workspace.ts`
- Create: `apps/api/src/mobile/routes.ts`
- Modify: `apps/api/src/index.ts`
- Test: `apps/api/src/mobile-routes.test.ts`

- [ ] **Step 1: Write failing `/v1/me` tests**

```ts
it("returns the user's accessible active workspace and profile", async () => {
  queueAuthUser();
  queueProfile({ id: "user_1", email: "wacil@example.com", full_name: "Wacil", avatar_url: null, active_workspace_id: "ws_2" });
  queueMemberships([
    { workspace_id: "ws_1", role: "member", workspaces: { id: "ws_1", name: "Team" } },
    { workspace_id: "ws_2", role: "owner", workspaces: { id: "ws_2", name: "Personal" } },
  ]);
  const res = await authorisedRequest("/v1/me");
  expect(res.status).toBe(200);
  expect(await res.json()).toMatchObject({ activeWorkspace: { id: "ws_2", role: "owner" } });
});

it("does not accept a workspace outside the user's memberships", async () => {
  queueAuthUser();
  queueProfile({ active_workspace_id: "foreign_ws" });
  queueMemberships([{ workspace_id: "ws_1", role: "member", workspaces: { id: "ws_1", name: "Team" } }]);
  const body = await (await authorisedRequest("/v1/me")).json();
  expect(body.activeWorkspace.id).toBe("ws_1");
});
```

- [ ] **Step 2: Run and verify RED**

Run: `pnpm --filter @freescale/api test -- src/mobile-routes.test.ts`

Expected: FAIL because the profile/workspace route is absent.

- [ ] **Step 3: Implement `/v1/me`**

Read the user's own profile and memberships with the user-token Supabase client. Select the
profile's active workspace only if it appears in returned memberships; otherwise choose the
first accessible membership. Return `404 workspace_not_found` if no workspace exists.

- [ ] **Step 4: Verify GREEN and commit**

Run: `pnpm --filter @freescale/api test -- src/mobile-routes.test.ts`

Expected: PASS for `/me` cases. Commit: `feat: expose mobile profile workspace`.

### Task 5: Task-First Today And Task Mutations

**Files:**
- Create: `apps/api/src/mobile/tasks.ts`
- Modify: `apps/api/src/mobile/routes.ts`
- Test: `apps/api/src/mobile-routes.test.ts`

- [ ] **Step 1: Add failing route tests**

Cover:

```ts
it("returns open active-workspace tasks and a task-first today grouping for the device day", async () => {
  // queue auth, active workspace, then task rows with due today, urgent later and normal later
  expect((await (await authorisedRequest("/v1/today?date=2026-05-26")).json()).now.map((task: { id: string }) => task.id)).toEqual(["today", "urgent"]);
});

it("creates a trimmed manual task only in the active workspace", async () => {
  const res = await authorisedRequest("/v1/tasks", {
    method: "POST",
    body: JSON.stringify({ title: "  Envoyer le devis  ", priority: "high" }),
  });
  expect(res.status).toBe(201);
  expect(lastSupabaseBody()).toMatchObject({ workspace_id: "ws_1", title: "Envoyer le devis", ai_generated: false });
});

it("rejects empty or invalid task payloads", async () => {
  expect((await authorisedRequest("/v1/tasks", { method: "POST", body: JSON.stringify({ title: " " }) })).status).toBe(400);
});

it("completes only a task filtered by the active workspace", async () => {
  const res = await authorisedRequest("/v1/tasks/task_1/complete", { method: "PATCH" });
  expect(res.status).toBe(200);
  expect(lastSupabaseUrl()).toContain("workspace_id=eq.ws_1");
});
```

- [ ] **Step 2: Run and verify RED**

Run: `pnpm --filter @freescale/api test -- src/mobile-routes.test.ts`

Expected: FAIL for missing task routes.

- [ ] **Step 3: Implement task endpoints**

Map database task rows to `MobileTask` including `updatedAt`. For `today`, validate the optional
`date` query as `YYYY-MM-DD`, use it as the device-local calendar boundary, include incomplete
tasks due through that day or with `high`/`urgent` priority in `now`, and put remaining open
tasks in `later`. `POST /tasks` validates title, priority and parseable ISO due date and inserts
a manual task in the resolved workspace. `PATCH /tasks/:id/complete` applies `status=done` and
`completed_at=now` filtered by both task and active workspace.

- [ ] **Step 4: Verify GREEN and commit**

Run: `pnpm --filter @freescale/api test -- src/mobile-routes.test.ts`

Expected: PASS. Commit: `feat: expose mobile today and tasks API`.

### Task 6: Account Deletion Endpoint And Release Verification

**Files:**
- Modify: `apps/api/src/mobile/routes.ts`
- Modify: `docs/app-store/J0_COMPLIANCE_CHECKLIST.md`
- Test: `apps/api/src/mobile-routes.test.ts`

- [ ] **Step 1: Add a failing deletion route test**

```ts
it("deletes only the authenticated account through the user-scoped RPC", async () => {
  queueAuthUser();
  queueRpcSuccess();
  const res = await authorisedRequest("/v1/account", { method: "DELETE" });
  expect(res.status).toBe(204);
  expect(lastSupabaseUrl()).toContain("/rest/v1/rpc/delete_user");
  expect(lastAuthorization()).toBe("Bearer token_1");
});
```

- [ ] **Step 2: Run and verify RED**

Run: `pnpm --filter @freescale/api test -- src/mobile-routes.test.ts`

Expected: FAIL because deletion is not mounted.

- [ ] **Step 3: Implement deletion and update the compliance record**

Call `rpc/delete_user` with the authenticated user's bearer token and return `204` on success.
Record that native deletion can consume this endpoint once J2 builds `Plus > Compte`. Record
that production use still requires applying the timestamp migration and configuring/deploying
`SUPABASE_ANON_KEY` for the Worker.

- [ ] **Step 4: Full verification and commit**

Run:

```bash
pnpm --filter @freescale/api test
pnpm --filter @freescale/api typecheck
pnpm --filter @freescale/api lint
pnpm --filter @freescale/types typecheck
pnpm test
pnpm typecheck
```

Expected: all commands exit `0`. Commit: `feat: expose mobile account deletion API`.
