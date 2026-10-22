#!/usr/bin/env node
'use strict';
// Offline skill-routing eval (CC-2063 slice 1). Deterministic lexical router over
// SKILL.md descriptions plus labelled prompts. No model calls. It is a drift proxy
// for description quality; live trigger checks stay in `claude plugin eval`.

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SKILLS_DIR = path.join(ROOT, 'commander', 'cowork-plugin', 'skills');
const FIXTURES = path.join(ROOT, 'commander', 'tests', 'fixtures', 'skill-routing.json');

const GATES = { recall: 0.9, falseTriggers: 0, interference: 0 };
const THRESHOLD = 3.0; // minimum top score to fire at all
const MIN_MATCHED = 2; // distinct prompt tokens that must hit a skill
const MARGIN = 0.5; // top must beat runner-up by this, else treated as no clear fire

const STOP = new Set(('a an the and or of to in on for with from by at as is are be it its this that these those '
  + 'me my i you your we our us do does did can could should would will want wants need use used using when user '
  + 'asks ask says say types type then so not no any all one two per via into out up about what which how who '
  + 'get gets new more most each every both also only just like pick picks picked run runs show shows please '
  + 'ccc commander skill skills file line work explain').split(/\s+/));

function stem(w) {
  return w.replace(/(ing|ed|es|s)$/, (m) => (w.length - m.length >= 4 ? '' : m));
}

function tokens(text) {
  return String(text).toLowerCase().replace(/\/?ccc-[a-z0-9-]+/g, ' ')
    .split(/[^a-z0-9]+/).filter((w) => w.length > 1 && !STOP.has(w)).map(stem);
}

function loadSkills() {
  return fs.readdirSync(SKILLS_DIR).filter((d) => fs.existsSync(path.join(SKILLS_DIR, d, 'SKILL.md'))).sort()
    .map((name) => {
      const src = fs.readFileSync(path.join(SKILLS_DIR, name, 'SKILL.md'), 'utf8');
      const m = src.match(/^description:\s*"?([\s\S]*?)"?\s*$/m);
      return { name, description: m ? m[1] : '' };
    });
}

function buildIndex(skills) {
  const docs = skills.map((s) => {
    const nameToks = new Set(tokens(s.name.replace(/^ccc-?/, '')));
    const [what, when = ''] = s.description.split(/Use when/i);
    return { name: s.name, nameToks, what: new Set(tokens(what)), when: new Set(tokens(when)) };
  });
  const df = new Map();
  for (const d of docs) for (const t of new Set([...d.what, ...d.when, ...d.nameToks])) df.set(t, (df.get(t) || 0) + 1);
  const idf = (t) => Math.log(1 + docs.length / (df.get(t) || 1));
  return { docs, idf };
}

function route(prompt, index) {
  const lower = prompt.toLowerCase();
  const pt = new Set(tokens(prompt));
  const scored = index.docs.map((d) => {
    let score = 0;
    let matched = 0;
    for (const t of pt) {
      const w = index.idf(t);
      const hit = d.nameToks.has(t) ? 2 * w : d.when.has(t) ? 1.5 * w : d.what.has(t) ? w : 0;
      if (hit) { score += hit; matched++; }
    }
    if (matched < MIN_MATCHED) score = 0; // one shared word is coincidence, not routing
    if (new RegExp(`(^|[^a-z-])/?${d.name}([^a-z0-9-]|$)`).test(lower)) score += 100;
    return { name: d.name, score };
  }).sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
  const [top, next] = scored;
  const fired = top.score >= THRESHOLD && top.score - next.score >= MARGIN ? top.name : null;
  return { fired, top: scored.slice(0, 3) };
}

function evaluate(fixtures, skills) {
  const index = buildIndex(skills);
  const names = new Set(skills.map((s) => s.name));
  const out = { positives: 0, hits: 0, misses: [], interference: [], falseTriggers: [], noneCount: 0, unknown: [] };
  for (const f of fixtures) {
    const expect = f.expect === 'none' ? null : [].concat(f.expect);
    if (expect) for (const e of expect) if (!names.has(e)) out.unknown.push({ prompt: f.prompt, skill: e });
    const r = route(f.prompt, index);
    if (!expect) {
      out.noneCount++;
      if (r.fired) out.falseTriggers.push({ prompt: f.prompt, fired: r.fired });
    } else {
      out.positives++;
      if (r.fired && expect.includes(r.fired)) out.hits++;
      else if (r.fired) out.interference.push({ prompt: f.prompt, expect, fired: r.fired });
      else out.misses.push({ prompt: f.prompt, expect, top: r.top });
    }
  }
  out.recall = out.positives ? out.hits / out.positives : 0;
  const failures = [];
  if (out.unknown.length) failures.push(`${out.unknown.length} fixture(s) name a skill that does not exist`);
  if (out.recall < GATES.recall) failures.push(`recall ${(out.recall * 100).toFixed(1)}% < ${GATES.recall * 100}%`);
  if (out.falseTriggers.length > GATES.falseTriggers) failures.push(`${out.falseTriggers.length} false trigger(s)`);
  if (out.interference.length > GATES.interference) failures.push(`${out.interference.length} wrong-skill fire(s)`);
  out.failures = failures;
  out.pass = failures.length === 0;
  return out;
}

function main() {
  const fixtures = JSON.parse(fs.readFileSync(FIXTURES, 'utf8')).prompts;
  const res = evaluate(fixtures, loadSkills());
  console.log(`routing-eval: ${res.positives} labelled, ${res.noneCount} none, recall ${(res.recall * 100).toFixed(1)}%, `
    + `false triggers ${res.falseTriggers.length}, wrong-skill ${res.interference.length}`);
  for (const k of ['unknown', 'misses', 'interference', 'falseTriggers']) {
    for (const x of res[k]) console.log(`  ${k}: ${JSON.stringify(x)}`);
  }
  if (!res.pass) { console.error(`FAIL: ${res.failures.join('; ')}`); process.exit(1); }
  console.log('PASS');
}

module.exports = { evaluate, loadSkills, route, buildIndex, GATES, FIXTURES };
if (require.main === module) main();
