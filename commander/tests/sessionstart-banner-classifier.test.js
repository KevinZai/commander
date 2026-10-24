'use strict';

// #209 non-blocking findings from the Fable E2E:
//  1. SessionStart banner said "CCC 4.0.0" instead of the plugin version
//     (hooks/_archive/session-start.js resolved plugin.json from the wrong dir).
//  2. "Context compacted — re-orienting" printed on a fresh startup
//     (post-compact-recovery ran unconditionally inside the SessionStart orchestrator).
//  3. The intent classifier sent "audit" to /ccc-research instead of /ccc-xray.

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { pathToFileURL } = require('node:url');

const PLUGIN = path.join(__dirname, '..', 'cowork-plugin');
const HOOKS = path.join(PLUGIN, 'hooks');
const PLUGIN_VERSION = JSON.parse(
  fs.readFileSync(path.join(PLUGIN, '.claude-plugin', 'plugin.json'), 'utf8')
).version;

function tmpHome(t) {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'ccc-209-home-'));
  t.after(function () { fs.rmSync(home, { recursive: true, force: true }); });
  // Returning user (onboarded, not first session, no version transition), so
  // session-start prints the "CCC <version> | Sessions: …" banner.
  const ccc = path.join(home, '.claude', 'commander');
  fs.mkdirSync(path.join(ccc, 'sessions'), { recursive: true });
  fs.mkdirSync(path.join(home, '.claude', 'sessions'), { recursive: true });
  fs.writeFileSync(path.join(home, '.claude', 'sessions', 'prior.json'), '{}');
  fs.writeFileSync(path.join(ccc, 'state.json'), JSON.stringify({
    onboardingCompleted: true,
    last_seen_version: PLUGIN_VERSION,
  }));
  return home;
}

function runOrchestrator(home, payload) {
  const r = spawnSync(process.execPath, [path.join(HOOKS, 'orchestrator', 'session-start-orchestrator.js')], {
    input: JSON.stringify(payload),
    encoding: 'utf8',
    timeout: 15000,
    env: Object.assign({}, process.env, { HOME: home, USERPROFILE: home, CCC_TELEMETRY: '0', DO_NOT_TRACK: '1' }),
  });
  assert.strictEqual(r.status, 0, 'orchestrator should exit 0. stderr: ' + r.stderr);
  const line = r.stdout.trim().split('\n').filter(Boolean).pop();
  return JSON.parse(line);
}

test('session-start banner reports the plugin.json version, not 4.0.0', async function (t) {
  const home = tmpHome(t);
  const mod = await import(pathToFileURL(path.join(HOOKS, '_archive', 'session-start.js')).href);
  const out = await mod.run({ home: home, cwd: home });
  const text = JSON.stringify(out);
  assert.ok(text.includes('CCC ' + PLUGIN_VERSION + ' '), 'banner should say CCC ' + PLUGIN_VERSION + ': ' + text);
  assert.ok(!text.includes('CCC 4.0.0'), 'banner must not fall back to 4.0.0: ' + text);
});

test('post-compact-recovery stays silent on SessionStart startup/resume/clear', async function () {
  const mod = await import(pathToFileURL(path.join(HOOKS, 'post-compact-recovery.js')).href);
  for (const source of ['startup', 'resume', 'clear']) {
    const out = await mod.run({ input: { hook_event_name: 'SessionStart', source: source } });
    assert.ok(!JSON.stringify(out).includes('Context compacted'), source + ' must not claim a compaction');
  }
});

test('post-compact-recovery still re-orients after a compaction', async function () {
  const mod = await import(pathToFileURL(path.join(HOOKS, 'post-compact-recovery.js')).href);
  const viaSessionStart = await mod.run({ input: { hook_event_name: 'SessionStart', source: 'compact' } });
  assert.ok(JSON.stringify(viaSessionStart).includes('Context compacted'), 'SessionStart source=compact should re-orient');
  const viaPostCompact = await mod.run({ input: { hook_event_name: 'PostCompact', trigger: 'auto' } });
  assert.ok(JSON.stringify(viaPostCompact).includes('Context compacted'), 'PostCompact hook should re-orient');
});

test('SessionStart orchestrator on a fresh startup: right version, no compaction notice', function (t) {
  const home = tmpHome(t);
  const out = runOrchestrator(home, { hook_event_name: 'SessionStart', source: 'startup', session_id: 'test-209' });
  const text = JSON.stringify(out);
  assert.ok(text.includes('CCC ' + PLUGIN_VERSION), 'expected CCC ' + PLUGIN_VERSION + ' in: ' + text);
  assert.ok(!text.includes('CCC 4.0.0'), 'must not say CCC 4.0.0');
  assert.ok(!text.includes('Context compacted'), 'fresh startup must not say Context compacted: ' + text);
});

function classify(prompt) {
  const r = spawnSync(process.execPath, [path.join(HOOKS, 'intent-classifier.js')], {
    input: JSON.stringify({ prompt: prompt }),
    encoding: 'utf8',
    timeout: 5000,
    env: Object.assign({}, process.env, { HOME: os.tmpdir(), USERPROFILE: os.tmpdir() }),
  });
  assert.strictEqual(r.status, 0, 'classifier should exit 0');
  return JSON.parse(r.stdout.trim());
}

test('intent classifier routes "audit" to /ccc-xray, not /ccc-research', function () {
  for (const prompt of ['audit this repo', 'run a security audit please']) {
    const msg = classify(prompt).systemMessage || '';
    assert.ok(msg.includes('/ccc-xray'), prompt + ' → expected /ccc-xray, got: ' + msg);
    assert.ok(!msg.includes('/ccc-research'), prompt + ' must not suggest /ccc-research');
  }
});

test('intent classifier still routes research prompts to /ccc-research', function () {
  const msg = classify('research the competitive landscape').systemMessage || '';
  assert.ok(msg.includes('/ccc-research'), 'expected /ccc-research, got: ' + msg);
});
