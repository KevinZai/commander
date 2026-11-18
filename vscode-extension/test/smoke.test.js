'use strict';

// Extension smoke test. Runs under plain `node --test` against the compiled
// output (npm test compiles first): the `vscode` module is stubbed, so no editor
// download is needed. Covers the skill catalog and the openExternal fallback.

const assert = require('node:assert/strict');
const fs = require('node:fs');
const Module = require('node:module');
const path = require('node:path');
const test = require('node:test');

const EXT_ROOT = path.resolve(__dirname, '..');
const OUT = path.join(EXT_ROOT, 'out');

function loadExtension(vscodeStub) {
  const originalLoad = Module._load;
  Module._load = function patched(request, ...rest) {
    if (request === 'vscode') return vscodeStub;
    return originalLoad.call(this, request, ...rest);
  };
  try {
    for (const key of Object.keys(require.cache)) {
      if (key.startsWith(OUT)) delete require.cache[key];
    }
    return require(path.join(OUT, 'extension.js'));
  } finally {
    Module._load = originalLoad;
  }
}

function makeVscode({ openExternalResult, openInDesktop = true }) {
  const calls = { commands: {}, warnings: [], infos: [], clipboard: [], external: [], inserted: [] };
  const stub = {
    Uri: { parse: (value) => ({ toString: () => value }) },
    EventEmitter: class { constructor() { this.event = () => ({ dispose() {} }); } fire() {} },
    TreeItem: class { constructor(label) { this.label = label; } },
    TreeItemCollapsibleState: { None: 0 },
    ThemeIcon: class { constructor(id) { this.id = id; } },
    window: {
      registerTreeDataProvider: () => ({ dispose() {} }),
      showQuickPick: async (items) => items[0],
      showWarningMessage: (message) => { calls.warnings.push(message); },
      showInformationMessage: (message) => { calls.infos.push(message); },
      activeTextEditor: undefined,
    },
    commands: {
      registerCommand: (id, fn) => { calls.commands[id] = fn; return { dispose() {} }; },
    },
    workspace: {
      getConfiguration: () => ({ get: (_key, fallback) => (_key === 'openInDesktop' ? openInDesktop : fallback) }),
    },
    env: {
      openExternal: async (uri) => {
        calls.external.push(String(uri));
        if (openExternalResult instanceof Error) throw openExternalResult;
        return openExternalResult;
      },
      clipboard: { writeText: async (text) => { calls.clipboard.push(text); } },
    },
  };
  return { stub, calls };
}

test('compiled output exists (run npm run compile first)', () => {
  assert.ok(fs.existsSync(path.join(OUT, 'extension.js')), 'out/extension.js missing');
});

test('skill catalog is unique and matches the plugin catalog', () => {
  const catalog = JSON.parse(fs.readFileSync(path.join(EXT_ROOT, 'src', 'data', 'skills.generated.json'), 'utf8'));
  assert.ok(catalog.length > 0);
  const names = catalog.map((s) => s.name);
  assert.equal(new Set(names).size, names.length, 'duplicate skill names in the picker');
  const commands = catalog.map((s) => s.command);
  assert.equal(new Set(commands).size, commands.length, 'duplicate picker commands');
  assert.equal(commands.filter((c) => c === '/ccc-build').length, 1);
  for (const skill of catalog) {
    assert.equal(skill.command, '/' + skill.name);
    assert.ok(skill.description.length > 0, skill.name);
  }

  const skillsDir = path.resolve(EXT_ROOT, '..', 'commander', 'cowork-plugin', 'skills');
  if (!fs.existsSync(skillsDir)) return; // packaged copy without the repository: structural checks only
  const onDisk = fs.readdirSync(skillsDir).filter((d) => fs.existsSync(path.join(skillsDir, d, 'SKILL.md'))).sort();
  assert.deepEqual([...names].sort(), onDisk, 'run `npm run gen:skills` in vscode-extension/');
});

test('every contributed command is registered by activate()', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(EXT_ROOT, 'package.json'), 'utf8'));
  const { stub, calls } = makeVscode({ openExternalResult: true });
  loadExtension(stub).activate({ subscriptions: [] });
  for (const c of pkg.contributes.commands) {
    assert.equal(typeof calls.commands[c.command], 'function', `${c.command} is contributed but not registered`);
  }
});

test('openExternal resolving true launches Desktop without a fallback message', async () => {
  const { stub, calls } = makeVscode({ openExternalResult: true });
  loadExtension(stub).activate({ subscriptions: [] });
  await calls.commands['ccc.openCommandHub']();
  assert.equal(calls.external.length, 1);
  assert.match(calls.external[0], /^vscode:\/\/anthropic\.claude-code\/\?prompt=%2Fccc$/);
  assert.deepEqual(calls.warnings, []);
  assert.deepEqual(calls.clipboard, []);
});

test('openExternal resolving false shows a fallback message and copies the command', async () => {
  const { stub, calls } = makeVscode({ openExternalResult: false });
  loadExtension(stub).activate({ subscriptions: [] });
  await calls.commands['ccc.openCommandHub']();
  assert.equal(calls.warnings.length, 1);
  assert.match(calls.warnings[0], /did not open/);
  assert.match(calls.warnings[0], /\/ccc/);
  assert.deepEqual(calls.clipboard, ['/ccc']);
});

test('openExternal rejecting takes the same fallback path', async () => {
  const { stub, calls } = makeVscode({ openExternalResult: new Error('no handler') });
  loadExtension(stub).activate({ subscriptions: [] });
  await calls.commands['ccc.openCommandHub']();
  assert.equal(calls.warnings.length, 1);
  assert.deepEqual(calls.clipboard, ['/ccc']);
});

test('documentation links report a false openExternal result', async () => {
  const { stub, calls } = makeVscode({ openExternalResult: false });
  loadExtension(stub).activate({ subscriptions: [] });
  await calls.commands['ccc.openBible']();
  assert.equal(calls.warnings.length, 1);
  assert.match(calls.warnings[0], /BIBLE\.md/);
});
