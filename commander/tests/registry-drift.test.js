'use strict';

var test = require('node:test');
var assert = require('node:assert');
var cp = require('child_process');
var fs = require('fs');
var os = require('os');
var path = require('path');

var REPO = path.join(__dirname, '..', '..');
var SCRIPT = path.join(REPO, 'scripts', 'build-from-registry.js');
var REGISTRY_PATH = path.join(REPO, 'commander', 'core', 'registry.yaml');
var gen = require(SCRIPT);

// ─── Fixture helpers ─────────────────────────────────────────────

function fixture(t) {
  var root = fs.mkdtempSync(path.join(os.tmpdir(), 'ccc-registry-'));
  t.after(function() { fs.rmSync(root, { recursive: true, force: true }); });
  write(root, 'package.json', JSON.stringify({ version: '1.2.3' }));
  return root;
}

function write(root, rel, content) {
  var full = path.join(root, rel);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content);
}

function skill(name, description) {
  return '---\nname: ' + name + '\ndescription: "' + description + '"\n---\n\n# ' + name + '\n';
}

function byId(registry, id) {
  return registry.skills.find(function(s) { return s.id === id; });
}

// ─── Committed registry ──────────────────────────────────────────

test('registry drift check passes', function() {
  var result = cp.execFileSync(process.execPath, [SCRIPT, '--check'], { encoding: 'utf8' });
  assert.ok(result.includes('PASS'), 'Registry drift check should PASS');
});

test('registry.yaml exists and has skills section', function() {
  assert.ok(fs.existsSync(REGISTRY_PATH), 'registry.yaml should exist');
  var content = fs.readFileSync(REGISTRY_PATH, 'utf8');
  assert.ok(content.includes('skills:'), 'registry.yaml should have skills section');
  assert.ok(content.includes('agents:'), 'registry.yaml should have agents section');
  assert.ok(content.includes('commands:'), 'registry.yaml should have commands section');
});

test('registry has expected minimum counts', function() {
  var content = fs.readFileSync(REGISTRY_PATH, 'utf8');
  var skillMatches = content.match(/^  - id: /gm) || [];
  // Skills + agents + commands + hooks all use "  - id:"
  assert.ok(skillMatches.length > 100, 'Registry should have 100+ entries: got ' + skillMatches.length);
});

test('every committed skill row points at a real, distinct SKILL.md with a real description', function() {
  var content = fs.readFileSync(REGISTRY_PATH, 'utf8');
  var section = content.split(/^agents:$/m)[0].split(/^skills:$/m)[1];
  var paths = (section.match(/^ {4}path: .*$/gm) || []).map(function(l) { return l.replace(/^ {4}path: /, ''); });
  var ids = gen.parseRegistryIds(content, 'skills');
  var descs = (section.match(/^ {4}description: .*$/gm) || []).map(function(l) { return l.replace(/^ {4}description: "?/, ''); });
  assert.ok(paths.length > 0);
  assert.strictEqual(ids.length, paths.length);
  assert.strictEqual(descs.length, paths.length);
  var missing = paths.filter(function(p) { return !fs.existsSync(path.join(REPO, p)); });
  assert.deepStrictEqual(missing, [], 'registry paths that do not exist');
  assert.strictEqual(new Set(paths).size, paths.length, 'registry paths must be distinct');
  assert.strictEqual(new Set(ids).size, ids.length, 'registry ids must be distinct');
  var bad = descs.filter(function(d) { return !d.trim() || /^name\s*:/.test(d); });
  assert.deepStrictEqual(bad, [], 'descriptions must be non-empty and not a frontmatter line');
});

test('committed registry skill counts match commander/contract.json', function() {
  var contract = JSON.parse(fs.readFileSync(path.join(REPO, 'commander', 'contract.json'), 'utf8'));
  var content = fs.readFileSync(REGISTRY_PATH, 'utf8');
  var sources = content.match(/^ {4}source: (ecosystem|plugin)$/gm) || [];
  var count = function(src) { return sources.filter(function(l) { return l.endsWith(' ' + src); }).length; };
  assert.strictEqual(count('ecosystem'), contract.ecosystem_skills);
  assert.strictEqual(count('plugin'), contract.plugin_skills);
  assert.strictEqual(gen.parseRegistryIds(content, 'agents').length, contract.specialist_agents);
});

test('committed registry parses as YAML when js-yaml is installed', function(t) {
  var yaml;
  try { yaml = require('js-yaml'); } catch (_) { t.skip('js-yaml not installed'); return; }
  var doc = yaml.load(fs.readFileSync(REGISTRY_PATH, 'utf8'));
  assert.ok(Array.isArray(doc.skills) && doc.skills.length > 0);
  assert.deepStrictEqual(gen.validateRegistry(doc, REPO), []);
});

// ─── Frontmatter parsing ────────────────────────────────────────

test('parseFrontmatter reads quoted, single-quoted, plain and block scalars', function() {
  assert.deepStrictEqual(
    gen.parseFrontmatter('---\nname: alpha\ndescription: "Say \\"hi\\": now"\n---\nbody'),
    { name: 'alpha', description: 'Say "hi": now' }
  );
  assert.strictEqual(gen.parseFrontmatter("---\ndescription: 'It''s fine'\n---\n").description, "It's fine");
  assert.strictEqual(
    gen.parseFrontmatter('---\ndescription: first line\n  continues here # not a comment start\nname: x\n---\n').description,
    'first line continues here # not a comment start'
  );
  assert.strictEqual(
    gen.parseFrontmatter('---\ndescription: >-\n  Folded line one\n  and two.\nname: b\n---\n').description,
    'Folded line one and two.'
  );
  assert.strictEqual(
    gen.parseFrontmatter('---\ndescription: |\n  Line one\n  Line two\n---\n').description,
    'Line one\nLine two'
  );
  assert.strictEqual(
    gen.parseFrontmatter('---\nname: m\ndescription: "spans\n  two lines"\nallowed-tools:\n  - Read\n  - Grep\n---\n').description,
    'spans two lines'
  );
  assert.strictEqual(gen.parseFrontmatter('# No frontmatter\n\nname: nope\n'), null);
});

test('generator uses frontmatter, never a `name:` line, as the description', function(t) {
  var root = fixture(t);
  write(root, 'skills/alpha/SKILL.md', skill('alpha-display', 'Does alpha things.'));
  var reg = gen.generateRegistry(root);
  var alpha = byId(reg, 'alpha');
  assert.strictEqual(alpha.name, 'alpha-display');
  assert.strictEqual(alpha.description, 'Does alpha things.');
  assert.strictEqual(alpha.path, 'skills/alpha/SKILL.md');
  assert.strictEqual(alpha.source, 'ecosystem');
});

test('a SKILL.md without frontmatter falls back to its first prose line', function(t) {
  var root = fixture(t);
  write(root, 'skills/plain/SKILL.md', '# Plain Skill\n\n**Command:** `/plain`\n\n**Tier**: BASIC\n\nDoes plain things.\n');
  var reg = gen.generateRegistry(root);
  assert.strictEqual(byId(reg, 'plain').description, 'Does plain things.');
  assert.strictEqual(byId(reg, 'plain').name, 'plain');
});

// ─── Scanning ───────────────────────────────────────────────────

test('nested skills are found with their real path and domain', function(t) {
  var root = fixture(t);
  write(root, 'skills/ccc-marketing/SKILL.md', skill('ccc-marketing', 'Marketing router.'));
  write(root, 'skills/ccc-marketing/cold-email/SKILL.md', skill('cold-email', 'Cold email.'));
  write(root, 'skills/business-pack/deep/inner/SKILL.md', skill('inner', 'Deeply nested.'));
  var reg = gen.generateRegistry(root);
  assert.strictEqual(reg.skills.length, 3);
  var cold = byId(reg, 'cold-email');
  assert.strictEqual(cold.path, 'skills/ccc-marketing/cold-email/SKILL.md');
  assert.strictEqual(cold.domain, 'ccc-marketing');
  var inner = byId(reg, 'inner');
  assert.strictEqual(inner.path, 'skills/business-pack/deep/inner/SKILL.md');
  assert.strictEqual(inner.domain, 'general');
  assert.deepStrictEqual(gen.validateRegistry(reg, root), []);
});

test('symlinked skill aliases are not scanned twice', function(t) {
  var root = fixture(t);
  write(root, 'skills/real/SKILL.md', skill('real', 'Real skill.'));
  try { fs.symlinkSync('real', path.join(root, 'skills', 'alias'), 'dir'); } catch (_) { t.skip('symlinks unavailable'); return; }
  var reg = gen.generateRegistry(root);
  assert.deepStrictEqual(reg.skills.map(function(s) { return s.path; }), ['skills/real/SKILL.md']);
});

test('the same skill name in both roots gets source-prefixed ids and distinct real paths', function(t) {
  var root = fixture(t);
  write(root, 'skills/ccc-data/SKILL.md', skill('ccc-data', 'Ecosystem data router.'));
  write(root, 'skills/ccc-marketing/ab-test/SKILL.md', skill('ab-test', 'Nested A/B.'));
  write(root, 'skills/ab-test/SKILL.md', skill('ab-test', 'Top-level A/B.'));
  write(root, 'commander/cowork-plugin/skills/ccc-data/SKILL.md', skill('ccc-data', 'Plugin data workflow.'));
  write(root, 'commander/cowork-plugin/skills/ccc-start/SKILL.md', skill('ccc-start', 'Start.'));
  var reg = gen.generateRegistry(root);
  var ids = reg.skills.map(function(s) { return s.id; }).sort();
  assert.deepStrictEqual(ids, [
    'ccc-start',
    'ecosystem/ab-test',
    'ecosystem/ccc-data',
    'ecosystem/ccc-marketing/ab-test',
    'plugin/ccc-data',
  ]);
  assert.strictEqual(byId(reg, 'plugin/ccc-data').path, 'commander/cowork-plugin/skills/ccc-data/SKILL.md');
  assert.strictEqual(byId(reg, 'plugin/ccc-data').source, 'plugin');
  assert.strictEqual(byId(reg, 'ecosystem/ccc-data').path, 'skills/ccc-data/SKILL.md');
  assert.strictEqual(byId(reg, 'plugin/ccc-data').description, 'Plugin data workflow.');
  assert.deepStrictEqual(gen.validateRegistry(reg, root), []);
});

test('generation is deterministic and serializes to the drift-free text', function(t) {
  var root = fixture(t);
  write(root, 'skills/b/SKILL.md', skill('b', 'B: with colon.'));
  write(root, 'skills/a/SKILL.md', skill('a', 'A.'));
  var one = gen.serializeRegistry(gen.generateRegistry(root));
  var two = gen.serializeRegistry(gen.generateRegistry(root));
  assert.strictEqual(one, two);
  assert.deepStrictEqual(gen.diffRegistry(one, gen.generateRegistry(root)), []);
  assert.match(one, /description: "B: with colon\."/);
});

// ─── Validation failures ────────────────────────────────────────

function validRegistry(root) {
  write(root, 'skills/a/SKILL.md', skill('a', 'A.'));
  write(root, 'skills/b/SKILL.md', skill('b', 'B.'));
  return gen.generateRegistry(root);
}

test('validation flags a path that does not exist', function(t) {
  var root = fixture(t);
  var reg = validRegistry(root);
  reg.skills[0].path = 'skills/ghost/SKILL.md';
  assert.ok(gen.validateRegistry(reg, root).some(function(e) { return /path does not exist: skills\/ghost/.test(e); }));
});

test('validation flags duplicate ids and duplicate paths', function(t) {
  var root = fixture(t);
  var reg = validRegistry(root);
  reg.skills[1].id = reg.skills[0].id;
  reg.skills[1].path = reg.skills[0].path;
  var errors = gen.validateRegistry(reg, root);
  assert.ok(errors.some(function(e) { return /duplicate id "a"/.test(e); }), errors.join('\n'));
  assert.ok(errors.some(function(e) { return /duplicate path "skills\/a\/SKILL.md"/.test(e); }), errors.join('\n'));
});

test('validation flags empty and `name:` descriptions', function(t) {
  var root = fixture(t);
  var reg = validRegistry(root);
  reg.skills[0].description = 'name: a';
  reg.skills[1].description = '  ';
  var errors = gen.validateRegistry(reg, root);
  assert.ok(errors.some(function(e) { return /\(a\): description is a frontmatter line/.test(e); }), errors.join('\n'));
  assert.ok(errors.some(function(e) { return /\(b\): empty description/.test(e); }), errors.join('\n'));
});

test('validation flags counts that disagree with contract.json', function(t) {
  var root = fixture(t);
  var reg = validRegistry(root);
  write(root, 'commander/contract.json', JSON.stringify({ ecosystem_skills: 3, plugin_skills: 0, specialist_agents: 0 }));
  var errors = gen.validateRegistry(reg, root);
  assert.deepStrictEqual(errors, ['skills: 2 ecosystem entries but contract.json ecosystem_skills is 3']);
});

test('drift check catches a description-only edit to the committed file', function(t) {
  var root = fixture(t);
  var reg = validRegistry(root);
  var text = gen.serializeRegistry(reg).replace('description: A.', 'description: Edited.');
  var drift = gen.diffRegistry(text, reg);
  assert.strictEqual(drift.length, 1);
  assert.match(drift[0], /differs from a fresh generation/);
});
