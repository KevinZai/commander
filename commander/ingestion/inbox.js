'use strict';

var fs = require('fs');
var path = require('path');
var os = require('os');

var REPO_ROOT = path.join(__dirname, '..', '..');

function inboxFile(opts) {
  if (opts && opts.file) return opts.file;
  return path.join(process.env.HOME || os.homedir(), '.claude', 'commander', 'inbox', 'pending.json');
}

// A missing file is an empty inbox. An unreadable or malformed file is also
// empty, but carries a warning and is marked corrupt so it is never overwritten.
function readInbox(opts) {
  var file = inboxFile(opts);
  var raw;
  try { raw = fs.readFileSync(file, 'utf8'); } catch (e) {
    if (e.code === 'ENOENT') return { items: [] };
    return { items: [], corrupt: true, warning: 'inbox unreadable (' + e.code + '): ' + file };
  }
  var parsed;
  try { parsed = JSON.parse(raw); } catch (_e) {
    return { items: [], corrupt: true, warning: 'inbox is not valid JSON, left untouched: ' + file };
  }
  if (Array.isArray(parsed)) return { items: parsed.filter(isObject) };
  if (isObject(parsed) && Array.isArray(parsed.items)) {
    parsed.items = parsed.items.filter(isObject);
    return parsed;
  }
  return { items: [], corrupt: true, warning: 'inbox has no items array, left untouched: ' + file };
}

function isObject(v) {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

function writeInbox(data, opts) {
  if (data && data.corrupt) throw new Error('refusing to overwrite a corrupt inbox: ' + inboxFile(opts));
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

function inboxStatus(opts) {
  var data = readInbox(opts);
  return { count: data.items.filter(isPending).length, warning: data.warning || null };
}

// Items are addressed by url (what the scanners write) or by an explicit id.
function findItem(data, ref) {
  return data.items.find(function(i) { return i.url === ref || (i.id !== undefined && i.id === ref); }) || null;
}

function reject(ref, reason, opts) {
  var data = readInbox(opts);
  if (data.corrupt) return { ok: false, code: 'corrupt_inbox', error: data.warning };
  var item = findItem(data, ref);
  if (!item) return { ok: false, code: 'not_found', error: 'not found: ' + oneLine(ref, 200) };
  if (item.status === 'accepted') return { ok: false, code: 'already_accepted', error: 'already accepted: ' + oneLine(ref, 200) };
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

// Escape helpers: every inbox field is untrusted text from a scanner.
// oneLine drops control characters (newlines, ESC, U+2028/9) and collapses whitespace.
function oneLine(text, max) {
  return String(text == null ? '' : text).replace(/[\u0000-\u001f\u007f-\u009f\u2028\u2029]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max || 120);
}

// Body of a single-quoted JS string literal.
function jsString(text, max) {
  return oneLine(text, max).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

// Text safe inside a markdown table cell or inline in a list item.
function mdText(text, max) {
  return oneLine(text, max).replace(/\\/g, '\\\\').replace(/\|/g, '\\|').replace(/`/g, "'").replace(/</g, '&lt;');
}

// Terminal display: no control or escape sequences.
function displayText(text, max) {
  return oneLine(text, max);
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
  var parts = String(item.name || '').split('/');
  var owner = parts.length > 1 ? parts[0] : 'Community';
  var entry = [
    "  '" + key + "': {",
    "    name: '" + jsString(parts[parts.length - 1], 60) + "',",
    "    author: '" + jsString(owner || 'Community', 60) + "',",
    "    repo: '" + jsString(String(item.url || '').replace(/^https?:\/\//, ''), 160) + "',",
    "    stars: '" + jsString(String(Number(item.stars) || 0), 12) + "',",
    "    description: '" + jsString(item.description, 120) + "',",
    '    skills: {},',
    '  },',
  ].join('\n');
  fs.writeFileSync(file, src.slice(0, end + 1) + entry + src.slice(end + 1));
  return true;
}

var INGESTED_HEADER = '## Ingested Packages';

function updateSkillsIndex(file, item) {
  var src = fs.readFileSync(file, 'utf8');
  var cell = '| `' + slugify(item.name) + '` |';
  var row = cell + ' ' + mdText(item.description, 110) + ' (' + mdText(item.url, 200) + ') |';
  var idx = src.indexOf(INGESTED_HEADER);
  if (idx < 0) {
    var anchor = src.indexOf('## ⚠️ Directories without SKILL.md');
    var block = INGESTED_HEADER + '\n\n| Package | Description |\n|---------|-------------|\n' + row + '\n\n---\n\n';
    src = anchor >= 0 ? src.slice(0, anchor) + block + src.slice(anchor) : src.replace(/\s*$/, '\n\n') + block;
  } else {
    var lines = src.slice(idx).split('\n');
    var i = 1;
    while (i < lines.length && lines[i].indexOf('|') !== 0) i++;
    while (i < lines.length && lines[i].indexOf('|') === 0) {
      if (lines[i].indexOf(cell) === 0) return false;
      i++;
    }
    lines.splice(i, 0, row);
    src = src.slice(0, idx) + lines.join('\n');
  }
  fs.writeFileSync(file, src);
  return true;
}

function updateChangelog(file, item) {
  var src = fs.readFileSync(file, 'utf8');
  var line = '- Ingested package `' + mdText(item.name, 100) + '` (' + mdText(item.url, 200) + ') via the review inbox.';
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
 * Re-accepting an accepted item retries the files; each update is idempotent.
 * Failures are reported per file, never thrown. Rejected or unknown items
 * return an error and touch nothing.
 */
function accept(ref, opts) {
  opts = opts || {};
  var root = opts.root || REPO_ROOT;
  var data = readInbox(opts);
  if (data.corrupt) return { ok: false, code: 'corrupt_inbox', error: data.warning };
  var item = findItem(data, ref);
  if (!item) return { ok: false, code: 'not_found', error: 'not found: ' + oneLine(ref, 200) };
  if (item.status === 'rejected') return { ok: false, code: 'already_rejected', error: 'already rejected: ' + oneLine(ref, 200) };
  if (!slugify(item.name)) return { ok: false, code: 'bad_name', error: 'item has no usable name: ' + oneLine(ref, 200) };
  var updated = {};
  var steps = [
    ['plugins.js', path.join(root, 'commander', 'plugins.js'), updatePluginsJs],
    ['SKILLS-INDEX.md', path.join(root, 'SKILLS-INDEX.md'), updateSkillsIndex],
    ['CHANGELOG.md', path.join(root, 'CHANGELOG.md'), updateChangelog],
  ];
  steps.forEach(function(s) {
    try { updated[s[0]] = s[2](s[1], item) ? 'updated' : 'unchanged'; }
    catch (e) { updated[s[0]] = 'error: ' + (e.code || e.message); }
  });
  item.status = 'accepted';
  item.reviewedAt = new Date().toISOString();
  writeInbox(data, opts);
  return { ok: true, item: item, updated: updated };
}

module.exports = {
  readInbox: readInbox, writeInbox: writeInbox, listPending: listPending, pendingCount: pendingCount,
  inboxStatus: inboxStatus, accept: accept, reject: reject, slugify: slugify, inboxFile: inboxFile,
  displayText: displayText, mdText: mdText, jsString: jsString,
};
