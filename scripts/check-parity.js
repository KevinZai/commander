#!/usr/bin/env node
'use strict';

// Filesystem-derived counts/version parity check.
//
// Truth comes from disk (SKILL.md files, agent files, hooks.json, .mcp.json,
// package.json), never from a hand-maintained number. Every count or version
// claim found in SURFACES that disagrees with it is reported as file:line and
// the script exits 1.
//
//   node scripts/check-parity.js [--root <dir>]
//
// Legitimate historical mentions (release notes, dated reports, competitor
// figures) are exempted either inline with a `parity-ignore` marker on the
// same line (or `parity-ignore-next-line` on the line above), or in
// scripts/parity-allowlist.json: { "entries": [{ "file": "<glob>",
// "match"?: "<substring of the line>", "what"?: "<rule>", "reason": "..." }] }.
//
// "N plugin skills" must equal the plugin count and "N ecosystem skills" the
// root catalog count. A bare "N skills" is a whole-catalog claim only when
// N >= SUBSET_SKILL_CEILING (or written "N+"); smaller bare counts describe a
// subset (a domain pack, an audit finding) and are not checked.

const fs = require('node:fs');
const path = require('node:path');

const SURFACES = [
  'README.md',
  'NAMING.md',
  'CONTRIBUTING.md',
  'bin/kc.js',
  'commander/plugins.js',
  'commander/core/registry.yaml',
  'apps/mcp-server-cloud/src/tools/update.ts',
  'commander/cowork-plugin/README.md',
  'commander/cowork-plugin/lib/banner.txt',
  'commander/cowork-plugin/skills/ccc/references/main-menu.json',
  'commander/cowork-plugin-pro/README.md',
  'scripts/update-github-repo-metadata.sh',
  'docs/**/*.md',
  'mintlify-docs/**/*.mdx',
  '.parity-extra.txt',
];

const SUBSET_SKILL_CEILING = 50;
const RULE_NAMES = ['skills', 'agents', 'hooks', 'handlers', 'bundled MCP', 'version'];
const ALLOWLIST_FILE = path.join('scripts', 'parity-allowlist.json');
const PLUGIN_DIR = path.join('commander', 'cowork-plugin');
const SKIP_DIRS = new Set(['node_modules', '.git']);

function parseArgs(argv) {
  const opts = { root: path.join(__dirname, '..') };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--root') {
      if (!argv[i + 1]) throw new Error('--root needs a directory');
      opts.root = path.resolve(argv[++i]);
    } else if (argv[i] === '--help' || argv[i] === '-h') {
      opts.help = true;
    } else {
      throw new Error('unknown argument: ' + argv[i]);
    }
  }
  return opts;
}

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (err) {
    throw new Error('cannot read ' + file + ': ' + err.message, { cause: err });
  }
}

function walk(dir, onFile) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, onFile);
    else if (entry.isFile()) onFile(full);
  }
}

function countNamed(dir, name) {
  let n = 0;
  walk(dir, (f) => { if (path.basename(f) === name) n++; });
  return n;
}

function deriveTruth(root) {
  const plugin = path.join(root, PLUGIN_DIR);
  const pkg = readJson(path.join(root, 'package.json'));
  if (!/^\d+\.\d+\.\d+/.test(pkg.version || '')) throw new Error('package.json has no semver version');

  const hooks = readJson(path.join(plugin, 'hooks', 'hooks.json')).hooks || {};
  let handlers = 0;
  for (const groups of Object.values(hooks)) {
    for (const group of groups) handlers += Array.isArray(group.hooks) ? group.hooks.length : 1;
  }

  const mcpFile = path.join(plugin, '.mcp.json');
  const mcp = fs.existsSync(mcpFile) ? Object.keys(readJson(mcpFile).mcpServers || {}).length : 0;
  const agentsDir = path.join(plugin, 'agents');
  const agents = fs.existsSync(agentsDir) ? fs.readdirSync(agentsDir).filter((f) => f.endsWith('.md')).length : 0;

  const pluginSkills = countNamed(path.join(plugin, 'skills'), 'SKILL.md');
  const ecosystemSkills = countNamed(path.join(root, 'skills'), 'SKILL.md');

  return {
    version: pkg.version,
    major: pkg.version.split('.')[0],
    pluginSkills,
    ecosystemSkills,
    totalSkills: pluginSkills + ecosystemSkills,
    agents,
    hookEvents: Object.keys(hooks).length,
    handlers,
    bundledMcp: mcp,
  };
}

// Minimal glob: `*` matches within a path segment, `**/` matches zero or more
// directories. Enough for SURFACES and allowlist entries without a dependency.
function globToRegExp(glob) {
  let re = '';
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i];
    if (c === '*' && glob[i + 1] === '*') {
      re += glob[i + 2] === '/' ? '(?:.*/)?' : '.*';
      i += glob[i + 2] === '/' ? 2 : 1;
    } else if (c === '*') {
      re += '[^/]*';
    } else {
      re += c.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
    }
  }
  return new RegExp('^' + re + '$');
}

function toPosix(p) {
  return p.split(path.sep).join('/');
}

function expandSurfaces(root, surfaces) {
  const files = new Set();
  for (const pattern of surfaces) {
    if (!pattern.includes('*')) {
      if (fs.existsSync(path.join(root, pattern))) files.add(pattern);
      continue;
    }
    const base = pattern.slice(0, pattern.indexOf('*')).replace(/[^/]*$/, '');
    const re = globToRegExp(pattern);
    walk(path.join(root, base), (f) => {
      const rel = toPosix(path.relative(root, f));
      if (re.test(rel)) files.add(rel);
    });
  }
  return [...files].sort();
}

function loadAllowlist(root) {
  const file = path.join(root, ALLOWLIST_FILE);
  if (!fs.existsSync(file)) return [];
  const data = readJson(file);
  const entries = Array.isArray(data.entries) ? data.entries : [];
  return entries.map((e, i) => {
    if (typeof e.file !== 'string' || typeof e.reason !== 'string' || !e.reason.trim()) {
      throw new Error(ALLOWLIST_FILE + ' entry ' + i + ' needs string "file" and a non-empty "reason"');
    }
    if (e.what !== undefined && !RULE_NAMES.includes(e.what)) {
      throw new Error(ALLOWLIST_FILE + ' entry ' + i + ' has unknown "what": ' + e.what + ' (use ' + RULE_NAMES.join(', ') + ')');
    }
    return {
      file: globToRegExp(e.file),
      match: typeof e.match === 'string' ? e.match : null,
      what: e.what || null,
    };
  });
}

function isAllowlisted(allowlist, file, line, what) {
  return allowlist.some((e) => e.file.test(file) &&
    (e.match === null || line.includes(e.match)) &&
    (e.what === null || e.what === what));
}

// Version claims, checked against package.json regardless of their major:
//   1. a version field (`version: x.y.z`, `"version": "x.y.z"`),
//   2. a version after the product name (`CC Commander v7.0.0`, `Commander 8.0.0`, `CCC v6.1.0`),
//   3. any bare x.y.z on the current major.
// Other bare versions (Node, Claude Code CLI, dependencies, older release
// history such as "new in v7.2.0") are not treated as product claims.
function versionRegExp(major) {
  const ver = '(\\d+\\.\\d+\\.\\d+)';
  const end = '(?![\\w-]|\\.\\d)';
  const field = '^\\s*["\']?version["\']?\\s*[:=]\\s*["\']?v?' + ver + end;
  const product = '(?:\\b(?:CC\\s+|Claude\\s+Code\\s+)?Commander|\\bCCC)\\s+(?:version\\s+|v)?' + ver + end;
  const bare = '(?<![\\w.])v?(' + major + '\\.\\d+\\.\\d+)' + end;
  return new RegExp(field + '|' + product + '|' + bare, 'gi');
}

function claimRules(truth) {
  const skillsBare = [truth.pluginSkills, truth.ecosystemSkills, truth.totalSkills];
  return [
    {
      what: 'skills',
      re: /(?<![\w.])(\d{1,4})(\+?)\s+(plugin\s+|ecosystem\s+)?skills\b/gi,
      expected: (m) => {
        const kind = (m[3] || '').trim().toLowerCase();
        if (kind === 'plugin') return [truth.pluginSkills];
        if (kind === 'ecosystem') return [truth.ecosystemSkills];
        if (!m[2] && Number(m[1]) < SUBSET_SKILL_CEILING) return null;
        return skillsBare;
      },
      label: (m) => ((m[3] || '').trim().toLowerCase() || 'bare') + ' skills',
    },
    {
      what: 'agents',
      re: /(?<![\w.])(\d{1,4})\+?\s+(?:specialist\s+)?(?:sub-?)?agents\b/gi,
      expected: () => [truth.agents],
    },
    {
      what: 'hooks',
      re: /(?<![\w.])(\d{1,4})\+?\s+(?:lifecycle\s+)?hooks\b/gi,
      expected: () => [truth.hookEvents],
    },
    {
      what: 'handlers',
      re: /(?<![\w.])(\d{1,4})\+?\s+(?:hook\s+)?handlers\b/gi,
      expected: () => [truth.handlers],
    },
    {
      what: 'bundled MCP',
      re: /(?<![\w.])(\d{1,2})\s+(?:credential-free\s+)?bundled(?=\s*(?:\+|MCPs?\b|servers\b))/gi,
      expected: () => [truth.bundledMcp],
    },
    {
      what: 'version',
      re: versionRegExp(truth.major),
      expected: () => [truth.version],
      value: (m) => m[1] || m[2] || m[3],
    },
  ];
}

function scanFile(root, rel, rules, allowlist) {
  const lines = fs.readFileSync(path.join(root, rel), 'utf8').split(/\r?\n/);
  const out = [];
  lines.forEach((line, i) => {
    if (/parity-ignore(?!-next-line)/.test(line)) return;
    if (i > 0 && /parity-ignore-next-line/.test(lines[i - 1])) return;
    for (const rule of rules) {
      if (isAllowlisted(allowlist, rel, line, rule.what)) continue;
      for (const m of line.matchAll(rule.re)) {
        const got = rule.value ? rule.value(m) : Number(m[1]);
        const want = rule.expected(m);
        if (want === null || want.includes(got)) continue;
        out.push({
          file: rel,
          line: i + 1,
          what: rule.label ? rule.label(m) : rule.what,
          claimed: m[0],
          expected: want.join(' | '),
          text: line.trim().slice(0, 160),
        });
      }
    }
  });
  return out;
}

function run(root) {
  const truth = deriveTruth(root);
  const rules = claimRules(truth);
  const allowlist = loadAllowlist(root);
  const files = expandSurfaces(root, SURFACES);
  const mismatches = [];
  for (const rel of files) mismatches.push(...scanFile(root, rel, rules, allowlist));
  return { truth, files, mismatches };
}

function main() {
  let opts;
  try {
    opts = parseArgs(process.argv.slice(2));
  } catch (err) {
    console.error('check-parity: ' + err.message);
    process.exit(2);
  }
  if (opts.help) {
    console.log('Usage: node scripts/check-parity.js [--root <dir>]');
    return;
  }
  let result;
  try {
    result = run(opts.root);
  } catch (err) {
    console.error('check-parity: ' + err.message);
    process.exit(2);
  }
  const { truth, files, mismatches } = result;
  const summary = 'v' + truth.version + ', ' + truth.pluginSkills + ' plugin skills, ' +
    truth.ecosystemSkills + ' ecosystem skills, ' + truth.agents + ' agents, ' +
    truth.hookEvents + ' hook events, ' + truth.handlers + ' handlers, ' +
    truth.bundledMcp + ' bundled MCP';
  if (mismatches.length) {
    console.error('check-parity: ' + mismatches.length + ' mismatch(es) against disk (' + summary + ')');
    for (const m of mismatches) {
      console.error('  ' + m.file + ':' + m.line + '  ' + m.what + ' "' + m.claimed + '" expected ' + m.expected + '\n      ' + m.text);
    }
    console.error('Fix the number, or exempt a historical mention with `parity-ignore` or ' + ALLOWLIST_FILE + '.');
    process.exit(1);
  }
  console.log('check-parity: OK, ' + files.length + ' files consistent with disk (' + summary + ')');
}

if (require.main === module) main();

module.exports = { deriveTruth, expandSurfaces, globToRegExp, run, versionRegExp, SURFACES };
