export interface Task {
  id: string;
  title: string;
  description: string | null;
  status: string;
  project: string | null;
  parent_id: string | null;
  date: string;
  source_task_id: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

const BORDER_COLORS: Record<string, string> = {
  todo: "border-t-zinc-500",
  doing: "border-t-amber-400",
  done: "border-t-green-400",
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

function StatusIcon({ status }: { status: string }) {
  if (status === "done") {
    return <span className="text-green-400 w-4 text-center shrink-0">{"\u2713"}</span>;
  }
  if (status === "doing") {
    return <span className="text-amber-400 w-4 text-center shrink-0 animate-pulse">{"\u25cb"}</span>;
  }
  return <span className="text-zinc-500 w-4 text-center shrink-0">{"\u00b7"}</span>;
}

function DoneButton({ task, onDone }: { task: Task; onDone: (id: string) => void }) {
  if (task.status === "done") return null;
  return (
    <button
      onClick={() => onDone(task.id)}
      className="text-zinc-600 hover:text-green-400 shrink-0 text-xs"
      title="Mark as done"
    >
      {"\u2713"}
    </button>
  );
}

function SubtaskRow({ task, onDone }: { task: Task; onDone: (id: string) => void }) {
  return (
    <div className="flex items-center gap-2 py-1 text-xs text-zinc-400">
      <StatusIcon status={task.status} />
      <span className="flex-1 truncate">{task.title}</span>
      <DoneButton task={task} onDone={onDone} />
      <span className="text-zinc-600 shrink-0">{timeAgo(task.updated_at)}</span>
    </div>
  );
}

export function TaskColumn({ task, subtasks = [], onDone }: { task: Task; subtasks?: Task[]; onDone: (id: string) => void }) {
  const borderColor = BORDER_COLORS[task.status] ?? "border-t-zinc-500";

  return (
    <div className={`border-t-2 ${borderColor} bg-zinc-900 rounded-lg p-4 min-w-[260px] w-[300px] shrink-0`}>
      <div className="flex items-start gap-2">
        <StatusIcon status={task.status} />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-zinc-200 leading-snug">{task.title}</div>
          <div className="flex items-center gap-2 mt-1 text-xs text-zinc-500">
            {task.project && (
              <span className="bg-zinc-700/50 px-1.5 py-0.5 rounded truncate">{task.project}</span>
            )}
            <DoneButton task={task} onDone={onDone} />
            <span className="shrink-0">{timeAgo(task.updated_at)}</span>
          </div>
        </div>
      </div>
      {subtasks.length > 0 && (
        <div className="mt-3 pt-2 border-t border-zinc-700/50 pl-1">
          {subtasks.map((sub) => (
            <SubtaskRow key={sub.id} task={sub} onDone={onDone} />
          ))}
        </div>
      )}
    </div>
  );
}
