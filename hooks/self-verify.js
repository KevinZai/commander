#!/usr/bin/env node
// ============================================================================
// Kevin Z's CC Commander — Self-Verify (Stop)
// ============================================================================
// On session Stop, checks for signs of incomplete work:
//   1. Unchecked items in tasks/todo.md
//   2. Uncommitted changes in git
//   3. TODO/FIXME comments in files modified during this session
// Warns on stderr if any issues found.
// ============================================================================

'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const C = {
  green: '\x1b[38;5;46m',
  cyan: '\x1b[38;5;51m',
  yellow: '\x1b[38;5;226m',
  dim: '\x1b[38;5;240m',
  reset: '\x1b[0m',
};

function exec(cmd) {
  try {
    return execSync(cmd, {
      cwd: process.cwd(),
      timeout: 5000,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();
  } catch {
    return '';
  }
}

let data = '';
process.stdin.on('data', chunk => data += chunk);
process.stdin.on('end', () => {
  try {
    // Pass through (required by hook protocol)
    console.log(data);

    const warnings = [];

    // 1. Check tasks/todo.md for unchecked items
    try {
      const todoPath = path.join(process.cwd(), 'tasks', 'todo.md');
      const content = fs.readFileSync(todoPath, 'utf8');
      const unchecked = content
        .split('\n')
        .filter(l => l.trim().startsWith('- [ ]'));
      const checked = content
        .split('\n')
        .filter(l => /^- \[x\]/i.test(l.trim()));

      if (unchecked.length > 0) {
        warnings.push(`${unchecked.length} unchecked task${unchecked.length === 1 ? '' : 's'} in todo.md (${checked.length} done)`);
      }
    } catch {
      // No todo.md — skip
    }

    // 2. Check git for uncommitted changes
    const statusRaw = exec('git status --porcelain');
    if (statusRaw) {
      const lines = statusRaw.split('\n').filter(Boolean);
      const staged = lines.filter(l => /^[MADRC]/.test(l)).length;
      const unstaged = lines.filter(l => /^.[MADRC?]/.test(l)).length;
      const parts = [];
      if (staged > 0) parts.push(`${staged} staged`);
      if (unstaged > 0) parts.push(`${unstaged} unstaged`);
      warnings.push(`${lines.length} uncommitted change${lines.length === 1 ? '' : 's'} (${parts.join(', ')})`);
    }

    // 3. Check for TODO/FIXME in modified files
    const modifiedFiles = exec('git diff --name-only HEAD 2>/dev/null') ||
                          exec('git diff --name-only');
    if (modifiedFiles) {
      let todoCount = 0;
      const files = modifiedFiles.split('\n').filter(Boolean);
      for (const file of files) {
        try {
          const fullPath = path.join(process.cwd(), file);
          if (!fs.existsSync(fullPath)) continue;
          // Only check text files that are likely code
          if (!/\.(js|ts|jsx|tsx|mjs|mts|py|rb|go|rs|java|c|cpp|h|hpp|css|scss|md)$/.test(file)) continue;
          const content = fs.readFileSync(fullPath, 'utf8');
          const matches = content.match(/\/\/\s*(TODO|FIXME)\b/gi);
          if (matches) todoCount += matches.length;
        } catch {
          // Can't read file — skip
        }
      }
      if (todoCount > 0) {
        warnings.push(`${todoCount} TODO/FIXME comment${todoCount === 1 ? '' : 's'} in modified files`);
      }
    }

    // Output warnings
    if (warnings.length > 0) {
      process.stderr.write(`\n${C.yellow}[self-verify]${C.reset} ${C.cyan}Incomplete work detected:${C.reset}\n`);
      for (const w of warnings) {
        process.stderr.write(`  ${C.dim}•${C.reset} ${w}\n`);
      }
      process.stderr.write(`${C.dim}  Run /verify for full check before ending session.${C.reset}\n\n`);
    }
  } catch (e) {
    // Silent fail — hooks should never break Claude
    console.log(data);
  }
});
