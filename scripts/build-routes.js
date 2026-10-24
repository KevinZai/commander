#!/usr/bin/env node
/**
 * build-routes.js — generate the CCC auto-routing registry.
 *
 * Reads every plugin skill (commander/cowork-plugin/skills/<name>/SKILL.md)
 * and agent (commander/cowork-plugin/agents/<name>.md) frontmatter, merges the
 * curated overlay in commander/core/route-hints.json (triggers, intent
 * patterns, negatives, paths, next[]), and writes
 * commander/cowork-plugin/hooks/lib/ccc-routes.json, which intent-classifier.js
 * scores at UserPromptSubmit and reads for the Stop "what next" menu.
 *
 * The output lives under hooks/ so build:codex mirrors it into the Codex
 * plugin with the hook that reads it.
 *
 * Usage:
 *   node scripts/build-routes.js          # write the registry
 *   node scripts/build-routes.js --check  # exit 1 if the checked-in registry is stale
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PLUGIN = path.join(ROOT, 'commander', 'cowork-plugin');
const SKILLS_DIR = path.join(PLUGIN, 'skills');
const AGENTS_DIR = path.join(PLUGIN, 'agents');
const HINTS_FILE = path.join(ROOT, 'commander', 'core', 'route-hints.json');
const OUT_FILE = path.join(PLUGIN, 'hooks', 'lib', 'ccc-routes.json');

function readFrontmatter(file) {
  const text = fs.readFileSync(file, 'utf8');
  const m = text.match(/^---\s*\n([\s\S]*?)\n---/);
  if (!m) return {};
  const fm = {};
  for (const line of m[1].split('\n')) {
    const kv = line.match(/^([A-Za-z][\w-]*):\s*(.*)$/);
    if (!kv) continue;
    let value = kv[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1).replace(/\\"/g, '"');
    }
    fm[kv[1]] = value;
  }
  return fm;
}

// Short label for menus: the description's first clause, trimmed.
function labelFrom(description) {
  const first = String(description || '').split(/[:;]\s|\.\s|\s\(|\s—\s/)[0].replace(/\.$/, '').trim();
  return first.length > 48 ? first.slice(0, 45).replace(/\s+\S*$/, '') + '…' : first;
}

// User-language phrases from the description's "Use when ..." clause:
// quoted phrases plus the list after "says"/"say". These are weak signals
// (descTriggers); curated triggers in route-hints.json carry the weight.
function descTriggersFrom(description) {
  const out = new Set();
  const desc = String(description || '');
  for (const q of desc.matchAll(/'([^']{3,40})'/g)) out.add(q[1].toLowerCase());
  const use = desc.match(/Use when (.*)$/i);
  if (use) {
    const says = use[1].match(/\bsays?\s+(.*?)(?:\.|$)/i);
    if (says) {
      for (const raw of says[1].split(/,\s*|\s+or\s+/)) {
        const phrase = raw.replace(/^(or|and)\s+/i, '').replace(/['"]/g, '').trim().toLowerCase();
        const words = phrase.split(/\s+/).filter(Boolean);
        if (/^(wants?|asks?|types?|is|when|the user)\b/.test(phrase)) continue;
        if (words.length >= 2 && words.length <= 5 && !phrase.includes('/')) out.add(phrase);
      }
    }
  }
  return [...out].sort();
}

function validateRegexes(id, list) {
  for (const source of list || []) {
    try {
      new RegExp(source, 'i');
    } catch (err) {
      throw new Error(`route ${id}: invalid regex ${JSON.stringify(source)}: ${err.message}`);
    }
  }
}

function buildEntry({ id, kind, name, fm, hint }) {
  const description = fm.description || '';
  const entry = {
    id,
    kind,
    invoke: kind === 'skill' ? `/${name}` : name,
    label: labelFrom(description),
    manual: fm['disable-model-invocation'] === 'true',
    strong: [...new Set((hint.strong || []).map((t) => t.toLowerCase()))],
    triggers: [...new Set((hint.triggers || []).map((t) => t.toLowerCase()))],
    patterns: hint.patterns || [],
    negatives: hint.negatives || [],
    paths: hint.paths || [],
    requirePath: Boolean(hint.requirePath),
    next: hint.next || [],
    descTriggers: descTriggersFrom(description),
  };
  validateRegexes(id, entry.patterns);
  validateRegexes(id, entry.negatives);
  return entry;
}

function build() {
  const hints = JSON.parse(fs.readFileSync(HINTS_FILE, 'utf8'));
  const skillHints = hints.skills || {};
  const agentHints = hints.agents || {};
  const routes = [];

  const skillNames = fs
    .readdirSync(SKILLS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory() && fs.existsSync(path.join(SKILLS_DIR, d.name, 'SKILL.md')))
    .map((d) => d.name)
    .sort();
  for (const name of skillNames) {
    const fm = readFrontmatter(path.join(SKILLS_DIR, name, 'SKILL.md'));
    const hint = skillHints[name] || {};
    // Aliases forward to a canonical skill; routing to them only adds interference.
    if (hint.exclude || /^Alias\b/i.test(fm.description || '')) continue;
    routes.push(buildEntry({ id: name, kind: 'skill', name, fm, hint }));
  }

  const agentNames = fs
    .readdirSync(AGENTS_DIR)
    .filter((f) => f.endsWith('.md'))
    .map((f) => f.slice(0, -3))
    .sort();
  for (const name of agentNames) {
    const fm = readFrontmatter(path.join(AGENTS_DIR, `${name}.md`));
    const hint = agentHints[name] || {};
    if (hint.exclude) continue;
    routes.push(buildEntry({ id: `agent:${name}`, kind: 'agent', name, fm, hint }));
  }

  const known = new Set(routes.map((r) => r.id));
  for (const name of Object.keys(skillHints)) {
    if (!skillNames.includes(name)) throw new Error(`route-hints.json names unknown skill ${name}`);
  }
  for (const name of Object.keys(agentHints)) {
    if (!agentNames.includes(name)) throw new Error(`route-hints.json names unknown agent ${name}`);
  }
  for (const route of routes) {
    for (const next of route.next) {
      if (!known.has(next)) throw new Error(`route ${route.id}: next[] names unknown route ${next}`);
    }
  }

  return {
    _generated: 'by scripts/build-routes.js from skill/agent frontmatter + commander/core/route-hints.json — do not edit',
    version: 1,
    routes,
  };
}

function main() {
  const text = `${JSON.stringify(build(), null, 2)}\n`;
  if (process.argv.includes('--check')) {
    const current = fs.existsSync(OUT_FILE) ? fs.readFileSync(OUT_FILE, 'utf8') : '';
    if (current !== text) {
      console.error('❌ ccc-routes.json is stale — run `npm run build:routes`');
      process.exit(1);
    }
    console.log('✅ ccc-routes.json is up to date');
    return;
  }
  fs.writeFileSync(OUT_FILE, text);
  const routes = JSON.parse(text).routes;
  console.log(`✓ ccc-routes.json written: ${routes.filter((r) => r.kind === 'skill').length} skills, ${routes.filter((r) => r.kind === 'agent').length} agents`);
}

if (require.main === module) main();

module.exports = { build, descTriggersFrom, labelFrom };
