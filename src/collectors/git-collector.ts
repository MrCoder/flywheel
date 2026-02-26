import { readdirSync, existsSync } from "fs";
import { join } from "path";

const WORKSPACE_ROOT = "/Users/pengxiao/workspaces";

export interface GitCommit {
  hash: string;
  author: string;
  date: string;
  message: string;
  project: string;
}

export interface GitActivity {
  project: string;
  commits: GitCommit[];
}

function findGitRepos(root: string, depth = 0, maxDepth = 2): string[] {
  if (depth > maxDepth) return [];
  const repos: string[] = [];

  try {
    const entries = readdirSync(root, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory() || entry.name === "node_modules" || entry.name === "dist" || entry.name.startsWith(".")) continue;
      const fullPath = join(root, entry.name);
      if (existsSync(join(fullPath, ".git"))) {
        repos.push(fullPath);
      } else if (depth < maxDepth) {
        repos.push(...findGitRepos(fullPath, depth + 1, maxDepth));
      }
    }
  } catch {
    // skip unreadable directories
  }
  return repos;
}

function getProjectName(repoPath: string): string {
  const rel = repoPath.replace(WORKSPACE_ROOT + "/", "");
  return rel;
}

async function getCommits(repoPath: string, since: string, until: string): Promise<GitCommit[]> {
  const project = getProjectName(repoPath);
  try {
    const proc = Bun.spawn(
      ["git", "log", `--since=${since}`, `--until=${until}`, "--pretty=format:%H|%an|%aI|%s", "--no-merges"],
      { cwd: repoPath, stdout: "pipe", stderr: "pipe" },
    );
    const output = await new Response(proc.stdout).text();
    await proc.exited;

    if (!output.trim()) return [];

    return output
      .trim()
      .split("\n")
      .map((line) => {
        const [hash, author, date, ...messageParts] = line.split("|");
        return { hash, author, date, message: messageParts.join("|"), project };
      });
  } catch {
    return [];
  }
}

export async function collectGitActivity(since: string, until: string): Promise<GitActivity[]> {
  const repos = findGitRepos(WORKSPACE_ROOT);
  const activities: GitActivity[] = [];

  const results = await Promise.all(
    repos.map(async (repoPath) => {
      const commits = await getCommits(repoPath, since, until);
      return { project: getProjectName(repoPath), commits };
    }),
  );

  for (const result of results) {
    if (result.commits.length > 0) {
      activities.push(result);
    }
  }

  return activities.sort((a, b) => b.commits.length - a.commits.length);
}
