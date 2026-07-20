'use strict';

// Pins the Mission Control feed (v6.8.0): mission-control-feed.js captures
// delegation/message/workflow/task events to
// ~/.claude/commander/mission-control/events.jsonl — with a zero-I/O fast
// path for every other tool, ≤120/≤200-char truncation (privacy: no full
// prompts on disk), 10MB rotation, and fail-open stdout contract. Also pins
// the task-tracker.js enrichment (subject + session_id, old fields intact)
// and, per CC-1378, subagent-start-tracker.js's stdin-primary field probing
// + prompt redaction/cap + the 256KB STDIN_MAX bound shared with the feed
// hook and task-tracker.js.

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');

const FEED_HOOK = path.join(
  __dirname,
  '..',
  'cowork-plugin',
  'hooks',
  'mission-control-feed.js'
);
const TRACKER_HOOK = path.join(
  __dirname,
  '..',
  'cowork-plugin',
  'hooks',
  'task-tracker.js'
);
const SUBAGENT_START_HOOK = path.join(
  __dirname,
  '..',
  'cowork-plugin',
  'hooks',
  'subagent-start-tracker.js'
);
const HOOKS_JSON = path.join(
  __dirname,
  '..',
  'cowork-plugin',
  'hooks',
  'hooks.json'
);

function spawnHook(hookPath, payloadRaw, home, extraEnv = {}) {
  const env = { ...process.env, HOME: home, USERPROFILE: home };
  delete env.CLAUDE_SESSION_ID;
  Object.assign(env, extraEnv);
  return spawnSync(process.execPath, [hookPath], {
    input:
      typeof payloadRaw === 'string' ? payloadRaw : JSON.stringify(payloadRaw),
    env,
    encoding: 'utf8',
    timeout: 10000,
  });
}

function runFeed(payloadRaw, { env = {}, prepare } = {}) {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'ccc-mcf-test-'));
  const mcDir = path.join(home, '.claude', 'commander', 'mission-control');
  const eventsFile = path.join(mcDir, 'events.jsonl');
  try {
    if (prepare) prepare({ home, mcDir, eventsFile });
    const res = spawnHook(FEED_HOOK, payloadRaw, home, env);
    let parsed = null;
    try {
      parsed = JSON.parse((res.stdout || '').trim().split('\n')[0]);
    } catch {}
    const fileExists = fs.existsSync(eventsFile);
    return {
      exitCode: res.status ?? 0,
      stdout: res.stdout || '',
      stderr: res.stderr || '',
      parsed,
      claudeDirExists: fs.existsSync(path.join(home, '.claude')),
      dirExists: fs.existsSync(mcDir),
      fileExists,
      dirListing: fs.existsSync(mcDir) ? fs.readdirSync(mcDir) : [],
      events: fileExists
        ? fs
            .readFileSync(eventsFile, 'utf8')
            .split('\n')
            .filter(Boolean)
            .map((l) => JSON.parse(l))
        : [],
    };
  } finally {
    try {
      fs.rmSync(home, { recursive: true, force: true });
    } catch {}
  }
}

function runTracker(payloadRaw, extraEnv = {}) {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'ccc-mcf-tracker-test-'));
  const logFile = path.join(home, '.claude', 'commander', 'tasks.jsonl');
  try {
    const res = spawnHook(TRACKER_HOOK, payloadRaw, home, extraEnv);
    let parsed = null;
    try {
      parsed = JSON.parse((res.stdout || '').trim().split('\n')[0]);
    } catch {}
    return {
      exitCode: res.status ?? 0,
      parsed,
      entries: fs.existsSync(logFile)
        ? fs
            .readFileSync(logFile, 'utf8')
            .split('\n')
            .filter(Boolean)
            .map((l) => JSON.parse(l))
        : [],
    };
  } finally {
    try {
      fs.rmSync(home, { recursive: true, force: true });
    } catch {}
  }
}

function runSubagentStart(payloadRaw, extraEnv = {}) {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'ccc-mcf-substart-test-'));
  const logFile = path.join(home, '.claude', 'commander', 'subagent-runs.jsonl');
  try {
    const res = spawnHook(SUBAGENT_START_HOOK, payloadRaw, home, extraEnv);
    let parsed = null;
    try {
      parsed = JSON.parse((res.stdout || '').trim().split('\n')[0]);
    } catch {}
    return {
      exitCode: res.status ?? 0,
      parsed,
      entries: fs.existsSync(logFile)
        ? fs
            .readFileSync(logFile, 'utf8')
            .split('\n')
            .filter(Boolean)
            .map((l) => JSON.parse(l))
        : [],
    };
  } finally {
    try {
      fs.rmSync(home, { recursive: true, force: true });
    } catch {}
  }
}

describe('mission-control-feed — fast path (non-matching tools)', () => {
  it('continues silently on a non-matching tool with ZERO fs writes', () => {
    const r = runFeed({
      session_id: 'sess-1',
      tool_name: 'Read',
      tool_input: { file_path: '/tmp/x.txt' },
    });
    assert.equal(r.exitCode, 0);
    assert.ok(r.parsed, 'must print a JSON response');
    assert.equal(r.parsed.continue, true);
    assert.equal(r.parsed.suppressOutput, true);
    assert.equal(r.fileExists, false, 'no events file on skip');
    assert.equal(r.dirExists, false, 'no mission-control dir on skip');
    assert.equal(r.claudeDirExists, false, 'zero fs touches on skip');
  });

  it('continues silently when tool_name is missing or non-string', () => {
    for (const payload of [{}, { tool_name: 42 }, { tool_input: {} }]) {
      const r = runFeed(payload);
      assert.equal(r.exitCode, 0);
      assert.equal(r.parsed.continue, true);
      assert.equal(r.fileExists, false);
    }
  });

  it('trusts PostToolUse hook_event_name over a bare message shape', () => {
    const r = runFeed({
      hook_event_name: 'PostToolUse',
      tool_name: 'Read',
      message: 'hi',
    });
    assert.equal(r.exitCode, 0);
    assert.equal(r.parsed.continue, true);
    assert.equal(r.fileExists, false, 'must not misclassify the payload as a permission event');
    assert.equal(r.claudeDirExists, false, 'hot-path filter must perform zero fs writes');
  });
});

describe('mission-control-feed — event capture', () => {
  it('captures an Agent delegation with correct fields', () => {
    const r = runFeed({
      session_id: 'sess-42',
      tool_name: 'Agent',
      tool_input: {
        subagent_type: 'reviewer',
        description: 'Review the auth module',
        prompt: 'Please review src/auth for issues',
        model: 'sonnet',
      },
    });
    assert.equal(r.exitCode, 0);
    assert.equal(r.parsed.continue, true);
    assert.equal(r.events.length, 1, 'exactly one JSONL event');
    const ev = r.events[0];
    assert.equal(ev.type, 'delegation');
    assert.equal(ev.tool, 'Agent');
    assert.equal(ev.actor, 'reviewer');
    assert.equal(ev.subject, 'Review the auth module');
    assert.equal(ev.detail, 'Please review src/auth for issues');
    assert.equal(ev.session_id, 'sess-42');
    assert.equal(ev.source_app, 'claude-code');
    assert.equal(ev.status, null);
    assert.ok(!Number.isNaN(Date.parse(ev.ts)), 'ts is a parseable timestamp');
  });

  it('captures PermissionRequest as awaiting without applying the tool filter', () => {
    const message = 'Allow access to the deployment credentials? ' + 'x'.repeat(120);
    const r = runFeed({
      hook_event_name: 'PermissionRequest',
      session_id: 'sess-permission',
      tool_name: 'Read',
      message,
    });
    assert.equal(r.exitCode, 0);
    assert.equal(r.parsed.continue, true);
    assert.equal(r.events.length, 1);
    const ev = r.events[0];
    assert.equal(ev.type, 'permission');
    assert.equal(ev.status, 'awaiting');
    assert.equal(ev.tool, 'Read');
    assert.equal(ev.actor, null);
    assert.equal(ev.subject, message.slice(0, 120));
    assert.equal(ev.session_id, 'sess-permission');
    assert.equal(ev.source_app, 'claude-code');
  });

  it('stamps source_app codex when Codex Desktop spawns the hook', () => {
    const codexEnv = { CODEX_PLUGIN_ROOT: '/tmp/codex-plugin-root' };
    const tool = runFeed(
      { tool_name: 'Agent', tool_input: { subagent_type: 'builder' } },
      { env: codexEnv }
    );
    assert.equal(tool.events.length, 1);
    assert.equal(tool.events[0].source_app, 'codex');

    const permission = runFeed(
      {
        permission_request: {
          tool_name: 'Bash',
          description: 'Run the release command',
        },
      },
      { env: codexEnv }
    );
    assert.equal(permission.events[0].source_app, 'codex');

    // Without the Codex signal the same file must still identify as claude-code.
    const claude = runFeed({ tool_name: 'Agent', tool_input: {} });
    assert.equal(claude.events[0].source_app, 'claude-code');
  });

  it('captures permission-shaped payloads and tags all event types with source_app', () => {
    const payloads = [
      { tool_name: 'Agent', tool_input: {} },
      { tool_name: 'SendMessage', tool_input: {} },
      { tool_name: 'Workflow', tool_input: {} },
      { tool_name: 'TaskCreate', tool_input: {} },
      { tool_name: 'TaskUpdate', tool_input: {} },
      {
        permission_request: { tool_name: 'Bash', description: 'Run the release command' },
      },
    ];
    for (const payload of payloads) {
      const r = runFeed(payload);
      assert.equal(r.events.length, 1);
      assert.equal(r.events[0].source_app, 'claude-code');
    }
    const permission = runFeed({
      permission_request: 'Approve this command',
      tool: 'Bash',
    }).events[0];
    assert.equal(permission.type, 'permission');
    assert.equal(permission.tool, 'Bash');
    assert.equal(permission.subject, 'Approve this command');
    assert.equal(permission.status, 'awaiting');
  });

  it('captures a SendMessage as type=message with recipient actor', () => {
    const r = runFeed({
      tool_name: 'SendMessage',
      tool_input: { recipient: 'researcher', message: 'Findings ready in the shared doc' },
    });
    const ev = r.events[0];
    assert.equal(ev.type, 'message');
    assert.equal(ev.tool, 'SendMessage');
    assert.equal(ev.actor, 'researcher');
    assert.equal(ev.detail, 'Findings ready in the shared doc');
  });

  it('TaskCreate captures subject as type=task', () => {
    const r = runFeed({
      tool_name: 'TaskCreate',
      tool_input: { subject: 'Ship v6.8.0 mission control' },
    });
    assert.equal(r.events.length, 1);
    const ev = r.events[0];
    assert.equal(ev.type, 'task');
    assert.equal(ev.tool, 'TaskCreate');
    assert.equal(ev.subject, 'Ship v6.8.0 mission control');
    assert.equal(ev.status, null);
  });

  it('TaskUpdate captures tool_input.status', () => {
    const r = runFeed({
      tool_name: 'TaskUpdate',
      tool_input: { task_id: 't1', status: 'completed', subject: 'Ship it' },
    });
    const ev = r.events[0];
    assert.equal(ev.type, 'task');
    assert.equal(ev.status, 'completed');
    assert.equal(ev.subject, 'Ship it');
  });

  it('Workflow falls back to env CLAUDE_SESSION_ID for session_id', () => {
    const r = runFeed(
      { tool_name: 'Workflow', tool_input: { description: 'Fan out doc audit' } },
      { env: { CLAUDE_SESSION_ID: 'env-sess' } }
    );
    const ev = r.events[0];
    assert.equal(ev.type, 'workflow');
    assert.equal(ev.session_id, 'env-sess');
    assert.equal(ev.subject, 'Fan out doc audit');
  });

  it('session_id is null when absent from input and env', () => {
    const r = runFeed({ tool_name: 'Workflow', tool_input: {} });
    assert.equal(r.events[0].session_id, null);
    assert.equal(r.events[0].actor, null);
    assert.equal(r.events[0].subject, null);
  });
});

describe('mission-control-feed — truncation + privacy', () => {
  it('truncates subject to 120 and detail to 200 — no full prompts on disk', () => {
    const longPrompt = 'p'.repeat(500);
    const r = runFeed({
      tool_name: 'Agent',
      tool_input: { subagent_type: 'builder', prompt: longPrompt },
    });
    const ev = r.events[0];
    assert.equal(ev.subject, 'p'.repeat(120), 'subject = first 120 chars of prompt');
    assert.equal(ev.detail.length, 200, 'detail truncated to 200 chars');
    assert.ok(
      !JSON.stringify(ev).includes('p'.repeat(201)),
      'the full prompt must never land on disk'
    );
  });

  it('redacts secrets from permission subjects and tool fields before truncation', () => {
    const token = 'abc123def456ghi789';
    const toolToken = 'ghp_abcdefghijklmnopqrstuvwxyz';
    const r = runFeed({
      hook_event_name: 'PermissionRequest',
      requested_tool: toolToken,
      message: `Allow Bearer ${token} to continue?`,
    });
    const ev = r.events[0];
    assert.match(ev.subject, /\[redacted\]/);
    assert.doesNotMatch(ev.subject, new RegExp(token));
    assert.equal(ev.tool, '[redacted]');
    assert.doesNotMatch(JSON.stringify(ev), new RegExp(toolToken));
  });

  it('redacts secrets from captured PostToolUse detail', () => {
    const r = runFeed({
      hook_event_name: 'PostToolUse',
      tool_name: 'SendMessage',
      tool_input: {
        recipient: 'reviewer',
        message: `password=supersecretvalue ${'x'.repeat(240)}`,
      },
    });
    assert.match(r.events[0].detail, /^password=\[redacted\]/);
    assert.doesNotMatch(r.events[0].detail, /supersecretvalue/);
    assert.ok(r.events[0].detail.length <= 200);
  });
});

describe('mission-control-feed — resilience', () => {
  it('malformed stdin → continue:true, exit 0, no file', () => {
    const r = runFeed('{{{not json');
    assert.equal(r.exitCode, 0);
    assert.ok(r.parsed, 'must still print a JSON response');
    assert.equal(r.parsed.continue, true);
    assert.equal(r.parsed.suppressOutput, true);
    assert.equal(r.fileExists, false);
  });

  it('empty stdin → continue:true, exit 0', () => {
    const r = runFeed('');
    assert.equal(r.exitCode, 0);
    assert.equal(r.parsed.continue, true);
  });

  it('fails open without writing when stdin exceeds 256KB', () => {
    const r = runFeed({
      hook_event_name: 'PostToolUse',
      tool_name: 'Agent',
      tool_input: { prompt: 'x'.repeat(1024 * 1024) },
    });
    assert.equal(r.exitCode, 0);
    assert.deepEqual(r.parsed, { continue: true, suppressOutput: true });
    assert.equal(r.fileExists, false);
  });

  it('rotates events.jsonl at 10MB and starts fresh', () => {
    const r = runFeed(
      {
        tool_name: 'Agent',
        tool_input: { subagent_type: 'architect', description: 'post-rotation event' },
      },
      {
        prepare: ({ mcDir, eventsFile }) => {
          fs.mkdirSync(mcDir, { recursive: true });
          fs.writeFileSync(eventsFile, 'x'.repeat(10 * 1024 * 1024 + 1));
        },
      }
    );
    const rotated = r.dirListing.filter((f) =>
      /^events\.\d{4}-\d{2}-\d{2}-\d{6}(?:-\d+)?\.jsonl$/.test(f)
    );
    assert.equal(
      rotated.length,
      1,
      'oversized log renamed to collision-safe events.YYYY-MM-DD-HHMMSS.jsonl'
    );
    assert.equal(r.events.length, 1, 'fresh log has only the new event');
    assert.equal(r.events[0].subject, 'post-rotation event');
  });

  it('preserves two same-day rotations in distinct collision-safe archives', () => {
    const home = fs.mkdtempSync(path.join(os.tmpdir(), 'ccc-mcf-rotation-test-'));
    const mcDir = path.join(home, '.claude', 'commander', 'mission-control');
    const eventsFile = path.join(mcDir, 'events.jsonl');
    const archivePattern = /^events\.\d{4}-\d{2}-\d{2}-\d{6}(?:-\d+)?\.jsonl$/;
    const payload = {
      hook_event_name: 'PostToolUse',
      tool_name: 'Agent',
      tool_input: { description: 'post-rotation event' },
    };
    const writeOversizedSentinel = (sentinel, fill) => {
      fs.writeFileSync(eventsFile, sentinel);
      fs.appendFileSync(eventsFile, Buffer.alloc(10 * 1024 * 1024, fill));
    };
    const readPrefix = (file, length) => {
      const fd = fs.openSync(file, 'r');
      try {
        const buffer = Buffer.alloc(length);
        fs.readSync(fd, buffer, 0, length, 0);
        return buffer.toString('utf8');
      } finally {
        fs.closeSync(fd);
      }
    };

    try {
      fs.mkdirSync(mcDir, { recursive: true });
      writeOversizedSentinel('FIRST-SENTINEL\n', 'a');
      assert.equal(spawnHook(FEED_HOOK, payload, home).status, 0);

      writeOversizedSentinel('SECOND-SENTINEL\n', 'b');
      assert.equal(spawnHook(FEED_HOOK, payload, home).status, 0);

      const archives = fs.readdirSync(mcDir).filter((name) => archivePattern.test(name));
      assert.equal(archives.length, 2, 'both same-day rotations must survive');
      assert.equal(new Set(archives).size, 2, 'archive names must be distinct');
      const archiveDetails = archives.map((name) => ({
        prefix: readPrefix(path.join(mcDir, name), 16),
        size: fs.statSync(path.join(mcDir, name)).size,
      }));
      assert.ok(archiveDetails.some(({ prefix }) => prefix.startsWith('FIRST-SENTINEL')));
      assert.ok(archiveDetails.some(({ prefix }) => prefix.startsWith('SECOND-SENTINEL')));
      assert.ok(
        archiveDetails.every(({ size }) => size > 10 * 1024 * 1024),
        'neither oversized sentinel was truncated'
      );
    } finally {
      fs.rmSync(home, { recursive: true, force: true });
    }
  });
});

describe('mission-control-feed — registration', () => {
  it('hooks.json PostToolUse includes mission-control-feed.js', () => {
    const hooksJson = JSON.parse(fs.readFileSync(HOOKS_JSON, 'utf8'));
    const postToolUse = hooksJson.hooks.PostToolUse || [];
    const allCommands = postToolUse.flatMap((h) =>
      (h.hooks || []).map((hh) => hh.command || '')
    );
    assert.ok(
      allCommands.some((c) => c.includes('mission-control-feed.js')),
      'hooks.json PostToolUse should include mission-control-feed.js'
    );
  });

  it('hooks.json PermissionRequest includes the async mission-control feed', () => {
    const hooksJson = JSON.parse(fs.readFileSync(HOOKS_JSON, 'utf8'));
    const permissionRequest = hooksJson.hooks.PermissionRequest || [];
    const feedHook = permissionRequest
      .flatMap((h) => h.hooks || [])
      .find((h) => (h.command || '').includes('mission-control-feed.js'));
    assert.deepEqual(feedHook, {
      type: 'command',
      command: 'node "${CLAUDE_PLUGIN_ROOT}/hooks/mission-control-feed.js"',
      timeout: 3000,
      async: true,
    });
  });
});

describe('task-tracker — enrichment (old fields intact + new fields)', () => {
  it('emits old fields (task_id, status, title) AND new (subject, session_id)', () => {
    const r = runTracker({
      task_id: 'task-9',
      status: 'in_progress',
      title: 'Build dashboard',
      subject: 'Dashboard slice',
      session_id: 'sess-7',
    });
    assert.equal(r.exitCode, 0);
    assert.equal(r.parsed.continue, true);
    assert.equal(r.entries.length, 1);
    const e = r.entries[0];
    assert.equal(e.task_id, 'task-9');
    assert.equal(e.status, 'in_progress');
    assert.equal(e.title, 'Build dashboard');
    assert.equal(e.subject, 'Dashboard slice');
    assert.equal(e.session_id, 'sess-7');
    assert.ok(e.ts, 'keeps timestamp');
  });

  it('subject falls back to title; session_id falls back to env', () => {
    const r = runTracker(
      { task_id: 't2', status: 'completed', title: 'Only a title' },
      { CLAUDE_SESSION_ID: 'env-sess-2' }
    );
    const e = r.entries[0];
    assert.equal(e.subject, 'Only a title');
    assert.equal(e.session_id, 'env-sess-2');
    assert.equal(e.title, 'Only a title');
  });

  it('redacts and caps title and subject at 200 characters', () => {
    const bearer = 'abc123def456ghi789';
    const password = 'supersecretvalue';
    const r = runTracker({
      task_id: 't-redact',
      title: `Bearer ${bearer} ${'t'.repeat(300)}`,
      subject: `password=${password} ${'s'.repeat(300)}`,
    });
    const e = r.entries[0];
    assert.ok(e.title.length <= 200);
    assert.ok(e.subject.length <= 200);
    assert.match(e.title, /\[redacted\]/);
    assert.match(e.subject, /^password=\[redacted\]/);
    assert.doesNotMatch(JSON.stringify(e), new RegExp(`${bearer}|${password}`));
  });

  it('malformed stdin → continue:true, exit 0', () => {
    const r = runTracker('not-json{{');
    assert.equal(r.exitCode, 0);
    assert.equal(r.parsed.continue, true);
    assert.equal(r.entries.length, 0);
  });

  it('fails open (0 entries) when stdin exceeds the 256KB cap', () => {
    const huge = 'x'.repeat(300 * 1024);
    const r = runTracker({ task_id: 't-huge', title: huge });
    assert.equal(r.exitCode, 0);
    assert.equal(r.parsed.continue, true);
    assert.equal(r.entries.length, 0);
  });
});

describe('subagent-start-tracker — stdin is the primary source (Iron Law fix, CC-1378)', () => {
  it('reads agent name, prompt, model, session id from top-level stdin fields', () => {
    const r = runSubagentStart({
      agent_name: 'reviewer',
      prompt: 'Audit the auth flow',
      model: 'claude-sonnet-4-6',
      session_id: 'sess-a',
    });
    assert.equal(r.exitCode, 0);
    assert.equal(r.entries.length, 1);
    const e = r.entries[0];
    assert.equal(e.agent_name, 'reviewer');
    assert.equal(e.prompt, 'Audit the auth flow');
    assert.equal(e.model, 'claude-sonnet-4-6');
    assert.equal(e.session_id, 'sess-a');
  });

  it('probes nested subagent_type/tool_input field paths defensively', () => {
    const r = runSubagentStart({
      subagent_type: 'builder',
      session_id: 'sess-b',
      tool_input: { prompt: 'Build the widget', model: 'claude-opus-4-8' },
    });
    const e = r.entries[0];
    assert.equal(e.agent_name, 'builder');
    assert.equal(e.prompt, 'Build the widget');
    assert.equal(e.model, 'claude-opus-4-8');
    assert.equal(e.session_id, 'sess-b');
  });

  it('redacts secrets and caps the prompt at 500 characters', () => {
    const bearer = 'abc123def456ghi789';
    const r = runSubagentStart({
      agent_name: 'debugger',
      prompt: `Bearer ${bearer} ${'p'.repeat(600)}`,
    });
    const e = r.entries[0];
    assert.ok(e.prompt.length <= 500);
    assert.match(e.prompt, /\[redacted\]/);
    assert.doesNotMatch(JSON.stringify(e), new RegExp(bearer));
  });

  it('falls back to env vars when stdin has no matching fields', () => {
    const r = runSubagentStart(
      {},
      {
        CLAUDE_AGENT_NAME: 'researcher',
        CLAUDE_AGENT_PROMPT: 'Research competitor pricing',
        CLAUDE_MODEL: 'claude-opus-4-8',
        CLAUDE_SESSION_ID: 'env-sess',
      }
    );
    const e = r.entries[0];
    assert.equal(e.agent_name, 'researcher');
    assert.equal(e.prompt, 'Research competitor pricing');
    assert.equal(e.model, 'claude-opus-4-8');
    assert.equal(e.session_id, 'env-sess');
  });

  it('stdin values win over env vars when both are present', () => {
    const r = runSubagentStart(
      { agent_name: 'stdin-agent' },
      { CLAUDE_AGENT_NAME: 'env-agent' }
    );
    assert.equal(r.entries[0].agent_name, 'stdin-agent');
  });

  it('fails open (no entry) when stdin exceeds the 256KB cap', () => {
    const huge = 'x'.repeat(300 * 1024);
    const r = runSubagentStart({ agent_name: 'oversized', prompt: huge });
    assert.equal(r.exitCode, 0);
    assert.equal(r.entries.length, 0);
  });

  it('malformed stdin → continue:true, exit 0', () => {
    const r = runSubagentStart('not-json{{');
    assert.equal(r.exitCode, 0);
    assert.equal(r.parsed.continue, true);
    assert.equal(r.entries.length, 0);
  });
});
