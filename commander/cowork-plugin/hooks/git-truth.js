#!/usr/bin/env node
// CC Commander — SessionStart git-truth hook
// Pillar 6 (truth over cache): opt-in best-effort refresh of the git credential
// bridge so branch-tip queries and pushes don't silently fail on a stale token.
//
// Silent no-op unless CCC_GIT_TRUTH=1 — this hook does nothing by default.
// When enabled, best-effort runs `gh auth setup-git` and swallows ALL errors:
// no gh installed, not logged in, network down, etc. never block a session.
//
// Outputs a single JSON line to stdout (Claude Code hook protocol).

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

async function main() {
  if (process.env.CCC_GIT_TRUTH !== '1') {
    process.stdout.write(JSON.stringify({ continue: true, suppressOutput: true }) + '\n');
    return;
  }

  try {
    await execFileAsync('gh', ['auth', 'setup-git'], { timeout: 5000 });
  } catch {
    // Fail-open — never block a session due to gh auth errors
  }

  process.stdout.write(JSON.stringify({ continue: true, suppressOutput: true }) + '\n');
}

main().catch(() => {
  // Last-resort catch — never let this hook crash a session
  process.stdout.write(JSON.stringify({ continue: true, suppressOutput: true }) + '\n');
});
