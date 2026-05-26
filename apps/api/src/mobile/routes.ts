import { Hono } from "hono";
import {
  createMobileAuthMiddleware,
  type MobileApiEnvironment,
  type MobileAuthBindings,
} from "./auth";
import { createUserSupabaseClient } from "./supabase";
import { MobileRouteError, resolveMobileWorkspaceContext } from "./workspace";

export function createMobileRoutes<B extends MobileAuthBindings>() {
  const routes = new Hono<MobileApiEnvironment<B>>();

  routes.use("*", createMobileAuthMiddleware<B>());

  routes.get("/me", async (c) => {
    try {
      const client = createUserSupabaseClient(c.env, c.get("mobileAccessToken"));
      const result = await resolveMobileWorkspaceContext(client, c.get("mobileUser"));
      return c.json(result);
    } catch (error) {
      if (error instanceof MobileRouteError) {
        return c.json({ error: { code: error.code, message: error.message } }, error.status);
      }
      return c.json(
        { error: { code: "upstream_error", message: "Impossible de charger les données." } },
        502
      );
    }
  });

  return routes;
}
