// ============================================================================
// Kevin Z's CC Commander — Auto Checkpoint (PostToolUse)
// ============================================================================
// Opt-in: runs only with CCC_AUTO_CHECKPOINT=1, and KZ_DISABLE_AUTO_CHECKPOINT=1
// turns it off again. Counts file edits (Edit or Write tool); every 10 edits
// it snapshots tracked changes with `git stash create` and stores the commit
// as refs/ccc-checkpoints/<session>/<count>. The working tree, the index and
// the stash list are left exactly as they were. Untracked files are not
// captured. Restore a checkpoint with: git stash apply <ref>
//
// Counter file: <tmpdir>/kz-edits-<session>
// ============================================================================

'use strict';

const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

function enabled(env) {
  return env.CCC_AUTO_CHECKPOINT === '1' && env.KZ_DISABLE_AUTO_CHECKPOINT !== '1';
}

// A session id becomes a file name and a ref component: keep it to a safe set.
function safeSession(raw) {
  const s = String(raw || 'default').replace(/[^A-Za-z0-9_-]/g, '-').replace(/^-+/, '').slice(0, 80);
  return s || 'default';
}

function git(args, cwd) {
  return execFileSync('git', args, {
    cwd,
    timeout: 5000,
    encoding: 'utf-8',
    stdio: ['pipe', 'pipe', 'pipe'],
  }).trim();
}

let data = '';
process.stdin.on('data', chunk => data += chunk);
process.stdin.on('end', () => {
  try {
    if (!enabled(process.env)) {
      console.log(data);
      return;
    }
    const input = JSON.parse(data);
    const toolName = input.tool_name || '';

    // Only count Edit and Write tools
    if (toolName !== 'Edit' && toolName !== 'Write') {
      console.log(data);
      return;
    }

    const sessionId = safeSession(input.session_id || process.env.CLAUDE_SESSION_ID || process.env.SESSION_ID);
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
      const cwd = typeof input.cwd === 'string' && input.cwd ? input.cwd : process.cwd();
      try {
        const commit = git(['stash', 'create', 'ccc-checkpoint-' + count], cwd);
        if (/^[0-9a-f]{40,64}$/.test(commit)) {
          const ref = `refs/ccc-checkpoints/${sessionId}/${count}`;
          git(['update-ref', '-m', 'ccc auto-checkpoint', ref, commit], cwd);
          process.stderr.write(`[auto-checkpoint] ${count} edits — checkpoint saved as ${ref} (tracked changes only)\n`);
        }
      } catch {
        // Not a repo, no commits yet, or git unavailable — silently continue
      }
    }

    console.log(data);
  } catch (e) {
    // Silent fail — never block tool execution
    console.log(data);
  }
});
