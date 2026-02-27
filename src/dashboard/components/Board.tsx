import { useState, useEffect, useCallback } from "react";
import { TaskColumn, type Task } from "./TaskCard.js";

interface TasksByStatus {
  todo: Task[];
  doing: Task[];
  done: Task[];
}

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatLocalDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function shiftDate(date: string, offset: number): string {
  const [y, m, d] = date.split("-").map(Number);
  const shifted = new Date(y, m - 1, d + offset);
  return formatLocalDate(shifted);
}

export function Board() {
  const [date, setDate] = useState(todayStr);
  const [tasks, setTasks] = useState<TasksByStatus>({ todo: [], doing: [], done: [] });
  const [loading, setLoading] = useState(true);

  const loadTasks = useCallback(() => {
    fetch(`/api/tasks?date=${date}`)
      .then((r) => r.json())
      .then((data) => { setTasks(data as TasksByStatus); setLoading(false); })
      .catch(() => setLoading(false));
  }, [date]);

  useEffect(() => {
    setLoading(true);
    loadTasks();
    const id = setInterval(loadTasks, 5000);
    return () => clearInterval(id);
  }, [loadTasks]);

  const handleDone = useCallback((id: string) => {
    fetch(`/api/tasks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "done" }),
    }).then(() => loadTasks());
  }, [loadTasks]);

  const isToday = date === todayStr();

  const allTasks = [...tasks.todo, ...tasks.doing, ...tasks.done];
  const topLevel = allTasks.filter((t) => !t.parent_id);

  const subtasksByParent = new Map<string, Task[]>();
  for (const t of allTasks) {
    if (!t.parent_id) continue;
    const list = subtasksByParent.get(t.parent_id) ?? [];
    list.push(t);
    subtasksByParent.set(t.parent_id, list);
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={() => setDate(shiftDate(date, -1))}
          className="text-zinc-400 hover:text-zinc-200 px-2 py-1 text-lg"
        >
          &larr;
        </button>
        <span className="text-sm font-medium text-zinc-300">
          {date}{isToday ? " (today)" : ""}
        </span>
        <button
          onClick={() => setDate(shiftDate(date, 1))}
          className="text-zinc-400 hover:text-zinc-200 px-2 py-1 text-lg disabled:opacity-30"
          disabled={isToday}
        >
          &rarr;
        </button>
        {!isToday && (
          <button
            onClick={() => setDate(todayStr())}
            className="text-xs text-zinc-500 hover:text-zinc-300 ml-1"
          >
            Today
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-zinc-500">Loading...</div>
      ) : topLevel.length === 0 ? (
        <div className="text-zinc-500 italic">No tasks for {date}</div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-2">
          {topLevel.map((task) => (
            <TaskColumn
              key={task.id}
              task={task}
              subtasks={subtasksByParent.get(task.id) ?? []}
              onDone={handleDone}
            />
          ))}
        </div>
      )}
    </div>
  );
}
