'use strict';
// CC-2100: one connector-count source for `ccc doctor` and `ccc checkin`.
// Unknown (no catalog table, malformed MCP config) is null, never 0.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const diag = require('../cowork-plugin/skills/ccc-doctor/lib/diagnostics');
const checkin = require('../lib/checkin');

const ROOT = path.join(__dirname, '..', '..');

function tmp(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ccc-connectors-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  return dir;
}

function catalog(rows, heading) {
  const lines = [];
  for (let i = 1; i <= rows; i++) lines.push('| Row' + i + ' | Cat | why | No | install |');
  return [heading || '## 🔌 The ' + rows + ' opt-in MCP servers', '', '| MCP | Category | Why it matters | Affiliate? | Install |', '|-----|----|----|----|----|'].concat(lines, ['', '## Next']).join('\n');
}

function servers(n) {
  const out = {};
  for (let i = 0; i < n; i++) out['srv' + i] = { command: 'x' };
  return out;
}

test('catalog: counts the "| MCP |" table under any heading', () => {
  assert.equal(diag.countCatalogConnectors(catalog(16)), 16);
  assert.equal(diag.countCatalogConnectors(catalog(16, '## 🔌 Recommended MCP Servers')), 16);
  assert.equal(diag.countCatalogConnectors(catalog(0)), 0);
});

test('catalog: missing text or table is unknown (null), never 0', () => {
  assert.equal(diag.countCatalogConnectors(null), null);
  assert.equal(diag.countCatalogConnectors('# Connectors\n\nno table here\n'), null);
  assert.equal(diag.countCatalogConnectors('| MCP | Category |\nnot a separator\n| a | b |\n'), null);
});

test('the shipped CONNECTORS.md catalog matches the doctor claim', () => {
  const text = fs.readFileSync(path.join(ROOT, 'commander', 'cowork-plugin', 'CONNECTORS.md'), 'utf8');
  assert.equal(diag.countCatalogConnectors(text), diag.EXPECTED_CONNECTOR_COUNT);
});

function laneFixture(t, { user, local, project }) {
  const home = tmp(t);
  const configDir = path.join(home, '.claude-ai1');
  const cwd = path.join(home, 'proj');
  fs.mkdirSync(configDir, { recursive: true });
  fs.mkdirSync(cwd, { recursive: true });
  if (user !== undefined) {
    const body = typeof user === 'string' ? user : JSON.stringify({ mcpServers: servers(user), projects: { [cwd]: { mcpServers: servers(local || 0) } } });
    fs.writeFileSync(path.join(configDir, '.claude.json'), body);
  }
  if (project !== undefined) {
    fs.writeFileSync(path.join(cwd, '.mcp.json'), typeof project === 'string' ? project : JSON.stringify({ mcpServers: servers(project) }));
  }
  return { home, configDir, cwd, env: { HOME: home, CLAUDE_CONFIG_DIR: configDir } };
}

test('configured: lane user + local + project scopes', (t) => {
  const f = laneFixture(t, { user: 10, local: 2, project: 4 });
  assert.deepEqual(diag.countConfiguredConnectors({ env: f.env, cwd: f.cwd }), {
    user: 10, local: 2, project: 4, total: 16, user_file: path.join(f.configDir, '.claude.json'),
  });
});

test('configured: the default lane reads ~/.claude.json', (t) => {
  const home = tmp(t);
  fs.writeFileSync(path.join(home, '.claude.json'), JSON.stringify({ mcpServers: servers(3) }));
  const c = diag.countConfiguredConnectors({ env: { HOME: home }, cwd: home });
  assert.equal(c.user, 3);
  assert.equal(c.user_file, path.join(home, '.claude.json'));
});

test('configured: no config files is 0; a malformed one is unknown', (t) => {
  assert.equal(diag.countConfiguredConnectors({ env: laneFixture(t, {}).env, cwd: tmp(t) }).total, 0);
  const bad = laneFixture(t, { user: '{oops', project: 1 });
  const c = diag.countConfiguredConnectors({ env: bad.env, cwd: bad.cwd });
  assert.deepEqual([c.user, c.local, c.project, c.total], [null, null, 1, null]);
  const badShape = laneFixture(t, { user: 1, project: '{"mcpServers": []}' });
  assert.equal(diag.countConfiguredConnectors({ env: badShape.env, cwd: badShape.cwd }).total, null);
  const badProjects = laneFixture(t, { user: '{"mcpServers": {}, "projects": "broken"}' });
  assert.equal(diag.countConfiguredConnectors({ env: badProjects.env, cwd: badProjects.cwd }).local, null);
  const badEntry = laneFixture(t, {});
  fs.writeFileSync(path.join(badEntry.configDir, '.claude.json'), JSON.stringify({ projects: { [badEntry.cwd]: 42 } }));
  const ce = diag.countConfiguredConnectors({ env: badEntry.env, cwd: badEntry.cwd });
  assert.deepEqual([ce.local, ce.total], [null, null]);
  const otherProject = laneFixture(t, {});
  fs.writeFileSync(path.join(otherProject.configDir, '.claude.json'), JSON.stringify({ projects: { '/elsewhere': { mcpServers: servers(3) } } }));
  assert.equal(diag.countConfiguredConnectors({ env: otherProject.env, cwd: otherProject.cwd }).total, 0);
});

function doctorRoot(t, catalogText) {
  const root = tmp(t);
  fs.mkdirSync(path.join(root, 'commander', 'cowork-plugin'), { recursive: true });
  fs.writeFileSync(path.join(root, 'commander', 'cowork-plugin', '.mcp.json'), JSON.stringify({ mcpServers: { context7: {}, 'sequential-thinking': {} } }));
  if (catalogText !== null) fs.writeFileSync(path.join(root, 'commander', 'cowork-plugin', 'CONNECTORS.md'), catalogText);
  return root;
}

function laneWithPlugin(f) {
  const install = path.join(f.configDir, 'plugins', 'cache', 'commander-hub', 'commander', '8.1.2');
  fs.mkdirSync(path.join(install, '.claude-plugin'), { recursive: true });
  fs.writeFileSync(path.join(install, '.claude-plugin', 'plugin.json'), JSON.stringify({ version: '8.1.2' }));
  fs.mkdirSync(path.join(install, 'skills', 'ccc'), { recursive: true });
  fs.writeFileSync(path.join(install, 'skills', 'ccc', 'SKILL.md'), '---\nname: ccc\n---\n');
  fs.writeFileSync(path.join(install, 'CONNECTORS.md'), catalog(16));
  fs.mkdirSync(path.join(f.configDir, 'plugins'), { recursive: true });
  fs.writeFileSync(path.join(f.configDir, 'plugins', 'installed_plugins.json'), JSON.stringify({
    version: 2, plugins: { 'commander@commander-hub': [{ scope: 'user', version: '8.1.2', installPath: install }] },
  }));
}

for (const n of [0, 16]) {
  test('doctor and checkin agree on N=' + n + ' configured connectors', (t) => {
    const f = laneFixture(t, { user: n });
    laneWithPlugin(f);
    const d = diag.checkMcpAvailability(doctorRoot(t, catalog(16)), { env: f.env, cwd: f.cwd });
    const c = checkin.buildCheckin({ root: ROOT, env: f.env, cwd: f.cwd, cli: false });
    assert.equal(d.status, 'ok', d.message);
    assert.match(d.message, new RegExp('opt-in connectors: 16 · configured: ' + n + ' \\('));
    assert.deepEqual(c.connectors, { catalog: 16, configured: { user: n, local: 0, project: 0, total: n } });
  });
}

test('doctor and checkin agree a malformed config is unknown, never 0', (t) => {
  const f = laneFixture(t, { user: '{"mcpServers": ' });
  laneWithPlugin(f);
  const d = diag.checkMcpAvailability(doctorRoot(t, catalog(16)), { env: f.env, cwd: f.cwd });
  const c = checkin.buildCheckin({ root: ROOT, env: f.env, cwd: f.cwd, cli: false });
  assert.equal(d.status, 'warn');
  assert.match(d.message, /configured MCP servers unknown/);
  assert.doesNotMatch(d.message, /configured: 0/);
  assert.equal(c.connectors.configured.total, null);
});

test('doctor: a catalog without its table reports unknown, not "found 0"', (t) => {
  const d = diag.checkMcpAvailability(doctorRoot(t, '# Connectors\n\n## The 16 opt-in MCP servers\n\n(table moved)\n'), { env: { HOME: tmp(t) }, cwd: tmp(t) });
  assert.equal(d.status, 'warn');
  assert.match(d.message, /connector catalog unknown/);
  assert.doesNotMatch(d.message, /found 0/);
});
