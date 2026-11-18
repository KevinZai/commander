// Code Mode contract (8.2). Code Mode (CLAUDE_CODE_EXPERIMENTAL_CODE_MODE=1) needs an interactive terminal and a
// signed-in account, so CI cannot start it without secrets. This test pins what it requires of the plugin's
// hooks instead (code.claude.com/docs/en/code-mode, read 2026-11-18):
//  - UserPromptSubmit hooks also run on background code output, with `source: "poll_event"`; they must not
//    block it (or inject into it).
//  - Every tool call from code goes through PreToolUse, and a hook that fails or times out refuses the call:
//    every PreToolUse handler has a timeout, the advisory ones set onFailure: "continue" and pass on bad input.
//  - The code itself is a `REPL` tool call (tool_input.code), and the secret guard scans it.
// scripts/code-mode-smoke.js runs the same checks by hand and can launch a real Code Mode session.

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const smoke = require('../../scripts/code-mode-smoke.js');

const HOOKS = path.join(__dirname, '..', 'cowork-plugin', 'hooks');
const home = fs.mkdtempSync(path.join(os.tmpdir(), 'ccc-code-mode-test-'));
test.after(() => fs.rmSync(home, { recursive: true, force: true }));

test('every UserPromptSubmit handler checks for poll_event in its source', () => {
  const hs = smoke.handlers('UserPromptSubmit');
  assert.ok(hs.length > 0);
  for (const h of hs) {
    const src = fs.readFileSync(path.join(HOOKS, smoke.fileOf(h)), 'utf8');
    assert.match(src, /isCodeModePoll\(|poll_event/, `${smoke.fileOf(h)} never looks at input.source`);
  }
});

test('every UserPromptSubmit handler passes a poll_event silently, without blocking', () => {
  for (const h of smoke.handlers('UserPromptSubmit')) {
    const r = smoke.runHandler(h, { hook_event_name: 'UserPromptSubmit', source: 'poll_event', session_id: 't', cwd: home, prompt: '[code output] done' }, home);
    assert.equal(r.status, 0, smoke.fileOf(h));
    assert.ok(!r.timedOut, `${smoke.fileOf(h)} timed out`);
    const o = r.out || {};
    assert.notEqual(o.decision, 'block', smoke.fileOf(h));
    assert.notEqual(o.continue, false, smoke.fileOf(h));
    assert.ok(!o.hookSpecificOutput?.additionalContext, `${smoke.fileOf(h)} injected context into code output`);
  }
});

test('every PreToolUse handler has a timeout; advisory ones fail open with onFailure "continue"', () => {
  for (const h of smoke.handlers('PreToolUse')) {
    assert.ok(Number.isFinite(h.timeout) && h.timeout > 0 && h.timeout <= 10, `${smoke.fileOf(h)} timeout ${h.timeout}`);
    if (smoke.SAFETY.has(smoke.fileOf(h))) {
      assert.notEqual(h.onFailure, 'continue', `${smoke.fileOf(h)} is a safety hook and fails closed`);
    } else {
      assert.equal(h.onFailure, 'continue', smoke.fileOf(h));
      const r = smoke.runHandler(h, '{not json', home);
      assert.equal(r.status, 0, `${smoke.fileOf(h)} exits 0 on malformed input`);
      assert.notEqual(r.out?.hookSpecificOutput?.permissionDecision, 'deny', smoke.fileOf(h));
    }
  }
});

test('every PreToolUse handler answers a REPL call well inside its timeout', () => {
  for (const h of smoke.handlers('PreToolUse')) {
    const r = smoke.runHandler(h, { hook_event_name: 'PreToolUse', session_id: 't', cwd: home, tool_name: 'REPL', tool_input: { code: 'await $`ls`;' } }, home);
    assert.equal(r.status, 0, smoke.fileOf(h));
    assert.ok(!r.timedOut && r.ms < h.timeout * 1000 / 2, `${smoke.fileOf(h)} took ${r.ms} ms of ${h.timeout} s`);
    assert.notEqual(r.out?.hookSpecificOutput?.permissionDecision, 'deny', `${smoke.fileOf(h)} denied a clean REPL call`);
  }
});

test('the REPL tool is scanned: a key literal in Code Mode code is denied by the PreToolUse dispatcher', () => {
  assert.match(fs.readFileSync(path.join(HOOKS, 'secret-leak-guard.js'), 'utf8'), /'REPL'/);
  const dispatcher = smoke.handlers('PreToolUse').find((h) => smoke.fileOf(h) === 'orchestrator/pre-tool-use-dispatcher.js');
  assert.equal(dispatcher.matcher, '*', 'the dispatcher matches every tool, REPL included');
  const key = 'AKIA' + 'ABCDEFGHIJKLMNOP';
  const r = smoke.runHandler(dispatcher, { hook_event_name: 'PreToolUse', session_id: 't', tool_name: 'REPL', tool_input: { code: `const k = "${key}";` } }, home);
  assert.equal(r.out?.hookSpecificOutput?.permissionDecision, 'deny');
});
