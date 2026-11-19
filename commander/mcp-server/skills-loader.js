'use strict';

/**
 * Skills lazy-loader for MCP server.
 * Reads from local skills dir on demand — no preloading.
 */

var fs = require('fs');
var path = require('path');
var os = require('os');

var ROOT = path.join(__dirname, '..', '..');
var SKILLS_DIR = path.join(ROOT, 'skills');
var PLUGIN_SKILLS_DIR = path.join(__dirname, '..', 'cowork-plugin', 'skills');
var REGISTRY_FILE = path.join(__dirname, '..', 'core', 'registry.yaml');

var _catalog = null;

// One scalar as scripts/build-from-registry.js yamlScalar() writes it: plain, or JSON-quoted.
function registryScalar(raw) {
  var v = raw.trim();
  if (v.charAt(0) === '"') {
    try { return JSON.parse(v); } catch (_) { return v; }
  }
  return v;
}

/**
 * The skills: section of commander/core/registry.yaml, the canonical catalog:
 * one entry per SKILL.md with a unique id (an ecosystem copy that shares a
 * plugin skill's name is `ecosystem/<name>`). Returns null when the registry is
 * missing or unreadable, so the caller can scan the directories instead.
 */
function loadRegistry() {
  var text;
  try { text = fs.readFileSync(REGISTRY_FILE, 'utf8'); } catch (_) { return null; }
  var lines = text.split(/\r?\n/);
  var i = lines.indexOf('skills:');
  if (i < 0) return null;
  var skills = [];
  var cur = null;
  for (i = i + 1; i < lines.length; i++) {
    var line = lines[i];
    if (/^\S/.test(line)) break; // next top-level section
    var m = /^  - id: (.*)$/.exec(line);
    if (m) {
      cur = { id: registryScalar(m[1]) };
      skills.push(cur);
      continue;
    }
    var f = /^    (name|path|domain|tier|description): (.*)$/.exec(line);
    if (f && cur) cur[f[1]] = registryScalar(f[2]);
  }
  var out = [];
  for (var s of skills) {
    if (!s.id || !s.path) continue;
    var abs = path.resolve(ROOT, s.path);
    if (path.relative(ROOT, abs).startsWith('..')) continue; // registry paths stay inside the package
    out.push({
      id: s.id,
      name: s.name || path.basename(path.dirname(abs)),
      domain: s.domain || 'general',
      tier: s.tier || 'free',
      description: s.description || '',
      path: abs,
    });
  }
  return out.length ? out : null;
}

// The frontmatter description, else the first prose line after the frontmatter.
function describe(content) {
  var fm = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(content);
  if (fm) {
    var d = /^description:\s*(.*)$/m.exec(fm[1]);
    if (d) {
      var v = d[1].trim();
      if (/^["']/.test(v)) v = v.slice(1, v.charAt(v.length - 1) === v.charAt(0) ? -1 : undefined);
      if (v && v !== '|' && v !== '>') return v.slice(0, 120);
    }
  }
  var body = fm ? content.slice(fm[0].length) : content;
  for (var line of body.split('\n')) {
    var t = line.trim();
    if (t && !t.startsWith('#') && !t.startsWith('---')) return t.slice(0, 120);
  }
  return '';
}

function buildCatalog() {
  if (_catalog) return _catalog;
  _catalog = loadRegistry() || scanCatalog();
  return _catalog;
}

// Fallback when the registry is absent: scan the skill dirs, namespacing an
// ecosystem skill whose name a plugin skill already uses.
function scanCatalog() {
  var skills = [];
  var seen = new Set();

  function add(entry) {
    if (seen.has(entry.id)) entry.id = 'ecosystem/' + entry.id;
    if (seen.has(entry.id)) return;
    seen.add(entry.id);
    skills.push(entry);
  }

  function read(skillPath) {
    try { return describe(fs.readFileSync(skillPath, 'utf8')); } catch (_) { return ''; }
  }

  function scanDir(dir) {
    var entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch (_) { return; }
    for (var entry of entries) {
      if (!entry.isDirectory() || entry.name.startsWith('.') || entry.name.startsWith('_')) continue;
      var skillPath = path.join(dir, entry.name, 'SKILL.md');
      if (!fs.existsSync(skillPath)) continue;
      add({ id: entry.name, name: entry.name, domain: entry.name.startsWith('ccc-') ? entry.name : 'general', tier: 'free', description: read(skillPath), path: skillPath });
    }
  }

  scanDir(PLUGIN_SKILLS_DIR);
  scanDir(SKILLS_DIR);
  var parents;
  try { parents = fs.readdirSync(SKILLS_DIR, { withFileTypes: true }); } catch (_) { parents = []; }
  for (var p of parents) {
    if (!p.isDirectory() || p.name.startsWith('.') || p.name.startsWith('_')) continue;
    var children;
    try { children = fs.readdirSync(path.join(SKILLS_DIR, p.name), { withFileTypes: true }); } catch (_) { continue; }
    for (var c of children) {
      if (!c.isDirectory() || c.name.startsWith('.') || c.name.startsWith('_')) continue;
      var skillPath = path.join(SKILLS_DIR, p.name, c.name, 'SKILL.md');
      if (!fs.existsSync(skillPath)) continue;
      add({ id: p.name + '/' + c.name, name: c.name, domain: p.name.startsWith('ccc-') ? p.name : 'general', tier: 'free', description: read(skillPath), path: skillPath });
    }
  }
  return skills;
}

function listSkills(opts) {
  opts = opts || {};
  var catalog = buildCatalog();

  var results = catalog;
  if (opts.domain) results = results.filter(function(s) { return s.domain === opts.domain; });
  if (opts.tier) results = results.filter(function(s) { return s.tier === opts.tier; });

  var pageSize = Math.min(opts.pageSize || 20, 50);
  var page = Math.max(opts.page || 1, 1);
  var start = (page - 1) * pageSize;
  var items = results.slice(start, start + pageSize);

  return {
    items: items.map(function(s) { return { id: s.id, name: s.name, domain: s.domain, tier: s.tier, description: s.description }; }),
    total: results.length,
    page: page,
    pageSize: pageSize,
    pages: Math.ceil(results.length / pageSize),
  };
}

// A name shared by several copies resolves to a top-level skill (skills/<name>/ or a plugin skill) before a nested
// pack copy (skills/<pack>/<name>/), whatever order the registry lists them in.
function byName(catalog, name) {
  var hits = catalog.filter(function(s) { return s.name === name; });
  if (hits.length < 2) return hits[0] || null;
  var topLevel = function(s) {
    var parent = path.dirname(path.dirname(s.path));
    return parent === SKILLS_DIR || parent === PLUGIN_SKILLS_DIR;
  };
  return hits.find(topLevel) || hits[0];
}

function getSkill(name) {
  var catalog = buildCatalog();
  // By id, then by name, then by the pre-registry nested id (<parent>/<child>, the skill's dir under skills/).
  var nestedPath = typeof name === 'string' && /^[a-z0-9._-]+\/[a-z0-9._-]+$/i.test(name)
    ? path.join(SKILLS_DIR, name, 'SKILL.md') : null;
  var skill = catalog.find(function(s) { return s.id === name; }) ||
    byName(catalog, name) ||
    (nestedPath ? catalog.find(function(s) { return s.path === nestedPath; }) : null);
  if (!skill) return null;

  try {
    var content = fs.readFileSync(skill.path, 'utf8');
    var out = { id: skill.id, name: skill.name, domain: skill.domain, tier: skill.tier, content: content };
    var license = readSkillLicense(skill.path, content);
    if (license && license.error) return { error: license.error };
    if (license) out.license = license.text;
    return out;
  } catch (_) {
    return null;
  }
}

var LICENSE_NAMES = ['LICENSE.txt', 'LICENSE', 'LICENSE.md'];

// The notice that travels with a copied skill: a LICENSE beside SKILL.md, else
// one in its pack dir (the parent, unless that is a top-level skills root).
// The license file a SKILL.md's frontmatter names (`license: Complete terms in LICENSE.txt`), or null.
function declaredLicenseName(skillMd) {
  var fm = /^---\r?\n([\s\S]*?)\r?\n---/.exec(skillMd || '');
  var line = fm ? /^license:\s*(.*)$/m.exec(fm[1]) : null;
  var m = line ? /\b(LICEN[SC]E(?:\.[A-Za-z]+)?)\b/.exec(line[1]) : null;
  return m ? m[1] : null;
}

function readSkillLicense(skillFile, skillMd) {
  var dir = path.dirname(skillFile);
  var dirs = [dir];
  var parent = path.dirname(dir);
  if (path.basename(parent) !== 'skills' && parent !== dir) dirs.push(parent);
  var declared = declaredLicenseName(skillMd);
  // A declared file name is the only one that counts; otherwise any standard name.
  var names = declared ? [declared] : LICENSE_NAMES;
  for (var i = 0; i < dirs.length; i++) {
    for (var j = 0; j < names.length; j++) {
      var file = path.join(dirs[i], names[j]);
      if (!fs.existsSync(file)) continue;
      // A notice that exists but cannot be read means the skill is not served.
      try { return { text: fs.readFileSync(file, 'utf8') }; } catch (e) {
        return { error: 'License notice for this skill could not be read (' + (e.code || 'error') + '); not serving it without the notice.' };
      }
    }
  }
  if (declared) return { error: 'This skill declares ' + declared + ' but the file is missing; not serving it without the notice.' };
  return null;
}

function searchSkills(query, limit) {
  limit = Math.min(limit || 5, 20);
  var catalog = buildCatalog();
  var terms = query.toLowerCase().split(/\s+/).filter(function(t) { return t.length > 2; });

  var scored = catalog.map(function(s) {
    var text = (s.name + ' ' + s.domain + ' ' + s.description).toLowerCase();
    var score = terms.reduce(function(acc, term) { return acc + (text.indexOf(term) >= 0 ? 1 : 0); }, 0);
    return { skill: s, score: score };
  });

  return scored
    .filter(function(r) { return r.score > 0; })
    .sort(function(a, b) { return b.score - a.score; })
    .slice(0, limit)
    .map(function(r) { return { id: r.skill.id, name: r.skill.name, domain: r.skill.domain, tier: r.skill.tier, description: r.skill.description, relevance: r.score }; });
}

function suggestFor(task, limit) {
  return searchSkills(task, limit || 5);
}

function invalidateCache() {
  _catalog = null;
}

module.exports = { listSkills, getSkill, searchSkills, suggestFor, invalidateCache };
