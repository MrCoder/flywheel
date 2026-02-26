import { collectSkills, type Skill } from "../collectors/skills-collector.js";

export function listSkills(): void {
  const skills = collectSkills();

  const global = skills.filter((s) => s.source === "global");
  const project = skills.filter((s) => s.source === "project");

  console.log("\n=== Global Skills ===");
  if (global.length === 0) {
    console.log("  (none)");
  } else {
    for (const s of global) {
      const tags = s.tags.length ? ` [${s.tags.join(", ")}]` : "";
      console.log(`  ${s.name}${tags}`);
      console.log(`    ${s.description}`);
    }
  }

  // Group project commands by project
  const byProject = new Map<string, Skill[]>();
  for (const s of project) {
    const key = s.project!;
    if (!byProject.has(key)) byProject.set(key, []);
    byProject.get(key)!.push(s);
  }

  console.log("\n=== Project Commands ===");
  if (byProject.size === 0) {
    console.log("  (none)");
  } else {
    for (const [proj, cmds] of byProject) {
      console.log(`\n  [${proj}]`);
      for (const s of cmds) {
        console.log(`    ${s.name} — ${s.description}`);
      }
    }
  }

  console.log(
    `\nTotal: ${global.length} global skills, ${project.length} project commands\n`
  );
}
