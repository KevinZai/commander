#!/usr/bin/env node
'use strict';
/**
 * scripts/prompt-lint.js — mechanical checks from docs/PROMPT-STANDARD.md §5.
 *
 * Usage: node scripts/prompt-lint.js [--json] [paths...]
 * Default paths: every plugin SKILL.md, agent, domain router, commands/ccc-*.md
 * and prompts/ template. Exit 1 when any ERROR is found; WARN never fails.
 *
 * Checks (per file): frontmatter parses and `name` matches the directory for
 * SKILL.md; line limits (skill 400, agent 120, router 200, command 400,
 * prompt 300); stale model names; count/version literals; typed-letter menus;
 * private names and personal paths; relative markdown links that do not
 * resolve; the Fable contract footer on plugin skills (exactly one). The
 * stale-model pattern is built from parts so this file never matches itself.
 */
var fs = require('fs');
var path = require('path');

var ROOT = path.resolve(__dirname, '..');
var args = process.argv.slice(2);
var json = args.includes('--json');
var targets = args.filter(function (a) { return !a.startsWith('--'); });

function listDefault() {
  var out = [];
  var add = function (p) { if (fs.existsSync(p)) out.push(p); };
  var dirs = function (base) {
    return fs.existsSync(base) ? fs.readdirSync(base, { withFileTypes: true }).filter(function (e) { return e.isDirectory(); }).map(function (e) { return e.name; }) : [];
  };
  dirs(path.join(ROOT, 'commander/cowork-plugin/skills')).forEach(function (d) { add(path.join(ROOT, 'commander/cowork-plugin/skills', d, 'SKILL.md')); });
  dirs(path.join(ROOT, 'skills')).filter(function (d) { return d.startsWith('ccc-'); }).forEach(function (d) { add(path.join(ROOT, 'skills', d, 'SKILL.md')); });
  var agents = path.join(ROOT, 'commander/cowork-plugin/agents');
  if (fs.existsSync(agents)) fs.readdirSync(agents).filter(function (f) { return f.endsWith('.md'); }).forEach(function (f) { add(path.join(agents, f)); });
  var cmds = path.join(ROOT, 'commands');
  if (fs.existsSync(cmds)) fs.readdirSync(cmds).filter(function (f) { return /^ccc-.*\.md$/.test(f); }).forEach(function (f) { add(path.join(cmds, f)); });
  var prompts = path.join(ROOT, 'prompts');
  if (fs.existsSync(prompts)) {
    (function walk(d) {
      fs.readdirSync(d, { withFileTypes: true }).forEach(function (e) {
        var p = path.join(d, e.name);
        if (e.isDirectory()) walk(p); else if (e.name.endsWith('.md')) add(p);
      });
    })(prompts);
  }
  return out;
}

function kindOf(rel) {
  if (rel.startsWith('commander/cowork-plugin/skills/')) return 'skill';
  if (rel.startsWith('commander/cowork-plugin/agents/')) return 'agent';
  if (rel.startsWith('skills/')) return 'router';
  if (rel.startsWith('commands/')) return 'command';
  if (rel.startsWith('prompts/')) return 'prompt';
  return 'other';
}
var LIMITS = { skill: 400, agent: 120, router: 200, command: 400, prompt: 300, other: 400 };

// Built from parts so the pattern text never appears in this file.
var FAM = ['fable', 'opus', 'sonnet'];
var STALE = new RegExp([
  'claude-(' + FAM.join('|') + ')-5(?![-\\d])',
  'claude-haiku-4-5',
  'claude-(opus|sonnet)-4-\\d',
  '\\b(Opus|Fable|Sonnet) ' + '5(?![.\\d])',
  '\\bHaiku 4\\' + '.5\\b',
  '\\b(Opus|Sonnet) 4\\' + '.\\d\\b',
  'gpt-5\\' + '.[0-9]',
  'GPT-5\\' + '.[0-9]',
  '\\bTerra\\b',
  // "Sol" is stale only as the GPT-5.6 flagship; GPT-6 Sol and GPT-6.1 Sol are current.
  '(?<!6 |6\\.1 |6-|6\\.1-|GPT-6 )\\bSol\\b',
].join('|'));
var COUNTS = /\b\d{2,3}\+? (plugin )?(skills|agents|handlers|hooks|hook events|lifecycle hooks|vendors?)\b/i;
var VERSION = /\bv?[5-8]\.\d+\.\d+\b/;
var MENU = /\b(Reply|Type|Answer|Respond with) (A|B|1)\b|^\s*\(?[A-D]\)\s+\S|Reply [A-D]\/[A-D]/m;
var PRIVATE = /\b(openclaw|hermes|k3v80|paperclip)\b|\/Users\/[a-z]+\//i;
var ALLOW_PRIVATE = /ccc-(hermes|openclaw-coordination|openclaw-manage|openclaw|paperclip|claw)\b|openclaw-bridge/;
var FOOTER = /^> ⚙️ \*\*Fable contract:\*\*/m;

function frontmatter(text) {
  if (!text.startsWith('---')) return null;
  var end = text.indexOf('\n---', 3);
  if (end < 0) return null;
  var fm = {};
  text.slice(3, end).split('\n').forEach(function (line) {
    var m = line.match(/^([A-Za-z_-]+):\s*(.*)$/);
    if (m) fm[m[1]] = m[2].replace(/^["']|["']$/g, '');
  });
  return fm;
}

function lint(file) {
  var rel = path.relative(ROOT, file);
  var kind = kindOf(rel);
  var text = fs.readFileSync(file, 'utf8');
  var lines = text.split('\n');
  var issues = [];
  var err = function (m) { issues.push({ level: 'ERROR', msg: m }); };
  var warn = function (m) { issues.push({ level: 'WARN', msg: m }); };

  var fm = frontmatter(text);
  if ((kind === 'skill' || kind === 'router' || kind === 'agent') && !fm) err('frontmatter missing or unterminated');
  if (fm && (kind === 'skill' || kind === 'router')) {
    var dir = path.basename(path.dirname(file));
    if (fm.name !== dir) err('frontmatter name "' + fm.name + '" != directory "' + dir + '"');
    if (!fm.description) err('description missing');
    if (fm.description && fm.description.length > 300) err('description ' + fm.description.length + ' chars (max 300)');
    if (kind === 'skill' && fm.model && !/^(haiku|sonnet|opus|fable|inherit)$/.test(fm.model)) err('model "' + fm.model + '" is not an alias');
    if (kind === 'skill' && !fm.effort) warn('effort missing');
  }
  if (lines.length > LIMITS[kind]) err(lines.length + ' lines (limit ' + LIMITS[kind] + ' for ' + kind + ')');

  var body = text;
  var stale = body.match(STALE);
  if (stale) err('stale model name: "' + stale[0] + '"');
  var count = body.match(COUNTS);
  if (count && kind !== 'prompt') err('count literal: "' + count[0] + '"');
  var ver = body.match(VERSION);
  if (ver && !/(shipped|since|added|removed|introduced|changelog|history) /i.test(body.slice(Math.max(0, ver.index - 40), ver.index))) warn('version literal: "' + ver[0] + '"');
  var menu = body.match(MENU);
  if (menu) err('typed-letter menu: "' + menu[0].trim() + '"');
  // Public command and skill names that happen to contain a runtime name are
  // not private references (e.g. /ccc-openclaw-manage, skills/openclaw-bridge).
  var scrubbed = body.replace(/\/?ccc-(openclaw|hermes|paperclip|claw)[a-z-]*|openclaw-bridge/g, '');
  var priv = scrubbed.match(PRIVATE);
  if (priv && !ALLOW_PRIVATE.test(rel)) err('private name or personal path: "' + priv[0] + '"');
  if (kind === 'skill') {
    var footers = (body.match(/^> ⚙️ \*\*Fable contract:\*\*/gm) || []).length;
    if (footers !== 1) err('Fable contract footer count ' + footers + ' (expected 1)');
  }
  var linkRe = /\]\((\.{1,2}\/[^)#\s]+|references\/[^)#\s]+)/g;
  var m;
  while ((m = linkRe.exec(body))) {
    var target = path.resolve(path.dirname(file), m[1]);
    if (!fs.existsSync(target)) err('broken relative link: ' + m[1]);
  }
  return { file: rel, kind: kind, lines: lines.length, issues: issues };
}

var files = targets.length ? targets.map(function (t) { return path.resolve(ROOT, t); }) : listDefault();
var results = files.map(lint);
var errors = results.reduce(function (n, r) { return n + r.issues.filter(function (i) { return i.level === 'ERROR'; }).length; }, 0);
var warns = results.reduce(function (n, r) { return n + r.issues.filter(function (i) { return i.level === 'WARN'; }).length; }, 0);

if (json) {
  process.stdout.write(JSON.stringify({ files: results.length, errors: errors, warnings: warns, results: results.filter(function (r) { return r.issues.length; }) }, null, 2) + '\n');
} else {
  results.forEach(function (r) {
    r.issues.forEach(function (i) { process.stdout.write('[' + i.level + '] ' + r.file + ': ' + i.msg + '\n'); });
  });
  process.stdout.write((errors ? 'FAIL' : 'PASS') + ': ' + results.length + ' files, ' + errors + ' errors, ' + warns + ' warnings\n');
}
process.exit(errors ? 1 : 0);
