import { mkdirSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { layout } from "./layout.js";
import { renderBoardPage } from "./board.js";
import { renderMemoriesPage } from "./memories.js";
import { renderDailyPage } from "./daily.js";
import { renderSkillsPage } from "./skills.js";
import {
  listTasksByStatus,
  listActivities,
  listMemories,
  listDailySummaries,
  today,
  getDb,
} from "../db/index.js";
import { collectSkills } from "../collectors/skills-collector.js";

function getRecentDatesWithTasks(limit: number): string[] {
  const db = getDb();
  const rows = db.query<{ date: string }, [number]>(
    `SELECT DISTINCT date FROM tasks ORDER BY date DESC LIMIT ?`,
  ).all(limit);
  return rows.map(r => r.date);
}

function boardFilename(date: string, todayStr: string): string {
  return date === todayStr ? "index.html" : `board-${date}.html`;
}

export function generateDashboard(outputDir?: string): void {
  const dir = outputDir ?? join(dirname(new URL(import.meta.url).pathname), "../../dist");
  mkdirSync(dir, { recursive: true });

  const todayStr = today();
  const recentDates = getRecentDatesWithTasks(7);

  // Ensure today is in the list even if no tasks exist yet
  if (!recentDates.includes(todayStr)) {
    recentDates.unshift(todayStr);
  }

  // Generate board pages for each recent date
  for (let i = 0; i < recentDates.length; i++) {
    const date = recentDates[i];
    const isToday = date === todayStr;
    const prevHref = i + 1 < recentDates.length ? boardFilename(recentDates[i + 1], todayStr) : null;
    const nextHref = i > 0 ? boardFilename(recentDates[i - 1], todayStr) : null;

    const tasks = listTasksByStatus(date);
    const activities = isToday ? listActivities(20) : [];

    const html = layout(
      isToday ? "Board" : `Board ${date}`,
      "board",
      renderBoardPage(date, tasks, activities, prevHref, nextHref, isToday),
    );
    writeFileSync(join(dir, boardFilename(date, todayStr)), html);
  }

  // Memories page
  const memories = listMemories(100);
  writeFileSync(
    join(dir, "memories.html"),
    layout("Memories", "memories", renderMemoriesPage(memories)),
  );

  // Daily summaries page
  const summaries = listDailySummaries(14);
  writeFileSync(
    join(dir, "daily.html"),
    layout("Daily", "daily", renderDailyPage(summaries)),
  );

  // Skills page
  const skills = collectSkills();
  writeFileSync(
    join(dir, "skills.html"),
    layout("Skills", "skills", renderSkillsPage(skills)),
  );

  const pageCount = recentDates.length + 3; // board pages + memories + daily + skills
  console.log(`Dashboard generated: ${dir} (${pageCount} pages)`);
}
