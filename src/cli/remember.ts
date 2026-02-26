import { createMemory, searchMemories, listMemories } from "../db/index.js";

export function remember(content: string, project?: string, tags?: string): void {
  const memory = createMemory(content, "manual", project, tags);
  console.log(`Saved memory: ${memory.content}`);
  if (project) console.log(`  Project: ${project}`);
  if (tags) console.log(`  Tags: ${tags}`);
}

export function search(query: string): void {
  const results = searchMemories(query);
  if (results.length === 0) {
    console.log(`No memories matching "${query}"`);
    return;
  }
  console.log(`\nFound ${results.length} memories:\n`);
  for (const m of results) {
    const project = m.project ? ` [${m.project}]` : "";
    const source = ` (${m.source})`;
    console.log(`  ${m.content}${project}${source}`);
    console.log(`    ${m.created_at}\n`);
  }
}

export function recent(limit = 20): void {
  const results = listMemories(limit);
  if (results.length === 0) {
    console.log("No memories yet.");
    return;
  }
  console.log(`\nRecent memories:\n`);
  for (const m of results) {
    const project = m.project ? ` [${m.project}]` : "";
    const source = ` (${m.source})`;
    console.log(`  ${m.content}${project}${source}`);
    console.log(`    ${m.created_at}\n`);
  }
}
