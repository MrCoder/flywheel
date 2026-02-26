import { readdirSync, readFileSync, existsSync } from "fs";
import { join, basename } from "path";

const GLOBAL_SKILLS_DIR = join(
  process.env.HOME || "/Users/pengxiao",
  ".claude",
  "skills"
);
const WORKSPACE_ROOT = "/Users/pengxiao/workspaces/zenuml";

export interface Skill {
  name: string;
  description: string;
  source: "global" | "project";
  project?: string;
  path: string;
  tags: string[];
}

function parseFrontmatter(content: string): Record<string, string> {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};
  const meta: Record<string, string> = {};
  for (const line of match[1].split("\n")) {
    const sep = line.indexOf(":");
    if (sep === -1) continue;
    const key = line.slice(0, sep).trim();
    const val = line.slice(sep + 1).trim();
    meta[key] = val;
  }
  return meta;
}

function parseTags(raw: string | undefined): string[] {
  if (!raw) return [];
  // Handle [tag1, tag2] format
  const inner = raw.replace(/^\[/, "").replace(/\]$/, "");
  return inner
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

function firstHeading(content: string): string | null {
  const match = content.match(/^#\s+(.+)/m);
  return match ? match[1].trim() : null;
}

function firstParagraph(content: string): string | null {
  // Skip frontmatter and headings, find first non-empty paragraph
  const body = content.replace(/^---[\s\S]*?---\n*/, "");
  for (const line of body.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    if (trimmed.startsWith("*") && trimmed.endsWith("*")) {
      return trimmed.replace(/^\*+/, "").replace(/\*+$/, "").trim();
    }
    return trimmed;
  }
  return null;
}

function collectGlobalSkills(): Skill[] {
  const skills: Skill[] = [];
  try {
    const entries = readdirSync(GLOBAL_SKILLS_DIR, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      if (entry.name.startsWith(".")) continue;

      const dir = join(GLOBAL_SKILLS_DIR, entry.name);
      const skillFile =
        [join(dir, "SKILL.md"), join(dir, "skill.md")].find(existsSync) ??
        null;
      if (!skillFile) continue;

      try {
        const content = readFileSync(skillFile, "utf-8");
        const meta = parseFrontmatter(content);
        skills.push({
          name: meta.name || entry.name,
          description:
            meta.description || firstHeading(content) || entry.name,
          source: "global",
          path: skillFile,
          tags: parseTags(meta.tags),
        });
      } catch {
        // skip unreadable
      }
    }
  } catch {
    // skip if dir doesn't exist
  }
  return skills;
}

function collectProjectCommands(): Skill[] {
  const skills: Skill[] = [];
  try {
    const projects = readdirSync(WORKSPACE_ROOT, { withFileTypes: true });
    for (const proj of projects) {
      if (!proj.isDirectory()) continue;
      if (proj.name.startsWith(".")) continue;

      const commandsDir = join(
        WORKSPACE_ROOT,
        proj.name,
        ".claude",
        "commands"
      );
      if (!existsSync(commandsDir)) continue;

      try {
        const files = readdirSync(commandsDir);
        for (const file of files) {
          if (!file.endsWith(".md")) continue;
          if (file === "README.md") continue;

          const filePath = join(commandsDir, file);
          try {
            const content = readFileSync(filePath, "utf-8");
            const name = basename(file, ".md");
            const desc =
              firstHeading(content) || firstParagraph(content) || name;
            skills.push({
              name: `/${name}`,
              description: desc,
              source: "project",
              project: proj.name,
              path: filePath,
              tags: [],
            });
          } catch {
            // skip unreadable
          }
        }
      } catch {
        // skip unreadable dir
      }
    }
  } catch {
    // skip if workspace doesn't exist
  }
  return skills;
}

export function collectSkills(): Skill[] {
  return [...collectGlobalSkills(), ...collectProjectCommands()];
}
