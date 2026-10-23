#!/usr/bin/env node
/**
 * Build-time route manifest (CC-2060 slice 1).
 * Generates commander/ccc-routes.json from every plugin SKILL.md and agent frontmatter.
 * Usage: node scripts/build-routes.js [--check] [--out <file>]
 *   --check  exit 1 if the committed manifest differs from a fresh build
 *
 * Also exports a pure matcher (matchRoutes) so fixture tests can pin whole-word
 * matching, negative patterns and top-3 ranking.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PLUGIN = path.join(ROOT, 'commander', 'cowork-plugin');
const DEFAULT_OUT = path.join(ROOT, 'commander', 'ccc-routes.json');

const TIER_BY_MODEL = { haiku: 'light', sonnet: 'standard', opus: 'heavy', fable: 'heavy', inherit: 'standard' };
const STOPWORDS = new Set(['the', 'a', 'an', 'to', 'of', 'and', 'or', 'for', 'in', 'on', 'it', 'is', 'user', 'when', 'use', 'with', 'this', 'that', 'your', 'you', 'by', 'from', 'as', 'at', 'be']);

function parseFrontmatter(text) {
  const m = text.match(/^---\s*\n([\s\S]*?)\n---/);
  if (!m) return { data: {}, body: text };
  const data = {};
  const lines = m[1].split('\n');
  for (let i = 0; i < lines.length; i++) {
    const kv = lines[i].match(/^([A-Za-z_][\w-]*):\s*(.*)$/);
    if (!kv) continue;
    const key = kv[1];
    let val = kv[2].trim();
    if (val === '' || val === '|' || val === '>') {
      const items = [];
      while (i + 1 < lines.length && /^\s+\S/.test(lines[i + 1])) {
        i++;
        const t = lines[i].trim();
        items.push(t.startsWith('- ') ? t.slice(2).trim() : t);
      }
      data[key] = val === '' && items.every((_, j) => lines[i - items.length + 1 + j].trim().startsWith('- '))
        ? items.map(unquote)
        : items.join(' ');
    } else if (/^\[.*\]$/.test(val)) {
      data[key] = val.slice(1, -1).split(',').map((s) => unquote(s.trim())).filter(Boolean);
    } else {
      data[key] = unquote(val);
    }
  }
  return { data, body: text.slice(m[0].length) };
}

function unquote(s) {
  return s.replace(/^(["'])([\s\S]*)\1$/, '$2');
}

function splitDescription(desc) {
  const text = String(desc || '').trim();
  const m = text.match(/\b(Use (?:when|before|after|to)\b[\s\S]*)$/i);
  const whenToUse = m ? m[1].trim() : '';
  const summary = (m ? text.slice(0, m.index) : text).replace(/[\s.:;-]+$/, '').trim();
  return { summary, whenToUse };
}

function uniq(arr) {
  return [...new Set(arr)];
}

function deriveTriggers(name, kind, description, whenToUse) {
  const triggers = [];
  if (kind === 'skill') triggers.push('/' + name);
  triggers.push(name);
  for (const q of description.matchAll(/"([^"]{3,60})"|'([^']{3,60})'/g)) triggers.push((q[1] || q[2]).toLowerCase());
  for (const s of description.matchAll(/(?:^|[\s(])\/(ccc-[a-z0-9-]+)/g)) triggers.push('/' + s[1]);
  // "asks what next, which tool to use, or is stuck" -> clause phrases
  const clause = whenToUse.replace(/^Use (?:when|before|after|to)\s+/i, '')
    .replace(/\b(?:the user|someone|you)\s+(?:asks?|says?|types?|wants?(?: to)?|is|are)\s*(?:about|for)?\s*/gi, ', ')
    .replace(/\.$/, '');
  for (const part of clause.split(/,|;|\bor\b/)) {
    const p = part.trim().toLowerCase().replace(/^(?:a|an|the|to)\s+/, '');
    if (p.length >= 4 && p.split(/\s+/).length <= 6 && !p.startsWith('/')) triggers.push(p);
  }
  return uniq(triggers.map((t) => t.trim()).filter((t) => t && !STOPWORDS.has(t)));
}

function deriveNegatives(description, fm) {
  const neg = Array.isArray(fm.negatives) ? fm.negatives.slice() : fm.negatives ? String(fm.negatives).split(',').map((s) => s.trim()) : [];
  const m = description.match(/\b(?:Do not use for|Not for|Not the)\b:?\s*([^.]+)/i);
  if (m) for (const p of m[1].split(/,|\bor\b/)) { const t = p.trim().toLowerCase(); if (t.length >= 3) neg.push(t); }
  return uniq(neg);
}

function deriveNext(body, selfName, known) {
  const seen = [];
  for (const m of body.matchAll(/\/(?:commander:)?(ccc-[a-z0-9-]+)/g)) {
    if (m[1] !== selfName && known.has(m[1])) seen.push(m[1]);
  }
  return uniq(seen).slice(0, 5);
}

function listEntries(dir, kind) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    if (kind === 'skill' && e.isDirectory()) {
      const f = path.join(dir, e.name, 'SKILL.md');
      if (fs.existsSync(f)) out.push({ file: f, fallbackName: e.name });
    } else if (kind === 'agent' && e.isFile() && e.name.endsWith('.md')) {
      out.push({ file: path.join(dir, e.name), fallbackName: e.name.replace(/\.md$/, '') });
    }
  }
  return out;
}

function isDomainRouter(name, description) {
  return /^(?:Route\b[\s\S]*\bwork\b|[\w -]+ domain router|[\w -]+ router:)/i.test(description) || /\bdomain router\b/i.test(description);
}

function buildRoutes(pluginRoot) {
  const root = pluginRoot || PLUGIN;
  const raw = [
    ...listEntries(path.join(root, 'skills'), 'skill').map((e) => ({ ...e, kind: 'skill' })),
    ...listEntries(path.join(root, 'agents'), 'agent').map((e) => ({ ...e, kind: 'agent' })),
  ].map((e) => {
    const { data, body } = parseFrontmatter(fs.readFileSync(e.file, 'utf8'));
    return { ...e, data, body, name: data.name || e.fallbackName };
  });
  const known = new Set(raw.filter((r) => r.kind === 'skill').map((r) => r.name));

  const routes = raw.map((r) => {
    const description = String(r.data.description || '');
    const { summary, whenToUse } = splitDescription(description);
    const kind = r.kind === 'skill' && isDomainRouter(r.name, description) ? 'domain-router' : r.kind;
    const explicit = Array.isArray(r.data.triggers) ? r.data.triggers : [];
    return {
      name: r.name,
      kind,
      description: summary,
      when_to_use: r.data.when_to_use || whenToUse,
      triggers: uniq([...explicit.map((t) => String(t).toLowerCase()), ...deriveTriggers(r.name, r.kind, description, whenToUse)]),
      intentPatterns: Array.isArray(r.data.intentPatterns) ? r.data.intentPatterns : [],
      negatives: deriveNegatives(description, r.data),
      next: deriveNext(r.body, r.name, known),
      tier: r.data.tier || TIER_BY_MODEL[r.data.model] || 'standard',
      priority: Number(r.data.priority) || (kind === 'domain-router' ? 2 : r.kind === 'skill' ? 1 : 0),
    };
  });
  routes.sort((a, b) => a.name.localeCompare(b.name) || a.kind.localeCompare(b.kind));
  return { schema: 1, generatedBy: 'scripts/build-routes.js', counts: countKinds(routes), routes };
}

function countKinds(routes) {
  const c = { skill: 0, agent: 0, 'domain-router': 0 };
  for (const r of routes) c[r.kind] = (c[r.kind] || 0) + 1;
  return c;
}

// ---------------------------------------------------------------- matcher

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Whole-word (word-boundary) test; slash commands match only as a standalone token. */
function wordMatch(text, phrase) {
  const re = phrase.startsWith('/')
    ? new RegExp('(^|[\\s(])' + escapeRe(phrase) + '(?![\\w-])', 'i')
    : new RegExp('(?<![\\w-])' + escapeRe(phrase).replace(/\\? /g, '\\s+') + '(?![\\w-])', 'i');
  return re.test(text);
}

/**
 * score = distinct triggers hit x weight, priority breaks ties; any negative hit drops the route.
 * ctx.signals: e.g. { gitDiff: true } boosts routes whose name is listed in SIGNAL_BOOSTS.
 */
const SIGNAL_BOOSTS = { gitDiff: ['ccc-review', 'ccc-deep-review', 'reviewer'] };

function matchRoutes(manifest, prompt, ctx, limit) {
  const text = String(prompt || '');
  const signals = (ctx && ctx.signals) || {};
  const scored = [];
  for (const r of manifest.routes) {
    if (r.negatives.some((n) => wordMatch(text, n))) continue;
    let hits = r.triggers.filter((t) => wordMatch(text, t)).length;
    for (const p of r.intentPatterns) { try { if (new RegExp(p, 'i').test(text)) hits++; } catch (_) { /* bad pattern ignored */ } }
    for (const [sig, names] of Object.entries(SIGNAL_BOOSTS)) if (signals[sig] && names.includes(r.name)) hits++;
    if (hits > 0) scored.push({ name: r.name, kind: r.kind, score: hits * (r.triggers.some((t) => t.startsWith('/') && wordMatch(text, t)) ? 3 : 1), priority: r.priority });
  }
  scored.sort((a, b) => b.score - a.score || b.priority - a.priority || a.name.localeCompare(b.name));
  return scored.slice(0, limit || 3);
}

// ---------------------------------------------------------------- CLI

function main(argv) {
  const check = argv.includes('--check');
  const oi = argv.indexOf('--out');
  const out = oi >= 0 ? path.resolve(argv[oi + 1]) : DEFAULT_OUT;
  const text = JSON.stringify(buildRoutes(), null, 2) + '\n';
  if (check) {
    const cur = fs.existsSync(out) ? fs.readFileSync(out, 'utf8') : '';
    if (cur !== text) {
      console.error('ccc-routes.json is stale — run: node scripts/build-routes.js');
      return 1;
    }
    console.log('ccc-routes.json up to date');
    return 0;
  }
  fs.writeFileSync(out, text);
  const m = JSON.parse(text);
  console.log('wrote ' + path.relative(ROOT, out) + ' — ' + m.routes.length + ' routes ' + JSON.stringify(m.counts));
  return 0;
}

module.exports = { parseFrontmatter, splitDescription, buildRoutes, wordMatch, matchRoutes };

if (require.main === module) process.exit(main(process.argv.slice(2)));
