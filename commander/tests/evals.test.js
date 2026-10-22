// Static checks for the plugin eval suite in commander/cowork-plugin/evals/.
// Mirrors the schema `claude plugin eval` enforces for schema_version 1.x
// case.yaml files, so a malformed case fails here instead of at eval time.

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const yaml = require('js-yaml');

const ROOT = path.resolve(__dirname, '..', '..');
const PLUGIN = path.join(ROOT, 'commander', 'cowork-plugin');
const EVALS = path.join(PLUGIN, 'evals');
const SKILLS = path.join(PLUGIN, 'skills');

// Skills another v8 lane is still writing. A case for one of these is reported
// as a todo until the skill directory lands, then enforced like every other case.
const PENDING_SKILLS = new Set(['ccc-codex']);
const REQUIRED_SKILLS = ['ccc', 'ccc-plan', 'ccc-review', 'ccc-doctor', 'ccc-fable', 'ccc-update', 'ccc-suggest', 'ccc-codex'];

const TOP_KEYS = new Set(['schema_version', 'name', 'description', 'tags', 'plugins', 'context', 'execution', 'runs', 'graders', 'expected_outcome']);
const EXEC_KEYS = new Set(['prompt', 'max_turns', 'timeout_seconds', 'model', 'allowed_tools', 'artifact_publish', 'growthbook_overrides', 'append_system_prompt', 'env']);
const GRADER_KEYS = {
  regex: new Set(['type', 'name', 'target', 'pattern', 'flags', 'match', 'weight', 'arm']),
  tool_used: new Set(['type', 'name', 'tool', 'input_match', 'min', 'max', 'weight', 'arm']),
  tool_order: new Set(['type', 'name', 'before', 'after', 'weight', 'arm']),
  file_exists: new Set(['type', 'name', 'path', 'exists', 'weight', 'arm']),
  llm: new Set(['type', 'name', 'criteria', 'focus', 'weight', 'arm']),
  baseline: new Set(['type', 'name', 'baseline_file', 'criteria', 'weight', 'arm']),
};

const CASES = fs.existsSync(EVALS)
  ? fs.readdirSync(EVALS, { withFileTypes: true })
    .filter(d => d.isDirectory() && fs.existsSync(path.join(EVALS, d.name, 'case.yaml')))
    .map(d => d.name)
    .sort()
  : [];

function load(name) {
  return yaml.load(fs.readFileSync(path.join(EVALS, name, 'case.yaml'), 'utf8'));
}

function skillOf(c) {
  const tags = (c.tags || []).filter(t => typeof t === 'string' && t.startsWith('skill:'));
  assert.strictEqual(tags.length, 1, 'exactly one skill:<name> tag');
  return tags[0].slice('skill:'.length);
}

test('suite has at least 8 cases and covers the required skills', () => {
  assert.ok(CASES.length >= 8, `found ${CASES.length} cases`);
  const covered = new Set(CASES.map(n => skillOf(load(n))));
  for (const s of REQUIRED_SKILLS) assert.ok(covered.has(s), `no eval case for ${s}`);
});

for (const name of CASES) {
  test(`${name}: case.yaml matches the 1.x schema`, () => {
    const c = load(name);
    assert.ok(c && typeof c === 'object', 'case.yaml is a YAML object');
    assert.strictEqual(c.schema_version, '1.1');
    assert.strictEqual(c.name, name, 'name matches the directory');
    for (const k of Object.keys(c)) assert.ok(TOP_KEYS.has(k), `unknown top-level key ${k}`);
    assert.ok(c.execution && typeof c.execution.prompt === 'string' && c.execution.prompt.trim(), 'execution.prompt required');
    for (const k of Object.keys(c.execution)) assert.ok(EXEC_KEYS.has(k), `unknown execution key ${k}`);
    assert.ok(!/(^|\s)(~\/|\/Users\/|\/home\/)/.test(c.execution.prompt), 'no absolute or home paths in prompts');
    if (c.execution.max_turns !== undefined) assert.ok(Number.isInteger(c.execution.max_turns) && c.execution.max_turns > 0 && c.execution.max_turns <= 200);
    if (c.execution.timeout_seconds !== undefined) assert.ok(Number.isInteger(c.execution.timeout_seconds) && c.execution.timeout_seconds > 0 && c.execution.timeout_seconds <= 3600);

    assert.ok(Array.isArray(c.graders) && c.graders.length > 0, 'at least one grader');
    const names = new Set();
    for (const g of c.graders) {
      assert.ok(GRADER_KEYS[g.type], `unknown grader type ${g.type}`);
      for (const k of Object.keys(g)) assert.ok(GRADER_KEYS[g.type].has(k), `grader ${g.name}: unknown key ${k}`);
      assert.ok(g.name && !names.has(g.name), `grader name missing or duplicated: ${g.name}`);
      names.add(g.name);
      if (g.type === 'regex') {
        assert.ok(/^[dgimsuvy]*$/.test(g.flags || ''), `grader ${g.name}: bad flags`);
        assert.doesNotThrow(() => new RegExp(g.pattern, g.flags || ''), `grader ${g.name}: pattern compiles`);
        if (g.match !== undefined) assert.ok(/^(contains|not_contains|count:\d+)$/.test(g.match), `grader ${g.name}: bad match`);
      }
      if (g.type === 'tool_used' && g.input_match) assert.doesNotThrow(() => new RegExp(g.input_match));
      if (g.type === 'llm') assert.ok(typeof g.criteria === 'string' && g.criteria.trim().length > 40, `grader ${g.name}: concrete criteria`);
    }
    assert.ok(c.graders.some(g => g.type !== 'llm' && g.type !== 'baseline'), 'at least one deterministic grader');
  });

  const c = load(name);
  const skill = skillOf(c);
  const skillPath = path.join(SKILLS, skill, 'SKILL.md');
  const pending = PENDING_SKILLS.has(skill) && !fs.existsSync(skillPath);
  test(`${name}: names an existing plugin skill (${skill})`, { todo: pending ? `${skill} is being written by another lane` : false }, () => {
    assert.ok(fs.existsSync(skillPath), `${path.relative(ROOT, skillPath)} exists`);
    const skillGrader = c.graders.find(g => g.type === 'tool_used' && g.tool === 'Skill');
    assert.ok(skillGrader, 'case checks that the skill fired');
    const re = new RegExp(skillGrader.input_match);
    assert.ok(re.test(`{"skill":"commander:${skill}"}`), 'input_match accepts the namespaced skill');
    assert.ok(re.test(`{"skill": "${skill}"}`), 'input_match accepts the bare skill');
    assert.ok(!re.test(`{"skill":"commander:${skill}-other"}`), 'input_match rejects a different skill with the same prefix');
  });
}
