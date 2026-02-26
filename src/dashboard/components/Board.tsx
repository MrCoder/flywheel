import { useState, useEffect } from "react";
import { TaskColumn, type Task } from "./TaskCard.js";

interface TasksByStatus {
  todo: Task[];
  doing: Task[];
  done: Task[];
}

export function Board() {
  const [tasks, setTasks] = useState<TasksByStatus>({ todo: [], doing: [], done: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = () =>
      fetch("/api/tasks")
        .then((r) => r.json())
        .then((data) => { setTasks(data as TasksByStatus); setLoading(false); })
        .catch(() => setLoading(false));
    load();
    const id = setInterval(load, 5000);
    return () => clearInterval(id);
  }, []);

  if (loading) return <div className="text-zinc-500">Loading...</div>;

  const allTasks = [...tasks.todo, ...tasks.doing, ...tasks.done];
  const topLevel = allTasks.filter((t) => !t.parent_id);

  const subtasksByParent = new Map<string, Task[]>();
  for (const t of allTasks) {
    if (!t.parent_id) continue;
    const list = subtasksByParent.get(t.parent_id) ?? [];
    list.push(t);
    subtasksByParent.set(t.parent_id, list);
  }

  if (topLevel.length === 0) {
    return <div className="text-zinc-500 italic">No tasks</div>;
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-2">
      {topLevel.map((task) => (
        <TaskColumn
          key={task.id}
          task={task}
          subtasks={subtasksByParent.get(task.id) ?? []}
        />
      ))}
    </div>
  );
}
