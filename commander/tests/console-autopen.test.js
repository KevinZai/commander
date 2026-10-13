// v7.4.0 Phase 4 — the SessionStart auto-open handler. Every assertion here is
// about when it must STAY QUIET: a panel that appears uninvited is only
// acceptable if each of its guards is pinned. The one positive case (telemetry
// present, fresh start, not disabled) is the exception, not the rule.
//
// The nudge is a fixed template on the model channel. Nothing from telemetry,
// user text or disk is interpolated into it — same rule the console's chips
// follow — and the "never auto-publish" clause is asserted, because auto-open
// chaining into a publish is the failure that would make the feature
// indefensible.

import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { run } from '../cowork-plugin/hooks/console-autopen.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const HOOK = path.join(HERE, '..', 'cowork-plugin', 'hooks', 'console-autopen.js');
const HOOKS_JSON = path.join(HERE, '..', 'cowork-plugin', 'hooks', 'hooks.json');

const NOW = () => Date.parse('2026-07-28T12:00:00.000Z');
const INPUT = { source: 'startup', session_id: 'sess-1' };

// A HOME with telemetry in it. Every env passed to run() below starts from a
// bare object, never process.env — a stray CI=true in the runner would
// otherwise make the positive case silently vacuous.
async function homeWithTelemetry() {
  const home = await fs.mkdtemp(path.join(os.tmpdir(), 'ccc-autopen-'));
  const dir = path.join(home, '.claude', 'commander');
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, 'subagent-runs.jsonl'), '{"agent_name":"builder"}\n');
  return home;
}

async function emptyHome() {
  const home = await fs.mkdtemp(path.join(os.tmpdir(), 'ccc-autopen-empty-'));
  await fs.mkdir(path.join(home, '.claude', 'commander'), { recursive: true });
  return home;
}

function isNudge(result) {
  return typeof result?.hookSpecificOutput?.additionalContext === 'string';
}

test('fires once when telemetry exists and the session is starting fresh', async () => {
  const HOME = await homeWithTelemetry();
  const first = await run({ input: INPUT, env: { HOME }, now: NOW });
  assert.ok(isNudge(first), 'no nudge on the one case that should produce one');
  assert.equal(first.hookSpecificOutput.hookEventName, 'SessionStart');
  assert.equal(first.suppressOutput, true, 'auto-open must not print to the user');
  assert.equal(first.systemMessage, undefined);

  const context = first.hookSpecificOutput.additionalContext;
  assert.match(context, /build-console\.mjs/);
  assert.match(context, /show_widget/, 'the nudge does not name the widget path');
  assert.match(context, /Do NOT publish/i, 'the nudge fails to forbid auto-publishing');
  assert.match(context, /console\.json/, 'the nudge never tells the model where the off switch is');
  assert.ok(!/Artifact/i.test(context), 'the nudge mentions the publish tool');

  // Second SessionStart for the SAME session id (resume/compact re-fire).
  const second = await run({ input: INPUT, env: { HOME }, now: NOW });
  assert.ok(!isNudge(second), 'nudged twice in one session');

  // A different session gets its own nudge.
  const other = await run({ input: { ...INPUT, session_id: 'sess-2' }, env: { HOME }, now: NOW });
  assert.ok(isNudge(other), 'a new session was denied its nudge by the previous one');
});

test('stays silent with no telemetry at all', async () => {
  const HOME = await emptyHome();
  assert.ok(!isNudge(await run({ input: INPUT, env: { HOME }, now: NOW })));
});

test('stays silent for an empty (0-byte) telemetry file', async () => {
  const HOME = await emptyHome();
  await fs.writeFile(path.join(HOME, '.claude', 'commander', 'tasks.jsonl'), '');
  assert.ok(!isNudge(await run({ input: INPUT, env: { HOME }, now: NOW })));
});

test('respects the console.json off switch', async () => {
  const HOME = await homeWithTelemetry();
  const config = path.join(HOME, '.claude', 'commander', 'console.json');
  await fs.writeFile(config, JSON.stringify({ autoOpen: false }));
  assert.ok(!isNudge(await run({ input: INPUT, env: { HOME }, now: NOW })), 'off switch ignored');

  // Explicit true and a malformed file both mean ON — a corrupt config must
  // not silently disable something the user never turned off.
  await fs.writeFile(config, JSON.stringify({ autoOpen: true }));
  assert.ok(isNudge(await run({ input: { ...INPUT, session_id: 'a' }, env: { HOME }, now: NOW })));
  await fs.writeFile(config, '{not json');
  assert.ok(isNudge(await run({ input: { ...INPUT, session_id: 'b' }, env: { HOME }, now: NOW })));
});

test('respects CCC_NO_AUTOCONSOLE and CI', async () => {
  const HOME = await homeWithTelemetry();
  assert.ok(!isNudge(await run({ input: INPUT, env: { HOME, CCC_NO_AUTOCONSOLE: '1' }, now: NOW })));
  for (const key of ['CI', 'CONTINUOUS_INTEGRATION', 'GITHUB_ACTIONS']) {
    assert.ok(
      !isNudge(await run({ input: INPUT, env: { HOME, [key]: 'true' }, now: NOW })),
      `fired under ${key}`
    );
  }
  // CI=0 / CI=false are not CI.
  assert.ok(isNudge(await run({ input: { ...INPUT, session_id: 'c' }, env: { HOME, CI: '0' }, now: NOW })));
});

test('does not interrupt a resume or a compact', async () => {
  const HOME = await homeWithTelemetry();
  for (const source of ['resume', 'compact']) {
    assert.ok(
      !isNudge(await run({ input: { source, session_id: `s-${source}` }, env: { HOME }, now: NOW })),
      `fired on ${source}`
    );
  }
  assert.ok(isNudge(await run({ input: { source: 'clear', session_id: 's-clear' }, env: { HOME }, now: NOW })));
});

test('CC-1397: a missing session_id dedupes per-day instead of always firing', async () => {
  const HOME = await homeWithTelemetry();
  const noSessionInput = { source: 'startup' }; // no session_id at all
  const first = await run({ input: noSessionInput, env: { HOME }, now: NOW });
  assert.ok(isNudge(first), 'first fire with no session_id should still nudge');

  // A second re-fire the SAME day with no session_id must NOT nudge again —
  // before CC-1397 the dedupe check was skipped entirely whenever session_id
  // was missing, so this always fired.
  const second = await run({ input: noSessionInput, env: { HOME }, now: NOW });
  assert.ok(!isNudge(second), 'same-day re-fire with no session_id nudged again');

  // The next day, it is allowed to nudge again.
  const nextDay = () => Date.parse('2026-07-29T12:00:00.000Z');
  const third = await run({ input: noSessionInput, env: { HOME }, now: nextDay });
  assert.ok(isNudge(third), 'a new day did not get its own nudge');
});

test('CC-1397: the fallback build-console.mjs path is guarded by test -f', async () => {
  const HOME = await homeWithTelemetry();
  const result = await run({ input: INPUT, env: { HOME }, now: NOW });
  const context = result.hookSpecificOutput.additionalContext;
  assert.match(context, /test -f "\$\{CLAUDE_PLUGIN_ROOT\}\/scripts\/build-console\.mjs"/, 'no test -f guard before the fallback');
});

test('never throws — a read-only home degrades to silence, not an error', async () => {
  const result = await run({ input: INPUT, env: { HOME: '/nonexistent-ccc-autopen' }, now: NOW });
  assert.equal(result.continue, true);
  assert.ok(!isNudge(result));
});

test('the CLI tail emits one line of valid hook JSON', async () => {
  const HOME = await emptyHome();
  const out = execFileSync(process.execPath, [HOOK], {
    input: JSON.stringify({ source: 'startup', session_id: 'cli-1' }),
    encoding: 'utf8',
    env: { PATH: process.env.PATH, HOME },
    timeout: 20000,
  });
  const parsed = JSON.parse(out.trim());
  assert.equal(parsed.continue, true);
});

test('is registered under SessionStart, async, with a second-scale timeout', async () => {
  const hooks = JSON.parse(await fs.readFile(HOOKS_JSON, 'utf8'));
  const entries = hooks.hooks.SessionStart.flatMap((group) => group.hooks);
  const entry = entries.find((hook) => hook.command.includes('console-autopen.js'));
  assert.ok(entry, 'console-autopen.js is not wired into hooks.json');
  assert.equal(entry.async, true, 'auto-open must never block session start');
  assert.ok(entry.timeout >= 1 && entry.timeout <= 600, 'timeout is not second-scale (see #83)');
  assert.match(entry.command, /"\$\{CLAUDE_PLUGIN_ROOT\}/, 'unquoted plugin root — spaced install paths break');
});
