#!/usr/bin/env bash
# CC Commander — Full Reset Installer
#
# Purges ALL traces of CC Commander (legacy + current) from Claude Code Desktop,
# Claude Cowork Desktop, and Claude Code CLI. All three clients share
# ~/.claude/plugins/, so one sweep cleans every surface.
#
# USAGE:
#   reset-commander-install.sh                 # clean plugin state only (safe default)
#   reset-commander-install.sh --full          # also remove legacy CLI install (pre-v4 plugin era)
#   reset-commander-install.sh --dry-run       # show what WOULD be removed, touch nothing
#   reset-commander-install.sh --full --dry-run
#   reset-commander-install.sh --full --remove-checkout
#                                              # also remove the ~/.cc-commander checkout
#
# Default mode removes (from ~/.claude/plugins/):
#   • ccc-marketplace         (v3.0.0 legacy)
#   • commander-marketplace   (v4.0.0-beta.1–beta.3 interim)
#   • commander-hub           (v4.0.0-beta.4+ current)
#   • ccc + commander plugins (all versions) + cache dirs + install manifests
#
# --full also removes (from ~/.claude/ and system PATH):
#   • ~/.claude/commands/ccc*.md           (legacy slash commands from install-remote.sh)
#   • ~/.claude/commands/commander*.md
#   • ~/.claude/skills/ccc/                (legacy standalone skill — EXACT match only)
#   • ~/.claude/skills/commander/          (legacy standalone skill)
#   • ~/.claude/commander/                 (CLI state dir; its install-manifest.json
#                                           stays while it records kept commands)
#   • ~/.ccc, ~/.config/cc-commander       (install trails)
#   • ~/.cc-commander                      (only with --remove-checkout; a git
#                                           checkout with local changes or
#                                           untracked files is archived to the
#                                           backup first, and kept if the
#                                           archive cannot be verified)
#   • npm-global cc-commander              (if detected via `npm ls -g`)
#
# NOT touched (even under --full):
#   • ccc-design, ccc-marketing, ccc-saas, etc. — those are legitimate CCC domain
#     skills in ~/.claude/skills/ccc-*/, unrelated to the CLI install.
#
# Safe to re-run. Creates timestamped backup of all state files + manifests
# to ~/.claude/backups/commander-reset-YYYYMMDD-HHMMSS/ before touching anything.
# Command files, skill dirs and the CLI state dir are copied into the backup
# before removal; a failed copy aborts the reset.
#
# After running: fully quit Claude Code / Cowork Desktop (Cmd+Q), reopen, then:
#   /plugin marketplace add KevinZai/commander
#   /plugin install commander

set -euo pipefail

# ----- Parse flags -----
FULL=0
DRY_RUN=0
REMOVE_CHECKOUT=0
while [[ $# -gt 0 ]]; do
  case "$1" in
    --full)    FULL=1; shift ;;
    --dry-run) DRY_RUN=1; shift ;;
    --remove-checkout) REMOVE_CHECKOUT=1; shift ;;
    -h|--help)
      grep -E '^# ?' "$0" | sed 's/^# \?//' | head -50
      exit 0
      ;;
    *) echo "Unknown flag: $1" >&2; exit 2 ;;
  esac
done

BOLD=$(tput bold 2>/dev/null || echo "")
RESET=$(tput sgr0 2>/dev/null || echo "")
GREEN=$(tput setaf 2 2>/dev/null || echo "")
YELLOW=$(tput setaf 3 2>/dev/null || echo "")
RED=$(tput setaf 1 2>/dev/null || echo "")
BLUE=$(tput setaf 4 2>/dev/null || echo "")
GREY=$(tput setaf 8 2>/dev/null || echo "")

info()  { echo "${BOLD}${GREEN}✅${RESET} $*"; }
warn()  { echo "${BOLD}${YELLOW}⚠️${RESET}  $*"; }
step()  { echo "${BOLD}${BLUE}▸${RESET}  $*"; }
fail()  { echo "${BOLD}${RED}✘${RESET}  $*" >&2; }
dry()   { echo "  ${GREY}[dry-run]${RESET} $*"; }

# Safe destructive actions — route through these so --dry-run works everywhere
safe_rm() {
  local target="$1"
  if [[ $DRY_RUN -eq 1 ]]; then
    dry "would rm -rf $target"
  else
    rm -rf "$target"
    echo "  removed: $target"
  fi
}

safe_rm_file() {
  local target="$1"
  if [[ $DRY_RUN -eq 1 ]]; then
    dry "would rm $target"
  else
    rm -f "$target"
    echo "  removed: $target"
  fi
}

[[ $DRY_RUN -eq 1 ]] && warn "DRY-RUN MODE — no changes will be made."
[[ $FULL -eq 1 ]]    && info "FULL MODE — will also purge legacy CLI install (~/.claude/commands/, ~/.claude/commander/, etc.)"
if [[ $REMOVE_CHECKOUT -eq 1 && $FULL -eq 0 ]]; then
  fail "--remove-checkout only applies with --full."
  exit 2
fi

PLUGINS_DIR="${HOME}/.claude/plugins"

if [[ ! -d "$PLUGINS_DIR" ]]; then
  warn "No Claude Code plugin directory at $PLUGINS_DIR."
  warn "Either Claude Code/Cowork hasn't been run yet, or this is a fresh install."
  if [[ $FULL -eq 0 ]]; then
    warn "Nothing to reset. Run with --full to also scan for legacy CLI artifacts."
    exit 0
  fi
fi

# ----- Backup -----
BACKUP="${HOME}/.claude/backups/commander-reset-$(date +%Y%m%d-%H%M%S)"
if [[ $DRY_RUN -eq 0 ]]; then
  # Owner-only: the backup can hold the checkout archive with ignored files such as .env (Codex #302 M9).
  mkdir -p "$BACKUP" && chmod 700 "$BACKUP"
  for f in known_marketplaces.json installed_plugins.json install-counts-cache.json blocklist.json; do
    [[ -f "$PLUGINS_DIR/$f" ]] && cp "$PLUGINS_DIR/$f" "$BACKUP/" || true
  done
  [[ -d "$PLUGINS_DIR/.install-manifests" ]] && cp -r "$PLUGINS_DIR/.install-manifests" "$BACKUP/" || true
  info "Backup: $BACKUP"
else
  dry "would create backup at $BACKUP"
fi

# ----- Phase 1: Plugin-state purge (default mode) -----
if [[ -d "$PLUGINS_DIR" ]]; then
  # Bash arrays (safer than space-split strings under `set -u`)
  LEGACY_MARKETPLACES=("ccc-marketplace" "commander-marketplace" "commander-hub")
  LEGACY_PLUGINS=(
    "ccc@ccc-marketplace" "ccc@commander-marketplace" "ccc@commander-hub"
    "commander@ccc-marketplace" "commander@commander-marketplace" "commander@commander-hub"
  )
  # Exported for the Python heredoc (space-joined is fine — values have no whitespace)
  export LEGACY_MARKETPLACES_STR="${LEGACY_MARKETPLACES[*]}"
  export LEGACY_PLUGINS_STR="${LEGACY_PLUGINS[*]}"
  export RESET_DRY_RUN="$DRY_RUN"

  # ----- Purge JSON registries -----
  step "Purging registry files…"
  python3 - <<'PY' || warn "Registry cleanup encountered an error — filesystem purge will still run."
import json, os, sys, tempfile

plugins_dir = os.path.expanduser('~/.claude/plugins')
legacy_markets = os.environ.get('LEGACY_MARKETPLACES_STR', '').split()
legacy_plugins = os.environ.get('LEGACY_PLUGINS_STR', '').split()
dry_run = os.environ.get('RESET_DRY_RUN', '0') == '1'
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
                if not dry_run: del obj[k]
                hit.append(k)
    return hit

def safe_load(path):
    if not os.path.exists(path): return None
    try:
        with open(path) as f: return json.load(f)
    except (json.JSONDecodeError, OSError) as e:
        print(f"  warn: could not parse {os.path.basename(path)}: {e}", file=sys.stderr)
        return None

# known_marketplaces.json
p = os.path.join(plugins_dir, 'known_marketplaces.json')
d = safe_load(p)
if d is not None:
    hit = strip_keys(d, legacy_markets)
    if hit:
        if not dry_run: atomic_write(p, d)
        removed += [f"{'[dry-run] would remove' if dry_run else 'removed'} known_marketplaces: {k}" for k in hit]

# installed_plugins.json — handle { "plugins": {...} } and flat { slug: ... }
p = os.path.join(plugins_dir, 'installed_plugins.json')
d = safe_load(p)
if d is not None:
    plugins_obj = d.get('plugins') if (isinstance(d, dict) and 'plugins' in d) else d
    hit = []
    if isinstance(plugins_obj, dict):
        hit += strip_keys(plugins_obj, legacy_plugins)
        for k in list(plugins_obj.keys()):
            if k in sweep_tokens and k not in hit:
                if not dry_run: del plugins_obj[k]
                hit.append(k)
    if hit:
        if not dry_run: atomic_write(p, d)
        removed += [f"{'[dry-run] would remove' if dry_run else 'removed'} installed_plugins: {k}" for k in hit]

# install-counts-cache.json — exact-match sweep only
p = os.path.join(plugins_dir, 'install-counts-cache.json')
d = safe_load(p)
if isinstance(d, dict):
    changed = False
    for k in list(d.keys()):
        if k in sweep_tokens:
            if not dry_run: del d[k]
            removed.append(f"{'[dry-run] would remove' if dry_run else 'removed'} install-counts: {k}")
            changed = True
    if changed and not dry_run:
        atomic_write(p, d)

if removed:
    for r in removed: print(f"  {r}")
else:
    print("  (no legacy entries in JSON registries)")
PY

  # ----- Purge filesystem artifacts -----
  step "Purging plugin filesystem artifacts…"
  for name in "${LEGACY_MARKETPLACES[@]}"; do
    for base in "$PLUGINS_DIR/marketplaces" "$PLUGINS_DIR/cache"; do
      [[ -e "$base/$name" ]] && safe_rm "$base/$name"
    done
  done
  for name in "${LEGACY_PLUGINS[@]}"; do
    f="$PLUGINS_DIR/.install-manifests/${name}.json"
    [[ -f "$f" ]] && safe_rm_file "$f"
  done

  # Catch-all: any manifest file whose name contains legacy slugs
  if [[ -d "$PLUGINS_DIR/.install-manifests" ]]; then
    for f in "$PLUGINS_DIR/.install-manifests"/*.json; do
      [[ -f "$f" ]] || continue
      base=$(basename "$f")
      case "$base" in *ccc*|*commander*) safe_rm_file "$f" ;; esac
    done
  fi

  # Catch-all: any cache/marketplace dir whose name contains legacy slugs
  for base in "$PLUGINS_DIR/cache" "$PLUGINS_DIR/marketplaces"; do
    [[ -d "$base" ]] || continue
    for d in "$base"/*; do
      [[ -d "$d" ]] || continue
      name=$(basename "$d")
      case "$name" in
        *ccc-marketplace*|*commander-marketplace*|*commander-hub*) safe_rm "$d" ;;
      esac
    done
  done
fi

CLAUDE_DIR="${HOME}/.claude"
# Command files that belong to the current install: recorded in this profile's install manifest, or byte-identical
# to the file of the same name shipped in this checkout or the CLI checkout. Only the rest are legacy (Codex #302).
CCC_SELF_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." 2>/dev/null && pwd || echo "")"
current_command_files() {
  node -e '
    var fs = require("fs"), path = require("path"), c = require("crypto");
    var manifest = process.argv[1], cmdDir = process.argv[2], shipped = process.argv.slice(3);
    var sha = function(p) { try { return c.createHash("sha256").update(fs.readFileSync(p)).digest("hex"); } catch (_e) { return null; } };
    var recorded = new Set();
    try { (JSON.parse(fs.readFileSync(manifest, "utf8")).entries || []).forEach(function(e) {
      if (e && e.type === "file" && typeof e.path === "string" && path.dirname(e.path) === "commands") recorded.add(path.basename(e.path));
    }); } catch (_e) { /* no manifest */ }
    var names = []; try { names = fs.readdirSync(cmdDir); } catch (_e) { names = []; }
    names.forEach(function(n) {
      if (!/\.md$/.test(n)) return;
      var mine = sha(path.join(cmdDir, n));
      if (recorded.has(n) || shipped.some(function(d) { var s = sha(path.join(d, n)); return s && s === mine; })) console.log(n);
    });
  ' "$CLAUDE_DIR/commander/install-manifest.json" "$CLAUDE_DIR/commands" "$@" 2>/dev/null || true
}

# ----- Phase 2: Legacy CLI purge (--full only) -----
if [[ $FULL -eq 1 ]]; then
  step "Purging legacy CLI install (--full)…"
  FULL_REMOVED=0

  # 2a. Legacy slash commands (install-remote.sh left these before v4.0 plugin).
  # Every file is copied into the backup before any is removed.
  # Commands of the current install (manifest-recorded or identical to the shipped file) are left to uninstall.sh.
  COMMAND_FILES=()
  CURRENT_CMDS="$(current_command_files ${CCC_SELF_DIR:+"$CCC_SELF_DIR/commands"} "${HOME}/.cc-commander/commands")"
  KEPT_CURRENT=0
  for pattern in ccc commander; do
    for f in "${HOME}/.claude/commands/${pattern}"*.md; do
      [[ -f "$f" ]] || continue
      if printf '%s\n' "$CURRENT_CMDS" | grep -qxF "$(basename "$f")"; then
        KEPT_CURRENT=$((KEPT_CURRENT + 1))
        continue
      fi
      COMMAND_FILES+=("$f")
    done
  done
  if [[ $KEPT_CURRENT -gt 0 ]]; then
    warn "Keeping $KEPT_CURRENT command file(s) of the current install; remove them with uninstall.sh."
  fi
  if [[ ${#COMMAND_FILES[@]} -gt 0 && $DRY_RUN -eq 0 ]]; then
    mkdir -p "$BACKUP/commands" && cp -p "${COMMAND_FILES[@]}" "$BACKUP/commands/" || {
      fail "Could not back up command files to $BACKUP/commands — nothing removed from ~/.claude/commands."
      exit 1
    }
  fi
  for f in ${COMMAND_FILES[@]+"${COMMAND_FILES[@]}"}; do
    safe_rm_file "$f"
    FULL_REMOVED=$((FULL_REMOVED + 1))
  done

  # 2b. Legacy standalone skills (EXACT dir name "ccc" or "commander" only —
  # never touch ccc-design, ccc-marketing, etc., which are legitimate domain skills)
  for dir in "${HOME}/.claude/skills/ccc" "${HOME}/.claude/skills/commander"; do
    if [[ -d "$dir" ]]; then
      # Backup before nuking a skill dir (larger artifacts)
      if [[ $DRY_RUN -eq 0 ]]; then
        cp -r "$dir" "$BACKUP/$(basename "$dir")-skill-backup" || {
          fail "Could not back up $dir — not removing it."
          exit 1
        }
      fi
      safe_rm "$dir"
      FULL_REMOVED=$((FULL_REMOVED + 1))
    fi
  done

  # 2c. CLI state directory (contains old v1.x code + state)
  # While command files of the current install are kept, its install manifest stays: it is what
  # protects an edited kept command on the next --full and what uninstall.sh removes them by (Codex #302 H10).
  STATE_DIR="${HOME}/.claude/commander"
  KEEP_MANIFEST=0
  [[ $KEPT_CURRENT -gt 0 && -f "$STATE_DIR/install-manifest.json" ]] && KEEP_MANIFEST=1
  if [[ -d "$STATE_DIR" ]]; then
    if [[ $DRY_RUN -eq 0 ]]; then
      cp -r "$STATE_DIR" "$BACKUP/commander-state-backup" || {
        fail "Could not back up $STATE_DIR — not removing it."
        exit 1
      }
    fi
    if [[ $KEEP_MANIFEST -eq 1 ]]; then
      for entry in "$STATE_DIR"/* "$STATE_DIR"/.[!.]* "$STATE_DIR"/..?*; do
        [[ -e "$entry" || -L "$entry" ]] || continue
        [[ "$entry" == "$STATE_DIR/install-manifest.json" ]] && continue
        safe_rm "$entry"
      done
      warn "Keeping $STATE_DIR/install-manifest.json; it records the kept command file(s) for uninstall.sh."
    else
      safe_rm "$STATE_DIR"
    fi
    FULL_REMOVED=$((FULL_REMOVED + 1))
  fi

  # 2d. The CLI checkout (install-remote.sh's default path) needs
  # --remove-checkout. It is always archived into the backup first (the whole
  # tree, so ignored files such as .env, hidden untracked files and commits
  # that exist only locally are kept) and removed only once the archive
  # verifies. Local-only commits are named so the user knows to push them.
  # The backup dir is 0700 and the archive 0600 because it keeps such files.
  CHECKOUT_DIR="${HOME}/.cc-commander"
  if [[ -e "$CHECKOUT_DIR" ]]; then
    if [[ $REMOVE_CHECKOUT -eq 0 ]]; then
      warn "Keeping $CHECKOUT_DIR (the CLI checkout). Add --remove-checkout to remove it."
    else
      ARCHIVE="$BACKUP/cc-commander-checkout.tar.gz"
      LOCAL_ONLY=""
      if [[ -e "$CHECKOUT_DIR/.git" ]]; then
        LOCAL_ONLY="$(git -C "$CHECKOUT_DIR" log --oneline --branches --not --remotes 2>/dev/null | wc -l | tr -d ' ')"
        [[ "$LOCAL_ONLY" == "0" ]] && LOCAL_ONLY=""
      fi
      [[ -n "$LOCAL_ONLY" ]] && warn "$CHECKOUT_DIR has $LOCAL_ONLY commit(s) on no remote; they are kept in the archive."
      if [[ $DRY_RUN -eq 1 ]]; then
        dry "would archive $CHECKOUT_DIR to $ARCHIVE, verify it, then remove it"
        FULL_REMOVED=$((FULL_REMOVED + 1))
      elif mkdir -p "$BACKUP" && chmod 700 "$BACKUP" \
          && (umask 077 && tar -czf "$ARCHIVE" -C "$(dirname "$CHECKOUT_DIR")" "$(basename "$CHECKOUT_DIR")") \
          && chmod 600 "$ARCHIVE" && tar -tzf "$ARCHIVE" >/dev/null; then
        echo "  archived: $CHECKOUT_DIR -> $ARCHIVE"
        safe_rm "$CHECKOUT_DIR"
        FULL_REMOVED=$((FULL_REMOVED + 1))
      else
        fail "The archive of $CHECKOUT_DIR at $ARCHIVE did not verify — keeping the checkout."
        CHECKOUT_REFUSED=1
      fi
    fi
  fi

  # 2e. Other install trails
  for trail in "${HOME}/.ccc" "${HOME}/.config/cc-commander"; do
    if [[ -e "$trail" ]]; then
      safe_rm "$trail"
      FULL_REMOVED=$((FULL_REMOVED + 1))
    fi
  done

  # 2f. Legacy ccc binary on PATH (from `npm install -g cc-commander` era).
  # We detect via `command -v ccc` to catch all npm prefixes (nvm, homebrew,
  # system npm, pnpm, etc.) rather than guessing which prefix is active.
  CCC_BIN="$(command -v ccc 2>/dev/null || true)"
  if [[ -n "$CCC_BIN" ]]; then
    # Resolve the symlink to the real package path
    REAL_BIN="$(node -e "try{console.log(require('fs').realpathSync('$CCC_BIN'))}catch(e){console.log('$CCC_BIN')}" 2>/dev/null || echo "$CCC_BIN")"
    # Extract package root: /prefix/lib/node_modules/cc-commander/bin/kc.js → /.../cc-commander
    case "$REAL_BIN" in
      */node_modules/cc-commander/*)
        PKG_DIR="${REAL_BIN%/bin/*}"
        if [[ -d "$PKG_DIR" && "$PKG_DIR" == */cc-commander ]]; then
          if [[ $DRY_RUN -eq 1 ]]; then
            dry "would remove npm package: $PKG_DIR"
            dry "would remove binary symlink: $CCC_BIN"
          else
            rm -rf "$PKG_DIR"
            rm -f "$CCC_BIN"
            echo "  removed npm package: $PKG_DIR"
            echo "  removed binary: $CCC_BIN"
          fi
          FULL_REMOVED=$((FULL_REMOVED + 1))
        fi
        ;;
      *)
        warn "Found 'ccc' binary at $CCC_BIN but it's not a cc-commander npm install — leaving it alone."
        ;;
    esac
  fi

  if [[ $FULL_REMOVED -eq 0 ]]; then
    info "No legacy CLI artifacts found — clean."
  else
    info "Legacy CLI artifacts removed: $FULL_REMOVED"
  fi
fi

# ----- Verify clean -----
step "Verifying clean state…"
LEFTOVER=0
if [[ -d "$PLUGINS_DIR" ]]; then
  for base in "$PLUGINS_DIR/marketplaces" "$PLUGINS_DIR/cache"; do
    [[ -d "$base" ]] || continue
    for d in "$base"/*; do
      [[ -d "$d" ]] || continue
      name=$(basename "$d")
      case "$name" in
        *ccc*|*commander*) warn "Leftover: $d"; LEFTOVER=$((LEFTOVER + 1)) ;;
      esac
    done
  done
fi

if [[ $FULL -eq 1 ]]; then
  # Extra verification under --full
  # CURRENT_CMDS was computed before the purge (2c removes the manifest); those are kept on purpose.
  for f in "${HOME}/.claude/commands"/ccc*.md "${HOME}/.claude/commands"/commander*.md; do
    [[ -f "$f" ]] || continue
    printf '%s\n' "${CURRENT_CMDS:-}" | grep -qxF "$(basename "$f")" && continue
    warn "Leftover legacy command: $f"; LEFTOVER=$((LEFTOVER + 1))
  done
  for d in "${HOME}/.claude/skills/ccc" "${HOME}/.claude/skills/commander" "${HOME}/.claude/commander"; do
    [[ -d "$d" ]] || continue
    if [[ "$d" == "${HOME}/.claude/commander" && "${KEEP_MANIFEST:-0}" -eq 1 && $DRY_RUN -eq 0 \
          && "$(ls -A "$d")" == "install-manifest.json" ]]; then
      continue
    fi
    warn "Leftover legacy dir: $d"; LEFTOVER=$((LEFTOVER + 1))
  done
fi

if [[ $DRY_RUN -eq 1 ]]; then
  echo ""
  info "DRY RUN COMPLETE — re-run without --dry-run to apply changes."
  exit 0
fi

if [[ "${CHECKOUT_REFUSED:-0}" -eq 1 ]]; then
  fail "The CLI checkout was not removed (see above). Commit, stash or move its changes, then re-run."
  exit 1
fi

if [[ "$LEFTOVER" -eq 0 ]]; then
  info "All CC Commander traces removed cleanly."
else
  fail "$LEFTOVER leftover artifact(s) — manual cleanup may be needed."
  exit 1
fi

echo ""
echo "🎯 ${BOLD}Next steps${RESET} — ${BOLD}fully quit${RESET} Claude Code/Cowork Desktop (Cmd+Q), reopen, then:"
echo ""
echo "  ${BOLD}/plugin marketplace add KevinZai/commander${RESET}"
echo "  ${BOLD}/plugin install commander${RESET}"
echo "  ${BOLD}/plugin list${RESET}   # expect: commander  4.0.0-beta.7  Kevin Zicherman"
echo ""
echo "If /ccc still shows the wrong version:"
echo "  1. Run diagnostic: ${BOLD}bash scripts/diagnose-ccc-sources.sh${RESET}"
echo "  2. Open an issue with the output at https://github.com/KevinZai/commander/issues"
echo ""
echo "Rollback (if needed):"
echo "  ls ~/.claude/backups/commander-reset-*/"
echo "  # Copy files back to ~/.claude/plugins/"
