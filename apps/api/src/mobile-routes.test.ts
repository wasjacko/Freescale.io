import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import app from "./index";

const env = {
  ENVIRONMENT: "test",
  ANTHROPIC_API_KEY: "",
  SUPABASE_URL: "https://supabase.example",
  SUPABASE_ANON_KEY: "anon_test",
  SUPABASE_SERVICE_ROLE_KEY: "service_test",
  STRIPE_WEBHOOK_SECRET: "stripe_test",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("mobile v1 routes", () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    fetchMock.mockReset();
  });

  function authorisedRequest(path: string, init: RequestInit = {}) {
    return app.request(
      path,
      {
        ...init,
        headers: {
          Authorization: "Bearer token_1",
          ...(init.headers as Record<string, string> | undefined),
        },
      },
      env
    );
  }

  function queueAuthUser() {
    fetchMock.mockResolvedValueOnce(json({ id: "user_1", email: "wacil@example.com" }));
  }

  function queueActiveWorkspace() {
    fetchMock.mockResolvedValueOnce(
      json([
        {
          id: "user_1",
          email: "wacil@example.com",
          full_name: "Wacil",
          avatar_url: null,
          active_workspace_id: "ws_1",
        },
      ])
    );
    fetchMock.mockResolvedValueOnce(
      json([
        {
          workspace_id: "ws_1",
          role: "owner",
          workspaces: { id: "ws_1", name: "Personal" },
        },
      ])
    );
  }

  function queueContext() {
    queueAuthUser();
    queueActiveWorkspace();
  }

  function taskRow(
    overrides: Partial<{
      id: string;
      title: string;
      status: string;
      priority: string;
      due_at: string | null;
      completed_at: string | null;
    }> = {}
  ) {
    return {
      id: "task_1",
      title: "Preparer la reunion",
      description: null,
      status: "todo",
      priority: "medium",
      due_at: null,
      completed_at: null,
      created_at: "2026-05-25T10:00:00.000Z",
      updated_at: "2026-05-25T10:00:00.000Z",
      ...overrides,
    };
  }

  it("returns the user's accessible active workspace and profile", async () => {
    queueAuthUser();
    fetchMock.mockResolvedValueOnce(
      json([
        {
          id: "user_1",
          email: "wacil@example.com",
          full_name: "Wacil",
          avatar_url: null,
          active_workspace_id: "ws_2",
        },
      ])
    );
    fetchMock.mockResolvedValueOnce(
      json([
        { workspace_id: "ws_1", role: "member", workspaces: { id: "ws_1", name: "Team" } },
        {
          workspace_id: "ws_2",
          role: "owner",
          workspaces: { id: "ws_2", name: "Personal" },
        },
      ])
    );

    const res = await authorisedRequest("/v1/me");

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({
      profile: { id: "user_1", fullName: "Wacil" },
      activeWorkspace: { id: "ws_2", role: "owner" },
    });
  });

  it("falls back when the saved workspace is outside visible memberships", async () => {
    queueAuthUser();
    fetchMock.mockResolvedValueOnce(
      json([
        {
          id: "user_1",
          email: "wacil@example.com",
          full_name: null,
          avatar_url: null,
          active_workspace_id: "foreign_ws",
        },
      ])
    );
    fetchMock.mockResolvedValueOnce(
      json([{ workspace_id: "ws_1", role: "member", workspaces: { id: "ws_1", name: "Team" } }])
    );

    const body = (await (await authorisedRequest("/v1/me")).json()) as {
      activeWorkspace: { id: string };
    };

    expect(body.activeWorkspace.id).toBe("ws_1");
  });

  it("lists tasks only through the active workspace query", async () => {
    queueContext();
    fetchMock.mockResolvedValueOnce(json([taskRow()]));

    const res = await authorisedRequest("/v1/tasks");
    const body = (await res.json()) as { tasks: Array<{ id: string; updatedAt: string }> };

    expect(res.status).toBe(200);
    expect(body.tasks[0]).toMatchObject({
      id: "task_1",
      updatedAt: "2026-05-25T10:00:00.000Z",
    });
    expect(String(fetchMock.mock.calls.at(-1)?.[0])).toContain("workspace_id=eq.ws_1");
  });

  it("returns a task-first today grouping for the device calendar day", async () => {
    queueContext();
    fetchMock.mockResolvedValueOnce(
      json([
        taskRow({ id: "today", due_at: "2026-05-26T18:00:00.000Z" }),
        taskRow({ id: "urgent", priority: "urgent", due_at: "2026-06-01T10:00:00.000Z" }),
        taskRow({ id: "later", due_at: null }),
      ])
    );

    const body = (await (await authorisedRequest("/v1/today?date=2026-05-26")).json()) as {
      date: string;
      now: Array<{ id: string }>;
      later: Array<{ id: string }>;
    };

    expect(body.date).toBe("2026-05-26");
    expect(body.now.map((task) => task.id)).toEqual(["today", "urgent"]);
    expect(body.later.map((task) => task.id)).toEqual(["later"]);
  });

  it("rejects an invalid device calendar day", async () => {
    queueAuthUser();

    const res = await authorisedRequest("/v1/today?date=tomorrow");

    expect(res.status).toBe(400);
  });

  it("creates a trimmed manual task inside the active workspace", async () => {
    queueContext();
    fetchMock.mockResolvedValueOnce(
      json([taskRow({ id: "created", title: "Envoyer le devis", priority: "high" })])
    );

    const res = await authorisedRequest("/v1/tasks", {
      method: "POST",
      body: JSON.stringify({ title: "  Envoyer le devis  ", priority: "high" }),
    });
    const options = fetchMock.mock.calls.at(-1)?.[1] as RequestInit;
    const written = JSON.parse(String(options.body)) as Record<string, unknown>;

    expect(res.status).toBe(201);
    expect(written).toMatchObject({
      workspace_id: "ws_1",
      title: "Envoyer le devis",
      priority: "high",
      ai_generated: false,
    });
  });

  it("rejects an empty manual task before resolving a workspace", async () => {
    queueAuthUser();

    const res = await authorisedRequest("/v1/tasks", {
      method: "POST",
      body: JSON.stringify({ title: " " }),
    });

    expect(res.status).toBe(400);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("completes only a task filtered by the active workspace", async () => {
    queueContext();
    fetchMock.mockResolvedValueOnce(
      json([
        taskRow({
          status: "done",
          completed_at: "2026-05-26T12:00:00.000Z",
        }),
      ])
    );

    const res = await authorisedRequest("/v1/tasks/task_1/complete", { method: "PATCH" });
    const url = String(fetchMock.mock.calls.at(-1)?.[0]);

    expect(res.status).toBe(200);
    expect(url).toContain("id=eq.task_1");
    expect(url).toContain("workspace_id=eq.ws_1");
  });
});
