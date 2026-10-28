'use strict';

// CC-2124: the nine PR-workflow skills adapted from t3dotgg/tstack. Checks the
// attribution, that every surface ships them (routing, `ccc next`, the CLI
// menu, the Codex mirror) and that no vendored text instructs a force-push,
// a hook bypass or CI as the test gate.

var test = require('node:test');
var assert = require('node:assert');
var fs = require('fs');
var os = require('os');
var path = require('path');
var url = require('url');
var childProcess = require('child_process');

var ROOT = path.join(__dirname, '..', '..');
var PLUGIN = path.join(ROOT, 'commander', 'cowork-plugin');
var CODEX = path.join(ROOT, 'commander', 'cowork-plugin-codex');
var REGISTRY = path.join(PLUGIN, 'hooks', 'lib', 'ccc-routes.json');
var SCORER = path.join(PLUGIN, 'hooks', 'lib', 'route-scorer.mjs');
var PIN = '92e38e2cf677a84a142e8df296861c588542135c';

// CCC name -> upstream skill name.
var SKILLS = {
  'ccc-full-send': 'full-send',
  'ccc-full-stop': 'full-stop',
  'ccc-council': 'council',
  'ccc-sol-loop': 'sol-loop',
  'ccc-file-pr': 'file-pr',
  'ccc-takeover': 'takeover',
  'ccc-babysit-pr': 'babysit-pr',
  'ccc-modernize': 'modernize',
  'ccc-pr-comments': 'leaving-pr-comments',
};
var NAMES = Object.keys(SKILLS);

// One prompt per skill that must surface it, from the labelled routing set.
var ROUTE_PROMPTS = {
  'ccc-full-send': 'full send this fix to a merged PR',
  'ccc-full-stop': 'full stop on PR 42',
  'ccc-council': 'get a council review of this diff',
  'ccc-sol-loop': 'sol loop',
  'ccc-file-pr': 'file a PR for this branch',
  'ccc-takeover': 'take over this PR',
  'ccc-babysit-pr': 'babysit PR #128 until it is green',
  'ccc-modernize': 'modernize this PR',
  'ccc-pr-comments': 'reply to the review comments on my PR',
};
var NEGATIVE_PROMPTS = [
  'We are not adding more scope. Full stop.',
  'what does full send mean',
  'the city council meeting is tonight',
  'hostile takeover of the company',
  'babysitting my kids tonight',
  'modernize the UI',
];

function skillDir(name) { return path.join(PLUGIN, 'skills', name); }
function read(file) { return fs.readFileSync(file, 'utf8'); }

function frontmatter(text) {
  var m = text.match(/^---\n([\s\S]*?)\n---\n/);
  assert.ok(m, 'frontmatter block');
  var fm = {};
  m[1].split('\n').forEach(function(line) {
    var kv = line.match(/^([A-Za-z][\w-]*):\s*(.*)$/);
    if (kv) fm[kv[1]] = kv[2].replace(/^"|"$/g, '');
  });
  return fm;
}

// ── Safety guard ──────────────────────────────────────────────────────────
// A clause is an offence when it names a forbidden action and no prohibition
// ("never", "not", "do not", "without", "rather than" ...) comes before it in
// the same clause, so "Push with X without asking" still fails. A clause that
// quotes upstream ("upstream allowed X") passes only when its line also says
// the behaviour was removed or replaced. The flag spellings are built from
// parts so this file never carries them as one literal for shell guards.
var DASH2 = '--';
var FORBIDDEN = [
  // Any force option anywhere in a push command (`git push origin HEAD -f`), a
  // `+refspec`, or the words.
  { id: 'force-push', re: new RegExp('git push\\b[^`\\n]*?(\\s(-f|' + DASH2 + 'force(-with-lease|-if-includes)?)(?=[\\s=`]|$)|\\s\\+[\\w/:-])|' + DASH2 + 'force-with-lease|force[- ]push', 'i') },
  { id: 'hook-bypass', re: new RegExp(DASH2 + 'no-' + 'verify|skip(ping)?\\s+(the\\s+)?(pre-\\w+\\s+)?hooks?|disable\\s+(the\\s+)?hooks?|bypass\\s+(the\\s+)?(hooks?|branch protection)', 'i') },
  { id: 'secret-scan-bypass', re: /\b(skip(ping)?|disable|bypass)\s+(the\s+)?secret[- ]scan|gitleaks:allow|\.cp-secret-allow/i },
  // Rebasing onto a NEW, never-pushed branch is the one allowed history rewrite.
  { id: 'rebase-pushed', re: /\bgit rebase\b|\brebase (onto|the pr|the branch|it|a pushed|pushed|its commits)\b/i, allow: /\bonto a new\b|<branch>-modernized/i },
  { id: 'admin-merge', re: new RegExp('gh pr merge[^\\n]*(' + DASH2 + 'admin|' + DASH2 + 'auto\\b)|\\benable auto-merge\\b', 'i') },
  { id: 'ci-as-gate', re: /\b(rely on|wait for|trust) (github actions|ci)\b|\brerun (the )?(red |failed )?(ci|checks|workflow)\b/i },
];
var PROHIBITION = /\b(never|not|no(?!-)|nor|don't|do not|without|rather than|instead of|forbid\w*|refuse\w*|avoid)\b/i;
var UPSTREAM_QUOTE = /\bupstream (said|says|allowed|let|rebased|used|had|told|let the)\b/i;
var REMOVAL = /\b(removed|replaced|never|not)\b/i;

// The nearest prohibition before the match governs it, unless an affirmative
// word ("always", "must", "then") comes between them.
function prohibited(before) {
  var last = -1;
  var re = new RegExp(PROHIBITION.source, 'gi');
  var m;
  while ((m = re.exec(before))) last = m.index + m[0].length;
  return last >= 0 && !/\b(always|must|then|go ahead)\b/i.test(before.slice(last));
}

// Sentences, then contrast ("but", "however", "yet") and a leading
// conditional ("If tests do not pass, ...") start a new clause, so a "not"
// inside a condition or before a contrast cannot exempt what follows.
function clausesOf(line) {
  var out = [];
  // Markdown list, quote, number and emphasis prefixes are not words.
  // Bold and italic markers go; the words they wrap stay.
  line = line.replace(/^\s*(?:(?:[-*+]|\d+[.)]|>)\s+)+/, '').replace(/\*\*|__/g, '');
  line.split(/[.;!?](?=\s|$)|\s[—–]\s|:\s/).forEach(function(sentence) {
    sentence.split(/,?\s+\b(?:but|however|yet|though|although|except)\b,?\s*/i).forEach(function(part) {
      var cond = part.match(/^\s*(?:if|unless|when|whenever|once|after|before|in case)\b[^,]*,\s*/i);
      if (cond) { out.push(cond[0]); out.push(part.slice(cond[0].length)); } else out.push(part);
    });
  });
  return out;
}

function offences(text) {
  var found = [];
  text.split('\n').forEach(function(line, i) {
    if (/^> Adapted from \[t3dotgg\/tstack\]/.test(line)) return;
    clausesOf(line).forEach(function(clause) {
      FORBIDDEN.forEach(function(rule) {
        if (rule.allow && rule.allow.test(clause)) return;
        if (UPSTREAM_QUOTE.test(clause) && REMOVAL.test(line.replace(clause, ''))) return;
        var re = new RegExp(rule.re.source, 'gi');
        var m;
        while ((m = re.exec(clause))) {
          if (prohibited(clause.slice(0, m.index))) continue;
          found.push(rule.id + ' at line ' + (i + 1) + ': ' + line.trim());
          return;
        }
      });
    });
  });
  return found;
}

function shippedFiles(name) {
  var out = [];
  (function walk(dir) {
    fs.readdirSync(dir, { withFileTypes: true }).forEach(function(e) {
      var p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name !== 'LICENSE.txt') out.push(p);
    });
  })(skillDir(name));
  return out;
}

test('safety guard catches each forbidden instruction and allows prohibitions', function() {
  var bad = [
    'git push ' + DASH2 + 'force-with-lease origin feature',
    'Commit with ' + DASH2 + 'no-' + 'verify to save time.',
    'Rebase onto the latest default branch, then git rebase -i to squash.',
    'Rebase the branch onto main and push it.',
    'gh pr merge 12 ' + DASH2 + 'admin',
    'Wait for CI to go green before merging.',
    'Push with ' + DASH2 + 'force-with-lease without asking again.',
    'If the hook is slow, skip the pre-commit hook; upstream does it too.',
    'Skip secret scanning for generated files.',
    'Enable auto-merge once checks pass.',
    'CCC safety: upstream allowed force-pushing after a rebase.',
    'If tests do not pass, force-push the branch.',
    'Never force-push, but use git push ' + DASH2 + 'force-with-lease.',
    'Do not wait, however rerun the red CI until green.',
    '- If tests do not pass, force-push the branch.',
    '> 1. When checks do not pass, git push origin HEAD ' + DASH2 + 'force',
    'Then run git push origin HEAD -f to update it.',
    'Run git push origin +feature to replace the remote branch.',
    '- **Force-push** the branch.',
    '- **Skip hooks** before pushing.',
    '3. **Update the branch.** Rebase the branch onto main.',
  ];
  bad.forEach(function(line) { assert.ok(offences(line).length > 0, 'should flag: ' + line); });
  ['Never force-push, including ' + DASH2 + 'force-with-lease.', 'Do not rerun red CI; reproduce it locally.', 'Never skip hooks or secret scanning.', 'CCC safety: upstream allowed force-pushing after a rebase; both are removed here.', 'Update without force-pushing: merge the base instead.', '- **Never** force-push.', '- **CCC safety:** never skip hooks.'].forEach(function(line) {
    assert.deepStrictEqual(offences(line), [], 'should allow: ' + line);
  });
});

test('no vendored tstack file instructs a force-push, hook bypass, pushed rebase or CI gate', function() {
  NAMES.forEach(function(name) {
    shippedFiles(name).forEach(function(file) {
      assert.deepStrictEqual(offences(read(file)), [], path.relative(ROOT, file));
    });
  });
});

// ── Attribution and shape ─────────────────────────────────────────────────

test('each tstack skill carries the MIT license, pinned attribution and Commander shape', function() {
  var notice = read(path.join(ROOT, 'NOTICE.md'));
  assert.ok(notice.includes(PIN) && notice.includes('Theo Browne'), 'NOTICE.md names the pin and holder');
  NAMES.forEach(function(name) {
    var text = read(path.join(skillDir(name), 'SKILL.md'));
    var fm = frontmatter(text);
    assert.strictEqual(fm.name, name);
    assert.strictEqual(fm['disable-model-invocation'], 'true', name + ' loads on demand');
    assert.ok(!('model' in fm) && !('effort' in fm), name + ' pins no model or effort');
    assert.ok(text.includes('https://github.com/t3dotgg/tstack') && text.includes('skills/' + SKILLS[name] + '/SKILL.md') && text.includes(PIN), name + ' attribution header');
    assert.ok(/CCC safety:/.test(text), name + ' marks its changes');
    assert.ok(!/\bSol\b|\bT3 Code\b(?! )/.test(text.replace(/Upstream also supports T3 Code[^.]*\./g, '')), name + ' uses current model and harness names');
    var license = read(path.join(skillDir(name), 'LICENSE.txt'));
    assert.ok(license.startsWith('MIT License') && license.includes('Copyright (c) 2026 Theo Browne'), name + ' LICENSE.txt');
    assert.ok(notice.includes('- ' + name + ' '), 'NOTICE.md lists ' + name);
  });
});

test('the merge-capable skills keep the local green-suite gate', function() {
  var send = read(path.join(skillDir('ccc-full-send'), 'SKILL.md'));
  assert.match(send, /full local suite and lint are green on that sha/i);
  assert.match(send, /someone other than the worker/i);
  assert.match(read(path.join(skillDir('ccc-full-stop'), 'SKILL.md')), /never merge/i);
  assert.match(read(path.join(skillDir('ccc-file-pr'), 'SKILL.md')), /--draft/);
});

test('pr-wait is executable, attributed and parses its own --help', function() {
  var script = path.join(skillDir('ccc-babysit-pr'), 'scripts', 'pr-wait');
  assert.ok(fs.statSync(script).mode & 0o111, 'pr-wait keeps its executable bit');
  var text = read(script);
  assert.ok(text.includes(PIN) && /CCC safety:/.test(text));
  assert.ok(!/rebase it"/.test(text), 'event text no longer says to rebase');
  var py = childProcess.spawnSync('python3', ['--version']);
  if (py.status !== 0) return;
  var home = fs.mkdtempSync(path.join(os.tmpdir(), 'pr-wait-'));
  var r = childProcess.spawnSync('python3', [script, '--help'], { env: Object.assign({}, process.env, { HOME: home }), encoding: 'utf8' });
  assert.strictEqual(r.status, 0, r.stderr);
  assert.match(r.stdout, /--until/);
});

// ── Codex ─────────────────────────────────────────────────────────────────

test('each skill ships agents/openai.yaml with implicit invocation off, mirrored to Codex', function() {
  NAMES.forEach(function(name) {
    var rel = path.join('skills', name, 'agents', 'openai.yaml');
    var yaml = read(path.join(PLUGIN, rel));
    assert.match(yaml, /^interface:\n {2}display_name: "[^"]+"\n {2}short_description: "[^"]{1,64}"\n {2}default_prompt: "[^"]+"\n/, name + ' interface block');
    assert.ok(yaml.includes('$' + name), name + ' default_prompt names $' + name);
    assert.match(yaml, /\npolicy:\n {2}allow_implicit_invocation: false\n/, name + ' implicit invocation off');
    assert.strictEqual(read(path.join(CODEX, rel)), yaml, name + ' Codex mirror matches');
    assert.ok(fs.existsSync(path.join(CODEX, 'skills', name, 'SKILL.md')), name + ' in the Codex plugin');
  });
});

// ── Routing and ccc next ──────────────────────────────────────────────────

test('routing registry offers every tstack skill as manual and never auto-runs it', async function() {
  var s = await import(url.pathToFileURL(SCORER).href);
  var registry = s.loadRoutes(REGISTRY);
  var raw = JSON.parse(read(REGISTRY)).routes;
  NAMES.forEach(function(name) {
    var route = raw.find(function(r) { return r.id === name; });
    assert.ok(route, name + ' in ccc-routes.json');
    assert.strictEqual(route.manual, true, name + ' is a manual route');
    var candidates = s.scoreRoutes(ROUTE_PROMPTS[name], registry);
    assert.strictEqual(candidates[0] && candidates[0].route.id, name, ROUTE_PROMPTS[name]);
    assert.strictEqual(s.tierFor(candidates, 'auto'), 'medium', name + ' is offered, not auto-run');
  });
  NEGATIVE_PROMPTS.forEach(function(prompt) {
    var candidates = s.scoreRoutes(prompt, registry);
    assert.strictEqual(s.tierFor(candidates, 'auto'), 'low', prompt);
  });
});

test('routing fixtures carry positive cases for every tstack skill', function() {
  var cases = JSON.parse(read(path.join(__dirname, 'fixtures', 'routing-prompts.json'))).cases;
  NAMES.forEach(function(name) {
    assert.ok(cases.some(function(c) { return c.expect === name; }), name + ' has a labelled case');
  });
  NEGATIVE_PROMPTS.forEach(function(prompt) {
    assert.ok(cases.some(function(c) { return c.prompt === prompt && c.expect === 'none'; }), 'negative case: ' + prompt);
  });
});

test('ccc next selects a tstack skill for a matching Fleet job', async function() {
  var nextLib = require('../lib/next');
  var home = fs.mkdtempSync(path.join(os.tmpdir(), 'ccc next tstack '));
  var dir = path.join(home, '.claude-lane');
  var install = path.join(dir, 'plugins', 'cache', 'commander-hub', 'commander', '8.1.4');
  fs.mkdirSync(path.join(install, '.claude-plugin'), { recursive: true });
  fs.writeFileSync(path.join(install, '.claude-plugin', 'plugin.json'), JSON.stringify({ version: '8.1.4' }));
  ['ccc', 'ccc-review'].concat(NAMES).forEach(function(n) {
    fs.mkdirSync(path.join(install, 'skills', n), { recursive: true });
    fs.writeFileSync(path.join(install, 'skills', n, 'SKILL.md'), 'x');
  });
  fs.mkdirSync(path.join(install, 'hooks', 'lib'), { recursive: true });
  fs.copyFileSync(REGISTRY, path.join(install, 'hooks', 'lib', 'ccc-routes.json'));
  fs.writeFileSync(path.join(dir, 'plugins', 'installed_plugins.json'), JSON.stringify({ version: 2, plugins: { 'commander@commander-hub': [{ scope: 'user', version: '8.1.4', installPath: install }] } }));
  var env = { HOME: home, CLAUDE_CONFIG_DIR: dir };
  var r = await nextLib.next({ job: { kind: 'review', title: 'babysit PR #128 until it is green' }, env: env });
  assert.strictEqual(r.skill, '/ccc-babysit-pr');
  r = await nextLib.next({ job: { kind: 'code', title: 'modernize this PR' }, env: env });
  assert.strictEqual(r.skill, '/ccc-modernize');
});

// ── CLI choose-your-own-adventure menu ────────────────────────────────────

test('the PR workflows adventure lists every tstack skill and the main menu opens it', function() {
  var adventures = path.join(ROOT, 'commander', 'adventures');
  var main = JSON.parse(read(path.join(adventures, 'main-menu.json')));
  assert.ok(main.choices.some(function(c) { return c.next === 'pr-workflows'; }), 'main menu links pr-workflows');
  var adv = JSON.parse(read(path.join(adventures, 'pr-workflows.json')));
  assert.strictEqual(adv.id, 'pr-workflows');
  var keys = adv.choices.map(function(c) { return c.key; });
  assert.strictEqual(new Set(keys).size, keys.length, 'menu keys are unique');
  NAMES.forEach(function(name) {
    assert.ok(adv.choices.some(function(c) { return c.next === name; }), name + ' choice');
    var sub = adv.subAdventures[name];
    assert.ok(sub && sub.action === 'freeform_build' && sub.context === '/' + name + ' ', name + ' sub-adventure starts the skill');
  });
  assert.ok(adv.choices.some(function(c) { return c.next === 'main-menu'; }), 'back to main menu');
});

// ── Required gates per skill and mutation checks ──────────────────────────
// Each skill must keep the rules that make it safe; dropping one fails here.
var LOCAL_GATE = /full local suite(?: and|,| \+) lint|local (suite|gate)[^.]*(green|passes|pass)/i;
var MERGE_BASE = /git merge --no-edit origin\/<base>/;
var NO_HOOK_SKIP = /never[^.]*skip[^.]*hooks?[^.]*secret scanning|never skip hooks,? secret scanning|skip(?:ping)? hooks or secret scanning/i;
var INDEPENDENT_REVIEW = /independent reviewer|someone other than the (worker|author)/i;
var REQUIRED = {
  'ccc-full-send': [LOCAL_GATE, MERGE_BASE, NO_HOOK_SKIP, INDEPENDENT_REVIEW, /someone other than the worker/i, /never `?--admin`?/i, /never overrides project instruction files/i],
  'ccc-full-stop': [LOCAL_GATE, MERGE_BASE, NO_HOOK_SKIP, INDEPENDENT_REVIEW, /never merge/i, /--disable-auto/, /never overrides project instruction files/i],
  'ccc-takeover': [LOCAL_GATE, MERGE_BASE, NO_HOOK_SKIP, INDEPENDENT_REVIEW, /never merge without the full local gate and an independent reviewer/i, /pushing to the original contributor's branch, or closing the original PR, is always asked first/i],
  'ccc-babysit-pr': [LOCAL_GATE, MERGE_BASE, NO_HOOK_SKIP, INDEPENDENT_REVIEW, /merge only if the user explicitly asked/i, /never `?--admin`?/i],
  'ccc-modernize': [LOCAL_GATE, MERGE_BASE, NO_HOOK_SKIP, /<branch>-modernized/],
  'ccc-file-pr': [LOCAL_GATE, NO_HOOK_SKIP, /gh pr create[^\n]*--draft/, /draft=true/],
  'ccc-sol-loop': [LOCAL_GATE, NO_HOOK_SKIP, /never push mid-loop|do not push during the loop/i, /-s read-only/],
  'ccc-council': [LOCAL_GATE, NO_HOOK_SKIP, /review-only/i, /three rounds/i],
};

function missingRules(name, text) {
  return REQUIRED[name].filter(function(re) { return !re.test(text); }).map(String);
}

test('each gated tstack skill keeps its required safety rules', function() {
  Object.keys(REQUIRED).forEach(function(name) {
    assert.deepStrictEqual(missingRules(name, read(path.join(skillDir(name), 'SKILL.md'))), [], name);
  });
});

test('mutation: deleting the lines that carry any required rule is caught', function() {
  Object.keys(REQUIRED).forEach(function(name) {
    var lines = read(path.join(skillDir(name), 'SKILL.md')).split('\n');
    REQUIRED[name].forEach(function(re) {
      var mutated = lines.filter(function(l) { return !re.test(l); }).join('\n');
      if (re.test(mutated)) return; // a rule that spans lines is still present elsewhere
      assert.ok(missingRules(name, mutated).length > 0, name + ': removing ' + re + ' went unnoticed');
    });
  });
});

test('mutation: removing the prohibition from a real safety line is caught', function() {
  var mutated = 0;
  NAMES.forEach(function(name) {
    var text = read(path.join(skillDir(name), 'SKILL.md'));
    text.split('\n').forEach(function(line) {
      if (!/\bnever (force-push|rebase a pushed branch|skip hooks)/i.test(line)) return;
      var bad = line.replace(/\bnever (force-push|rebase a pushed branch|skip hooks)/i, function(_m, act) { return 'always ' + act; });
      assert.ok(offences(bad).length > 0, name + ': guard missed mutated line: ' + bad);
      mutated += 1;
    });
    // Appending an affirmative instruction to the real file must fail the guard.
    var injected = text + '\nWhen the base moves, rebase the branch onto main and push with ' + DASH2 + 'force-with-lease without asking.\n';
    assert.ok(offences(injected).length >= 2, name + ': injected instructions not caught');
    ['- If tests do not pass, force-push the branch.', '1. Update it: `git push origin HEAD ' + DASH2 + 'force`', '- Finally run `git push origin HEAD -f`.', '- **Force-push** the branch.', '- **Skip hooks** before pushing.'].forEach(function(extra) {
      assert.ok(offences(text + '\n' + extra + '\n').length > 0, name + ': injected line not caught: ' + extra);
    });
  });
  assert.ok(mutated >= 5, 'expected real prohibition lines to mutate, got ' + mutated);
});

test('pr-wait hands back (exit 1) when no CI check gates the PR instead of polling forever', function() {
  var py = childProcess.spawnSync('python3', ['--version']);
  if (py.status !== 0) return;
  var script = path.join(skillDir('ccc-babysit-pr'), 'scripts', 'pr-wait');
  var home = fs.mkdtempSync(path.join(os.tmpdir(), 'pr-wait-sim-'));
  // Offline: load the script as a module, stub the two GitHub reads and the
  // required-check lookup, and poll without sleeping.
  var harness = [
    'import importlib.machinery, importlib.util, sys',
    'loader = importlib.machinery.SourceFileLoader("prwait", sys.argv[1])',
    'spec = importlib.util.spec_from_loader("prwait", loader)',
    'm = importlib.util.module_from_spec(spec); loader.exec_module(m)',
    'm.STATE_DIR.mkdir(parents=True, exist_ok=True)',
    'm.required_checks = lambda repo, base: set()',
    'pr = {"state": "OPEN", "url": "u", "baseRefName": "main", "headRefOid": "abc1234def", "mergeStateStatus": "CLEAN",',
    '      "author": {"login": "me"}, "viewer": "me", "comments": {"nodes": []}, "reviews": {"nodes": []},',
    '      "reviewThreads": {"nodes": []}, "baseRef": {"target": {"oid": "b1"}}}',
    'w = m.Watcher("o/r", 1, sys.argv[2], 5)',
    'w.fetch_pr = lambda: pr',
    'w.fetch_checks = lambda: {}',
    'm.time.sleep = lambda s: None',
    'polls = 0',
    'try:',
    '    while polls < 50:',
    '        polls += 1',
    '        w.poll(); w.baseline = False',
    '    print("still polling"); sys.exit(3)',
    'except SystemExit as e:',
    '    if e.code == 3: raise',
    '    print("exit", e.code, "after", polls); sys.exit(0 if e.code == 1 else 4)',
  ].join('\n');
  ['green', 'ready'].forEach(function(until) {
    var r = childProcess.spawnSync('python3', ['-I', '-B', '-c', harness, script, until], { env: Object.assign({}, process.env, { HOME: home }), encoding: 'utf8' });
    assert.strictEqual(r.status, 0, until + ': ' + r.stdout + r.stderr);
    assert.match(r.stdout, /no CI checks gate/);
  });
});
