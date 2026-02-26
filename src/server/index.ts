import { Hono } from "hono";
import { cors } from "hono/cors";
import { serveStatic } from "hono/bun";
import { api } from "./api.js";

const app = new Hono();

app.use("*", cors());
app.route("/api", api);

// Serve dashboard static files in production
app.use("/*", serveStatic({ root: "./dist/dashboard" }));

const PORT = 3457;

console.log(`Flywheel API server running on http://localhost:${PORT}`);

export default {
  port: PORT,
  fetch: app.fetch,
};
