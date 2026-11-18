'use strict';

// Activation (lib/activation.mjs + scripts/activation.mjs): first-run detection
// for /ccc-start and the once-only `first_result` event. With telemetry off the
// event is never queued; the local state file still records the first result.

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const PLUGIN = path.join(__dirname, '..', 'cowork-plugin');
const SCRIPT = path.join(PLUGIN, 'scripts', 'activation.mjs');
const libP = import(path.join(PLUGIN, 'lib', 'activation.mjs'));

function sandbox(extra = {}) {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'ccc-activation-'));
  return { HOME: home, USERPROFILE: home, PATH: process.env.PATH, ...extra };
}

function stateOf(env) {
  return JSON.parse(fs.readFileSync(path.join(env.HOME, '.claude', 'commander', 'state.json'), 'utf8'));
}

test('detectFirstRun: no state is a first run; --stamp records firstRunAt once', async () => {
  const lib = await libP;
  const env = sandbox();
  const d = lib.detectFirstRun({ env });
  assert.strictEqual(d.first_run, true);
  assert.strictEqual(d.state_exists, false);
  assert.strictEqual(d.telemetry, false);
  lib.detectFirstRun({ env, stamp: true, now: new Date('2026-11-18T10:00:00Z') });
  lib.detectFirstRun({ env, stamp: true, now: new Date('2026-11-18T11:00:00Z') });
  assert.strictEqual(stateOf(env).firstRunAt, '2026-11-18T10:00:00.000Z');
  lib.markOnboardingComplete({ env });
  assert.strictEqual(lib.detectFirstRun({ env }).first_run, false);
});

test('recordFirstResult fires once and never sends with telemetry off', async () => {
  const lib = await libP;
  const env = sandbox();
  const sent = [];
  const track = async (name, props) => { sent.push([name, props]); };
  const a = await lib.recordFirstResult('ccc-xray', { env, track });
  assert.strictEqual(a.recorded, true);
  assert.strictEqual(a.sent, false);
  assert.deepStrictEqual(sent, [], 'telemetry off: nothing queued');
  const b = await lib.recordFirstResult('ccc-plan', { env, track });
  assert.strictEqual(b.recorded, false, 'second result is not a first result');
  assert.strictEqual(stateOf(env).firstResultSkill, 'ccc-xray');
});

test('recordFirstResult with telemetry opted in queues one first_result event', async () => {
  const lib = await libP;
  const env = sandbox({ CCC_TELEMETRY: '1' });
  lib.detectFirstRun({ env, stamp: true, now: new Date('2026-11-18T10:00:00Z') });
  const sent = [];
  const track = async (name, props) => { sent.push([name, props]); };
  const r = await lib.recordFirstResult('ccc-start', { env, track, via: 'ccc-xray', now: new Date('2026-11-18T10:03:20Z') });
  assert.strictEqual(r.sent, true);
  assert.deepStrictEqual(sent, [['first_result', { skill: 'ccc-start', via: 'ccc-xray', seconds_since_first_run: 200 }]]);
  await lib.recordFirstResult('ccc-review', { env, track });
  assert.strictEqual(sent.length, 1, 'fires once per install');
});

test('CCC_OFFLINE beats an opt-in: nothing is queued', async () => {
  const lib = await libP;
  const env = sandbox({ CCC_TELEMETRY: '1', CCC_OFFLINE: '1' });
  const sent = [];
  const r = await lib.recordFirstResult('ccc-plan', { env, track: async (...a) => { sent.push(a); } });
  assert.strictEqual(r.sent, false);
  assert.strictEqual(sent.length, 0);
});

test('recordFirstResult rejects a non-flagship skill', async () => {
  const lib = await libP;
  await assert.rejects(lib.recordFirstResult('ccc-seo', { env: sandbox() }), /not a flagship/);
});

test('CLI: detect, first-result, complete (telemetry off)', () => {
  const env = sandbox();
  const call = (...args) => {
    const r = spawnSync(process.execPath, [SCRIPT, ...args], { env, encoding: 'utf8' });
    return { code: r.status, json: JSON.parse(r.stdout) };
  };
  assert.strictEqual(call('detect', '--stamp').json.first_run, true);
  const first = call('first-result', 'ccc-xray');
  assert.deepStrictEqual(first.json, { ok: true, recorded: true, sent: false, skill: 'ccc-xray' });
  assert.strictEqual(call('first-result', 'ccc-xray').json.recorded, false);
  assert.strictEqual(call('first-result', 'not-a-skill').code, 1);
  assert.strictEqual(call('complete').json.message, 'onboarding marked complete');
  assert.strictEqual(stateOf(env).onboardingCompleted, true);
  assert.strictEqual(call('detect').json.first_run, false);
});
