#!/usr/bin/env node
'use strict';

/**
 * CC Commander — CLI/Plugin parity checker (CC-365). READ-ONLY.
 *
 * Reports drift between the CLI toolkit and the Desktop plugin along three axes:
 *   1. versions  — package.json is the single source; every manifest must match
 *   2. skills    — plugin skill tree vs CLI skill tree (set difference + diverged copies)
 *   3. hooks     — the hook registries (plugin, Codex-generated, kit, standalone)
 *
 * The CLI ecosystem catalog and the plugin skill tree are intentionally different
 * surfaces (see CLAUDE.md), so a difference is not automatically a failure. Known
 * intentional differences live in scripts/parity-allowlist.json with a reason, and
 * the checker is a ratchet: anything NOT allowlisted fails, and an allowlist entry
 * that is no longer true is reported as stale.
 *
 * Diverged shared skills and diverged same-named hook scripts are the accepted end
 * state (CC-365 option A): each must record which side is canonical and why. Hook
 * script copies are also content-pinned (sha256) so neither can change unnoticed.
 *
 * Usage:
 *   node scripts/check-parity.js            # human report, always exits 0
 *   node scripts/check-parity.js --json     # machine-readable report
 *   node scripts/check-parity.js --check    # exit 1 on any hard finding
 *
 * This script never writes files.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DEFAULT_ROOT = path.join(__dirname, '..');

// ─── helpers ────────────────────────────────────────────────────────────────

function readJson(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch (_e) { return null; }
}

function sha(file) {
  try { return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'); } catch (_e) { return null; }
}

function loadAllowlist(root) {
  return readJson(path.join(root, 'scripts', 'parity-allowlist.json')) || {};
}

function pluginVersionOf(obj, name) {
  const p = obj && Array.isArray(obj.plugins) ? obj.plugins.find((x) => x && x.name === name) : null;
  return p ? (p.version || null) : null;
}

// ─── 1. versions ────────────────────────────────────────────────────────────

const SCAN_SKIP = new Set(['node_modules', '.git', 'skills', 'vendor', 'output', '.claude', 'cowork-plugin-codex']);
const MANIFEST_NAME = /^(package|plugin|marketplace|manifest|contract)\.json$/;

function findManifests(root) {
  const found = [];
  (function walk(dir, depth) {
    if (depth > 6) return;
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch (_e) { return; }
    for (const e of entries) {
      if (SCAN_SKIP.has(e.name)) continue;
      const full = path.join(dir, e.name);
      if (e.isDirectory()) walk(full, depth + 1);
      else if (MANIFEST_NAME.test(e.name)) found.push(path.relative(root, full).split(path.sep).join('/'));
    }
  })(root, 0);
  return found.sort();
}

function checkVersions(root, allow) {
  const pkg = readJson(path.join(root, 'package.json'));
  const ssot = pkg && pkg.version;
  const result = { ssot: ssot || null, targets: [], unregistered: [], findings: [], warnings: [] };
  if (!ssot) {
    result.findings.push('version: package.json has no readable version');
    return result;
  }

  const rel = (...p) => path.join(root, ...p);
  const targets = [
    ['commander/cowork-plugin/.claude-plugin/plugin.json', (o) => o.version],
    ['.claude-plugin/marketplace.json (top-level)', (o) => o.version, '.claude-plugin/marketplace.json'],
    ['.claude-plugin/marketplace.json (plugins[commander])', (o) => pluginVersionOf(o, 'commander'), '.claude-plugin/marketplace.json'],
    ['.agents/plugins/marketplace.json (top-level)', (o) => o.version, '.agents/plugins/marketplace.json'],
    ['.agents/plugins/marketplace.json (plugins[commander])', (o) => pluginVersionOf(o, 'commander'), '.agents/plugins/marketplace.json'],
    ['commander/contract.json', (o) => o.version],
    ['commander/cowork-plugin-codex/.codex-plugin/plugin.json (generated)', (o) => o.version, 'commander/cowork-plugin-codex/.codex-plugin/plugin.json'],
  ];
  for (const t of targets) {
    const file = t[2] || t[0];
    const obj = readJson(rel(...file.split('/')));
    const v = obj ? (t[1](obj) || null) : null;
    const ok = v === ssot;
    result.targets.push({ label: t[0], version: v, ok });
    if (!ok) result.findings.push('version drift: ' + t[0] + ' is ' + (v || 'UNREADABLE') + ', package.json is ' + ssot);
  }

  // The CLI reads its version through branding.js; it must not hardcode one.
  try {
    const src = fs.readFileSync(rel('commander', 'branding.js'), 'utf8');
    const derived = /_pkg\.version/.test(src) || /require\([^)]*package\.json[^)]*\)\.version/.test(src);
    result.targets.push({ label: 'commander/branding.js derives version from package.json', version: derived ? ssot : null, ok: derived });
    if (!derived) result.findings.push('version: commander/branding.js no longer derives its version from package.json');
  } catch (_e) {
    result.warnings.push('version: commander/branding.js not readable, CLI version derivation not verified');
  }

  // Any other version-bearing manifest must be registered or allowlisted as independent.
  const independent = (allow.versions && allow.versions.independent_manifests) || {};
  const managed = new Set(['package.json', 'commander/contract.json', 'commander/cowork-plugin/.claude-plugin/plugin.json',
    '.claude-plugin/marketplace.json', '.agents/plugins/marketplace.json', 'apps/mcp-server-cloud/package.json']);
  for (const f of findManifests(root)) {
    if (managed.has(f) || independent[f]) continue;
    const o = readJson(path.join(root, f));
    if (o && (o.version || o.plugins)) result.unregistered.push(f);
  }
  for (const f of result.unregistered) {
    result.warnings.push('version: manifest not registered as managed or independent: ' + f);
  }
  for (const f of Object.keys(independent)) {
    if (!fs.existsSync(path.join(root, f))) result.warnings.push('version: stale allowlist entry (file gone): ' + f);
  }
  return result;
}

// ─── 2. skills ──────────────────────────────────────────────────────────────

function topLevelSkillDirs(dir) {
  const out = [];
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch (_e) { return out; }
  for (const e of entries) {
    if (e.name.startsWith('.') || e.name.startsWith('_')) continue;
    const isDir = e.isDirectory() || (e.isSymbolicLink() && (() => { try { return fs.statSync(path.join(dir, e.name)).isDirectory(); } catch (_x) { return false; } })());
    if (isDir && fs.existsSync(path.join(dir, e.name, 'SKILL.md'))) out.push(e.name);
  }
  return out.sort();
}

const SIDES = ['cli', 'plugin'];

// An allowlisted divergence must say which side is canonical and why.
function canonicalProblems(entry) {
  const out = [];
  const e = entry && typeof entry === 'object' ? entry : {};
  if (!SIDES.includes(e.canonical)) out.push('canonical side (must be one of: ' + SIDES.join(', ') + ')');
  if (typeof e.reason !== 'string' || !e.reason.trim()) out.push('reason');
  return out;
}

function checkSkills(root, allow) {
  const pluginDir = path.join(root, 'commander', 'cowork-plugin', 'skills');
  const cliDir = path.join(root, 'skills');
  const plugin = topLevelSkillDirs(pluginDir);
  const cli = topLevelSkillDirs(cliDir);
  const cliSet = new Set(cli);
  const pluginSet = new Set(plugin);

  const shared = plugin.filter((n) => cliSet.has(n));
  const pluginOnly = plugin.filter((n) => !cliSet.has(n));
  const cliOnly = cli.filter((n) => !pluginSet.has(n));

  const identical = [];
  const diverged = [];
  for (const n of shared) {
    const a = sha(path.join(pluginDir, n, 'SKILL.md'));
    const b = sha(path.join(cliDir, n, 'SKILL.md'));
    (a && a === b ? identical : diverged).push(n);
  }

  const allowDiverged = (allow.skills && allow.skills.diverged_shared) || {};
  const result = {
    plugin_count: plugin.length,
    cli_top_level_count: cli.length,
    shared: shared.length,
    plugin_only: pluginOnly.length,
    cli_only: cliOnly.length,
    identical_shared: identical,
    diverged_shared: diverged,
    sets_identical: pluginOnly.length === 0 && cliOnly.length === 0,
    note: 'Set equality is NOT expected: the CLI ecosystem catalog and the plugin tree are intentionally different surfaces. ' +
      '`ccc --list-skills --json` additionally scans ~/.claude/skills and ./.claude/skills and recurses one level, so it is machine-dependent.',
    findings: [],
    warnings: [],
  };

  result.canonical = {};
  for (const n of diverged) {
    if (!allowDiverged[n]) {
      result.findings.push('skill diverged copy not allowlisted: ' + n + ' exists in both trees with different SKILL.md');
      continue;
    }
    const e = allowDiverged[n];
    const problems = canonicalProblems(e);
    for (const x of problems) result.findings.push('skills: allowlist entry ' + n + ' has no valid ' + x);
    if (!problems.length) result.canonical[n] = { side: e.canonical, reason: e.reason };
  }
  for (const n of Object.keys(allowDiverged)) {
    if (!diverged.includes(n)) {
      result.warnings.push('skills: stale allowlist entry ' + n + (identical.includes(n) ? ' (copies are now identical)' : ' (no longer shared)'));
    }
  }
  if (!plugin.length) result.findings.push('skills: no plugin skills found under commander/cowork-plugin/skills');
  if (!cli.length) result.findings.push('skills: no CLI skills found under skills/');
  return result;
}

// ─── 3. hooks ───────────────────────────────────────────────────────────────

function flattenHooks(file) {
  const obj = readJson(file);
  if (!obj || !obj.hooks) return null;
  const events = {};
  for (const ev of Object.keys(obj.hooks)) {
    events[ev] = [];
    for (const group of obj.hooks[ev] || []) {
      for (const h of group.hooks || []) if (h && h.command) events[ev].push(h.command);
    }
  }
  return events;
}

const SCRIPT_REF = /(?:~\/\.claude\/hooks\/|\$\{CLAUDE_PLUGIN_ROOT\}\/)([^\s"']+\.(?:js|mjs|cjs|sh))/;

function scriptRef(command) {
  const m = SCRIPT_REF.exec(command);
  return m ? m[1] : null;
}

function missingScripts(events, base) {
  const missing = [];
  let refs = 0;
  for (const ev of Object.keys(events)) {
    for (const cmd of events[ev]) {
      const ref = scriptRef(cmd);
      if (!ref) continue;
      refs++;
      if (!fs.existsSync(path.join(base, ...ref.split('/')))) missing.push(ev + ': ' + ref);
    }
  }
  return { refs, missing };
}

function adapterDroppedEvents(root) {
  const out = {};
  try {
    const src = fs.readFileSync(path.join(root, 'commander', 'adapters', 'codex', 'hooks-detector.js'), 'utf8');
    const m = /CLAUDE_EVENTS_DROPPED_BY_CODEX\s*=\s*Object\.freeze\(\[([\s\S]*?)\]\)/.exec(src);
    if (m) {
      const re = /'([A-Za-z]+)'/g;
      let x;
      while ((x = re.exec(m[1]))) out[x[1]] = 'CLAUDE_EVENTS_DROPPED_BY_CODEX in commander/adapters/codex/hooks-detector.js';
    }
  } catch (_e) { /* adapter absent: fall back to allowlist only */ }
  return out;
}

function checkHooks(root, allow) {
  const allowH = allow.hooks || {};
  const external = allowH.external_script_registries || {};
  // Canonical list of Claude events Codex cannot run lives in the Codex adapter; the
  // allowlist can add extra entries but is not the primary source.
  const dropped = Object.assign({}, adapterDroppedEvents(root), allowH.codex_dropped_events || {});

  const registries = {
    plugin: { file: 'commander/cowork-plugin/hooks/hooks.json', base: path.join(root, 'commander', 'cowork-plugin') },
    codex: { file: 'commander/cowork-plugin-codex/hooks.json', base: path.join(root, 'commander', 'cowork-plugin-codex') },
    standalone: { file: 'hooks/hooks-standalone.json', base: path.join(root, 'hooks') },
    kit: { file: 'hooks/hooks.json', base: root },
  };
  const result = { registries: {}, findings: [], warnings: [], shared_script_names: [] };
  const flat = {};

  for (const key of Object.keys(registries)) {
    const reg = registries[key];
    const events = flattenHooks(path.join(root, ...reg.file.split('/')));
    flat[key] = events;
    if (!events) {
      result.registries[key] = { file: reg.file, readable: false };
      result.findings.push('hooks: ' + reg.file + ' is missing or unreadable');
      continue;
    }
    const handlers = Object.keys(events).reduce((n, ev) => n + events[ev].length, 0);
    const entry = { file: reg.file, readable: true, events: Object.keys(events).length, handlers };
    if (!external[reg.file]) {
      const m = missingScripts(events, reg.base);
      entry.script_refs = m.refs;
      entry.missing_scripts = m.missing;
      for (const x of m.missing) result.findings.push('hooks: ' + reg.file + ' references a script that does not exist (' + x + ')');
    } else {
      entry.script_refs = 'skipped (external scripts: ' + external[reg.file] + ')';
    }
    result.registries[key] = entry;
  }

  // Codex registry is generated from the plugin registry: same scripts, minus allowlisted events.
  if (flat.plugin && flat.codex) {
    const pluginEvents = Object.keys(flat.plugin);
    const codexEvents = Object.keys(flat.codex);
    const droppedActual = pluginEvents.filter((e) => !codexEvents.includes(e));
    result.codex_dropped_events = droppedActual;
    for (const e of droppedActual) {
      if (!dropped[e]) result.findings.push('hooks: Codex registry drops event ' + e + ' that is not allowlisted (run npm run build:codex and review)');
    }
    for (const e of Object.keys(allowH.codex_dropped_events || {})) {
      if (!droppedActual.includes(e)) result.warnings.push('hooks: stale allowlist entry codex_dropped_events.' + e);
    }
    for (const e of codexEvents) {
      if (!flat.plugin[e]) { result.findings.push('hooks: Codex registry has event ' + e + ' the plugin registry lacks'); continue; }
      const p = flat.plugin[e].map(scriptRef).filter(Boolean).sort().join('|');
      const c = flat.codex[e].map(scriptRef).filter(Boolean).sort().join('|');
      if (p !== c) result.findings.push('hooks: Codex registry is out of sync with the plugin registry for event ' + e + ' (run npm run build:codex)');
    }
  }

  // Hook scripts of the same name in the CLI (hooks/) and plugin registries. They target different
  // runtimes (flat CJS install vs ESM plugin tree with lib/), so byte-identity is not required, but a
  // divergence must be allowlisted with a canonical side and pinned so neither copy drifts unnoticed.
  const divergedAllow = allowH.diverged_scripts || {};
  result.diverged_scripts = {};
  result.shared_script_names = [];
  if (flat.standalone && flat.plugin) {
    const names = (events) => new Set([].concat(...Object.keys(events).map((ev) => events[ev].map(scriptRef).filter(Boolean))).map((r) => path.basename(r)));
    const a = names(flat.standalone);
    const b = names(flat.plugin);
    for (const n of a) {
      if (!b.has(n)) continue;
      const cliSha = sha(path.join(root, 'hooks', n));
      const pluginSha = sha(path.join(root, 'commander', 'cowork-plugin', 'hooks', n));
      const identical = cliSha !== null && cliSha === pluginSha;
      const e = divergedAllow[n];
      const row = { script: n, identical };
      if (!identical) {
        if (!e) {
          result.findings.push('hooks: ' + n + ' exists in the CLI and plugin hook registries as diverged copies and is not allowlisted (hooks.diverged_scripts)');
        } else {
          for (const x of canonicalProblems(e)) result.findings.push('hooks: allowlist entry ' + n + ' has no valid ' + x);
          if (SIDES.includes(e.canonical)) row.canonical = e.canonical;
          const pins = e.pinned_sha256 || {};
          if (!pins.cli || !pins.plugin) {
            result.findings.push('hooks: allowlist entry ' + n + ' needs pinned_sha256.cli and pinned_sha256.plugin');
          } else {
            const copies = [['cli', 'hooks/' + n, cliSha], ['plugin', 'commander/cowork-plugin/hooks/' + n, pluginSha]];
            for (const c of copies) {
              if (c[2] !== pins[c[0]]) {
                result.findings.push('hooks: ' + n + ' ' + c[0] + ' copy changed (' + c[1] + ' sha256 ' + c[2] + ', pinned ' + pins[c[0]] +
                  '); canonical is ' + e.canonical + ', so review whether the other copy needs the same change, then update hooks.diverged_scripts.' + n + '.pinned_sha256.' + c[0]);
              }
            }
            result.diverged_scripts[n] = { canonical: e.canonical, reason: e.reason };
          }
        }
      } else if (e) {
        result.warnings.push('hooks: stale allowlist entry hooks.diverged_scripts.' + n + ' (copies are now identical)');
      }
      result.shared_script_names.push(row);
    }
    for (const n of Object.keys(divergedAllow)) {
      if (!a.has(n) || !b.has(n)) result.warnings.push('hooks: stale allowlist entry hooks.diverged_scripts.' + n + ' (no longer in both registries)');
    }
  }
  return result;
}

// ─── run ────────────────────────────────────────────────────────────────────

function runParity(root) {
  const r = root || DEFAULT_ROOT;
  const allow = loadAllowlist(r);
  const report = { root: r, versions: checkVersions(r, allow), skills: checkSkills(r, allow), hooks: checkHooks(r, allow) };
  report.findings = [].concat(report.versions.findings, report.skills.findings, report.hooks.findings);
  report.warnings = [].concat(report.versions.warnings, report.skills.warnings, report.hooks.warnings);
  report.ok = report.findings.length === 0;
  return report;
}

function render(report) {
  const out = [];
  const v = report.versions;
  out.push('', 'CC Commander — CLI/Plugin Parity Report (read-only)', '');
  out.push('1. Versions (SSoT: package.json = ' + v.ssot + ')');
  for (const t of v.targets) out.push('   [' + (t.ok ? 'OK   ' : 'DRIFT') + '] ' + t.label + (t.ok ? '' : ': ' + t.version));
  const s = report.skills;
  out.push('', '2. Skills');
  out.push('   plugin tree: ' + s.plugin_count + ' | CLI tree (top-level): ' + s.cli_top_level_count + ' | shared: ' + s.shared +
    ' | plugin-only: ' + s.plugin_only + ' | CLI-only: ' + s.cli_only);
  out.push('   shared & identical: ' + s.identical_shared.length + ' | shared & diverged: ' + s.diverged_shared.length +
    (s.diverged_shared.length ? ' (' + s.diverged_shared.join(', ') + ')' : ''));
  out.push('   sets identical: ' + s.sets_identical + '  (not expected; see allowlist reasons)');
  const names = Object.keys(s.canonical || {});
  if (names.length) {
    const w = Math.max.apply(null, names.map((n) => n.length));
    out.push('   canonical copy per diverged router:');
    for (const n of names) out.push('     ' + n.padEnd(w) + '  canonical: ' + s.canonical[n].side + '  ' + s.canonical[n].reason);
  }
  const h = report.hooks;
  out.push('', '3. Hook registries');
  for (const k of Object.keys(h.registries)) {
    const e = h.registries[k];
    out.push('   ' + e.file + (e.readable ? ': ' + e.events + ' events, ' + e.handlers + ' handlers, scripts: ' +
      (Array.isArray(e.missing_scripts) ? (e.missing_scripts.length ? e.missing_scripts.length + ' missing' : 'all ' + e.script_refs + ' present') : e.script_refs) : ': UNREADABLE'));
  }
  if (h.codex_dropped_events && h.codex_dropped_events.length) out.push('   Codex registry drops events: ' + h.codex_dropped_events.join(', '));
  for (const x of h.shared_script_names) out.push('   same script name in CLI + plugin registries: ' + x.script + (x.identical ? ' (identical)' : ' (DIVERGED copies, canonical: ' + (x.canonical || 'UNDECLARED') + ', pinned)'));
  if (report.warnings.length) { out.push('', 'Warnings'); report.warnings.forEach((w) => out.push('   - ' + w)); }
  out.push('', report.ok ? 'RESULT: no hard parity findings' : 'RESULT: ' + report.findings.length + ' hard finding(s)');
  report.findings.forEach((f) => out.push('   ! ' + f));
  out.push('');
  return out.join('\n');
}

if (require.main === module) {
  const argv = process.argv.slice(2);
  const report = runParity(DEFAULT_ROOT);
  if (argv.includes('--json')) process.stdout.write(JSON.stringify(report, null, 2) + '\n');
  else process.stdout.write(render(report));
  if (argv.includes('--check') && !report.ok) process.exit(1);
}

module.exports = { runParity, checkVersions, checkSkills, checkHooks, render };
