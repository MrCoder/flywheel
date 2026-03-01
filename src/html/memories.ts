import type { Memory } from "../db/index.js";
import { escapeHtml } from "./layout.js";

export function renderMemoriesPage(memories: Memory[]): string {
  if (memories.length === 0) {
    return `<div class="max-w-3xl"><div class="text-zinc-600 italic">No memories found</div></div>`;
  }

  const cards = memories.map(m => {
    const date = new Date(m.created_at).toLocaleDateString();
    return `<div class="bg-zinc-900 rounded-lg p-4 border border-zinc-800">
  <div class="text-sm text-zinc-200">${escapeHtml(m.content)}</div>
  <div class="flex items-center gap-2 mt-2 text-xs text-zinc-500">
    <span class="bg-zinc-800 px-1.5 py-0.5 rounded">${escapeHtml(m.source)}</span>
    ${m.project ? `<span class="bg-zinc-800 px-1.5 py-0.5 rounded">${escapeHtml(m.project)}</span>` : ""}
    ${m.tags ? `<span>${escapeHtml(m.tags)}</span>` : ""}
    <span class="ml-auto">${date}</span>
  </div>
</div>`;
  }).join("\n");

  return `<div class="max-w-3xl">
  <p class="text-xs text-zinc-600 mb-4">Showing ${memories.length} memories. Use <code class="bg-zinc-800 px-1 rounded">bun run cli search "query"</code> to search.</p>
  <div class="space-y-3">
    ${cards}
  </div>
</div>`;
}
