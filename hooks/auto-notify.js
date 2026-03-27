// EXAMPLE: PostToolUse hook — notify when long operations complete
// NOTE: This is a standalone example. The actual hooks in this plugin use
// the command-based format in hooks.json. See hooks/README.md for details.
//
// To use this as a standalone hook, add to settings.json:
// { "matcher": "Bash", "hooks": [{ "type": "command", "command": "node ~/.claude/hooks/auto-notify.js" }] }

let data = '';
process.stdin.on('data', chunk => data += chunk);
process.stdin.on('end', () => {
  try {
    const input = JSON.parse(data);
    const durationMs = input.tool_output?.durationMs || 0;
    if (durationMs > 60000) {
      console.error(`[auto-notify] Operation took ${Math.round(durationMs / 1000)}s`);
    }
    console.log(data);
  } catch (e) {
    console.log(data);
  }
});
