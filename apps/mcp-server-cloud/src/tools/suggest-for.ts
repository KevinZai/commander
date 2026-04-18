import { searchSkills } from "./search-skills.js";

export type SuggestForArgs = { task: string };

export function suggestFor(args: SuggestForArgs) {
  const keywords = args.task
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 3)
    .slice(0, 8);

  const results = searchSkills({ query: args.task, limit: 5 });

  return {
    task: args.task,
    suggestions: results.results,
    tip: "Use commander_invoke_skill to activate any of these, or commander_get_skill for the full SKILL.md.",
    keywords,
  };
}
