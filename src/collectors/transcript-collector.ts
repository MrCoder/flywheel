import { readdirSync, readFileSync, existsSync, statSync } from "fs";
import { join } from "path";

const CURSOR_PROJECTS = join(process.env.HOME ?? "/Users/pengxiao", ".cursor/projects");

export interface TranscriptEntry {
  role: "user" | "assistant";
  content: string;
  timestamp?: string;
}

export interface TranscriptFile {
  path: string;
  project: string;
  entries: TranscriptEntry[];
  modifiedAt: Date;
}

export interface ExtractedMemory {
  content: string;
  project: string;
}

const DECISION_PATTERNS = [
  /decided to\s+(.+?)(?:\.|$)/gi,
  /chose\s+(.+?)(?:\s+over\s+.+?)?(?:\.|$)/gi,
  /going with\s+(.+?)(?:\.|$)/gi,
  /switched to\s+(.+?)(?:\.|$)/gi,
  /using\s+(\S+)\s+(?:instead of|rather than)\s+(.+?)(?:\.|$)/gi,
  /the (?:approach|solution|plan) is to\s+(.+?)(?:\.|$)/gi,
  /let'?s (?:go with|use)\s+(.+?)(?:\.|$)/gi,
];

function parseJsonlTranscript(filePath: string): TranscriptEntry[] {
  try {
    const content = readFileSync(filePath, "utf-8");
    const entries: TranscriptEntry[] = [];
    for (const line of content.split("\n")) {
      if (!line.trim()) continue;
      try {
        const parsed = JSON.parse(line);
        const role = parsed.role ?? parsed.type;
        let text = "";
        if (typeof parsed.message?.content === "string") {
          text = parsed.message.content;
        } else if (Array.isArray(parsed.message?.content)) {
          text = parsed.message.content
            .filter((c: { type: string }) => c.type === "text")
            .map((c: { text: string }) => c.text)
            .join("\n");
        } else if (typeof parsed.content === "string") {
          text = parsed.content;
        }
        if (role && text) {
          entries.push({ role: role === "user" ? "user" : "assistant", content: text });
        }
      } catch {
        // skip malformed lines
      }
    }
    return entries;
  } catch {
    return [];
  }
}

function parseTxtTranscript(filePath: string): TranscriptEntry[] {
  try {
    const content = readFileSync(filePath, "utf-8");
    const entries: TranscriptEntry[] = [];
    let currentRole: "user" | "assistant" | null = null;
    let currentContent: string[] = [];

    for (const line of content.split("\n")) {
      if (line.startsWith("user:") || line.startsWith("User:")) {
        if (currentRole && currentContent.length) {
          entries.push({ role: currentRole, content: currentContent.join("\n").trim() });
        }
        currentRole = "user";
        currentContent = [line.replace(/^[Uu]ser:\s*/, "")];
      } else if (line.startsWith("A:") || line.startsWith("assistant:") || line.startsWith("Assistant:")) {
        if (currentRole && currentContent.length) {
          entries.push({ role: currentRole, content: currentContent.join("\n").trim() });
        }
        currentRole = "assistant";
        currentContent = [line.replace(/^(?:A|[Aa]ssistant):\s*/, "")];
      } else if (currentRole) {
        currentContent.push(line);
      }
    }
    if (currentRole && currentContent.length) {
      entries.push({ role: currentRole, content: currentContent.join("\n").trim() });
    }
    return entries;
  } catch {
    return [];
  }
}

function getProjectFromPath(transcriptPath: string): string {
  // Path pattern: ~/.cursor/projects/<project-path-encoded>/agent-transcripts/...
  const parts = transcriptPath.replace(CURSOR_PROJECTS + "/", "").split("/");
  if (parts.length > 0) {
    // Cursor encodes project paths with dashes replacing slashes
    return parts[0].replace(/-/g, "/").replace(/^\/+/, "");
  }
  return "unknown";
}

export function collectTranscripts(since: Date): TranscriptFile[] {
  if (!existsSync(CURSOR_PROJECTS)) return [];

  const transcripts: TranscriptFile[] = [];

  try {
    const projectDirs = readdirSync(CURSOR_PROJECTS, { withFileTypes: true });
    for (const projectDir of projectDirs) {
      if (!projectDir.isDirectory()) continue;
      const transcriptDir = join(CURSOR_PROJECTS, projectDir.name, "agent-transcripts");
      if (!existsSync(transcriptDir)) continue;

      const files = readdirSync(transcriptDir, { withFileTypes: true, recursive: true });
      for (const file of files) {
        if (file.isDirectory()) continue;
        const filePath = join(transcriptDir, file.name);

        try {
          const stat = statSync(filePath);
          if (stat.mtime < since) continue;

          let entries: TranscriptEntry[] = [];
          if (file.name.endsWith(".jsonl")) {
            entries = parseJsonlTranscript(filePath);
          } else if (file.name.endsWith(".txt")) {
            entries = parseTxtTranscript(filePath);
          }

          if (entries.length > 0) {
            transcripts.push({
              path: filePath,
              project: getProjectFromPath(filePath),
              entries,
              modifiedAt: stat.mtime,
            });
          }
        } catch {
          // skip unreadable files
        }
      }
    }
  } catch {
    // cursor projects dir not accessible
  }

  return transcripts.sort((a, b) => b.modifiedAt.getTime() - a.modifiedAt.getTime());
}

export function extractMemories(transcripts: TranscriptFile[]): ExtractedMemory[] {
  const memories: ExtractedMemory[] = [];
  const seen = new Set<string>();

  for (const transcript of transcripts) {
    for (const entry of transcript.entries) {
      if (entry.role !== "assistant") continue;
      for (const pattern of DECISION_PATTERNS) {
        pattern.lastIndex = 0;
        let match: RegExpExecArray | null;
        while ((match = pattern.exec(entry.content)) !== null) {
          const memory = match[0].trim();
          if (memory.length < 10 || memory.length > 500) continue;
          const key = memory.toLowerCase();
          if (seen.has(key)) continue;
          seen.add(key);
          memories.push({ content: memory, project: transcript.project });
        }
      }
    }
  }

  return memories;
}
