'use strict';
// Codex names tools differently from Claude Code (apply_patch, Bash); the
// mirror must translate PreToolUse/PostToolUse/PermissionRequest matchers so
// edit guards fire on Codex and Claude-only matchers do not ship as dead hooks.
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const TRANSLATE = pathToFileURL(path.join(__dirname, '..', 'adapters', 'codex', 'translate.js')).href;

test('translateMatcher maps Claude edit tools to apply_patch and keeps Bash', async () => {
  const { translateMatcher } = await import(TRANSLATE);
  assert.equal(translateMatcher('Write|Edit|MultiEdit'), 'apply_patch');
  assert.equal(translateMatcher('Bash'), 'Bash');
  assert.equal(translateMatcher('Bash|Write'), 'Bash|apply_patch');
  assert.equal(translateMatcher('Bash|Read|Glob'), 'Bash');
  assert.equal(translateMatcher('mcp__context7__query-docs'), 'mcp__context7__query-docs');
});

test('translateMatcher returns null for Claude-only matchers and passes wildcards and regexes through', async () => {
  const { translateMatcher } = await import(TRANSLATE);
  assert.equal(translateMatcher('AskUserQuestion'), null);
  assert.equal(translateMatcher('Agent|Skill|Workflow'), null);
  assert.equal(translateMatcher('*'), '*');
  assert.equal(translateMatcher(undefined), undefined);
  assert.equal(translateMatcher('^(Write|Edit)$'), '^(Write|Edit)$');
});

test('translateHooks drops tool groups whose matcher names only Claude-only tools', async () => {
  const { translateHooks } = await import(TRANSLATE);
  const claude = { hooks: { PreToolUse: [
    { matcher: 'Write|Edit', hooks: [{ type: 'command', command: 'node "${CLAUDE_PLUGIN_ROOT}/hooks/x.js"', timeout: 5 }] },
    { matcher: 'AskUserQuestion', hooks: [{ type: 'command', command: 'node "${CLAUDE_PLUGIN_ROOT}/hooks/y.js"', timeout: 5 }] },
    { matcher: '*', hooks: [{ type: 'command', command: 'node "${CLAUDE_PLUGIN_ROOT}/hooks/z.js"', timeout: 5 }] },
  ] } };
  const capabilities = { supportedEvents: ['PreToolUse'], droppedFromClaude: [], codexVersion: 'test' };
  const out = translateHooks(claude, { capabilities, hookMap: { events: { PreToolUse: { codex: 'PreToolUse', status: 'supported' } } } });
  const groups = out.hooks.PreToolUse;
  assert.equal(groups.length, 2, 'the AskUserQuestion-only group is dropped');
  assert.equal(groups[0].matcher, 'apply_patch');
  assert.equal(groups[1].matcher, '*');
});
