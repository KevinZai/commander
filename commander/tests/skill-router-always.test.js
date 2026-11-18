// "always" route mode and the SubagentStart skill router: CCC skills are
// evaluated on every prompt and handed to fleet/workflow subagents.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, existsSync } from 'node:fs';
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
  assert.match(renderSubagentContext(brainstorm, 'claude-code', 'always'), /ccc-brainstorm/);
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
