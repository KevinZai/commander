'use strict';
/**
 * Specialist library resolver (pilot, CC-1998): maps a specialist name to one
 * canonical profile with provenance, read-only.
 *
 * Sources, in canonical order, both inside the plugin:
 *   1. agents/<name>.md           subagent definitions (canonical)
 *   2. rules/personas/<name>.md   persona companions, linked from an agent's
 *                                 `persona:` frontmatter or matched by name
 * Collisions are reported, never resolved silently: two agents claiming one
 * name, an agent whose frontmatter name differs from its file name, and a
 * `persona:` reference that points at no file.
 *
 * Off unless CCC_SPECIALIST_RESOLVER is 1/true/on. Nothing is installed,
 * copied or written.
 */

const fs = require('fs');
const path = require('path');

const DEFAULT_PLUGIN_ROOT = path.resolve(__dirname, '..', 'cowork-plugin');
const NAME_RE = /^[a-z0-9][a-z0-9-]{0,63}$/;

function isEnabled(env) {
  const v = String((env || process.env).CCC_SPECIALIST_RESOLVER || '').trim().toLowerCase();
  return v === '1' || v === 'true' || v === 'on';
}

function normalizeName(name) {
  const n = String(name == null ? '' : name).trim().toLowerCase().replace(/^commander:/, '');
  return NAME_RE.test(n) ? n : null;
}

function listMarkdown(dir) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch (err) {
    if (err.code === 'ENOENT') return [];
    throw err;
  }
  return entries
    .filter((e) => e.isFile() && e.name.endsWith('.md') && e.name !== 'README.md')
    .map((e) => e.name)
    .sort();
}

function frontmatter(file) {
  const src = fs.readFileSync(file, 'utf8');
  const fm = src.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  const out = {};
  if (!fm) return out;
  for (const key of ['name', 'persona']) {
    const m = fm[1].match(new RegExp('^' + key + ':\\s*["\']?([^"\'\\r\\n]+?)["\']?\\s*$', 'm'));
    if (m) out[key] = m[1].trim();
  }
  return out;
}

// True when file is a regular file whose real path (symlinks resolved) is
// inside dir's real path.
function insideDir(file, dir) {
  let real, realDir;
  try {
    real = fs.realpathSync(file);
    realDir = fs.realpathSync(dir);
  } catch (err) {
    if (err.code === 'ENOENT' || err.code === 'ENOTDIR' || err.code === 'ELOOP') return false;
    throw err;
  }
  return real.startsWith(realDir + path.sep) && fs.statSync(real).isFile();
}

function pluginVersion(root) {
  try {
    return JSON.parse(fs.readFileSync(path.join(root, '.claude-plugin', 'plugin.json'), 'utf8')).version || null;
  } catch {
    return null;
  }
}

/**
 * Scan the plugin once. Returns {root, version, byName: Map<name, entry>, collisions}.
 * entry: {name, canonical: {kind, path}, persona: path|null, alsoAt: [path]}
 */
function loadLibrary(pluginRoot) {
  const root = pluginRoot || DEFAULT_PLUGIN_ROOT;
  const rel = (p) => path.relative(root, p).split(path.sep).join('/');
  const byName = new Map();
  const collisions = [];
  const personaDir = path.join(root, 'rules', 'personas');
  const personas = new Map(listMarkdown(personaDir).map((f) => [f.slice(0, -3), path.join(personaDir, f)]));

  // A file whose name matches its frontmatter name wins a duplicate claim.
  const agentFiles = listMarkdown(path.join(root, 'agents')).map((file) => {
    const full = path.join(root, 'agents', file);
    const fm = frontmatter(full);
    return { full, stem: file.slice(0, -3), fm, name: normalizeName(fm.name || file.slice(0, -3)) };
  });
  agentFiles.sort((a, b) => (b.name === b.stem) - (a.name === a.stem));

  for (const { full, stem, fm, name } of agentFiles) {
    if (!name) {
      collisions.push({ name: fm.name || stem, kind: 'invalid-name', paths: [rel(full)] });
      continue;
    }
    if (name !== stem) collisions.push({ name, kind: 'name-mismatch', paths: [rel(full)] });
    if (byName.has(name)) {
      collisions.push({ name, kind: 'duplicate-agent', paths: [byName.get(name).canonical.path, rel(full)] });
      continue;
    }
    let persona = null;
    if (fm.persona) {
      const target = path.join(root, 'rules', fm.persona + '.md');
      if (insideDir(target, personaDir)) persona = rel(target);
      else collisions.push({ name, kind: 'missing-persona', paths: [rel(full)], ref: fm.persona });
    } else if (personas.has(name)) {
      persona = rel(personas.get(name));
    }
    byName.set(name, { name, canonical: { kind: 'agent', path: rel(full) }, persona, alsoAt: persona ? [persona] : [] });
  }

  for (const [stem, full] of personas) {
    const name = normalizeName(stem);
    if (!name || byName.has(name)) continue;
    byName.set(name, { name, canonical: { kind: 'persona', path: rel(full) }, persona: rel(full), alsoAt: [] });
  }

  return { root, version: pluginVersion(root), byName, collisions };
}

function withProvenance(lib, entry) {
  return {
    name: entry.name,
    canonical: entry.canonical,
    persona: entry.persona,
    alsoAt: entry.alsoAt.slice(),
    provenance: { source: 'commander-plugin', version: lib.version, path: entry.canonical.path },
    collisions: lib.collisions.filter((c) => c.name === entry.name),
  };
}

/**
 * Resolve one specialist. Disabled -> {enabled:false}; unknown or invalid
 * name -> null; otherwise {enabled:true, ...profile}.
 */
function resolveSpecialist(name, opts) {
  opts = opts || {};
  if (!isEnabled(opts.env)) return { enabled: false };
  const n = normalizeName(name);
  if (!n) return null;
  const lib = opts.library || loadLibrary(opts.pluginRoot);
  const entry = lib.byName.get(n);
  return entry ? Object.assign({ enabled: true }, withProvenance(lib, entry)) : null;
}

/** Every canonical profile, sorted by name; [] when disabled. */
function listSpecialists(opts) {
  opts = opts || {};
  if (!isEnabled(opts.env)) return [];
  const lib = opts.library || loadLibrary(opts.pluginRoot);
  return [...lib.byName.keys()].sort().map((n) => withProvenance(lib, lib.byName.get(n)));
}

module.exports = { isEnabled, normalizeName, loadLibrary, resolveSpecialist, listSpecialists };
