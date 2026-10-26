// ============================================================================
// CC Commander — permission-gate.js Test Suite
// ============================================================================
// Tests the PermissionRequest hook for Codex Desktop autofix gate.
// Contract (F2): rejections exit 0 with a documented deny decision payload —
//   { hookSpecificOutput: { hookEventName: 'PermissionRequest',
//     decision: { behavior: 'deny', message } } }
// (stdout on exit 1 is discarded by the harness, so exit-1 blocks never landed).
// Run: node --test commander/tests/permission-gate.test.js
// ============================================================================

'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const HOOK_PATH = path.join(
  __dirname, '..', 'cowork-plugin', 'hooks', 'permission-gate.js'
);

/**
 * Run the permission-gate hook with a given JSON payload via stdin.
 * Returns { exitCode, parsed, stdout, stderr }
 */
function runGate(payload, envOverrides = {}) {
  const input = payload === null ? '' : JSON.stringify(payload);
  const env = {
    ...process.env,
    HOME: process.env.HOME || '/tmp',
    ...envOverrides,
  };

  const result = spawnSync('node', [HOOK_PATH], {
    input,
    encoding: 'utf-8',
    timeout: 8000,
    env,
  });

  const stdout = (result.stdout || '').trim();
  let parsed = null;
  try { parsed = JSON.parse(stdout); } catch { /* non-JSON */ }

  return {
    exitCode: result.status ?? 0,
    stdout,
    stderr: result.stderr || '',
    parsed,
  };
}

// ============================================================================
// Case 1: Approve normal read-only tool call (Read)
// ============================================================================
describe('permission-gate: approve normal read-only operations', () => {
  it('auto-approves Read tool (continue: true, exit 0)', () => {
    const r = runGate({
      tool_name: 'Read',
      tool_input: { file_path: '/tmp/foo.txt' },
      session_id: 'test-session-001',
    });
    assert.equal(r.exitCode, 0, `Expected exit 0, got ${r.exitCode}. stderr: ${r.stderr}`);
    assert.ok(r.parsed, 'Should output valid JSON');
    assert.equal(r.parsed.continue, true, 'Should approve read-only tool');
  });

  it('auto-approves Glob tool', () => {
    const r = runGate({
      tool_name: 'Glob',
      tool_input: { pattern: '**/*.js' },
      session_id: 'test-session-002',
    });
    assert.equal(r.exitCode, 0);
    assert.equal(r.parsed?.continue, true);
  });

  it('auto-approves Grep tool', () => {
    const r = runGate({
      tool_name: 'Grep',
      tool_input: { pattern: 'TODO', path: '/tmp' },
      session_id: 'test-session-003',
    });
    assert.equal(r.exitCode, 0);
    assert.equal(r.parsed?.continue, true);
  });

  it('auto-approves WebSearch tool', () => {
    const r = runGate({
      tool_name: 'WebSearch',
      tool_input: { query: 'codex desktop api' },
    });
    assert.equal(r.exitCode, 0);
    assert.equal(r.parsed?.continue, true);
  });
});

// ============================================================================
// Case 2: Reject /ccc-review autofix write without explicit flag
// ============================================================================
describe('permission-gate: reject autofix write without CCC_AUTOFIX_APPROVED', () => {
  it('denies Write tool during /ccc-review autofix phase (exit 0 + deny decision)', () => {
    const r = runGate(
      {
        tool_name: 'Write',
        tool_input: { file_path: '/tmp/foo.js', content: 'fixed' },
        session_id: 'test-session-004',
        context: { skill: '/ccc-review', phase: 'autofix' },
      },
      { CCC_AUTOFIX_APPROVED: '' }  // unset the flag
    );
    assert.equal(r.exitCode, 0, `Deny must exit 0 (stdout on exit 1 is discarded), got ${r.exitCode}`);
    assert.ok(r.parsed, 'Should output valid JSON');
    const decision = r.parsed.hookSpecificOutput?.decision;
    assert.equal(decision?.behavior, 'deny', 'Should deny autofix write');
    assert.ok(
      decision?.message?.includes('autofix'),
      `deny message should mention autofix. Got: ${decision?.message}`
    );
  });

  it('denies Edit tool during /ccc-review autofix phase', () => {
    const r = runGate(
      {
        tool_name: 'Edit',
        tool_input: { file_path: '/tmp/bar.js', old_string: 'x', new_string: 'y' },
        context: { skill: '/ccc-review', phase: 'autofix' },
      },
      { CCC_AUTOFIX_APPROVED: '' }
    );
    assert.equal(r.exitCode, 0);
    assert.equal(r.parsed?.hookSpecificOutput?.decision?.behavior, 'deny');
  });

  it('approves Write tool during /ccc-review autofix when CCC_AUTOFIX_APPROVED=1', () => {
    const r = runGate(
      {
        tool_name: 'Write',
        tool_input: { file_path: '/tmp/foo.js', content: 'fixed' },
        context: { skill: '/ccc-review', phase: 'autofix' },
      },
      { CCC_AUTOFIX_APPROVED: '1' }
    );
    assert.equal(r.exitCode, 0, 'Should approve when flag is set');
    assert.equal(r.parsed?.continue, true);
  });

  it('approves Write tool outside /ccc-review context (no skill context)', () => {
    const r = runGate(
      {
        tool_name: 'Write',
        tool_input: { file_path: '/tmp/foo.js', content: 'new content' },
        context: { skill: '/ccc-build', phase: 'scaffold' },
      },
      { CCC_AUTOFIX_APPROVED: '' }
    );
    // Write outside /ccc-review should pass through
    assert.equal(r.exitCode, 0, 'Non-autofix Write should be approved');
    assert.equal(r.parsed?.continue, true);
  });
});

// ============================================================================
// Case 2b (v7.3.0, W2+/codex 13): CCC_AUTOFIX_APPROVED=1 logs a distinct
// 'approved-autofix' decision — not the generic 'approved' — so Safety's
// "auto-fixed" bucket (safety-snapshot.js's classifyDecision) has a real
// signal. Uses an isolated HOME so the log file is deterministic to read.
// ============================================================================
describe('permission-gate: approved-autofix telemetry (v7.3.0)', () => {
  function makeHome() {
    return fs.mkdtempSync(path.join(os.tmpdir(), 'ccc-permission-gate-'));
  }

  function readGateLog(home) {
    const logPath = path.join(home, '.claude', 'commander', 'analytics', 'permission-gate.jsonl');
    const raw = fs.readFileSync(logPath, 'utf8');
    return raw
      .split('\n')
      .filter((line) => line.trim())
      .map((line) => JSON.parse(line));
  }

  it('logs decision:"approved-autofix" (not "approved") when CCC_AUTOFIX_APPROVED=1 allows an autofix write', () => {
    const home = makeHome();
    const r = runGate(
      {
        tool_name: 'Write',
        tool_input: { file_path: '/tmp/foo.js', content: 'fixed' },
        session_id: 'test-session-autofix-log',
        context: { skill: '/ccc-review', phase: 'autofix' },
      },
      { HOME: home, CCC_AUTOFIX_APPROVED: '1' }
    );
    assert.equal(r.exitCode, 0);
    assert.equal(r.parsed?.continue, true);

    const entries = readGateLog(home);
    assert.equal(entries.length, 1);
    assert.equal(entries[0].decision, 'approved-autofix');
    assert.equal(entries[0].toolName, 'Write');
    assert.equal(entries[0].sessionId, 'test-session-autofix-log');
  });

  it('a denied autofix (no CCC_AUTOFIX_APPROVED) still logs "rejected-autofix", unchanged', () => {
    const home = makeHome();
    runGate(
      {
        tool_name: 'Write',
        tool_input: { file_path: '/tmp/foo.js', content: 'fixed' },
        context: { skill: '/ccc-review', phase: 'autofix' },
      },
      { HOME: home, CCC_AUTOFIX_APPROVED: '' }
    );

    const entries = readGateLog(home);
    assert.equal(entries.length, 1);
    assert.equal(entries[0].decision, 'rejected-autofix');
  });

  it('a normal (non-autofix) approval still logs the generic "approved" decision, unchanged', () => {
    const home = makeHome();
    runGate(
      {
        tool_name: 'Bash',
        tool_input: { command: 'npm test' },
        session_id: 'test-session-generic-approve',
      },
      { HOME: home }
    );

    const entries = readGateLog(home);
    assert.equal(entries.length, 1);
    assert.equal(entries[0].decision, 'approved');
  });
});

// ============================================================================
// Case 3: Malformed payload → fail open
// ============================================================================
describe('permission-gate: malformed payload → fail open', () => {
  it('returns continue:true on non-JSON stdin', () => {
    const result = spawnSync('node', [HOOK_PATH], {
      input: 'this is not json!!!',
      encoding: 'utf-8',
      timeout: 5000,
      env: process.env,
    });
    assert.equal(result.status, 0, 'Malformed input should not crash (exit 0)');
    const parsed = JSON.parse((result.stdout || '').trim());
    assert.equal(parsed.continue, true, 'Should fail open on malformed JSON');
  });

  it('returns continue:true on partial/truncated JSON', () => {
    const result = spawnSync('node', [HOOK_PATH], {
      input: '{"tool_name": "Write", "tool_inp',  // truncated
      encoding: 'utf-8',
      timeout: 5000,
      env: process.env,
    });
    assert.equal(result.status, 0);
    const parsed = JSON.parse((result.stdout || '').trim());
    assert.equal(parsed.continue, true);
  });
});

// ============================================================================
// Case 4: Missing payload (empty stdin) → fail open
// ============================================================================
describe('permission-gate: missing payload → fail open', () => {
  it('returns continue:true on empty stdin', () => {
    const result = spawnSync('node', [HOOK_PATH], {
      input: '',
      encoding: 'utf-8',
      timeout: 5000,
      env: process.env,
    });
    assert.equal(result.status, 0, 'Empty input should not crash');
    const parsed = JSON.parse((result.stdout || '').trim());
    assert.equal(parsed.continue, true, 'Should fail open on empty input');
  });

  it('returns continue:true on null-valued object', () => {
    const r = runGate(null);
    assert.equal(r.exitCode, 0);
    assert.equal(r.parsed?.continue, true);
  });
});

// ============================================================================
// Case 5: Dangerous operation → always reject
// ============================================================================
describe('permission-gate: dangerous operations → always reject', () => {
  it('denies Bash rm -rf command (exit 0 + deny decision)', () => {
    const r = runGate({
      tool_name: 'Bash',
      tool_input: { command: 'rm -rf /tmp/project' },
      session_id: 'test-session-dangerous-001',
    });
    assert.equal(r.exitCode, 0, `Deny must exit 0 (stdout on exit 1 is discarded), got ${r.exitCode}`);
    const decision = r.parsed?.hookSpecificOutput?.decision;
    assert.equal(decision?.behavior, 'deny', 'rm -rf must be denied');
    assert.ok(
      decision?.message?.includes('dangerous') || decision?.message?.includes('Dangerous'),
      `deny message should indicate danger. Got: ${decision?.message}`
    );
  });

  it('denies git reset --hard', () => {
    const r = runGate({
      tool_name: 'Bash',
      tool_input: { command: 'git reset --hard HEAD~3' },
    });
    assert.equal(r.exitCode, 0);
    assert.equal(r.parsed?.hookSpecificOutput?.decision?.behavior, 'deny');
  });

  it('denies git push --force', () => {
    const r = runGate({
      tool_name: 'Bash',
      tool_input: { command: 'git push --force origin main' },
    });
    assert.equal(r.exitCode, 0);
    assert.equal(r.parsed?.hookSpecificOutput?.decision?.behavior, 'deny');
  });

  // CC-654: PermissionRequest only takes allow|deny ("defer" is PreToolUse + -p only), so every force-push form must deny
  for (const command of ['git push -f origin main', 'git push origin main -f', 'git push -uf origin feat', 'git push origin +main', 'git push --force-with-lease', 'git -C repo push --force origin main', 'cd x && git push -f', 'git --no-pager push -f origin x', 'git -c core.sshCommand=ssh push --force', '/usr/bin/git push --force origin main', 'sh -c "git push -f origin main"', 'bash -lc \'git push origin +main\'']) {
    it(`denies force push: ${command}`, () => {
      const r = runGate({ tool_name: 'Bash', tool_input: { command } });
      assert.equal(r.exitCode, 0);
      assert.equal(r.parsed?.hookSpecificOutput?.decision?.behavior, 'deny');
    });
  }

  // CC-654 follow-up (#255 verifier): a quoted +refspec, a -f after a line continuation, and remote deletes (:ref, --delete/-d, --mirror, --prune)
  for (const command of ['git push origin "+main"', "git push origin '+main'", 'git push origin main \\\n  -f', 'git push \\\n  --force origin main', 'git push origin :main', 'git push origin ":main"', 'git push --delete origin feat', 'git push origin --delete feat', 'git push -d origin feat', 'git push --mirror backup', 'git push --prune origin', 'git push origin main \\\r\n  --delete', 'git push origin +\\\nmain', 'git push origin \\\n+main', 'git push origin +"main"', "git push origin +'main'", 'git push origin :"main"', 'git push --forc origin main', 'git push origin --dele main', 'git push --mirr backup', 'git push --prun origin', 'git push --fo origin main']) {
    it(`denies remote-destructive push: ${JSON.stringify(command)}`, () => {
      const r = runGate({ tool_name: 'Bash', tool_input: { command } });
      assert.equal(r.exitCode, 0);
      assert.equal(r.parsed?.hookSpecificOutput?.decision?.behavior, 'deny');
    });
  }

  // CC-654 shell tokenize (#257 verifier r2): the shell strips escapes and quotes and runs substitutions before git sees its
  // arguments, so `\+main`, `--\force`, $(echo -f), `echo -f`, $'-f' and ${IFS} as a separator are force pushes too
  for (const command of ['git push origin \\+main', 'git push origin \\:main', 'git push --\\force origin main', 'git push -\\f origin main', 'g\\it push -f origin main', 'git pu\\sh --delete origin feat', 'git push $(echo -f) origin main', 'git push origin $(printf +main)', 'git push `echo --force` origin main', 'git push "$(echo --force)" origin main', 'git push $(echo $(echo -f)) origin main', 'git${IFS}push${IFS}-f origin main', 'git$IFS"push"$IFS-f', "git push $'-f' origin main", "git push $'\\x2df' origin main", "git push origin $'\\053main'", 'git push origin ""+main', "git push -''f origin main", 'git push --f""orce origin main', 'git push origin +ma\\\nin', ": $'\\x'; git push --force origin main", ": $'\\u'; git push -f origin main", ": $'\\U110000'; git push origin +main", "git push $'\\x' -f origin main", "git push origin $'\\x2b'main",
    // verifier r1 on #258: brace expansion, parameter defaults, a quoted or escaped space in a global option value, ${IFS<op>}
    'git push {--force,} origin main', 'git push -{f,} origin main', 'git push origin {+,}main', 'git push origin {:,}main', 'git push --{force,}', 'git push origin {a,{+,}main}',
    'git push origin ${x:-+main}', 'git push origin "${x:-+main}"', 'git push ${x-"-f"} origin main', 'git push origin ${x:=:main}', 'git push origin ${x:+-f}',
    'git -C "a b" push -f origin main', "git -c 'core.x=y z' push -f", 'git -C a\\ b push --delete origin feat', 'git${IFS%?}push${IFS%?}-f',
    // Codex r3: bash runs a substitution whatever text follows it
    "echo \"$(git pu''sh origin main --forc)tail\"", 'echo "$(git push origin --dele main)x"', 'echo `git push origin main -f`tail', 'x=$(git push -f origin main)y',
    // Codex r4: a substitution may print nothing, so $(true):main is the delete :main (this also denies "$(git rev-parse HEAD)":ref: fail closed)
    'git push origin $(true):main', 'git push origin `true`:main', 'git push origin "$(true)":main', 'git push origin "$(git rev-parse HEAD)":refs/heads/x',
    // Codex r5: a substitution inside ${IFS<op>...} still runs
    "unset IFS; echo ${IFS:-$(git pu''sh -f origin main)}", 'echo ${IFS:-`git push origin --dele main`}', 'git${IFS:-$(echo)}push${IFS#x}-f',
    // Codex r6: ${x:+word} (and the others) can also expand to nothing
    "unset x; git pu''sh origin --force${x:+suffix}", 'git push origin --forc${y:+e}', 'git push -${x:-f} origin main', 'git push ${x:?}-f origin main', 'git push origin ${x-}+main', 'git push origin ${x:-$(echo -f)}y']) {
    it(`denies obfuscated push: ${JSON.stringify(command)}`, () => {
      const r = runGate({ tool_name: 'Bash', tool_input: { command } });
      assert.equal(r.exitCode, 0);
      assert.equal(r.parsed?.hookSpecificOutput?.decision?.behavior, 'deny');
    });
  }

  for (const command of ['git push origin $(git branch --show-current)', 'git push origin "$(git rev-parse --abbrev-ref HEAD)"', 'git push -u origin `git branch --show-current`', 'git push origin "\\+main"', 'git commit -m "Fix push \\-f detection"', "git commit -m 'push \\+main is a force push'", 'echo "$(git push --dry-run origin main)"', 'git push origin feat\\-x',
    'git push origin {main,dev}', 'git push origin ${BRANCH:-main}', 'git push origin feat${SUFFIX:+-x}', 'git push -u ${REMOTE:-origin} ${BRANCH:=main}', 'git -C "/Volumes/Extreme Pro/dev/x" push origin main',
    // Codex r3: quoted or escaped braces are literal for bash (braces and commas are valid in branch names)
    'git push origin "{+,}main"', "git push origin '{:,}main'", 'git push origin \\{+,\\}main', 'git push origin "-{f,}"x']) {
    it(`approves non-force git after unquoting: ${JSON.stringify(command)}`, () => {
      const r = runGate({ tool_name: 'Bash', tool_input: { command } });
      assert.equal(r.exitCode, 0);
      assert.equal(r.parsed?.continue, true);
    });
  }

  for (const command of ['git push origin main', 'git push -u origin feature-f', 'git push --follow-tags origin main', 'git push origin feat-x', 'git status && echo -f', 'git commit -m "Fix push -f detection"', 'git log --grep="push --force"', 'git push origin main:main', 'git push origin HEAD:refs/heads/feat', 'git push --dry-run origin main', 'git push -u origin feat-d', 'git push origin feature-delete', 'git push origin main\necho -f', 'git push origin ":"', "git push origin ':'", 'git push origin :', 'git push origin :; echo done', 'git push origin :&& echo ok', 'git push --progress origin main', 'git push --no-force-with-lease origin main']) {
    it(`approves non-force git: ${command}`, () => {
      const r = runGate({ tool_name: 'Bash', tool_input: { command } });
      assert.equal(r.exitCode, 0);
      assert.equal(r.parsed?.continue, true);
    });
  }

  it('a very long argument is checked in linear time (Codex r7)', () => {
    const t = Date.now();
    const r = runGate({ tool_name: 'Bash', tool_input: { command: `echo ${'a'.repeat(40000)} {x,y} ${'b,'.repeat(2000)}` } });
    assert.equal(r.parsed?.continue, true);
    assert.ok(Date.now() - t < 3000, `took ${Date.now() - t} ms`);
  });

  it('approves safe Bash commands (ls, echo)', () => {
    const r = runGate({
      tool_name: 'Bash',
      tool_input: { command: 'ls -la /tmp && echo hello' },
    });
    assert.equal(r.exitCode, 0, 'Safe bash should be approved');
    assert.equal(r.parsed?.continue, true);
  });

  it('approves npm test (not dangerous)', () => {
    const r = runGate({
      tool_name: 'Bash',
      tool_input: { command: 'npm test' },
    });
    assert.equal(r.exitCode, 0);
    assert.equal(r.parsed?.continue, true);
  });
});

// ============================================================================
// Case 6: Output always valid JSON
// ============================================================================
describe('permission-gate: always outputs valid JSON', () => {
  const payloads = [
    { tool_name: 'Read', tool_input: {} },
    { tool_name: 'Write', tool_input: {}, context: { skill: '/ccc-review', phase: 'autofix' } },
    { tool_name: 'Bash', tool_input: { command: 'rm -rf /tmp' } },
    {},
    { tool_name: '', tool_input: null },
  ];

  payloads.forEach((payload, i) => {
    it(`produces valid JSON for payload variant ${i + 1}`, () => {
      const r = runGate(payload, { CCC_AUTOFIX_APPROVED: '' });
      assert.equal(r.exitCode, 0, `Payload ${i + 1} must exit 0 — deny decisions ride stdout, not exit codes`);
      assert.ok(r.parsed !== null, `Payload ${i + 1} should produce parseable JSON. Got: ${r.stdout}`);
      const isApprove = typeof r.parsed.continue === 'boolean';
      const isDeny = r.parsed.hookSpecificOutput?.decision?.behavior === 'deny';
      assert.ok(
        isApprove || isDeny,
        `output must be an approve (boolean continue) or a deny decision. Got: ${JSON.stringify(r.parsed)}`
      );
    });
  });
});
