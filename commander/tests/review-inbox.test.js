'use strict';

var test = require('node:test');
var assert = require('node:assert');
var fs = require('fs');
var os = require('os');
var path = require('path');
var inbox = require('../ingestion/inbox');
var adventure = require('../adventure');

function fixture() {
  var dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cc-inbox-'));
  fs.mkdirSync(path.join(dir, 'commander'));
  fs.writeFileSync(path.join(dir, 'commander', 'plugins.js'), "var KNOWN_PACKAGES = {\n  a: {\n    name: 'A',\n  },\n};\n");
  fs.writeFileSync(path.join(dir, 'SKILLS-INDEX.md'), '# Idx\n\n---\n\n## ⚠️ Directories without SKILL.md\n\n- x\n');
  fs.writeFileSync(path.join(dir, 'CHANGELOG.md'), '# Changelog\n\n## [1.0.0] - 2026-01-01\n\n### Added\n- old\n');
  var file = path.join(dir, 'pending.json');
  fs.writeFileSync(file, JSON.stringify({ items: [
    { name: 'octo/cool-skills', url: 'https://github.com/octo/cool-skills', stars: 42, description: 'Cool | skills' },
    { name: 'octo/old', url: 'https://github.com/octo/old', status: 'rejected' },
  ] }));
  return { dir: dir, opts: { file: file, root: dir } };
}

test('pendingCount ignores reviewed items and tolerates a missing file', function() {
  var f = fixture();
  assert.strictEqual(inbox.pendingCount(f.opts), 1);
  assert.strictEqual(inbox.pendingCount({ file: path.join(f.dir, 'nope.json') }), 0);
});

test('reject marks the item and drops it from pending', function() {
  var f = fixture();
  assert.ok(inbox.reject('https://github.com/octo/cool-skills', 'overlap', f.opts).ok);
  assert.strictEqual(inbox.pendingCount(f.opts), 0);
  assert.strictEqual(inbox.reject('https://nope', '', f.opts).ok, false);
});

test('accept updates plugins.js, SKILLS-INDEX.md and CHANGELOG.md, idempotently', function() {
  var f = fixture();
  var res = inbox.accept('https://github.com/octo/cool-skills', f.opts);
  assert.ok(res.ok);
  var plugins = fs.readFileSync(path.join(f.dir, 'commander', 'plugins.js'), 'utf8');
  assert.match(plugins, /'cool-skills': \{/);
  assert.doesNotThrow(function() { new Function(plugins + '; return KNOWN_PACKAGES;')(); });
  assert.ok(new Function(plugins + '; return KNOWN_PACKAGES;')()['cool-skills']);
  var idx = fs.readFileSync(path.join(f.dir, 'SKILLS-INDEX.md'), 'utf8');
  assert.match(idx, /## Ingested Packages[\s\S]*`cool-skills`[\s\S]*Directories without SKILL\.md/);
  assert.match(fs.readFileSync(path.join(f.dir, 'CHANGELOG.md'), 'utf8'), /## \[Unreleased\]\n\n### Added\n- Ingested package `octo\/cool-skills`/);
  assert.strictEqual(inbox.pendingCount(f.opts), 0);

  // second accept of the same url: docs unchanged
  var again = inbox.accept('https://github.com/octo/cool-skills', f.opts);
  assert.deepStrictEqual(Object.values(again.updated), ['unchanged', 'unchanged', 'unchanged']);
});

test('main menu shows the pending badge only when the inbox has items', function() {
  var f = fixture();
  var prevHome = process.env.HOME;
  try {
    process.env.HOME = f.dir;
    fs.mkdirSync(path.join(f.dir, '.claude', 'commander', 'inbox'), { recursive: true });
    var menu = adventure.loadAdventure('main-menu');
    var keys = function() { return adventure.prepareAdventure(menu, {}, {}).choices.map(function(c) { return c.label; }); };
    assert.ok(!keys().some(function(l) { return /Review inbox/.test(l); }));
    fs.copyFileSync(f.opts.file, path.join(f.dir, '.claude', 'commander', 'inbox', 'pending.json'));
    assert.ok(keys().indexOf('Review inbox (1 pending)') >= 0);
  } finally { process.env.HOME = prevHome; }
});

test('review-inbox adventure loads and its actions resolve', function() {
  var adv = adventure.loadAdventure('review-inbox');
  assert.ok(adv);
  var actions = require('../actions/inbox');
  assert.strictEqual(typeof actions[adv.action], 'function');
  adv.afterAction.choices.forEach(function(c) {
    if (c.action) assert.strictEqual(typeof actions[c.action], 'function');
    if (c.next) assert.ok(adventure.loadAdventure(c.next));
  });
});
