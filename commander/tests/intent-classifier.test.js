'use strict';

const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const os = require('node:os');
const { spawnSync } = require('node:child_process');

const HOOK = path.join(
  __dirname,
  '..',
  'cowork-plugin',
  'hooks',
  'intent-classifier.js'
);

function classify(prompt) {
  // HOME isolated: the hook's Fable-nudge path can write a
  // fable-nudge-YYYY-MM-DD marker file under ~/.claude/commander/ — never
  // let a test write into the real home directory.
  const result = spawnSync(process.execPath, [HOOK], {
    input: JSON.stringify({ prompt }),
    encoding: 'utf8',
    timeout: 5000,
    env: { ...process.env, HOME: os.tmpdir(), USERPROFILE: os.tmpdir() },
  });
  assert.strictEqual(result.status, 0, 'classifier should exit 0');
  const out = JSON.parse(result.stdout.trim());
  return out;
}

test('routes "what changed" to /ccc-changelog', function () {
  // Note: "release" alone matches /ccc-deploy-check earlier in the table; we use "what changed" which is unambiguous.
  const r = classify('what changed in beta.11');
  assert.ok(r.systemMessage && r.systemMessage.includes('/ccc-changelog'), 'expected /ccc-changelog match, got: ' + JSON.stringify(r));
});

test('routes "is my plugin healthy" to /ccc-doctor', function () {
  // "is my plugin ok" is a configured pattern, but "healthy" is not — use "plugin health"
  const r = classify('is my plugin health ok right now');
  assert.ok(r.systemMessage && r.systemMessage.includes('/ccc-doctor'), 'expected /ccc-doctor match, got: ' + JSON.stringify(r));
});

test('routes "update the vendor submodules" to /ccc-upgrade', function () {
  const r = classify('please run a submodule update for vendors');
  assert.ok(r.systemMessage && r.systemMessage.includes('/ccc-upgrade'), 'expected /ccc-upgrade match, got: ' + JSON.stringify(r));
});

test('routes "remember what we decided" to /ccc-memory', function () {
  const r = classify('remember what we decided yesterday');
  assert.ok(r.systemMessage && r.systemMessage.includes('/ccc-memory'), 'expected /ccc-memory match, got: ' + JSON.stringify(r));
});

test('routes "show my todo list" to /ccc-tasks', function () {
  const r = classify('show my todo list please');
  assert.ok(r.systemMessage && r.systemMessage.includes('/ccc-tasks'), 'expected /ccc-tasks match, got: ' + JSON.stringify(r));
});

test('routes "did I solve this last week" to /ccc-recall', function () {
  const r = classify('did i solve this same problem last week');
  assert.ok(r.systemMessage && r.systemMessage.includes('/ccc-recall'), 'expected /ccc-recall match, got: ' + JSON.stringify(r));
});

test('control: "write a for loop in python" produces no skill suggestion', function () {
  const r = classify('write a for loop in python');
  // No match → suppressOutput true, no status field
  assert.strictEqual(r.suppressOutput, true, 'expected suppressOutput=true on no match');
  assert.ok(!r.systemMessage, 'expected no status field on no match, got: ' + JSON.stringify(r));
});

// #209: the Fable E2E prompt "audit this repo" must suggest the repo health
// check (/ccc-xray), never a review skill. Pinned for both the Claude Code
// plugin and the generated Codex plugin copy of the hook.
test('routes the exact prompt "audit this repo" to /ccc-xray, not a review skill', function () {
  const hooks = [
    HOOK,
    path.join(__dirname, '..', 'cowork-plugin-codex', 'hooks', 'intent-classifier.js'),
  ];
  for (const hook of hooks) {
    const result = spawnSync(process.execPath, [hook], {
      input: JSON.stringify({ prompt: 'audit this repo' }),
      encoding: 'utf8',
      timeout: 5000,
      env: { ...process.env, HOME: os.tmpdir(), USERPROFILE: os.tmpdir() },
    });
    assert.strictEqual(result.status, 0, hook + ': classifier should exit 0');
    const msg = JSON.parse(result.stdout.trim()).systemMessage || '';
    assert.ok(msg.includes('CCC suggests: /ccc-xray '), hook + ': expected /ccc-xray, got: ' + msg);
    assert.ok(!msg.includes('ccc-review'), hook + ': must not suggest ccc-review, got: ' + msg);
    assert.ok(!msg.includes('ccc-code-review'), hook + ': must not suggest ccc-code-review, got: ' + msg);
  }
});
