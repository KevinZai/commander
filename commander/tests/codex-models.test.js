'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const CODEX_ADAPTER_DIR = path.join(__dirname, '..', 'adapters', 'codex');

function adapterUrl(file) {
  return pathToFileURL(path.join(CODEX_ADAPTER_DIR, file)).href;
}

test('models: registry contains all 6 known Codex models with required fields', async () => {
  const { CODEX_MODEL_REGISTRY } = await import(adapterUrl('models.js'));

  assert.equal(CODEX_MODEL_REGISTRY.length, 6);

  const ids = CODEX_MODEL_REGISTRY.map((entry) => entry.id).sort();
  assert.deepEqual(ids, [
    'gpt-5.4',
    'gpt-5.4-mini',
    'gpt-5.5',
    'gpt-5.6-luna',
    'gpt-5.6-sol',
    'gpt-5.6-terra',
  ]);

  for (const entry of CODEX_MODEL_REGISTRY) {
    assert.equal(typeof entry.id, 'string');
    assert.ok(['flagship', 'balanced', 'light'].includes(entry.tier), `${entry.id} tier`);
    assert.ok(['5.6', '5.5', '5.4'].includes(entry.family), `${entry.id} family`);
    assert.match(entry.verified, /^\d{4}-\d{2}-\d{2}$/, `${entry.id} verified date`);
    assert.ok(entry.fallback === null || typeof entry.fallback === 'string', `${entry.id} fallback`);
  }
});

test('models: GPT-5.6 tier assignment matches Sol=flagship, Terra=balanced, Luna=light', async () => {
  const { getModelEntry } = await import(adapterUrl('models.js'));

  assert.equal(getModelEntry('gpt-5.6-sol').tier, 'flagship');
  assert.equal(getModelEntry('gpt-5.6-terra').tier, 'balanced');
  assert.equal(getModelEntry('gpt-5.6-luna').tier, 'light');
});

test('models: getModelEntry returns null for unknown id', async () => {
  const { getModelEntry } = await import(adapterUrl('models.js'));
  assert.equal(getModelEntry('gpt-9-nope'), null);
});

test('models: getModelsByFamily filters correctly', async () => {
  const { getModelsByFamily } = await import(adapterUrl('models.js'));
  const family56 = getModelsByFamily('5.6');
  assert.equal(family56.length, 3);
  assert.deepEqual(
    family56.map((entry) => entry.id).sort(),
    ['gpt-5.6-luna', 'gpt-5.6-sol', 'gpt-5.6-terra']
  );
});

test('models: getFallbackChain walks fallback -> fallback until null, no cycles', async () => {
  const { getFallbackChain } = await import(adapterUrl('models.js'));

  assert.deepEqual(
    getFallbackChain('gpt-5.6-sol'),
    ['gpt-5.6-sol', 'gpt-5.5', 'gpt-5.4', 'gpt-5.4-mini']
  );
  assert.deepEqual(
    getFallbackChain('gpt-5.6-terra'),
    ['gpt-5.6-terra', 'gpt-5.5', 'gpt-5.4', 'gpt-5.4-mini']
  );
  assert.deepEqual(
    getFallbackChain('gpt-5.6-luna'),
    ['gpt-5.6-luna', 'gpt-5.4-mini']
  );
  // Terminal node has no fallback.
  assert.deepEqual(getFallbackChain('gpt-5.4-mini'), ['gpt-5.4-mini']);
  // Unknown id resolves to itself only.
  assert.deepEqual(getFallbackChain('nonexistent'), ['nonexistent']);
});

test('models: remapModel (translate.js) routes Claude tiers onto the GPT-5.6 family', async () => {
  const { remapModel } = await import(adapterUrl('translate.js'));

  assert.equal(remapModel('claude-fable-5'), 'gpt-5.6-sol');
  assert.equal(remapModel('claude-opus-4-8'), 'gpt-5.6-sol');
  assert.equal(remapModel('claude-sonnet-5'), 'gpt-5.6-terra');
  assert.equal(remapModel('claude-sonnet-4-7'), 'gpt-5.6-terra');
  assert.equal(remapModel('claude-haiku-4-5'), 'gpt-5.6-luna');
  assert.equal(remapModel(''), 'gpt-5.6-terra');
  assert.equal(remapModel(undefined), 'gpt-5.6-terra');
});

test('models: remapModel passes through unrecognized Claude model strings unchanged', async () => {
  const { remapModel } = await import(adapterUrl('translate.js'));
  assert.equal(remapModel('some-future-model-id'), 'some-future-model-id');
});
