import { searchSkills } from "./search-skills.js";

export type SuggestForArgs = { task: string };

export function suggestFor(args: SuggestForArgs) {
  // Extract keywords from task description
  const words = args.task
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 3);

  const results = searchSkills({ query: args.task, limit: 5 });

  return {
    task: args.task,
    suggestions: results.results,
    tip: "Use commander_invoke_skill to run any of these, or commander_get_skill for the full SKILL.md.",
    keywords: words.slice(0, 5),
  };
}
