#!/usr/bin/env node
/**
 * context-budget.js — the plugin's model-visible context cost, measured and held to a budget.
 *
 * Measures, from disk, in approximate tokens (chars / 3.6, fixed so the number is stable across machines;
 * Claude's tokenizer is not public):
 *   1. skill + workflow listing  — scripts/measure-listing.js (model-invocable skills only)
 *   2. agent listing             — scripts/measure-listing.js
 *   3. MCP tool definitions      — the bundled servers in .mcp.json. With `alwaysLoad: false` they stay behind
 *      tool search: only tool names and server instructions load, so their definitions cost 0 here
 *      (code.claude.com/docs/en/mcp#defer-a-servers-tools). A server without it is reported as
 *      `upfront (unknown size)` and fails --check, because its schemas would load on every turn.
 *   4. hook-injected text        — what the hooks put in front of the model on a fresh session: the
 *      SessionStart handlers and the UserPromptSubmit handlers on a neutral first prompt, run for real in a
 *      throwaway HOME, offline, outside any git repo. Only model-facing text counts (additionalContext,
 *      plus systemMessage, which the orchestrator mirrors into context).
 *
 * The budget lives in commander/context-budget.json (`budget_tokens`), with the last measurement beside it.
 *
 * Usage:
 *   node scripts/context-budget.js            # table
 *   node scripts/context-budget.js --json     # JSON
 *   node scripts/context-budget.js --check    # exit 1 if over budget or a bundled MCP server loads upfront
 *   node scripts/context-budget.js --write    # record the measurement; set the budget to measured + 10%
 *                                             # only when none exists or --rebase is passed
 */
'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { measure } = require('./measure-listing.js');

const ROOT = path.resolve(__dirname, '..');
const PLUGIN = path.join(ROOT, 'commander', 'cowork-plugin');
const BUDGET_FILE = path.join(ROOT, 'commander', 'context-budget.json');
const CHARS_PER_TOKEN = 3.6;
const HEADROOM = 1.1;

const counter = { method: `chars / ${CHARS_PER_TOKEN}`, count: (text) => Math.ceil(String(text).length / CHARS_PER_TOKEN) };

function mcpServers() {
  let cfg = {};
  try { cfg = JSON.parse(fs.readFileSync(path.join(PLUGIN, '.mcp.json'), 'utf8')); } catch { /* none */ }
  return Object.entries(cfg.mcpServers || {}).map(([name, s]) => ({
    name,
    deferred: s.alwaysLoad === false,
    tokens: 0,
    note: s.alwaysLoad === false ? 'deferred (tool search)' : 'upfront (unknown size)',
  }));
}

function modelText(out) {
  if (!out || typeof out !== 'object') return '';
  const parts = [];
  if (typeof out.hookSpecificOutput?.additionalContext === 'string') parts.push(out.hookSpecificOutput.additionalContext);
  // The SessionStart orchestrator mirrors systemMessage into additionalContext; count it once.
  if (typeof out.systemMessage === 'string' && !parts.some((p) => p.includes(out.systemMessage))) parts.push(out.systemMessage);
  return parts.join('\n');
}

function hookInjection() {
  const cfg = JSON.parse(fs.readFileSync(path.join(PLUGIN, 'hooks', 'hooks.json'), 'utf8'));
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'ccc-ctx-budget-'));
  const cwd = path.join(home, 'project');
  fs.mkdirSync(cwd);
  const rows = [];
  try {
    const events = [
      ['SessionStart', { hook_event_name: 'SessionStart', source: 'startup', session_id: 'budget', cwd }],
      ['UserPromptSubmit', { hook_event_name: 'UserPromptSubmit', session_id: 'budget', cwd, prompt: 'Rename the helper in utils.js.' }],
    ];
    for (const [event, payload] of events) {
      for (const h of (cfg.hooks[event] || []).flatMap((g) => g.hooks)) {
        if (h.async) continue;   // async output arrives later, if ever; not part of the first turn
        const r = spawnSync('/bin/sh', ['-c', h.command], {
          cwd,
          input: JSON.stringify(payload),
          encoding: 'utf8',
          timeout: h.timeout * 1000,
          env: {
            PATH: process.env.PATH,
            HOME: home,
            CLAUDE_CONFIG_DIR: path.join(home, '.claude'),
            CLAUDE_PLUGIN_ROOT: PLUGIN,
            CLAUDE_PLUGIN_DATA: path.join(home, 'plugin-data'),
            CCC_OFFLINE: '1',
            CCC_TELEMETRY: '0',
            MCP_DISABLED: '1',
            CC_NO_COLOR: '1',
            CC_NO_ANIMATION: '1',
          },
        });
        let text = '';
        for (const line of String(r.stdout || '').trim().split('\n')) {
          try { text += modelText(JSON.parse(line)); } catch { /* not JSON: not model-facing */ }
        }
        const file = (/\/hooks\/([\w./-]+\.js)"/.exec(h.command) || [])[1] || h.command;
        // A hook that could not start, timed out or exited non-zero was not measured.
        const failed = r.error ? String(r.error.code || r.error.message) : r.status !== 0 ? `exit ${r.status === null ? r.signal : r.status}` : null;
        rows.push({ event, handler: file, chars: text.length, tokens: text ? counter.count(text) : 0, ...(failed ? { failed } : {}) });
      }
    }
  } finally {
    fs.rmSync(home, { recursive: true, force: true });
  }
  return rows;
}

function measureAll() {
  const listing = measure({ pluginDir: PLUGIN, counter });
  const mcp = mcpServers();
  const hooks = hookInjection();
  const parts = {
    skill_listing: listing.listing.tokens,
    agent_listing: listing.agents.tokens,
    mcp_tool_definitions: mcp.reduce((n, s) => n + s.tokens, 0),
    hook_injected: hooks.reduce((n, r) => n + r.tokens, 0),
  };
  const total = Object.values(parts).reduce((a, b) => a + b, 0);
  return { method: counter.method, total_tokens: total, parts, mcp, hooks, skills_listed: listing.skills.entries, agents_listed: listing.agents.entries };
}

function readBudget() {
  try { return JSON.parse(fs.readFileSync(BUDGET_FILE, 'utf8')); } catch { return null; }
}

function main(argv = process.argv.slice(2)) {
  const m = measureAll();
  const file = readBudget();

  if (argv.includes('--write')) {
    const budget = !file || argv.includes('--rebase') ? Math.ceil(m.total_tokens * HEADROOM) : file.budget_tokens;
    const out = {
      description: 'Model-visible context budget for the Commander plugin, in approximate tokens. Measured by scripts/context-budget.js; --check fails CI above budget_tokens. Raise the budget only on purpose (--write --rebase) and say why in the commit.',
      method: m.method,
      budget_tokens: budget,
      measured_tokens: m.total_tokens,
      parts: m.parts,
    };
    fs.writeFileSync(BUDGET_FILE, JSON.stringify(out, null, 2) + '\n');
    process.stdout.write(`context budget: measured ${m.total_tokens} tokens, budget ${budget} -> ${path.relative(ROOT, BUDGET_FILE)}\n`);
    return 0;
  }

  if (argv.includes('--json')) {
    process.stdout.write(JSON.stringify({ ...m, budget_tokens: file?.budget_tokens ?? null }, null, 2) + '\n');
  } else if (!argv.includes('--check')) {
    process.stdout.write(`Model-visible context (${m.method})\n`);
    for (const [k, v] of Object.entries(m.parts)) process.stdout.write(`  ${k.padEnd(22)} ${String(v).padStart(6)}\n`);
    process.stdout.write(`  ${'total'.padEnd(22)} ${String(m.total_tokens).padStart(6)}   budget ${file?.budget_tokens ?? 'unset'}\n`);
    for (const s of m.mcp) process.stdout.write(`  mcp ${s.name}: ${s.note}\n`);
    for (const r of m.hooks.filter((x) => x.tokens)) process.stdout.write(`  hook ${r.event} ${r.handler}: ${r.tokens}\n`);
  }

  if (argv.includes('--check')) {
    const problems = [];
    if (!file || !Number.isFinite(file.budget_tokens)) problems.push(`no budget in ${path.relative(ROOT, BUDGET_FILE)}; run --write`);
    else if (m.total_tokens > file.budget_tokens) {
      problems.push(`model-visible context is ${m.total_tokens} tokens, over the budget of ${file.budget_tokens} (${JSON.stringify(m.parts)})`);
    }
    for (const s of m.mcp.filter((x) => !x.deferred)) problems.push(`bundled MCP server ${s.name} loads upfront; set "alwaysLoad": false`);
    for (const r of m.hooks.filter((x) => x.failed)) problems.push(`hook ${r.event} ${r.handler} failed (${r.failed}); its injected context was not measured`);
    if (problems.length) {
      for (const p of problems) process.stderr.write(`context-budget: ${p}\n`);
      return 1;
    }
    process.stdout.write(`context-budget: ${m.total_tokens} / ${file.budget_tokens} tokens\n`);
  }
  return 0;
}

if (require.main === module) process.exit(main());

module.exports = { measureAll, modelText };
