#!/usr/bin/env node
// ============================================================================
// CC Commander — Session Coach (Stop)
// ============================================================================
// A periodic coaching nudge that fires every N responses and gives
// contextual recommendations based on what you're doing in the session.
//
// Analyzes session state (tool usage patterns, files touched, time elapsed)
// and suggests relevant skills, workflow improvements, and best practices.
//
// Environment variables:
//   KZ_COACH_INTERVAL=5     Responses between coaching nudges (default: 5)
//   KZ_COACH_DISABLE=1      Suppress all coaching output
// ============================================================================

'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');

const C = {
  green: '\x1b[38;5;46m',
  cyan: '\x1b[38;5;51m',
  yellow: '\x1b[38;5;226m',
  dim: '\x1b[38;5;240m',
  white: '\x1b[38;5;255m',
  bold: '\x1b[1m',
  reset: '\x1b[0m',
  line: '\x1b[38;5;22m',
};

async function main() {
  if (process.env.KZ_COACH_DISABLE === '1') {
    process.stdin.pipe(process.stdout);
    return;
  }

  let input = '';
  for await (const chunk of process.stdin) {
    input += chunk;
  }
  process.stdout.write(input);

  const sessionId = process.env.CLAUDE_SESSION_ID || process.env.SESSION_ID || 'default';
  const stateFile = path.join(os.tmpdir(), `kz-coach-${sessionId}.json`);
  const interval = parseInt(process.env.KZ_COACH_INTERVAL || '5', 10);

  // Load or initialize state
  let state = { count: 0, edits: 0, bashes: 0, reads: 0, errors: 0, files: [], startTime: Date.now(), lastTip: '' };
  try {
    state = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
  } catch { /* first run */ }

  state.count++;

  // Track tool usage from input
  try {
    const parsed = JSON.parse(input);
    const tool = parsed.tool_name || '';
    if (tool === 'Edit' || tool === 'Write') {
      state.edits++;
      const f = parsed.tool_input?.file_path || '';
      if (f && !state.files.includes(f)) state.files.push(f);
    }
    if (tool === 'Bash') state.bashes++;
    if (tool === 'Read') state.reads++;
    if (parsed.tool_output?.error) state.errors++;
  } catch { /* not JSON or missing fields */ }

  // Save state
  try { fs.writeFileSync(stateFile, JSON.stringify(state)); } catch { /* ok */ }

  // Only show coaching every N responses
  if (state.count % interval !== 0) return;

  // Generate contextual tips
  const tips = [];
  const cwd = process.cwd();
  const elapsed = Math.round((Date.now() - state.startTime) / 60000);

  // Check project context
  const hasTsConfig = fs.existsSync(path.join(cwd, 'tsconfig.json'));
  const hasPackageJson = fs.existsSync(path.join(cwd, 'package.json'));
  const hasTests = fs.existsSync(path.join(cwd, 'tests')) || fs.existsSync(path.join(cwd, '__tests__')) || fs.existsSync(path.join(cwd, 'test'));
  const hasClaude = fs.existsSync(path.join(cwd, 'CLAUDE.md'));
  const hasTasks = fs.existsSync(path.join(cwd, 'tasks', 'todo.md'));

  // Workflow coaching
  if (state.edits > 5 && state.bashes < 2) {
    tips.push('Lots of edits but few bash runs — have you tested your changes? Try /verify');
  }
  if (state.edits > 10 && !hasTasks) {
    tips.push('10+ edits without task tracking — use /plan or tasks/todo.md to stay organized');
  }
  if (state.errors > 3) {
    tips.push(`${state.errors} errors this session — consider /tdd to write tests first, or /build-fix`);
  }
  if (elapsed > 30 && state.edits > 0) {
    tips.push('30+ min session — good time for /checkpoint or /save-session');
  }
  if (state.count > 40) {
    tips.push('Deep session — context getting heavy. Consider /compact or starting fresh with /save-session');
  }

  // Project coaching
  if (!hasClaude && state.edits > 3) {
    tips.push('No CLAUDE.md in this project — run /init to create one (helps Claude understand your stack)');
  }
  if (hasPackageJson && !hasTests && state.edits > 5) {
    tips.push('No test directory found — consider /tdd to set up tests before shipping');
  }
  if (hasTsConfig && state.errors > 2) {
    tips.push('TypeScript project with errors — try /build-fix for auto-resolution');
  }

  // Skill suggestions based on file patterns
  const exts = state.files.map(f => path.extname(f).toLowerCase());
  if (exts.some(e => ['.tsx', '.jsx'].includes(e)) && state.files.length > 3) {
    tips.push('Multiple React files touched — ccc-design has 35+ skills for polish, animations, and effects');
  }
  if (exts.some(e => ['.sql', '.prisma'].includes(e))) {
    tips.push('Database files detected — ccc-saas has database-designer and migration skills');
  }
  if (state.files.some(f => f.includes('test') || f.includes('spec'))) {
    tips.push('Working on tests — ccc-testing has TDD workflow, E2E, and verification skills');
  }
  if (state.files.some(f => f.includes('Dockerfile') || f.includes('.yml') || f.includes('deploy'))) {
    tips.push('DevOps files detected — ccc-devops has CI/CD, Docker, and deploy skills');
  }

  // Pick best tip (avoid repeating last one)
  const available = tips.filter(t => t !== state.lastTip);
  if (available.length === 0) return;

  const tip = available[Math.floor(Math.random() * Math.min(available.length, 3))];
  state.lastTip = tip;
  try { fs.writeFileSync(stateFile, JSON.stringify(state)); } catch { /* ok */ }

  // Render coaching nudge
  const header = `${C.line}━━━━━━${C.reset} ${C.green}${C.bold}KZ COACH${C.reset} ${C.dim}#${state.count} │ ${elapsed}min │ ${state.edits} edits │ ${state.errors} errors${C.reset}`;
  const body = `${C.cyan}>${C.reset} ${C.white}${tip}${C.reset}`;
  const footer = `${C.dim}Disable: KZ_COACH_DISABLE=1 │ Interval: KZ_COACH_INTERVAL=${interval}${C.reset}`;

  process.stderr.write(`\n${header}\n${body}\n${footer}\n`);
}

main().catch(() => {
  // Silent failure — hooks should never break Claude
});
