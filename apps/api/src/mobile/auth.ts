import type { MiddlewareHandler } from "hono";

export type MobileAuthBindings = {
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
};

export type MobileAuthenticatedUser = {
  id: string;
  email: string | null;
};

export type MobileApiVariables = {
  mobileAccessToken: string;
  mobileUser: MobileAuthenticatedUser;
};

export type MobileApiEnvironment<B extends MobileAuthBindings = MobileAuthBindings> = {
  Bindings: B;
  Variables: MobileApiVariables;
};

function bearerToken(header: string | undefined): string | null {
  const match = header?.match(/^Bearer\s+(\S+)$/i);
  return match?.[1] ?? null;
}

export function createMobileAuthMiddleware<
  B extends MobileAuthBindings,
>(): MiddlewareHandler<MobileApiEnvironment<B>> {
  return async (c, next) => {
    const token = bearerToken(c.req.header("Authorization"));
    if (!token) {
      return c.json(
        { error: { code: "unauthorized", message: "Authentification requise." } },
        401
      );
    }
    if (!c.env.SUPABASE_URL || !c.env.SUPABASE_ANON_KEY) {
      return c.json(
        { error: { code: "server_configuration", message: "Service indisponible." } },
        500
      );
    }

    let response: Response;
    try {
      response = await fetch(new URL("/auth/v1/user", c.env.SUPABASE_URL).toString(), {
        method: "GET",
        headers: {
          apikey: c.env.SUPABASE_ANON_KEY,
          Authorization: `Bearer ${token}`,
        },
      });
    } catch {
      return c.json(
        { error: { code: "auth_unavailable", message: "Authentification indisponible." } },
        502
      );
    }

    if (!response.ok) {
      return c.json(
        { error: { code: "unauthorized", message: "Authentification requise." } },
        401
      );
    }

    const payload = (await response.json()) as { id?: unknown; email?: unknown };
    if (typeof payload.id !== "string") {
      return c.json(
        { error: { code: "unauthorized", message: "Authentification requise." } },
        401
      );
    }

    c.set("mobileAccessToken", token);
    c.set("mobileUser", {
      id: payload.id,
      email: typeof payload.email === "string" ? payload.email : null,
    });

    return next();
  };
}
