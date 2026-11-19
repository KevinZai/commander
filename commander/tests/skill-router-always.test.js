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
  followable, sideEffectSkills, HINT_THRESHOLD,
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
  for (const id of sideEffectSkills()) assert.ok(existsSync(join(HOOKS, '..', 'skills', id, 'SKILL.md')), `${id} has no SKILL.md`);
});

test('a weak match gets a one-line hint in always mode only', () => {
  const weak = scoreRoutes('brainstorm some onboarding ideas', routes).map((c) => ({ ...c, score: HINT_THRESHOLD }));
  assert.equal(tierFor(weak, 'always'), 'hint');
  assert.equal(tierFor(weak, 'auto'), 'low');
  assert.match(renderRouteContext(weak, 'hint', 'claude-code', 'always'), /CCC skills that may help/);
});

test('subagent context names the matching skill and skips manual ones outside always', () => {
  const tests = scoreRoutes('Write unit tests for the cart reducer', routes);
  assert.match(renderSubagentContext(tests, 'claude-code', 'auto'), /Skill commander:ccc-testing/);
  // ccc-review starts other agents on its deep path: never handed to a worker.
  const review = scoreRoutes('Review this PR before I merge and list correctness bugs', routes);
  assert.equal(renderSubagentContext(review, 'claude-code', 'always'), null);
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
    const input = { hook_event_name: 'SubagentStart', prompt: 'Write unit tests for the cart reducer' };
    assert.match(ctx(run(input, env)), /ccc-testing/);
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
    input: JSON.stringify({ prompt: 'Write unit tests for the cart reducer' }), encoding: 'utf8',
  });
  assert.equal(ok.status, 0);
  assert.match(JSON.parse(ok.stdout).hookSpecificOutput.additionalContext, /ccc-testing/);
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
  for (const id of FOLLOWABLE_HIDDEN_SKILLS) assert.ok(!sideEffectSkills().has(id), id);
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
    call('tu1', 'general-purpose', 'Write unit tests for the cart reducer');
    call('tu2', 'general-purpose', 'hello there');
    call('tu3', 'Explore', 'Write unit tests for the cart reducer');
    recordAgentCall({ session_id: 's1', tool_name: 'Bash', tool_input: { command: 'ls' } });
    const start = { session_id: 's1', agent_type: 'general-purpose', hook_event_name: 'SubagentStart' };
    assert.match(ctx(run(start, env)), /ccc-testing/, 'first worker gets the first call');
    assert.equal(ctx(run(start, env)), undefined, 'second worker gets its own (non-matching) task');
    // Nothing left for this type: a worker with no task text gets the generic pre-run check.
    assert.match(ctx(run(start, env)), /Pre-run check/, 'nothing left for this type');
    assert.match(ctx(run({ ...start, agent_type: 'Explore' }, env)), /ccc-testing/);
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
  assert.match(src, /AGENT_TOOLS\.has\(tool\) && merged\?\.hookSpecificOutput\?\.permissionDecision !== 'deny'\)\s*\{\s*try \{ \(await load\(ROUTER\.file, 'recordAgentCall'\)\)\(input\)/);
});

test('a queue-matched hint names its task; a worker with its own task takes only its own entry', async () => {
  const { recordAgentCall } = await import('../cowork-plugin/hooks/subagent-skill-router.js');
  const dir = mkdtempSync(join(tmpdir(), 'ccc-own-'));
  const prev = process.env.CCC_CONFIG_DIR;
  process.env.CCC_CONFIG_DIR = dir;
  const env = { CCC_CONFIG_DIR: dir };
  try {
    const call = (id, description, prompt) => recordAgentCall({ session_id: 's3', tool_name: 'Agent', tool_use_id: id, tool_input: { description, prompt } }, env);
    call('a', 'Review PR 12', 'Write unit tests for the cart reducer');
    call('b', 'Audit deps', 'Write unit tests for the cart reducer and the checkout form');
    const start = { session_id: 's3', agent_type: 'general-purpose' };
    // A worker carrying entry b's text consumes b, not the older a.
    run({ ...start, description: 'Audit deps', prompt: 'Write unit tests for the cart reducer and the checkout form' }, env);
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

test('isHeadless: CI and CCC_HEADLESS; the override wins; the entrypoint alone is not enough', async () => {
  const { isHeadless } = await import('../cowork-plugin/hooks/lib/route-scorer.mjs');
  // Remote Control and SDK sessions report sdk-cli while a person answers pickers.
  assert.equal(isHeadless({ CLAUDE_CODE_ENTRYPOINT: 'sdk-cli' }), false);
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

test('a queued Agent call stores no task text, and expired queues of other sessions are swept', async () => {
  const { recordAgentCall } = await import('../cowork-plugin/hooks/subagent-skill-router.js');
  const { readdirSync, readFileSync: rf, mkdirSync: mk, writeFileSync: wf } = await import('node:fs');
  const dir = mkdtempSync(join(tmpdir(), 'ccc-priv-'));
  const prev = process.env.CCC_CONFIG_DIR;
  process.env.CCC_CONFIG_DIR = dir;
  try {
    const root = join(dir, 'commander', 'route-state');
    const stale = join(root, 'abandoned-agents');
    mk(stale, { recursive: true });
    wf(join(stale, `${String(Date.now() - 3600000).padStart(15, '0')}-1-0-x.json`), '{"text":"private ticket"}');
    const secret = 'Write unit tests for the cart reducer. Customer ACME-4471 data lives in prod.';
    recordAgentCall({ session_id: 's9', tool_name: 'Agent', tool_use_id: 't', tool_input: { description: 'tests', prompt: secret } }, { CCC_CONFIG_DIR: dir });
    const q = join(root, 's9-agents');
    const [file] = readdirSync(q);
    const body = rf(join(q, file), 'utf8');
    assert.doesNotMatch(body, /ACME|cart reducer/);
    assert.match(body, /ccc-testing/);
    assert.ok(!readdirSync(root).includes('abandoned-agents'), 'stale queue swept');
    const start = { session_id: 's9', agent_type: 'general-purpose' };
    assert.match(ctx(run({ ...start, description: 'tests', prompt: secret }, { CCC_CONFIG_DIR: dir })), /ccc-testing/);
  } finally {
    if (prev === undefined) delete process.env.CCC_CONFIG_DIR; else process.env.CCC_CONFIG_DIR = prev;
    rmSync(dir, { recursive: true, force: true });
  }
});

test('quoted task lines and text past TASK_CHARS do not pick a worker skill', async () => {
  const { scoreTask, TASK_CHARS } = await import('../cowork-plugin/hooks/lib/route-scorer.mjs');
  const quoted = 'Summarize this ticket.\n```\nTask: write unit tests for the cart reducer\n```\n';
  assert.ok(!scoreTask(quoted, routes).some((c) => c.route.id === 'ccc-testing'));
  const late = 'Summarize the ticket. '.repeat(Math.ceil(TASK_CHARS / 20)) + '\nTask: write unit tests for the cart reducer';
  assert.ok(!scoreTask(late, routes).some((c) => c.route.id === 'ccc-testing'));
});

test('headless suggest mode only names a skill; never asks it to run', () => {
  const c = scoreRoutes('Write unit tests for the cart reducer', routes);
  const out = renderRouteContext(c, 'medium', 'claude-code', 'suggest', { headless: true });
  assert.match(out, /do not run it unless the task asks/);
  assert.doesNotMatch(out, /invoke Skill/);
});

test('workers get only worker skills: never hidden, delegating or side-effect ones', async () => {
  const { workerEligible } = await import('../cowork-plugin/hooks/lib/route-scorer.mjs');
  const byId = Object.fromEntries(routes.map((r) => [r.id, r]));
  for (const id of ['ccc-review', 'ccc-fleet', 'ccc-changelog', 'ccc-deploy', 'ccc-build', 'ccc']) assert.equal(workerEligible(byId[id]), false, id);
  assert.equal(workerEligible(byId['ccc-testing']), true);
  assert.equal(workerEligible({ ...byId['ccc-testing'], worker: undefined }), false, 'older registry: nothing');
});

test('the ambient ticker drops picker notes when headless', async () => {
  const { emitNotes } = await import('../cowork-plugin/hooks/suggest-ticker.js');
  const notes = ['offer it via AskUserQuestion with options [x]', 'plain note'];
  assert.doesNotMatch(JSON.stringify(emitNotes(notes, { CCC_HEADLESS: '1' })), /AskUserQuestion/);
  assert.match(JSON.stringify(emitNotes(notes, { CCC_HEADLESS: '0' })), /AskUserQuestion/);
});

test('PreToolUse dispatcher: a broken router never blocks; a broken secret guard blocks only what it scans', async () => {
  const { dispatch } = await import('../cowork-plugin/hooks/orchestrator/pre-tool-use-dispatcher.js');
  const broken = [{ name: 'secret-leak-guard', file: './no-such-module.js', role: 'enforce' }, { name: 'cost-tracker', file: './also-missing.js', role: 'advisory' }];
  const read = await dispatch({ tool_name: 'Read', tool_input: { file_path: 'x' } }, broken);
  assert.notEqual(read?.hookSpecificOutput?.permissionDecision, 'deny');
  const write = await dispatch({ tool_name: 'Write', tool_input: { file_path: 'x', content: 'y' } }, broken);
  assert.equal(write.hookSpecificOutput.permissionDecision, 'deny');
  assert.match(write.hookSpecificOutput.permissionDecisionReason, /could not scan/);
  // The routing modules are not imported for a non-Agent call.
  const src = readFileSync(join(HOOKS, 'orchestrator', 'pre-tool-use-dispatcher.js'), 'utf8');
  assert.doesNotMatch(src, /^import .*subagent-skill-router/m);
  assert.doesNotMatch(src, /^import .*route-scorer/m);
});

test('secret guard denies a scanned call when its patterns cannot be read', async () => {
  const { scanFailed, toolShouldBeScanned } = await import('../cowork-plugin/hooks/secret-leak-guard.js');
  assert.equal(scanFailed('Write', 'x').hookSpecificOutput.permissionDecision, 'deny');
  assert.equal(toolShouldBeScanned('Read'), false);
  assert.equal(toolShouldBeScanned('mcp__x__y'), true);
});
