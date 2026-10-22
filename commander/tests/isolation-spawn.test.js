'use strict';

// Pins the proactive isolation-spawn nudge (CC-1370 slice 1): the suggest
// ticker should offer to spin ISOLATED/PARALLEL work into its own session
// (spawn_task chip in Cowork / /spawn in CLI) — and must NOT nag on ordinary
// single-task prompts or when the user already knows the spawn surface.

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');

const HOOK = path.join(__dirname, '..', 'cowork-plugin', 'hooks', 'suggest-ticker.js');

async function detect(text) {
  const mod = await import('../cowork-plugin/hooks/suggest-ticker.js');
  return mod.detectIsolationSignal(text);
}

describe('detectIsolationSignal — fires on isolation phrasing', () => {
  const positives = [
    'can you fix the build, and separately: audit the auth flow',
    'run the migration in the background while I review the PR',
    'spin up another agent to research pricing',
    'handle the docs sweep independently',
    'also, in parallel, update the changelog',
    "while I'm away, keep retrying the deploy",
  ];
  for (const p of positives) {
    it(`fires on: "${p.slice(0, 40)}…"`, async () => {
      const sig = await detect(p);
      assert.ok(sig, `expected an isolation signal for: ${p}`);
      assert.ok(sig.reason && sig.phrase, 'signal carries reason + phrase');
    });
  }
});

describe('detectIsolationSignal — stays silent (precision guard)', () => {
  const negatives = [
    'fix the failing test in auth.ts',
    'what should I do next?',
    'refactor this function to be immutable',
    // user already knows the spawn surface → no nudge
    'spawn a new agent to look at my bookmarks',
    'use /spawn quick to handle this',
    'kick off a ccc-fleet run',
    'handle this in a separate session',
    '', null, undefined,
  ];
  for (const n of negatives) {
    it(`silent on: "${String(n).slice(0, 40)}"`, async () => {
      assert.equal(await detect(n), null);
    });
  }
});

// Full-path integration: spawn the real hook with an isolated HOME so state
// writes don't touch the developer's ~/.claude, and assert the emitted model
// context reflects the detector's decision.
function runHook(prompt, extraEnv = {}) {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'ccc-spawn-test-'));
  try {
    const res = spawnSync(process.execPath, [HOOK], {
      input: JSON.stringify({ prompt }),
      env: { ...process.env, HOME: home, CCC_SUGGEST_VERBOSE: '0', ...extraEnv },
      encoding: 'utf8',
      timeout: 15000,
    });
    return res.stdout || '';
  } finally {
    try { fs.rmSync(home, { recursive: true, force: true }); } catch {}
  }
}

describe('suggest-ticker isolation nudge — end to end', () => {
  it('emits a spawn offer for an isolation prompt', () => {
    const out = runHook('separately: please audit the billing code');
    assert.match(out, /spawn_task chip|\/spawn quick/, 'output should carry the surface-aware spawn offer');
  });

  it('does NOT emit a spawn offer for an ordinary prompt', () => {
    const out = runHook('fix the failing auth test');
    assert.doesNotMatch(out, /CCC isolation signal/, 'no isolation nudge on a normal single task');
  });

  it('respects CCC_SUGGEST_DISABLE=1', () => {
    const out = runHook('separately: audit the billing code', { CCC_SUGGEST_DISABLE: '1' });
    assert.doesNotMatch(out, /CCC isolation signal/, 'disabled → silent');
  });
});
