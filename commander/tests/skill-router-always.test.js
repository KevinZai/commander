// "always" route mode and the SubagentStart skill router: CCC skills are
// evaluated on every prompt and handed to fleet/workflow subagents.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, existsSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
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

test('PreToolUse dispatcher does not queue a denied Agent call', async () => {
  const { dispatch } = await import('../cowork-plugin/hooks/orchestrator/pre-tool-use-dispatcher.js');
  const { readdirSync: rd } = await import('node:fs');
  const dir = mkdtempSync(join(tmpdir(), 'ccc-qdeny-'));
  const prev = { c: process.env.CCC_CONFIG_DIR, m: process.env.CCC_ROUTE_MODE };
  process.env.CCC_CONFIG_DIR = dir;
  process.env.CCC_ROUTE_MODE = 'always';
  try {
    const deny = join(dir, 'deny.mjs');
    const pass = join(dir, 'pass.mjs');
    writeFileSync(deny, "export function run() { return { hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'deny' } }; }");
    writeFileSync(pass, 'export function run() { return { continue: true }; }');
    const call = (id) => ({ session_id: 'q', tool_name: 'Agent', tool_use_id: id, tool_input: { prompt: 'Write unit tests for the cart reducer' } });
    const queue = join(dir, 'commander', 'route-state', 'q-agents');
    await dispatch(call('denied'), [{ name: 'secret-leak-guard', file: pathToFileURL(deny).href, role: 'enforce', ms: 2000 }]);
    assert.ok(!existsSync(queue) || rd(queue).length === 0, 'denied call not queued');
    await dispatch(call('allowed'), [{ name: 'secret-leak-guard', file: pathToFileURL(pass).href, role: 'enforce', ms: 2000 }]);
    assert.equal(rd(queue).filter((n) => n.endsWith('-allowed.json')).length, 1, 'allowed call queued');
  } finally {
    if (prev.c === undefined) delete process.env.CCC_CONFIG_DIR; else process.env.CCC_CONFIG_DIR = prev.c;
    if (prev.m === undefined) delete process.env.CCC_ROUTE_MODE; else process.env.CCC_ROUTE_MODE = prev.m;
    rmSync(dir, { recursive: true, force: true });
  }
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
    assert.match(out, /matched to you by spawn order; if it does not fit your task, ignore this block\./);
    assert.doesNotMatch(out, /Review PR 12/, 'no task text is stored or echoed');
    const drained = ctx(run(start, env));
    assert.match(drained, /Pre-run check/, 'queue drained');
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

test('a queued Agent call stores no task text; other sessions\' queues are never touched', async () => {
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
    assert.ok(readdirSync(root).includes('abandoned-agents'), 'another session\'s queue is left alone');
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
  const broken = [{ name: 'secret-leak-guard', file: './no-such-module.js', role: 'enforce', ms: 500 }, { name: 'cost-tracker', file: './also-missing.js', role: 'advisory', ms: 500 }];
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

test('PreToolUse dispatcher: deadlines cover import and run; a slow or broken budget check denies only when a ceiling is set', async () => {
  const { dispatch, budgetConfigured } = await import('../cowork-plugin/hooks/orchestrator/pre-tool-use-dispatcher.js');
  const dir = mkdtempSync(join(tmpdir(), 'ccc-disp-'));
  try {
    // A handler module whose import never finishes.
    const slow = join(dir, 'slow.mjs');
    writeFileSync(slow, 'await new Promise(() => {}); export function run() {}');
    const t0 = Date.now();
    const out = await dispatch({ tool_name: 'Read', tool_input: {} }, [{ name: 'cost-tracker', file: pathToFileURL(slow).href, role: 'advisory', ms: 300 }]);
    assert.ok(Date.now() - t0 < 2000, 'the deadline covers the import');
    assert.notEqual(out?.hookSpecificOutput?.permissionDecision, 'deny');
    const late = join(dir, 'late-deny.mjs');
    writeFileSync(late, "export async function run() { await new Promise((r) => setTimeout(r, 2000)); return { hookSpecificOutput: { permissionDecision: 'deny' } }; }");
    const budget = [{ name: 'cost-ceiling-enforcer', file: pathToFileURL(late).href, role: 'budget', ms: 200 }];
    const prev = process.env.CCC_COST_CEILING;
    process.env.CCC_COST_CEILING = '5';
    try {
      assert.equal(await budgetConfigured(), true);
      assert.equal((await dispatch({ tool_name: 'Read', tool_input: {} }, budget)).hookSpecificOutput.permissionDecision, 'deny');
      process.env.CCC_COST_CEILING = '0';
      assert.notEqual((await dispatch({ tool_name: 'Read', tool_input: {} }, budget))?.hookSpecificOutput?.permissionDecision, 'deny');
    } finally {
      if (prev === undefined) delete process.env.CCC_COST_CEILING; else process.env.CCC_COST_CEILING = prev;
    }
    // Input that is not a JSON object is denied, never read as {}.
    assert.equal((await dispatch(null)).hookSpecificOutput.permissionDecision, 'deny');
    const bad = spawnSync(process.execPath, [join(HOOKS, 'orchestrator', 'pre-tool-use-dispatcher.js')], { input: '{not json', encoding: 'utf8' });
    assert.equal(JSON.parse(bad.stdout).hookSpecificOutput.permissionDecision, 'deny');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('config protection denies an edit with no identifiable target; queue files are only touched in a real queue dir', async () => {
  const cp = spawnSync(process.execPath, [join(HOOKS, 'config-protection.js')], { input: JSON.stringify({ tool_name: 'Write', tool_input: {} }), encoding: 'utf8' });
  assert.equal(JSON.parse(cp.stdout).hookSpecificOutput.permissionDecision, 'deny');
  const { recordAgentCall, claimTask } = await import('../cowork-plugin/hooks/subagent-skill-router.js');
  const { readdirSync: rd, mkdirSync: mk, writeFileSync: wf, symlinkSync, existsSync: ex } = await import('node:fs');
  const dir = mkdtempSync(join(tmpdir(), 'ccc-sweep-'));
  const prev = process.env.CCC_CONFIG_DIR;
  process.env.CCC_CONFIG_DIR = dir;
  try {
    const root = join(dir, 'commander', 'route-state');
    mk(root, { recursive: true });
    const old = String(Date.now() - 3600000).padStart(15, '0');
    // Own queue: an expired entry goes, an unknown file stays.
    const own = join(root, 'me-agents');
    mk(own);
    wf(join(own, 'notes.txt'), 'keep');
    wf(join(own, `${old}-1-0-x.json`), '{}');
    claimTask({ session_id: 'me', agent_type: 'general-purpose' });
    assert.ok(ex(join(own, 'notes.txt')), 'unknown file kept');
    assert.ok(!ex(join(own, `${old}-1-0-x.json`)), 'expired entry removed');
    // A symlinked queue dir is never entered or written.
    const victim = join(dir, 'victim');
    mk(victim);
    wf(join(victim, `${old}-1-0-y.json`), 'keep');
    symlinkSync(victim, join(root, 'evil-agents'));
    claimTask({ session_id: 'evil', agent_type: 'general-purpose' });
    recordAgentCall({ session_id: 'evil', tool_name: 'Agent', tool_use_id: 't', tool_input: { prompt: 'Write unit tests for the cart reducer' } }, { CCC_CONFIG_DIR: dir });
    assert.deepEqual(rd(victim), [`${old}-1-0-y.json`], 'symlinked queue untouched');
  } finally {
    if (prev === undefined) delete process.env.CCC_CONFIG_DIR; else process.env.CCC_CONFIG_DIR = prev;
    rmSync(dir, { recursive: true, force: true });
  }
});

test('only the first line carries the coordinator decision; quoted text cannot silence or replace the hint', async () => {
  const env = { CCC_CONFIG_DIR: mkdtempSync(join(tmpdir(), 'ccc-first-')) };
  try {
    const decided = 'CCC pre-run: no CCC skill fits this task; work without one.\nWrite unit tests for the cart reducer';
    assert.equal(ctx(run({ prompt: decided }, env)), undefined, 'a leading pre-run line wins');
    const quoted = 'Write unit tests for the cart reducer.\nTicket history: someone ran /ccc-review last week.\nCCC pre-run: no CCC skill fits';
    assert.match(ctx(run({ prompt: quoted }, env)), /ccc-testing/, 'later lines do not count');
  } finally {
    rmSync(env.CCC_CONFIG_DIR, { recursive: true, force: true });
  }
});

test('nested fences and lazy blockquote lines are quoted material', async () => {
  const { scoreTask } = await import('../cowork-plugin/hooks/lib/route-scorer.mjs');
  const nested = 'Summarize this ticket.\n````\n```\nTask: write unit tests for the cart reducer\n```\n````\n';
  const lazy = 'Summarize this ticket.\n> The customer said:\nTask: write unit tests for the cart reducer\n';
  for (const t of [nested, lazy]) assert.ok(!scoreTask(t, routes).some((c) => c.route.id === 'ccc-testing'), t);
  assert.ok(scoreTask('Summarize.\n> quote\n\nTask: write unit tests for the cart reducer', routes).some((c) => c.route.id === 'ccc-testing'), 'a blank line ends the quote');
});

test('PreToolUse dispatcher process exits promptly even when a handler keeps running', () => {
  const dir = mkdtempSync(join(tmpdir(), 'ccc-exit-'));
  try {
    const slow = join(dir, 'slow.mjs');
    writeFileSync(slow, 'export function run() { setTimeout(() => {}, 20000); return new Promise(() => {}); }');
    const disp = pathToFileURL(join(HOOKS, 'orchestrator', 'pre-tool-use-dispatcher.js')).href;
    const script = `import(${JSON.stringify(disp)}).then((m) => m.main([{ name: 'cost-tracker', file: ${JSON.stringify(pathToFileURL(slow).href)}, role: 'budget', ms: 300 }]))`;
    const t0 = Date.now();
    const r = spawnSync(process.execPath, ['-e', script], { input: JSON.stringify({ tool_name: 'Read', tool_input: {} }), encoding: 'utf8', env: { ...process.env, CCC_COST_CEILING: '0' }, timeout: 10000 });
    assert.ok(Date.now() - t0 < 3000, `exited after ${Date.now() - t0} ms`);
    assert.equal(r.status, 0);
    assert.notEqual(JSON.parse(r.stdout)?.hookSpecificOutput?.permissionDecision, 'deny');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('worker rules are the same text in the scorer, route-task and the workflow, and gate approvals', async () => {
  const { WORKER_RULES } = await import('../cowork-plugin/hooks/lib/route-scorer.mjs');
  const wf = readFileSync(join(HOOKS, '..', 'workflows', 'ccc-fleet-run.workflow.js'), 'utf8');
  assert.ok(wf.includes(JSON.stringify(WORKER_RULES)), 'workflow copy matches');
  assert.match(WORKER_RULES, /do not proceed and report the decision/);
  assert.doesNotMatch(WORKER_RULES, /recommended option/);
});

test('blockquotes and tilde fences are quoted material for task scoring', async () => {
  const { scoreTask } = await import('../cowork-plugin/hooks/lib/route-scorer.mjs');
  for (const t of ['Summarize this ticket.\n> Task: write unit tests for the cart reducer\n', 'Summarize this ticket.\n~~~\nTask: write unit tests for the cart reducer\n~~~\n']) {
    assert.ok(!scoreTask(t, routes).some((c) => c.route.id === 'ccc-testing'), t);
  }
});

test('with a ceiling set, an unreadable budget counter blocks the call', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'ccc-ceil-'));
  try {
    // The counter path is a directory: reading it fails with something other than ENOENT.
    const { mkdirSync: mk } = await import('node:fs');
    mk(join(dir, 'commander', 'sessions', 'active-cost-s1.json'), { recursive: true });
    const run1 = (ceiling) => spawnSync(process.execPath, [join(HOOKS, 'cost-ceiling-enforcer.js')], {
      input: JSON.stringify({ session_id: 's1', tool_name: 'Read', tool_input: {} }), encoding: 'utf8',
      env: { ...process.env, CCC_CONFIG_DIR: dir, CCC_COST_CEILING: ceiling, CCC_TELEMETRY: '0' },
    });
    assert.equal(JSON.parse(run1('5').stdout).hookSpecificOutput.permissionDecision, 'deny');
    assert.notEqual(JSON.parse(run1('0').stdout)?.hookSpecificOutput?.permissionDecision, 'deny');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('PreToolUse dispatcher: a handler blocked in JavaScript or a native call cannot hold the process past its deadline', () => {
  const dir = mkdtempSync(join(tmpdir(), 'ccc-busy-'));
  try {
    const busy = join(dir, 'busy.mjs');
    writeFileSync(busy, "export function run() { const e = Date.now() + 9000; while (Date.now() < e) {} return { systemMessage: 'late' }; }");
    const native = join(dir, 'native.mjs');
    writeFileSync(native, "import { spawnSync } from 'node:child_process'; export function run() { spawnSync(process.execPath, ['-e', 'setTimeout(() => {}, 9000)']); return { systemMessage: 'late' }; }");
    const disp = pathToFileURL(join(HOOKS, 'orchestrator', 'pre-tool-use-dispatcher.js')).href;
    for (const [file, ceiling, denied] of [[busy, '0', false], [busy, '5', true], [native, '0', false], [native, '5', true]]) {
      const handlers = `[{ name: 'cost-tracker', file: ${JSON.stringify(pathToFileURL(file).href)}, role: 'budget', ms: 400 }, { name: 'secret-leak-guard', file: '../secret-leak-guard.js', role: 'enforce', ms: 2500 }]`;
      const t0 = Date.now();
      const r = spawnSync(process.execPath, ['-e', `import(${JSON.stringify(disp)}).then((m) => m.main(${handlers}))`],
        { input: JSON.stringify({ tool_name: 'Write', tool_input: { file_path: 'a', content: 'hello' } }), encoding: 'utf8', env: { ...process.env, CCC_COST_CEILING: ceiling }, timeout: 15000 });
      assert.ok(Date.now() - t0 < 3000, `exited after ${Date.now() - t0} ms`);
      assert.equal(r.status, 0);
      assert.equal(JSON.parse(r.stdout)?.hookSpecificOutput?.permissionDecision === 'deny', denied, `${file} ceiling ${ceiling}`);
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('the coordinator decision is the start of the prompt only; a matched queue decision is honoured', async () => {
  const { coordinatorDecided, recordAgentCall } = await import('../cowork-plugin/hooks/subagent-skill-router.js');
  assert.equal(coordinatorDecided('/ccc-testing for the cart reducer'), true);
  assert.equal(coordinatorDecided('CCC pre-run: no CCC skill fits this task; work without one.'), true);
  assert.equal(coordinatorDecided('Summarize the /ccc-testing discussion'), false, 'a mention is not a decision');
  const dir = mkdtempSync(join(tmpdir(), 'ccc-decide-'));
  const prev = process.env.CCC_CONFIG_DIR;
  process.env.CCC_CONFIG_DIR = dir;
  const env = { CCC_CONFIG_DIR: dir, CCC_ROUTE_MODE: 'always' };
  try {
    // A description cannot silence routing for an explicit testing prompt.
    assert.match(ctx(run({ description: 'Summarize the /ccc-testing discussion', prompt: 'Write unit tests for the cart reducer' }, env)), /ccc-testing/);
    // The dispatched prompt named its skill; the worker sees only the description and must stay silent.
    const desc = 'Cart reducer tests';
    recordAgentCall({ session_id: 's1', tool_name: 'Agent', tool_use_id: 'u1', tool_input: { description: desc, prompt: '/ccc-review the cart reducer tests' } }, env);
    assert.equal(ctx(run({ session_id: 's1', agent_type: 'general-purpose', description: desc }, env)), undefined);
  } finally {
    if (prev === undefined) delete process.env.CCC_CONFIG_DIR; else process.env.CCC_CONFIG_DIR = prev;
    rmSync(dir, { recursive: true, force: true });
  }
});

test('indented code, double-backtick spans are quoted; a heading ends a quote', async () => {
  const { scoreTask } = await import('../cowork-plugin/hooks/lib/route-scorer.mjs');
  const has = (t) => scoreTask(t, routes).some((c) => c.route.id === 'ccc-testing');
  assert.equal(has('Summarize this ticket.\n\n    Task: write unit tests for the cart reducer\n'), false);
  assert.equal(has('Summarize this: ``write unit tests for the `cart` reducer`` please'), false);
  assert.equal(has('Summarize.\n> quote\n## Task: write unit tests for the cart reducer'), true);
});

test('a symlinked queue root is never written through', async () => {
  const { recordAgentCall } = await import('../cowork-plugin/hooks/subagent-skill-router.js');
  const { mkdirSync: mk, symlinkSync, readdirSync: rd } = await import('node:fs');
  const dir = mkdtempSync(join(tmpdir(), 'ccc-qroot-'));
  const prev = process.env.CCC_CONFIG_DIR;
  process.env.CCC_CONFIG_DIR = dir;
  try {
    const victim = join(dir, 'victim');
    mk(victim);
    mk(join(dir, 'commander'), { recursive: true });
    symlinkSync(victim, join(dir, 'commander', 'route-state'));
    recordAgentCall({ session_id: 'x', tool_name: 'Agent', tool_use_id: 't', tool_input: { prompt: 'Write unit tests for the cart reducer' } }, { CCC_CONFIG_DIR: dir });
    assert.deepEqual(rd(victim), [], 'nothing created under the symlink target');
  } finally {
    if (prev === undefined) delete process.env.CCC_CONFIG_DIR; else process.env.CCC_CONFIG_DIR = prev;
    rmSync(dir, { recursive: true, force: true });
  }
});

test('the tool-call ceiling: a corrupt counter or unreadable config blocks; the warning needs a committed write', async () => {
  const { run: track } = await import('../cowork-plugin/hooks/cost-tracker.js');
  const { updateJson } = await import('../cowork-plugin/hooks/lib/atomic-json.mjs');
  const dir = mkdtempSync(join(tmpdir(), 'ccc-ceil-'));
  try {
    const f = join(dir, 'c.json');
    writeFileSync(f, '{broken');
    await assert.rejects(updateJson(f, (c) => c, { strict: true }), /JSON|Unexpected|Expected/);
    assert.equal(readFileSync(f, 'utf8'), '{broken', 'corrupt counter is not reset');
    // A lock whose writer is gone is broken at once, not after staleMs.
    writeFileSync(`${f}.lock`, '2147483646');
    writeFileSync(f, '{}');
    const r = await updateJson(f, () => ({ n: 1 }), { requireLock: true, waitMs: 50 });
    assert.equal(r.locked, true);
    assert.equal(typeof track, 'function');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('round 5: generated pre-run lines only, multiline code spans, damaged counters, capped answers', async () => {
  const { coordinatorDecided } = await import('../cowork-plugin/hooks/subagent-skill-router.js');
  assert.equal(coordinatorDecided('CCC pre-run notes need proofreading'), false);
  assert.equal(coordinatorDecided('CCC pre-run: no CCC skill fits this task; work without one.'), true);
  assert.equal(coordinatorDecided('CCC pre-run (CC Commander 8.1.7): load /ccc-testing where it fits this task.'), true);
  const { scoreTask } = await import('../cowork-plugin/hooks/lib/route-scorer.mjs');
  const has = (t) => scoreTask(t, routes).some((c) => c.route.id === 'ccc-testing');
  assert.equal(has('Summarize this:\n``write unit tests\nfor the cart reducer`` please'), false);
  assert.equal(has('Write unit tests for the `cart` reducer'), true);
  const { validCounter } = await import('../cowork-plugin/hooks/cost-ceiling-enforcer.js');
  assert.equal(validCounter({ toolCalls: 3, estimatedCost: 0.03 }), true);
  assert.equal(validCounter({ toolCalls: 'many' }), false);
  assert.equal(validCounter({ toolCalls: -1 }), false);
  const { envCeiling } = await import('../cowork-plugin/hooks/orchestrator/budget-config.mjs');
  assert.deepEqual(['5', 'off', '0', 'junk', ''].map(envCeiling), [5, 0, 0, undefined, undefined]);
  const { mergeOutputs, MAX_TEXT } = await import('../cowork-plugin/hooks/orchestrator/pre-tool-use-dispatcher.js');
  const big = mergeOutputs([{ hookSpecificOutput: { permissionDecision: 'deny', permissionDecisionReason: 'x'.repeat(300000) } }]);
  assert.equal(big.hookSpecificOutput.permissionDecision, 'deny');
  assert.ok(JSON.stringify(big).length < MAX_TEXT * 3, 'a deny stays small');
});
