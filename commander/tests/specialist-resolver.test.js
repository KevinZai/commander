'use strict';

// CC-1998: read-only specialist resolver pilot behind CCC_SPECIALIST_RESOLVER.

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { isEnabled, normalizeName, loadLibrary, resolveSpecialist, listSpecialists } = require('../lib/specialists');

const ON = { CCC_SPECIALIST_RESOLVER: '1' };

function fixture(files) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ccc-specialists-'));
  for (const [rel, body] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
    fs.writeFileSync(path.join(root, rel), body);
  }
  return root;
}

const agent = (name, extra = '') => `---\nname: ${name}\ndescription: "x"\n${extra}---\n\nbody\n`;

function snapshot(dir) {
  const out = [];
  const walk = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const full = path.join(d, e.name);
      if (e.isDirectory()) walk(full);
      else out.push(`${path.relative(dir, full)}:${fs.statSync(full).mtimeMs}`);
    }
  };
  walk(dir);
  return out.sort();
}

test('the flag is off by default and only 1/true/on enable it', () => {
  assert.strictEqual(isEnabled({}), false);
  for (const v of ['', '0', 'false', 'off', 'yes']) assert.strictEqual(isEnabled({ CCC_SPECIALIST_RESOLVER: v }), false, v);
  for (const v of ['1', 'true', 'ON', ' on ']) assert.strictEqual(isEnabled({ CCC_SPECIALIST_RESOLVER: v }), true, v);
});

test('disabled: resolve returns {enabled:false} and list returns [] without reading the plugin', () => {
  const missing = path.join(os.tmpdir(), 'ccc-specialists-does-not-exist');
  assert.deepStrictEqual(resolveSpecialist('architect', { env: {}, pluginRoot: missing }), { enabled: false });
  assert.deepStrictEqual(listSpecialists({ env: {}, pluginRoot: missing }), []);
});

test('names are normalised and unsafe names are rejected', () => {
  assert.strictEqual(normalizeName('  Commander:Architect '), 'architect');
  for (const bad of ['', '../architect', 'a/b', 'arch tect', '-x', null, undefined]) {
    assert.strictEqual(normalizeName(bad), null, String(bad));
  }
  assert.strictEqual(resolveSpecialist('../agents/architect', { env: ON }), null);
});

test('pilot: the shipped plugin resolves 20-30 canonical agents with provenance and no collisions', () => {
  const all = listSpecialists({ env: ON });
  const agents = all.filter((s) => s.canonical.kind === 'agent');
  assert.ok(agents.length >= 20 && agents.length <= 30, `pilot size ${agents.length}`);
  const lib = loadLibrary();
  assert.deepStrictEqual(lib.collisions, []);
  const architect = resolveSpecialist('commander:architect', { env: ON, library: lib });
  assert.strictEqual(architect.enabled, true);
  assert.deepStrictEqual(architect.canonical, { kind: 'agent', path: 'agents/architect.md' });
  assert.strictEqual(architect.persona, 'rules/personas/architect.md');
  assert.deepStrictEqual(architect.alsoAt, ['rules/personas/architect.md']);
  assert.strictEqual(architect.provenance.source, 'commander-plugin');
  assert.match(architect.provenance.version, /^\d+\.\d+\.\d+/);
  for (const s of agents) assert.ok(fs.existsSync(path.join(lib.root, s.canonical.path)), s.canonical.path);
});

test('an unknown name resolves to null', () => {
  assert.strictEqual(resolveSpecialist('no-such-specialist', { env: ON }), null);
});

test('collisions are reported, the first agent stays canonical, and a persona-only name resolves to the persona', () => {
  const root = fixture({
    'agents/alpha.md': agent('alpha', 'persona: personas/alpha\n'),
    'agents/alpha-copy.md': agent('alpha'),
    'agents/beta.md': agent('beta', 'persona: personas/gone\n'),
    'agents/gamma.md': agent('gamma'),
    'rules/personas/alpha.md': '# Persona: Alpha\n',
    'rules/personas/gamma.md': '# Persona: Gamma\n',
    'rules/personas/solo.md': '# Persona: Solo\n',
    'rules/personas/README.md': '# index\n',
  });
  const lib = loadLibrary(root);
  const kinds = lib.collisions.map((c) => `${c.name}:${c.kind}`).sort();
  assert.deepStrictEqual(kinds, ['alpha:duplicate-agent', 'alpha:name-mismatch', 'beta:missing-persona']);

  const alpha = resolveSpecialist('alpha', { env: ON, library: lib });
  assert.strictEqual(alpha.canonical.path, 'agents/alpha.md');
  assert.strictEqual(alpha.collisions.length, 2);

  const beta = resolveSpecialist('beta', { env: ON, library: lib });
  assert.strictEqual(beta.persona, null);

  const gamma = resolveSpecialist('gamma', { env: ON, library: lib });
  assert.strictEqual(gamma.persona, 'rules/personas/gamma.md', 'persona matched by name when not declared');

  const solo = resolveSpecialist('solo', { env: ON, library: lib });
  assert.deepStrictEqual(solo.canonical, { kind: 'persona', path: 'rules/personas/solo.md' });
  assert.strictEqual(solo.provenance.version, null, 'no plugin.json means no version, not a crash');

  assert.strictEqual(resolveSpecialist('readme', { env: ON, library: lib }), null);
});

test('a persona reference that escapes rules/personas is reported, not followed', () => {
  const root = fixture({
    'agents/delta.md': agent('delta', 'persona: ../../outside\n'),
    'outside.md': 'not a persona\n',
  });
  const lib = loadLibrary(root);
  assert.deepStrictEqual(lib.collisions.map((c) => c.kind), ['missing-persona']);
  assert.strictEqual(resolveSpecialist('delta', { env: ON, library: lib }).persona, null);
});

test('a persona symlink that points outside rules/personas is reported, not followed', () => {
  const outside = fixture({ 'secret.md': 'outside the plugin\n' });
  const root = fixture({ 'agents/zeta.md': agent('zeta', 'persona: personas/zeta\n') });
  fs.mkdirSync(path.join(root, 'rules', 'personas'), { recursive: true });
  fs.symlinkSync(path.join(outside, 'secret.md'), path.join(root, 'rules', 'personas', 'zeta.md'));
  const lib = loadLibrary(root);
  assert.deepStrictEqual(lib.collisions.map((c) => `${c.name}:${c.kind}`), ['zeta:missing-persona']);
  assert.strictEqual(resolveSpecialist('zeta', { env: ON, library: lib }).persona, null);
});

test('a persona that is a directory is not accepted as a profile', () => {
  const root = fixture({ 'agents/eta.md': agent('eta', 'persona: personas/eta\n') });
  fs.mkdirSync(path.join(root, 'rules', 'personas', 'eta.md'), { recursive: true });
  const lib = loadLibrary(root);
  assert.deepStrictEqual(lib.collisions.map((c) => c.kind), ['missing-persona']);
});

test('missing agents/ and personas/ dirs give an empty library, not an error', () => {
  const root = fixture({ 'README.md': 'empty plugin\n' });
  assert.deepStrictEqual(listSpecialists({ env: ON, pluginRoot: root }), []);
});

test('resolving is read-only: the plugin tree is unchanged afterwards', () => {
  const root = fixture({ 'agents/eps.md': agent('eps'), 'rules/personas/eps.md': '# P\n' });
  const before = snapshot(root);
  listSpecialists({ env: ON, pluginRoot: root });
  resolveSpecialist('eps', { env: ON, pluginRoot: root });
  assert.deepStrictEqual(snapshot(root), before);
});
