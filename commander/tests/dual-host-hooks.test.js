'use strict';

// One routing hook, both hosts (CC-2064): the Claude Code plugin and the
// generated Codex mirror register the same command, ship identical hook files
// and tell the hosts apart at runtime. Contract: docs/reference/dual-host-hooks.md.

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const ROOT = path.join(__dirname, '..', '..');
const CLAUDE = path.join(ROOT, 'commander', 'cowork-plugin');
const CODEX = path.join(ROOT, 'commander', 'cowork-plugin-codex');
const CLAUDE_HOOKS = path.join(CLAUDE, 'hooks', 'hooks.json');
const CODEX_HOOKS = path.join(CODEX, 'hooks.json');
const ROUTE_CMD = 'node "${CLAUDE_PLUGIN_ROOT}/hooks/intent-classifier.js"';
const ROUTING_FILES = [
  'hooks/intent-classifier.js',
  'hooks/lib/route-scorer.mjs',
  'hooks/lib/ccc-routes.json',
  'hooks/lib/emit.mjs',
  'hooks/lib/fleet-intent.mjs',
  'lib/lane-state.js',
  'lib/telemetry.mjs',
];

function handlers(file, event) {
  const config = JSON.parse(fs.readFileSync(file, 'utf8'));
  return (config.hooks[event] || []).flatMap((group) => group.hooks);
}

test('both hosts register the routing hook on UserPromptSubmit and Stop with the same command', () => {
  for (const event of ['UserPromptSubmit', 'Stop']) {
    for (const file of [CLAUDE_HOOKS, CODEX_HOOKS]) {
      const route = handlers(file, event).filter((h) => h.command === ROUTE_CMD);
      assert.strictEqual(route.length, 1, `${path.relative(ROOT, file)} ${event}`);
      assert.ok(Number.isFinite(route[0].timeout), 'keeps a timeout');
    }
    const codex = handlers(CODEX_HOOKS, event).find((h) => h.command === ROUTE_CMD);
    for (const field of ['args', 'async', 'onFailure', 'if', 'once']) assert.ok(!(field in codex), `Codex handler has no ${field}`);
  }
});

test('every Codex hook uses the quoted command form and points at a file in the mirror', () => {
  const config = JSON.parse(fs.readFileSync(CODEX_HOOKS, 'utf8'));
  for (const [event, groups] of Object.entries(config.hooks)) {
    for (const h of groups.flatMap((g) => g.hooks)) {
      const m = /^node "\$\{CLAUDE_PLUGIN_ROOT\}\/([^"]+)"/.exec(h.command);
      assert.ok(m, `${event}: ${h.command}`);
      assert.ok(fs.existsSync(path.join(CODEX, m[1])), `${event}: ${m[1]} missing from the Codex mirror`);
    }
  }
});

test('the Codex manifest declares hooks.json and the file exists', () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(CODEX, '.codex-plugin', 'plugin.json'), 'utf8'));
  assert.strictEqual(manifest.hooks, './hooks.json');
  assert.ok(fs.existsSync(path.join(CODEX, manifest.hooks)));
});

test('routing hook files are byte-identical in the Codex mirror', () => {
  for (const rel of ROUTING_FILES) {
    assert.ok(fs.readFileSync(path.join(CLAUDE, rel)).equals(fs.readFileSync(path.join(CODEX, rel))), `${rel} differs: run npm run build:codex`);
  }
});

test('detectHost: PLUGIN_ROOT or the mirror path means Codex; CCC_SOURCE_APP overrides', async () => {
  const { detectHost } = await import(path.join(CLAUDE, 'hooks', 'lib', 'route-scorer.mjs'));
  const claudeUrl = 'file:///plugins/commander/hooks/lib/route-scorer.mjs';
  const codexUrl = 'file:///repo/commander/cowork-plugin-codex/hooks/lib/route-scorer.mjs';
  assert.strictEqual(detectHost({ CLAUDE_PLUGIN_ROOT: '/p' }, claudeUrl), 'claude-code');
  assert.strictEqual(detectHost({ PLUGIN_ROOT: '/p', CLAUDE_PLUGIN_ROOT: '/p' }, claudeUrl), 'codex');
  assert.strictEqual(detectHost({}, codexUrl), 'codex');
  assert.strictEqual(detectHost({ CCC_SOURCE_APP: 'claude-code', PLUGIN_ROOT: '/p' }, codexUrl), 'claude-code');
  assert.strictEqual(detectHost({ CCC_SOURCE_APP: 'codex' }, claudeUrl), 'codex');
  assert.strictEqual(detectHost({ CCC_SOURCE_APP: 'cursor', CLAUDE_PLUGIN_ROOT: '/p' }, claudeUrl), 'claude-code');
});

test('the mirrored hook answers a Codex prompt with request_user_input and $ccc-* names', () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'ccc-dual-'));
  const env = { ...process.env, HOME: home, USERPROFILE: home, CCC_TELEMETRY: '0', PLUGIN_ROOT: CODEX, CLAUDE_PLUGIN_ROOT: CODEX };
  for (const key of ['CCC_SOURCE_APP', 'CCC_ROUTE_MODE', 'CCC_ROUTE_MENU']) delete env[key];
  const r = spawnSync(process.execPath, [path.join(CODEX, 'hooks', 'intent-classifier.js')], {
    input: JSON.stringify({ hook_event_name: 'UserPromptSubmit', session_id: 'dual', prompt: 'should I deploy this branch now or wait' }),
    encoding: 'utf8',
    timeout: 5000,
    env,
  });
  assert.strictEqual(r.status, 0, r.stderr);
  const context = JSON.parse(r.stdout).hookSpecificOutput.additionalContext;
  assert.match(context, /request_user_input/);
  assert.match(context, /\$ccc-deploy-check/);
  assert.doesNotMatch(context, /AskUserQuestion/);
});
