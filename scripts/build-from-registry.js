#!/usr/bin/env node
'use strict';

/**
 * CC Commander — Registry generator and validator
 *
 * Walks both skill roots (the ecosystem catalog under skills/ and the Desktop
 * plugin's commander/cowork-plugin/skills/), plus commands, agents and hooks,
 * and writes commander/core/registry.yaml.
 *
 * Every skill row carries a path relative to the repository that points at the
 * real SKILL.md, a stable unique id, its frontmatter name, and a description
 * read from frontmatter (or, for the few files without frontmatter, from the
 * first prose line of the body).
 *
 * Ids: a skill's id is its directory name when that name is unique across both
 * roots. When two SKILL.md files share a directory name, each one gets a
 * qualified id: `<source>/<directory relative to its source root>`, where
 * source is `plugin` or `ecosystem` (e.g. `plugin/ccc-data`,
 * `ecosystem/ccc-data`, `ecosystem/ccc-marketing/ab-test-setup`).
 *
 * Usage:
 *   node scripts/build-from-registry.js --check    # drift + validation check
 *   node scripts/build-from-registry.js --generate # regenerate registry.yaml
 *
 * --check fails when the file differs from a fresh generation, or when the
 * generated catalog has a missing path, a duplicate id or path, an empty or
 * malformed description, or counts that disagree with commander/contract.json.
 */

var fs = require('fs');
var path = require('path');

var ROOT = path.join(__dirname, '..');
var REGISTRY_REL = path.join('commander', 'core', 'registry.yaml');
var REGISTRY_PATH = path.join(ROOT, REGISTRY_REL);

var SKILL_ROOTS = [
  { source: 'ecosystem', dir: 'skills', contractKey: 'ecosystem_skills' },
  { source: 'plugin', dir: path.join('commander', 'cowork-plugin', 'skills'), contractKey: 'plugin_skills' },
];

var DESCRIPTION_MAX = 300;

function toPosix(p) {
  return p.split(path.sep).join('/');
}

// ─── Frontmatter parser (small, dependency-free) ───────────────
//
// Handles the subset SKILL.md files use: `key: value` pairs, single- and
// double-quoted scalars (including quoted scalars spanning lines), plain
// scalars continued on indented lines, and `|` / `>` block scalars with
// optional chomping indicators. Nested maps and lists are skipped.

function unquoteSingle(s) {
  return s.replace(/''/g, "'");
}

function unquoteDouble(s) {
  return s.replace(/\\(u[0-9a-fA-F]{4}|x[0-9a-fA-F]{2}|.)/g, function(_, esc) {
    var c = esc[0];
    if (c === 'u' || c === 'x') return String.fromCharCode(parseInt(esc.slice(1), 16));
    if (c === 'n') return '\n';
    if (c === 't') return '\t';
    if (c === 'r') return '\r';
    if (c === '0') return '\0';
    return esc; // \" \\ \/ and anything else map to the literal character
  });
}

// Index of the closing quote in s (which starts just after the opening quote),
// or -1 when the scalar continues on the next line.
function closingQuote(s, q) {
  for (var i = 0; i < s.length; i++) {
    if (q === '"' && s[i] === '\\') { i++; continue; }
    if (s[i] === q) {
      if (q === "'" && s[i + 1] === "'") { i++; continue; }
      return i;
    }
  }
  return -1;
}

function foldLines(lines) {
  // YAML flow folding: single newlines become spaces, blank lines become \n.
  var out = '';
  var pendingBreak = false;
  for (var i = 0; i < lines.length; i++) {
    var l = lines[i].trim();
    if (l === '') { out += '\n'; pendingBreak = true; continue; }
    if (out && !pendingBreak) out += ' ';
    out += l;
    pendingBreak = false;
  }
  return out;
}

function parseFrontmatter(text) {
  var lines = String(text).replace(/^﻿/, '').split(/\r?\n/);
  if (!lines.length || lines[0].trim() !== '---') return null;
  var end = -1;
  for (var k = 1; k < lines.length; k++) {
    if (lines[k].trim() === '---' || lines[k].trim() === '...') { end = k; break; }
  }
  if (end === -1) return null;

  var out = {};
  var i = 1;
  while (i < end) {
    var m = /^([A-Za-z_][\w-]*)\s*:(?:\s+(.*))?$/.exec(lines[i]);
    if (!m) { i++; continue; }
    var key = m[1];
    var raw = (m[2] || '').trim();
    if (raw[0] !== '"' && raw[0] !== "'") raw = raw.replace(/\s+#.*$/, ''); // trailing comment on a plain scalar
    i++;

    if (/^[|>][+-]?\d*$/.test(raw)) {
      var block = [];
      while (i < end && (/^\s+\S/.test(lines[i]) || lines[i].trim() === '')) block.push(lines[i++]);
      while (block.length && block[block.length - 1].trim() === '') block.pop();
      var indent = Infinity;
      block.forEach(function(b) { if (b.trim()) indent = Math.min(indent, b.match(/^\s*/)[0].length); });
      var stripped = block.map(function(b) { return b.slice(indent === Infinity ? 0 : indent); });
      out[key] = raw[0] === '|' ? stripped.join('\n') : foldLines(stripped);
      continue;
    }

    if (raw[0] === '"' || raw[0] === "'") {
      var q = raw[0];
      var buf = [raw.slice(1)];
      var close = closingQuote(buf[0], q);
      while (close === -1 && i < end) {
        buf.push(lines[i++]);
        close = closingQuote(buf[buf.length - 1], q);
      }
      if (close !== -1) buf[buf.length - 1] = buf[buf.length - 1].slice(0, close);
      var joined = buf.length === 1 ? buf[0] : foldLines(buf);
      out[key] = q === '"' ? unquoteDouble(joined) : unquoteSingle(joined);
      continue;
    }

    if (raw === '') {
      // Nested map or list: skip its indented body.
      while (i < end && (/^\s+/.test(lines[i]) || lines[i].trim() === '')) i++;
      out[key] = '';
      continue;
    }

    var plain = [raw];
    while (i < end && /^\s+\S/.test(lines[i]) && !/^\s*-\s/.test(lines[i])) plain.push(lines[i++]);
    out[key] = foldLines(plain);
  }
  return out;
}

// First prose line of a Markdown body, for SKILL.md files without frontmatter.
function firstProseLine(text) {
  var body = String(text).replace(/^﻿/, '');
  var fm = /^---\r?\n[\s\S]*?\r?\n---\r?\n/.exec(body);
  if (fm) body = body.slice(fm[0].length);
  var inFence = false;
  var lines = body.split(/\r?\n/);
  for (var i = 0; i < lines.length; i++) {
    var t = lines[i].trim();
    if (/^(```|~~~)/.test(t)) { inFence = !inFence; continue; }
    if (inFence || !t) continue;
    // Skip headings, rules, HTML, tables, quotes, images and `**Label:**` metadata lines.
    if (/^(#|---|\*\*\*|___|<|\||>|!\[|\*\*[^*]+(:\*\*|\*\*\s*:))/.test(t)) continue;
    return t;
  }
  return '';
}

function oneLine(s) {
  var t = String(s || '').replace(/\s+/g, ' ').trim();
  if (t.length <= DESCRIPTION_MAX) return t;
  var cut = t.slice(0, DESCRIPTION_MAX - 3);
  var sp = cut.lastIndexOf(' ');
  return (sp > DESCRIPTION_MAX / 2 ? cut.slice(0, sp) : cut).replace(/[\s,;:.-]+$/, '') + '...';
}

// ─── Scan helpers ──────────────────────────────────────────────

// Recursively collect SKILL.md files. Mirrors scripts/audit-counts.js so the
// counts match commander/contract.json: real directories only (symlinked
// aliases are skipped), no dot-directories, node_modules or vendor.
function findSkillFiles(dir) {
  var files = [];
  function walk(d) {
    var entries;
    try { entries = fs.readdirSync(d, { withFileTypes: true }); } catch (_) { return; }
    entries.sort(function(a, b) { return a.name < b.name ? -1 : a.name > b.name ? 1 : 0; });
    for (var e of entries) {
      if (e.isDirectory() && !e.name.startsWith('.') && e.name !== 'node_modules' && e.name !== 'vendor') {
        walk(path.join(d, e.name));
      } else if (e.isFile() && e.name === 'SKILL.md') {
        files.push(path.join(d, e.name));
      }
    }
  }
  walk(dir);
  return files;
}

function readSkill(root, skillRoot, file) {
  var text = '';
  try { text = fs.readFileSync(file, 'utf8'); } catch (_) {}
  var fm = parseFrontmatter(text) || {};
  var dir = path.dirname(file);
  var relDir = toPosix(path.relative(path.join(root, skillRoot.dir), dir));
  var leaf = path.basename(dir);
  var top = relDir.split('/')[0];
  var fmName = typeof fm.name === 'string' ? oneLine(fm.name) : '';
  var fmDesc = typeof fm.description === 'string' ? fm.description : '';
  return {
    leaf: leaf,
    relDir: relDir,
    source: skillRoot.source,
    name: fmName || leaf,
    path: toPosix(path.relative(root, file)),
    domain: top.startsWith('ccc-') ? top : 'general',
    description: oneLine(fmDesc || firstProseLine(text)),
  };
}

function scanSkills(root) {
  var found = [];
  SKILL_ROOTS.forEach(function(skillRoot) {
    findSkillFiles(path.join(root, skillRoot.dir)).forEach(function(file) {
      found.push(readSkill(root, skillRoot, file));
    });
  });
  var leafCount = {};
  found.forEach(function(s) { leafCount[s.leaf] = (leafCount[s.leaf] || 0) + 1; });
  return found.map(function(s) {
    var id = leafCount[s.leaf] > 1 ? s.source + '/' + s.relDir : s.leaf;
    return { id: id, name: s.name, path: s.path, source: s.source, domain: s.domain, tier: 'free', description: s.description };
  });
}

function scanCommandFiles(root, dir) {
  var commands = [];
  function walk(d, prefix) {
    var entries;
    try { entries = fs.readdirSync(d, { withFileTypes: true }); } catch (_) { return; }
    entries.sort(function(a, b) { return a.name < b.name ? -1 : a.name > b.name ? 1 : 0; });
    for (var entry of entries) {
      if (entry.isDirectory()) { walk(path.join(d, entry.name), (prefix || '') + entry.name + '/'); continue; }
      if (!entry.isFile() || !entry.name.endsWith('.md')) continue;
      var name = ((prefix || '') + entry.name).replace(/\.md$/, '').replace(/\//g, ':');
      commands.push({ id: name, path: toPosix(path.relative(root, path.join(d, entry.name))) });
    }
  }
  walk(dir, '');
  return commands;
}

function scanAgents(root, dir) {
  var agents = [];
  var proAgents = ['reviewer', 'builder', 'researcher', 'debugger', 'fleet-worker'];
  var entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch (_) { return agents; }
  entries.sort(function(a, b) { return a.name < b.name ? -1 : a.name > b.name ? 1 : 0; });
  for (var entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith('.md')) continue;
    var name = entry.name.replace(/\.md$/, '');
    agents.push({ id: name, path: toPosix(path.relative(root, path.join(dir, entry.name))), tier: proAgents.includes(name) ? 'pro' : 'free' });
  }
  return agents;
}

function scanHooks(root, dir) {
  var hooks = [];
  var entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch (_) { return hooks; }
  entries.sort(function(a, b) { return a.name < b.name ? -1 : a.name > b.name ? 1 : 0; });
  for (var entry of entries) {
    if (!entry.isFile() || (!entry.name.endsWith('.js') && entry.name !== 'hooks.json')) continue;
    hooks.push({ id: entry.name.replace(/\.js$/, ''), path: toPosix(path.relative(root, path.join(dir, entry.name))) });
  }
  return hooks;
}

// ─── YAML serializer (no deps) ────────────────────────────────

function toYaml(obj, indent) {
  indent = indent || 0;
  var pad = '  '.repeat(indent);
  var childPad = '  '.repeat(indent + 1);
  if (Array.isArray(obj)) {
    if (obj.length === 0) return '[]\n';
    return obj.map(function(item) {
      if (typeof item === 'object' && item !== null) {
        var keys = Object.keys(item);
        if (keys.length === 0) return pad + '- {}\n';
        var firstKey = keys[0];
        var firstVal = item[firstKey];
        var firstLine = pad + '- ' + firstKey + ': ' + yamlScalar(firstVal) + '\n';
        var rest = keys.slice(1).map(function(key) {
          var val = item[key];
          if (typeof val === 'object' && val !== null) {
            return childPad + key + ':\n' + toYaml(val, indent + 2);
          }
          return childPad + key + ': ' + yamlScalar(val) + '\n';
        }).join('');
        return firstLine + rest;
      }
      return pad + '- ' + yamlScalar(item) + '\n';
    }).join('');
  }
  if (typeof obj === 'object' && obj !== null) {
    return Object.keys(obj).map(function(key) {
      var val = obj[key];
      if (typeof val === 'object' && val !== null) {
        return pad + key + ':\n' + toYaml(val, indent + 1);
      }
      return pad + key + ': ' + yamlScalar(val) + '\n';
    }).join('');
  }
  return pad + yamlScalar(obj) + '\n';
}

// Plain scalars are emitted only when YAML would read them back as the same
// string; everything else is double-quoted with JSON escaping, which is valid
// YAML double-quoted syntax.
function yamlScalar(val) {
  if (typeof val !== 'string') return String(val);
  var needsQuotes = val === '' ||
    /[:#"'\\\n\t]/.test(val) ||
    /^[\s\-?,[\]{}&*!|>%@`]/.test(val) ||
    /\s$/.test(val) ||
    /^(true|false|yes|no|on|off|null|~|y|n)$/i.test(val) ||
    /^[-+]?(\d[\d_]*(\.\d*)?|\.\d+)([eE][-+]?\d+)?$/.test(val) ||
    /^0[xo]/i.test(val) ||
    /^\.(inf|nan)$/i.test(val);
  return needsQuotes ? JSON.stringify(val) : val;
}

// ─── Generate registry ────────────────────────────────────────

function generateRegistry(root) {
  root = root || ROOT;
  var commandsDir = path.join(root, 'commands');
  var agentsDir = path.join(root, 'commander', 'cowork-plugin', 'agents');
  var hooksDir = path.join(root, 'commander', 'cowork-plugin', 'hooks');

  var skills = scanSkills(root);
  var commands = scanCommandFiles(root, commandsDir);
  var agents = scanAgents(root, agentsDir);
  var hooks = scanHooks(root, hooksDir);


  var modes = [
    { id: 'race', trigger: '/mode race', costProfile: 'haiku-first' },
    { id: 'production', trigger: '/mode production', costProfile: 'sonnet-opus-mix' },
    { id: 'learning', trigger: '/mode learning', costProfile: 'sonnet' },
    { id: 'silent', trigger: '/mode silent', costProfile: 'haiku' },
    { id: 'explore', trigger: '/mode explore', costProfile: 'sonnet' },
    { id: 'deep', trigger: '/mode deep', costProfile: 'opus-xhigh' },
    { id: 'vibe', trigger: '/mode vibe', costProfile: 'sonnet' },
  ];

  // ── Vendor mappings (Phase 3c) ────────────────────────────────
  // TOP 3 MAP candidates — routed into /ccc-learn or domain routers.
  // Skills load on demand from vendor submodule; we register paths only (no code copy).
  // REFERENCE-ONLY vendors are listed as comments in registry.yaml footer.
  var vendors = [
    // [C:vendor:gstack] — MIT — PDF generation + browser REPL (v1.25.0.0+)
    // Skills load on demand from vendor submodule; no code copy.
    { id: 'vendor:gstack', name: 'gstack', license: 'MIT', path: 'vendor/gstack', status: 'map', router: '/ccc-learn', note: '[C:vendor:gstack] PDF generation (make-pdf/SKILL.md) + browser sidebar REPL (open-gstack-browser/SKILL.md) + cookie mgmt (setup-browser-cookies/SKILL.md). Route via /ccc-learn > Browser & PDF tools.' },
    // [C:vendor:ecc] — MIT — Multi-agent observability dashboard (ecc2 Rust board + Python dashboard + hook collection)
    { id: 'vendor:ecc', name: 'everything-claude-code', license: 'MIT', path: 'vendor/everything-claude-code', status: 'map', router: '/ccc-learn', note: '[C:vendor:ecc] Observability: ecc_dashboard.py (Python), ecc2/ (Rust board), hooks/ (PreToolUse/PostToolUse/Stop collection). Route via /ccc-learn > Observability & hooks.' },
    // [C:vendor:ohmy] — MIT — Team-aware git worktree orchestration (v4.13.5, team/omc-teams/autoresearch skills)
    { id: 'vendor:ohmy', name: 'oh-my-claudecode', license: 'MIT', path: 'vendor/oh-my-claudecode', status: 'map', router: '/ccc-fleet', note: '[C:vendor:ohmy] Team worktrees: skills/team + skills/omc-teams (register/list/status) + skills/autoresearch. Bridge at bridge/team.js. Route via /ccc-fleet > Team worktree management.' },
    // REFERENCE-ONLY — vendor present but no user-facing skill mapping (consider drop in v4.2)
    { id: 'vendor:acpx', name: 'acpx', license: 'MIT', path: 'vendor/acpx', status: 'reference-only', note: 'ACP protocol patterns; 2 skills already mapped (acpx, acpx-patterns). Consider drop in v4.2.' },
    { id: 'vendor:caliber-ai-setup', name: 'caliber-ai-setup', license: 'MIT', path: 'vendor/caliber-ai-setup', status: 'reference-only', note: 'AI setup wizard; no user-facing skill mapping. Consider drop in v4.2.' },
    { id: 'vendor:claude-code-best-practice', name: 'claude-code-best-practice', license: 'MIT', path: 'vendor/claude-code-best-practice', status: 'reference-only', note: 'Best practice docs; no user-facing mapping. Consider drop in v4.2.' },
    { id: 'vendor:claude-code-prompts', name: 'claude-code-prompts', license: 'MIT', path: 'vendor/claude-code-prompts', status: 'reference-only', note: 'Prompt templates; no user-facing mapping. Consider drop in v4.2.' },
    { id: 'vendor:claude-hud', name: 'claude-hud', license: 'MIT', path: 'vendor/claude-hud', status: 'reference-only', note: 'HUD overlay; no user-facing mapping. Consider drop in v4.2.' },
    { id: 'vendor:claude-skills', name: 'claude-skills', license: 'MIT', path: 'vendor/claude-skills', status: 'reference-only', note: 'Community skills collection; no user-facing mapping. Consider drop in v4.2.' },
    { id: 'vendor:compound-engineering', name: 'compound-engineering', license: 'MIT', path: 'vendor/compound-engineering', status: 'reference-only', note: 'CE CLI workflows; no user-facing mapping. Consider drop in v4.2.' },
    { id: 'vendor:graphify', name: 'graphify', license: 'MIT', path: 'vendor/graphify', status: 'reference-only', note: 'Knowledge graph CLI; no user-facing mapping. Consider drop in v4.2.' },
    { id: 'vendor:mattpocock-skills', name: 'mattpocock-skills', license: 'MIT', path: 'vendor/mattpocock-skills', status: 'reference-only', note: 'TypeScript-first skills (grill-me, to-prd); no user-facing mapping. Consider drop in v4.2.' },
    { id: 'vendor:repomix', name: 'repomix', license: 'MIT', path: 'vendor/repomix', status: 'reference-only', note: 'Repo packing for LLM context; no user-facing mapping. Consider drop in v4.2.' },
    { id: 'vendor:superpowers', name: 'superpowers', license: 'MIT', path: 'vendor/superpowers', status: 'reference-only', note: 'Codex integration + writing skills; 2 skills adapted (ccc-agent-writing, ccc-systematic-debugging). Consider drop in v4.2.' },
    { id: 'vendor:ui-ux-pro-max-skill', name: 'ui-ux-pro-max-skill', license: 'MIT', path: 'vendor/ui-ux-pro-max-skill', status: 'reference-only', note: 'UI/UX Three.js skills; no user-facing mapping. Consider drop in v4.2.' },
    { id: 'vendor:claude-reflect', name: 'claude-reflect', license: 'MIT', path: 'vendor/claude-reflect', status: 'reference-only', note: 'Reflection/migration patterns; at upstream HEAD. No user-facing mapping. Consider drop in v4.2.' },
    { id: 'vendor:rtk', name: 'rtk', license: 'Apache-2.0', path: 'vendor/rtk', status: 'reference-only', note: 'RTK token-kill CLI; Apache-2.0 with NOTICE.md. No user-facing mapping. Consider drop in v4.2.' },
    // PINNED — do not bump (license constraints)
    { id: 'vendor:claude-mem', name: 'claude-mem', license: 'Apache-2.0', path: null, status: 'external', note: 'External opt-in, not a submodule and not bundled. Apache-2.0 since 2026 (earlier releases AGPL-3.0); bundling needs Kevin\'s decision and an Apache NOTICE section.' },
    { id: 'vendor:claude-code-ultimate-guide', name: 'claude-code-ultimate-guide', license: 'CC-BY-SA-4.0', path: 'vendor/claude-code-ultimate-guide', status: 'pinned', note: 'CC-BY-SA-4.0 — content license, derivatives must share-alike. Stay pinned.' },
  ];

  var registry = {
    generated: new Date().toISOString().split('T')[0],
    version: readPackageVersion(root),
    skills: skills,
    agents: agents,
    modes: modes,
    commands: commands,
    hooks: hooks,
    vendors: vendors,
  };

  return registry;
}

function readPackageVersion(root) {
  try {
    return JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).version || '0.0.0';
  } catch (_) {
    return '0.0.0';
  }
}

function serializeRegistry(registry) {
  return '# CC Commander Registry — auto-generated by scripts/build-from-registry.js\n# DO NOT edit by hand. Run: node scripts/build-from-registry.js --generate\n\n' + toYaml(registry);
}

// ─── Validation ───────────────────────────────────────────────

function readContract(root) {
  try {
    return JSON.parse(fs.readFileSync(path.join(root, 'commander', 'contract.json'), 'utf8'));
  } catch (_) {
    return null;
  }
}

// Returns a list of human-readable problems; empty means the catalog is valid.
// Vendors are not path-checked: their submodules are optional checkouts.
function validateRegistry(registry, root) {
  root = root || ROOT;
  var errors = [];

  ['skills', 'agents', 'commands', 'hooks'].forEach(function(section) {
    var rows = registry[section] || [];
    var seenIds = {};
    var seenPaths = {};
    rows.forEach(function(row, i) {
      var where = section + '[' + i + ']' + (row.id ? ' (' + row.id + ')' : '');
      if (!row.id) errors.push(where + ': missing id');
      else if (seenIds[row.id]) errors.push(section + ': duplicate id "' + row.id + '"');
      else seenIds[row.id] = true;

      if (!row.path) {
        errors.push(where + ': missing path');
      } else {
        if (seenPaths[row.path]) errors.push(section + ': duplicate path "' + row.path + '" (' + seenPaths[row.path] + ', ' + row.id + ')');
        else seenPaths[row.path] = row.id;
        if (path.isAbsolute(row.path) || row.path.split('/').includes('..')) {
          errors.push(where + ': path must be relative to the repository: ' + row.path);
        } else if (!fs.existsSync(path.join(root, row.path))) {
          errors.push(where + ': path does not exist: ' + row.path);
        }
      }
    });
  });

  (registry.skills || []).forEach(function(skill) {
    var d = typeof skill.description === 'string' ? skill.description.trim() : '';
    if (!d) errors.push('skills (' + skill.id + '): empty description in ' + skill.path);
    else if (/^name\s*:/.test(d)) errors.push('skills (' + skill.id + '): description is a frontmatter line ("' + d.slice(0, 40) + '") in ' + skill.path);
    else if (d === '---') errors.push('skills (' + skill.id + '): description is a frontmatter fence in ' + skill.path);
  });

  var contract = readContract(root);
  if (contract) {
    SKILL_ROOTS.forEach(function(skillRoot) {
      var expected = contract[skillRoot.contractKey];
      if (typeof expected !== 'number') return;
      var actual = (registry.skills || []).filter(function(s) { return s.source === skillRoot.source; }).length;
      if (actual !== expected) {
        errors.push('skills: ' + actual + ' ' + skillRoot.source + ' entries but contract.json ' + skillRoot.contractKey + ' is ' + expected);
      }
    });
    if (typeof contract.specialist_agents === 'number' && (registry.agents || []).length !== contract.specialist_agents) {
      errors.push('agents: ' + (registry.agents || []).length + ' entries but contract.json specialist_agents is ' + contract.specialist_agents);
    }
  }

  return errors;
}

// ─── Registry parser (minimal YAML → ids, for drift messages) ─

function parseRegistryIds(yamlText, key) {
  var ids = [];
  var inSection = false;
  var lines = yamlText.split('\n');
  for (var line of lines) {
    if (line === key + ':') { inSection = true; continue; }
    if (inSection) {
      if (/^\S/.test(line)) { inSection = false; continue; }
      var m = /^ {2}- id: (.*)$/.exec(line);
      if (m) {
        var v = m[1].trim();
        if (v[0] === '"') { try { v = JSON.parse(v); } catch (_) {} }
        ids.push(v);
      }
    }
  }
  return ids;
}

function withoutDate(text) {
  return String(text).replace(/^generated: .*$/m, 'generated: <date>');
}

// Compare the committed file with a fresh generation. Returns drift lines.
function diffRegistry(existingYaml, registry) {
  var drift = [];
  ['skills', 'agents', 'commands', 'hooks', 'modes', 'vendors'].forEach(function(section) {
    var existing = parseRegistryIds(existingYaml, section);
    var current = (registry[section] || []).map(function(r) { return r.id; });
    var missing = current.filter(function(id) { return !existing.includes(id); });
    var extra = existing.filter(function(id) { return !current.includes(id); });
    var fmt = function(list) { return list.slice(0, 5).join(', ') + (list.length > 5 ? ' (+' + (list.length - 5) + ' more)' : ''); };
    if (missing.length) drift.push(section + ' on disk but not in registry: ' + fmt(missing));
    if (extra.length) drift.push(section + ' in registry but not on disk: ' + fmt(extra));
  });
  if (!drift.length && withoutDate(existingYaml) !== withoutDate(serializeRegistry(registry))) {
    drift.push('registry.yaml content (paths, names, descriptions or fields) differs from a fresh generation');
  }
  return drift;
}

// ─── Main ─────────────────────────────────────────────────────

function main(argv) {
  var CHECK_MODE = argv.includes('--check');
  var registry = generateRegistry(ROOT);
  var errors = validateRegistry(registry, ROOT);

  if (!CHECK_MODE) {
    fs.mkdirSync(path.dirname(REGISTRY_PATH), { recursive: true });
    fs.writeFileSync(REGISTRY_PATH, serializeRegistry(registry));
    process.stdout.write('Registry generated: ' + REGISTRY_PATH + '\n');
    process.stdout.write('  skills: ' + registry.skills.length + '\n');
    process.stdout.write('  agents: ' + registry.agents.length + '\n');
    process.stdout.write('  commands: ' + registry.commands.length + '\n');
    process.stdout.write('  hooks: ' + registry.hooks.length + '\n');
    if (errors.length) {
      errors.forEach(function(e) { process.stdout.write('INVALID: ' + e + '\n'); });
      process.stdout.write('FAIL: registry written but has ' + errors.length + ' validation error(s)\n');
      return 1;
    }
    return 0;
  }

  if (!fs.existsSync(REGISTRY_PATH)) {
    process.stdout.write('FAIL: registry.yaml not found at ' + REGISTRY_PATH + '\n');
    process.stdout.write('Run: node scripts/build-from-registry.js --generate\n');
    return 1;
  }

  var drift = diffRegistry(fs.readFileSync(REGISTRY_PATH, 'utf8'), registry);
  drift.forEach(function(d) { process.stdout.write('DRIFT: ' + d + '\n'); });
  errors.forEach(function(e) { process.stdout.write('INVALID: ' + e + '\n'); });

  if (drift.length) {
    process.stdout.write('FAIL: registry drift detected. Run: node scripts/build-from-registry.js --generate\n');
    return 1;
  }
  if (errors.length) {
    process.stdout.write('FAIL: registry has ' + errors.length + ' validation error(s)\n');
    return 1;
  }
  process.stdout.write('PASS: registry is in sync and valid (' + registry.skills.length + ' skills, ' + registry.agents.length + ' agents)\n');
  return 0;
}

module.exports = {
  SKILL_ROOTS: SKILL_ROOTS,
  parseFrontmatter: parseFrontmatter,
  firstProseLine: firstProseLine,
  findSkillFiles: findSkillFiles,
  scanSkills: scanSkills,
  generateRegistry: generateRegistry,
  serializeRegistry: serializeRegistry,
  validateRegistry: validateRegistry,
  diffRegistry: diffRegistry,
  parseRegistryIds: parseRegistryIds,
  yamlScalar: yamlScalar,
};

if (require.main === module) {
  process.exit(main(process.argv.slice(2)));
}
