import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";

type Env = {
  ENVIRONMENT: string;
  ANTHROPIC_API_KEY: string;
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
};

const app = new Hono<{ Bindings: Env }>();

app.use("*", logger());
app.use("*", cors({ origin: ["https://app.freescale.app", "http://localhost:3000"] }));

app.get("/", (c) => c.json({ name: "freescale-api", status: "ok" }));
app.get("/health", (c) => c.json({ ok: true, env: c.env.ENVIRONMENT }));

// Webhooks (to be implemented)
app.post("/webhooks/gmail", (c) => c.json({ todo: "gmail webhook" }));
app.post("/webhooks/slack", (c) => c.json({ todo: "slack webhook" }));
app.post("/webhooks/stripe", (c) => c.json({ todo: "stripe webhook" }));

// Mue endpoints (to be implemented)
app.post("/mue/chat", (c) => c.json({ todo: "mue chat" }));
app.post("/mue/summarize", (c) => c.json({ todo: "mue summarize" }));

export default app;
