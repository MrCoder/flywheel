# Flywheel - Personal Work Tracker with Memory

## Why Flywheel?

### The Problem

Working across ~29 ZenUML-related repositories with AI-assisted development (Cursor / Claude Code) creates a real problem: **context fragmentation**. Every day produces git commits, AI conversation transcripts, and decisions scattered across many projects. There is no single place to answer:

- What am I currently working on?
- What did I accomplish yesterday?
- Why did I choose Prisma over Drizzle three weeks ago for that project?
- What tasks are parked and waiting?

Existing tools don't fit this workflow. Jira is too heavy. TODO apps require manual entry. None of them integrate with an AI-first development style where conversations with Claude *are* the work.

### The Solution

Flywheel is a **CLI-first work tracker with persistent memory**, built for developers who use AI coding assistants daily. It:

1. **Automatically analyzes** git history and Cursor agent transcripts to understand what you worked on
2. **Maintains a Kanban board** (TODO / DOING / DONE) updated from the command line -- no manual drag-and-drop UI needed
3. **Remembers decisions** -- both auto-extracted from AI conversations and manually saved -- so you (and your AI assistant) never lose important context

The name "Flywheel" reflects the core idea: the more you use it, the better it gets. Your memory bank grows. Your daily summaries get richer. Your AI assistant has better context.

### Who Is It For?

A single heavy AI user (you) managing the ZenUML ecosystem projects under `zenuml/`. The tool is personal, local-only, and opinionated toward a CLI + AI workflow. Scoped to the `zenuml/` folder: core engine, Confluence integrations, IDE plugins, web apps, and related tools.

---

## What Is Included

### 1. The `/morning` Command (Core Feature)

A single command (`bun run morning`) that kicks off your workday:

- **Scans yesterday's git commits** across all repos in `zenuml/`
- **Parses recent Cursor agent transcripts** (both `.jsonl` and `.txt` formats) to extract what was discussed and decided
- **Reads project files** (`CLAUDE.md`, TODOs) for additional context
- **Carries forward** unfinished DOING tasks from previous days
- **Auto-extracts memories** -- key decisions, choices, and context from transcripts
- **Prints a formatted daily summary** to stdout for Claude to present
- **Updates the dashboard** with fresh data

### 2. Task Tracking (Kanban from the CLI)

Simple task state management driven entirely from the command line:

```
bun run cli task start "Migrate conf-app to Forge"    # creates a DOING task
bun run cli task done "Fix parser bug"                 # moves to DONE
bun run cli task todo "Add dark mode to dashboard"     # adds a TODO
bun run cli task list                                  # shows current board
```

Tasks are associated with projects and timestamped. No UI-based task creation or reordering -- the command line is the interface, and Claude is the operator.

### 3. Persistent Memory

Two ways memories enter the system:

- **Manual**: `bun run cli remember "Using D1 instead of KV for conf-app storage"` -- explicitly save a decision
- **Automatic**: The `/morning` command extracts key decisions from agent transcripts using pattern matching (decisions, choices, architectural calls)

Memories are searchable, tagged by project and source, and persist in SQLite so they survive across sessions.

### 4. Web Dashboard

A local web app (`localhost:3456`) providing a read-only view:

- **Kanban board** -- three columns (TODO, DOING, DONE) showing current task state
- **Memory panel** -- recent memories with search capability
- **Daily summary view** -- navigate past days to review what was accomplished
- Dark theme, minimal aesthetic, developer-tool feel
- No drag-and-drop, no inline editing -- it reflects CLI state, not the other way around

### 5. CLAUDE.md Integration

A `CLAUDE.md` file in the flywheel directory teaches Claude about all available commands. When you open Cursor on the workspace and say "run my morning routine," Claude knows to execute `bun run morning` in the flywheel directory.

---

## Architecture

```
                    +-----------------------+
                    |     Data Sources      |
                    +-----------------------+
                    | Git repos (~29 in     |
                    |   zenuml/)            |
                    | Agent transcripts     |
                    | CLAUDE.md / TODO files|
                    +-----------+-----------+
                                |
                                v
                    +-----------+-----------+
                    |      Collectors       |
                    +-----------------------+
                    | git-collector.ts      |
                    | transcript-collector  |
                    | file-collector.ts     |
                    +-----------+-----------+
                                |
                                v
                    +-----------+-----------+
                    |    SQLite Database    |
                    +-----------------------+
                    | tasks                 |
                    | memories              |
                    | daily_summaries       |
                    +-----------+-----------+
                          |           |
                          v           v
                  +-------+--+  +----+--------+
                  | CLI      |  | Hono API    |
                  | Commands |  | Server      |
                  +----------+  +----+--------+
                                     |
                                     v
                              +------+-------+
                              | React        |
                              | Dashboard    |
                              | localhost:3456|
                              +--------------+
```

### Tech Stack

| Component | Technology | Rationale |
|-----------|-----------|-----------|
| Runtime | Bun | Built-in SQLite, fast CLI startup, already used in workspace |
| API Server | Hono | Lightweight, runs natively on Bun, minimal overhead |
| Dashboard | React 19 + Vite + TailwindCSS 4 | Modern, fast HMR, utility-first styling |
| Database | SQLite via `bun:sqlite` | Zero-config, single file, perfect for local tool |
| Package | Single Bun project | Simple, no monorepo overhead for a personal tool |

### Project Structure

```
flywheel/
  package.json
  bunfig.toml
  tsconfig.json
  vite.config.ts
  CLAUDE.md
  PLAN.md                         # This file
  src/
    cli/
      index.ts                    # CLI entry point
      morning.ts                  # /morning routine
      remember.ts                 # Save memories
      task.ts                     # Task state transitions
    collectors/
      git-collector.ts            # Scan git logs across zenuml/ repos
      transcript-collector.ts     # Parse zenuml-related agent transcripts
      file-collector.ts           # Read CLAUDE.md, TODO files
    db/
      schema.ts                   # Table definitions
      index.ts                    # Connection + query helpers
    server/
      index.ts                    # Hono server entry
      api.ts                      # REST API routes
    dashboard/
      index.html
      main.tsx
      App.tsx
      components/
        Board.tsx                 # Kanban columns
        TaskCard.tsx              # Task card
        MemoryPanel.tsx           # Memory sidebar
        DailySummary.tsx          # Daily overview
  data/                           # gitignored, holds flywheel.db
```

### Database Schema

**tasks**
- `id` (TEXT, primary key, ULID)
- `title` (TEXT, required)
- `description` (TEXT, optional)
- `status` (TEXT: `todo` | `doing` | `done`)
- `project` (TEXT, optional -- e.g., `conf-app`, `zenuml-core`)
- `created_at` (TEXT, ISO timestamp)
- `updated_at` (TEXT, ISO timestamp)
- `completed_at` (TEXT, nullable)

**memories**
- `id` (TEXT, primary key, ULID)
- `content` (TEXT, the memory itself)
- `source` (TEXT: `manual` | `transcript` | `git`)
- `project` (TEXT, optional)
- `tags` (TEXT, comma-separated)
- `created_at` (TEXT, ISO timestamp)

**daily_summaries**
- `id` (TEXT, primary key, ULID)
- `date` (TEXT, `YYYY-MM-DD`, unique)
- `summary_json` (TEXT, JSON blob with structured daily data)
- `created_at` (TEXT, ISO timestamp)

---

## Data Sources

### Git Repositories

- Location: `/Users/pengxiao/workspaces/zenuml/` (single level -- each subdirectory is a repo)
- ~29 repos covering the ZenUML ecosystem:
  - **Core**: `zenuml-core`, `zenuml-core-25`, `mmd-zenuml-core`, `zicjin-core`
  - **Confluence**: `conf-app`, `confluence-plugin-cloud`, `confluence-cloud-fix-remember-mmd`
  - **IDE plugins**: `jetbrains-zenuml`, `vscode-extension`, `vscode-markdown-preview-enhanced`
  - **Web apps**: `web-sequence`, `web-sequence-mobile`, `zenuml-portal`, `zenuml-embed`
  - **Mermaid**: `mermaid-js-mermaid`, `mermaid-live-editor`, `mermaid-debug-install`
  - **Other**: `docs`, `context-engineering`, `diagramly-mcp-serverless`, `forge-q-and-a-creator`, `miro-clone-gemini`, etc.
- Collector runs `git log` with date filters to extract recent commits
- Groups activity by project for the daily summary

### Agent Transcripts

- Location: `/Users/pengxiao/.cursor/projects/Users-pengxiao-workspaces-zenuml-*/agent-transcripts/`
- Known transcript sources:
  - `Users-pengxiao-workspaces-zenuml-conf-app` (20 transcripts)
  - `Users-pengxiao-workspaces-zenuml-confluence-cloud-23` (9 transcripts)
  - Additional project-specific transcript directories as they appear
- Two formats:
  - **JSONL** (newer): Files in UUID subdirectories, each line is `{"role": "user"|"assistant", "message": {"content": [...]}}`
  - **TXT** (older): Plain text with `user:` and `A:` markers
- Collector parses both formats, extracts user queries and assistant responses
- Memory extractor looks for decision patterns (e.g., "decided to", "chose", "going with", "switched to")

### Project Files

- `CLAUDE.md` files in project directories contain project-specific context
- TODO markers in code or dedicated TODO files

---

## What Is NOT Included

- **No drag-and-drop UI** -- tasks are managed from the CLI only
- **No manual task creation in the dashboard** -- the web UI is read-only
- **No cloud sync or remote storage** -- everything is local SQLite
- **No user authentication** -- single-user local tool
- **No AI/LLM calls in the tool itself** -- the tool collects and displays data; Claude (running in Cursor) is the intelligence layer that interprets it
- **No mobile or remote access** -- localhost only

---

## Implementation Order

1. **Project scaffold** -- package.json, tsconfig, vite config, directory structure
2. **Database layer** -- SQLite schema, connection, query helpers
3. **Git collector** -- most reliable data source, straightforward to implement
4. **Transcript collector** -- parse both formats, extract content
5. **CLI task commands** -- start, done, todo, list
6. **CLI remember command** -- manual memory saving
7. **Morning command** -- orchestrate collectors, generate summary, extract memories
8. **Hono API server** -- serve data from SQLite as JSON
9. **React dashboard** -- Kanban board, memory panel, daily summary view
10. **CLAUDE.md** -- document commands so Claude knows how to operate Flywheel
