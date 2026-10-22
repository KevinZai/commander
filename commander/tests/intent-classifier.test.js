'use strict';

const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');
const { spawnSync } = require('node:child_process');

const HOOK = path.join(
  __dirname,
  '..',
  'cowork-plugin',
  'hooks',
  'intent-classifier.js'
);

// HOME isolated: the hook writes route state, content-free route events and
// the Fable-nudge marker under ~/.claude/commander/ — never let a test write
// into the real home directory.
function runHook(payload, env = {}) {
  const home = env.HOME || fs.mkdtempSync(path.join(os.tmpdir(), 'ccc-route-'));
  const cleanEnv = { ...process.env };
  for (const key of ['PLUGIN_ROOT', 'CCC_SOURCE_APP', 'CCC_ROUTE_MODE', 'CCC_ROUTE_NEXT', 'CCC_ROUTE_MENU']) delete cleanEnv[key];
  const result = spawnSync(process.execPath, [HOOK], {
    input: JSON.stringify(payload),
    encoding: 'utf8',
    timeout: 5000,
    env: { ...cleanEnv, HOME: home, USERPROFILE: home, ...env },
  });
  assert.strictEqual(result.status, 0, 'classifier should exit 0');
  return { out: JSON.parse(result.stdout.trim()), home };
}

function classify(prompt, env) {
  return runHook({ hook_event_name: 'UserPromptSubmit', session_id: 'test', prompt }, env).out;
}

function routeContext(out) {
  return out.hookSpecificOutput && out.hookSpecificOutput.additionalContext;
}

test('routes to the MODEL via additionalContext, not a user systemMessage', function () {
  const r = classify('can you review my changes before I open the PR');
  const ctx = routeContext(r);
  assert.ok(ctx && ctx.includes('<ccc-route'), 'expected <ccc-route> block, got: ' + JSON.stringify(r));
  assert.strictEqual(r.hookSpecificOutput.hookEventName, 'UserPromptSubmit');
  assert.ok(!r.systemMessage, 'route must not render as a user systemMessage');
  assert.ok(ctx.includes('/ccc-review'));
});

test('high tier: clear winner tells the model to run the skill and say so', function () {
  const ctx = routeContext(classify('please do a code review, review my changes'));
  assert.match(ctx, /tier="high"/);
  assert.match(ctx, /Skill commander:ccc-review/);
  assert.match(ctx, /one line/);
});

test('medium tier: AskUserQuestion menu with recommended first and "Just answer"', function () {
  const ctx = routeContext(classify('should I deploy this branch now or wait'));
  assert.match(ctx, /tier="medium"/);
  assert.match(ctx, /AskUserQuestion once/);
  assert.match(ctx, /🟢/);
  assert.match(ctx, /Just answer/);
});

test('Codex host (PLUGIN_ROOT set) uses request_user_input and $ccc-* names', function () {
  const ctx = routeContext(classify('should I deploy this branch now or wait', { PLUGIN_ROOT: '/tmp/codex-plugin' }));
  assert.match(ctx, /request_user_input/);
  assert.match(ctx, /\(Recommended\)/);
  assert.match(ctx, /\$ccc-deploy-check/);
  assert.ok(!ctx.includes('AskUserQuestion'));
});

test('CCC_ROUTE_MENU=list falls back to a numbered list', function () {
  const ctx = routeContext(classify('should I deploy this branch now or wait', { CCC_ROUTE_MENU: 'list' }));
  assert.match(ctx, /numbered list/);
});

test('injected block stays under 600 characters', function () {
  for (const prompt of ['please do a code review, review my changes', 'should I deploy this branch now or wait', 'why is the dashboard so slow to load']) {
    const ctx = routeContext(classify(prompt));
    assert.ok(ctx && ctx.length <= 600, `${ctx && ctx.length} chars for: ${prompt}`);
  }
});

test('CCC_ROUTE_MODE=off is silent', function () {
  const r = classify('please do a code review, review my changes', { CCC_ROUTE_MODE: 'off' });
  assert.strictEqual(r.suppressOutput, true);
  assert.ok(!r.hookSpecificOutput);
});

test('CCC_ROUTE_MODE=suggest never auto-runs: high becomes a menu', function () {
  const ctx = routeContext(classify('please do a code review, review my changes', { CCC_ROUTE_MODE: 'suggest' }));
  assert.match(ctx, /tier="medium"/);
  assert.match(ctx, /AskUserQuestion/);
});

test('explicit /ccc-* and $ccc-* prompts are not routed', function () {
  for (const prompt of ['/ccc-review quick', '$ccc-plan add invites', '/commander:ccc-review']) {
    const r = classify(prompt);
    assert.ok(!r.hookSpecificOutput, 'expected no routing for ' + prompt);
  }
});

test('non-human turns (task notifications, system notices, sub-agents) are not routed', function () {
  assert.ok(!classify('<task-notification><status>completed</status> review my changes</task-notification>').hookSpecificOutput);
  assert.ok(!classify('[SYSTEM NOTIFICATION - NOT USER INPUT] review my changes').hookSpecificOutput);
  const sub = runHook({ hook_event_name: 'UserPromptSubmit', prompt: 'review my changes', agent_id: 'a1' }).out;
  assert.ok(!sub.hookSpecificOutput);
});

test('whole-word matching: postgres is not post, preview is not review', function () {
  assert.ok(!classify('add a postgres index on users.email').hookSpecificOutput);
  assert.ok(!classify('preview the image before uploading').hookSpecificOutput);
});

test('control: "write a for loop in python" produces no routing', function () {
  const r = classify('write a for loop in python');
  assert.strictEqual(r.suppressOutput, true, 'expected suppressOutput=true on no match');
  assert.ok(!r.systemMessage && !r.hookSpecificOutput, 'expected silence, got: ' + JSON.stringify(r));
});

test('telemetry is content-free: route events never contain the prompt', function () {
  const secretish = 'review my changes before the zebra-umbrella-42 launch';
  const { home } = runHook({ hook_event_name: 'UserPromptSubmit', session_id: 's', prompt: secretish });
  const log = fs.readFileSync(path.join(home, '.claude', 'commander', 'route-events.jsonl'), 'utf8');
  assert.ok(!log.includes('zebra-umbrella-42'));
  const entry = JSON.parse(log.trim().split('\n').pop());
  assert.deepStrictEqual(Object.keys(entry).sort(), ['event', 'host', 'route', 'score', 'session_id', 'tier', 'ts']);
});

// ── Stop: "what next" ─────────────────────────────────────────────────────

function transcript(dir, entries) {
  const file = path.join(dir, 'transcript.jsonl');
  fs.writeFileSync(file, entries.map((e) => JSON.stringify(e)).join('\n') + '\n');
  return file;
}

function skillTurn(skill, finalText = 'Review done. Findings are in tasks/reviews/.') {
  return [
    { type: 'user', uuid: 'u1', message: { role: 'user', content: 'please review my changes' } },
    { type: 'assistant', message: { content: [{ type: 'tool_use', id: 'tu_1', name: 'Skill', input: { skill: `commander:${skill}` } }] } },
    { type: 'user', message: { content: [{ type: 'tool_result', tool_use_id: 'tu_1', content: 'loaded' }] } },
    { type: 'assistant', message: { content: [{ type: 'text', text: finalText }] } },
  ];
}

function stop(home, file, extra = {}) {
  return runHook({ hook_event_name: 'Stop', session_id: 'stop-test', transcript_path: file, stop_hook_active: false, ...extra }, { HOME: home }).out;
}

test('Stop: after a skill ran, offers its next[] steps once via decision:block', function () {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'ccc-next-'));
  const file = transcript(home, skillTurn('ccc-review'));
  const first = stop(home, file);
  assert.strictEqual(first.decision, 'block');
  assert.match(first.reason, /<ccc-next after="\/ccc-review">/);
  assert.match(first.reason, /AskUserQuestion once/);
  assert.match(first.reason, /Stop suggesting next steps/);
  assert.ok(first.reason.length <= 600);
  const second = stop(home, file);
  assert.ok(!second.decision, 'must not ask twice for the same skill run');
});

test('Stop: silent when no skill ran this turn', function () {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'ccc-next-'));
  const file = transcript(home, [
    { type: 'user', uuid: 'u1', message: { role: 'user', content: 'rename this variable' } },
    { type: 'assistant', message: { content: [{ type: 'text', text: 'Renamed.' }] } },
  ]);
  assert.ok(!stop(home, file).decision);
});

test('Stop: silent while stop_hook_active (at most once per turn)', function () {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'ccc-next-'));
  const file = transcript(home, skillTurn('ccc-review'));
  assert.ok(!stop(home, file, { stop_hook_active: true }).decision);
});

test('Stop: silent when the turn already ends with a question', function () {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'ccc-next-'));
  const file = transcript(home, skillTurn('ccc-review', 'Want me to fix the two findings?'));
  assert.ok(!stop(home, file).decision);
});

test('Stop: "Stop suggesting next steps" mutes the menu for the session', function () {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'ccc-next-'));
  const muted = transcript(home, [
    { type: 'user', uuid: 'u1', message: { role: 'user', content: 'ok' } },
    { type: 'assistant', message: { content: [{ type: 'tool_use', id: 'tu_q', name: 'AskUserQuestion', input: {} }] } },
    { type: 'user', message: { content: [{ type: 'tool_result', tool_use_id: 'tu_q', content: 'User answered: "Stop suggesting next steps"' }] } },
    { type: 'assistant', message: { content: [{ type: 'text', text: 'Okay.' }] } },
  ]);
  stop(home, muted);
  const file = transcript(home, skillTurn('ccc-review'));
  assert.ok(!stop(home, file).decision, 'muted session must not get a next-step menu');
});

test('Stop: CCC_ROUTE_NEXT=off disables the menu', function () {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'ccc-next-'));
  const file = transcript(home, skillTurn('ccc-review'));
  const out = runHook({ hook_event_name: 'Stop', session_id: 'x', transcript_path: file }, { HOME: home, CCC_ROUTE_NEXT: 'off' }).out;
  assert.ok(!out.decision);
});

test('Stop: skills without next[] stay silent', function () {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'ccc-next-'));
  const file = transcript(home, skillTurn('ccc-console'));
  assert.ok(!stop(home, file).decision);
});

test('Stop: offered route that then ran is logged accepted=true', function () {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'ccc-next-'));
  runHook({ hook_event_name: 'UserPromptSubmit', session_id: 'stop-test', prompt: 'please review my changes' }, { HOME: home });
  stop(home, transcript(home, skillTurn('ccc-review')));
  const events = fs.readFileSync(path.join(home, '.claude', 'commander', 'route-events.jsonl'), 'utf8').trim().split('\n').map((l) => JSON.parse(l));
  const outcome = events.find((e) => e.event === 'outcome');
  assert.ok(outcome && outcome.accepted === true && outcome.route === 'ccc-review');
});

test('SubagentStop is a silent pass-through', function () {
  const out = runHook({ hook_event_name: 'SubagentStop', session_id: 'x' }).out;
  assert.deepStrictEqual(out, { continue: true, suppressOutput: true });
});
