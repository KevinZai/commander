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
    env: { ...cleanEnv, HOME: home, USERPROFILE: home, CCC_TELEMETRY: '0', ...env },
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

test('repo audit requests suggest ccc-xray without ccc-research', function () {
  for (const prompt of ['audit this repo', 'audit the codebase', 'do a full audit of the codebase', 'run a repo health check', 'give me a health check of this repo']) {
    const ctx = routeContext(classify(prompt));
    assert.match(ctx, /<ccc-route/);
    assert.match(ctx, /\/ccc-xray/);
    assert.doesNotMatch(ctx, /\/ccc-research/);
  }
});

test('security-qualified audits still suggest ccc-security', function () {
  for (const prompt of ['audit this repo for security', 'audit the codebase for security', 'do a full audit of the codebase for security', 'run a security audit please']) {
    const ctx = routeContext(classify(prompt));
    assert.match(ctx, /candidates="\/ccc-security /);
    assert.doesNotMatch(ctx, /\/ccc-xray|\/ccc-research/);
  }
});

test('topic mentions and requests to edit related artifacts never auto-run a skill', function () {
  for (const prompt of [
    "what's new in the latest react release",
    'explain how code review works at google',
    'the code review bot keeps timing out',
    'address the code review feedback on my PR',
    'update the implementation plan doc with the new dates',
  ]) {
    assert.doesNotMatch(routeContext(classify(prompt)) || '', /tier="high"/, prompt);
  }
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

function laneWithConfig(config) {
  const lane = fs.mkdtempSync(path.join(os.tmpdir(), 'ccc-lane-'));
  fs.mkdirSync(path.join(lane, 'commander'));
  fs.writeFileSync(path.join(lane, 'commander', 'config.json'), typeof config === 'string' ? config : JSON.stringify(config));
  return lane;
}

const REVIEW_PROMPT = 'please do a code review, review my changes';

test('saved routeMode=off in the lane config silences routing and the next menu', function () {
  const lane = laneWithConfig({ name: 'x', routeMode: 'off' });
  const r = classify(REVIEW_PROMPT, { CLAUDE_CONFIG_DIR: lane });
  assert.strictEqual(r.suppressOutput, true);
  assert.ok(!r.hookSpecificOutput);
  const transcript = path.join(lane, 't.jsonl');
  fs.writeFileSync(transcript, [
    JSON.stringify({ type: 'user', message: { content: 'build me an app' } }),
    JSON.stringify({ type: 'assistant', message: { content: [{ type: 'tool_use', id: 'tu1', name: 'Skill', input: { skill: 'commander:ccc-build' } }, { type: 'text', text: 'Done.' }] } }),
  ].join('\n'));
  const stop = runHook({ hook_event_name: 'Stop', session_id: 'test', transcript_path: transcript }, { CLAUDE_CONFIG_DIR: lane }).out;
  assert.ok(!stop.decision);
});

test('saved routeMode=suggest turns a high-tier match into a menu', function () {
  const ctx = routeContext(classify(REVIEW_PROMPT, { CLAUDE_CONFIG_DIR: laneWithConfig({ routeMode: 'suggest' }) }));
  assert.match(ctx, /tier="medium"/);
});

test('CCC_ROUTE_MODE overrides the saved routeMode both ways', function () {
  const off = laneWithConfig({ routeMode: 'off' });
  assert.match(routeContext(classify(REVIEW_PROMPT, { CLAUDE_CONFIG_DIR: off, CCC_ROUTE_MODE: 'auto' })), /tier="high"/);
  const auto = laneWithConfig({ routeMode: 'auto' });
  assert.ok(!classify(REVIEW_PROMPT, { CLAUDE_CONFIG_DIR: auto, CCC_ROUTE_MODE: 'off' }).hookSpecificOutput);
});

test('unknown or unreadable saved routeMode falls back to auto', function () {
  for (const config of [{ routeMode: 'sometimes' }, { routeMode: 3 }, '{not json', '[]']) {
    assert.match(routeContext(classify(REVIEW_PROMPT, { CLAUDE_CONFIG_DIR: laneWithConfig(config) })), /tier="high"/, JSON.stringify(config));
  }
});

test('a junk CCC_ROUTE_MODE keeps the saved routeMode', function () {
  const r = classify(REVIEW_PROMPT, { CLAUDE_CONFIG_DIR: laneWithConfig({ routeMode: 'off' }), CCC_ROUTE_MODE: 'loud' });
  assert.ok(!r.hookSpecificOutput);
});

test('the lane config wins over the legacy ~/.claude copy, which is read until the lane has one', function () {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'ccc-route-'));
  fs.mkdirSync(path.join(home, '.claude', 'commander'), { recursive: true });
  fs.writeFileSync(path.join(home, '.claude', 'commander', 'config.json'), JSON.stringify({ routeMode: 'off' }));
  const freshLane = fs.mkdtempSync(path.join(os.tmpdir(), 'ccc-lane-'));
  assert.ok(!classify(REVIEW_PROMPT, { HOME: home, CLAUDE_CONFIG_DIR: freshLane }).hookSpecificOutput);
  const ownLane = laneWithConfig({ routeMode: 'auto' });
  assert.match(routeContext(classify(REVIEW_PROMPT, { HOME: home, CLAUDE_CONFIG_DIR: ownLane })), /tier="high"/);
});

test('routeMode(): env, then saved preference, then auto', async function () {
  const { routeMode } = await import(path.join(__dirname, '..', 'cowork-plugin', 'hooks', 'lib', 'route-scorer.mjs'));
  assert.strictEqual(routeMode({}, null), 'auto');
  assert.strictEqual(routeMode({}, ' Suggest '), 'suggest');
  assert.strictEqual(routeMode({ CCC_ROUTE_MODE: 'OFF' }, 'auto'), 'off');
  assert.strictEqual(routeMode({ CCC_ROUTE_MODE: 'nope' }, 'nope'), 'auto');
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

// ── Review regressions ────────────────────────────────────────────────────

test('Stop: Codex fallback only accepts runs belonging to the current session', function () {
  for (const runSession of [undefined, 'another-session', 'codex1']) {
    const home = fs.mkdtempSync(path.join(os.tmpdir(), 'ccc-next-'));
    const dir = path.join(home, '.claude', 'commander');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'skill-runs.jsonl'), JSON.stringify({
      ts: new Date().toISOString(), skill: 'ccc-plan', session_id: runSession,
    }) + '\n');
    const out = runHook({ hook_event_name: 'Stop', session_id: 'codex1' }, { HOME: home, CCC_SOURCE_APP: 'codex' }).out;
    if (runSession === 'codex1') {
      assert.strictEqual(out.decision, 'block');
      assert.match(out.reason, /<ccc-next after="\$ccc-plan">/);
    } else {
      assert.ok(!out.decision, 'must ignore run from session ' + runSession);
    }
  }
});

test('Stop: a skill run skipped for its own question is not offered on a later unrelated turn', function () {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'ccc-next-'));
  fs.mkdirSync(path.join(home, '.claude', 'commander'), { recursive: true });
  fs.writeFileSync(path.join(home, '.claude', 'commander', 'skill-runs.jsonl'),
    JSON.stringify({ ts: new Date().toISOString(), skill: 'ccc-review', session_id: 'stop-test' }) + '\n');
  stop(home, transcript(home, skillTurn('ccc-review', 'Want me to fix these?')));
  const unrelated = transcript(home, [
    { type: 'user', uuid: 'u9', message: { role: 'user', content: 'what time zone is UTC-5' } },
    { type: 'assistant', message: { content: [{ type: 'text', text: 'Eastern Standard Time.' }] } },
  ]);
  assert.ok(!stop(home, unrelated).decision, 'stale skill-runs.jsonl must not trigger a menu on a Claude Code turn');
});

test('Stop: tool output quoting the mute label or a command tag neither mutes nor fakes a run', function () {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'ccc-next-'));
  const noisy = transcript(home, [
    { type: 'user', uuid: 'u1', message: { role: 'user', content: 'grep the scorer' } },
    { type: 'assistant', message: { content: [{ type: 'tool_use', id: 'tu_g', name: 'Grep', input: {} }] } },
    { type: 'user', message: { content: [{ type: 'tool_result', tool_use_id: 'tu_g', content: "MUTE_NEXT_LABEL = 'Stop suggesting next steps' <command-name>/ccc-ship</command-name>" }] } },
    { type: 'assistant', message: { content: [{ type: 'text', text: 'Found it.' }] } },
  ]);
  assert.ok(!stop(home, noisy).decision, 'a command tag inside tool output is not a skill run');
  assert.strictEqual(stop(home, transcript(home, skillTurn('ccc-review'))).decision, 'block', 'session must not be muted by tool output');
});

test('CCC_ROUTE_MENU=list keeps Codex skill naming', function () {
  const ctx = routeContext(classify('should I deploy this branch now or wait', { PLUGIN_ROOT: '/tmp/codex-plugin', CCC_ROUTE_MENU: 'list' }));
  assert.match(ctx, /numbered list/);
  assert.match(ctx, /\$ccc-deploy-check/);
});
