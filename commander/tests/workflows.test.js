// Static and stubbed-runtime checks for the plugin-distributed workflows in
// commander/cowork-plugin/workflows/*.workflow.js (run as /commander:<meta.name>).
//
// `node --check` cannot parse these files: the Workflow runtime executes the
// body as an async function, so it uses top-level `await` and `return`. The
// syntax check below compiles the body the same way the runtime does.

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..', '..');
const WF_DIR = path.join(ROOT, 'commander', 'cowork-plugin', 'workflows');
const FILES = fs.readdirSync(WF_DIR).filter(f => f.endsWith('.workflow.js')).sort();
const EXPECTED = ['ccc-audit', 'ccc-deep-review', 'ccc-fleet-run', 'ccc-migrate', 'ccc-prompt-audit', 'ccc-release-audit'];
const EFFORTS = new Set(['low', 'medium', 'high', 'xhigh', 'max']);
const HOOKS = ['agent', 'parallel', 'pipeline', 'phase', 'log', 'args', 'budget', 'workflow'];
const AsyncFunction = (async () => {}).constructor;

/** Return [metaText, bodyText] split at the end of the `export const meta = {...}` literal. */
function splitMeta(src) {
  const head = 'export const meta = ';
  assert.ok(src.startsWith(head), 'file must begin with `export const meta = {`');
  let i = head.length;
  assert.strictEqual(src[i], '{', 'meta must be an object literal');
  let depth = 0;
  let quote = null;
  for (; i < src.length; i++) {
    const c = src[i];
    if (quote) {
      if (c === '\\') { i++; continue; }
      if (c === quote) quote = null;
      continue;
    }
    if (c === "'" || c === '"' || c === '`') { quote = c; continue; }
    if (c === '{') depth++;
    if (c === '}') { depth--; if (depth === 0) break; }
  }
  return [src.slice(head.length, i + 1), src.slice(i + 1)];
}

/** A pure literal has only keys, strings, numbers, booleans, null, and punctuation. */
function assertPureLiteral(metaText) {
  assert.ok(!metaText.includes('${'), 'meta must not use template interpolation');
  assert.ok(!metaText.includes('...'), 'meta must not use spreads');
  const stripped = metaText.replace(/'(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*"|`(?:\\.|[^`\\])*`/g, '""');
  const leftover = stripped
    .replace(/\b[A-Za-z_$][\w$]*\s*:/g, '')
    .replace(/""/g, '')
    .replace(/\b(true|false|null)\b/g, '')
    .replace(/-?\d+(\.\d+)?/g, '')
    .replace(/[{}[\]:,\s]/g, '');
  assert.strictEqual(leftover, '', `meta contains non-literal tokens: ${leftover}`);
}

function loadMeta(src) {
  const [metaText] = splitMeta(src);
  assertPureLiteral(metaText);
  return vm.runInNewContext(`(${metaText})`, Object.create(null));
}

function bodyOf(src) {
  return splitMeta(src)[1].replace(/^\s*;?/, '');
}

/** Build a minimal value that satisfies a JSON schema (arrays get one element). */
function fill(schema) {
  if (!schema) return 'ok';
  if (schema.enum) return schema.enum[0];
  switch (schema.type) {
    case 'object': {
      const out = {};
      for (const [k, v] of Object.entries(schema.properties || {})) out[k] = fill(v);
      return out;
    }
    case 'array': return [fill(schema.items)];
    case 'number': case 'integer': return 0;
    case 'boolean': return false;
    default: return 'x';
  }
}

async function runStubbed(src, args) {
  const calls = [];
  const agent = async (prompt, opts = {}) => {
    assert.strictEqual(typeof prompt, 'string');
    calls.push(opts);
    return fill(opts.schema);
  };
  const parallel = (thunks) => Promise.all(thunks.map(t => Promise.resolve().then(t).catch(() => null)));
  const pipeline = (items, ...stages) => Promise.all(items.map(async (item, index) => {
    let prev = item;
    try {
      for (const stage of stages) prev = await stage(prev, item, index);
      return prev;
    } catch {
      return null;
    }
  }));
  const fn = new AsyncFunction(...HOOKS, bodyOf(src));
  const budget = { total: null, spent: () => 0, remaining: () => Infinity };
  const result = await fn(agent, parallel, pipeline, () => {}, () => {}, args, budget, async () => null);
  return { result, calls };
}

test('the expected workflow set is present', () => {
  const names = FILES.map(f => f.replace(/\.workflow\.js$/, ''));
  for (const n of EXPECTED) assert.ok(names.includes(n), `missing workflow ${n}`);
});

for (const file of FILES) {
  const src = fs.readFileSync(path.join(WF_DIR, file), 'utf8');
  const stem = file.replace(/\.workflow\.js$/, '');

  test(`${file}: meta is a pure literal with name, description, whenToUse, phases`, () => {
    const meta = loadMeta(src);
    assert.strictEqual(meta.name, stem, 'meta.name must match the file name');
    assert.ok(typeof meta.description === 'string' && meta.description.length > 20, 'description required');
    assert.ok(meta.description.length <= 200, 'description stays one line (200 chars max)');
    assert.ok(typeof meta.whenToUse === 'string' && meta.whenToUse.length > 0, 'whenToUse required');
    assert.ok(Array.isArray(meta.phases) && meta.phases.length > 0, 'phases required');
    for (const p of meta.phases) assert.ok(p.title && p.detail, 'each phase needs title and detail');
  });

  test(`${file}: body compiles as the runtime runs it`, () => {
    assert.doesNotThrow(() => new vm.Script(`(async function (${HOOKS.join(', ')}) {${bodyOf(src)}\n})`, { filename: file }));
  });

  test(`${file}: phase names, opts, and determinism rules`, () => {
    const meta = loadMeta(src);
    const titles = new Set(meta.phases.map(p => p.title));
    const used = [...src.matchAll(/\bphase\(\s*'([^']+)'\s*\)|\bphase:\s*'([^']+)'/g)].map(m => m[1] || m[2]);
    assert.ok(used.length > 0, 'agents are assigned to phases');
    for (const t of used) assert.ok(titles.has(t), `phase "${t}" is not declared in meta.phases`);

    assert.ok(!/Date\.now\(|Math\.random\(|new Date\(\s*\)/.test(src), 'Date.now, Math.random, and argless new Date throw in workflows');
    for (const m of src.matchAll(/\beffort:\s*'([^']+)'/g)) assert.ok(EFFORTS.has(m[1]), `bad effort ${m[1]}`);
    assert.ok(/\beffort:\s*'/.test(src), 'stages set effort');
    for (const m of src.matchAll(/\bisolation:\s*'([^']+)'/g)) assert.strictEqual(m[1], 'worktree');
    for (const m of src.matchAll(/\bmodel:\s*'([^']+)'/g)) assert.strictEqual(m[1], 'fable', 'only the fable alias may be pinned');
    assert.ok(/^\/\/ args/m.test(src), 'args contract documented at the top');
    assert.ok(/refut/i.test(src), 'verifiers are prompted to refute');
  });
}

const STUB_ARGS = {
  'ccc-audit': [undefined, { target: 'src', dimensions: ['security', 'docs'] }],
  'ccc-deep-review': [undefined, { base: 'origin/main' }],
  'ccc-fleet-run': [
    { mode: 'fanout', tasks: ['a', 'b'] },
    { mode: 'pipeline', tasks: ['a', 'b'] },
    { mode: 'judge', task: 'x', attempts: 2 },
    { mode: 'debate', task: 'x', rounds: 2 },
  ],
  'ccc-migrate': [{ pattern: 'p', transform: 't' }],
  'ccc-prompt-audit': [undefined, { paths: ['commander/cowork-plugin/skills/ccc/SKILL.md'] }],
  'ccc-release-audit': [undefined, { version: '8.0.0', postRelease: true, skipTests: true }],
};

for (const [name, argSets] of Object.entries(STUB_ARGS)) {
  const file = `${name}.workflow.js`;
  if (!FILES.includes(file)) continue;
  const src = fs.readFileSync(path.join(WF_DIR, file), 'utf8');
  argSets.forEach((args, i) => {
    test(`${file}: stubbed run ${i + 1} returns a result`, async () => {
      const { result, calls } = await runStubbed(src, args);
      assert.ok(result && typeof result === 'object', 'workflow returns an object');
      assert.ok(calls.length > 0, 'workflow spawns agents');
      for (const opts of calls) assert.ok(opts.effort, `agent "${opts.label}" sets effort`);
    });
  });
}

test('ccc-fleet-run and ccc-migrate reject missing args', async () => {
  for (const name of ['ccc-fleet-run', 'ccc-migrate']) {
    const src = fs.readFileSync(path.join(WF_DIR, `${name}.workflow.js`), 'utf8');
    await assert.rejects(() => runStubbed(src, undefined), /requires args/);
  }
});

test('ccc-release-audit returns no-go when a gate fails', async () => {
  const src = fs.readFileSync(path.join(WF_DIR, 'ccc-release-audit.workflow.js'), 'utf8');
  const fn = new AsyncFunction(...HOOKS, bodyOf(src));
  const agent = async (prompt, opts = {}) => {
    if (opts.label && opts.label.endsWith(':audit-counts')) return { id: 'audit-counts', command: 'c', exitCode: 1, outputTail: 'drift' };
    if (opts.schema && opts.schema.properties && opts.schema.properties.mismatches) return { mismatches: [] };
    if (opts.schema && opts.schema.properties && opts.schema.properties.exitCode) {
      return { id: 'g', command: 'c', exitCode: /stale-models|codex-mirror/.test(opts.label) ? 1 : 0, outputTail: /plugin-validate/.test(opts.label) ? 'Validation passed' : '' };
    }
    return fill(opts.schema);
  };
  const parallel = (thunks) => Promise.all(thunks.map(t => Promise.resolve().then(t).catch(() => null)));
  const pipeline = (items, ...stages) => Promise.all(items.map(async (item, index) => {
    let prev = item;
    for (const stage of stages) prev = await stage(prev, item, index);
    return prev;
  }));
  const res = await fn(agent, parallel, pipeline, () => {}, () => {}, { skipTests: true }, {}, async () => null);
  assert.strictEqual(res.verdict, 'no-go');
  assert.deepStrictEqual(res.blockers.map(b => b.id), ['audit-counts']);
});
