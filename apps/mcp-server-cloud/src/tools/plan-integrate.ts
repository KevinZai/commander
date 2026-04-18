export type IntegratePlanArgs = { plan: string };

export function integratePlan(args: IntegratePlanArgs) {
  const lines = args.plan.trim().split("\n");
  const tasks = lines
    .filter((l) => l.match(/^[-*\d.]/))
    .map((l) => l.replace(/^[-*\d.]\s*/, "").trim())
    .filter((t) => t.length > 0);

  return {
    integrated: true,
    taskCount: tasks.length,
    tasks,
    planPreview: args.plan.slice(0, 500) + (args.plan.length > 500 ? "\n…" : ""),
    message: `Plan integrated: ${tasks.length} tasks identified. Use commander_tasks_push to create Linear issues.`,
  };
}
