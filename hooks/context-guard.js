// ============================================================================
// Kevin Z's CC Commander — Context Guard (PostToolUse)
// ============================================================================
// Tracks approximate context usage by counting tool calls in a session.
// At call #50 (~70% context), warns and auto-saves a lightweight session
// summary to ~/.claude/sessions/auto-save-{sessionId}.md.
//
// Counter file: /tmp/kz-context-{sessionId}
// ============================================================================

'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');

let data = '';
process.stdin.on('data', chunk => data += chunk);
process.stdin.on('end', () => {
  try {
    const input = JSON.parse(data);
    const sessionId = process.env.CLAUDE_SESSION_ID || process.env.SESSION_ID || 'default';
    const counterFile = path.join(os.tmpdir(), `kz-context-${sessionId}`);

    let count = 0;
    try {
      count = parseInt(fs.readFileSync(counterFile, 'utf8').trim(), 10) || 0;
    } catch {
      // File doesn't exist yet
    }
    count++;

    try {
      fs.writeFileSync(counterFile, String(count));
    } catch {
      // Can't write counter — not critical
    }

    if (count === 50) {
      process.stderr.write('[context-guard] ~70% context used — session auto-saved. Consider /compact or fresh session.\n');

      try {
        const sessionsDir = path.join(os.homedir(), '.claude', 'sessions');
        if (!fs.existsSync(sessionsDir)) fs.mkdirSync(sessionsDir, { recursive: true });

        const summary = [
          `# Auto-saved Session — ${new Date().toISOString()}`,
          '',
          `- **Session ID:** ${sessionId}`,
          `- **Working Directory:** ${process.cwd()}`,
          `- **Tool Calls:** ${count}`,
          `- **Last Tool:** ${input.tool_name || 'unknown'}`,
          '',
          '> Auto-saved by context-guard at ~70% context usage.',
        ].join('\n');

        fs.writeFileSync(
          path.join(sessionsDir, `auto-save-${sessionId}.md`),
          summary + '\n'
        );
      } catch {
        // Silent fail — never block tool execution
      }
    }

    console.log(data);
  } catch (e) {
    // Silent fail — never block tool execution
    console.log(data);
  }
});
