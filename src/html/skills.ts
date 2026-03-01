import type { Skill } from "../collectors/skills-collector.js";
import { escapeHtml } from "./layout.js";

export function renderSkillsPage(skills: Skill[]): string {
  const global = skills.filter(s => s.source === "global");
  const project = skills.filter(s => s.source === "project");

  const byProject = new Map<string, Skill[]>();
  for (const s of project) {
    const key = s.project!;
    if (!byProject.has(key)) byProject.set(key, []);
    byProject.get(key)!.push(s);
  }

  const globalHtml = global.length === 0
    ? `<div class="text-zinc-600 italic text-sm">No global skills found</div>`
    : `<div class="grid grid-cols-2 gap-3">
        ${global.map(s => `<div class="bg-zinc-900 rounded-lg p-4 border border-zinc-800">
          <div class="text-sm font-medium text-zinc-200">${escapeHtml(s.name)}</div>
          <div class="text-xs text-zinc-500 mt-1 line-clamp-2">${escapeHtml(s.description)}</div>
          ${s.tags.length > 0 ? `<div class="flex flex-wrap gap-1 mt-2">
            ${s.tags.map(t => `<span class="bg-zinc-800 text-zinc-500 px-1.5 py-0.5 rounded text-xs">${escapeHtml(t)}</span>`).join("")}
          </div>` : ""}
        </div>`).join("\n")}
      </div>`;

  const projectHtml = byProject.size === 0
    ? `<div class="text-zinc-600 italic text-sm">No project commands found</div>`
    : `<div class="space-y-4">
        ${[...byProject.entries()].map(([proj, cmds]) => `<div>
          <h3 class="text-sm font-medium text-zinc-300 mb-2">${escapeHtml(proj)}</h3>
          <div class="grid grid-cols-3 gap-2">
            ${cmds.map(s => `<div class="bg-zinc-900 rounded-md p-3 border border-zinc-800">
              <div class="text-sm font-medium text-zinc-300">${escapeHtml(s.name)}</div>
              <div class="text-xs text-zinc-600 mt-1 truncate">${escapeHtml(s.description)}</div>
            </div>`).join("\n")}
          </div>
        </div>`).join("\n")}
      </div>`;

  return `<div class="max-w-4xl space-y-8">
  <section>
    <h2 class="text-sm font-semibold text-zinc-400 uppercase tracking-wide mb-3">Global Skills (${global.length})</h2>
    ${globalHtml}
  </section>
  <section>
    <h2 class="text-sm font-semibold text-zinc-400 uppercase tracking-wide mb-3">Project Commands (${project.length})</h2>
    ${projectHtml}
  </section>
</div>`;
}
