export type Tab = "board" | "memories" | "daily" | "skills";

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function tabLink(label: string, href: string, active: boolean): string {
  const cls = active
    ? "bg-zinc-800 text-zinc-100"
    : "text-zinc-500 hover:text-zinc-300";
  return `<a href="${href}" class="px-3 py-1.5 rounded text-sm font-medium transition-colors ${cls}">${label}</a>`;
}

export function layout(title: string, activeTab: Tab, body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)} - Flywheel</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-zinc-950 text-zinc-100 min-h-screen">
  <header class="border-b border-zinc-800 px-6 py-4 flex items-center justify-between">
    <h1 class="text-xl font-bold tracking-tight">Flywheel</h1>
    <nav class="flex gap-1">
      ${tabLink("Board", "index.html", activeTab === "board")}
      ${tabLink("Memories", "memories.html", activeTab === "memories")}
      ${tabLink("Daily", "daily.html", activeTab === "daily")}
      ${tabLink("Skills", "skills.html", activeTab === "skills")}
    </nav>
  </header>
  <main class="p-6">
    ${body}
  </main>
  <footer class="text-xs text-zinc-700 text-center py-4">
    Generated ${new Date().toISOString().replace("T", " ").slice(0, 19)}
  </footer>
</body>
</html>`;
}
