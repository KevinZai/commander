// ============================================================================
// Kevin Z's CC Commander — Auto Checkpoint (PostToolUse)
// ============================================================================
// Counts file edits (Edit or Write tool). Every 10 edits, creates a git stash
// with message "kz-checkpoint-{count}" if there are uncommitted changes.
//
// Counter file: /tmp/kz-edits-{sessionId}
// ============================================================================

'use strict';

const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

let data = '';
process.stdin.on('data', chunk => data += chunk);
process.stdin.on('end', () => {
  try {
    const input = JSON.parse(data);
    const toolName = input.tool_name || '';

    // Only count Edit and Write tools
    if (toolName !== 'Edit' && toolName !== 'Write') {
      console.log(data);
      return;
    }

    const sessionId = process.env.CLAUDE_SESSION_ID || process.env.SESSION_ID || 'default';
    const counterFile = path.join(os.tmpdir(), `kz-edits-${sessionId}`);

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

    if (count % 10 === 0) {
      try {
        execFileSync('git', ['stash', 'push', '-m', 'kz-checkpoint-' + count], {
          cwd: process.cwd(),
          timeout: 5000,
          encoding: 'utf-8',
          stdio: ['pipe', 'pipe', 'pipe'],
        });
        process.stderr.write(`[auto-checkpoint] ${count} edits — checkpoint saved (git stash)\n`);
      } catch {
        // git stash failed (no changes, not a repo, etc.) — silently continue
      }
    }

    console.log(data);
  } catch (e) {
    // Silent fail — never block tool execution
    console.log(data);
  }
});
