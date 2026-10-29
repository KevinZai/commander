'use strict';

var test = require('node:test');
var assert = require('node:assert');
var fs = require('fs');
var os = require('os');
var path = require('path');
var inbox = require('../ingestion/inbox');
var adventure = require('../adventure');

var URL1 = 'https://github.com/octo/cool-skills';

function fixture(items, tmpPrefix) {
  var dir = fs.mkdtempSync(path.join(os.tmpdir(), tmpPrefix || 'cc-inbox-'));
  fs.mkdirSync(path.join(dir, 'commander'));
  fs.writeFileSync(path.join(dir, 'commander', 'plugins.js'), "var KNOWN_PACKAGES = {\n  a: {\n    name: 'A',\n  },\n};\nmodule.exports = KNOWN_PACKAGES;\n");
  fs.writeFileSync(path.join(dir, 'SKILLS-INDEX.md'), '# Idx\n\n---\n\n## ⚠️ Directories without SKILL.md\n\n- x\n');
  fs.writeFileSync(path.join(dir, 'CHANGELOG.md'), '# Changelog\n\n## [1.0.0] - 2026-01-01\n\n### Added\n- old\n');
  var file = path.join(dir, 'pending.json');
  fs.writeFileSync(file, JSON.stringify({ items: items || [
    { name: 'octo/cool-skills', url: URL1, stars: 42, description: 'Cool | skills' },
    { name: 'octo/old', url: 'https://github.com/octo/old', status: 'rejected' },
  ] }));
  return { dir: dir, file: file, opts: { file: file, root: dir } };
}

function targets(dir) {
  return {
    plugins: fs.readFileSync(path.join(dir, 'commander', 'plugins.js'), 'utf8'),
    index: fs.readFileSync(path.join(dir, 'SKILLS-INDEX.md'), 'utf8'),
    changelog: fs.readFileSync(path.join(dir, 'CHANGELOG.md'), 'utf8'),
  };
}

function loadPlugins(src) {
  return new Function('module', src + '; return KNOWN_PACKAGES;')({});
}

function count(haystack, needle) {
  return haystack.split(needle).length - 1;
}

function listFiles(dir) {
  var out = [];
  (function walk(d) {
    fs.readdirSync(d, { withFileTypes: true }).forEach(function(e) {
      var p = path.join(d, e.name);
      if (e.isDirectory()) walk(p); else out.push(path.relative(dir, p));
    });
  })(dir);
  return out.sort();
}

function withHome(home, fn) {
  var prev = process.env.HOME;
  try { process.env.HOME = home; return fn(); } finally { process.env.HOME = prev; }
}

function menuLabels() {
  var menu = adventure.loadAdventure('main-menu');
  return adventure.prepareAdventure(menu, {}, {}).choices.map(function(c) { return c.label; });
}

function writeHomeInbox(home, items) {
  var dir = path.join(home, '.claude', 'commander', 'inbox');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'pending.json'), JSON.stringify({ items: items }));
}

test('pendingCount ignores reviewed items', function() {
  var f = fixture();
  assert.strictEqual(inbox.pendingCount(f.opts), 1);
});

test('reject marks the item, drops it from pending and edits no target file', function() {
  var f = fixture();
  var before = targets(f.dir);
  assert.ok(inbox.reject(URL1, 'overlap', f.opts).ok);
  assert.strictEqual(inbox.pendingCount(f.opts), 0);
  assert.strictEqual(inbox.readInbox(f.opts).items[0].status, 'rejected');
  assert.deepStrictEqual(targets(f.dir), before);
  assert.strictEqual(inbox.reject('https://nope', '', f.opts).code, 'not_found');
});

test('accept updates plugins.js, SKILLS-INDEX.md and CHANGELOG.md', function() {
  var f = fixture();
  var res = inbox.accept(URL1, f.opts);
  assert.ok(res.ok);
  assert.deepStrictEqual(Object.values(res.updated), ['updated', 'updated', 'updated']);
  var t = targets(f.dir);
  assert.match(t.plugins, /'cool-skills': \{/);
  assert.ok(loadPlugins(t.plugins)['cool-skills']);
  assert.match(t.index, /## Ingested Packages[\s\S]*`cool-skills`[\s\S]*Directories without SKILL\.md/);
  assert.match(t.changelog, /## \[Unreleased\]\n\n### Added\n- Ingested package `octo\/cool-skills`/);
  assert.strictEqual(inbox.pendingCount(f.opts), 0);
});

test('a. missing pending.json and an empty list: count 0, badge hidden, no crash', function() {
  var home = fs.mkdtempSync(path.join(os.tmpdir(), 'cc-inbox-home-'));
  assert.strictEqual(inbox.pendingCount({ file: path.join(home, 'nope.json') }), 0);
  assert.deepStrictEqual(inbox.inboxStatus({ file: path.join(home, 'nope.json') }), { count: 0, warning: null });
  withHome(home, function() {
    assert.ok(!menuLabels().some(function(l) { return /Review inbox/.test(l); }));
    writeHomeInbox(home, []);
    assert.strictEqual(inbox.pendingCount(), 0);
    assert.ok(!menuLabels().some(function(l) { return /Review inbox/.test(l); }));
  });
});

test('b. corrupt or non-array pending.json: count 0 with a warning, file not overwritten', function() {
  ['{not json', '"a string"', '{"items": {"x": 1}}', '42', 'null'].forEach(function(body) {
    var f = fixture();
    fs.writeFileSync(f.file, body);
    var st = inbox.inboxStatus(f.opts);
    assert.strictEqual(st.count, 0, body);
    assert.ok(st.warning && /left untouched/.test(st.warning), body);
    assert.strictEqual(inbox.accept(URL1, f.opts).code, 'corrupt_inbox');
    assert.strictEqual(inbox.reject(URL1, 'x', f.opts).code, 'corrupt_inbox');
    assert.throws(function() { inbox.writeInbox(inbox.readInbox(f.opts), f.opts); }, /corrupt/);
    assert.strictEqual(fs.readFileSync(f.file, 'utf8'), body, 'file must be left as is');
  });
});

test('c. accept twice: each target file gets exactly one entry (idempotent)', function() {
  var f = fixture();
  inbox.accept(URL1, f.opts);
  var once = targets(f.dir);
  var again = inbox.accept(URL1, f.opts);
  assert.ok(again.ok);
  assert.deepStrictEqual(Object.values(again.updated), ['unchanged', 'unchanged', 'unchanged']);
  var t = targets(f.dir);
  assert.deepStrictEqual(t, once);
  assert.strictEqual(count(t.plugins, "'cool-skills': {"), 1);
  assert.strictEqual(count(t.index, '| `cool-skills` |'), 1);
  assert.strictEqual(count(t.changelog, 'Ingested package `octo/cool-skills`'), 1);
  assert.strictEqual(count(t.index, '## Ingested Packages'), 1);
  assert.strictEqual(count(t.changelog, '## [Unreleased]'), 1);

  // a second, different package lands in the same table and section
  fs.writeFileSync(f.file, JSON.stringify({ items: [{ name: 'octo/other', url: 'https://github.com/octo/other' }] }));
  inbox.accept('https://github.com/octo/other', f.opts);
  t = targets(f.dir);
  assert.strictEqual(count(t.index, '## Ingested Packages'), 1);
  assert.match(t.index, /\| `cool-skills` \|[^\n]*\n\| `other` \|/);
  assert.strictEqual(count(t.changelog, '## [Unreleased]'), 1);
  assert.strictEqual(count(t.changelog, '### Added\n- Ingested'), 1);
});

test('c. sequential accepts into the real plugins.js stay inside KNOWN_PACKAGES', function() {
  var f = fixture([{ name: 'a/unique-one', url: 'u1' }, { name: 'a/unique-two', url: 'u2' }]);
  fs.copyFileSync(path.join(__dirname, '..', 'plugins.js'), path.join(f.dir, 'commander', 'plugins.js'));
  assert.strictEqual(inbox.accept('u1', f.opts).updated['plugins.js'], 'updated');
  assert.strictEqual(inbox.accept('u2', f.opts).updated['plugins.js'], 'updated');
  assert.strictEqual(inbox.accept('u2', f.opts).updated['plugins.js'], 'unchanged');
  var file = path.join(f.dir, 'commander', 'plugins.js');
  var mod = require(file);
  assert.ok(mod.KNOWN_PACKAGES['unique-one'] && mod.KNOWN_PACKAGES['unique-two']);
  assert.strictEqual(count(fs.readFileSync(file, 'utf8'), "'unique-two': {"), 1);
  assert.ok(!/\},\};/.test(fs.readFileSync(file, 'utf8')));
});

test('c. a slug owned by a different repository is a collision, not a duplicate', function() {
  var f = fixture([
    { name: 'someone/superpowers', url: 'https://github.com/someone/superpowers' },
    { name: 'obra/superpowers', url: 'https://github.com/obra/superpowers' },
    { name: 'octo/cool-skills', url: URL1 },
    { name: 'fork/cool-skills', url: 'https://github.com/fork/cool-skills' },
  ]);
  fs.copyFileSync(path.join(__dirname, '..', 'plugins.js'), path.join(f.dir, 'commander', 'plugins.js'));
  var before = targets(f.dir);
  var res = inbox.accept('https://github.com/someone/superpowers', f.opts);
  assert.strictEqual(res.code, 'slug_collision');
  assert.deepStrictEqual(targets(f.dir), before, 'no file edits on a collision');
  assert.strictEqual(inbox.listPending(f.opts).length, 4);
  // the registered repo itself is recognised as already present
  assert.strictEqual(inbox.accept('https://github.com/obra/superpowers', f.opts).updated['plugins.js'], 'unchanged');
  // same check for a slug first added through the inbox
  assert.ok(inbox.accept(URL1, f.opts).ok);
  var mid = targets(f.dir);
  assert.strictEqual(inbox.accept('https://github.com/fork/cool-skills', f.opts).code, 'slug_collision');
  assert.deepStrictEqual(targets(f.dir), mid);
});

test('d. reject then accept, and accept of an unknown id: clear error, no file edits', function() {
  var f = fixture();
  var before = targets(f.dir);
  assert.ok(inbox.reject(URL1, 'nope', f.opts).ok);
  var res = inbox.accept(URL1, f.opts);
  assert.strictEqual(res.code, 'already_rejected');
  assert.match(res.error, /already rejected/);
  var unknown = inbox.accept('https://github.com/nobody/nothing', f.opts);
  assert.strictEqual(unknown.code, 'not_found');
  assert.match(unknown.error, /not found/);
  assert.deepStrictEqual(targets(f.dir), before);
  assert.strictEqual(inbox.readInbox(f.opts).items[0].status, 'rejected');
});

test('e. hostile name and description are stored and rendered escaped, nothing written outside the three files', function() {
  var hostile = {
    id: 'evil',
    name: '../../etc/x`y` | z\nnew\\',
    url: 'https://github.com/a/b|c`d`\n## Injected',
    stars: '9\'; process.exit(1); //',
    description: "it's `bad` | col\n| --- |\n</script>\u001b[31mred\u2028\\",
  };
  var f = fixture([hostile]);
  var filesBefore = listFiles(f.dir);
  var res = inbox.accept('evil', f.opts);
  assert.ok(res.ok, 'accept failed: ' + res.code);
  assert.deepStrictEqual(Object.values(res.updated), ['updated', 'updated', 'updated']);
  assert.deepStrictEqual(listFiles(f.dir), filesBefore, 'no new files');
  assert.ok(!fs.existsSync(path.join(f.dir, '..', 'etc')));

  var t = targets(f.dir);
  var pkgs = loadPlugins(t.plugins);
  var key = inbox.slugify(hostile.name);
  assert.ok(/^[a-z0-9-]+$/.test(key));
  assert.strictEqual(pkgs[key].stars, '0');
  assert.ok(pkgs[key].description.indexOf('\n') < 0);
  assert.ok(/it's `bad`/.test(pkgs[key].description), 'quote survives as data');

  var row = t.index.split('\n').filter(function(l) { return l.indexOf('| `' + key + '` |') === 0; });
  assert.strictEqual(row.length, 1);
  // exactly 3 unescaped pipes: start, between cells, end
  assert.strictEqual(row[0].replace(/\\\\/g, '').replace(/\\\|/g, '').split('|').length - 1, 3);
  assert.ok(row[0].indexOf('\u001b') < 0 && row[0].indexOf('</script>') < 0);
  assert.ok(!/^## Injected/m.test(t.index) && !/^## Injected/m.test(t.changelog), 'no heading injection');
  var cl = t.changelog.split('\n').filter(function(l) { return /Ingested package/.test(l); });
  assert.strictEqual(cl.length, 1);
  assert.strictEqual(count(cl[0], '`'), 2, 'only the wrapping backticks');

  var shown = inbox.displayText(hostile.description, 200);
  assert.ok(!/[\u0000-\u001f\u2028]/.test(shown));
  var stored = inbox.readInbox(f.opts).items[0];
  assert.strictEqual(stored.name, hostile.name, 'stored as data, unchanged');
});

test('f. one target file read-only or missing: the other two still update, failure reported per file', function(t) {
  var f = fixture();
  fs.unlinkSync(path.join(f.dir, 'SKILLS-INDEX.md'));
  var res = inbox.accept(URL1, f.opts);
  assert.ok(res.ok);
  assert.match(res.updated['SKILLS-INDEX.md'], /^error: ENOENT/);
  assert.strictEqual(res.updated['plugins.js'], 'updated');
  assert.strictEqual(res.updated['CHANGELOG.md'], 'updated');
  assert.ok(!fs.existsSync(path.join(f.dir, 'SKILLS-INDEX.md')), 'missing file is not created');
  assert.ok(res.partial);
  assert.strictEqual(inbox.pendingCount(f.opts), 1, 'a partial accept stays reviewable');

  // every target missing: nothing applied, so the item stays rejectable
  var h = fixture();
  ['commander/plugins.js', 'SKILLS-INDEX.md', 'CHANGELOG.md'].forEach(function(n) { fs.unlinkSync(path.join(h.dir, n)); });
  var none = inbox.accept(URL1, h.opts);
  assert.ok(none.partial);
  assert.strictEqual(inbox.listPending(h.opts)[0].partial, undefined);
  assert.ok(inbox.reject(URL1, 'broken install', h.opts).ok);

  if (process.getuid && process.getuid() === 0) { t.diagnostic('root ignores file modes; read-only case skipped'); return; }
  var g = fixture();
  var cl = path.join(g.dir, 'CHANGELOG.md');
  var before = fs.readFileSync(cl, 'utf8');
  fs.chmodSync(cl, 0o444);
  try {
    var r2 = inbox.accept(URL1, g.opts);
    assert.match(r2.updated['CHANGELOG.md'], /^error: EACCES/);
    assert.strictEqual(r2.updated['plugins.js'], 'updated');
    assert.strictEqual(r2.updated['SKILLS-INDEX.md'], 'updated');
    assert.strictEqual(fs.readFileSync(cl, 'utf8'), before);
    assert.strictEqual(inbox.listPending(g.opts)[0].partial, true);
    assert.strictEqual(inbox.reject(URL1, 'x', g.opts).code, 'partially_accepted');
    // a read-only inbox is refused before any target file changes
    var k = fixture();
    var kBefore = targets(k.dir);
    fs.chmodSync(k.file, 0o444);
    try {
      assert.strictEqual(inbox.accept(URL1, k.opts).code, 'inbox_not_writable');
      assert.deepStrictEqual(targets(k.dir), kBefore);
    } finally { fs.chmodSync(k.file, 0o644); }
    // once writable again, a retry fills only the missing file
    fs.chmodSync(cl, 0o644);
    var r3 = inbox.accept(URL1, g.opts);
    assert.deepStrictEqual(r3.updated, { 'plugins.js': 'unchanged', 'SKILLS-INDEX.md': 'unchanged', 'CHANGELOG.md': 'updated' });
    assert.strictEqual(r3.partial, false);
    assert.strictEqual(inbox.pendingCount(g.opts), 0);
    assert.strictEqual(inbox.readInbox(g.opts).items[0].status, 'accepted');
    assert.strictEqual(inbox.readInbox(g.opts).items[0].lastErrors, undefined);
  } finally { fs.chmodSync(cl, 0o644); }
});

test('g. badge shows the right N with 1 and many pending, HOME containing a space', function() {
  var home = fs.mkdtempSync(path.join(os.tmpdir(), 'cc inbox home '));
  assert.ok(/ /.test(home));
  withHome(home, function() {
    writeHomeInbox(home, [{ name: 'a/one', url: 'u1' }, { name: 'a/done', url: 'u0', status: 'accepted' }]);
    assert.ok(menuLabels().indexOf('Review inbox (1 pending)') >= 0);
    var many = [];
    for (var i = 0; i < 12; i++) many.push({ name: 'a/p' + i, url: 'u' + i });
    writeHomeInbox(home, many);
    assert.ok(menuLabels().indexOf('Review inbox (12 pending)') >= 0);
    assert.strictEqual(inbox.inboxFile(), path.join(home, '.claude', 'commander', 'inbox', 'pending.json'));
  });
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

test('review action: accept through the menu resumes paused input and returns to the main menu when empty', async function() {
  var f = fixture();
  var home = fs.mkdtempSync(path.join(os.tmpdir(), 'cc inbox action '));
  writeHomeInbox(home, [{ name: 'a/one', url: 'https://github.com/a/one' }, { name: 'a/two', url: 'https://github.com/a/two' }]);
  var actions = require('../actions/inbox');
  var evaluator = require('../ingestion/evaluator');
  var realEval = evaluator.evaluatePackage, realAccept = inbox.accept;
  var pausedAtAsk = [];
  var tui = {
    divider: function(s) { return s; }, dimText: function(s) { return s; },
    select: async function() { process.stdin.pause(); return 0; },
  };
  var engine = {
    rl: {}, pause: async function() {},
    ask: async function() { pausedAtAsk.push(process.stdin.isPaused()); return 'a'; },
  };
  var prevHome = process.env.HOME;
  try {
    process.env.HOME = home;
    evaluator.evaluatePackage = function() { return { license: 'MIT', licenseRisk: 'green', recommendation: 'ADOPT', reason: 'stub', overlap: [] }; };
    inbox.accept = function(ref) { return realAccept(ref, { root: f.dir }); };
    var first = await actions.inbox_review_package(engine, tui, {}, {});
    var second = await actions.inbox_review_package(engine, tui, {}, {});
    assert.deepStrictEqual([first.next, second.next], ['review-inbox', 'main-menu']);
    assert.deepStrictEqual(pausedAtAsk, [false, false], 'input resumed before each prompt');
    assert.strictEqual(inbox.pendingCount(), 0);
    var t = targets(f.dir);
    assert.ok(loadPlugins(t.plugins).one && loadPlugins(t.plugins).two);
  } finally {
    process.env.HOME = prevHome;
    evaluator.evaluatePackage = realEval;
    inbox.accept = realAccept;
    process.stdin.pause();
  }
});

test('review action: shortcut keys buffered by readline during menus do not leak into the answer', async function() {
  var readline = require('readline');
  var PassThrough = require('stream').PassThrough;
  var f = fixture();
  var home = fs.mkdtempSync(path.join(os.tmpdir(), 'cc-inbox-keys-'));
  writeHomeInbox(home, [{ name: 'a/one', url: 'https://github.com/a/one' }]);
  var actions = require('../actions/inbox');
  var evaluator = require('../ingestion/evaluator');
  var realEval = evaluator.evaluatePackage, realAccept = inbox.accept;
  var input = new PassThrough(), output = new PassThrough();
  output.resume();
  var rl = readline.createInterface({ input: input, output: output, terminal: true });
  var answers = [];
  // the select menus read "r" (Review a package) and "a" (first package); readline saw them too
  var tui = { divider: String, dimText: String, select: async function() { input.write('ra'); return 0; } };
  var engine = {
    rl: rl, pause: async function() {},
    ask: function(p) {
      return new Promise(function(resolve) {
        rl.question(p, function(a) { answers.push(a); resolve(a); });
        setImmediate(function() { input.write('r\r'); });
      });
    },
  };
  var prevHome = process.env.HOME;
  try {
    process.env.HOME = home;
    evaluator.evaluatePackage = function() { return { licenseRisk: 'green', recommendation: 'SKIP', reason: 'stub', overlap: [] }; };
    inbox.accept = function(ref) { return realAccept(ref, { root: f.dir }); };
    var before = targets(f.dir);
    var res = await actions.inbox_review_package(engine, tui, {}, {});
    assert.deepStrictEqual(answers, ['r']);
    assert.strictEqual(res.next, 'main-menu');
    assert.strictEqual(inbox.readInbox().items[0].status, 'rejected');
    assert.deepStrictEqual(targets(f.dir), before);
  } finally {
    process.env.HOME = prevHome;
    evaluator.evaluatePackage = realEval;
    inbox.accept = realAccept;
    rl.close();
    process.stdin.pause();
  }
});
