import { useState, useEffect } from "react";

interface Skill {
  name: string;
  description: string;
  source: "global" | "project";
  project?: string;
  path: string;
  tags: string[];
}

export function SkillsPanel() {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = () =>
      fetch("/api/skills")
        .then((r) => r.json())
        .then((data) => { setSkills(data as Skill[]); setLoading(false); })
        .catch(() => setLoading(false));
    load();
    const id = setInterval(load, 5000);
    return () => clearInterval(id);
  }, []);

  const global = skills.filter((s) => s.source === "global");
  const project = skills.filter((s) => s.source === "project");

  const byProject = new Map<string, Skill[]>();
  for (const s of project) {
    const key = s.project!;
    if (!byProject.has(key)) byProject.set(key, []);
    byProject.get(key)!.push(s);
  }

  if (loading) return <div className="text-zinc-500">Loading...</div>;

  return (
    <div className="max-w-4xl space-y-8">
      <section>
        <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wide mb-3">
          Global Skills ({global.length})
        </h2>
        {global.length === 0 ? (
          <div className="text-zinc-600 italic text-sm">No global skills found</div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {global.map((s) => (
              <div key={s.path} className="bg-zinc-900 rounded-lg p-4 border border-zinc-800">
                <div className="text-sm font-medium text-zinc-200">{s.name}</div>
                <div className="text-xs text-zinc-500 mt-1 line-clamp-2">{s.description}</div>
                {s.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {s.tags.map((t) => (
                      <span key={t} className="bg-zinc-800 text-zinc-500 px-1.5 py-0.5 rounded text-xs">
                        {t}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wide mb-3">
          Project Commands ({project.length})
        </h2>
        {byProject.size === 0 ? (
          <div className="text-zinc-600 italic text-sm">No project commands found</div>
        ) : (
          <div className="space-y-4">
            {[...byProject.entries()].map(([proj, cmds]) => (
              <div key={proj}>
                <h3 className="text-sm font-medium text-zinc-300 mb-2">{proj}</h3>
                <div className="grid grid-cols-3 gap-2">
                  {cmds.map((s) => (
                    <div key={s.path} className="bg-zinc-900 rounded-md p-3 border border-zinc-800">
                      <div className="text-sm font-medium text-zinc-300">{s.name}</div>
                      <div className="text-xs text-zinc-600 mt-1 truncate">{s.description}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
