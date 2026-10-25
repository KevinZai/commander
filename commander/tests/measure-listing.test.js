'use strict';
// CC-2112: scripts/measure-listing.js rebuilds the session-start skill and
// agent listings from disk. The model-visible skills are the 12 core skills
// plus every skill they dispatch through the Skill tool (transitively), so
// click-first menus keep working; the listing fits the 8,000-char budget.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const ROOT = path.join(__dirname, '..', '..');
const SCRIPT = path.join(ROOT, 'scripts', 'measure-listing.js');
const { measure, parseFrontmatter, dispatchTargets, MAX_ENTRY_CHARS } = require(SCRIPT);

const CORE = [
  'ccc', 'ccc-build', 'ccc-design', 'ccc-plan', 'ccc-qa', 'ccc-research', 'ccc-review',
  'ccc-save-session', 'ccc-security', 'ccc-suggest', 'ccc-systematic-debugging', 'ccc-testing',
];

const charCounter = { method: 'chars', count: (s) => s.length };

function write(file, text) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text);
}

function fixture() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ccc-listing-'));
  write(path.join(dir, '.claude-plugin', 'plugin.json'), JSON.stringify({ name: 'demo' }));
  write(path.join(dir, 'skills', 'alpha', 'SKILL.md'), '---\nname: alpha\ndescription: "Do alpha. Use when asked."\n---\nbody\n');
  write(path.join(dir, 'skills', 'beta', 'SKILL.md'), '---\nname: beta\ndescription: "Hidden beta."\ndisable-model-invocation: true\n---\n');
  write(path.join(dir, 'skills', 'gamma', 'SKILL.md'), `---\nname: gamma\ndescription: "${'g'.repeat(1600)}"\n---\n`);
  write(path.join(dir, 'skills', 'delta', 'SKILL.md'), '---\nname: delta\ndescription: Delta it.\nwhen_to_use: On request.\n---\n');
  write(path.join(dir, 'workflows', 'wf.workflow.js'), "export const meta = {\n  name: 'wf',\n  description: 'Run wf.',\n  whenToUse: 'Before release.',\n}\nthrow new Error('never executed')\n");
  write(path.join(dir, 'agents', 'helper.md'), '---\nname: helper\ndescription: "Helps."\nmemory: project\ntools:\n  - Read\n  - Bash\n---\n');
  write(path.join(dir, 'agents', 'judge.md'), '---\nname: judge\ndescription: "Judges."\nmemory: project\ntools:\n  - Read\ndisallowedTools:\n  - Write\n  - Edit\n---\n');
  return dir;
}

test('measure-listing: fixture listing text, caps and agent tools are exact', () => {
  const r = measure({ pluginDir: fixture(), budget: 100, counter: charCounter });
  const alpha = '- demo:alpha: Do alpha. Use when asked.\n';
  const delta = '- demo:delta: Delta it. - On request.\n';
  const gamma = `- demo:gamma: ${'g'.repeat(MAX_ENTRY_CHARS - 1)}…\n`;
  const wf = '- demo:wf: Run wf. - Before release.\n';
  assert.deepEqual(r.skills.listed, ['alpha', 'delta', 'gamma']);
  assert.equal(r.skills.hidden, 1);
  assert.equal(r.skills.chars, alpha.length + delta.length + gamma.length);
  assert.equal(r.workflows.chars, wf.length);
  assert.equal(r.listing.chars, r.skills.chars + wf.length);
  assert.equal(r.listing.tokens, r.listing.chars);
  assert.equal(r.listing.fits, false);
  const helper = '- demo:helper: Helps. (Tools: Read, Bash, Write, Edit)\n';
  const judge = '- demo:judge: Judges. (Tools: Read)\n';
  assert.equal(r.agents.chars, helper.length + judge.length);
  assert.equal(r.total.chars, r.listing.chars + r.agents.chars);
});

test('measure-listing: CLI --json reports the token method and budget', () => {
  const out = spawnSync(process.execPath, [SCRIPT, '--json', '--plugin', fixture(), '--budget', '5000'], { encoding: 'utf8' });
  assert.equal(out.status, 0, out.stderr);
  const r = JSON.parse(out.stdout);
  assert.equal(r.budgetChars, 5000);
  assert.match(r.tokenMethod, /js-tiktoken|chars \/ 3\.6/);
  assert.equal(r.listing.fits, r.listing.chars <= 5000);
});

test('dispatchTargets: Skill-tool lines and dispatch tables count, typed handoffs do not', () => {
  const names = new Set(['ccc-a', 'ccc-b', 'ccc-c', 'ccc-d', 'ccc-e']);
  const src = [
    '---', 'name: ccc-a', '---',
    'Invoke the `ccc-b` skill with the Skill tool.',
    'Dispatch the pick:', '', '| Pick | Skill |', '|---|---|', '| C | `ccc-c` |',
    '## Next', '| Mention | `ccc-d` |',
    '`/ccc-e` is user-invoked only: tell the user to type `/ccc-e`.',
  ].join('\n');
  assert.deepEqual(dispatchTargets(src, names, 'ccc-a'), [{ target: 'ccc-b', line: 4 }, { target: 'ccc-c', line: 9 }]);
  const quoted = ['---', 'name: ccc-a', '---', 'Invoke it with the Skill tool: `skill: "commander:ccc-d"`.'].join('\n');
  assert.deepEqual(dispatchTargets(quoted, names, 'ccc-a'), [{ target: 'ccc-d', line: 4 }]);
});

// CC-2115: a hidden (user-typed) skill runs as the model too, so its Skill-tool
// call to another hidden skill is blocked just the same.
test('measure: dispatches from hidden skills to hidden skills fail the check', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ccc-listing-hidden-'));
  write(path.join(dir, 'skills', 'ccc-alias', 'SKILL.md'), '---\nname: ccc-alias\ndescription: "Alias."\ndisable-model-invocation: true\n---\nInvoke the `ccc-target` skill with the Skill tool.\n');
  write(path.join(dir, 'skills', 'ccc-target', 'SKILL.md'), '---\nname: ccc-target\ndescription: "Target."\ndisable-model-invocation: true\n---\nBody.\n');
  const r = measure({ pluginDir: dir, counter: charCounter });
  assert.deepEqual(r.dispatch.toHidden, ['ccc-alias:6 -> ccc-target']);
  const check = spawnSync(process.execPath, [SCRIPT, '--check', '--json', '--plugin', dir], { encoding: 'utf8' });
  assert.equal(check.status, 1);
});

const SKILLS_DIR = path.join(ROOT, 'commander', 'cowork-plugin', 'skills');
const readSkill = (name) => fs.readFileSync(path.join(SKILLS_DIR, name, 'SKILL.md'), 'utf8');

// Visible = the core skills plus every skill any skill (visible or hidden)
// dispatches through the Skill tool, transitively.
function dispatchClosure() {
  const all = fs.readdirSync(SKILLS_DIR).filter((n) => fs.existsSync(path.join(SKILLS_DIR, n, 'SKILL.md')));
  const names = new Set(all);
  const typedOnly = new Set(['ccc-ship']);
  const seen = new Set(CORE);
  for (const name of all) {
    for (const { target } of dispatchTargets(readSkill(name), names, name)) if (!typedOnly.has(target)) seen.add(target);
  }
  const queue = [...seen];
  while (queue.length) {
    const name = queue.shift();
    for (const { target } of dispatchTargets(readSkill(name), names, name)) {
      if (!seen.has(target) && !typedOnly.has(target)) { seen.add(target); queue.push(target); }
    }
  }
  return [...seen].sort();
}

test('plugin: model-visible skills = 12 core + every Skill-tool dispatch target, transitively', () => {
  const visible = fs.readdirSync(SKILLS_DIR).filter((name) => {
    const file = path.join(SKILLS_DIR, name, 'SKILL.md');
    return fs.existsSync(file) && parseFrontmatter(fs.readFileSync(file, 'utf8'))['disable-model-invocation'] !== 'true';
  }).sort();
  for (const name of CORE) assert.ok(visible.includes(name), `core skill ${name} is hidden`);
  assert.deepEqual(visible, dispatchClosure());
  for (const name of visible) {
    const fm = parseFrontmatter(readSkill(name));
    assert.ok(fm.description.length <= 150, `${name} description is ${fm.description.length} chars (max 150)`);
  }
});

test('plugin: no skill dispatches to a hidden one; listing fits 8,000 chars', () => {
  const r = measure({ counter: charCounter });
  assert.deepEqual(r.dispatch.toHidden, []);
  assert.ok(r.listing.fits, `skill listing is ${r.listing.chars} chars`);
  const check = spawnSync(process.execPath, [SCRIPT, '--check', '--json'], { encoding: 'utf8' });
  assert.equal(check.status, 0, check.stderr);
});
