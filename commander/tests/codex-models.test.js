'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const CODEX_ADAPTER_DIR = path.join(__dirname, '..', 'adapters', 'codex');

function adapterUrl(file) {
  return pathToFileURL(path.join(CODEX_ADAPTER_DIR, file)).href;
}

const EXPECTED_IDS = [
  'gpt-5.5',
  'gpt-5.6-luna',
  'gpt-5.6-sol',
  'gpt-5.6-terra',
  'gpt-6-astra',
  'gpt-6-luna',
  'gpt-6-sol',
  'gpt-6.1-sol',
];

test('models: registry lists the GPT-6 family plus legacy fallbacks with required fields', async () => {
  const { CODEX_MODEL_REGISTRY } = await import(adapterUrl('models.js'));

  const ids = CODEX_MODEL_REGISTRY.map((entry) => entry.id).sort();
  assert.deepEqual(ids, EXPECTED_IDS);

  for (const entry of CODEX_MODEL_REGISTRY) {
    assert.ok(['flagship', 'balanced', 'light'].includes(entry.tier), `${entry.id} tier`);
    assert.ok(['6.1', '6', '5.6', '5.5'].includes(entry.family), `${entry.id} family`);
    assert.ok(['current', 'legacy', 'retiring'].includes(entry.status), `${entry.id} status`);
    assert.equal(entry.verified, '2026-10-13', `${entry.id} verified date`);
    assert.ok(entry.fallback === null || typeof entry.fallback === 'string', `${entry.id} fallback`);
    assert.ok(Object.isFrozen(entry), `${entry.id} frozen`);
  }
  assert.ok(Object.isFrozen(CODEX_MODEL_REGISTRY));
});

test('models: retired ids are absent', async () => {
  const { getModelEntry } = await import(adapterUrl('models.js'));
  for (const id of ['gpt-5.4', 'gpt-5.4-mini', 'gpt-5.3-codex', 'gpt-5.3-codex-spark', 'gpt-5.2']) {
    assert.equal(getModelEntry(id), null, `${id} must not be in the registry`);
  }
});

test('models: current entries carry tier, family and role', async () => {
  const { getModelEntry } = await import(adapterUrl('models.js'));
  const expected = {
    'gpt-6-astra': { tier: 'flagship', family: '6', role: 'deep' },
    'gpt-6.1-sol': { tier: 'balanced', family: '6.1', role: 'default' },
    'gpt-6-sol': { tier: 'balanced', family: '6', role: 'bounded' },
    'gpt-6-luna': { tier: 'light', family: '6', role: 'bulk' },
  };
  for (const [id, fields] of Object.entries(expected)) {
    const entry = getModelEntry(id);
    assert.equal(entry.status, 'current', `${id} status`);
    assert.equal(entry.tier, fields.tier, `${id} tier`);
    assert.equal(entry.family, fields.family, `${id} family`);
    assert.equal(entry.role, fields.role, `${id} role`);
  }
});

test('models: legacy and retiring entries are marked as such', async () => {
  const { getModelEntry } = await import(adapterUrl('models.js'));
  for (const id of ['gpt-5.6-sol', 'gpt-5.6-terra', 'gpt-5.6-luna']) {
    assert.equal(getModelEntry(id).status, 'legacy', `${id} status`);
  }
  const gpt55 = getModelEntry('gpt-5.5');
  assert.equal(gpt55.status, 'retiring');
  assert.equal(gpt55.retires, '2026-10-14');
  assert.equal(gpt55.fallback, null);
});

test('models: getDefaultModel returns gpt-6.1-sol and exactly one entry is default', async () => {
  const { CODEX_MODEL_REGISTRY, getDefaultModel } = await import(adapterUrl('models.js'));
  assert.equal(getDefaultModel().id, 'gpt-6.1-sol');
  assert.equal(CODEX_MODEL_REGISTRY.filter((entry) => entry.default === true).length, 1);
});

test('models: CODEX_ROUTING maps roles onto current registry ids', async () => {
  const { CODEX_ROUTING, getModelEntry } = await import(adapterUrl('models.js'));
  assert.deepEqual({ ...CODEX_ROUTING }, {
    deep: 'gpt-6-astra',
    default: 'gpt-6.1-sol',
    bounded: 'gpt-6-sol',
    bulk: 'gpt-6-luna',
  });
  assert.ok(Object.isFrozen(CODEX_ROUTING));
  for (const [role, id] of Object.entries(CODEX_ROUTING)) {
    const entry = getModelEntry(id);
    assert.equal(entry.status, 'current', `${role} target is current`);
    assert.equal(entry.role, role, `${id} role matches routing key`);
  }
});

test('models: resolveClaudeTier maps Claude aliases and ids to Codex roles', async () => {
  const { resolveClaudeTier } = await import(adapterUrl('models.js'));

  assert.equal(resolveClaudeTier('fable'), 'gpt-6-astra');
  assert.equal(resolveClaudeTier('claude-fable-5-1'), 'gpt-6-astra');
  assert.equal(resolveClaudeTier('opus'), 'gpt-6.1-sol');
  assert.equal(resolveClaudeTier('claude-opus-5-5'), 'gpt-6.1-sol');
  assert.equal(resolveClaudeTier('sonnet'), 'gpt-6-sol');
  assert.equal(resolveClaudeTier('claude-sonnet-5-5'), 'gpt-6-sol');
  assert.equal(resolveClaudeTier('haiku'), 'gpt-6-luna');
  assert.equal(resolveClaudeTier('claude-haiku-5-5'), 'gpt-6-luna');
  assert.equal(resolveClaudeTier('Opus'), 'gpt-6.1-sol');

  // Unknown / empty input falls back to the default role.
  assert.equal(resolveClaudeTier('inherit'), 'gpt-6.1-sol');
  assert.equal(resolveClaudeTier('some-future-model'), 'gpt-6.1-sol');
  assert.equal(resolveClaudeTier(''), 'gpt-6.1-sol');
  assert.equal(resolveClaudeTier(undefined), 'gpt-6.1-sol');
});

test('models: getModelEntry returns null for unknown id', async () => {
  const { getModelEntry } = await import(adapterUrl('models.js'));
  assert.equal(getModelEntry('gpt-9-nope'), null);
});

test('models: getModelsByFamily filters correctly', async () => {
  const { getModelsByFamily } = await import(adapterUrl('models.js'));
  assert.deepEqual(
    getModelsByFamily('6').map((entry) => entry.id).sort(),
    ['gpt-6-astra', 'gpt-6-luna', 'gpt-6-sol']
  );
  assert.deepEqual(getModelsByFamily('6.1').map((entry) => entry.id), ['gpt-6.1-sol']);
  assert.deepEqual(
    getModelsByFamily('5.6').map((entry) => entry.id).sort(),
    ['gpt-5.6-luna', 'gpt-5.6-sol', 'gpt-5.6-terra']
  );
  assert.deepEqual(getModelsByFamily('5.4'), []);
});

test('models: getFallbackChain walks fallback links until null, no cycles', async () => {
  const { CODEX_MODEL_REGISTRY, getFallbackChain, getModelEntry } = await import(adapterUrl('models.js'));

  assert.deepEqual(getFallbackChain('gpt-6-astra'), [
    'gpt-6-astra', 'gpt-6.1-sol', 'gpt-6-sol', 'gpt-5.6-sol', 'gpt-5.6-terra', 'gpt-5.6-luna',
  ]);
  assert.deepEqual(getFallbackChain('gpt-6-luna'), ['gpt-6-luna', 'gpt-5.6-luna']);
  assert.deepEqual(getFallbackChain('gpt-5.5'), ['gpt-5.5']);
  assert.deepEqual(getFallbackChain('nonexistent'), ['nonexistent']);

  // Every fallback target exists in the registry.
  for (const entry of CODEX_MODEL_REGISTRY) {
    if (entry.fallback !== null) {
      assert.ok(getModelEntry(entry.fallback), `${entry.id} -> ${entry.fallback} exists`);
    }
  }
});

test('models: remapModel (translate.js) emits only registry ids and passes unknown strings through', async () => {
  const { remapModel } = await import(adapterUrl('translate.js'));
  const { getModelEntry } = await import(adapterUrl('models.js'));

  for (const claude of ['fable', 'claude-fable-5-1', 'opus', 'claude-opus-5-5', 'sonnet', 'haiku', '', undefined]) {
    const codexId = remapModel(claude);
    assert.ok(getModelEntry(codexId), `remapModel(${claude}) -> ${codexId} is a registry id`);
  }
  assert.equal(remapModel('some-future-model-id'), 'some-future-model-id');
});
