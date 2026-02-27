import { Database } from "bun:sqlite";
import { ulid } from "ulid";
import { SCHEMA, MIGRATIONS } from "./schema.js";
import { mkdirSync } from "fs";
import { dirname } from "path";

const DB_PATH = new URL("../../data/flywheel.db", import.meta.url).pathname;

let _db: Database | null = null;

export function getDb(): Database {
  if (_db) return _db;
  mkdirSync(dirname(DB_PATH), { recursive: true });
  _db = new Database(DB_PATH);
  _db.exec("PRAGMA journal_mode = WAL");
  _db.exec(SCHEMA);
  for (const sql of MIGRATIONS) {
    try { _db.exec(sql); } catch { /* column already exists */ }
  }
  // Post-migration: create indexes that depend on migrated columns
  try { _db.exec(`CREATE INDEX IF NOT EXISTS idx_tasks_date ON tasks(date)`); } catch { /* */ }
  // Backfill: give existing tasks without a date today's local date
  try { _db.run(`UPDATE tasks SET date = ? WHERE date IS NULL`, [today()]); } catch { /* no-op */ }
  return _db;
}

export function newId(): string {
  return ulid();
}

export function now(): string {
  return new Date().toISOString();
}

export function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// --- Tasks ---

export interface Task {
  id: string;
  title: string;
  description: string | null;
  status: "todo" | "doing" | "done";
  project: string | null;
  parent_id: string | null;
  date: string;
  source_task_id: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

export function createTask(
  title: string,
  status: "todo" | "doing" | "done",
  project?: string,
  description?: string,
  parentId?: string,
  date?: string,
  sourceTaskId?: string,
): Task {
  const db = getDb();
  const task: Task = {
    id: newId(),
    title,
    description: description ?? null,
    status,
    project: project ?? null,
    parent_id: parentId ?? null,
    date: date ?? today(),
    source_task_id: sourceTaskId ?? null,
    created_at: now(),
    updated_at: now(),
    completed_at: status === "done" ? now() : null,
  };
  db.run(
    `INSERT INTO tasks (id, title, description, status, project, parent_id, date, source_task_id, created_at, updated_at, completed_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [task.id, task.title, task.description, task.status, task.project, task.parent_id,
     task.date, task.source_task_id, task.created_at, task.updated_at, task.completed_at],
  );
  return task;
}

export function updateTaskStatus(id: string, status: "todo" | "doing" | "done"): void {
  const db = getDb();
  const completedAt = status === "done" ? now() : null;
  db.run(
    `UPDATE tasks SET status = ?, updated_at = ?, completed_at = COALESCE(?, completed_at) WHERE id = ?`,
    [status, now(), completedAt, id],
  );
}

export function findTaskById(id: string): Task | null {
  const db = getDb();
  return db.query<Task, [string]>(
    `SELECT * FROM tasks WHERE id = ?`,
  ).get(id) ?? null;
}

export function findTaskByTitle(title: string, date?: string): Task | null {
  const db = getDb();
  const d = date ?? today();
  return db.query<Task, [string, string]>(
    `SELECT * FROM tasks WHERE lower(title) = lower(?) AND date = ? AND status != 'done' ORDER BY updated_at DESC LIMIT 1`,
  ).get(title, d) ?? null;
}

export function listTasks(status?: string, date?: string): Task[] {
  const db = getDb();
  const d = date ?? today();
  if (status) {
    return db.query<Task, [string, string]>(
      `SELECT * FROM tasks WHERE status = ? AND date = ? ORDER BY updated_at DESC`,
    ).all(status, d);
  }
  return db.query<Task, [string]>(
    `SELECT * FROM tasks WHERE date = ? ORDER BY CASE status WHEN 'doing' THEN 0 WHEN 'todo' THEN 1 WHEN 'done' THEN 2 END, updated_at DESC`,
  ).all(d);
}

export function listTasksByStatus(date?: string): { todo: Task[]; doing: Task[]; done: Task[] } {
  return {
    todo: listTasks("todo", date),
    doing: listTasks("doing", date),
    done: listTasks("done", date),
  };
}

export function findMostRecentTaskDate(beforeDate: string): string | null {
  const db = getDb();
  const row = db.query<{ date: string }, [string]>(
    `SELECT DISTINCT date FROM tasks WHERE date < ? ORDER BY date DESC LIMIT 1`,
  ).get(beforeDate);
  return row?.date ?? null;
}

export function hasTasksClonedFrom(sourceDate: string, targetDate: string): boolean {
  const db = getDb();
  const row = db.query<{ count: number }, [string, string]>(
    `SELECT COUNT(*) as count FROM tasks
     WHERE date = ? AND source_task_id IN (SELECT id FROM tasks WHERE date = ?)`,
  ).get(targetDate, sourceDate);
  return (row?.count ?? 0) > 0;
}

export function listTasksForDate(date: string): Task[] {
  const db = getDb();
  return db.query<Task, [string]>(
    `SELECT * FROM tasks WHERE date = ? ORDER BY updated_at DESC`,
  ).all(date);
}

export function findActiveTopLevelTasks(date?: string): Task[] {
  const db = getDb();
  const d = date ?? today();
  return db.query<Task, [string]>(
    `SELECT * FROM tasks WHERE status = 'doing' AND parent_id IS NULL AND date = ? ORDER BY updated_at DESC`,
  ).all(d);
}

// --- Memories ---

export interface Memory {
  id: string;
  content: string;
  source: "manual" | "transcript" | "git";
  project: string | null;
  tags: string | null;
  created_at: string;
}

export function createMemory(
  content: string,
  source: "manual" | "transcript" | "git",
  project?: string,
  tags?: string,
): Memory {
  const db = getDb();
  const memory: Memory = {
    id: newId(),
    content,
    source,
    project: project ?? null,
    tags: tags ?? null,
    created_at: now(),
  };
  db.run(
    `INSERT INTO memories (id, content, source, project, tags, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [memory.id, memory.content, memory.source, memory.project, memory.tags, memory.created_at],
  );
  return memory;
}

export function searchMemories(query: string): Memory[] {
  const db = getDb();
  return db.query<Memory, [string]>(
    `SELECT * FROM memories WHERE content LIKE ? ORDER BY created_at DESC LIMIT 50`,
  ).all(`%${query}%`);
}

export function listMemories(limit = 50): Memory[] {
  const db = getDb();
  return db.query<Memory, [number]>(
    `SELECT * FROM memories ORDER BY created_at DESC LIMIT ?`,
  ).all(limit);
}

// --- Daily Summaries ---

export interface DailySummary {
  id: string;
  date: string;
  summary_json: string;
  created_at: string;
}

export function saveDailySummary(date: string, summaryJson: object): DailySummary {
  const db = getDb();
  const existing = db.query<DailySummary, [string]>(
    `SELECT * FROM daily_summaries WHERE date = ?`,
  ).get(date);

  if (existing) {
    db.run(`UPDATE daily_summaries SET summary_json = ?, created_at = ? WHERE date = ?`, [
      JSON.stringify(summaryJson),
      now(),
      date,
    ]);
    return { ...existing, summary_json: JSON.stringify(summaryJson), created_at: now() };
  }

  const summary: DailySummary = {
    id: newId(),
    date,
    summary_json: JSON.stringify(summaryJson),
    created_at: now(),
  };
  db.run(
    `INSERT INTO daily_summaries (id, date, summary_json, created_at) VALUES (?, ?, ?, ?)`,
    [summary.id, summary.date, summary.summary_json, summary.created_at],
  );
  return summary;
}

export function getDailySummary(date: string): DailySummary | null {
  const db = getDb();
  return db.query<DailySummary, [string]>(
    `SELECT * FROM daily_summaries WHERE date = ?`,
  ).get(date) ?? null;
}

export function listDailySummaries(limit = 14): DailySummary[] {
  const db = getDb();
  return db.query<DailySummary, [number]>(
    `SELECT * FROM daily_summaries ORDER BY date DESC LIMIT ?`,
  ).all(limit);
}

// --- Activities ---

export interface Activity {
  id: string;
  message: string;
  project: string | null;
  task_id: string | null;
  created_at: string;
}

export function createActivity(
  message: string,
  project?: string,
  taskId?: string,
): Activity {
  const db = getDb();
  const activity: Activity = {
    id: newId(),
    message,
    project: project ?? null,
    task_id: taskId ?? null,
    created_at: now(),
  };
  db.run(
    `INSERT INTO activities (id, message, project, task_id, created_at)
     VALUES (?, ?, ?, ?, ?)`,
    [activity.id, activity.message, activity.project, activity.task_id, activity.created_at],
  );
  return activity;
}

export function listActivities(limit = 20): Activity[] {
  const db = getDb();
  return db.query<Activity, [number]>(
    `SELECT * FROM activities ORDER BY created_at DESC LIMIT ?`,
  ).all(limit);
}
