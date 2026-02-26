import { createTask, findTaskByTitle, updateTaskStatus, listTasksByStatus, type Task } from "../db/index.js";

const STATUS_ICONS: Record<string, string> = { todo: "\u00b7", doing: "\u25cb", done: "\u2713" };

function formatTask(task: Task): string {
  const project = task.project ? ` [${task.project}]` : "";
  const age = timeAgo(task.updated_at);
  return `  ${task.title}${project} (${age})`;
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

export function taskStart(title: string, project?: string, parentTitle?: string): void {
  const existing = findTaskByTitle(title);
  if (existing) {
    updateTaskStatus(existing.id, "doing");
    console.log(`Moved to DOING: ${title}`);
  } else {
    const parentId = resolveParentId(parentTitle);
    createTask(title, "doing", project, undefined, parentId);
    console.log(`Created DOING: ${title}${parentTitle ? ` (subtask of "${parentTitle}")` : ""}`);
  }
}

export function taskDone(title: string): void {
  const existing = findTaskByTitle(title);
  if (existing) {
    updateTaskStatus(existing.id, "done");
    console.log(`Moved to DONE: ${title}`);
  } else {
    createTask(title, "done");
    console.log(`Created as DONE: ${title}`);
  }
}

export function taskTodo(title: string, project?: string, parentTitle?: string): void {
  const parentId = resolveParentId(parentTitle);
  createTask(title, "todo", project, undefined, parentId);
  console.log(`Added TODO: ${title}${parentTitle ? ` (subtask of "${parentTitle}")` : ""}`);
}

export function taskList(): void {
  const { todo, doing, done } = listTasksByStatus();

  const printColumn = (tasks: Task[], limit?: number) => {
    const tops = tasks.filter((t) => !t.parent_id);
    const subs = tasks.filter((t) => t.parent_id);
    if (tops.length === 0 && subs.length === 0) { console.log("  (none)"); return; }
    for (const t of limit ? tops.slice(0, limit) : tops) {
      console.log(formatTask(t));
      const children = subs.filter((s) => s.parent_id === t.id);
      for (const c of children) {
        console.log(`    ${STATUS_ICONS[c.status] ?? "·"} ${c.title} (${timeAgo(c.updated_at)})`);
      }
    }
    // Orphan subtasks whose parent is in a different column
    const shownParentIds = new Set(tops.map((t) => t.id));
    const orphans = subs.filter((s) => !shownParentIds.has(s.parent_id!));
    for (const o of orphans) console.log(formatTask(o));
  };

  console.log("\n=== DOING ===");
  printColumn(doing);

  console.log("\n=== TODO ===");
  printColumn(todo);

  console.log("\n=== DONE (recent) ===");
  printColumn(done, 10);

  console.log("");
}

function resolveParentId(parentTitle?: string): string | undefined {
  if (!parentTitle) return undefined;
  const parent = findTaskByTitle(parentTitle);
  if (!parent) {
    console.error(`Parent task not found: "${parentTitle}"`);
    process.exit(1);
  }
  return parent.id;
}
