// Hook: PostToolUse — log all tool/skill usage for analytics
// Data: ~/.claude/analytics/tool-usage.jsonl
module.exports = {
  name: "preuse-logger",
  event: "PostToolUse",
  handler: async (result) => {
    try {
      const fs = require('fs');
      const path = require('path');
      const logDir = path.join(process.env.HOME, '.claude', 'analytics');
      
      if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
      
      const entry = {
        ts: new Date().toISOString(),
        tool: result.tool,
        skill: result.skill || null,
        ms: result.durationMs || 0,
        ok: !result.error,
        cwd: process.cwd(),
      };
      
      fs.appendFileSync(
        path.join(logDir, 'tool-usage.jsonl'),
        JSON.stringify(entry) + '\n'
      );
    } catch (e) {
      // Silent fail — never block tool execution
    }
  }
};
