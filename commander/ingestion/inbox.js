'use strict';

var fs = require('fs');
var path = require('path');
var os = require('os');

var REPO_ROOT = path.join(__dirname, '..', '..');

function inboxFile(opts) {
  if (opts && opts.file) return opts.file;
  return path.join(process.env.HOME || os.homedir(), '.claude', 'commander', 'inbox', 'pending.json');
}

function readInbox(opts) {
  var file = inboxFile(opts);
  var data = { items: [] };
  try {
    var parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (Array.isArray(parsed)) data.items = parsed;
    else { data = parsed || {}; data.items = Array.isArray(data.items) ? data.items : []; }
  } catch (_e) {}
  return data;
}

function writeInbox(data, opts) {
  var file = inboxFile(opts);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

function isPending(item) {
  return !item.status || item.status === 'pending';
}

function listPending(opts) {
  return readInbox(opts).items.filter(isPending);
}

function pendingCount(opts) {
  return listPending(opts).length;
}

function findItem(data, url) {
  return data.items.find(function(i) { return i.url === url; }) || null;
}

function reject(url, reason, opts) {
  var data = readInbox(opts);
  var item = findItem(data, url);
  if (!item) return { ok: false, error: 'not found: ' + url };
  item.status = 'rejected';
  item.reviewedAt = new Date().toISOString();
  if (reason) item.reason = String(reason);
  writeInbox(data, opts);
  return { ok: true, item: item };
}

function slugify(name) {
  var base = String(name || '').split('/').pop();
  return base.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function oneLine(text, max) {
  return String(text || '').replace(/[\r\n|]+/g, ' ').replace(/'/g, '’').replace(/\s+/g, ' ').trim().slice(0, max || 120);
}

// Insert before the closing "};" of the KNOWN_PACKAGES literal.
function updatePluginsJs(file, item) {
  var key = slugify(item.name);
  var src = fs.readFileSync(file, 'utf8');
  if (new RegExp("^\\s{2}['\"]?" + key.replace(/-/g, '\\-') + "['\"]?:\\s*\\{", 'm').test(src)) return false;
  var start = src.indexOf('var KNOWN_PACKAGES = {');
  if (start < 0) throw new Error('KNOWN_PACKAGES not found in plugins.js');
  var end = src.indexOf('\n};', start);
  if (end < 0) throw new Error('KNOWN_PACKAGES terminator not found in plugins.js');
  var owner = String(item.name || '').split('/')[0] || 'Community';
  var entry = [
    "  '" + key + "': {",
    "    name: '" + oneLine(item.name.split('/').pop(), 60) + "',",
    "    author: '" + oneLine(owner, 60) + "',",
    "    repo: '" + oneLine(String(item.url || '').replace(/^https?:\/\//, ''), 160) + "',",
    "    stars: '" + String(item.stars || 0) + "',",
    "    description: '" + oneLine(item.description, 120) + "',",
    '    skills: {},',
    '  },',
  ].join('\n');
  fs.writeFileSync(file, src.slice(0, end + 1) + entry + src.slice(end + 1));
  return true;
}

var INGESTED_HEADER = '## Ingested Packages';

function updateSkillsIndex(file, item) {
  var src = fs.readFileSync(file, 'utf8');
  var row = '| `' + slugify(item.name) + '` | ' + oneLine(item.description, 110) + ' (' + item.url + ') |';
  if (src.indexOf('| `' + slugify(item.name) + '` | ') >= 0 && src.indexOf(INGESTED_HEADER) >= 0 && src.indexOf(item.url) >= 0) return false;
  var idx = src.indexOf(INGESTED_HEADER);
  if (idx < 0) {
    var anchor = src.indexOf('## ⚠️ Directories without SKILL.md');
    var block = INGESTED_HEADER + '\n\n| Package | Description |\n|---------|-------------|\n' + row + '\n\n---\n\n';
    src = anchor >= 0 ? src.slice(0, anchor) + block + src.slice(anchor) : src.replace(/\s*$/, '\n\n') + block;
  } else {
    var tableEnd = src.indexOf('\n\n', idx + INGESTED_HEADER.length + 2 + 60);
    if (tableEnd < 0) tableEnd = src.length;
    src = src.slice(0, tableEnd) + '\n' + row + src.slice(tableEnd);
  }
  fs.writeFileSync(file, src);
  return true;
}

function updateChangelog(file, item) {
  var src = fs.readFileSync(file, 'utf8');
  var line = '- Ingested package `' + item.name + '` (' + item.url + ') via the review inbox.';
  if (src.indexOf(line) >= 0) return false;
  var m = src.match(/^## \[Unreleased\][^\n]*\n/m);
  if (m) {
    var at = m.index + m[0].length;
    var rest = src.slice(at);
    var added = rest.match(/^\s*### Added\n/);
    if (added) {
      var insertAt = at + added[0].length;
      src = src.slice(0, insertAt) + line + '\n' + src.slice(insertAt);
    } else {
      src = src.slice(0, at) + '\n### Added\n' + line + '\n' + src.slice(at);
    }
  } else {
    var first = src.search(/^## \[/m);
    var section = '## [Unreleased]\n\n### Added\n' + line + '\n\n';
    src = first >= 0 ? src.slice(0, first) + section + src.slice(first) : src.replace(/\s*$/, '\n\n') + section;
  }
  fs.writeFileSync(file, src);
  return true;
}

/**
 * Accept a pending package: mark it accepted, then update plugins.js,
 * SKILLS-INDEX.md and CHANGELOG.md under opts.root (default: repo root).
 * Doc updates are idempotent; failures are reported per file, never thrown.
 */
function accept(url, opts) {
  opts = opts || {};
  var root = opts.root || REPO_ROOT;
  var data = readInbox(opts);
  var item = findItem(data, url);
  if (!item) return { ok: false, error: 'not found: ' + url };
  var updated = {};
  var steps = [
    ['plugins.js', path.join(root, 'commander', 'plugins.js'), updatePluginsJs],
    ['SKILLS-INDEX.md', path.join(root, 'SKILLS-INDEX.md'), updateSkillsIndex],
    ['CHANGELOG.md', path.join(root, 'CHANGELOG.md'), updateChangelog],
  ];
  steps.forEach(function(s) {
    try { updated[s[0]] = s[2](s[1], item) ? 'updated' : 'unchanged'; }
    catch (e) { updated[s[0]] = 'error: ' + e.message; }
  });
  item.status = 'accepted';
  item.reviewedAt = new Date().toISOString();
  writeInbox(data, opts);
  return { ok: true, item: item, updated: updated };
}

module.exports = {
  readInbox: readInbox, writeInbox: writeInbox, listPending: listPending, pendingCount: pendingCount,
  accept: accept, reject: reject, slugify: slugify, inboxFile: inboxFile,
};
