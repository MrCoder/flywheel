import type { DailySummary } from "../db/index.js";
import { escapeHtml } from "./layout.js";

interface SummaryData {
  date: string;
  gitActivity: { project: string; commitCount: number; commits: string[] }[];
  transcriptCount: number;
  memoriesExtracted: number;
  doingTasks: { title: string; project: string | null }[];
  todoTasks: { title: string; project: string | null }[];
}

function renderSummaryDetail(data: SummaryData): string {
  const gitHtml = data.gitActivity.length > 0
    ? `<section>
        <h3 class="text-sm font-semibold text-zinc-400 mb-2">Git Activity</h3>
        ${data.gitActivity.map(a => `<div class="mb-3">
          <div class="text-sm font-medium text-zinc-300">${escapeHtml(a.project)} (${a.commitCount})</div>
          <ul class="ml-4 text-sm text-zinc-500">
            ${a.commits.map(c => `<li>- ${escapeHtml(c)}</li>`).join("\n")}
          </ul>
        </div>`).join("\n")}
      </section>`
    : "";

  const statsHtml = `<section class="flex gap-6 text-sm">
    <div class="bg-zinc-900 rounded-lg p-4 border border-zinc-800 flex-1">
      <div class="text-zinc-400">Transcripts</div>
      <div class="text-2xl font-bold mt-1">${data.transcriptCount}</div>
    </div>
    <div class="bg-zinc-900 rounded-lg p-4 border border-zinc-800 flex-1">
      <div class="text-zinc-400">Memories</div>
      <div class="text-2xl font-bold mt-1">${data.memoriesExtracted}</div>
    </div>
  </section>`;

  const doingHtml = data.doingTasks.length > 0
    ? `<section>
        <h3 class="text-sm font-semibold text-zinc-400 mb-2">In Progress</h3>
        <ul class="space-y-1 text-sm">
          ${data.doingTasks.map(t => `<li class="text-zinc-300">${escapeHtml(t.title)}${t.project ? `<span class="text-zinc-600 ml-2">[${escapeHtml(t.project)}]</span>` : ""}</li>`).join("\n")}
        </ul>
      </section>`
    : "";

  return `<div class="space-y-6">${gitHtml}${statsHtml}${doingHtml}</div>`;
}

export function renderDailyPage(summaries: DailySummary[]): string {
  if (summaries.length === 0) {
    return `<div class="text-zinc-600 italic">No summaries yet. Run <code class="bg-zinc-800 px-1 rounded">bun run morning</code> to generate.</div>`;
  }

  const sections = summaries.map((s, i) => {
    let data: SummaryData;
    try {
      data = JSON.parse(s.summary_json);
    } catch {
      return `<details${i === 0 ? " open" : ""}>
        <summary class="cursor-pointer text-sm font-semibold text-zinc-300 hover:text-zinc-100 py-2">${escapeHtml(s.date)}</summary>
        <div class="text-zinc-500 text-sm italic pl-4 pb-4">Invalid summary data</div>
      </details>`;
    }

    return `<details${i === 0 ? " open" : ""}>
  <summary class="cursor-pointer text-sm font-semibold text-zinc-300 hover:text-zinc-100 py-2">${escapeHtml(s.date)}</summary>
  <div class="pl-4 pb-4">
    ${renderSummaryDetail(data)}
  </div>
</details>`;
  }).join("\n<hr class=\"border-zinc-800\">\n");

  return `<div class="max-w-3xl space-y-2">
  <h2 class="text-sm font-semibold text-zinc-400 mb-3">Daily Summaries</h2>
  ${sections}
</div>`;
}
