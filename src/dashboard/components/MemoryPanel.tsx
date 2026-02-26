import { useState, useEffect } from "react";

interface Memory {
  id: string;
  content: string;
  source: string;
  project: string | null;
  tags: string | null;
  created_at: string;
}

export function MemoryPanel() {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = () => {
      const url = query ? `/api/memories?q=${encodeURIComponent(query)}` : "/api/memories";
      fetch(url)
        .then((r) => r.json())
        .then((data) => { setMemories(data as Memory[]); setLoading(false); })
        .catch(() => setLoading(false));
    };
    load();
    const id = setInterval(load, 5000);
    return () => clearInterval(id);
  }, [query]);

  return (
    <div className="max-w-3xl">
      <input
        type="text"
        placeholder="Search memories..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500 mb-6"
      />
      {loading ? (
        <div className="text-zinc-500">Loading...</div>
      ) : memories.length === 0 ? (
        <div className="text-zinc-600 italic">No memories found</div>
      ) : (
        <div className="space-y-3">
          {memories.map((m) => (
            <div key={m.id} className="bg-zinc-900 rounded-lg p-4 border border-zinc-800">
              <div className="text-sm text-zinc-200">{m.content}</div>
              <div className="flex items-center gap-2 mt-2 text-xs text-zinc-500">
                <span className="bg-zinc-800 px-1.5 py-0.5 rounded">{m.source}</span>
                {m.project && (
                  <span className="bg-zinc-800 px-1.5 py-0.5 rounded">{m.project}</span>
                )}
                {m.tags && <span>{m.tags}</span>}
                <span className="ml-auto">{new Date(m.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
