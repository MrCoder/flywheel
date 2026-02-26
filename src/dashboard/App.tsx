import { useState } from "react";
import { Board } from "./components/Board.js";
import { MemoryPanel } from "./components/MemoryPanel.js";
import { DailySummary } from "./components/DailySummary.js";

type Tab = "board" | "memories" | "summary";

export function App() {
  const [tab, setTab] = useState<Tab>("board");

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-800 px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold tracking-tight">Flywheel</h1>
        <nav className="flex gap-1">
          {(["board", "memories", "summary"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                tab === t
                  ? "bg-zinc-800 text-zinc-100"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {t === "board" ? "Board" : t === "memories" ? "Memories" : "Daily"}
            </button>
          ))}
        </nav>
      </header>
      <main className="p-6">
        {tab === "board" && <Board />}
        {tab === "memories" && <MemoryPanel />}
        {tab === "summary" && <DailySummary />}
      </main>
    </div>
  );
}
