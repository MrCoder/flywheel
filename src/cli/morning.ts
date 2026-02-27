import { collectGitActivity } from "../collectors/git-collector.js";
import { collectTranscripts, extractMemories } from "../collectors/transcript-collector.js";
import { collectProjectContext } from "../collectors/file-collector.js";
import { createMemory, createTask, saveDailySummary, listTasks, listTasksForDate, findMostRecentTaskDate, hasTasksClonedFrom, today, type Task } from "../db/index.js";

function yesterday(): { since: string; until: string; dateStr: string } {
  const now = new Date();
  const y = new Date(now);
  y.setDate(y.getDate() - 1);
  y.setHours(0, 0, 0, 0);
  const end = new Date(now);
  end.setHours(0, 0, 0, 0);
  return {
    since: y.toISOString().split("T")[0],
    until: end.toISOString().split("T")[0],
    dateStr: y.toISOString().split("T")[0],
  };
}

function cloneTasksToToday(): { cloned: number; skipped: boolean } {
  const todayStr = today();
  const sourceDate = findMostRecentTaskDate(todayStr);
  if (!sourceDate) return { cloned: 0, skipped: false };

  if (hasTasksClonedFrom(sourceDate, todayStr)) {
    return { cloned: 0, skipped: true };
  }

  const sourceTasks = listTasksForDate(sourceDate);
  const incomplete = sourceTasks.filter(t => t.status !== "done");
  if (incomplete.length === 0) return { cloned: 0, skipped: false };

  const topLevel = incomplete.filter(t => !t.parent_id);
  const subtasks = incomplete.filter(t => t.parent_id);

  const subtasksByParent = new Map<string, Task[]>();
  for (const sub of subtasks) {
    const list = subtasksByParent.get(sub.parent_id!) ?? [];
    list.push(sub);
    subtasksByParent.set(sub.parent_id!, list);
  }

  let clonedCount = 0;

  for (const task of topLevel) {
    const newTask = createTask(
      task.title, task.status, task.project ?? undefined,
      task.description ?? undefined, undefined, todayStr, task.id,
    );
    clonedCount++;

    const children = subtasksByParent.get(task.id) ?? [];
    for (const sub of children) {
      createTask(
        sub.title, sub.status, sub.project ?? undefined,
        sub.description ?? undefined, newTask.id, todayStr, sub.id,
      );
      clonedCount++;
    }
    subtasksByParent.delete(task.id);
  }

  // Orphan subtasks whose parent was done — promote to top-level
  for (const [, orphans] of subtasksByParent) {
    for (const sub of orphans) {
      createTask(
        sub.title, sub.status, sub.project ?? undefined,
        sub.description ?? undefined, undefined, todayStr, sub.id,
      );
      clonedCount++;
    }
  }

  return { cloned: clonedCount, skipped: false };
}

export async function morning(): Promise<void> {
  const { since, until, dateStr } = yesterday();
  console.log(`\n============================`);
  console.log(`  Flywheel Morning Report`);
  console.log(`  ${dateStr}`);
  console.log(`============================\n`);

  // 1. Git activity
  console.log("Scanning git repos...");
  const gitActivity = await collectGitActivity(since, until);

  if (gitActivity.length > 0) {
    console.log(`\n--- Git Activity (${gitActivity.reduce((n, a) => n + a.commits.length, 0)} commits across ${gitActivity.length} projects) ---\n`);
    for (const activity of gitActivity) {
      console.log(`  ${activity.project}:`);
      for (const commit of activity.commits) {
        console.log(`    - ${commit.message}`);
      }
    }
  } else {
    console.log("\n--- No git activity yesterday ---");
  }

  // 2. Transcript activity
  console.log("\nScanning agent transcripts...");
  const sinceDate = new Date(since);
  const transcripts = collectTranscripts(sinceDate);

  if (transcripts.length > 0) {
    console.log(`\n--- Agent Transcripts (${transcripts.length} sessions) ---\n`);
    for (const t of transcripts.slice(0, 10)) {
      const userMsgs = t.entries.filter((e) => e.role === "user");
      const firstQuery = userMsgs[0]?.content.slice(0, 120) ?? "(no user message)";
      console.log(`  ${t.project}: "${firstQuery}..."`);
    }

    // Extract and save memories
    const memories = extractMemories(transcripts);
    if (memories.length > 0) {
      console.log(`\n--- Auto-extracted Memories (${memories.length}) ---\n`);
      for (const m of memories) {
        createMemory(m.content, "transcript", m.project);
        console.log(`  [${m.project}] ${m.content}`);
      }
    }
  } else {
    console.log("\n--- No recent agent transcripts ---");
  }

  // 3. Carry forward incomplete tasks from previous day
  console.log("\nCarrying forward incomplete tasks...");
  const cloneResult = cloneTasksToToday();
  if (cloneResult.skipped) {
    console.log("  (already carried forward today)");
  } else if (cloneResult.cloned > 0) {
    console.log(`  Carried forward ${cloneResult.cloned} tasks to today`);
  } else {
    console.log("  No incomplete tasks from previous day");
  }

  // 4. Current tasks (today)
  const doingTasks = listTasks("doing");
  const todoTasks = listTasks("todo");

  if (doingTasks.length > 0) {
    console.log(`\n--- Carried Forward (${doingTasks.length} DOING) ---\n`);
    for (const t of doingTasks) {
      const project = t.project ? ` [${t.project}]` : "";
      console.log(`  -> ${t.title}${project}`);
    }
  }

  if (todoTasks.length > 0) {
    console.log(`\n--- Backlog (${todoTasks.length} TODO) ---\n`);
    for (const t of todoTasks.slice(0, 10)) {
      const project = t.project ? ` [${t.project}]` : "";
      console.log(`  - ${t.title}${project}`);
    }
  }

  // 5. Project context for active projects
  const activeProjects = new Set<string>();
  for (const a of gitActivity) activeProjects.add(a.project);
  for (const t of [...doingTasks, ...todoTasks]) {
    if (t.project) activeProjects.add(t.project);
  }

  if (activeProjects.size > 0) {
    const contexts = collectProjectContext([...activeProjects]);
    const withTodos = contexts.filter((c) => c.todos.length > 0);
    if (withTodos.length > 0) {
      console.log(`\n--- TODOs from Project Files ---\n`);
      for (const ctx of withTodos) {
        console.log(`  ${ctx.project}:`);
        for (const todo of ctx.todos.slice(0, 5)) {
          console.log(`    - ${todo}`);
        }
      }
    }
  }

  // 6. Save daily summary
  const summaryData = {
    date: dateStr,
    gitActivity: gitActivity.map((a) => ({
      project: a.project,
      commitCount: a.commits.length,
      commits: a.commits.map((c) => c.message),
    })),
    transcriptCount: transcripts.length,
    memoriesExtracted: transcripts.length > 0 ? extractMemories(transcripts).length : 0,
    doingTasks: doingTasks.map((t: Task) => ({ title: t.title, project: t.project })),
    todoTasks: todoTasks.map((t: Task) => ({ title: t.title, project: t.project })),
  };

  saveDailySummary(dateStr, summaryData);

  console.log(`\n============================`);
  console.log(`  Summary saved for ${dateStr}`);
  console.log(`============================\n`);
}
