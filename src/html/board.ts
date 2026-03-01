import type { Task, Activity } from "../db/index.js";
import { escapeHtml, timeAgo } from "./layout.js";

interface TasksByStatus {
  todo: Task[];
  doing: Task[];
  done: Task[];
}

const BORDER_COLORS: Record<string, string> = {
  todo: "border-t-zinc-500",
  doing: "border-t-amber-400",
  done: "border-t-green-400",
};

const STATUS_ICONS: Record<string, string> = {
  todo: `<span class="text-zinc-500 w-4 text-sm leading-snug text-center shrink-0">□</span>`,
  doing: `<span class="text-amber-400 w-4 text-sm leading-snug text-center shrink-0 font-bold">■</span>`,
  done: `<span class="text-green-400 w-4 text-sm leading-snug text-center shrink-0">✓</span>`,
};

function doneButton(task: Task): string {
  if (task.status === "done") return "";
  return `<button
    onclick="fetch('/api/tasks/${task.id}',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({status:'done'})}).then(()=>location.reload()).catch(()=>{})"
    class="text-zinc-600 hover:text-green-400 shrink-0 text-xs" title="Mark as done">&#10003;</button>`;
}

function subtaskRow(task: Task): string {
  return `<div class="flex items-center gap-2 py-1 text-xs text-zinc-400">
  ${STATUS_ICONS[task.status] ?? STATUS_ICONS.todo}
  <span class="flex-1 truncate">${escapeHtml(task.title)}</span>
  ${doneButton(task)}
  <span class="text-zinc-600 shrink-0">${timeAgo(task.updated_at)}</span>
</div>`;
}

function taskCard(task: Task, subtasks: Task[]): string {
  const borderColor = BORDER_COLORS[task.status] ?? "border-t-zinc-500";
  const subtasksHtml = subtasks.length > 0
    ? `<div class="mt-3 pt-2 border-t border-zinc-700/50 pl-1">
        ${subtasks.map(subtaskRow).join("\n")}
      </div>`
    : "";

  return `<div class="border-t-2 ${borderColor} bg-zinc-900 rounded-lg p-4 min-w-[260px] w-[300px] shrink-0">
  <div class="flex items-start gap-2">
    ${STATUS_ICONS[task.status] ?? STATUS_ICONS.todo}
    <div class="flex-1 min-w-0">
      <div class="text-sm font-medium text-zinc-200 leading-snug">${escapeHtml(task.title)}</div>
      <div class="flex items-center gap-2 mt-1 text-xs text-zinc-500">
        ${task.project ? `<span class="bg-zinc-700/50 px-1.5 py-0.5 rounded truncate">${escapeHtml(task.project)}</span>` : ""}
        ${doneButton(task)}
        <span class="shrink-0">${timeAgo(task.updated_at)}</span>
      </div>
    </div>
  </div>
  ${subtasksHtml}
</div>`;
}

function dateNav(date: string, prevHref: string | null, nextHref: string | null, isToday: boolean): string {
  const prev = prevHref
    ? `<a href="${prevHref}" class="text-zinc-400 hover:text-zinc-200 px-2 py-1 text-lg">&larr;</a>`
    : `<span class="text-zinc-700 px-2 py-1 text-lg">&larr;</span>`;
  const next = nextHref
    ? `<a href="${nextHref}" class="text-zinc-400 hover:text-zinc-200 px-2 py-1 text-lg">&rarr;</a>`
    : `<span class="text-zinc-700 px-2 py-1 text-lg">&rarr;</span>`;
  const todayLink = !isToday
    ? `<a href="index.html" class="text-xs text-zinc-500 hover:text-zinc-300 ml-1">Today</a>`
    : "";

  return `<div class="flex items-center gap-3 mb-4">
  ${prev}
  <span class="text-sm font-medium text-zinc-300">${escapeHtml(date)}${isToday ? " (today)" : ""}</span>
  ${next}
  ${todayLink}
</div>`;
}

function timelineSection(activities: Activity[]): string {
  if (activities.length === 0) return "";
  const rows = activities.map(a => `<div class="flex items-baseline gap-2 text-sm">
    <span class="text-zinc-600 text-xs w-8 shrink-0 text-right">${timeAgo(a.created_at)}</span>
    <span class="text-zinc-400">${escapeHtml(a.message)}</span>
    ${a.project ? `<span class="text-xs text-zinc-600 bg-zinc-800/50 px-1.5 py-0.5 rounded">${escapeHtml(a.project)}</span>` : ""}
  </div>`).join("\n");

  return `<div class="mt-6 border-t border-zinc-800 pt-4">
  <h2 class="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">Recent Activity</h2>
  <div class="max-h-48 overflow-y-auto space-y-1">
    ${rows}
  </div>
</div>`;
}

export function renderBoardPage(
  date: string,
  tasks: TasksByStatus,
  activities: Activity[],
  prevHref: string | null,
  nextHref: string | null,
  isToday: boolean,
): string {
  const allTasks = [...tasks.doing, ...tasks.todo, ...tasks.done];
  const topLevel = allTasks.filter(t => !t.parent_id);

  const subtasksByParent = new Map<string, Task[]>();
  for (const t of allTasks) {
    if (!t.parent_id) continue;
    const list = subtasksByParent.get(t.parent_id) ?? [];
    list.push(t);
    subtasksByParent.set(t.parent_id, list);
  }

  const boardHtml = topLevel.length === 0
    ? `<div class="text-zinc-500 italic">No tasks for ${escapeHtml(date)}</div>`
    : `<div class="flex gap-4 overflow-x-auto pb-2">
        ${topLevel.map(t => taskCard(t, subtasksByParent.get(t.id) ?? [])).join("\n")}
      </div>`;

  return `${dateNav(date, prevHref, nextHref, isToday)}
${boardHtml}
${timelineSection(activities)}`;
}
