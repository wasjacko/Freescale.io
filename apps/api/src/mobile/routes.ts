import { Hono } from "hono";
import {
  type MobileApiEnvironment,
  type MobileAuthBindings,
  createMobileAuthMiddleware,
} from "./auth";
import { createUserSupabaseClient } from "./supabase";
import {
  buildToday,
  completeMobileTask,
  createMobileTask,
  listMobileTasks,
  todayDate,
  validateCreateTask,
} from "./tasks";
import { MobileRouteError, resolveMobileWorkspaceContext } from "./workspace";

export function createMobileRoutes<B extends MobileAuthBindings>() {
  const routes = new Hono<MobileApiEnvironment<B>>();

  routes.use("*", createMobileAuthMiddleware<B>());

  const handleError = (error: unknown) => {
    if (error instanceof MobileRouteError) {
      return {
        status: error.status,
        payload: { error: { code: error.code, message: error.message } },
      };
    }
    return {
      status: 502 as const,
      payload: { error: { code: "upstream_error", message: "Impossible de charger les données." } },
    };
  };

  routes.get("/me", async (c) => {
    try {
      const client = createUserSupabaseClient(c.env, c.get("mobileAccessToken"));
      const result = await resolveMobileWorkspaceContext(client, c.get("mobileUser"));
      return c.json(result);
    } catch (error) {
      const failure = handleError(error);
      return c.json(failure.payload, failure.status);
    }
  });

  routes.get("/tasks", async (c) => {
    try {
      const client = createUserSupabaseClient(c.env, c.get("mobileAccessToken"));
      const context = await resolveMobileWorkspaceContext(client, c.get("mobileUser"));
      const tasks = await listMobileTasks(client, context.activeWorkspace.id);
      return c.json({ tasks });
    } catch (error) {
      const failure = handleError(error);
      return c.json(failure.payload, failure.status);
    }
  });

  routes.get("/today", async (c) => {
    const date = todayDate(c.req.query("date"));
    if (!date.ok) {
      return c.json({ error: { code: "invalid_request", message: date.message } }, 400);
    }
    try {
      const client = createUserSupabaseClient(c.env, c.get("mobileAccessToken"));
      const context = await resolveMobileWorkspaceContext(client, c.get("mobileUser"));
      const tasks = await listMobileTasks(client, context.activeWorkspace.id, true);
      return c.json(buildToday(tasks, date.value));
    } catch (error) {
      const failure = handleError(error);
      return c.json(failure.payload, failure.status);
    }
  });

  routes.post("/tasks", async (c) => {
    const payload = await c.req.json().catch(() => null);
    const input = validateCreateTask(payload);
    if (!input.ok) {
      return c.json({ error: { code: "invalid_request", message: input.message } }, 400);
    }
    try {
      const client = createUserSupabaseClient(c.env, c.get("mobileAccessToken"));
      const context = await resolveMobileWorkspaceContext(client, c.get("mobileUser"));
      const task = await createMobileTask(client, context.activeWorkspace.id, input.value);
      return c.json({ task }, 201);
    } catch (error) {
      const failure = handleError(error);
      return c.json(failure.payload, failure.status);
    }
  });

  routes.patch("/tasks/:id/complete", async (c) => {
    try {
      const client = createUserSupabaseClient(c.env, c.get("mobileAccessToken"));
      const context = await resolveMobileWorkspaceContext(client, c.get("mobileUser"));
      const task = await completeMobileTask(client, context.activeWorkspace.id, c.req.param("id"));
      return c.json({ task });
    } catch (error) {
      const failure = handleError(error);
      return c.json(failure.payload, failure.status);
    }
  });

  routes.delete("/account", async (c) => {
    try {
      const client = createUserSupabaseClient(c.env, c.get("mobileAccessToken"));
      const response = await client.request("/rest/v1/rpc/delete_user", {
        method: "POST",
        body: "{}",
      });
      if (!response.ok) {
        throw new MobileRouteError(
          "account_deletion_failed",
          502,
          "Impossible de supprimer le compte."
        );
      }
      return c.body(null, 204);
    } catch (error) {
      const failure = handleError(error);
      return c.json(failure.payload, failure.status);
    }
  });

  return routes;
}
