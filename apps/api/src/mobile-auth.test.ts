import { Hono } from "hono";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  type MobileApiEnvironment,
  type MobileAuthBindings,
  createMobileAuthMiddleware,
} from "./mobile/auth";
import { createUserSupabaseClient } from "./mobile/supabase";

type TestBindings = MobileAuthBindings & { SUPABASE_SERVICE_ROLE_KEY: string };

const env: TestBindings = {
  SUPABASE_URL: "https://supabase.example",
  SUPABASE_ANON_KEY: "anon_test",
  SUPABASE_SERVICE_ROLE_KEY: "service_must_not_leave_webhooks",
};

const app = new Hono<MobileApiEnvironment<TestBindings>>();
app.use("/v1/*", createMobileAuthMiddleware<TestBindings>());
app.get("/v1/me", (c) => c.json({ user: c.get("mobileUser") }));

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("mobile API authentication", () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    fetchMock.mockReset();
  });

  it("rejects requests without a Supabase bearer session", async () => {
    const res = await app.request("/v1/me", {}, env);

    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toEqual({
      error: { code: "unauthorized", message: "Authentification requise." },
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("validates the bearer token with Supabase Auth", async () => {
    fetchMock.mockResolvedValueOnce(json({ id: "user_1", email: "wacil@example.com" }));

    const res = await app.request("/v1/me", { headers: { Authorization: "Bearer token_1" } }, env);

    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://supabase.example/auth/v1/user",
      expect.objectContaining({
        headers: expect.objectContaining({
          apikey: "anon_test",
          Authorization: "Bearer token_1",
        }),
      })
    );
  });

  it("uses the user session for PostgREST requests", async () => {
    fetchMock.mockResolvedValueOnce(json([]));
    const client = createUserSupabaseClient(env, "token_1");

    await client.request("/rest/v1/tasks?select=id");

    expect(fetchMock).toHaveBeenCalledWith(
      "https://supabase.example/rest/v1/tasks?select=id",
      expect.objectContaining({
        headers: expect.objectContaining({
          apikey: "anon_test",
          Authorization: "Bearer token_1",
        }),
      })
    );
    expect(JSON.stringify(fetchMock.mock.calls)).not.toContain(env.SUPABASE_SERVICE_ROLE_KEY);
  });

  it("does not allow route options to replace the authenticated Supabase credentials", async () => {
    fetchMock.mockResolvedValueOnce(json([]));
    const client = createUserSupabaseClient(env, "token_1");

    await client.request("/rest/v1/tasks?select=id", {
      headers: {
        apikey: "untrusted_key",
        Authorization: "Bearer untrusted_token",
      },
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://supabase.example/rest/v1/tasks?select=id",
      expect.objectContaining({
        headers: expect.objectContaining({
          apikey: "anon_test",
          Authorization: "Bearer token_1",
        }),
      })
    );
  });
});
