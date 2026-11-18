'use strict';

// Codex audit #05: the Codex mirror maps Claude edit matchers to `apply_patch`, so the edit
// policies must understand a native Codex apply_patch payload (raw patch text, no file_path).
// These tests feed complete native PreToolUse / PostToolUse payloads to the real hook scripts,
// in the Claude source tree and in the generated Codex mirror, and assert the emitted decision.
// Audit #24: every skill with disable-model-invocation: true ships Codex
// policy.allow_implicit_invocation: false.
// Run: node --test commander/tests/codex-apply-patch.test.js

const { describe, it, after } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const PLUGIN = path.join(__dirname, '..', 'cowork-plugin');
const CODEX = path.join(__dirname, '..', 'cowork-plugin-codex');
const TEST_HOME = fs.mkdtempSync(path.join(os.tmpdir(), 'ccc-codex-apply-patch-home-'));
after(() => fs.rmSync(TEST_HOME, { recursive: true, force: true }));

// Built at runtime so repository secret scanners do not flag the fixture.
const FAKE_KEY = ['sk', 'ant', 'api03', 'abcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLM'].join('-');

function patch(...body) {
  return ['*** Begin Patch', ...body, '*** End Patch', ''].join('\n');
}

// A full native Codex hook payload (platform facts §3.3 input fields plus the tool fields).
function codexPayload(event, patchText, cwd = '/tmp/codex-project') {
  return {
    session_id: 'codex-session-1',
    transcript_path: '/tmp/codex-session-1.jsonl',
    cwd,
    hook_event_name: event,
    model: 'gpt-6.2-sol',
    permission_mode: 'default',
    turn_id: 'turn-1',
    tool_name: 'apply_patch',
    tool_use_id: 'call_1',
    tool_input: { command: patchText },
  };
}

function runHook(root, rel, payload) {
  const r = spawnSync('node', [path.join(root, 'hooks', rel)], {
    input: JSON.stringify(payload),
    encoding: 'utf8',
    timeout: 8000,
    env: { ...process.env, HOME: TEST_HOME, USERPROFILE: TEST_HOME, CCC_TELEMETRY: '0', CLAUDE_PLUGIN_ROOT: root, PLUGIN_ROOT: root },
  });
  let parsed = null;
  try { parsed = JSON.parse((r.stdout || '').trim().split('\n').pop()); } catch { /* not JSON */ }
  return { status: r.status, parsed, stderr: r.stderr || '' };
}

const decision = (r) => r.parsed?.hookSpecificOutput?.permissionDecision;

const ROOTS = [['Claude source', PLUGIN]];
if (fs.existsSync(path.join(CODEX, 'hooks', 'lib', 'edit-targets.mjs'))) ROOTS.push(['Codex mirror', CODEX]);

describe('edit-targets.mjs', () => {
  it('parses add, update with move, and delete operations with added lines only', async () => {
    const { editTargets, parseApplyPatch, extractPatchText } = await import(
      pathToFileURL(path.join(PLUGIN, 'hooks', 'lib', 'edit-targets.mjs')).href
    );
    const text = patch(
      '*** Add File: src/new.js',
      '+const a = 1;',
      '*** Update File: src/old.js',
      '*** Move to: src/renamed.js',
      '@@ function f() {',
      '-  return 1;',
      '+  return 2;',
      '*** Delete File: docs/gone.md',
    );
    assert.deepEqual(parseApplyPatch(text).map((f) => [f.op, f.path, f.movePath, f.added]), [
      ['add', 'src/new.js', undefined, 'const a = 1;'],
      ['update', 'src/old.js', 'src/renamed.js', '  return 2;'],
      ['delete', 'docs/gone.md', undefined, ''],
    ]);
    const targets = editTargets(codexPayload('PreToolUse', text));
    assert.deepEqual(targets.map((t) => [t.path, t.op]), [
      ['src/new.js', 'add'], ['src/old.js', 'update'], ['src/renamed.js', 'add'], ['docs/gone.md', 'delete'],
    ]);
    // argv form and heredoc wrapper both yield the patch body.
    assert.ok(extractPatchText({ command: ['apply_patch', text] }).startsWith('*** Begin Patch'));
    assert.ok(extractPatchText({ command: `apply_patch <<'EOF'\n${text}EOF` }).startsWith('*** Begin Patch'));
    // Claude payloads are unchanged.
    assert.deepEqual(editTargets({ tool_name: 'Edit', tool_input: { file_path: '/a/b.js', old_string: 'x', new_string: 'y' } }),
      [{ path: '/a/b.js', content: 'y', op: 'update' }]);
    assert.deepEqual(editTargets({ tool_name: 'Read', tool_input: { file_path: '/a' } }), []);
  });
});

for (const [label, root] of ROOTS) {
  describe(`${label}: native Codex apply_patch payloads`, () => {
    it('secret-leak-guard denies a patch that adds a secret', () => {
      const r = runHook(root, 'secret-leak-guard.js', codexPayload('PreToolUse', patch(
        '*** Add File: src/config.js',
        `+export const KEY = "${FAKE_KEY}";`,
      )));
      assert.equal(r.status, 0, r.stderr);
      assert.equal(decision(r), 'deny');
      assert.match(r.parsed.hookSpecificOutput.permissionDecisionReason, /SECRET GUARD.*apply_patch/);
    });

    it('the PreToolUse dispatcher (what Codex runs on "*") denies the same patch', () => {
      const r = runHook(root, 'orchestrator/pre-tool-use-dispatcher.js', codexPayload('PreToolUse', patch(
        '*** Update File: src/config.js',
        '@@',
        '-export const KEY = process.env.KEY;',
        `+export const KEY = "${FAKE_KEY}";`,
      )));
      assert.equal(r.status, 0, r.stderr);
      assert.equal(decision(r), 'deny');
    });

    it('secret-leak-guard allows a patch that only removes a secret', () => {
      const r = runHook(root, 'secret-leak-guard.js', codexPayload('PreToolUse', patch(
        '*** Update File: src/config.js',
        '@@',
        `-export const KEY = "${FAKE_KEY}";`,
        '+export const KEY = process.env.KEY;',
      )));
      assert.equal(r.status, 0, r.stderr);
      assert.notEqual(decision(r), 'deny');
    });

    it('config-protection denies a patch that updates a linter config', () => {
      const r = runHook(root, 'config-protection.js', codexPayload('PreToolUse', patch(
        '*** Update File: src/app.js',
        '@@',
        '+const x = 1;',
        '*** Update File: eslint.config.js',
        '@@',
        '-  rules: { "no-unused-vars": "error" },',
        '+  rules: {},',
      )));
      assert.equal(r.status, 0, r.stderr);
      assert.equal(decision(r), 'deny');
      assert.match(r.parsed.hookSpecificOutput.permissionDecisionReason, /eslint\.config\.js/);
    });

    it('config-protection denies a rename onto a protected config and a delete of one', () => {
      const moved = runHook(root, 'config-protection.js', codexPayload('PreToolUse', patch(
        '*** Update File: tmp/lint.json',
        '*** Move to: biome.json',
      )));
      assert.equal(decision(moved), 'deny');
      const deleted = runHook(root, 'config-protection.js', codexPayload('PreToolUse', patch(
        '*** Delete File: .prettierrc',
      )));
      assert.equal(decision(deleted), 'deny');
    });

    it('config-protection allows an ordinary source patch', () => {
      const r = runHook(root, 'config-protection.js', codexPayload('PreToolUse', patch(
        '*** Add File: src/feature.js',
        '+export const ok = true;',
      )));
      assert.equal(r.status, 0, r.stderr);
      assert.notEqual(decision(r), 'deny');
      assert.equal(r.parsed?.continue, true);
    });

    it('doc-file-warning warns on a patch that adds an ad-hoc NOTES.md', () => {
      const r = runHook(root, 'doc-file-warning.js', codexPayload('PreToolUse', patch(
        '*** Add File: NOTES.md',
        '+scratch',
      )));
      assert.equal(r.parsed?.continue, true);
      assert.match(r.stderr, /Ad-hoc documentation filename[\s\S]*NOTES\.md/);
    });

    it('console-log-warn reads patched files relative to the payload cwd', () => {
      const cwd = fs.mkdtempSync(path.join(TEST_HOME, 'proj-'));
      fs.mkdirSync(path.join(cwd, 'src'));
      fs.writeFileSync(path.join(cwd, 'src', 'app.js'), 'const a = 1;\nconsole.log(a);\n');
      const r = runHook(root, 'console-log-warn.js', codexPayload('PostToolUse', patch(
        '*** Add File: src/app.js',
        '+const a = 1;',
        '+console.log(a);',
      ), cwd));
      assert.equal(r.parsed?.continue, true);
      assert.match(r.stderr, /console\.log found in src\/app\.js/);
    });
  });
}

describe('Codex mirror: explicit-only skills (audit #24)', () => {
  it('every skill with disable-model-invocation: true has policy.allow_implicit_invocation: false', async () => {
    const { skillDisablesModelInvocation, IMPLICIT_INVOCATION_OFF } = await import(
      pathToFileURL(path.join(__dirname, '..', 'adapters', 'codex', 'translate.js')).href
    );
    const skills = fs.readdirSync(path.join(PLUGIN, 'skills'))
      .filter((name) => fs.existsSync(path.join(PLUGIN, 'skills', name, 'SKILL.md')));
    const explicitOnly = skills.filter((name) =>
      skillDisablesModelInvocation(fs.readFileSync(path.join(PLUGIN, 'skills', name, 'SKILL.md'), 'utf8')));
    assert.ok(explicitOnly.length > 9, `expected more than the 9 tstack skills, found ${explicitOnly.length}`);
    for (const name of explicitOnly) {
      const yamlPath = path.join(CODEX, 'skills', name, 'agents', 'openai.yaml');
      assert.ok(fs.existsSync(yamlPath), `${name}: Codex mirror is missing agents/openai.yaml`);
      assert.match(fs.readFileSync(yamlPath, 'utf8'), IMPLICIT_INVOCATION_OFF, `${name}: implicit invocation off`);
    }
  });

  it('skillDisablesModelInvocation reads only the frontmatter', async () => {
    const { skillDisablesModelInvocation } = await import(
      pathToFileURL(path.join(__dirname, '..', 'adapters', 'codex', 'translate.js')).href
    );
    assert.equal(skillDisablesModelInvocation('---\nname: x\ndisable-model-invocation: true\n---\nbody\n'), true);
    assert.equal(skillDisablesModelInvocation('---\nname: x\ndisable-model-invocation: false\n---\n'), false);
    assert.equal(skillDisablesModelInvocation('---\nname: x\n---\ndisable-model-invocation: true\n'), false);
  });
});
