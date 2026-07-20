'use strict';

// Pins subagent-stop.js (CC-1378): the SubagentStop cost writer must read the
// hook STDIN payload as its primary source. It previously read only CLAUDE_*
// env vars, which are not populated in practice — that is why historical
// analytics/subagent-costs.jsonl rows are almost entirely unknown/0.

const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');

const HOOK_PATH = path.join(
  __dirname,
  '..',
  'cowork-plugin',
  'hooks',
  'subagent-stop.js'
);

const TMP_HOME = path.join(os.tmpdir(), 'ccc-subagent-stop-test-' + process.pid);
const COST_FILE = path.join(
  TMP_HOME,
  '.claude',
  'commander',
  'analytics',
  'subagent-costs.jsonl'
);

function runHook(stdinPayload = {}, envOverrides = {}) {
  const env = { ...process.env, HOME: TMP_HOME, USERPROFILE: TMP_HOME };
  delete env.CLAUDE_SESSION_ID;
  delete env.CLAUDE_AGENT_NAME;
  delete env.CLAUDE_INPUT_TOKENS;
  delete env.CLAUDE_OUTPUT_TOKENS;
  Object.assign(env, envOverrides);

  const result = spawnSync('node', [HOOK_PATH], {
    input:
      typeof stdinPayload === 'string' ? stdinPayload : JSON.stringify(stdinPayload),
    encoding: 'utf-8',
    timeout: 6000,
    env,
  });

  let parsed = null;
  try {
    parsed = JSON.parse((result.stdout || '').trim());
  } catch {
    // non-JSON
  }

  const rows = fs.existsSync(COST_FILE)
    ? fs
        .readFileSync(COST_FILE, 'utf8')
        .split('\n')
        .filter((l) => l.trim())
        .map((l) => JSON.parse(l))
    : [];

  return { exitCode: result.status ?? 0, parsed, rows };
}

before(() => {
  fs.mkdirSync(path.dirname(COST_FILE), { recursive: true });
});

after(() => {
  fs.rmSync(TMP_HOME, { recursive: true, force: true });
});

beforeEach(() => {
  if (fs.existsSync(COST_FILE)) fs.unlinkSync(COST_FILE);
});

describe('subagent-stop.js — stdin-primary cost capture', () => {
  it('records real values from the stdin payload', () => {
    const r = runHook({
      session_id: 'sess-abc',
      agent_name: 'reviewer',
      input_tokens: 1234,
      output_tokens: 567,
    });

    assert.equal(r.exitCode, 0);
    assert.equal(r.parsed.continue, true);
    assert.equal(r.rows.length, 1);
    assert.equal(r.rows[0].sessionId, 'sess-abc');
    assert.equal(r.rows[0].agentName, 'reviewer');
    assert.equal(r.rows[0].inputTokens, 1234);
    assert.equal(r.rows[0].outputTokens, 567);
  });

  it('reads tokens from a nested usage object', () => {
    const r = runHook({
      session_id: 's2',
      subagent_type: 'builder',
      usage: { input_tokens: 10, output_tokens: 20 },
    });

    assert.equal(r.rows[0].agentName, 'builder');
    assert.equal(r.rows[0].inputTokens, 10);
    assert.equal(r.rows[0].outputTokens, 20);
  });

  it('still honours env vars when stdin carries nothing', () => {
    const r = runHook(
      {},
      {
        CLAUDE_SESSION_ID: 'env-sess',
        CLAUDE_AGENT_NAME: 'architect',
        CLAUDE_INPUT_TOKENS: '7',
        CLAUDE_OUTPUT_TOKENS: '8',
      }
    );

    assert.equal(r.rows[0].sessionId, 'env-sess');
    assert.equal(r.rows[0].agentName, 'architect');
    assert.equal(r.rows[0].inputTokens, 7);
    assert.equal(r.rows[0].outputTokens, 8);
  });

  it('records unknown + honest null tokens (not a fabricated 0) on malformed stdin', () => {
    const r = runHook('not json at all');

    assert.equal(r.exitCode, 0);
    assert.equal(r.parsed.continue, true);
    assert.equal(r.rows[0].sessionId, 'unknown');
    assert.equal(r.rows[0].agentName, 'unknown');
    // Honesty contract: no token data anywhere → null + tokensAvailable:false,
    // never a fabricated 0 that a UI would render as a measured zero.
    assert.equal(r.rows[0].inputTokens, null);
    assert.equal(r.rows[0].outputTokens, null);
    assert.equal(r.rows[0].tokensAvailable, false);
  });

  it('resolves agentName from agent_type (the field SubagentStop delivers)', () => {
    const r = runHook({ session_id: 's', agent_type: 'commander:reviewer' });
    assert.equal(r.rows[0].agentName, 'commander:reviewer');
  });

  it('recovers real tokens + duration from transcript_path when payload omits them', () => {
    // A tiny JSONL transcript with two assistant turns carrying usage.
    const tPath = path.join(TMP_HOME, 'transcript.jsonl');
    const lines = [
      { type: 'user', timestamp: '2026-07-20T00:00:00.000Z', message: { role: 'user' } },
      {
        type: 'assistant',
        timestamp: '2026-07-20T00:00:01.000Z',
        message: {
          role: 'assistant',
          usage: { input_tokens: 100, cache_creation_input_tokens: 900, output_tokens: 50 },
        },
      },
      {
        type: 'assistant',
        timestamp: '2026-07-20T00:00:05.000Z',
        message: {
          role: 'assistant',
          usage: { input_tokens: 5, cache_read_input_tokens: 1000, output_tokens: 200 },
        },
      },
    ]
      .map((o) => JSON.stringify(o))
      .join('\n');
    fs.writeFileSync(tPath, lines);

    const r = runHook({ session_id: 's', agent_type: 'x', transcript_path: tPath });
    // input = (100+900) + (5+0)  [cache_read excluded from the token count] = 1005
    // output = 50 + 200 = 250 ; cacheRead = 0 + 1000 = 1000 ; duration = 5000ms
    assert.equal(r.rows[0].inputTokens, 1005);
    assert.equal(r.rows[0].outputTokens, 250);
    assert.equal(r.rows[0].cacheReadTokens, 1000);
    assert.equal(r.rows[0].durationMs, 5000);
    assert.equal(r.rows[0].tokensAvailable, true);
  });

  it('dedupes streaming rows by message.id — keeps last usage, never sums duplicates', () => {
    // Two rows for the SAME message.id (streaming partial → final) plus one
    // distinct message. Summing every row would 2x the first message.
    const tPath = path.join(TMP_HOME, 'stream.jsonl');
    const lines = [
      { type: 'assistant', timestamp: '2026-07-20T00:00:00.000Z', message: { id: 'm1', usage: { input_tokens: 1000, output_tokens: 1 } } },
      { type: 'assistant', timestamp: '2026-07-20T00:00:01.000Z', message: { id: 'm1', usage: { input_tokens: 1000, output_tokens: 50 } } },
      { type: 'assistant', timestamp: '2026-07-20T00:00:02.000Z', message: { id: 'm2', usage: { input_tokens: 20, output_tokens: 7 } } },
    ].map((o) => JSON.stringify(o)).join('\n');
    fs.writeFileSync(tPath, lines);

    const r = runHook({ session_id: 's', agent_type: 'x', transcript_path: tPath });
    // m1 last row (1000/50) + m2 (20/7) — NOT 2000/51+20/7.
    assert.equal(r.rows[0].inputTokens, 1020);
    assert.equal(r.rows[0].outputTokens, 57);
  });

  it('prefers agent_transcript_path (the subagent) over transcript_path (the parent session)', () => {
    // The parent transcript is huge; the subagent's own is small. Reading the
    // parent would over-count the whole session for one subagent.
    const parent = path.join(TMP_HOME, 'parent.jsonl');
    const child = path.join(TMP_HOME, 'child.jsonl');
    fs.writeFileSync(parent, JSON.stringify({ type: 'assistant', message: { id: 'p1', usage: { input_tokens: 999999, output_tokens: 88888 } } }));
    fs.writeFileSync(child, JSON.stringify({ type: 'assistant', message: { id: 'c1', usage: { input_tokens: 42, output_tokens: 7 } } }));

    const r = runHook({ session_id: 's', agent_type: 'x', transcript_path: parent, agent_transcript_path: child });
    assert.equal(r.rows[0].inputTokens, 42);
    assert.equal(r.rows[0].outputTokens, 7);
  });
});
