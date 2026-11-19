// "always" route mode and the SubagentStart skill router: CCC skills are
// evaluated on every prompt and handed to fleet/workflow subagents.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, existsSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  loadRoutes, scoreRoutes, tierFor, routeMode, renderRouteContext, renderSubagentContext,
  followable, SIDE_EFFECT_SKILLS, HINT_THRESHOLD,
} from '../cowork-plugin/hooks/lib/route-scorer.mjs';
import { run, taskText } from '../cowork-plugin/hooks/subagent-skill-router.js';

const HOOKS = join(dirname(fileURLToPath(import.meta.url)), '..', 'cowork-plugin', 'hooks');
const routes = loadRoutes();
const ctx = (out) => out && out.hookSpecificOutput && out.hookSpecificOutput.additionalContext;

test('always is a valid route mode; default stays auto', () => {
  assert.equal(routeMode({ CCC_ROUTE_MODE: 'always' }), 'always');
  assert.equal(routeMode({}, 'always'), 'always');
  assert.equal(routeMode({}), 'auto');
});

test('auto mode is unchanged: no hint tier, menus for medium', () => {
  const c = scoreRoutes('brainstorm some onboarding ideas', routes);
  assert.notEqual(tierFor(c, 'auto'), 'hint');
  const out = renderRouteContext(c, tierFor(c, 'auto'), 'claude-code', 'auto');
  if (out) assert.doesNotMatch(out, /Likely match/);
});

test('always runs a likely match instead of a menu', () => {
  const c = scoreRoutes('brainstorm some onboarding ideas', routes);
  const tier = tierFor(c, 'always');
  const out = renderRouteContext(c, tier, 'claude-code', 'always');
  assert.match(out, /Likely match: read .*ccc-brainstorm\/SKILL\.md/);
});

test('always never auto-follows side-effect skills', () => {
  const c = scoreRoutes('deploy this to fly', routes);
  const out = renderRouteContext(c, tierFor(c, 'always'), 'claude-code', 'always');
  assert.ok(c[0] && c[0].route.id === 'ccc-deploy');
  assert.doesNotMatch(out, /Likely match/);
  assert.match(out, /never invoke it/);
  assert.equal(followable(c[0].route), false);
});

test('every side-effect skill id is a real plugin skill', () => {
  for (const id of SIDE_EFFECT_SKILLS) assert.ok(existsSync(join(HOOKS, '..', 'skills', id, 'SKILL.md')), `${id} has no SKILL.md`);
});

test('a weak match gets a one-line hint in always mode only', () => {
  const weak = scoreRoutes('brainstorm some onboarding ideas', routes).map((c) => ({ ...c, score: HINT_THRESHOLD }));
  assert.equal(tierFor(weak, 'always'), 'hint');
  assert.equal(tierFor(weak, 'auto'), 'low');
  assert.match(renderRouteContext(weak, 'hint', 'claude-code', 'always'), /CCC skills that may help/);
});

test('subagent context names the matching skill and skips manual ones outside always', () => {
  const review = scoreRoutes('Review this PR before I merge and list correctness bugs', routes);
  assert.match(renderSubagentContext(review, 'claude-code', 'auto'), /Skill commander:ccc-review/);
  const brainstorm = scoreRoutes('brainstorm feature ideas for onboarding', routes);
  assert.equal(renderSubagentContext(brainstorm, 'claude-code', 'auto'), null);
  assert.equal(renderSubagentContext(scoreRoutes('deploy this to fly', routes), 'claude-code', 'always'), null);
});

test('taskText reads description and prompt from any payload shape', () => {
  assert.equal(taskText({ description: 'a', prompt: 'b' }), 'a\nb');
  assert.equal(taskText({ tool_input: { prompt: 'p' } }), 'p');
  assert.equal(taskText({ subagent: { prompt: 'q' } }), 'q');
  assert.equal(taskText({}), '');
});

test('SubagentStart router respects modes and explicit skills', () => {
  const env = { CCC_CONFIG_DIR: mkdtempSync(join(tmpdir(), 'ccc-route-')) };
  try {
    const input = { hook_event_name: 'SubagentStart', prompt: 'Review this PR before I merge' };
    assert.match(ctx(run(input, env)), /ccc-review/);
    assert.equal(ctx(run(input, { ...env, CCC_ROUTE_MODE: 'off' })), undefined);
    assert.equal(ctx(run(input, { ...env, CCC_ROUTE_MODE: 'suggest' })), undefined);
    assert.equal(ctx(run(input, { ...env, CCC_SUBAGENT_ROUTE: 'off' })), undefined);
    assert.equal(ctx(run({ prompt: 'Run /ccc-review on this PR' }, env)), undefined);
    assert.equal(ctx(run({ prompt: 'hello' }, env)), undefined);
  } finally {
    rmSync(env.CCC_CONFIG_DIR, { recursive: true, force: true });
  }
});

test('the hook script prints one JSON line and fails open on bad input', () => {
  const ok = spawnSync(process.execPath, [join(HOOKS, 'subagent-skill-router.js')], {
    input: JSON.stringify({ prompt: 'Review this PR before I merge' }), encoding: 'utf8',
  });
  assert.equal(ok.status, 0);
  assert.match(JSON.parse(ok.stdout).hookSpecificOutput.additionalContext, /ccc-review/);
  const bad = spawnSync(process.execPath, [join(HOOKS, 'subagent-skill-router.js')], { input: '{not json', encoding: 'utf8' });
  assert.equal(bad.status, 0);
  assert.equal(JSON.parse(bad.stdout).continue, true);
});

test('always never auto-runs visible side-effect skills or unlisted hidden ones', async () => {
  const { autoFollowable, FOLLOWABLE_HIDDEN_SKILLS } = await import('../cowork-plugin/hooks/lib/route-scorer.mjs');
  for (const prompt of ['update commander', 'modernize this PR', 'save my session']) {
    const c = scoreRoutes(prompt, routes);
    const out = renderRouteContext(c, tierFor(c, 'always'), 'claude-code', 'always');
    if (out) assert.doesNotMatch(out, /Likely match|CCC skills that may help/, prompt);
  }
  for (const id of FOLLOWABLE_HIDDEN_SKILLS) assert.ok(!SIDE_EFFECT_SKILLS.has(id), id);
  const byId = Object.fromEntries(routes.map((r) => [r.id, r]));
  for (const r of routes) if (r.manual && !FOLLOWABLE_HIDDEN_SKILLS.has(r.id)) assert.equal(autoFollowable(r), false, r.id);
  assert.equal(autoFollowable(byId['ccc-update']), false);
});

test('a medium match is only an option for workers in auto mode, never a directive', () => {
  const c = scoreRoutes('Review this PR before I merge', routes);
  const weaker = c.map((x, i) => (i === 0 ? { ...x, score: 0.6, patternHits: 0 } : x));
  const out = renderSubagentContext(weaker, 'claude-code', 'auto');
  if (out) assert.doesNotMatch(out, /Before starting/);
});

test('PreToolUse queues Agent calls and SubagentStart claims each once, in spawn order', async () => {
  const { recordAgentCall } = await import('../cowork-plugin/hooks/subagent-skill-router.js');
  const dir = mkdtempSync(join(tmpdir(), 'ccc-sub-'));
  const env = { CCC_CONFIG_DIR: dir };
  const prev = process.env.CCC_CONFIG_DIR;
  process.env.CCC_CONFIG_DIR = dir;
  try {
    const call = (id, type, prompt) => recordAgentCall({ session_id: 's1', tool_name: 'Agent', tool_use_id: id, tool_input: { subagent_type: type, description: 'task', prompt } });
    call('tu1', 'general-purpose', 'Review this PR before I merge');
    call('tu2', 'general-purpose', 'hello there');
    call('tu3', 'Explore', 'Review this PR before I merge');
    recordAgentCall({ session_id: 's1', tool_name: 'Bash', tool_input: { command: 'ls' } });
    const start = { session_id: 's1', agent_type: 'general-purpose', hook_event_name: 'SubagentStart' };
    assert.match(ctx(run(start, env)), /ccc-review/, 'first worker gets the first call');
    assert.equal(ctx(run(start, env)), undefined, 'second worker gets its own (non-matching) task');
    // Nothing left for this type: a worker with no task text gets the generic pre-run check.
    assert.match(ctx(run(start, env)), /Pre-run check/, 'nothing left for this type');
    assert.match(ctx(run({ ...start, agent_type: 'Explore' }, env)), /ccc-review/);
  } finally {
    if (prev === undefined) delete process.env.CCC_CONFIG_DIR; else process.env.CCC_CONFIG_DIR = prev;
    rmSync(dir, { recursive: true, force: true });
  }
});

test('always mode never auto-runs a side-effect skill even on a clear match', () => {
  const c = scoreRoutes('Review this PR before I merge', routes).map((x, i) => (i === 0 ? { ...x, route: { ...x.route, id: 'ccc-update' } } : x));
  assert.equal(tierFor(c, 'always'), 'medium');
});

test('workers are never offered hidden skills', () => {
  const c = scoreRoutes('brainstorm feature ideas for onboarding', routes);
  assert.equal(renderSubagentContext(c, 'claude-code', 'always'), null);
});

test('"review the last commit" routes to ccc-review', () => {
  const c = scoreRoutes('review the last commit for bugs', routes);
  assert.equal(c[0] && c[0].route.id, 'ccc-review');
});

test('queue: expired entries, drops, missing type/session and off mode', async () => {
  const { recordAgentCall, dropAgentCall, claimTask } = await import('../cowork-plugin/hooks/subagent-skill-router.js');
  const { readdirSync } = await import('node:fs');
  const dir = mkdtempSync(join(tmpdir(), 'ccc-q-'));
  const prev = process.env.CCC_CONFIG_DIR;
  process.env.CCC_CONFIG_DIR = dir;
  const env = { CCC_CONFIG_DIR: dir };
  try {
    const call = (id, e = env) => recordAgentCall({ session_id: 's2', tool_name: 'Agent', tool_use_id: id, tool_input: { prompt: 'Review this PR before I merge' } }, e);
    call('off1', { ...env, CCC_ROUTE_MODE: 'off' });
    const start = { session_id: 's2', agent_type: 'general-purpose' };
    assert.equal(claimTask(start), null, 'nothing recorded while routing is off');
    call('d1');
    dropAgentCall({ session_id: 's2', tool_use_id: 'd1' });
    assert.equal(claimTask(start), null, 'dropped call is not handed out');
    call('m1');
    assert.equal(claimTask({ session_id: 's2' }), null, 'no type, no claim');
    assert.equal(claimTask({ agent_type: 'general-purpose' }), null, 'no session, no claim');
    // Age the queued entry past the TTL by renaming it with an old timestamp.
    const { renameSync } = await import('node:fs');
    const qdir = readdirSync(join(dir, 'commander', 'route-state')).map((d) => join(dir, 'commander', 'route-state', d)).find((d) => d.includes('s2'));
    for (const n of readdirSync(qdir)) renameSync(join(qdir, n), join(qdir, n.replace(/^\d+/, String(Date.now() - 120000).padStart(15, '0'))));
    assert.equal(claimTask(start), null, 'expired entry is dropped');
    assert.equal(readdirSync(qdir).length, 0, 'expired entry removed from disk');
  } finally {
    if (prev === undefined) delete process.env.CCC_CONFIG_DIR; else process.env.CCC_CONFIG_DIR = prev;
    rmSync(dir, { recursive: true, force: true });
  }
});

test('PreToolUse dispatcher does not queue a denied Agent call', () => {
  const src = readFileSync(join(HOOKS, 'orchestrator', 'pre-tool-use-dispatcher.js'), 'utf8');
  assert.match(src, /permissionDecision !== 'deny'\)\s*\{\s*try \{ recordAgentCall\(input\)/);
});

test('a queue-matched hint names its task; a worker with its own task takes only its own entry', async () => {
  const { recordAgentCall } = await import('../cowork-plugin/hooks/subagent-skill-router.js');
  const dir = mkdtempSync(join(tmpdir(), 'ccc-own-'));
  const prev = process.env.CCC_CONFIG_DIR;
  process.env.CCC_CONFIG_DIR = dir;
  const env = { CCC_CONFIG_DIR: dir };
  try {
    const call = (id, description, prompt) => recordAgentCall({ session_id: 's3', tool_name: 'Agent', tool_use_id: id, tool_input: { description, prompt } }, env);
    call('a', 'Review PR 12', 'Review this PR before I merge');
    call('b', 'Audit deps', 'Review this PR before I merge and list correctness bugs');
    const start = { session_id: 's3', agent_type: 'general-purpose' };
    // A worker carrying entry b's text consumes b, not the older a.
    run({ ...start, description: 'Audit deps', prompt: 'Review this PR before I merge and list correctness bugs' }, env);
    const out = ctx(run(start, env));
    assert.match(out, /For the task "Review PR 12"/);
    assert.match(out, /if that is not your task, ignore this block\./);
    const drained = ctx(run(start, env));
    assert.match(drained, /Pre-run check/, 'queue drained');
    assert.doesNotMatch(drained, /Review PR 12/);
  } finally {
    if (prev === undefined) delete process.env.CCC_CONFIG_DIR; else process.env.CCC_CONFIG_DIR = prev;
    rmSync(dir, { recursive: true, force: true });
  }
});

test('failed Agent calls are dropped synchronously', () => {
  const hooks = JSON.parse(readFileSync(join(HOOKS, 'hooks.json'), 'utf8')).hooks;
  for (const event of ['PostToolUseFailure', 'PermissionDenied']) {
    const h = hooks[event].flatMap((g) => g.hooks).find((x) => /logger\.js/.test(x.command));
    assert.ok(h && !h.async, `${event} logger must run synchronously`);
  }
});

test('always mode is never silent on an everyday work request, and stays quiet on quick questions', async () => {
  const { looksLikeWork, renderCheckContext } = await import('../cowork-plugin/hooks/lib/route-scorer.mjs');
  const fx = JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'fixtures', 'routing-everyday.json'), 'utf8'));
  const respond = (p) => {
    const c = scoreRoutes(p, routes);
    return renderRouteContext(c, tierFor(c, 'always'), 'claude-code', 'always') || (looksLikeWork(p) ? renderCheckContext('claude-code') : null);
  };
  const silent = fx.work.filter((p) => !respond(p));
  assert.deepEqual(silent, [], 'silent on work requests');
  // Most should name a skill, not just the generic check line.
  const named = fx.work.filter((p) => /Clear match|Likely match|Possible fit|Hidden skill/.test(respond(p) || ''));
  assert.ok(named.length / fx.work.length >= 0.7, `only ${named.length}/${fx.work.length} named a skill`);
  for (const q of fx.questions) assert.equal(respond(q), null, q);
});

test('headless routing never asks for a picker and drops side-effect skills', () => {
  const c = scoreRoutes('can you look over the diff before I push', routes);
  const out = renderRouteContext(c, 'medium', 'claude-code', 'auto', { headless: true });
  assert.match(out, /Headless, no menu/);
  assert.doesNotMatch(out, /AskUserQuestion/);
  const deploy = scoreRoutes('deploy this to fly', routes);
  assert.equal(renderRouteContext(deploy, tierFor(deploy, 'auto'), 'claude-code', 'auto', { headless: true }), null);
});

test('isHeadless: claude -p, CI and CCC_HEADLESS; the override wins', async () => {
  const { isHeadless } = await import('../cowork-plugin/hooks/lib/route-scorer.mjs');
  assert.equal(isHeadless({ CLAUDE_CODE_ENTRYPOINT: 'sdk-cli' }), true);
  assert.equal(isHeadless({ CLAUDE_CODE_ENTRYPOINT: 'cli' }), false);
  assert.equal(isHeadless({ CI: 'true' }), true);
  assert.equal(isHeadless({ CI: 'false' }), false);
  assert.equal(isHeadless({ CCC_HEADLESS: '1' }), true);
  assert.equal(isHeadless({ CCC_HEADLESS: '0', CI: '1' }), false);
});

test('a long worker task is scored past its preamble', async () => {
  const { scoreTask } = await import('../cowork-plugin/hooks/lib/route-scorer.mjs');
  const preamble = 'Shared rules: stay in your worktree, keep commits small, follow CLAUDE.md and the repo conventions. '.repeat(10);
  const task = `${preamble}\nTask: write unit tests for the date parser.`;
  assert.equal(scoreRoutes(task, routes).find((c) => c.route.id === 'ccc-testing'), undefined, 'the first 600 chars miss it');
  assert.equal(scoreTask(task, routes)[0].route.id, 'ccc-testing');
});

test('a worker whose task never reached the hook gets the pre-run check (workflow workers)', () => {
  const env = { CCC_CONFIG_DIR: mkdtempSync(join(tmpdir(), 'ccc-route-')) };
  try {
    const out = ctx(run({ hook_event_name: 'SubagentStart', session_id: 'wf', agent_type: 'general-purpose' }, env));
    assert.match(out, /Pre-run check/);
    assert.equal(ctx(run({ hook_event_name: 'SubagentStart', session_id: 'wf', agent_type: 'general-purpose' }, { ...env, CCC_ROUTE_MODE: 'off' })), undefined);
    // always mode: a task that matches nothing still gets the check.
    assert.match(ctx(run({ hook_event_name: 'SubagentStart', prompt: 'rename the user model to account' }, { ...env, CCC_ROUTE_MODE: 'always' })), /Pre-run check/);
  } finally {
    rmSync(env.CCC_CONFIG_DIR, { recursive: true, force: true });
  }
});
