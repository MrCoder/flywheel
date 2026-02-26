export interface Task {
  id: string;
  title: string;
  description: string | null;
  status: string;
  project: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

export function TaskCard({ task }: { task: Task }) {
  return (
    <div className="bg-zinc-800 rounded-md p-3 border border-zinc-700/50">
      <div className="text-sm font-medium text-zinc-200">{task.title}</div>
      <div className="flex items-center gap-2 mt-2 text-xs text-zinc-500">
        {task.project && (
          <span className="bg-zinc-700/50 px-1.5 py-0.5 rounded">{task.project}</span>
        )}
        <span>{timeAgo(task.updated_at)}</span>
      </div>
    </div>
  );
}
