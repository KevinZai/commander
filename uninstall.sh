#!/bin/bash
# ============================================================================
# CC Commander — Uninstaller
# ============================================================================
# Removes what install.sh wrote, using the manifest it records at
# <config dir>/commander/install-manifest.json:
#   - an entry is removed only while it is unchanged since install;
#   - a file the installer replaced is restored from its backup;
#   - directories are removed only when empty; skills/, commands/ and hooks/
#     are never deleted wholesale;
#   - CLAUDE.md and settings.json are always kept.
# Installs made before the manifest existed are handled conservatively: only
# files identical to this checkout's sources, and links into it, are removed.
#
# Usage:
#   ./uninstall.sh           Interactive uninstall
#   ./uninstall.sh --force   Skip confirmation prompts
# ============================================================================

set -euo pipefail

# Claude Code's config dir: CLAUDE_CONFIG_DIR when set, else ~/.claude.
CLAUDE_DIR="${CLAUDE_CONFIG_DIR:-$HOME/.claude}"
[[ -n "${CLAUDE_DIR:-}" && "$CLAUDE_DIR" != "/" && "$CLAUDE_DIR" != "$HOME" ]] || { echo "ERROR: Invalid CLAUDE_DIR ($CLAUDE_DIR)"; exit 1; }
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
MANIFEST="$CLAUDE_DIR/commander/install-manifest.json"
FORCE=false

while [[ $# -gt 0 ]]; do
  case $1 in
    --force) FORCE=true; shift ;;
    --help|-h)
      echo "Usage: ./uninstall.sh [--force]"
      echo "  --force    Skip confirmation prompts"
      echo ""
      echo "Removes only the entries recorded in $MANIFEST"
      echo "that are unchanged since install. Your own files are kept."
      exit 0
      ;;
    *) echo "Unknown flag: $1"; exit 1 ;;
  esac
done

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  CC COMMANDER  //  UNINSTALLER"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [ ! -d "$CLAUDE_DIR" ]; then
  echo "  Nothing to uninstall — $CLAUDE_DIR does not exist."
  echo ""
  exit 0
fi

if ! command -v node &>/dev/null; then
  echo "  ✗ Node.js is required to read the install manifest. Nothing was changed."
  exit 1
fi

# The ccc link locations checked for a pre-manifest install. CCC_BIN_DIR, when set, is the only one.
if [[ -n "${CCC_BIN_DIR:-}" ]]; then BIN_DIRS="$CCC_BIN_DIR"; else BIN_DIRS="/usr/local/bin:$HOME/.local/bin"; fi

# One node program plans (mode "plan") and then performs (mode "apply") the removal.
run_uninstall() {
  node - "$1" "$CLAUDE_DIR" "$MANIFEST" "$SCRIPT_DIR" "$BIN_DIRS" <<'UNINSTALL'
'use strict';
(function main() {
var fs = require('fs');
var path = require('path');
var cryptoMod = require('crypto');

var argv = process.argv.slice(2);
var mode = argv[0];
var ROOT = path.resolve(argv[1]);
var manifestPath = argv[2];
var srcRoot = path.resolve(argv[3]);
var binDirs = argv[4].split(':').filter(Boolean);
var apply = mode === 'apply';

function lst(p) { try { return fs.lstatSync(p); } catch (_e) { return null; } }
function sha(buf) { return cryptoMod.createHash('sha256').update(buf).digest('hex'); }
function absOf(e) { return e.abs ? e.abs : path.join(ROOT, e.path); }
function within(dir, p) { return p === dir || p.startsWith(dir + path.sep); }
function label(e) { return e.type === 'mcp-server' ? e.file + ' (mcpServers.' + e.name + ')' : (e.abs || e.path); }
function writeAtomic(abs, buf, mode) {
  var tmp = path.join(path.dirname(abs), '.' + path.basename(abs) + '.ccc-tmp-' + process.pid);
  fs.writeFileSync(tmp, buf, { mode: mode || 0o644 });
  fs.renameSync(tmp, abs);
}

var result = { removed: 0, restored: 0, kept: [], dirs: 0 };

function report() {
  var verb = apply ? '' : 'would be ';
  console.log('  ' + result.removed + ' entr' + (result.removed === 1 ? 'y ' : 'ies ') + verb + 'removed' +
    (result.restored ? ', ' + result.restored + ' of your original files ' + verb + 'restored' : '') +
    (apply && result.dirs ? ', ' + result.dirs + ' empty director' + (result.dirs === 1 ? 'y' : 'ies') + ' removed' : ''));
  if (result.kept.length) {
    console.log('  ' + result.kept.length + ' kept because they changed since install, or are not CC Commander\'s:');
    result.kept.slice(0, 10).forEach(function(k) { console.log('    · ' + k); });
    if (result.kept.length > 10) console.log('    · … and ' + (result.kept.length - 10) + ' more');
  }
  process.exitCode = result.removed + result.restored === 0 ? 3 : 0;
}

// ── Manifest install ──
var manifest = null;
try { manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')); } catch (_e) { manifest = null; }

if (manifest) {
  console.log('  Using the install manifest (CC Commander v' + manifest.version + ', ' + (manifest.entries || []).length + ' entries).');
  var touchedDirs = new Set(manifest.dirs || []);
  (manifest.entries || []).slice().reverse().forEach(function(e) {
    // Outside the config dir the installer only ever writes the ccc link and one key in .claude.json.
    if ((e.abs && !(e.type === 'symlink' && path.basename(e.abs) === 'ccc')) ||
        (e.type === 'mcp-server' && path.basename(String(e.file)) !== '.claude.json')) {
      result.kept.push(label(e) + ' (unexpected manifest entry)');
      return;
    }
    if (e.type === 'mcp-server') {
      var d = null;
      try { d = JSON.parse(fs.readFileSync(e.file, 'utf8')); } catch (_e) { return; }
      var v = d && d.mcpServers ? d.mcpServers[e.name] : undefined;
      if (v === undefined) return;
      if (JSON.stringify(v) !== JSON.stringify(e.value)) { result.kept.push(label(e)); return; }
      if (apply) { delete d.mcpServers[e.name]; writeAtomic(e.file, JSON.stringify(d, null, 2) + '\n', fs.statSync(e.file).mode & 0o777); }
      result.removed++;
      return;
    }
    var abs = absOf(e);
    if (!e.abs && !within(ROOT, path.resolve(abs))) { result.kept.push(label(e) + ' (outside the config dir)'); return; }
    var st = lst(abs);
    if (!st) return;
    var ours = e.type === 'file' ? st.isFile() && sha(fs.readFileSync(abs)) === e.sha
      : e.type === 'symlink' ? st.isSymbolicLink() && fs.readlinkSync(abs) === e.target : false;
    if (!ours) { result.kept.push(label(e)); return; }
    var b = e.backup && lst(e.backup);
    if (apply) {
      fs.unlinkSync(abs);
      if (b && b.isSymbolicLink()) fs.symlinkSync(fs.readlinkSync(e.backup), abs);
      else if (b) fs.copyFileSync(e.backup, abs);
    }
    if (b) result.restored++; else result.removed++;
  });
  if (apply) {
    Array.from(touchedDirs).sort(function(a, b) { return b.split(path.sep).length - a.split(path.sep).length; }).forEach(function(d) {
      var abs = path.join(ROOT, d);
      if (!within(ROOT, path.resolve(abs)) || path.resolve(abs) === ROOT) return;
      try { fs.rmdirSync(abs); result.dirs++; } catch (_e) { /* not empty: holds files that are not ours */ }
    });
    fs.unlinkSync(manifestPath);
    try { fs.rmdirSync(path.dirname(manifestPath)); } catch (_e) { /* other Commander state lives there */ }
  }
  report();
  return;
}

// ── Pre-manifest install: remove only what is clearly CC Commander's ──
console.log('  No install manifest found; removing only files identical to ' + srcRoot);
var realSrc = fs.realpathSync(srcRoot);
function pointsIntoSource(link) {
  try { return within(realSrc, fs.realpathSync(link)); } catch (_e) { return false; }
}
function sameFile(a, b, transform) {
  var sb = lst(b);
  if (!sb || !sb.isFile()) return false;
  var ca = fs.readFileSync(a);
  if (transform) ca = transform(ca);
  return sha(ca) === sha(fs.readFileSync(b));
}
function removeEntry(abs) { if (apply) fs.unlinkSync(abs); result.removed++; }
// Walk an installed tree; returns true when something inside was removed.
function sweep(abs, srcAbs) {
  var st = lst(abs);
  if (!st) return false;
  if (st.isSymbolicLink()) {
    var srcLink = lst(srcAbs);
    if (pointsIntoSource(abs) || (srcLink && srcLink.isSymbolicLink() && fs.readlinkSync(srcAbs) === fs.readlinkSync(abs))) { removeEntry(abs); return true; }
    result.kept.push(path.relative(ROOT, abs));
    return false;
  }
  if (st.isDirectory()) {
    var any = false;
    fs.readdirSync(abs).forEach(function(n) { if (sweep(path.join(abs, n), path.join(srcAbs, n))) any = true; });
    if (any && apply) { try { fs.rmdirSync(abs); result.dirs++; } catch (_e) { /* still holds other files */ } }
    return any;
  }
  if (sameFile(abs, srcAbs)) { removeEntry(abs); return true; }
  result.kept.push(path.relative(ROOT, abs));
  return false;
}
['skills', 'commands', 'lib', 'templates'].forEach(function(g) {
  var top = path.join(ROOT, g);
  var st = lst(top);
  if (!st || !st.isDirectory()) return;
  sweep(top, path.join(srcRoot, g)); // the group dir goes too, but only once nothing else is left in it
});
var hooksTop = path.join(ROOT, 'hooks');
var hst = lst(hooksTop);
if (hst && hst.isDirectory()) {
  fs.readdirSync(hooksTop).forEach(function(n) {
    var abs = path.join(hooksTop, n);
    var st = lst(abs);
    if (!st || !st.isFile()) return;
    var src = (n === 'hooks.json' || n === 'hooks.commander.json') ? path.join(srcRoot, 'hooks', 'hooks-standalone.json') : path.join(srcRoot, 'hooks', n);
    if (sameFile(abs, src)) removeEntry(abs); else result.kept.push('hooks/' + n);
  });
}
var stamp = function(buf) { return Buffer.from(buf.toString('utf8').replace(/^<!-- CC Commander v[^>]*-->\n/, '')); };
['BIBLE.md', 'CHEATSHEET.md', 'SKILLS-INDEX.md'].forEach(function(doc) {
  var abs = path.join(ROOT, doc);
  if (!lst(abs)) return;
  if (sameFile(abs, path.join(srcRoot, doc), doc === 'BIBLE.md' ? stamp : null)) removeEntry(abs); else result.kept.push(doc);
});
binDirs.forEach(function(dir) {
  var link = path.join(dir, 'ccc');
  var st = lst(link);
  if (st && st.isSymbolicLink() && path.resolve(dir, fs.readlinkSync(link)) === path.join(srcRoot, 'bin', 'ccc.js')) removeEntry(link);
});
report();
})();
UNINSTALL
}

# ── Show what will be removed ────────────────────────────────────────────
echo "  Planned changes in $CLAUDE_DIR:"
plan_status=0
run_uninstall plan || plan_status=$?
if [ "$plan_status" -eq 3 ]; then
  echo ""
  echo "  No kit components found to remove. Nothing was changed."
  echo ""
  exit 0
elif [ "$plan_status" -ne 0 ]; then
  echo "  ✗ Could not plan the uninstall (exit $plan_status). Nothing was changed."
  exit 1
fi

echo ""
echo "  NOTE: CLAUDE.md and settings.json will NOT be removed"
echo "  (these may contain your personal configuration)."
echo ""

# ── Check for backups ────────────────────────────────────────────────────
backups=$(ls -d "$CLAUDE_DIR".backup.* 2>/dev/null | head -5 || true)
if [ -n "$backups" ]; then
  echo "  Available backups:"
  echo "$backups" | while read -r b; do
    echo "    $(basename "$b")"
  done
  echo ""
fi

# ── Confirmation ─────────────────────────────────────────────────────────
if ! $FORCE; then
  read -p "  Remove these CC Commander entries? (y/N) " confirm
  if [[ "$(echo "$confirm" | tr '[:upper:]' '[:lower:]')" != "y" ]]; then
    echo ""
    echo "  Aborted. No changes made."
    echo ""
    exit 0
  fi
fi

# ── Remove ───────────────────────────────────────────────────────────────
echo ""
apply_status=0
run_uninstall apply || apply_status=$?
if [ "$apply_status" -ne 0 ] && [ "$apply_status" -ne 3 ]; then
  echo "  ✗ Uninstall stopped with an error (exit $apply_status)."
  exit 1
fi

# ── Offer restore ────────────────────────────────────────────────────────
if [ -n "$backups" ]; then
  echo ""
  latest_backup=$(echo "$backups" | tail -1)
  echo "  Files the installer replaced were restored where unchanged. To copy back anything else"
  echo "  from the most recent backup:"
  echo "    cp -R \"$latest_backup/.\" \"$CLAUDE_DIR/\""
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Uninstall complete. CLAUDE.md and settings.json preserved."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
