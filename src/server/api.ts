import { Hono } from "hono";
import {
  listTasksByStatus,
  listMemories,
  searchMemories,
  listDailySummaries,
  getDailySummary,
} from "../db/index.js";

export const api = new Hono();

api.get("/tasks", (c) => {
  return c.json(listTasksByStatus());
});

api.get("/memories", (c) => {
  const query = c.req.query("q");
  const limit = parseInt(c.req.query("limit") ?? "50");
  if (query) {
    return c.json(searchMemories(query));
  }
  return c.json(listMemories(limit));
});

api.get("/summaries", (c) => {
  const limit = parseInt(c.req.query("limit") ?? "14");
  return c.json(listDailySummaries(limit));
});

api.get("/summaries/:date", (c) => {
  const summary = getDailySummary(c.req.param("date"));
  if (!summary) return c.json({ error: "Not found" }, 404);
  return c.json({ ...summary, summary_json: JSON.parse(summary.summary_json) });
});
