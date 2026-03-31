// ============================================================================
// Kevin Z's CC Commander — Pre-Commit Verify (PreToolUse, matcher: Bash)
// ============================================================================
// Detects git commit commands and runs `npx tsc --noEmit` if the project
// has TypeScript. Blocks the commit (exit 2) if tsc fails.
// Only triggers on `git commit`, not other git commands.
// 10s timeout on tsc to keep it fast.
// ============================================================================

'use strict';

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

let data = '';
process.stdin.on('data', chunk => data += chunk);
process.stdin.on('end', () => {
  try {
    const input = JSON.parse(data);
    const cmd = input.tool_input?.command || '';

    // Only trigger on git commit commands
    if (!/\bgit\s+commit\b/.test(cmd)) {
      console.log(data);
      return;
    }

    // Check if project has TypeScript
    const cwd = process.cwd();
    const hasTsConfig = fs.existsSync(path.join(cwd, 'tsconfig.json'));
    let hasTsDep = false;

    if (!hasTsConfig) {
      try {
        const pkg = JSON.parse(fs.readFileSync(path.join(cwd, 'package.json'), 'utf8'));
        const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
        hasTsDep = 'typescript' in allDeps;
      } catch {
        // No package.json or can't parse — skip
      }
    }

    if (!hasTsConfig && !hasTsDep) {
      // No TypeScript in this project — allow through
      console.log(data);
      return;
    }

    // Run tsc --noEmit with 10s timeout
    try {
      execSync('npx tsc --noEmit', {
        cwd,
        timeout: 10000,
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
      });
      // TypeScript passed — allow the commit
      console.log(data);
    } catch (tscErr) {
      const errors = (tscErr.stdout || '') + (tscErr.stderr || '');
      const preview = errors.trim().split('\n').slice(0, 10).join('\n');
      process.stderr.write(`[pre-commit-verify] TypeScript errors found — commit blocked.\n${preview}\n`);
      process.exit(2);
    }
  } catch (e) {
    // Parse error or unexpected — allow through (don't block on hook failure)
    console.log(data);
  }
});
