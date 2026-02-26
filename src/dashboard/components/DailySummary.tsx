import { useState, useEffect } from "react";

interface Summary {
  id: string;
  date: string;
  summary_json: string;
  created_at: string;
}

interface SummaryData {
  date: string;
  gitActivity: { project: string; commitCount: number; commits: string[] }[];
  transcriptCount: number;
  memoriesExtracted: number;
  doingTasks: { title: string; project: string | null }[];
  todoTasks: { title: string; project: string | null }[];
}

export function DailySummary() {
  const [summaries, setSummaries] = useState<Summary[]>([]);
  const [selected, setSelected] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/summaries")
      .then((r) => r.json())
      .then((data) => {
        setSummaries(data as Summary[]);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const selectSummary = (date: string) => {
    fetch(`/api/summaries/${date}`)
      .then((r) => r.json())
      .then((data) => setSelected((data as { summary_json: SummaryData }).summary_json))
      .catch(() => {});
  };

  if (loading) return <div className="text-zinc-500">Loading...</div>;

  return (
    <div className="flex gap-6">
      <div className="w-48 space-y-1">
        <h2 className="text-sm font-semibold text-zinc-400 mb-3">Past Days</h2>
        {summaries.length === 0 && (
          <div className="text-zinc-600 text-sm italic">No summaries yet</div>
        )}
        {summaries.map((s) => (
          <button
            key={s.date}
            onClick={() => selectSummary(s.date)}
            className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${
              selected?.date === s.date
                ? "bg-zinc-800 text-zinc-200"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            {s.date}
          </button>
        ))}
      </div>
      <div className="flex-1">
        {!selected ? (
          <div className="text-zinc-600 italic">Select a day to view</div>
        ) : (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold">{selected.date}</h2>

            {selected.gitActivity.length > 0 && (
              <section>
                <h3 className="text-sm font-semibold text-zinc-400 mb-2">Git Activity</h3>
                {selected.gitActivity.map((a) => (
                  <div key={a.project} className="mb-3">
                    <div className="text-sm font-medium text-zinc-300">{a.project} ({a.commitCount})</div>
                    <ul className="ml-4 text-sm text-zinc-500">
                      {a.commits.map((c, i) => <li key={i}>- {c}</li>)}
                    </ul>
                  </div>
                ))}
              </section>
            )}

            <section className="flex gap-6 text-sm">
              <div className="bg-zinc-900 rounded-lg p-4 border border-zinc-800 flex-1">
                <div className="text-zinc-400">Transcripts</div>
                <div className="text-2xl font-bold mt-1">{selected.transcriptCount}</div>
              </div>
              <div className="bg-zinc-900 rounded-lg p-4 border border-zinc-800 flex-1">
                <div className="text-zinc-400">Memories</div>
                <div className="text-2xl font-bold mt-1">{selected.memoriesExtracted}</div>
              </div>
            </section>

            {selected.doingTasks.length > 0 && (
              <section>
                <h3 className="text-sm font-semibold text-zinc-400 mb-2">In Progress</h3>
                <ul className="space-y-1 text-sm">
                  {selected.doingTasks.map((t, i) => (
                    <li key={i} className="text-zinc-300">
                      {t.title}
                      {t.project && <span className="text-zinc-600 ml-2">[{t.project}]</span>}
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
