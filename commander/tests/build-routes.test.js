'use strict';

// scripts/build-routes.js: registry coverage, the no-signal lint and the
// priority tiebreak the scorer applies to equal scores (CC-2060).

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const ROOT = path.join(__dirname, '..', '..');
const { build } = require(path.join(ROOT, 'scripts', 'build-routes.js'));
const SCORER = path.join(ROOT, 'commander', 'cowork-plugin', 'hooks', 'lib', 'route-scorer.mjs');
const PLUGIN = path.join(ROOT, 'commander', 'cowork-plugin');

function fixture({ skills = {}, agents = {}, hints = {} }) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ccc-routes-'));
  const skillsDir = path.join(dir, 'skills');
  const agentsDir = path.join(dir, 'agents');
  fs.mkdirSync(skillsDir);
  fs.mkdirSync(agentsDir);
  for (const [name, description] of Object.entries(skills)) {
    fs.mkdirSync(path.join(skillsDir, name));
    fs.writeFileSync(path.join(skillsDir, name, 'SKILL.md'), `---\nname: ${name}\ndescription: "${description}"\n---\n`);
  }
  for (const [name, description] of Object.entries(agents)) {
    fs.writeFileSync(path.join(agentsDir, `${name}.md`), `---\nname: ${name}\ndescription: "${description}"\n---\n`);
  }
  const hintsFile = path.join(dir, 'route-hints.json');
  fs.writeFileSync(hintsFile, JSON.stringify({ skills: hints.skills || {}, agents: hints.agents || {} }));
  return { skillsDir, agentsDir, hintsFile };
}

test('every plugin skill and agent is routed or explicitly excluded', () => {
  const hints = JSON.parse(fs.readFileSync(path.join(ROOT, 'commander', 'core', 'route-hints.json'), 'utf8'));
  const ids = new Set(build().routes.map((r) => r.id));
  for (const name of fs.readdirSync(path.join(PLUGIN, 'skills'))) {
    const file = path.join(PLUGIN, 'skills', name, 'SKILL.md');
    if (!fs.existsSync(file)) continue;
    const alias = /^description:\s*"?Alias\b/m.test(fs.readFileSync(file, 'utf8'));
    const excluded = alias || (hints.skills[name] && hints.skills[name].exclude);
    assert.ok(ids.has(name) || excluded, `skill ${name} is neither routed nor excluded`);
  }
  for (const file of fs.readdirSync(path.join(PLUGIN, 'agents')).filter((f) => f.endsWith('.md'))) {
    const name = file.slice(0, -3);
    const excluded = hints.agents[name] && hints.agents[name].exclude;
    assert.ok(ids.has(`agent:${name}`) || excluded, `agent ${name} is neither routed nor excluded`);
  }
});

test('every registry entry carries an integer priority', () => {
  for (const r of build().routes) assert.ok(Number.isInteger(r.priority), r.id);
});

test('a routable skill with no signal fails the build and is named', () => {
  const src = fixture({
    skills: { 'ccc-quiet': 'Does a thing.', 'ccc-loud': 'Does another thing.' },
    hints: { skills: { 'ccc-loud': { strong: ['loud thing'] } } },
  });
  assert.throws(() => build(src), /can never fire: ccc-quiet\b/);
});

test('an agent with no signal fails the build unless excluded', () => {
  const agents = { mute: 'Quiet helper.' };
  assert.throws(() => build(fixture({ agents })), /agent:mute/);
  const ok = build(fixture({ agents, hints: { agents: { mute: { exclude: true } } } }));
  assert.deepStrictEqual(ok.routes, []);
});

test('a "Use when ... says" phrase alone counts as a signal', () => {
  const src = fixture({ skills: { 'ccc-x': 'Does X. Use when the user says run the x report.' } });
  const [route] = build(src).routes;
  assert.deepStrictEqual(route.descTriggers, ['run the x report']);
  assert.strictEqual(route.priority, 0);
});

test('a non-integer priority is rejected', () => {
  for (const priority of ['high', 1.5, null]) {
    const src = fixture({ skills: { 'ccc-x': 'X.' }, hints: { skills: { 'ccc-x': { strong: ['x job'], priority } } } });
    assert.throws(() => build(src), /priority must be an integer/);
  }
});

test('scorer: equal scores sort by priority, then skill before agent', async () => {
  const s = await import(SCORER);
  const base = { label: 'x', manual: false, strong: ['tidy the widgets'], triggers: [], patterns: [], negatives: [], paths: [], requirePath: false, next: [], descTriggers: [] };
  const routes = [
    { ...base, id: 'agent:low', kind: 'agent', invoke: 'low', priority: 0 },
    { ...base, id: 'ccc-low', kind: 'skill', invoke: '/ccc-low', priority: 0 },
    { ...base, id: 'agent:high', kind: 'agent', invoke: 'high', priority: 2 },
  ];
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'ccc-routes-')), 'ccc-routes.json');
  fs.writeFileSync(file, JSON.stringify({ routes }));
  const order = s.scoreRoutes('please tidy the widgets', s.loadRoutes(file)).map((c) => c.route.id);
  assert.deepStrictEqual(order, ['agent:high', 'ccc-low', 'agent:low']);
});
