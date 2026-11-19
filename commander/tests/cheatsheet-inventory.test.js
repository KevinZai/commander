'use strict';

// Codex #302 delta2 LOW 2: the /ccc-cheatsheet inventory counts agents and hook events in the Codex build too
// (agents/*.toml, hooks.json at the plugin root), not only in the Claude plugin layout.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const ROOT = path.join(__dirname, '..');

function inventoryScript(pluginDir) {
  const md = fs.readFileSync(path.join(pluginDir, 'skills', 'ccc-cheatsheet', 'SKILL.md'), 'utf8');
  const start = md.indexOf('### 1. Read the inventory');
  const block = /```bash\n([\s\S]*?)```/.exec(md.slice(start));
  assert.ok(block, 'inventory bash block');
  return block[1];
}

function rows(pluginDir) {
  const r = spawnSync('bash', ['-c', inventoryScript(pluginDir)], {
    env: { PATH: process.env.PATH, CLAUDE_PLUGIN_ROOT: pluginDir }, encoding: 'utf8', timeout: 30000,
  });
  assert.equal(r.status, 0, r.stderr);
  return Object.fromEntries(r.stdout.split('\n').filter(Boolean).map((l) => l.split('\t')).filter((c) => c.length === 2));
}

function expected(pluginDir, ext, hooksFile) {
  const agents = fs.readdirSync(path.join(pluginDir, 'agents')).filter((f) => f.endsWith(ext)).length;
  const hooks = Object.keys(JSON.parse(fs.readFileSync(path.join(pluginDir, hooksFile), 'utf8')).hooks).length;
  return { agents: String(agents), hookEvents: String(hooks) };
}

for (const [name, ext, hooksFile] of [['cowork-plugin', '.md', 'hooks/hooks.json'], ['cowork-plugin-codex', '.toml', 'hooks.json']]) {
  test(`cheatsheet inventory counts agents and hook events in ${name}`, { skip: process.platform === 'win32' }, () => {
    const dir = path.join(ROOT, name);
    const got = rows(dir);
    const want = expected(dir, ext, hooksFile);
    assert.notEqual(want.agents, '0');
    assert.equal(got.agents, want.agents);
    assert.equal(got.hookEvents, want.hookEvents);
  });
}
