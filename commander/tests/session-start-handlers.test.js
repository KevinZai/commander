'use strict';
// CC-2099: fable-armed-nudge.js and voice-injector.js run through the
// SessionStart orchestrator; their run() exports are the contract it uses.

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const HOOKS = path.join(__dirname, '..', 'cowork-plugin', 'hooks');
const load = (f) => import(pathToFileURL(path.join(HOOKS, f)).href);

test('fable-armed-nudge: run() emits the user-visible reminder', async () => {
  const { run } = await load('fable-armed-nudge.js');
  const r = await run({ env: {} });
  assert.equal(r.continue, true);
  assert.match(r.systemMessage, /Fable Method armed/);
});

test('fable-armed-nudge: CCC_FABLE_NUDGE_DISABLE=1 silences it', async () => {
  const { run } = await load('fable-armed-nudge.js');
  assert.deepEqual(await run({ env: { CCC_FABLE_NUDGE_DISABLE: '1' } }), { continue: true });
});

test('voice-injector: run() adds model context on SessionStart only', async () => {
  const { run } = await load('voice-injector.js');
  const r = await run({ input: { hook_event_name: 'SessionStart' }, env: {} });
  assert.equal(r.continue, true);
  assert.equal(r.hookSpecificOutput.hookEventName, 'SessionStart');
  assert.match(r.hookSpecificOutput.additionalContext, /CC Commander voice/);
});

test('voice-injector: CCC_VOICE_DISABLE=1 silences it', async () => {
  const { run } = await load('voice-injector.js');
  assert.deepEqual(await run({ input: {}, env: { CCC_VOICE_DISABLE: '1' } }), { continue: true });
});
