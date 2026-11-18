'use strict';
// CC-2099: fable-armed-nudge.js and voice-injector.js run through the
// SessionStart orchestrator; their run() exports are the contract it uses.

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const os = require('node:os');
const fs = require('node:fs');
const { pathToFileURL } = require('node:url');

const HOOKS = path.join(__dirname, '..', 'cowork-plugin', 'hooks');
const load = (f) => import(pathToFileURL(path.join(HOOKS, f)).href);

// Codex audit #37: the line reports the persisted fableMethod flag, never a blanket "armed".
const fableHome = (state) => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'ccc-fable-'));
  if (state !== undefined) {
    fs.mkdirSync(path.join(home, '.claude', 'commander'), { recursive: true });
    fs.writeFileSync(path.join(home, '.claude', 'commander', 'state.json'), typeof state === 'string' ? state : JSON.stringify(state));
  }
  return home;
};

test('fable-armed-nudge: no state.json reports not armed', async () => {
  const { run } = await load('fable-armed-nudge.js');
  const r = await run({ env: { HOME: fableHome() } });
  assert.equal(r.continue, true);
  assert.match(r.systemMessage, /Commander Method: not armed/);
  assert.doesNotMatch(r.systemMessage, /armed:|Method armed/);
});

test('fable-armed-nudge: stored on flag says so, and that it is not yet applied this session', async () => {
  const { run } = await load('fable-armed-nudge.js');
  const r = await run({ env: { HOME: fableHome({ other: 1, fableMethod: { armed: true, since: '2026-11-01T10:00:00.000Z' } }) } });
  assert.match(r.systemMessage, /flag: on since 2026-11-01/);
  assert.match(r.systemMessage, /not yet applied this session/);
  assert.match(r.systemMessage, /\/ccc-fable audit/);
});

test('fable-armed-nudge: disarmed flag reports off', async () => {
  const { run } = await load('fable-armed-nudge.js');
  const r = await run({ env: { HOME: fableHome({ fableMethod: { armed: false, since: '2026-11-02T10:00:00.000Z' } }) } });
  assert.match(r.systemMessage, /Commander Method: off since 2026-11-02/);
  assert.doesNotMatch(r.systemMessage, /flag: on/);
});

test('fable-armed-nudge: unreadable state.json is reported as unknown', async () => {
  const { run } = await load('fable-armed-nudge.js');
  const r = await run({ env: { HOME: fableHome('{ not json') } });
  assert.match(r.systemMessage, /armed state unknown/);
});

test('fable-armed-nudge: reads the lane state dir first (CCC_CONFIG_DIR)', async () => {
  const { run } = await load('fable-armed-nudge.js');
  const home = fableHome({ fableMethod: { armed: false } });
  const lane = fs.mkdtempSync(path.join(os.tmpdir(), 'ccc-fable-lane-'));
  fs.mkdirSync(path.join(lane, 'commander'), { recursive: true });
  fs.writeFileSync(path.join(lane, 'commander', 'state.json'), JSON.stringify({ fableMethod: { armed: true } }));
  const r = await run({ env: { HOME: home, CCC_CONFIG_DIR: lane } });
  assert.match(r.systemMessage, /flag: on/);
});

test('fable-armed-nudge: CCC_FABLE_NUDGE_DISABLE=1 silences it', async () => {
  const { run } = await load('fable-armed-nudge.js');
  assert.deepEqual(await run({ env: { CCC_FABLE_NUDGE_DISABLE: '1' } }), { continue: true });
});

// CC-2112: the voice block is opt-in; by default it injects nothing.
const emptyHome = () => fs.mkdtempSync(path.join(os.tmpdir(), 'ccc-voice-'));

test('voice-injector: silent by default (no env, no config)', async () => {
  const { run } = await load('voice-injector.js');
  const r = await run({ input: { hook_event_name: 'SessionStart' }, env: { HOME: emptyHome() } });
  assert.deepEqual(r, { continue: true });
});

test('voice-injector: CCC_VOICE=1 adds model context on SessionStart', async () => {
  const { run } = await load('voice-injector.js');
  const r = await run({ input: { hook_event_name: 'SessionStart' }, env: { HOME: emptyHome(), CCC_VOICE: '1' } });
  assert.equal(r.continue, true);
  assert.equal(r.hookSpecificOutput.hookEventName, 'SessionStart');
  assert.match(r.hookSpecificOutput.additionalContext, /CC Commander voice/);
  assert.equal(r.systemMessage, undefined, 'voice is model context only, never a user message');
});

test('voice-injector: "voice": true in the lane config opts in', async () => {
  const { run } = await load('voice-injector.js');
  const home = emptyHome();
  fs.mkdirSync(path.join(home, '.claude', 'commander'), { recursive: true });
  fs.writeFileSync(path.join(home, '.claude', 'commander', 'config.json'), JSON.stringify({ voice: true }));
  const r = await run({ input: { hook_event_name: 'SessionStart' }, env: { HOME: home } });
  assert.match(r.hookSpecificOutput.additionalContext, /CC Commander voice/);
});

test('voice-injector: CCC_VOICE_DISABLE=1 wins over CCC_VOICE=1', async () => {
  const { run } = await load('voice-injector.js');
  assert.deepEqual(await run({ input: {}, env: { HOME: emptyHome(), CCC_VOICE: '1', CCC_VOICE_DISABLE: '1' } }), { continue: true });
});

// Same spellings as CCC_OFFLINE / CCC_TELEMETRY (shared envFlag).
for (const on of ['1', 'true', 'TRUE', 'yes', 'on']) {
  test(`voice-injector: CCC_VOICE=${on} opts in`, async () => {
    const { run } = await load('voice-injector.js');
    const r = await run({ input: { hook_event_name: 'SessionStart' }, env: { HOME: emptyHome(), CCC_VOICE: on } });
    assert.match(r.hookSpecificOutput.additionalContext, /CC Commander voice/);
  });
}

test('voice-injector: CCC_VOICE=false/off/no and an unknown value stay silent; DISABLE=true wins', async () => {
  const { run } = await load('voice-injector.js');
  for (const env of [{ CCC_VOICE: 'false' }, { CCC_VOICE: 'off' }, { CCC_VOICE: 'no' }, { CCC_VOICE: 'maybe' }, { CCC_VOICE: 'on', CCC_VOICE_DISABLE: 'true' }]) {
    assert.deepEqual(await run({ input: {}, env: { HOME: emptyHome(), ...env } }), { continue: true }, JSON.stringify(env));
  }
});
