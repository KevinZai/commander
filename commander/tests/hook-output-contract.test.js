'use strict';

// ============================================================================
// CC Commander — Hook Output Contract (F1)
// ============================================================================
// Claude Code's hook schema documents exactly two delivery channels:
//   1. `systemMessage`                          — rendered to the USER
//   2. `hookSpecificOutput.additionalContext`   — injected into the MODEL
// plus flow control (`continue`, `stopReason`, `suppressOutput`) and
// PermissionRequest decisions (`hookSpecificOutput.decision`).
//
// Undocumented top-level keys (`status`, `output`, …) are silently stripped
// by the harness — a hook that emits them says nothing to anyone. This suite
// enforces the contract two ways:
//   A. RUNTIME  — every hook is executed with a synthetic payload inside an
//                 isolated HOME; every JSON line it prints must use only
//                 documented top-level keys.
//   B. STATIC   — no hook source may inline a `status:`/`output:` key into an
//                 object handed to console.log/process.stdout.write. Message
//                 emission must route through hooks/lib/emit.mjs.
//
// Run: node --test commander/tests/hook-output-contract.test.js
// ============================================================================

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');

const HOOKS_DIR = path.join(__dirname, '..', 'cowork-plugin', 'hooks');

// Documented top-level output keys (Claude Code hook schema).
const DOCUMENTED_KEYS = new Set([
  'continue',
  'suppressOutput',
  'systemMessage',
  'stopReason',
  'hookSpecificOutput',
  'decision',
  'reason',
]);

// Every runnable hook module: hooks/*.js + the SessionStart orchestrator.
// lib/ (helpers) and _archive/ (retired) are excluded.
function listHookFiles() {
  const files = fs
    .readdirSync(HOOKS_DIR)
    .filter((f) => f.endsWith('.js'))
    .map((f) => path.join(HOOKS_DIR, f));
  files.push(path.join(HOOKS_DIR, 'orchestrator', 'session-start-orchestrator.js'));
  return files;
}

const HOOK_FILES = listHookFiles();

const SYNTHETIC_PAYLOAD = JSON.stringify({
  session_id: 'contract-test',
  hook_event_name: 'ContractTest',
  tool_name: 'Read',
  tool_input: { file_path: '/tmp/contract-test.txt' },
  prompt: 'contract-test prompt',
});

let TMP_HOME;

before(() => {
  TMP_HOME = fs.mkdtempSync(path.join(os.tmpdir(), 'ccc-contract-test-'));
  fs.mkdirSync(path.join(TMP_HOME, '.claude'), { recursive: true });
});

after(() => {
  try { fs.rmSync(TMP_HOME, { recursive: true, force: true }); } catch { /* ok */ }
});

// ---------------------------------------------------------------------------
// A. Runtime: execute every hook, whitelist-check every JSON line it prints
// ---------------------------------------------------------------------------

describe('hook output contract — runtime (documented fields only)', () => {
  for (const file of HOOK_FILES) {
    const name = path.relative(HOOKS_DIR, file);

    it(`${name} emits only documented top-level keys`, () => {
      const r = spawnSync('node', [file], {
        input: SYNTHETIC_PAYLOAD,
        encoding: 'utf-8',
        timeout: 15000,
        env: {
          ...process.env,
          HOME: TMP_HOME,
          USERPROFILE: TMP_HOME,
          MCP_DISABLED: '1',
          CLAUDE_SESSION_ID: 'contract-test',
        },
      });

      assert.equal(r.status, 0, `${name} must exit 0. stderr: ${r.stderr}`);

      const lines = (r.stdout || '').trim().split('\n').filter(Boolean);
      assert.ok(lines.length > 0, `${name} must print a JSON response`);

      for (const line of lines) {
        let parsed;
        try {
          parsed = JSON.parse(line);
        } catch {
          assert.fail(`${name} printed non-JSON to stdout: ${line.slice(0, 120)}`);
        }
        for (const key of Object.keys(parsed)) {
          assert.ok(
            DOCUMENTED_KEYS.has(key),
            `${name} emitted undocumented top-level key "${key}" — the harness strips it. ` +
              `Route through hooks/lib/emit.mjs (emitUser/emitModel/emitBoth).`
          );
        }
      }
    });
  }
});

// ---------------------------------------------------------------------------
// C. Allowlist: hookSpecificOutput.hookEventName must be harness-valid
// ---------------------------------------------------------------------------
// The harness validator accepts hookSpecificOutput.hookEventName ONLY from a
// 20-literal union (extracted from CLI 2.1.220) AND requires it to equal the
// event the hook actually fired under. Suite A drives every hook with a fake
// event name ('ContractTest') and only whitelists TOP-LEVEL keys — which is
// exactly how the PostCompact bug shipped green. This section closes that gap:
// the list below is a deliberate DUPLICATE of emit.mjs's export (a pin — if
// either side changes, the set-equality test forces a conscious update).

const VALID_HOOKSPECIFIC_EVENTS = new Set([
  'PreToolUse',
  'UserPromptSubmit',
  'UserPromptExpansion',
  'SessionStart',
  'Setup',
  'SubagentStart',
  'PostToolUse',
  'PostToolUseFailure',
  'PostToolBatch',
  'Stop',
  'SubagentStop',
  'PermissionDenied',
  'Notification',
  'PermissionRequest',
  'Elicitation',
  'ElicitationResult',
  'CwdChanged',
  'FileChanged',
  'WorktreeCreate',
  'MessageDisplay',
]);

// file basename -> Set of hooks.json events it is registered under.
function registeredEventsByFile() {
  const cfg = JSON.parse(fs.readFileSync(path.join(HOOKS_DIR, 'hooks.json'), 'utf-8'));
  const map = new Map();
  for (const [event, matchers] of Object.entries(cfg.hooks || {})) {
    for (const matcher of matchers) {
      for (const h of matcher.hooks || []) {
        const m = /hooks\/([\w.-]+\.js)/.exec(h.command || '');
        if (!m) continue;
        if (!map.has(m[1])) map.set(m[1], new Set());
        map.get(m[1]).add(event);
      }
    }
  }
  return map;
}

describe('hook output contract — hookSpecificOutput allowlist (C)', () => {
  it('emit.mjs VALID_HOOKSPECIFIC_EVENTS matches the pinned harness union exactly', async () => {
    const emit = await import(path.join(HOOKS_DIR, 'lib', 'emit.mjs'));
    assert.ok(emit.VALID_HOOKSPECIFIC_EVENTS instanceof Set, 'emit.mjs must export VALID_HOOKSPECIFIC_EVENTS');
    assert.deepEqual(
      [...emit.VALID_HOOKSPECIFIC_EVENTS].sort(),
      [...VALID_HOOKSPECIFIC_EVENTS].sort(),
      'emit.mjs allowlist drifted from the pinned harness union — update BOTH deliberately'
    );
  });

  it('emitBoth degrades to systemMessage-only for a non-union event (PostCompact)', async () => {
    const emit = await import(path.join(HOOKS_DIR, 'lib', 'emit.mjs'));
    const out = emit.emitBoth('PostCompact', 'msg');
    assert.equal(out.systemMessage, 'msg');
    assert.ok(!('hookSpecificOutput' in out), 'PostCompact has no valid hookSpecificOutput variant — must degrade');
    const model = emit.emitModel('PostCompact', 'ctx');
    assert.ok(!('hookSpecificOutput' in model), 'emitModel must degrade to silent for non-union events');
    const ok = emit.emitBoth('SessionStart', 'msg');
    assert.equal(ok.hookSpecificOutput.hookEventName, 'SessionStart', 'valid events must pass through unchanged');
  });

  it('post-compact-recovery emits NO hookSpecificOutput under its real event (PostCompact)', () => {
    const file = path.join(HOOKS_DIR, 'post-compact-recovery.js');
    const r = spawnSync('node', [file], {
      input: JSON.stringify({ session_id: 'contract-test', hook_event_name: 'PostCompact' }),
      encoding: 'utf-8',
      timeout: 15000,
      env: { ...process.env, HOME: TMP_HOME, USERPROFILE: TMP_HOME, MCP_DISABLED: '1' },
    });
    assert.equal(r.status, 0);
    const parsed = JSON.parse((r.stdout || '').trim().split('\n').filter(Boolean).pop());
    assert.ok(!('hookSpecificOutput' in parsed), 'PostCompact output must be systemMessage-only (harness rejects the rest)');
    assert.ok(parsed.systemMessage, 'the re-orientation message must still reach the user');
  });

  // Runtime sweep: every handler that CAN emit hookSpecificOutput, driven under
  // each event hooks.json actually registers it for. Handlers that never touch
  // hookSpecificOutput are already covered by suite A.
  const canEmit = (file) => /emitModel|emitBoth|hookSpecificOutput/.test(fs.readFileSync(file, 'utf-8'));
  const registry = registeredEventsByFile();
  for (const file of HOOK_FILES) {
    if (!canEmit(file)) continue;
    const base = path.basename(file);
    const events = registry.get(base);
    if (!events) continue; // orchestrator-wired (not standalone-registered) — covered via orchestrator run
    for (const event of events) {
      it(`${base} under ${event}: any hookSpecificOutput uses a valid, matching hookEventName`, () => {
        const r = spawnSync('node', [file], {
          input: JSON.stringify({
            session_id: 'contract-test',
            hook_event_name: event,
            tool_name: 'Read',
            tool_input: { file_path: '/tmp/contract-test.txt' },
            prompt: 'contract-test prompt',
          }),
          encoding: 'utf-8',
          timeout: 15000,
          env: { ...process.env, HOME: TMP_HOME, USERPROFILE: TMP_HOME, MCP_DISABLED: '1', CLAUDE_SESSION_ID: 'contract-test' },
        });
        assert.equal(r.status, 0, `${base} must exit 0 under ${event}. stderr: ${r.stderr}`);
        for (const line of (r.stdout || '').trim().split('\n').filter(Boolean)) {
          let parsed;
          try { parsed = JSON.parse(line); } catch { continue; }
          if (!parsed.hookSpecificOutput) continue;
          const name = parsed.hookSpecificOutput.hookEventName;
          assert.ok(
            VALID_HOOKSPECIFIC_EVENTS.has(name),
            `${base} emitted hookSpecificOutput.hookEventName "${name}" — not in the harness union; the ENTIRE output would be rejected`
          );
          assert.equal(
            name,
            event,
            `${base} emitted hookEventName "${name}" while firing under ${event} — the harness rejects mismatches`
          );
        }
      });
    }
  }
});

// ---------------------------------------------------------------------------
// B. Static: no inline status:/output: emission in any hook source
// ---------------------------------------------------------------------------

// Matches an object literal containing a `status:` or `output:` key within
// the argument of console.log(JSON.stringify({...})) / stdout.write(...).
// [^{}] keeps the match inside ONE object literal — a later, unrelated object
// with a status: key (e.g. a file-log entry) must not trip the check.
const INLINE_EMIT_RE =
  /(?:console\.log|process\.stdout\.write)\s*\(\s*JSON\.stringify\s*\(\s*\{[^{}]*\b(?:status|output)\s*:/;

describe('hook output contract — static (no inline status/output emitters)', () => {
  for (const file of HOOK_FILES) {
    const name = path.relative(HOOKS_DIR, file);

    it(`${name} has no inline status:/output: stdout emitter`, () => {
      const src = fs.readFileSync(file, 'utf-8');
      assert.ok(
        !INLINE_EMIT_RE.test(src),
        `${name} appears to stringify an object with a status:/output: key to stdout. ` +
          `Use hooks/lib/emit.mjs instead — undocumented keys never render.`
      );
    });
  }

  it('emit.mjs itself never produces status/output keys', () => {
    const src = fs.readFileSync(path.join(HOOKS_DIR, 'lib', 'emit.mjs'), 'utf-8');
    assert.ok(!/\b(?:status|output)\s*:/.test(src), 'emit.mjs must not define status/output keys');
  });
});
