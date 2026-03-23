// Hook: PreToolUse — block destructive commands without confirmation
// Claude Code hooks run as JS and can inspect tool calls before execution

const dangerousPatterns = [
  /rm\s+-rf?\s+[\/~]/,
  /DROP\s+(TABLE|DATABASE)/i,
  /git\s+push\s+--force/,
  /kubectl\s+delete/,
  /docker\s+system\s+prune/,
  /pm2\s+delete\s+all/,
  /truncate\s+table/i,
  /DELETE\s+FROM\s+\w+\s*;/i,
];

module.exports = {
  name: "careful-guard",
  event: "PreToolUse",
  handler: async (toolCall) => {
    if (toolCall.tool !== "exec" && toolCall.tool !== "shell") return;
    const cmd = toolCall.arguments?.command || "";
    for (const pattern of dangerousPatterns) {
      if (pattern.test(cmd)) {
        return {
          blocked: true,
          message: `⚠️ Destructive command detected: ${cmd.slice(0, 100)}...\nUse /careful off to disable this guard.`
        };
      }
    }
  }
};
