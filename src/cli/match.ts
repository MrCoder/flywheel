import { query } from "@anthropic-ai/claude-agent-sdk";
import { listTasks, today } from "../db/index.js";

export async function resolveTaskTitle(userInput: string, date?: string): Promise<string | null> {
  const d = date ?? today();
  const tasks = listTasks(undefined, d).filter(t => t.status !== "done");

  if (tasks.length === 0) return null;

  // Exact match shortcut — no LLM needed
  const exact = tasks.find(t => t.title.toLowerCase() === userInput.toLowerCase());
  if (exact) return exact.title;

  const taskList = tasks
    .filter(t => !t.parent_id)
    .map(t => `- "${t.title}"${t.project ? ` [${t.project}]` : ""}`)
    .join("\n");

  const prompt = `Given these task titles:\n${taskList}\n\nThe user typed: "${userInput}"\n\nWhich task title is the user referring to? Reply with ONLY the exact title (no quotes, no explanation). If none match, reply with exactly: NO_MATCH`;

  let result = "";
  for await (const msg of query({
    prompt,
    options: {
      allowedTools: [],
      maxTurns: 1,
    },
  })) {
    if ("result" in msg && typeof msg.result === "string") {
      result = msg.result.trim();
    }
  }

  if (result === "NO_MATCH") return null;

  // Verify the LLM returned an actual task title
  const verified = tasks.find(t => t.title === result);
  return verified ? verified.title : null;
}
