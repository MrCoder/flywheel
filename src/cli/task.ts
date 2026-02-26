import { createTask, findTaskByTitle, updateTaskStatus, listTasksByStatus, type Task } from "../db/index.js";

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

export function taskStart(title: string, project?: string): void {
  const existing = findTaskByTitle(title);
  if (existing) {
    updateTaskStatus(existing.id, "doing");
    console.log(`Moved to DOING: ${title}`);
  } else {
    createTask(title, "doing", project);
    console.log(`Created DOING: ${title}`);
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

export function taskTodo(title: string, project?: string): void {
  createTask(title, "todo", project);
  console.log(`Added TODO: ${title}`);
}

export function taskList(): void {
  const { todo, doing, done } = listTasksByStatus();

  console.log("\n=== DOING ===");
  if (doing.length === 0) console.log("  (none)");
  for (const t of doing) console.log(formatTask(t));

  console.log("\n=== TODO ===");
  if (todo.length === 0) console.log("  (none)");
  for (const t of todo) console.log(formatTask(t));

  console.log("\n=== DONE (recent) ===");
  if (done.length === 0) console.log("  (none)");
  for (const t of done.slice(0, 10)) console.log(formatTask(t));

  console.log("");
}
