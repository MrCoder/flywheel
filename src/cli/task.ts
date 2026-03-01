import { createTask, createActivity, findTaskByTitle, updateTaskStatus, listTasks, today, type Task } from "../db/index.js";
import { resolveTaskTitle } from "./match.js";

// ANSI escape codes
const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";
const DIM = "\x1b[2m";
const GREEN = "\x1b[32m";
const STRIKETHROUGH = "\x1b[9m";

function formatTask(task: Task, indent: number = 2): string {
  const project = task.project ? ` [${task.project}]` : "";
  const age = timeAgo(task.updated_at);
  const pad = " ".repeat(indent);
  const meta = `${DIM}${project} (${age})${RESET}`;

  switch (task.status) {
    case "done":
      return `${pad}${GREEN}${STRIKETHROUGH}✓ ${task.title}${RESET} ${meta}`;
    case "doing":
      return `${pad}${BOLD}■ ${task.title}${RESET} ${meta}`;
    case "todo":
      return `${pad}${DIM}□ ${task.title}${meta}${RESET}`;
    default:
      return `${pad}  ${task.title}${meta}`;
  }
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export async function taskStart(title: string, project?: string, parentTitle?: string): Promise<void> {
  const resolvedTitle = await resolveTaskTitle(title) ?? title;
  const existing = findTaskByTitle(resolvedTitle);
  if (existing) {
    updateTaskStatus(existing.id, "doing");
    createActivity(`Started: ${resolvedTitle}`, existing.project ?? project, existing.id);
    console.log(`Moved to DOING: ${resolvedTitle}`);
  } else {
    const parentId = await resolveParentId(parentTitle);
    const task = createTask(title, "doing", project, undefined, parentId);
    createActivity(`Started: ${title}`, task.project ?? undefined, task.id);
    console.log(`Created DOING: ${title}${parentTitle ? ` (subtask of "${parentTitle}")` : ""}`);
  }
}

export async function taskDone(title: string): Promise<void> {
  const resolvedTitle = await resolveTaskTitle(title) ?? title;
  const existing = findTaskByTitle(resolvedTitle);
  if (existing) {
    updateTaskStatus(existing.id, "done");
    createActivity(`Completed: ${resolvedTitle}`, existing.project ?? undefined, existing.id);
    console.log(`Moved to DONE: ${resolvedTitle}`);
  } else {
    const task = createTask(title, "done");
    createActivity(`Completed: ${title}`, task.project ?? undefined, task.id);
    console.log(`Created as DONE: ${title}`);
  }
}

export async function taskTodo(title: string, project?: string, parentTitle?: string): Promise<void> {
  const resolvedTitle = await resolveTaskTitle(title) ?? title;
  const existing = findTaskByTitle(resolvedTitle);
  if (existing) {
    updateTaskStatus(existing.id, "todo");
    console.log(`Moved to TODO: ${resolvedTitle}`);
  } else {
    const parentId = await resolveParentId(parentTitle);
    const task = createTask(title, "todo", project, undefined, parentId);
    createActivity(`Added: ${title}`, task.project ?? undefined, task.id);
    console.log(`Added TODO: ${title}${parentTitle ? ` (subtask of "${parentTitle}")` : ""}`);
  }
}

export function taskList(date?: string): void {
  const d = date ?? today();
  const all = listTasks(undefined, d);

  const label = d === today() ? " (today)" : "";
  console.log(`\nTasks for ${d}${label}\n`);

  const parents = all.filter((t) => !t.parent_id);
  const subs = all.filter((t) => t.parent_id);
  const subsByParent = new Map<string, Task[]>();
  for (const s of subs) {
    const list = subsByParent.get(s.parent_id!) ?? [];
    list.push(s);
    subsByParent.set(s.parent_id!, list);
  }

  // Order parents: doing → todo → done (capped at 10)
  const statusOrder: Record<string, number> = { doing: 0, todo: 1, done: 2 };
  parents.sort((a, b) => (statusOrder[a.status] ?? 9) - (statusOrder[b.status] ?? 9));

  // Cap done parents at 10
  let doneCount = 0;
  const visible: Task[] = [];
  for (const p of parents) {
    if (p.status === "done") {
      if (doneCount >= 10) continue;
      doneCount++;
    }
    visible.push(p);
  }

  if (visible.length === 0) {
    console.log(`${DIM}  (no tasks)${RESET}`);
  }

  for (const p of visible) {
    console.log(formatTask(p));
    const children = subsByParent.get(p.id);
    if (children) {
      for (const c of children) {
        console.log(formatTask(c, 4));
      }
    }
  }

  // Orphan subtasks whose parent isn't in this day's data
  const parentIds = new Set(parents.map((t) => t.id));
  const orphans = subs.filter((s) => !parentIds.has(s.parent_id!));
  for (const o of orphans) console.log(formatTask(o));

  console.log("");
}

async function resolveParentId(parentTitle?: string): Promise<string | undefined> {
  if (!parentTitle) return undefined;
  const resolvedTitle = await resolveTaskTitle(parentTitle) ?? parentTitle;
  const parent = findTaskByTitle(resolvedTitle);
  if (!parent) {
    console.error(`Parent task not found: "${parentTitle}"`);
    process.exit(1);
  }
  return parent.id;
}
