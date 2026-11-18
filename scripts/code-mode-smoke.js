#!/usr/bin/env node
/**
 * code-mode-smoke.js — check Commander's hooks against Claude Code's Code Mode rules, then (optionally)
 * start an interactive Code Mode session with the plugin loaded.
 *
 * Code Mode (CLAUDE_CODE_EXPERIMENTAL_CODE_MODE=1, Claude Code v2.1.323+) needs an interactive terminal and a
 * signed-in subscription or Console account, so CI cannot start it without secrets. This script runs the
 * part a machine can check, using the real hooks.json commands:
 *   1. every UserPromptSubmit handler, fed `source: "poll_event"` (Code Mode output), passes it silently
 *      and never blocks it;
 *   2. every PreToolUse handler, fed a `REPL` call and a compound `cd 'app' && git push`, answers within its
 *      timeout with a decision or a pass, and the advisory ones also pass on malformed input;
 *   3. a key literal inside REPL code is denied.
 * Source: code.claude.com/docs/en/code-mode (read 2026-11-18).
 *
 * Usage:
 *   node scripts/code-mode-smoke.js            # hook checks only (no network, no account)
 *   node scripts/code-mode-smoke.js --launch   # checks, then `CLAUDE_CODE_EXPERIMENTAL_CODE_MODE=1 claude --plugin-dir ...`
 *   node scripts/code-mode-smoke.js --json     # machine-readable result
 * Manual follow-up in the launched session: run a prompt with many tool calls (for example "list every
 * Markdown link in this repo that points to a missing file"), check no call is refused with
 * "the hook failed" / "the hook did not finish", then press Ctrl+O to read the code.
 */
'use strict';

const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const PLUGIN = path.join(ROOT, 'commander', 'cowork-plugin');
const HOOKS_JSON = path.join(PLUGIN, 'hooks', 'hooks.json');
const MIN_VERSION = [2, 1, 323];
// Handlers that deny on purpose; they must still answer in time, but they keep failing closed.
const SAFETY = new Set(['orchestrator/pre-tool-use-dispatcher.js', 'config-protection.js', 'permission-gate.js']);

function handlers(event) {
  const cfg = JSON.parse(fs.readFileSync(HOOKS_JSON, 'utf8'));
  return (cfg.hooks[event] || []).flatMap((g) => g.hooks.map((h) => ({ ...h, matcher: g.matcher || '*' })));
}

function fileOf(h) {
  const m = /\/hooks\/([\w./-]+\.js)"/.exec(h.command);
  return m ? m[1] : h.command;
}

function runHandler(h, payload, home) {
  const started = Date.now();
  const r = spawnSync('/bin/sh', ['-c', h.command], {
    input: typeof payload === 'string' ? payload : JSON.stringify(payload),
    encoding: 'utf8',
    timeout: h.timeout * 1000,
    env: {
      ...process.env,
      CLAUDE_PLUGIN_ROOT: PLUGIN,
      CLAUDE_PLUGIN_DATA: path.join(home, 'plugin-data'),
      HOME: home,
      CLAUDE_CONFIG_DIR: path.join(home, '.claude'),
      CCC_TELEMETRY: '0',
      CCC_OFFLINE: '1',
      MCP_DISABLED: '1',
    },
  });
  const ms = Date.now() - started;
  let out = null;
  try { out = JSON.parse((r.stdout || '').trim().split('\n').pop() || 'null'); } catch { out = undefined; }
  return { status: r.status, signal: r.signal, timedOut: r.error?.code === 'ETIMEDOUT', ms, out, stdout: r.stdout || '' };
}

function parseVersion(text) {
  const m = /(\d+)\.(\d+)\.(\d+)/.exec(text || '');
  return m ? m.slice(1).map(Number) : null;
}

function versionAtLeast(v, min) {
  for (let i = 0; i < 3; i++) if (v[i] !== min[i]) return v[i] > min[i];
  return true;
}

function main() {
  const json = process.argv.includes('--json');
  const launch = process.argv.includes('--launch');
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'ccc-code-mode-'));
  const results = [];
  const check = (name, ok, detail = '') => results.push({ name, ok: Boolean(ok), detail });

  try {
    for (const h of handlers('UserPromptSubmit')) {
      const r = runHandler(h, { hook_event_name: 'UserPromptSubmit', source: 'poll_event', session_id: 'smoke', cwd: home, prompt: '[code output] build finished' }, home);
      const o = r.out || {};
      const blocked = o.decision === 'block' || o.continue === false;
      const injected = Boolean(o.hookSpecificOutput?.additionalContext || o.systemMessage);
      check(`UserPromptSubmit ${fileOf(h)} passes poll_event`, r.status === 0 && !r.timedOut && !blocked && !injected,
        `${r.ms} ms, status ${r.status}${blocked ? ', blocked' : ''}${injected ? ', injected text' : ''}`);
    }

    const replKey = 'AKIA' + 'ABCDEFGHIJKLMNOP';
    const payloads = [
      ['REPL', { tool_name: 'REPL', tool_input: { code: "const r = await $`git status`.text(); r;" } }],
      ['compound Bash', { tool_name: 'Bash', tool_input: { command: "cd 'app' && git push" } }],
    ];
    for (const h of handlers('PreToolUse')) {
      for (const [label, p] of payloads) {
        const r = runHandler(h, { hook_event_name: 'PreToolUse', session_id: 'smoke', cwd: home, ...p }, home);
        check(`PreToolUse ${fileOf(h)} answers a ${label} call in time`, r.status === 0 && !r.timedOut && r.out !== undefined,
          `${r.ms} ms of ${h.timeout} s`);
      }
      if (!SAFETY.has(fileOf(h))) {
        const r = runHandler(h, '{not json', home);
        check(`PreToolUse ${fileOf(h)} fails open on malformed input`, r.status === 0 && !r.timedOut && h.onFailure === 'continue',
          `status ${r.status}, onFailure ${h.onFailure || 'unset'}`);
      }
    }

    const dispatcher = handlers('PreToolUse').find((h) => fileOf(h) === 'orchestrator/pre-tool-use-dispatcher.js');
    const denied = dispatcher && runHandler(dispatcher, { hook_event_name: 'PreToolUse', session_id: 'smoke', tool_name: 'REPL', tool_input: { code: `const k = "${replKey}";` } }, home);
    check('a key literal in REPL code is denied', denied?.out?.hookSpecificOutput?.permissionDecision === 'deny');

    const v = spawnSync('claude', ['--version'], { encoding: 'utf8' });
    const version = v.status === 0 ? parseVersion(v.stdout) : null;
    check(`claude CLI ${MIN_VERSION.join('.')}+ (for --launch)`, version && versionAtLeast(version, MIN_VERSION),
      version ? version.join('.') : 'claude not found');
  } finally {
    fs.rmSync(home, { recursive: true, force: true });
  }

  const hookFailures = results.filter((r) => !r.ok && !r.name.startsWith('claude CLI'));
  if (json) {
    process.stdout.write(JSON.stringify({ ok: hookFailures.length === 0, results }, null, 2) + '\n');
  } else {
    for (const r of results) process.stdout.write(`${r.ok ? 'ok  ' : 'FAIL'} ${r.name}${r.detail ? `  (${r.detail})` : ''}\n`);
    process.stdout.write(hookFailures.length ? `\n${hookFailures.length} hook check(s) failed.\n` : '\nAll hook checks passed.\n');
  }
  if (hookFailures.length) process.exit(1);

  if (launch) {
    const cli = results.find((r) => r.name.startsWith('claude CLI'));
    if (!cli.ok) {
      process.stderr.write(`Cannot launch: Code Mode needs Claude Code ${MIN_VERSION.join('.')} or later (${cli.detail}).\n`);
      process.exit(1);
    }
    process.stdout.write('\nStarting Claude Code with Code Mode on and the plugin loaded. Confirm the Code Mode prompt, then run a task with many tool calls.\n');
    const r = spawnSync('claude', ['--plugin-dir', PLUGIN], {
      stdio: 'inherit',
      env: { ...process.env, CLAUDE_CODE_EXPERIMENTAL_CODE_MODE: '1' },
    });
    process.exit(r.status ?? 1);
  }
}

if (require.main === module) main();

module.exports = { handlers, fileOf, runHandler, SAFETY };
