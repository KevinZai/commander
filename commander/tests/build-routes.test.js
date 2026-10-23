'use strict';

var test = require('node:test');
var assert = require('node:assert');
var fs = require('fs');
var os = require('os');
var path = require('path');
var cp = require('child_process');
var routes = require('../../scripts/build-routes.js');

function fixtureRoot() {
  var root = fs.mkdtempSync(path.join(os.tmpdir(), 'routes-fx-'));
  function skill(name, fm, body) {
    fs.mkdirSync(path.join(root, 'skills', name), { recursive: true });
    fs.writeFileSync(path.join(root, 'skills', name, 'SKILL.md'), '---\nname: ' + name + '\n' + fm + '\n---\n' + (body || ''));
  }
  fs.mkdirSync(path.join(root, 'agents'), { recursive: true });
  skill('ccc-review', 'description: "Audit the current branch diff. Use when the user asks for a code review or a PR review."\nmodel: opus', 'Then run /ccc-deep-review or /ccc-ghost.');
  skill('ccc-deep-review', 'description: "Branch review with verified findings. Use when the user wants a deep review."\nmodel: sonnet');
  skill('ccc-data', 'description: "Route data work to the right method: ETL, SQL optimization, or vector search. Use when the user is building or querying data."\nmodel: haiku');
  skill('ccc-db', 'description: "Database schema help. Use when the user asks about postgres or migrations. Not for preview tooling."\nmodel: sonnet\ntriggers:\n  - postgres');
  fs.writeFileSync(path.join(root, 'agents', 'reviewer.md'), '---\nname: reviewer\ndescription: "Read-only review of a diff. Use before merging a change."\nmodel: opus\n---\nbody');
  return root;
}

test('frontmatter parser reads scalars, lists and quoted values', function () {
  var fm = routes.parseFrontmatter('---\nname: x\ndescription: "a b"\ntriggers:\n  - one\n  - two\nnegatives: [p, q]\n---\nbody').data;
  assert.strictEqual(fm.description, 'a b');
  assert.deepStrictEqual(fm.triggers, ['one', 'two']);
  assert.deepStrictEqual(fm.negatives, ['p', 'q']);
});

test('splitDescription separates summary from when_to_use', function () {
  var s = routes.splitDescription('Does a thing. Use when the user asks for X.');
  assert.strictEqual(s.summary, 'Does a thing');
  assert.strictEqual(s.whenToUse, 'Use when the user asks for X.');
});

test('manifest covers skills, agents and domain routers with required fields', function () {
  var m = routes.buildRoutes(fixtureRoot());
  assert.deepStrictEqual(m.counts, { skill: 4 - 1, agent: 1, 'domain-router': 1 });
  m.routes.forEach(function (r) {
    ['name', 'kind', 'description', 'when_to_use', 'triggers', 'intentPatterns', 'negatives', 'next', 'tier', 'priority'].forEach(function (k) {
      assert.ok(k in r, r.name + ' missing ' + k);
    });
  });
  var review = m.routes.find(function (r) { return r.name === 'ccc-review'; });
  assert.deepStrictEqual(review.next, ['ccc-deep-review'], 'next[] keeps only known skills');
  assert.strictEqual(review.tier, 'heavy');
  assert.strictEqual(m.routes.find(function (r) { return r.name === 'ccc-data'; }).tier, 'light');
});

test('whole-word matching: preview is not review, postgres is not post', function () {
  assert.ok(routes.wordMatch('code review please', 'review'));
  assert.ok(!routes.wordMatch('preview the page', 'review'));
  assert.ok(!routes.wordMatch('postgres tuning', 'post'));
  assert.ok(routes.wordMatch('run /ccc-review now', '/ccc-review'));
  assert.ok(!routes.wordMatch('run /ccc-review-all', '/ccc-review'));
});

test('negative patterns drop a route; top 3 ranked by score then priority', function () {
  var m = routes.buildRoutes(fixtureRoot());
  assert.deepStrictEqual(routes.matchRoutes(m, 'preview tooling for postgres').map(function (r) { return r.name; }), []);
  var hits = routes.matchRoutes(m, 'code review of the diff, then a PR review', {}, 3);
  assert.ok(hits.length <= 3);
  assert.strictEqual(hits[0].name, 'ccc-review');
});

test('git diff signal boosts review routes', function () {
  var m = routes.buildRoutes(fixtureRoot());
  var names = routes.matchRoutes(m, 'look at this', { signals: { gitDiff: true } }).map(function (r) { return r.name; });
  assert.ok(names.indexOf('ccc-review') >= 0 && names.indexOf('reviewer') >= 0);
});

test('real plugin: committed ccc-routes.json is fresh and covers every skill and agent', function () {
  cp.execFileSync('node', [path.join(__dirname, '..', '..', 'scripts', 'build-routes.js'), '--check'], { encoding: 'utf8' });
  var m = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'ccc-routes.json'), 'utf8'));
  var plugin = path.join(__dirname, '..', 'cowork-plugin');
  var skills = fs.readdirSync(path.join(plugin, 'skills')).filter(function (d) { return fs.existsSync(path.join(plugin, 'skills', d, 'SKILL.md')); });
  var agents = fs.readdirSync(path.join(plugin, 'agents')).filter(function (f) { return f.endsWith('.md'); });
  assert.strictEqual(m.routes.length, skills.length + agents.length);
});
