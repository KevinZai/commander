'use strict';

// Pins the v6.8.0 proactivity wave (Mission Control CC-1376):
//   1. mission-control signal  — ≥2 agents in flight OR ≥3 open tasks → /ccc-mission-control
//   2. metric-loop signal      — measurable-goal phrasing → /ccc-loop
//   3. vague-prompt signal     — short unspecific ask → /ccc-prompt-fix
//   4. tool-failures signal    — ≥3 failures in 10 min → debugging nudge
//   5. dismissed[] port        — suggest-lightweight stops repeating a
//      suggestion the user ignored twice (suggest-dismissed.json)
// Each signal must fire on a crafted fixture, stay silent on a near-miss,
// dedup correctly, respect CCC_SUGGEST_DISABLE, and survive malformed state.

const { describe, it, after } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');

const TICKER = path.join(__dirname, '..', 'cowork-plugin', 'hooks', 'suggest-ticker.js');
const LIGHTWEIGHT = path.join(__dirname, '..', 'cowork-plugin', 'hooks', 'suggest-lightweight.js');

// ---------------------------------------------------------------------------
// Fixture helpers — every run gets an isolated HOME (and, for the ticker, an
// isolated non-git cwd with a CLAUDE.md so no ambient AUQ suggestion fires).
// ---------------------------------------------------------------------------

const TMP_DIRS = [];

after(() => {
  for (const dir of TMP_DIRS) {
    try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
  }
});

function mkHome() {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'ccc-wave-home-'));
  TMP_DIRS.push(home);
  return home;
}

function mkCwd() {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'ccc-wave-cwd-'));
  TMP_DIRS.push(cwd);
  fs.writeFileSync(path.join(cwd, 'CLAUDE.md'), '# fixture project\n');
  return cwd;
}

function cccDir(home) {
  const dir = path.join(home, '.claude', 'commander');
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function writeLines(home, name, entries) {
  const lines = entries.map(e => (typeof e === 'string' ? e : JSON.stringify(e)));
  fs.writeFileSync(path.join(cccDir(home), name), lines.join('\n') + '\n');
}

function iso(msAgo) {
  return new Date(Date.now() - msAgo).toISOString();
}

const MIN = 60 * 1000;

function runTicker({ home, cwd, prompt, env = {} }) {
  const fullEnv = {
    ...process.env,
    HOME: home,
    USERPROFILE: home,
    CCC_SUGGEST_VERBOSE: '0',
    CCC_SUGGEST_DISABLE: undefined,
    CCC_SUGGEST_LEVEL: undefined,
    CLAUDE_SESSION_ID: undefined,
    ...env,
  };
  for (const k of Object.keys(fullEnv)) {
    if (fullEnv[k] === undefined) delete fullEnv[k];
  }
  const res = spawnSync(process.execPath, [TICKER], {
    input: JSON.stringify({ prompt, session_id: 'wave-test-session' }),
    cwd,
    env: fullEnv,
    encoding: 'utf8',
    timeout: 15000,
  });
  return { out: res.stdout || '', status: res.status };
}

function assertContract(run) {
  assert.equal(run.status, 0, 'hook must exit 0');
  const parsed = JSON.parse(run.out.trim().split('\n').pop());
  assert.equal(parsed.continue, true, 'hook must emit continue:true');
  return parsed;
}

// ---------------------------------------------------------------------------
// Unit: pure detectors (in-process import, no I/O)
// ---------------------------------------------------------------------------

async function detectors() {
  const mod = await import('../cowork-plugin/hooks/suggest-ticker.js');
  return { metric: mod.detectMetricLoopSignal, vague: mod.detectVaguePrompt };
}

describe('detectMetricLoopSignal — fires on measurable goals', () => {
  const positives = [
    'reduce page load time to 200ms',
    'get monthly revenue above $10k',
    'improve the lighthouse score to 95',
    'keep trying until the tests pass',
    'run the fixer until it passes',
  ];
  for (const p of positives) {
    it(`fires on: "${p}"`, async () => {
      const { metric } = await detectors();
      assert.equal(metric(p), true);
    });
  }
});

describe('detectMetricLoopSignal — silent on near-misses', () => {
  const negatives = [
    'improve the wording of this paragraph',
    'reduce complexity of this function',
    'bring me up to speed on the auth flow',
    'fix the failing test',
    '', null, undefined,
  ];
  for (const n of negatives) {
    it(`silent on: "${String(n)}"`, async () => {
      const { metric } = await detectors();
      assert.equal(metric(n), false);
    });
  }
});

describe('detectVaguePrompt — fires on short unspecific asks', () => {
  const positives = ['fix it', 'make the app better', 'clean this up please', 'update everything'];
  for (const p of positives) {
    it(`fires on: "${p}"`, async () => {
      const { vague } = await detectors();
      assert.equal(vague(p), true);
    });
  }
});

describe('detectVaguePrompt — silent on specific or long prompts', () => {
  const negatives = [
    'fix it in src/auth.ts',                       // path
    'improve it by 20 percent',                    // number
    'fix it — the bug is in `parseUser`',          // backtick
    'update the config.json it points at',         // file.ext
    'fix the login bug on the settings page',      // no vague object
    'fix it so that the login page renders the user avatar correctly after every refresh', // ≥12 words
    '', null, undefined,
  ];
  for (const n of negatives) {
    it(`silent on: "${String(n).slice(0, 48)}"`, async () => {
      const { vague } = await detectors();
      assert.equal(vague(n), false);
    });
  }
});

// ---------------------------------------------------------------------------
// E2E: mission-control signal
// ---------------------------------------------------------------------------

const NEUTRAL_PROMPT = 'hello there friend';

describe('mission-control signal — end to end', () => {
  it('fires when ≥2 agents started recently without matching stops', () => {
    const home = mkHome();
    writeLines(home, 'subagent-runs.jsonl', [
      { ts: iso(3 * MIN), agent_name: 'reviewer', prompt: 'x', model: 'sonnet', session_id: 's1' },
      { ts: iso(2 * MIN), agent_name: 'builder', prompt: 'y', model: 'sonnet', session_id: 's1' },
      { ts: iso(1 * MIN), agent_name: 'researcher', prompt: 'z', model: 'haiku', session_id: 's1' },
    ]);
    writeLines(home, 'agent-runs.jsonl', [
      { ts: iso(1 * MIN), agent: 'reviewer', sessionId: 's1', durationMs: 5, inputTokens: 1, outputTokens: 1, status: 'completed' },
    ]);
    const run = runTicker({ home, cwd: mkCwd(), prompt: NEUTRAL_PROMPT });
    assertContract(run);
    assert.match(run.out, /\/ccc-mission-control/, 'expected the mission-control nudge');
  });

  it('fires when ≥3 tasks are pending/in_progress in the last 30min', () => {
    const home = mkHome();
    writeLines(home, 'tasks.jsonl', [
      { ts: iso(9 * MIN), task_id: 't1', status: 'pending', title: 'a' },
      { ts: iso(8 * MIN), task_id: 't2', status: 'in_progress', title: 'b' },
      { ts: iso(7 * MIN), task_id: 't3', status: 'pending', title: 'c' },
    ]);
    const run = runTicker({ home, cwd: mkCwd(), prompt: NEUTRAL_PROMPT });
    assertContract(run);
    assert.match(run.out, /\/ccc-mission-control/);
  });

  it('near-miss: 1 agent in flight + 2 open tasks → silent', () => {
    const home = mkHome();
    writeLines(home, 'subagent-runs.jsonl', [
      { ts: iso(3 * MIN), agent_name: 'reviewer', session_id: 's1' },
      { ts: iso(2 * MIN), agent_name: 'builder', session_id: 's1' },
    ]);
    writeLines(home, 'agent-runs.jsonl', [
      { ts: iso(1 * MIN), agent: 'reviewer', sessionId: 's1', status: 'completed' },
    ]);
    writeLines(home, 'tasks.jsonl', [
      { ts: iso(5 * MIN), task_id: 't1', status: 'pending' },
      { ts: iso(4 * MIN), task_id: 't2', status: 'in_progress' },
    ]);
    const run = runTicker({ home, cwd: mkCwd(), prompt: NEUTRAL_PROMPT });
    assertContract(run);
    assert.doesNotMatch(run.out, /\/ccc-mission-control/);
  });

  it('near-miss: stale starts (45min old) and completed tasks → silent', () => {
    const home = mkHome();
    writeLines(home, 'subagent-runs.jsonl', [
      { ts: iso(45 * MIN), agent_name: 'reviewer', session_id: 's1' },
      { ts: iso(44 * MIN), agent_name: 'builder', session_id: 's1' },
      { ts: iso(43 * MIN), agent_name: 'researcher', session_id: 's1' },
    ]);
    writeLines(home, 'tasks.jsonl', [
      { ts: iso(6 * MIN), task_id: 't1', status: 'pending' },
      { ts: iso(5 * MIN), task_id: 't2', status: 'pending' },
      { ts: iso(4 * MIN), task_id: 't1', status: 'completed' }, // latest wins
    ]);
    const run = runTicker({ home, cwd: mkCwd(), prompt: NEUTRAL_PROMPT });
    assertContract(run);
    assert.doesNotMatch(run.out, /\/ccc-mission-control/);
  });

  it('dedups: fires once per session, silent on the second turn', () => {
    const home = mkHome();
    const cwd = mkCwd();
    writeLines(home, 'subagent-runs.jsonl', [
      { ts: iso(3 * MIN), agent_name: 'reviewer', session_id: 's1' },
      { ts: iso(2 * MIN), agent_name: 'builder', session_id: 's1' },
    ]);
    const first = runTicker({ home, cwd, prompt: NEUTRAL_PROMPT });
    assert.match(first.out, /\/ccc-mission-control/, 'first turn should fire');
    const second = runTicker({ home, cwd, prompt: NEUTRAL_PROMPT });
    assertContract(second);
    assert.doesNotMatch(second.out, /\/ccc-mission-control/, 'second turn must dedup');
  });
});

// ---------------------------------------------------------------------------
// E2E: metric-loop + vague-prompt signals
// ---------------------------------------------------------------------------

describe('metric-loop signal — end to end', () => {
  it('fires on a measurable goal and dedups on the next turn', () => {
    const home = mkHome();
    const cwd = mkCwd();
    const first = runTicker({ home, cwd, prompt: 'reduce page load time to 200ms' });
    assertContract(first);
    assert.match(first.out, /\/ccc-loop/, 'expected the metric-loop nudge');
    const second = runTicker({ home, cwd, prompt: 'reduce page load time to 200ms' });
    assertContract(second);
    assert.doesNotMatch(second.out, /\/ccc-loop/, 'same session must dedup');
  });

  it('near-miss: goal without a target number → silent', () => {
    const run = runTicker({ home: mkHome(), cwd: mkCwd(), prompt: 'reduce complexity of this function' });
    assertContract(run);
    assert.doesNotMatch(run.out, /\/ccc-loop/);
  });
});

describe('vague-prompt signal — end to end', () => {
  it('fires on a vague ask', () => {
    const run = runTicker({ home: mkHome(), cwd: mkCwd(), prompt: 'fix it' });
    assertContract(run);
    assert.match(run.out, /\/ccc-prompt-fix/, 'expected the prompt-fix nudge');
  });

  it('near-miss: same verb with a concrete path → silent', () => {
    const run = runTicker({ home: mkHome(), cwd: mkCwd(), prompt: 'fix it in src/auth.ts' });
    assertContract(run);
    assert.doesNotMatch(run.out, /\/ccc-prompt-fix/);
  });

  it('dedups within a session', () => {
    const home = mkHome();
    const cwd = mkCwd();
    const first = runTicker({ home, cwd, prompt: 'fix it' });
    assert.match(first.out, /\/ccc-prompt-fix/);
    const second = runTicker({ home, cwd, prompt: 'make the app better' });
    assertContract(second);
    assert.doesNotMatch(second.out, /\/ccc-prompt-fix/, 'once per session only');
  });
});

// ---------------------------------------------------------------------------
// E2E: tool-failures signal
// ---------------------------------------------------------------------------

describe('tool-failures signal — end to end', () => {
  it('fires when ≥3 failures landed in the last 10 minutes', () => {
    const home = mkHome();
    writeLines(home, 'tool-failures.jsonl', [
      { ts: iso(4 * MIN), tool_name: 'Bash', error: 'exit 1' },
      { ts: iso(3 * MIN), tool_name: 'Edit', error: 'no match' },
      { ts: iso(2 * MIN), tool_name: 'Bash', error: 'exit 127' },
      { ts: iso(1 * MIN), tool_name: 'WebFetch', error: 'timeout' },
    ]);
    const run = runTicker({ home, cwd: mkCwd(), prompt: NEUTRAL_PROMPT });
    assertContract(run);
    assert.match(run.out, /\/ccc-debug|systematic-debugging/, 'expected the debugging nudge');
  });

  it('near-miss: only 2 recent failures (older ones outside 10min) → silent', () => {
    const home = mkHome();
    writeLines(home, 'tool-failures.jsonl', [
      { ts: iso(25 * MIN), tool_name: 'Bash', error: 'old' },
      { ts: iso(20 * MIN), tool_name: 'Bash', error: 'old' },
      { ts: iso(3 * MIN), tool_name: 'Edit', error: 'recent' },
      { ts: iso(1 * MIN), tool_name: 'Bash', error: 'recent' },
    ]);
    const run = runTicker({ home, cwd: mkCwd(), prompt: NEUTRAL_PROMPT });
    assertContract(run);
    assert.doesNotMatch(run.out, /\/ccc-debug|systematic-debugging/);
  });

  it('honors the 30-min cooldown, then re-arms', () => {
    const home = mkHome();
    const cwd = mkCwd();
    writeLines(home, 'tool-failures.jsonl', [
      { ts: iso(3 * MIN), tool_name: 'Bash', error: 'x' },
      { ts: iso(2 * MIN), tool_name: 'Bash', error: 'y' },
      { ts: iso(1 * MIN), tool_name: 'Bash', error: 'z' },
    ]);
    const seenFile = path.join(cccDir(home), 'tool-failures-nudge-seen.json');
    fs.writeFileSync(seenFile, JSON.stringify({ ts: Date.now() })); // just nudged
    const cooled = runTicker({ home, cwd, prompt: NEUTRAL_PROMPT });
    assertContract(cooled);
    assert.doesNotMatch(cooled.out, /\/ccc-debug|systematic-debugging/, 'cooldown must suppress');

    fs.writeFileSync(seenFile, JSON.stringify({ ts: Date.now() - 31 * MIN })); // cooled off
    const rearmed = runTicker({ home, cwd, prompt: NEUTRAL_PROMPT });
    assertContract(rearmed);
    assert.match(rearmed.out, /\/ccc-debug|systematic-debugging/, 'should re-arm after 30min');
  });
});

// ---------------------------------------------------------------------------
// E2E: priority cap, disable switch, malformed state
// ---------------------------------------------------------------------------

describe('proactivity wave — ordering, cap, and hardening', () => {
  it('ranks below existing signals (spawn nudge wins the turn) and defers, not drops', () => {
    const home = mkHome();
    const cwd = mkCwd();
    // Prompt carries BOTH an isolation phrase (existing signal) and a
    // metric-loop phrase (new signal) → only the existing one may ship.
    const first = runTicker({ home, cwd, prompt: 'in the background, keep trying until the deploy passes' });
    assertContract(first);
    assert.match(first.out, /CCC isolation signal/, 'existing spawn nudge should win');
    assert.doesNotMatch(first.out, /\/ccc-loop/, 'wave note must not stack on the same turn');
    // Marker was NOT consumed — the deferred metric-loop signal fires next turn.
    const second = runTicker({ home, cwd, prompt: 'keep trying until the deploy passes' });
    assertContract(second);
    assert.match(second.out, /\/ccc-loop/, 'deferred wave signal should fire on a later turn');
  });

  it('CCC_SUGGEST_DISABLE=1 silences every wave signal', () => {
    const home = mkHome();
    writeLines(home, 'subagent-runs.jsonl', [
      { ts: iso(2 * MIN), agent_name: 'reviewer', session_id: 's1' },
      { ts: iso(1 * MIN), agent_name: 'builder', session_id: 's1' },
    ]);
    const run = runTicker({
      home,
      cwd: mkCwd(),
      prompt: 'fix it',
      env: { CCC_SUGGEST_DISABLE: '1' },
    });
    const parsed = assertContract(run);
    assert.doesNotMatch(run.out, /\/ccc-mission-control|\/ccc-loop|\/ccc-prompt-fix|\/ccc-debug/);
    assert.equal(parsed.suppressOutput, true);
  });

  it('malformed state files and garbage JSONL lines → no crash, valid lines still count', () => {
    const home = mkHome();
    fs.writeFileSync(path.join(cccDir(home), 'mission-control-nudge-seen.json'), 'not json{{{');
    writeLines(home, 'subagent-runs.jsonl', [
      'this is not json',
      { ts: iso(3 * MIN), agent_name: 'reviewer', session_id: 's1' },
      '{"truncated": ',
      { ts: iso(2 * MIN), agent_name: 'builder', session_id: 's1' },
      '42',
    ]);
    writeLines(home, 'tasks.jsonl', ['garbage', '[]', 'null']);
    const run = runTicker({ home, cwd: mkCwd(), prompt: NEUTRAL_PROMPT });
    assertContract(run);
    assert.match(run.out, /\/ccc-mission-control/, 'valid lines must still be counted');
    // The malformed seen-file must be healed into valid JSON by record().
    const healed = JSON.parse(
      fs.readFileSync(path.join(cccDir(home), 'mission-control-nudge-seen.json'), 'utf8')
    );
    assert.equal(healed.sessionKey, 'wave-test-session');
  });
});

// ---------------------------------------------------------------------------
// E2E: dismissed[] port in suggest-lightweight.js
// ---------------------------------------------------------------------------

const HIGH_CONFIDENCE_STATE = {
  timestamp: new Date().toISOString(),
  branch: 'feature/wave',
  aheadMain: 3,
  behindMain: 0,
  testsStatus: 'green',
  openTodos: 0,
  securityAlerts: 0,
  lintErrors: 0,
  ciStatus: 'passing',
  blockers: [],
  hasClaudeMd: true,
};

function writeState(home, state) {
  fs.writeFileSync(path.join(cccDir(home), 'project-state.json'), JSON.stringify(state, null, 2));
}

function dismissedFile(home) {
  return path.join(home, '.claude', 'commander', 'suggest-dismissed.json');
}

function runLightweight(home, env = {}) {
  const fullEnv = {
    ...process.env,
    HOME: home,
    USERPROFILE: home,
    CCC_SUGGEST_MODE: 'always',
    CCC_SUGGEST_DISABLE: undefined,
    CCC_SUGGEST_MIN_CONFIDENCE: undefined,
    ...env,
  };
  for (const k of Object.keys(fullEnv)) {
    if (fullEnv[k] === undefined) delete fullEnv[k];
  }
  const res = spawnSync(process.execPath, [LIGHTWEIGHT], {
    env: fullEnv,
    encoding: 'utf8',
    timeout: 8000,
  });
  return { parsed: JSON.parse((res.stdout || '').trim()), status: res.status };
}

describe('suggest-lightweight dismissed[] port — end to end', () => {
  it('renders and records the show count on first render', () => {
    const home = mkHome();
    writeState(home, HIGH_CONFIDENCE_STATE);
    const run = runLightweight(home);
    assert.equal(run.status, 0);
    assert.equal(run.parsed.suppressOutput, false);
    assert.match(run.parsed.systemMessage, /\/ccc-ship/);
    const dismissed = JSON.parse(fs.readFileSync(dismissedFile(home), 'utf8'));
    assert.equal(dismissed['/ccc-ship'].shows, 1);
  });

  it('stops repeating a suggestion after it was ignored twice', () => {
    const home = mkHome();
    const now = Date.now();
    writeState(home, HIGH_CONFIDENCE_STATE);
    // First render → shows: 1
    const r1 = runLightweight(home);
    assert.equal(r1.parsed.suppressOutput, false, 'first render should show');
    // Bust the mtime-based idempotency hash, then render again → shows: 2
    writeState(home, { ...HIGH_CONFIDENCE_STATE, timestamp: new Date().toISOString() });
    fs.utimesSync(path.join(cccDir(home), 'project-state.json'), new Date(now + 1000), new Date(now + 1000));
    const r2 = runLightweight(home);
    assert.equal(r2.parsed.suppressOutput, false, 'second render should still show');
    const afterTwo = JSON.parse(fs.readFileSync(dismissedFile(home), 'utf8'));
    assert.equal(afterTwo['/ccc-ship'].shows, 2, 'two renders recorded');
    // Third turn: ignored twice → the suggestion must NOT repeat
    fs.utimesSync(path.join(cccDir(home), 'project-state.json'), new Date(now + 2000), new Date(now + 2000));
    const r3 = runLightweight(home);
    assert.equal(r3.status, 0);
    assert.equal(r3.parsed.suppressOutput, true, 'ignored-twice suggestion must stop repeating');
  });

  it('pre-seeded shows:2 suppresses immediately', () => {
    const home = mkHome();
    writeState(home, HIGH_CONFIDENCE_STATE);
    fs.writeFileSync(
      dismissedFile(home),
      JSON.stringify({ '/ccc-ship': { shows: 2, ts: Date.now() } })
    );
    const run = runLightweight(home);
    assert.equal(run.status, 0);
    assert.equal(run.parsed.suppressOutput, true, 'dismissed suggestion must not render');
  });

  it('decayed entries (older than 7 days) render again', () => {
    const home = mkHome();
    writeState(home, HIGH_CONFIDENCE_STATE);
    fs.writeFileSync(
      dismissedFile(home),
      JSON.stringify({ '/ccc-ship': { shows: 5, ts: Date.now() - 8 * 24 * 60 * 60 * 1000 } })
    );
    const run = runLightweight(home);
    assert.equal(run.parsed.suppressOutput, false, 'decayed dismissal must not suppress');
    assert.match(run.parsed.systemMessage, /\/ccc-ship/);
  });

  it('malformed suggest-dismissed.json → fail-open, still renders, file healed', () => {
    const home = mkHome();
    writeState(home, HIGH_CONFIDENCE_STATE);
    fs.writeFileSync(dismissedFile(home), '¯\\_(ツ)_/¯ not json');
    const run = runLightweight(home);
    assert.equal(run.status, 0, 'must not crash on malformed state');
    assert.equal(run.parsed.suppressOutput, false, 'must render despite malformed state');
    const healed = JSON.parse(fs.readFileSync(dismissedFile(home), 'utf8'));
    assert.equal(healed['/ccc-ship'].shows, 1, 'state file healed with the new count');
  });

  it('corrupt recommendation field fails open with valid silent JSON', () => {
    const home = mkHome();
    writeState(home, { lastRecommendation: { skill: 42 } });
    const run = runLightweight(home);
    assert.equal(run.status, 0, 'corrupt state must not block the Stop hook chain');
    assert.deepEqual(run.parsed, { continue: true, suppressOutput: true });
  });
});
