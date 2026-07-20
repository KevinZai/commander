'use strict';

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
  'agent-run-logger.js'
);

const AGENTS_DIR = path.join(
  __dirname,
  '..',
  'cowork-plugin',
  'agents'
);

const TMP_HOME = path.join(os.tmpdir(), 'ccc-agent-logger-test-' + process.pid);
const LOG_FILE = path.join(TMP_HOME, '.claude', 'commander', 'agent-runs.jsonl');

function runHook(envOverrides = {}, stdinPayload = {}) {
  const env = {
    ...process.env,
    HOME: TMP_HOME,
    USERPROFILE: TMP_HOME,
    ...envOverrides,
  };

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

  return {
    exitCode: result.status ?? 0,
    stdout: result.stdout || '',
    stderr: result.stderr || '',
    parsed,
  };
}

function readLogLines() {
  if (!fs.existsSync(LOG_FILE)) return [];
  return fs
    .readFileSync(LOG_FILE, 'utf8')
    .split('\n')
    .filter(l => l.trim())
    .map(l => JSON.parse(l));
}

before(() => {
  fs.mkdirSync(path.join(TMP_HOME, '.claude', 'commander'), { recursive: true });
});

after(() => {
  fs.rmSync(TMP_HOME, { recursive: true, force: true });
});

beforeEach(() => {
  if (fs.existsSync(LOG_FILE)) {
    fs.unlinkSync(LOG_FILE);
  }
});

describe('agent-run-logger.js — rotation', () => {
  it('does not overwrite an existing archive when rotating twice in one day', () => {
    const dir = path.dirname(LOG_FILE);
    const archivesBefore = fs
      .readdirSync(dir)
      .filter((f) => f.startsWith('agent-runs.') && f !== 'agent-runs.jsonl');
    for (const f of archivesBefore) fs.unlinkSync(path.join(dir, f));

    // Two rotations in the same calendar day: a date-only archive name makes the
    // second rename clobber the first, losing the whole first archive.
    const oversized = 'x'.repeat(10 * 1024 * 1024 + 1);
    for (const marker of ['first-archive', 'second-archive']) {
      fs.writeFileSync(LOG_FILE, JSON.stringify({ marker }) + '\n' + oversized);
      runHook({ CLAUDE_AGENT_NAME: 'architect', CLAUDE_SESSION_ID: 'rot' });
    }

    const archives = fs
      .readdirSync(dir)
      .filter((f) => f.startsWith('agent-runs.') && f !== 'agent-runs.jsonl');
    assert.equal(archives.length, 2, 'both same-day archives should survive');

    const markers = archives
      .map((f) => fs.readFileSync(path.join(dir, f), 'utf8').split('\n')[0])
      .map((line) => JSON.parse(line).marker)
      .sort();
    assert.deepEqual(markers, ['first-archive', 'second-archive']);

    for (const f of archives) fs.unlinkSync(path.join(dir, f));
  });
});

describe('agent-run-logger.js — basic logging', () => {
  it('exits 0 and returns continue:true suppressOutput:true', () => {
    const r = runHook({ CLAUDE_AGENT_NAME: 'architect', CLAUDE_SESSION_ID: 'test-123' });
    assert.equal(r.exitCode, 0);
    assert.ok(r.parsed);
    assert.equal(r.parsed.continue, true);
    assert.equal(r.parsed.suppressOutput, true);
  });

  it('writes a JSONL line to agent-runs.jsonl', () => {
    runHook({
      CLAUDE_AGENT_NAME: 'builder',
      CLAUDE_SESSION_ID: 'sess-abc',
      CLAUDE_INPUT_TOKENS: '5000',
      CLAUDE_OUTPUT_TOKENS: '1200',
      CLAUDE_DURATION_MS: '8500',
      CLAUDE_STOP_REASON: 'end_turn',
    });

    const lines = readLogLines();
    assert.equal(lines.length, 1, 'should write exactly one JSONL line');
    const entry = lines[0];
    assert.equal(entry.agent, 'builder');
    assert.equal(entry.sessionId, 'sess-abc');
    assert.equal(entry.inputTokens, 5000);
    assert.equal(entry.outputTokens, 1200);
    assert.equal(entry.durationMs, 8500);
    assert.equal(entry.status, 'end_turn');
    assert.ok(entry.ts, 'should have timestamp');
  });

  it('uses fallback env vars (CLAUDE_TOKENS_INPUT etc.)', () => {
    runHook({
      CLAUDE_SUBAGENT_NAME: 'debugger',
      CLAUDE_SESSION_ID: 'sess-xyz',
      CLAUDE_TOKENS_INPUT: '3000',
      CLAUDE_TOKENS_OUTPUT: '900',
      CLAUDE_ELAPSED_MS: '5000',
      CLAUDE_SUBAGENT_STATUS: 'max_turns',
    });

    const lines = readLogLines();
    assert.equal(lines.length, 1);
    const entry = lines[0];
    assert.equal(entry.agent, 'debugger');
    assert.equal(entry.inputTokens, 3000);
    assert.equal(entry.outputTokens, 900);
    assert.equal(entry.durationMs, 5000);
    assert.equal(entry.status, 'max_turns');
  });

  it('records honest null tokens (not a fabricated 0) when no data is anywhere', () => {
    runHook({});
    const lines = readLogLines();
    assert.equal(lines.length, 1);
    const entry = lines[0];
    assert.equal(entry.agent, 'unknown');
    assert.equal(entry.sessionId, 'unknown');
    // Honesty contract: no payload / transcript / env token data → null, so the
    // UI shows "— · telemetry unavailable" instead of a measured-looking zero.
    assert.equal(entry.inputTokens, null);
    assert.equal(entry.outputTokens, null);
    assert.equal(entry.durationMs, null);
    assert.equal(entry.tokensAvailable, false);
    assert.equal(entry.status, 'completed');
  });

  it('recovers real tokens from transcript_path when the payload omits them', () => {
    const tPath = path.join(TMP_HOME, 'agent-transcript.jsonl');
    fs.mkdirSync(path.dirname(tPath), { recursive: true });
    const lines = [
      {
        type: 'assistant',
        timestamp: '2026-07-20T00:00:00.000Z',
        message: { usage: { input_tokens: 40, cache_creation_input_tokens: 60, output_tokens: 30 } },
      },
      {
        type: 'assistant',
        timestamp: '2026-07-20T00:00:02.000Z',
        message: { usage: { input_tokens: 10, cache_read_input_tokens: 5000, output_tokens: 70 } },
      },
    ]
      .map((o) => JSON.stringify(o))
      .join('\n');
    fs.writeFileSync(tPath, lines);

    runHook({}, { agent_type: 'commander:reviewer', transcript_path: tPath });
    const entry = readLogLines().at(-1);
    assert.equal(entry.agent, 'commander:reviewer');
    assert.equal(entry.inputTokens, 110); // (40+60) + (10+0)
    assert.equal(entry.outputTokens, 100); // 30 + 70
    assert.equal(entry.durationMs, 2000);
    assert.equal(entry.tokensAvailable, true);
  });

  it('appends multiple runs to the same file', () => {
    runHook({ CLAUDE_AGENT_NAME: 'reviewer' });
    runHook({ CLAUDE_AGENT_NAME: 'qa-engineer' });
    runHook({ CLAUDE_AGENT_NAME: 'designer' });

    const lines = readLogLines();
    assert.equal(lines.length, 3);
    assert.equal(lines[0].agent, 'reviewer');
    assert.equal(lines[1].agent, 'qa-engineer');
    assert.equal(lines[2].agent, 'designer');
  });

  it('always returns continue:true even when log write fails', () => {
    // Force failure with bad HOME
    const r = runHook({
      HOME: '/dev/null/no-such-path',
      USERPROFILE: '/dev/null/no-such-path',
    });
    assert.equal(r.exitCode, 0);
    assert.ok(r.parsed);
    assert.equal(r.parsed.continue, true);
  });
});

describe('agent-run-logger.js — log rotation', () => {
  it('renames existing file if over 10MB and starts fresh', () => {
    const cccDir = path.join(TMP_HOME, '.claude', 'commander');

    // Create a fake log file that's "over 10MB"
    const bigContent = 'x'.repeat(10 * 1024 * 1024 + 1);
    fs.writeFileSync(LOG_FILE, bigContent);

    runHook({ CLAUDE_AGENT_NAME: 'architect' });

    // The original should be renamed
    const files = fs.readdirSync(cccDir);
    const rotated = files.filter(f => f.startsWith('agent-runs.') && f.endsWith('.jsonl') && f !== 'agent-runs.jsonl');
    assert.ok(rotated.length > 0, 'should have created a rotated file');

    // The fresh file should have only the new entry
    const lines = readLogLines();
    assert.equal(lines.length, 1, 'fresh log should have only the new entry');
    assert.equal(lines[0].agent, 'architect');
  });
});

describe('agent-run-logger.js — stdin is the primary source (Iron Law fix, CC-1378)', () => {
  it('reads agent name, session id, status, duration, and tokens from top-level stdin fields', () => {
    runHook({}, {
      agent_name: 'reviewer',
      session_id: 'sess-stdin-1',
      status: 'end_turn',
      duration_ms: 4200,
      input_tokens: 900,
      output_tokens: 210,
    });

    const lines = readLogLines();
    assert.equal(lines.length, 1);
    const entry = lines[0];
    assert.equal(entry.agent, 'reviewer');
    assert.equal(entry.sessionId, 'sess-stdin-1');
    assert.equal(entry.status, 'end_turn');
    assert.equal(entry.durationMs, 4200);
    assert.equal(entry.inputTokens, 900);
    assert.equal(entry.outputTokens, 210);
  });

  it('probes nested subagent/agent/usage field paths defensively', () => {
    runHook({}, {
      subagent_type: 'builder',
      session_id: 'sess-stdin-2',
      subagent: { status: 'completed' },
      usage: { input_tokens: 500, output_tokens: 75 },
      duration_ms: 6000,
    });

    const lines = readLogLines();
    assert.equal(lines.length, 1);
    const entry = lines[0];
    assert.equal(entry.agent, 'builder');
    assert.equal(entry.sessionId, 'sess-stdin-2');
    assert.equal(entry.status, 'completed');
    assert.equal(entry.inputTokens, 500);
    assert.equal(entry.outputTokens, 75);
    assert.equal(entry.durationMs, 6000);
  });

  it('stdin values win over env vars when both are present', () => {
    runHook(
      { CLAUDE_AGENT_NAME: 'env-agent', CLAUDE_SESSION_ID: 'env-sess' },
      { agent_name: 'stdin-agent', session_id: 'stdin-sess' }
    );

    const lines = readLogLines();
    const entry = lines[0];
    assert.equal(entry.agent, 'stdin-agent');
    assert.equal(entry.sessionId, 'stdin-sess');
  });

  it('falls back to env vars when stdin has no matching fields, then to defaults', () => {
    runHook({ CLAUDE_SUBAGENT_NAME: 'debugger' }, { unrelated: true });

    const lines = readLogLines();
    const entry = lines[0];
    assert.equal(entry.agent, 'debugger');
    assert.equal(entry.sessionId, 'unknown');
    assert.equal(entry.status, 'completed');
  });

  it('fails open (0 tokens, unknown agent) when stdin exceeds the 256KB cap', () => {
    const hugePrompt = 'x'.repeat(300 * 1024);
    runHook({}, { agent_name: 'oversized', prompt: hugePrompt });

    const lines = readLogLines();
    assert.equal(lines.length, 1);
    assert.equal(lines[0].agent, 'unknown');
  });
});

describe('agent-run-logger.js — agent coverage', () => {
  it('all 17 agent files have a hooks: field in frontmatter', () => {
    const agentFiles = fs
      .readdirSync(AGENTS_DIR)
      .filter(f => f.endsWith('.md') && !f.endsWith('.backup-20260424'));

    assert.ok(agentFiles.length >= 15, `Expected at least 15 agents, got ${agentFiles.length}`);

    const missing = [];
    for (const file of agentFiles) {
      const content = fs.readFileSync(path.join(AGENTS_DIR, file), 'utf8');
      const fmEnd = content.indexOf('---', 3);
      const fm = fmEnd > 3 ? content.slice(3, fmEnd) : '';
      if (!fm.includes('hooks:')) {
        missing.push(file);
      }
    }

    assert.deepEqual(
      missing,
      [],
      `The following agents are missing hooks: field: ${missing.join(', ')}`
    );
  });

  it('all agent files with hooks: include SubagentStop', () => {
    const agentFiles = fs
      .readdirSync(AGENTS_DIR)
      .filter(f => f.endsWith('.md') && !f.endsWith('.backup-20260424'));

    const missingSubagentStop = [];
    for (const file of agentFiles) {
      const content = fs.readFileSync(path.join(AGENTS_DIR, file), 'utf8');
      const fmEnd = content.indexOf('---', 3);
      const fm = fmEnd > 3 ? content.slice(3, fmEnd) : '';
      if (fm.includes('hooks:') && !fm.includes('SubagentStop:')) {
        missingSubagentStop.push(file);
      }
    }

    assert.deepEqual(
      missingSubagentStop,
      [],
      `These agents have hooks: but no SubagentStop: ${missingSubagentStop.join(', ')}`
    );
  });

  it('hooks.json SubagentStop section includes agent-run-logger.js', () => {
    const hooksJsonPath = path.join(
      __dirname,
      '..',
      'cowork-plugin',
      'hooks',
      'hooks.json'
    );
    const hooksJson = JSON.parse(fs.readFileSync(hooksJsonPath, 'utf8'));
    const subagentHooks = hooksJson.hooks.SubagentStop || [];
    const allCommands = subagentHooks.flatMap(h => (h.hooks || []).map(hh => hh.command || ''));
    const hasLogger = allCommands.some(c => c.includes('agent-run-logger.js'));
    assert.ok(hasLogger, 'hooks.json SubagentStop should include agent-run-logger.js');
  });
});
