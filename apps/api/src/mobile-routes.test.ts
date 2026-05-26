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
      json([
        { workspace_id: "ws_1", role: "member", workspaces: { id: "ws_1", name: "Team" } },
      ])
    );

    const body = (await (await authorisedRequest("/v1/me")).json()) as {
      activeWorkspace: { id: string };
    };

    expect(body.activeWorkspace.id).toBe("ws_1");
  });
});
