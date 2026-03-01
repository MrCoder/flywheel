import { Hono } from "hono";
import { cors } from "hono/cors";
import { serveStatic } from "hono/bun";
import {
  updateTaskStatus,
  createActivity,
  findTaskById,
} from "../db/index.js";
import { generateDashboard } from "../html/generate.js";

const app = new Hono();

app.use("*", cors());

// Only API endpoint: mark task as done (used by dashboard Done button)
app.patch("/api/tasks/:id", async (c) => {
  const id = c.req.param("id");
  const { status } = await c.req.json<{ status: string }>();
  if (!["todo", "doing", "done"].includes(status)) {
    return c.json({ error: "Invalid status" }, 400);
  }
  const task = findTaskById(id);
  if (!task) return c.json({ error: "Not found" }, 404);
  updateTaskStatus(id, status as "todo" | "doing" | "done");
  if (status === "done") {
    createActivity(`Completed: ${task.title}`, task.project ?? undefined, task.id);
  }
  // Regenerate static HTML so the page reflects the change on reload
  try { generateDashboard(); } catch { /* best effort */ }
  return c.json({ ok: true });
});

// Serve static dashboard files from dist/
app.use("/*", serveStatic({ root: "./dist" }));

const PORT = 3457;

console.log(`Flywheel server running on http://localhost:${PORT}`);

export default {
  port: PORT,
  fetch: app.fetch,
};
