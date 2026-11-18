'use strict';

/**
 * Skills lazy-loader for MCP server.
 * Reads from local skills dir on demand — no preloading.
 */

var fs = require('fs');
var path = require('path');
var os = require('os');

var SKILLS_DIR = path.join(__dirname, '..', '..', 'skills');
var PLUGIN_SKILLS_DIR = path.join(__dirname, '..', 'cowork-plugin', 'skills');

var _catalog = null;

function buildCatalog() {
  if (_catalog) return _catalog;

  var skills = [];

  function scanDir(dir, tier) {
    try {
      var entries = fs.readdirSync(dir, { withFileTypes: true });
      for (var entry of entries) {
        if (!entry.isDirectory() || entry.name.startsWith('.') || entry.name.startsWith('_')) continue;
        var skillPath = path.join(dir, entry.name, 'SKILL.md');
        if (!fs.existsSync(skillPath)) continue;

        var description = '';
        var domain = 'general';
        try {
          var content = fs.readFileSync(skillPath, 'utf8');
          // Extract first non-heading line as description
          var lines = content.split('\n');
          for (var line of lines) {
            var trimmed = line.trim();
            if (trimmed && !trimmed.startsWith('#') && !trimmed.startsWith('---')) {
              description = trimmed.slice(0, 120);
              break;
            }
          }
          // Infer domain from directory name
          if (entry.name.startsWith('ccc-')) domain = entry.name;
          else if (lines.some(function(l) { return l.includes('domain:'); })) {
            var domainLine = lines.find(function(l) { return l.includes('domain:'); });
            domain = domainLine ? domainLine.split(':')[1].trim() : 'general';
          }
        } catch (_) {}

        skills.push({
          id: entry.name,
          name: entry.name,
          domain: domain,
          tier: tier || 'free',
          description: description,
          path: skillPath,
        });
      }
    } catch (_) {}
  }

  scanDir(SKILLS_DIR, 'free');
  scanDir(PLUGIN_SKILLS_DIR, 'free');
  // Nested skills (pack and router children such as ccc-design/canvas-design),
  // listed after the top level so a top-level name keeps winning lookups.
  scanNested(SKILLS_DIR, 'free', skills);

  _catalog = skills;
  return _catalog;
}

function scanNested(root, tier, out) {
  var parents;
  try { parents = fs.readdirSync(root, { withFileTypes: true }); } catch (_) { return; }
  for (var p of parents) {
    if (!p.isDirectory() || p.name.startsWith('.') || p.name.startsWith('_')) continue;
    var children;
    try { children = fs.readdirSync(path.join(root, p.name), { withFileTypes: true }); } catch (_) { continue; }
    for (var c of children) {
      if (!c.isDirectory() || c.name.startsWith('.') || c.name.startsWith('_')) continue;
      var skillPath = path.join(root, p.name, c.name, 'SKILL.md');
      if (!fs.existsSync(skillPath)) continue;
      var description = '';
      try {
        var lines = fs.readFileSync(skillPath, 'utf8').split('\n');
        for (var line of lines) {
          var t = line.trim();
          if (t && !t.startsWith('#') && !t.startsWith('---')) { description = t.slice(0, 120); break; }
        }
      } catch (_) {}
      out.push({ id: p.name + '/' + c.name, name: c.name, domain: p.name.startsWith('ccc-') ? p.name : 'general', tier: tier || 'free', description: description, path: skillPath });
    }
  }
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

function getSkill(name) {
  var catalog = buildCatalog();
  var skill = catalog.find(function(s) { return s.id === name; }) || catalog.find(function(s) { return s.name === name; });
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
  for (var i = 0; i < dirs.length; i++) {
    for (var j = 0; j < LICENSE_NAMES.length; j++) {
      var file = path.join(dirs[i], LICENSE_NAMES[j]);
      if (!fs.existsSync(file)) continue;
      // A notice that exists but cannot be read means the skill is not served.
      try { return { text: fs.readFileSync(file, 'utf8') }; } catch (e) {
        return { error: 'License notice for this skill could not be read (' + (e.code || 'error') + '); not serving it without the notice.' };
      }
    }
  }
  var declared = declaredLicenseName(skillMd);
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
