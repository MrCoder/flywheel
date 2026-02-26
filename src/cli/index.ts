import { morning } from "./morning.js";
import { taskStart, taskDone, taskTodo, taskList } from "./task.js";
import { remember, search, recent } from "./remember.js";
import { listSkills } from "./skills.js";

const [command, subcommand, ...args] = process.argv.slice(2);

async function main() {
  switch (command) {
    case "morning":
      await morning();
      break;

    case "task":
      switch (subcommand) {
        case "start":
          if (!args[0]) { console.error("Usage: bun run cli task start <title> [--project <name>]"); process.exit(1); }
          taskStart(args[0], parseFlag(args, "--project"));
          break;
        case "done":
          if (!args[0]) { console.error("Usage: bun run cli task done <title>"); process.exit(1); }
          taskDone(args[0]);
          break;
        case "todo":
          if (!args[0]) { console.error("Usage: bun run cli task todo <title> [--project <name>]"); process.exit(1); }
          taskTodo(args[0], parseFlag(args, "--project"));
          break;
        case "list":
          taskList();
          break;
        default:
          console.error("Usage: bun run cli task <start|done|todo|list> [args]");
          process.exit(1);
      }
      break;

    case "remember":
      if (!subcommand) { console.error("Usage: bun run cli remember <content> [--project <name>] [--tags <tags>]"); process.exit(1); }
      remember(subcommand, parseFlag(args, "--project"), parseFlag(args, "--tags"));
      break;

    case "search":
      if (!subcommand) { console.error("Usage: bun run cli search <query>"); process.exit(1); }
      search(subcommand);
      break;

    case "memories":
      recent(subcommand ? parseInt(subcommand) : 20);
      break;

    case "skills":
      listSkills();
      break;

    default:
      console.log(`
Flywheel - Personal Work Tracker

Commands:
  bun run morning                          Run morning routine
  bun run cli task start <title>           Start a task (DOING)
  bun run cli task done <title>            Complete a task (DONE)
  bun run cli task todo <title>            Add a task (TODO)
  bun run cli task list                    Show task board
  bun run cli remember <content>           Save a memory
  bun run cli search <query>               Search memories
  bun run cli memories [limit]             Show recent memories
  bun run cli skills                       List Claude skills & commands

Flags (for task/remember):
  --project <name>                         Associate with project
  --tags <comma,separated>                 Add tags (remember only)
`);
  }
}

function parseFlag(args: string[], flag: string): string | undefined {
  const idx = args.indexOf(flag);
  if (idx !== -1 && idx + 1 < args.length) return args[idx + 1];
  return undefined;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
