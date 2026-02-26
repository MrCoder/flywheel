import { useState, useEffect } from "react";
import { TaskCard, type Task } from "./TaskCard.js";

interface TasksByStatus {
  todo: Task[];
  doing: Task[];
  done: Task[];
}

const COLUMNS: { key: keyof TasksByStatus; label: string; color: string }[] = [
  { key: "doing", label: "DOING", color: "border-amber-500" },
  { key: "todo", label: "TODO", color: "border-blue-500" },
  { key: "done", label: "DONE", color: "border-green-500" },
];

export function Board() {
  const [tasks, setTasks] = useState<TasksByStatus>({ todo: [], doing: [], done: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/tasks")
      .then((r) => r.json())
      .then((data) => { setTasks(data as TasksByStatus); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-zinc-500">Loading...</div>;

  return (
    <div className="grid grid-cols-3 gap-6">
      {COLUMNS.map((col) => (
        <div key={col.key} className={`border-t-2 ${col.color} bg-zinc-900 rounded-lg p-4`}>
          <h2 className="text-sm font-semibold text-zinc-400 mb-4 tracking-wide">
            {col.label}{" "}
            <span className="text-zinc-600">({tasks[col.key].length})</span>
          </h2>
          <div className="space-y-3">
            {tasks[col.key].length === 0 && (
              <div className="text-zinc-600 text-sm italic">No tasks</div>
            )}
            {tasks[col.key].map((task) => (
              <TaskCard key={task.id} task={task} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
