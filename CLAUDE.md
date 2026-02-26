# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What Is Flywheel

A CLI-first personal work tracker with persistent memory, built for AI-assisted development workflows. It scans git history and Cursor agent transcripts to understand what you worked on, maintains a Kanban board, and remembers decisions.

## Commands

```bash
# Morning routine — scans git + transcripts, generates daily summary
bun run morning

# Task management
bun run cli task start "Task title"              # Create/move to DOING
bun run cli task done "Task title"               # Move to DONE
bun run cli task todo "Task title"               # Add to TODO
bun run cli task list                            # Show board

# Add flags: --project <name>
bun run cli task start "Fix parser" --project zenuml/zenuml-core

# Memory
bun run cli remember "Using D1 for storage" --project zenuml/conf-app --tags architecture
bun run cli search "D1"                          # Search memories
bun run cli memories                             # Recent memories

# Server (API + dashboard)
bun run serve                                    # API on :3457
bun run dev                                      # Vite dashboard on :3456 (proxies /api to :3457)
```

## Architecture

- **CLI** (`src/cli/`) — Bun scripts, entry point is `src/cli/index.ts`
- **Collectors** (`src/collectors/`) — git-collector, transcript-collector, file-collector
- **Database** (`src/db/`) — SQLite via `bun:sqlite`, stored in `data/flywheel.db`
- **API** (`src/server/`) — Hono server on port 3457
- **Dashboard** (`src/dashboard/`) — React 19 + Tailwind CSS 4, Vite dev on port 3456

## Tech Stack

Bun runtime, SQLite (bun:sqlite), Hono, React 19, Vite, Tailwind CSS 4.
