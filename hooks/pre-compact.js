#!/usr/bin/env node
// ============================================================================
// Kevin Z's CC Commander — Pre-Compact (PreCompact)
// ============================================================================
// Auto-saves session state before context compaction. Captures working
// directory, git branch, git status, tool call count, and active tasks
// to ~/.claude/sessions/pre-compact-{sessionId}-{timestamp}.md.
//
// Environment variables:
//   CLAUDE_SESSION_ID or SESSION_ID — session identifier
// ============================================================================

'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

const C = {
  green: '\x1b[38;5;46m',
  cyan: '\x1b[38;5;51m',
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

    const sessionId = process.env.CLAUDE_SESSION_ID || process.env.SESSION_ID || 'default';
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const cwd = process.cwd();

    // Gather git state
    const branch = exec('git rev-parse --abbrev-ref HEAD');
    const statusRaw = exec('git status --porcelain');
    const modifiedFiles = statusRaw
      ? statusRaw.split('\n').filter(Boolean).map(l => l.trim())
      : [];

    // Count tool calls from context-guard counter
    let toolCalls = 0;
    try {
      const counterFile = path.join(os.tmpdir(), `kz-context-${sessionId}`);
      toolCalls = parseInt(fs.readFileSync(counterFile, 'utf8').trim(), 10) || 0;
    } catch {
      // No counter file — that's fine
    }

    // Read active tasks from tasks/todo.md
    let activeTasks = [];
    try {
      const todoPath = path.join(cwd, 'tasks', 'todo.md');
      const content = fs.readFileSync(todoPath, 'utf8');
      activeTasks = content
        .split('\n')
        .filter(l => l.trim().startsWith('- [ ]'))
        .map(l => l.trim().replace(/^- \[ \]\s*/, ''));
    } catch {
      // No todo.md — skip
    }

    // Build session state markdown
    const lines = [
      `# Pre-Compact Session State`,
      '',
      `> Auto-saved by pre-compact hook before context compaction.`,
      '',
      `## Session`,
      `- **Session ID:** ${sessionId}`,
      `- **Timestamp:** ${new Date().toISOString()}`,
      `- **Working Directory:** ${cwd}`,
      `- **Tool Calls:** ${toolCalls}`,
      '',
      `## Git State`,
      `- **Branch:** ${branch || 'N/A'}`,
      `- **Modified Files:** ${modifiedFiles.length}`,
    ];

    if (modifiedFiles.length > 0) {
      lines.push('');
      lines.push('```');
      for (const f of modifiedFiles.slice(0, 20)) {
        lines.push(f);
      }
      if (modifiedFiles.length > 20) {
        lines.push(`... and ${modifiedFiles.length - 20} more`);
      }
      lines.push('```');
    }

    if (activeTasks.length > 0) {
      lines.push('');
      lines.push('## Active Tasks');
      for (const task of activeTasks.slice(0, 15)) {
        lines.push(`- [ ] ${task}`);
      }
      if (activeTasks.length > 15) {
        lines.push(`- ... and ${activeTasks.length - 15} more`);
      }
    }

    lines.push('');
    lines.push('## Recovery');
    lines.push('After compaction, re-read CLAUDE.md and check tasks/todo.md for progress state.');
    lines.push('');

    // Write session state
    const sessionsDir = process.env.KC_SESSIONS_DIR || path.join(os.homedir(), '.claude', 'sessions');
    try {
      if (!fs.existsSync(sessionsDir)) {
        fs.mkdirSync(sessionsDir, { recursive: true });
      }
      const fileName = `pre-compact-${sessionId}-${timestamp}.md`;
      fs.writeFileSync(path.join(sessionsDir, fileName), lines.join('\n'));
      process.stderr.write(`${C.green}[pre-compact]${C.reset} ${C.cyan}Session state saved${C.reset} ${C.dim}→ ~/.claude/sessions/${fileName}${C.reset}\n`);
    } catch {
      process.stderr.write(`${C.dim}[pre-compact] Could not save session state${C.reset}\n`);
    }
  } catch (e) {
    // Silent fail — hooks should never break Claude
    console.log(data);
  }
});
