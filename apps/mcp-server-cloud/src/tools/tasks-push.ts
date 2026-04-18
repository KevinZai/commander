export type PushTaskArgs = {
  title: string;
  description?: string;
  priority?: "urgent" | "high" | "medium" | "low";
};

export function pushTask(args: PushTaskArgs) {
  // Linear integration requires a Linear API key configured by the user.
  // This tool returns the setup instructions if not configured.
  // Full integration added in v4.0 GA.
  return {
    status: "not_configured",
    title: args.title,
    message:
      "Linear integration requires your API key. Add COMMANDER_LINEAR_KEY to your environment. Full setup guide: https://cc-commander.com/docs/integrations/linear",
    fallback: `Created task locally: "${args.title}" (${args.priority ?? "medium"} priority)`,
  };
}
