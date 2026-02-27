import { useState, useEffect } from "react";

interface Activity {
  id: string;
  message: string;
  project: string | null;
  task_id: string | null;
  created_at: string;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

export function Timeline() {
  const [activities, setActivities] = useState<Activity[]>([]);

  useEffect(() => {
    const load = () => {
      fetch("/api/activities?limit=20")
        .then((r) => r.json())
        .then(setActivities)
        .catch(() => {});
    };
    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, []);

  if (activities.length === 0) return null;

  return (
    <div className="mt-6 border-t border-zinc-800 pt-4">
      <h2 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">
        Recent Activity
      </h2>
      <div className="max-h-48 overflow-y-auto space-y-1">
        {activities.map((a) => (
          <div key={a.id} className="flex items-baseline gap-2 text-sm">
            <span className="text-zinc-600 text-xs w-8 shrink-0 text-right">
              {timeAgo(a.created_at)}
            </span>
            <span className="text-zinc-400">{a.message}</span>
            {a.project && (
              <span className="text-xs text-zinc-600 bg-zinc-800/50 px-1.5 py-0.5 rounded">
                {a.project}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
