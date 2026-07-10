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
