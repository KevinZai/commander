#!/usr/bin/env node
/**
 * measure-listing.js — what Commander costs in Claude Code's session-start listings.
 *
 * Rebuilds, from disk, the text Claude Code puts in context for the plugin:
 *   - skill listing: one `- <plugin>:<name>: <description>` line per skill
 *     without `disable-model-invocation: true` (`when_to_use` appended, the
 *     combined text capped at 1,536 chars), plus one line per workflow in
 *     workflows/*.workflow.js (`<description> - <whenToUse>`), which share
 *     the same listing;
 *   - agent listing: `- <plugin>:<name>: <description> (Tools: ...)`, with the
 *     Write and Edit tools the runtime adds to agents that set `memory:`
 *     (unless `disallowedTools` names them).
 * and compares the skill listing to the listing budget (1% of the context
 * window; 8,000 chars is the documented fallback and the 200k-model value).
 * Source: https://code.claude.com/docs/en/skills (skill listing budget,
 * 1,536-char cap, "disable-model-invocation: Description not in context").
 *
 * Tokens: js-tiktoken cl100k_base when it resolves from this repo's
 * node_modules (a proxy; Claude's tokenizer is not public), else chars / 3.6.
 *
 * Usage:
 *   node scripts/measure-listing.js                 # table + JSON
 *   node scripts/measure-listing.js --json          # JSON only
 *   node scripts/measure-listing.js --plugin <dir> --budget 8000
 *   node scripts/measure-listing.js --check         # exit 1 if over budget or
 *                                                   # any skill dispatches to a hidden one
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DEFAULT_PLUGIN = path.join(ROOT, 'commander', 'cowork-plugin');
const DEFAULT_BUDGET = 8000;
const MAX_ENTRY_CHARS = 1536;
const CHARS_PER_TOKEN = 3.6;

/** Minimal YAML frontmatter: `key: value` scalars and `- item` lists. */
function parseFrontmatter(text) {
  const m = String(text).match(/^---\s*\n([\s\S]*?)\n---/);
  if (!m) return {};
  const fm = {};
  let listKey = null;
  for (const line of m[1].split('\n')) {
    const item = line.match(/^\s+-\s+(.*)$/);
    if (item && listKey) {
      fm[listKey].push(unquote(item[1].trim()));
      continue;
    }
    const kv = line.match(/^([A-Za-z][\w-]*):\s*(.*)$/);
    if (!kv) continue;
    const value = kv[2].trim();
    if (value === '') {
      fm[kv[1]] = [];
      listKey = kv[1];
    } else {
      fm[kv[1]] = unquote(value);
      listKey = null;
    }
  }
  return fm;
}

function unquote(value) {
  if (value.length >= 2 && value.startsWith('"') && value.endsWith('"')) return value.slice(1, -1).replace(/\\"/g, '"');
  if (value.length >= 2 && value.startsWith("'") && value.endsWith("'")) return value.slice(1, -1).replace(/''/g, "'");
  return value;
}

function capEntry(text) {
  return text.length <= MAX_ENTRY_CHARS ? text : `${text.slice(0, MAX_ENTRY_CHARS - 1)}…`;
}

function pluginName(pluginDir) {
  try {
    return JSON.parse(fs.readFileSync(path.join(pluginDir, '.claude-plugin', 'plugin.json'), 'utf8')).name || 'commander';
  } catch {
    return 'commander';
  }
}

function listDirs(dir) {
  try {
    return fs.readdirSync(dir, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name).sort();
  } catch {
    return [];
  }
}

function listFiles(dir, suffix) {
  try {
    return fs.readdirSync(dir).filter((f) => f.endsWith(suffix)).sort();
  } catch {
    return [];
  }
}

function skillEntries(pluginDir, plugin) {
  const listed = [];
  const hidden = [];
  for (const name of listDirs(path.join(pluginDir, 'skills'))) {
    const file = path.join(pluginDir, 'skills', name, 'SKILL.md');
    if (!fs.existsSync(file)) continue;
    const fm = parseFrontmatter(fs.readFileSync(file, 'utf8'));
    const id = typeof fm.name === 'string' && fm.name ? fm.name : name;
    if (fm['disable-model-invocation'] === 'true') {
      hidden.push(name);
      continue;
    }
    const text = [fm.description, fm.when_to_use].filter((s) => typeof s === 'string' && s).join(' - ');
    listed.push({ name: id, dir: name, line: `- ${plugin}:${id}: ${capEntry(text)}` });
  }
  return { listed, hidden };
}

// The `meta` object literal's string fields; the module itself is not run
// (workflow scripts execute top-level code against a runtime `args`).
function workflowMeta(source) {
  const block = source.match(/export const meta\s*=\s*\{([\s\S]*?)\n\}/);
  if (!block) return {};
  const meta = {};
  for (const key of ['name', 'description', 'whenToUse']) {
    const m = block[1].match(new RegExp(`\\b${key}:\\s*(['"\`])((?:\\\\.|(?!\\1)[\\s\\S])*)\\1`));
    if (m) meta[key] = m[2].replace(/\\(['"`\\])/g, '$1');
  }
  return meta;
}

function workflowEntries(pluginDir, plugin) {
  const listed = [];
  for (const file of listFiles(path.join(pluginDir, 'workflows'), '.workflow.js')) {
    const meta = workflowMeta(fs.readFileSync(path.join(pluginDir, 'workflows', file), 'utf8'));
    const name = meta.name || file.replace(/\.workflow\.js$/, '');
    const text = [meta.description, meta.whenToUse].filter(Boolean).join(' - ');
    listed.push({ name, line: `- ${plugin}:${name}: ${capEntry(text)}` });
  }
  return listed;
}

function agentEntries(pluginDir, plugin) {
  const listed = [];
  for (const file of listFiles(path.join(pluginDir, 'agents'), '.md')) {
    const fm = parseFrontmatter(fs.readFileSync(path.join(pluginDir, 'agents', file), 'utf8'));
    const name = typeof fm.name === 'string' && fm.name ? fm.name : file.slice(0, -3);
    let tools = Array.isArray(fm.tools) ? [...fm.tools] : typeof fm.tools === 'string' ? fm.tools.split(/,\s*/) : [];
    const disallowed = Array.isArray(fm.disallowedTools) ? fm.disallowedTools : [];
    if (fm.memory && tools.length) for (const t of ['Write', 'Edit']) if (!tools.includes(t) && !disallowed.includes(t)) tools.push(t);
    const toolText = tools.length ? tools.join(', ') : 'All tools';
    listed.push({ name, line: `- ${plugin}:${name}: ${fm.description || ''} (Tools: ${toolText})` });
  }
  return listed;
}

function tokenCounter() {
  try {
    const { getEncoding } = require('js-tiktoken');
    const enc = getEncoding('cl100k_base');
    return { method: 'js-tiktoken cl100k_base (proxy for the Claude tokenizer)', count: (s) => enc.encode(s).length };
  } catch {
    return { method: `chars / ${CHARS_PER_TOKEN} (estimate; js-tiktoken not installed)`, count: (s) => Math.round(s.length / CHARS_PER_TOKEN) };
  }
}

// ── Skill-to-skill dispatch ───────────────────────────────────────────────
// Claude Code blocks a Skill-tool call to a disable-model-invocation skill, so
// no skill, visible or hidden (a user-typed skill still runs as the model),
// may dispatch to a hidden one. A dispatch is a
// backticked plugin skill name on a line that invokes it (Skill tool, invoke,
// dispatch, "Skill `x`"), or in a table introduced by such a line. Typed
// handoffs ("user-invoked only, so do not call it through the Skill tool")
// are not dispatches.
const DISPATCH_VERB = /skill tool|\binvok|\bdispatch|\bSkill `/i;
const TYPED_HANDOFF = /through the Skill tool|user-invoked only|tell the user to type/i;

function skillRefs(line, names, self) {
  const out = [];
  for (const m of line.matchAll(/(?:`\/?(?:commander:)?|\bcommander:)(ccc(?:-[a-z0-9]+)*)(?=[`\s"'])/g)) {
    if (names.has(m[1]) && m[1] !== self && !out.includes(m[1])) out.push(m[1]);
  }
  return out;
}

/** Skill → [{ target, line }] for every Skill-tool dispatch in its body. */
function dispatchTargets(source, names, self) {
  const text = String(source);
  const fm = text.match(/^---\n[\s\S]*?\n---\n/);
  const bodyStart = fm ? fm[0].split('\n').length - 1 : 0;
  const lines = text.split('\n');
  const found = [];
  let tableContext = false;
  lines.forEach((line, i) => {
    if (i < bodyStart) return;
    if (/^#/.test(line)) { tableContext = false; return; }
    const row = /^\s*\|/.test(line);
    if (!row && line.trim()) tableContext = DISPATCH_VERB.test(line) && !TYPED_HANDOFF.test(line);
    if (TYPED_HANDOFF.test(line)) return;
    if ((row && (tableContext || DISPATCH_VERB.test(line))) || (!row && DISPATCH_VERB.test(line))) {
      for (const target of skillRefs(line, names, self)) if (!found.some((f) => f.target === target)) found.push({ target, line: i + 1 });
    }
  });
  return found;
}

/** Dispatch edges from every skill, and the ones that reach a hidden skill. */
function dispatchCheck(pluginDir, visible, hidden) {
  const names = new Set([...visible, ...hidden]);
  const edges = [];
  for (const name of [...visible, ...hidden].sort()) {
    const file = path.join(pluginDir, 'skills', name, 'SKILL.md');
    for (const d of dispatchTargets(fs.readFileSync(file, 'utf8'), names, name)) edges.push({ from: name, to: d.target, line: d.line });
  }
  const hiddenSet = new Set(hidden);
  return { edges: edges.length, toHidden: edges.filter((e) => hiddenSet.has(e.to)).map((e) => `${e.from}:${e.line} -> ${e.to}`) };
}

function block(entries, counter) {
  const text = entries.map((e) => `${e.line}\n`).join('');
  return { entries: entries.length, chars: text.length, tokens: counter.count(text) };
}

function measure({ pluginDir = DEFAULT_PLUGIN, budget = DEFAULT_BUDGET, counter = tokenCounter() } = {}) {
  const plugin = pluginName(pluginDir);
  const skills = skillEntries(pluginDir, plugin);
  const workflows = workflowEntries(pluginDir, plugin);
  const agents = agentEntries(pluginDir, plugin);
  const skillBlock = block(skills.listed, counter);
  const workflowBlock = block(workflows, counter);
  const listingBlock = block([...skills.listed, ...workflows], counter);
  const agentBlock = block(agents, counter);
  const dispatch = dispatchCheck(pluginDir, skills.listed.map((e) => e.dir), skills.hidden);
  return {
    plugin,
    pluginDir: path.relative(ROOT, pluginDir) || '.',
    tokenMethod: counter.method,
    budgetChars: budget,
    skills: { ...skillBlock, listed: skills.listed.map((e) => e.name), hidden: skills.hidden.length },
    workflows: { ...workflowBlock, listed: workflows.map((e) => e.name) },
    listing: {
      ...listingBlock,
      budgetChars: budget,
      pctOfBudget: Math.round((listingBlock.chars / budget) * 1000) / 10,
      fits: listingBlock.chars <= budget,
    },
    agents: { ...agentBlock, listed: agents.map((e) => e.name) },
    total: { chars: listingBlock.chars + agentBlock.chars, tokens: listingBlock.tokens + agentBlock.tokens },
    dispatch,
  };
}

function fmt(n) {
  return Number(n).toLocaleString('en-US');
}

function renderTable(r) {
  const rows = [
    ['Skills (model-visible)', r.skills.entries, r.skills.chars, r.skills.tokens],
    ['Workflows', r.workflows.entries, r.workflows.chars, r.workflows.tokens],
    ['Skill listing', r.listing.entries, r.listing.chars, r.listing.tokens],
    ['Agent listing', r.agents.entries, r.agents.chars, r.agents.tokens],
    ['Total (listings)', r.listing.entries + r.agents.entries, r.total.chars, r.total.tokens],
  ];
  const head = ['Component', 'Entries', 'Chars', 'Tokens'];
  const cells = [head, ...rows.map((row) => [row[0], fmt(row[1]), fmt(row[2]), fmt(row[3])])];
  const widths = head.map((_, i) => Math.max(...cells.map((c) => String(c[i]).length)));
  const line = (c) => c.map((v, i) => (i === 0 ? String(v).padEnd(widths[i]) : String(v).padStart(widths[i]))).join('  ');
  const verdict = r.listing.fits ? 'fits, no truncation' : 'OVER budget, descriptions get dropped';
  return [
    line(head),
    widths.map((w) => '-'.repeat(w)).join('  '),
    ...cells.slice(1).map(line),
    '',
    `Skill listing: ${fmt(r.listing.chars)} of ${fmt(r.budgetChars)} chars (${r.listing.pctOfBudget}%) — ${verdict}.`,
    `Hidden skills (disable-model-invocation): ${r.skills.hidden}. Tokens: ${r.tokenMethod}.`,
    `Skill-tool dispatches between skills: ${r.dispatch.edges}; to hidden skills: ${r.dispatch.toHidden.length ? r.dispatch.toHidden.join(', ') : 'none'}.`,
  ].join('\n');
}

function argValue(argv, flag) {
  const i = argv.indexOf(flag);
  return i >= 0 ? argv[i + 1] : undefined;
}

function main(argv = process.argv.slice(2)) {
  const pluginDir = argValue(argv, '--plugin') ? path.resolve(argValue(argv, '--plugin')) : DEFAULT_PLUGIN;
  const budget = argValue(argv, '--budget') ? Number(argValue(argv, '--budget')) : DEFAULT_BUDGET;
  if (!Number.isFinite(budget) || budget <= 0) {
    console.error('measure-listing: --budget must be a positive number of characters');
    process.exit(2);
  }
  if (!fs.existsSync(path.join(pluginDir, 'skills'))) {
    console.error(`measure-listing: no skills/ directory under ${pluginDir}`);
    process.exit(2);
  }
  const result = measure({ pluginDir, budget });
  const json = JSON.stringify(result, null, 2);
  console.log(argv.includes('--json') ? json : `${renderTable(result)}\n\n${json}`);
  if (argv.includes('--check') && (!result.listing.fits || result.dispatch.toHidden.length)) {
    console.error('measure-listing: FAIL (listing over budget or a skill dispatches to a hidden one)');
    process.exit(1);
  }
}

if (require.main === module) main();

module.exports = { parseFrontmatter, workflowMeta, dispatchTargets, measure, renderTable, MAX_ENTRY_CHARS };
