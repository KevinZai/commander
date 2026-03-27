// EXAMPLE: PostToolUse hook — log all tool/skill usage for analytics
// NOTE: This is a standalone example using the module.exports API.
// The actual hooks in this plugin use the command-based format in hooks.json.
// See hooks/README.md for the correct hook format.
//
// Data: ~/.claude/analytics/tool-usage.jsonl

let data = '';
process.stdin.on('data', chunk => data += chunk);
process.stdin.on('end', () => {
  try {
    const fs = require('fs');
    const path = require('path');
    const input = JSON.parse(data);
    const logDir = path.join(process.env.HOME, '.claude', 'analytics');

    if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });

    const entry = {
      ts: new Date().toISOString(),
      tool: input.tool_name,
      file: input.tool_input?.file_path || null,
      ms: input.tool_output?.durationMs || 0,
      ok: !input.tool_output?.error,
      cwd: process.cwd(),
    };

    fs.appendFileSync(
      path.join(logDir, 'tool-usage.jsonl'),
      JSON.stringify(entry) + '\n'
    );

    console.log(data);
  } catch (e) {
    // Silent fail — never block tool execution
    console.log(data);
  }
});
