import { readFileSync, existsSync } from "fs";
import { join } from "path";

const WORKSPACE_ROOT = "/Users/pengxiao/workspaces";

export interface ProjectContext {
  project: string;
  claudeMd: string | null;
  todos: string[];
}

function readFileOrNull(path: string): string | null {
  try {
    if (existsSync(path)) return readFileSync(path, "utf-8");
  } catch {
    // skip
  }
  return null;
}

function extractTodos(content: string): string[] {
  const todos: string[] = [];
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (/^(?:TODO|FIXME|HACK|XXX)[\s:]/i.test(trimmed)) {
      todos.push(trimmed);
    }
    if (/- \[ \]/.test(trimmed)) {
      todos.push(trimmed.replace(/^-\s*\[ \]\s*/, ""));
    }
  }
  return todos;
}

export function collectProjectContext(projects: string[]): ProjectContext[] {
  const contexts: ProjectContext[] = [];

  for (const project of projects) {
    const projectPath = join(WORKSPACE_ROOT, project);
    const claudeMd = readFileOrNull(join(projectPath, "CLAUDE.md"));
    const planMd = readFileOrNull(join(projectPath, "PLAN.md"));
    const readme = readFileOrNull(join(projectPath, "README.md"));

    const todos: string[] = [];
    if (claudeMd) todos.push(...extractTodos(claudeMd));
    if (planMd) todos.push(...extractTodos(planMd));
    if (readme) todos.push(...extractTodos(readme));

    contexts.push({ project, claudeMd, todos });
  }

  return contexts;
}
