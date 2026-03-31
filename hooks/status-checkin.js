#!/usr/bin/env node
// ============================================================================
// Kevin Z's CC Commander — Status Check-in Hook (Stop)
// ============================================================================
// Displays a branded footer after every Claude response and a full task
// status check-in every N responses (default: 10).
//
// Environment variables:
//   KZ_CHECKIN_INTERVAL=10   Responses between full check-ins
//   KZ_CHECKIN_DISABLE=1     Suppress all check-in output
//   KZ_FOOTER=1              Show minimal footer on every response
// ============================================================================

'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');

// Import terminal art library
let art;
try {
  art = require(path.join(__dirname, '..', 'lib', 'terminal-art.js'));
} catch {
  // Fallback if lib not found — minimal inline version
  art = {
    COLORS: { mid: '\x1b[38;5;34m', bright: '\x1b[38;5;46m', dim: '\x1b[38;5;22m', white: '\x1b[38;5;255m', cyan: '\x1b[38;5;51m', reset: '\x1b[0m', bold: '\x1b[1m', gray: '\x1b[38;5;238m' },
    minimalFooter: () => `\x1b[38;5;22m━━━━━━\x1b[0m \x1b[38;5;34mKZ\x1b[0m \x1b[38;5;22m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\x1b[0m`,
    parseTodo: (c) => {
      if (!c) return { done: 0, total: 0, currentStep: null, nextStep: null };
      let done = 0, total = 0, cur = null, next = null;
      for (const l of c.split('\n')) {
        const t = l.trim();
        if (t.startsWith('- [x]') || t.startsWith('- [X]')) { done++; total++; }
        else if (t.startsWith('- [ ]')) {
          total++;
          const task = t.replace(/^- \[ \]\s*/, '').trim();
          if (!cur) cur = task; else if (!next) next = task;
        }
      }
      return { done, total, currentStep: cur, nextStep: next };
    },
    statusBlock: ({ step, nextStep, done, total }) => {
      const C = { mid: '\x1b[38;5;34m', bright: '\x1b[38;5;46m', dim: '\x1b[38;5;22m', white: '\x1b[38;5;255m', cyan: '\x1b[38;5;51m', reset: '\x1b[0m', bold: '\x1b[1m' };
      const w = 20, f = Math.round((done / Math.max(total, 1)) * w), e = w - f;
      const bar = `${C.mid}▐${C.bright}${'█'.repeat(f)}${C.dim}${'░'.repeat(e)}${C.mid}▌${C.reset}`;
      const lines = [
        `${C.mid}┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓${C.reset}`,
        `${C.mid}┃${C.reset}  ${C.bright}${C.bold}KZ KIT${C.reset}  ${bar}  ${C.white}${done}/${total}${C.reset} tasks done    ${C.mid}┃${C.reset}`,
        `${C.mid}┃${C.reset}  ${C.white}Step:${C.reset} ${(step || 'Working...').substring(0, 37).padEnd(37)}  ${C.mid}┃${C.reset}`,
      ];
      if (nextStep) lines.push(`${C.mid}┃${C.reset}  ${C.dim}Next:${C.reset} ${nextStep.substring(0, 37).padEnd(37)}  ${C.mid}┃${C.reset}`);
      lines.push(`${C.mid}┃${C.reset}                                               ${C.mid}┃${C.reset}`);
      lines.push(`${C.mid}┃${C.reset}  ${C.dim}Manage: /project:todo │ /checkpoint │ /verify${C.reset} ${C.mid}┃${C.reset}`);
      lines.push(`${C.mid}┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛${C.reset}`);
      return lines.join('\n');
    },
  };
}

async function main() {
  // Check if disabled
  if (process.env.KZ_CHECKIN_DISABLE === '1') {
    // Pass through stdin to stdout (hook protocol)
    process.stdin.pipe(process.stdout);
    return;
  }

  // Read stdin
  let input = '';
  for await (const chunk of process.stdin) {
    input += chunk;
  }

  // Pass through (required by hook protocol)
  process.stdout.write(input);

  // Get session ID for counter file
  const sessionId = process.env.CLAUDE_SESSION_ID || process.env.SESSION_ID || 'default';
  const counterFile = path.join(os.tmpdir(), `kz-checkin-${sessionId}`);
  const interval = parseInt(process.env.KZ_CHECKIN_INTERVAL || '10', 10);
  const showFooter = process.env.KZ_FOOTER === '1';

  // Read and increment counter
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

  // Full check-in every N responses
  if (count % interval === 0) {
    // Try to find tasks/todo.md in current working directory
    const todoPath = path.join(process.cwd(), 'tasks', 'todo.md');
    let todoContent = null;
    try {
      todoContent = fs.readFileSync(todoPath, 'utf8');
    } catch {
      // No todo.md — that's fine
    }

    if (todoContent) {
      const status = art.parseTodo(todoContent);
      if (status.total > 0) {
        const block = art.statusBlock({
          step: status.currentStep,
          nextStep: status.nextStep,
          done: status.done,
          total: status.total,
        });
        process.stderr.write('\n' + block + '\n');
        return;
      }
    }

    // No todo or no tasks — show a gentle reminder
    const C = art.COLORS;
    process.stderr.write(
      `\n${C.mid}━━━━━━${C.reset} ${C.bright}KZ${C.reset} ${C.dim}━━━ Response #${count} ━━━ Use /project:todo to track tasks ━━━${C.reset}\n`
    );
    return;
  }

  // Minimal footer on every response (if enabled)
  if (showFooter) {
    process.stderr.write('\n' + art.minimalFooter() + '\n');
  }
}

main().catch(() => {
  // Silent failure — hooks should never break Claude
});
