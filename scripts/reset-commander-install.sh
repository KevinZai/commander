#!/usr/bin/env bash
# CC Commander — Full Reset Installer
#
# Purges ALL traces of CC Commander (legacy + current) from Claude Code Desktop,
# Claude Cowork Desktop, and Claude Code CLI. All three clients share
# ~/.claude/plugins/, so one sweep cleans every surface.
#
# What this removes (if present):
#   • ccc-marketplace         (v3.0.0 legacy)
#   • commander-marketplace   (v4.0.0-beta.1–beta.3 interim)
#   • commander-hub           (v4.0.0-beta.4+ current)
#   • ccc plugin              (v3.0.0 legacy slug)
#   • commander plugin        (all versions)
#   • Cache dirs, install manifests, installed_plugins entries
#
# Safe to re-run. Creates timestamped backup of all state files + manifests
# to ~/.claude/backups/commander-reset-YYYYMMDD-HHMMSS/ before touching anything.
#
# After running: restart Claude Code / Cowork Desktop, then:
#   /plugin marketplace add KevinZai/commander
#   /plugin install commander

set -euo pipefail

BOLD=$(tput bold 2>/dev/null || echo "")
RESET=$(tput sgr0 2>/dev/null || echo "")
GREEN=$(tput setaf 2 2>/dev/null || echo "")
YELLOW=$(tput setaf 3 2>/dev/null || echo "")
RED=$(tput setaf 1 2>/dev/null || echo "")
BLUE=$(tput setaf 4 2>/dev/null || echo "")

info()  { echo "${BOLD}${GREEN}✅${RESET} $*"; }
warn()  { echo "${BOLD}${YELLOW}⚠️${RESET}  $*"; }
step()  { echo "${BOLD}${BLUE}▸${RESET}  $*"; }
fail()  { echo "${BOLD}${RED}✘${RESET}  $*" >&2; }

PLUGINS_DIR="${HOME}/.claude/plugins"

if [[ ! -d "$PLUGINS_DIR" ]]; then
  warn "No Claude Code plugin directory at $PLUGINS_DIR."
  warn "Either Claude Code/Cowork hasn't been run yet, or this is a fresh install."
  warn "Nothing to reset. You can now run: /plugin marketplace add KevinZai/commander"
  exit 0
fi

# ----- Backup -----
BACKUP="${HOME}/.claude/backups/commander-reset-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP"
for f in known_marketplaces.json installed_plugins.json install-counts-cache.json blocklist.json; do
  [[ -f "$PLUGINS_DIR/$f" ]] && cp "$PLUGINS_DIR/$f" "$BACKUP/" || true
done
[[ -d "$PLUGINS_DIR/.install-manifests" ]] && cp -r "$PLUGINS_DIR/.install-manifests" "$BACKUP/" || true
info "Backup: $BACKUP"

# Bash arrays (safer than space-split strings under `set -u`)
LEGACY_MARKETPLACES=("ccc-marketplace" "commander-marketplace" "commander-hub")
LEGACY_PLUGINS=(
  "ccc@ccc-marketplace" "ccc@commander-marketplace" "ccc@commander-hub"
  "commander@ccc-marketplace" "commander@commander-marketplace" "commander@commander-hub"
)
# Exported for the Python heredoc (space-joined is fine — values have no whitespace)
export LEGACY_MARKETPLACES_STR="${LEGACY_MARKETPLACES[*]}"
export LEGACY_PLUGINS_STR="${LEGACY_PLUGINS[*]}"

# ----- Purge JSON registries -----
step "Purging registry files…"
python3 - <<'PY' || warn "Registry cleanup encountered an error — filesystem purge will still run."
import json, os, sys, tempfile

plugins_dir = os.path.expanduser('~/.claude/plugins')
legacy_markets = os.environ.get('LEGACY_MARKETPLACES_STR', '').split()
legacy_plugins = os.environ.get('LEGACY_PLUGINS_STR', '').split()
# Narrow sweep — only exact matches on our known slugs. Substring matching is
# too wide: a third-party plugin named "foo@commander-x" would be wiped.
sweep_tokens = set(legacy_plugins)
removed = []

def atomic_write(path, data):
    """Write JSON atomically so a crash mid-write can't corrupt the registry."""
    d = os.path.dirname(path) or '.'
    fd, tmp = tempfile.mkstemp(prefix='.reset-', suffix='.json.tmp', dir=d)
    try:
        with os.fdopen(fd, 'w') as f:
            json.dump(data, f, indent=2)
        os.replace(tmp, path)
    except Exception:
        try: os.unlink(tmp)
        except OSError: pass
        raise

def strip_keys(obj, keys):
    hit = []
    if isinstance(obj, dict):
        for k in keys:
            if k in obj:
                del obj[k]
                hit.append(k)
    return hit

def safe_load(path):
    """Return parsed JSON or None if file is missing/malformed."""
    if not os.path.exists(path):
        return None
    try:
        with open(path) as f: return json.load(f)
    except (json.JSONDecodeError, OSError) as e:
        print(f"  warn: could not parse {os.path.basename(path)}: {e}", file=sys.stderr)
        return None

# known_marketplaces.json — top-level keys are marketplace names
p = os.path.join(plugins_dir, 'known_marketplaces.json')
d = safe_load(p)
if d is not None:
    hit = strip_keys(d, legacy_markets)
    if hit:
        atomic_write(p, d)
        removed += [f"known_marketplaces: {k}" for k in hit]

# installed_plugins.json — handle both { "plugins": {...} } and flat { slug: ... }
p = os.path.join(plugins_dir, 'installed_plugins.json')
d = safe_load(p)
if d is not None:
    plugins_obj = d.get('plugins') if (isinstance(d, dict) and 'plugins' in d) else d
    hit = []
    if isinstance(plugins_obj, dict):
        hit += strip_keys(plugins_obj, legacy_plugins)
        # Exact-match fallback sweep catches slug-format drift but ignores
        # unrelated third-party plugins whose names happen to contain 'ccc' or 'commander'.
        for k in list(plugins_obj.keys()):
            if k in sweep_tokens and k not in hit:
                del plugins_obj[k]
                hit.append(k)
    if hit:
        atomic_write(p, d)
        removed += [f"installed_plugins: {k}" for k in hit]

# install-counts-cache.json — narrow sweep on exact plugin@marketplace slugs only
p = os.path.join(plugins_dir, 'install-counts-cache.json')
d = safe_load(p)
if isinstance(d, dict):
    changed = False
    for k in list(d.keys()):
        if k in sweep_tokens:
            del d[k]
            removed.append(f"install-counts: {k}")
            changed = True
    if changed:
        atomic_write(p, d)

if removed:
    for r in removed: print(f"  removed: {r}")
else:
    print("  (no legacy entries in JSON registries)")
PY

# ----- Purge filesystem artifacts -----
step "Purging filesystem artifacts…"
REMOVED=0
for name in "${LEGACY_MARKETPLACES[@]}"; do
  for base in "$PLUGINS_DIR/marketplaces" "$PLUGINS_DIR/cache"; do
    if [[ -e "$base/$name" ]]; then
      rm -rf "$base/$name"
      echo "  removed: $base/$name"
      REMOVED=$((REMOVED + 1))
    fi
  done
done

# Remove install manifests for known legacy plugin@marketplace slugs
for name in "${LEGACY_PLUGINS[@]}"; do
  f="$PLUGINS_DIR/.install-manifests/${name}.json"
  if [[ -f "$f" ]]; then
    rm -f "$f"
    echo "  removed: $f"
    REMOVED=$((REMOVED + 1))
  fi
done

# Catch-all: any manifest file whose name contains 'ccc' or 'commander'
if [[ -d "$PLUGINS_DIR/.install-manifests" ]]; then
  for f in "$PLUGINS_DIR/.install-manifests"/*.json; do
    [[ -f "$f" ]] || continue
    base=$(basename "$f")
    case "$base" in
      *ccc*|*commander*)
        rm -f "$f"
        echo "  removed: $f"
        REMOVED=$((REMOVED + 1))
        ;;
    esac
  done
fi

# Catch-all: any cache/marketplace dir whose name contains legacy slugs
for base in "$PLUGINS_DIR/cache" "$PLUGINS_DIR/marketplaces"; do
  [[ -d "$base" ]] || continue
  for d in "$base"/*; do
    [[ -d "$d" ]] || continue
    name=$(basename "$d")
    case "$name" in
      *ccc-marketplace*|*commander-marketplace*|*commander-hub*)
        rm -rf "$d"
        echo "  removed: $d"
        REMOVED=$((REMOVED + 1))
        ;;
    esac
  done
done

info "Filesystem artifacts removed: $REMOVED"

# ----- Verify clean -----
step "Verifying clean state…"
LEFTOVER=0
for base in "$PLUGINS_DIR/marketplaces" "$PLUGINS_DIR/cache"; do
  [[ -d "$base" ]] || continue
  for d in "$base"/*; do
    [[ -d "$d" ]] || continue
    name=$(basename "$d")
    case "$name" in
      *ccc*|*commander*)
        warn "Leftover: $d"
        LEFTOVER=$((LEFTOVER + 1))
        ;;
    esac
  done
done

if [[ "$LEFTOVER" -eq 0 ]]; then
  info "All CC Commander traces removed cleanly."
else
  fail "$LEFTOVER leftover artifacts — manual cleanup may be needed."
  exit 1
fi

echo ""
echo "🎯 ${BOLD}Next steps${RESET} — ${BOLD}fully quit${RESET} Claude Code/Cowork Desktop (Cmd+Q), reopen, then:"
echo ""
echo "  ${BOLD}/plugin marketplace add KevinZai/commander${RESET}"
echo "  ${BOLD}/plugin install commander${RESET}"
echo "  ${BOLD}/plugin list${RESET}   # expect: commander  4.0.0-beta.6  Kevin Zicherman"
echo ""
echo "If install still fails:"
echo "  1. Copy the exact error message"
echo "  2. Check ~/.claude/plugins/known_marketplaces.json — should list only 'commander-hub'"
echo "  3. Run:  claude plugin validate ~/.claude/plugins/marketplaces/commander-hub"
echo "  4. Open an issue with the error at https://github.com/KevinZai/commander/issues"
echo ""
echo "Rollback (if needed):"
echo "  ls ~/.claude/backups/commander-reset-*/"
echo "  # Copy files back to ~/.claude/plugins/"
