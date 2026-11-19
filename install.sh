#!/bin/bash
# ============================================================================
# CC Commander — Universal Installer
# ============================================================================
# Usage:
#   ./install.sh              Interactive install (asks who you are)
#   ./install.sh --dry-run    Preview what would be installed
#   ./install.sh --verify     Validate an existing installation
#   ./install.sh --force      Skip confirmation prompts
#   ./install.sh --mode=essentials   Install essentials only
#
# Every entry the installer writes is recorded in
# <config dir>/commander/install-manifest.json. uninstall.sh removes only those
# entries, and only while they are unchanged since install.
#
# Environment:
#   CLAUDE_CONFIG_DIR   Target config dir (default ~/.claude)
#   CCC_BIN_DIR         Where to link the ccc command (default /usr/local/bin
#                       when writable, else ~/.local/bin)
#
# For remote install:
#   git clone https://github.com/KevinZai/commander.git && cd commander && ./install.sh
# ============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
VERSION="$(grep '"version"' "$SCRIPT_DIR/package.json" | head -1 | sed 's/.*"version": *"\([^"]*\)".*/\1/')"
# Install where Claude Code reads its config: CLAUDE_CONFIG_DIR when set,
# else ~/.claude. XDG_CONFIG_HOME is the shared ~/.config root, not Claude's dir.
CLAUDE_DIR="${CLAUDE_CONFIG_DIR:-$HOME/.claude}"
# A tab or newline in the profile path is refused before anything else: $(...) would strip a trailing newline
# after the guard checked the path with it (Codex #298), and the install plan is tab-separated.
case "$CLAUDE_DIR" in
  *$'\t'*|*$'\n'*) echo "ERROR: the config dir path must not contain tabs or newlines"; exit 1 ;;
esac
# Trailing slashes would let "$HOME/" slip past the string checks below.
while [[ "$CLAUDE_DIR" == */ && "$CLAUDE_DIR" != "/" ]]; do CLAUDE_DIR="${CLAUDE_DIR%/}"; done
[[ -n "${CLAUDE_DIR:-}" && "$CLAUDE_DIR" != "/" && "$CLAUDE_DIR" != "$HOME" ]] || { echo "ERROR: Invalid CLAUDE_DIR ($CLAUDE_DIR)"; exit 1; }
# Compare resolved paths too, so a symlink, ../ or (on a case-insensitive Mac volume) a different
# capitalization that lands on /, the home directory or one of its ancestors is refused. A path that does not
# exist yet is resolved through its nearest existing ancestor.
if command -v node &>/dev/null; then
  # `kc.js __profile-dir` (commander/lib/profile-path.js) is the one profile resolver, shared with `ccc --skills`
  # and the lane resolver behind check-in, hold and `ccc next`, so the guard, every rm/mkdir here
  # and the CLI act on the same physical directory (cd -P semantics; a backslash is a file-name character on
  # POSIX). It refuses a root, the home directory or one of its parents, and any path whose resolved form holds a
  # control character, before $(...) could strip a trailing newline from it. Absoluteness is checked there too, by
  # the platform's own rules, so a native UNC profile (\\server\share\team) passes and a share root does not.
  if ! guard_out="$(node "$SCRIPT_DIR/bin/kc.js" __profile-dir "$CLAUDE_DIR" "$HOME" 2>/dev/null)"; then
    echo "ERROR: ${guard_out:-could not resolve the config dir $CLAUDE_DIR}"; exit 1
  fi
  CLAUDE_DIR="$guard_out"
fi
# The install plan is tab-separated, so a path containing a tab or newline cannot be represented in it.
case "$CLAUDE_DIR$SCRIPT_DIR" in
  *$'\t'*|*$'\n'*) echo "ERROR: install paths must not contain tabs or newlines"; exit 1 ;;
esac
MANIFEST="$CLAUDE_DIR/commander/install-manifest.json"
USER_NAME=""
DRY_RUN=false
VERIFY_ONLY=false
FORCE=false
CLEAN=false   # --clean: replace skills/commands/hooks instead of merging into them (audit P0, 2026-11-18)
INSTALL_CLI=false   # --install-cli: allow `npm install -g` of Claude Code and context-mode when missing
SKIP_DEPS=false     # --skip-deps: do not run `npm install` in this checkout
REPLACE_EXISTING=false  # --replace-existing: back up and replace files of yours at kit paths (default: keep them)
BACKUP_DIR=""
INSTALL_MODE="full"
SKILLS_TIER=""

# Source the terminal art library
source "${SCRIPT_DIR}/lib/terminal-art.sh"

# ── Parse flags ──────────────────────────────────────────────────────────────

while [[ $# -gt 0 ]]; do
  case $1 in
    --dry-run)  DRY_RUN=true; shift ;;
    --verify)   VERIFY_ONLY=true; shift ;;
    --force)    FORCE=true; shift ;;
    --clean)    CLEAN=true; shift ;;
    --install-cli) INSTALL_CLI=true; shift ;;
    --skip-deps) SKIP_DEPS=true; shift ;;
    --replace-existing) REPLACE_EXISTING=true; shift ;;
    --mode=*)   INSTALL_MODE="${1#*=}"
                case "$INSTALL_MODE" in full|essentials|scripts|dashboard|config) ;;
                  *) echo "ERROR: unknown --mode=$INSTALL_MODE (full|essentials|scripts|dashboard|config)"; exit 1 ;; esac
                shift ;;
    --skills=*) SKILLS_TIER="${1#*=}"; shift ;;
    --help|-h)
      cc_mini_banner
      echo "Usage: ./install.sh [flags]"
      echo ""
      echo "  --dry-run          Preview what would be installed"
      echo "  --verify           Validate an existing installation"
      echo "  --force            Skip confirmation prompts"
      echo "  --clean            Replace ~/.claude skills, commands and hooks instead of merging (backed up first)"
      echo "  --mode=MODE        Install mode: full|essentials|scripts|dashboard|config"
      echo "  --skills=TIER      Skill tier: essential (default), recommended, full, custom"
      echo "                     (a tier other than full needs jq). Without --skills, a re-install or"
      echo "                     update keeps the tier recorded by the previous install, else essential;"
      echo "                     full is installed only when asked for"
      echo "  --install-cli      Allow npm install -g of Claude Code / context-mode when missing"
      echo "  --skip-deps        Do not run npm install in this checkout"
      echo "  --replace-existing Back up and replace your own files at paths CC Commander installs"
      echo "                     (default: keep them and list them)"
      echo "  --help             Show this help"
      exit 0
      ;;
    *) echo -e "${M_RED}Unknown flag: $1${NC}"; exit 1 ;;
  esac
done

# ── Matrix Rain Intro ──────────────────────────────────────────────────────

cc_matrix_rain 2
clear 2>/dev/null || true
cc_banner
cc_typewriter "  Initializing the ultimate Claude Code setup..." 0.02 "$M_DIM"
echo ""

# ── Verify mode ──────────────────────────────────────────────────────────────

if $VERIFY_ONLY; then
  cc_section_header "VERIFICATION"
  errors=0

  # Check claude binary
  if command -v claude &>/dev/null; then
    cc_status_line "✓" "Claude Code CLI installed"
  else
    cc_status_line "✗" "Claude Code CLI not found"
    errors=$((errors+1))
  fi

  # Check CLAUDE.md
  if [ -f "$CLAUDE_DIR/CLAUDE.md" ]; then
    cc_status_line "✓" "CLAUDE.md exists"
  else
    cc_status_line "✗" "CLAUDE.md missing"
    errors=$((errors+1))
  fi

  # Check settings.json
  if [ -f "$CLAUDE_DIR/settings.json" ]; then
    if python3 -c "import json, sys; json.load(open(sys.argv[1]))" "$CLAUDE_DIR/settings.json" 2>/dev/null; then
      cc_status_line "✓" "settings.json valid JSON"
    else
      cc_status_line "✗" "settings.json invalid JSON"
      errors=$((errors+1))
    fi
  else
    cc_status_line "✗" "settings.json missing"
    errors=$((errors+1))
  fi

  # Check skills
  if [ -d "$CLAUDE_DIR/skills" ]; then
    skill_count=$(find "$CLAUDE_DIR/skills" -maxdepth 1 -type d | wc -l | tr -d ' ')
    skill_count=$((skill_count - 1))
    cc_status_line "✓" "Skills directory ($skill_count skills)"
  else
    cc_status_line "✗" "Skills directory missing"
    errors=$((errors+1))
  fi

  # Check mega-skills
  for mega in ccc-seo ccc-design ccc-testing ccc-marketing ccc-saas ccc-devops; do
    if [ -d "$CLAUDE_DIR/skills/$mega" ]; then
      sub_count=$(find "$CLAUDE_DIR/skills/$mega" -maxdepth 1 -type d | wc -l | tr -d ' ')
      sub_count=$((sub_count - 1))
      cc_status_line "✓" "$mega ($sub_count sub-skills)" "$M_CYAN"
    else
      cc_status_line "!" "$mega not found"
    fi
  done

  # Check commands
  if [ -d "$CLAUDE_DIR/commands" ]; then
    cmd_count=$(find "$CLAUDE_DIR/commands" -name '*.md' | wc -l | tr -d ' ')
    cc_status_line "✓" "Commands directory ($cmd_count commands)"
  else
    cc_status_line "✗" "Commands directory missing"
    errors=$((errors+1))
  fi

  # Check hooks
  if [ -f "$CLAUDE_DIR/hooks/hooks.json" ]; then
    cc_status_line "✓" "hooks.json exists"
  else
    cc_status_line "!" "hooks.json not found"
  fi

  # Guard hooks: Claude Code runs hooks registered in settings.json (not <config dir>/hooks/hooks.json).
  # A guard counts as registered only for the exact entry the installer writes: a PreToolUse matcher "Bash", a
  # hook of type "command", and the rendered command for this config dir (or the template's $HOME/.claude form
  # when this is ~/.claude). A Read matcher, or any command that merely mentions the guard path, does not count.
  # Not registered is a warning (an existing settings.json is never edited); registered but missing is an error.
  # disableAllHooks: true turns every hook off, so a registered guard is then reported as inactive, not ok.
  if [ -f "$CLAUDE_DIR/settings.json" ]; then
    for guard in careful-guard confidence-gate; do
      guard_state="$(node -e '
        var fs = require("fs"), path = require("path"), nodeCrypto = require("crypto");
        var cfg; try { cfg = JSON.parse(fs.readFileSync(process.argv[1], "utf8")); } catch (_e) { process.stdout.write("unreadable"); process.exit(0); }
        var root = path.resolve(process.argv[2]), name = process.argv[3], srcRoot = process.argv[4], home = process.env.HOME || "";
        var file = path.join(root, "hooks", name + ".js");
        var q = path.join(root, "hooks").replace(/[\\"$`]/g, "\\$&") + "/" + name + ".js";
        var expected = ["if [ -f \"" + q + "\" ]; then node \"" + q + "\"; fi"];
        if (home && root === path.resolve(home, ".claude")) expected.push("if [ -f \"$HOME/.claude/hooks/" + name + ".js\" ]; then node \"$HOME/.claude/hooks/" + name + ".js\"; fi");
        var exact = false, mentioned = false;
        ((cfg.hooks && cfg.hooks.PreToolUse) || []).forEach(function(m) {
          (m && m.hooks || []).forEach(function(h) {
            if (!h || typeof h.command !== "string" || h.command.indexOf(name + ".js") === -1) return;
            mentioned = true;
            if (m.matcher === "Bash" && h.type === "command" && expected.indexOf(h.command) !== -1) exact = true;
          });
        });
        if (!exact) { process.stdout.write(mentioned ? "mismatch" : "unregistered"); process.exit(0); }
        var st = null; try { st = fs.lstatSync(file); } catch (_e) { st = null; }
        if (!st || !st.isFile()) { process.stdout.write("missing:" + file); process.exit(0); }
        var sha = function(p) { return nodeCrypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex"); };
        var shipped = null; try { shipped = sha(path.join(srcRoot, "hooks", name + ".js")); } catch (_e) { shipped = null; }
        if (cfg.disableAllHooks === true) { process.stdout.write("disabled"); process.exit(0); }
        process.stdout.write(shipped && sha(file) !== shipped ? "modified:" + file : "ok");
      ' "$CLAUDE_DIR/settings.json" "$CLAUDE_DIR" "$guard" "$SCRIPT_DIR" 2>/dev/null || echo unreadable)"
      case "$guard_state" in
        ok) cc_status_line "✓" "$guard registered in settings.json (PreToolUse Bash)" ;;
        unregistered) cc_status_line "!" "$guard not registered in settings.json (see settings.json.template)" ;;
        mismatch) cc_status_line "!" "$guard is referenced in settings.json, but not as the expected PreToolUse Bash command hook (see settings.json.template)" ;;
        modified:*) cc_status_line "!" "$guard registered, but ${guard_state#modified:} differs from the shipped version" ;;
        disabled) cc_status_line "!" "$guard is registered, but settings.json sets disableAllHooks: true, so it does not run" ;;
        missing:*) cc_status_line "✗" "$guard registered but its script is missing: ${guard_state#missing:}"; errors=$((errors+1)) ;;
        *) ;;  # settings.json validity is reported above
      esac
    done
  fi

  # Check lib
  if [ -f "$CLAUDE_DIR/lib/terminal-art.sh" ]; then
    cc_status_line "✓" "Terminal art library installed"
  else
    cc_status_line "!" "Terminal art library not found"
  fi

  # Check reference docs
  for doc in BIBLE.md CHEATSHEET.md SKILLS-INDEX.md; do
    if [ -f "$CLAUDE_DIR/$doc" ]; then
      if grep -q "CC Commander v${VERSION}" "$CLAUDE_DIR/$doc" 2>/dev/null; then
        cc_status_line "✓" "$doc exists (v${VERSION})"
      else
        cc_status_line "!" "$doc exists but may be outdated (no v${VERSION} stamp)"
      fi
    else
      cc_status_line "!" "$doc not found"
    fi
  done

  # Check for placeholder tokens
  if grep -rq '\[Your Name\]' "$CLAUDE_DIR/CLAUDE.md" 2>/dev/null; then
    cc_status_line "!" "CLAUDE.md still has [Your Name] placeholder"
  fi

  echo ""
  if [ $errors -eq 0 ]; then
    cc_status_line "✓" "Installation is healthy" "$M_BRIGHT"
  else
    cc_status_line "✗" "Found $errors issue(s)" "$M_RED"
  fi
  echo ""
  exit $errors
fi

# ── Identity ─────────────────────────────────────────────────────────────────

cc_section_header "IDENTITY"
echo -e "  ${M_WHITE}Who is this?${NC}"
echo ""
if $FORCE; then
  USER_NAME="${USER_NAME:-User}"
else
  read -p "  Enter your name: " USER_NAME
  if [ -z "$USER_NAME" ]; then
    cc_status_line "✗" "Name required."
    exit 1
  fi
fi

echo ""
cc_status_line "►" "Setting up config for ${USER_NAME}" "$M_CYAN"

echo ""
echo -e "  ${M_DIM}Target:${NC}       ${M_WHITE}${CLAUDE_DIR}/${NC}"

# ── Dry run ──────────────────────────────────────────────────────────────────

if $DRY_RUN; then
  cc_section_header "DRY RUN"
  echo -e "  ${M_AMBER}Nothing will be changed — preview only${NC}"
  echo ""

  local_skills=$(find "$SCRIPT_DIR/skills" -maxdepth 1 -type d | wc -l | tr -d ' ')
  local_skills=$((local_skills - 1))
  local_cmds=$(find "$SCRIPT_DIR/commands" -name '*.md' | wc -l | tr -d ' ')

  cc_status_line "·" "CLAUDE.md        ← CLAUDE.md.template"
  cc_status_line "·" "settings.json    ← settings.json.template"
  cc_status_line "·" "skills/          ← $local_skills skill directories"
  cc_status_line "·" "commands/        ← $local_cmds commands"
  cc_status_line "·" "hooks/           ← hooks.json + scripts"
  cc_status_line "·" "lib/             ← terminal art libraries"
  cc_status_line "·" "templates/       ← starter templates"
  cc_status_line "·" "BIBLE.md         ← CC Commander reference"
  cc_status_line "·" "CHEATSHEET.md    ← Quick reference"
  cc_status_line "·" "SKILLS-INDEX.md  ← Skill discovery"

  if [ -d "$CLAUDE_DIR" ]; then
    echo ""
    if $REPLACE_EXISTING; then
      cc_status_line "!" "Would back up any existing file it replaces to ${CLAUDE_DIR}.backup.<timestamp>/"
    else
      cc_status_line "·" "Would keep any file of yours at a path CC Commander installs (--replace-existing replaces it)"
    fi
  fi

  echo ""
  if [[ "${SKILLS_TIER:-}" != "" && "${SKILLS_TIER}" != "full" ]] && ! command -v jq &>/dev/null; then
    cc_status_line "✗" "--skills=${SKILLS_TIER} needs jq, which is not installed" "$M_RED"
  fi
  echo -e "  ${M_AMBER}Run without --dry-run to install.${NC}"
  echo ""
  exit 0
fi

# ── Confirmation ─────────────────────────────────────────────────────────────

if ! $FORCE; then
  echo ""
  if [ -d "$CLAUDE_DIR" ]; then
    echo -e "  ${M_AMBER}This will back up your ~/.claude/ config and merge CC Commander into it.${NC}"
    echo -e "  ${M_DIM}Your own skills, commands and hooks are kept (use --clean to replace them).${NC}"
  else
    echo -e "  ${M_DIM}This will create a new ~/.claude/ setup.${NC}"
  fi
  echo ""
  read -p "  Continue? (y/N) " confirm
  if [[ "$(echo "$confirm" | tr '[:upper:]' '[:lower:]')" != "y" ]]; then
    echo ""
    cc_status_line "·" "Aborted. No changes made."
    echo ""
    exit 0
  fi
fi

# ── Install Mode Selection ──────────────────────────────────────────────────

select_install_mode() {
  if [[ "$INSTALL_MODE" != "full" ]]; then
    return
  fi
  if [[ "$FORCE" == "true" ]]; then
    return
  fi
  echo ""
  echo "Installation mode:"
  echo "  1) Full        — Everything (skills, commands, hooks, lib, docs, dashboard)"
  echo "  2) Essentials  — Skills + commands + hooks + CLAUDE.md + settings"
  echo "  3) Scripts     — Terminal art + statusline libraries only"
  echo "  4) Dashboard   — Dashboard only (requires npm)"
  echo "  5) Config      — Just CLAUDE.md + settings.json"
  echo ""
  # Only an empty answer means the default; anything else unrecognized asks again rather than choosing full.
  while true; do
    read -p "Choose [1-5, default=1]: " mode_choice
    case "$mode_choice" in
      ""|1) INSTALL_MODE="full"; break ;;
      2) INSTALL_MODE="essentials"; break ;;
      3) INSTALL_MODE="scripts"; break ;;
      4) INSTALL_MODE="dashboard"; break ;;
      5) INSTALL_MODE="config"; break ;;
      *) echo "  Please enter a number from 1 to 5." ;;
    esac
  done
}

should_install() {
  local component="$1"
  case "$INSTALL_MODE" in
    full) return 0 ;;
    essentials) [[ "$component" =~ ^(skills|commands|hooks|claude-md|settings|mega-symlinks|docs)$ ]] ;;
    scripts) [[ "$component" == "lib" ]] ;;
    dashboard) [[ "$component" == "dashboard" ]] ;;
    config) [[ "$component" =~ ^(claude-md|settings)$ ]] ;;
    *) return 1 ;;   # an unknown mode installs (and --clean clears) nothing
  esac
}

select_install_mode

# ── Preflight: everything that can fail runs before anything is changed ──────

install_fail() {
  cc_status_line "✗" "$1" "$M_RED"
  echo -e "  ${M_DIM}Nothing was changed.${NC}"
  echo ""
  exit 1
}

if ! command -v node &>/dev/null; then
  install_fail "Node.js 20.19+ is required (the installer records what it writes with node)."
fi

# The install manifest must live in this profile's own commander/ directory (no symlinked parent) and, when it
# exists, record this profile as its claude_dir. A manifest reached through shared state, or copied from another
# profile, is refused before anything is changed, so one profile can never prune another's entries (Codex #298).
check_manifest_owner() {
  node - "$CLAUDE_DIR" "$MANIFEST" <<'OWNER'
'use strict';
var fs = require('fs'), path = require('path');
var root = path.resolve(process.argv[2]), manifest = path.resolve(process.argv[3]);
function real(p) { try { return fs.realpathSync(p); } catch (_e) { return null; } }
var realRoot = real(root) || root;
var dir = path.dirname(manifest);
if (path.dirname(dir) !== root) { console.error('manifest is not in <config dir>/commander: ' + manifest); process.exit(1); }
var st = null; try { st = fs.lstatSync(dir); } catch (_e) { /* not created yet */ }
if (st && (st.isSymbolicLink() || !st.isDirectory() || real(dir) !== path.join(realRoot, 'commander'))) {
  console.error(dir + ' is a symlink or not a directory inside the config dir'); process.exit(1);
}
var mst = null; try { mst = fs.lstatSync(manifest); } catch (_e) { /* first install */ }
if (mst && !mst.isFile()) { console.error(manifest + ' is not a regular file'); process.exit(1); }
if (mst) {
  var m = null; try { m = JSON.parse(fs.readFileSync(manifest, 'utf8')); } catch (_e) { /* unreadable: treated as absent elsewhere */ }
  if (m && !m.claude_dir) {
    console.error(manifest + ' does not record which profile it belongs to. Move it aside and run again.'); process.exit(1);
  }
  if (m) {
    var rec = path.resolve(String(m.claude_dir));
    if (rec !== root && (real(rec) || rec) !== realRoot) {
      console.error('the manifest was written for ' + rec + ', not ' + root + ' (copied profile?). Move it aside and run again.');
      process.exit(1);
    }
  }
}
OWNER
}
if ! owner_err="$(check_manifest_owner 2>&1)"; then
  install_fail "Install manifest check failed: $owner_err"
fi

tier=""
tiers_file="$SCRIPT_DIR/skills/_tiers.json"
if should_install "skills"; then
  # Skill tier: --skills wins. Otherwise (including unattended --force runs from install-remote.sh and
  # ccc --update) keep the tier the previous install recorded in its manifest, else essential. Optional
  # skill packs (full) are installed only when the user asks for them.
  if [ -n "$SKILLS_TIER" ]; then
    tier="$SKILLS_TIER"
  else
    stored_tier="$(node -e '
      try {
        var t = JSON.parse(require("fs").readFileSync(process.argv[1], "utf8")).tier;
        if (typeof t === "string" && /^[a-z][a-z0-9-]{0,31}$/.test(t)) process.stdout.write(t);
      } catch (_e) { /* no manifest: first install */ }
    ' "$MANIFEST" 2>/dev/null || true)"
    tier="${stored_tier:-essential}"
    if [ -n "$stored_tier" ]; then
      cc_status_line "·" "Skill tier: $tier (kept from the previous install; pass --skills=TIER to change it)"
    fi
  fi
  if [[ "$tier" == "custom" ]]; then
    cc_status_line "!" "Custom skill picker not yet implemented — using essential tier"
    tier="essential"
  fi
  if [[ "$tier" != "full" ]] && [[ -f "$tiers_file" ]]; then
    # A tier other than full is resolved with jq. Without it the install would end with an empty skill set,
    # so stop here, before any file is touched (audit #22).
    if ! command -v jq &>/dev/null; then
      install_fail "jq is required for --skills=$tier. Install jq (brew install jq / apt install jq), or use --skills=full."
    fi
    if ! jq -e --arg t "$tier" '.tiers[$t] != null' "$tiers_file" >/dev/null 2>&1; then
      install_fail "Unknown skill tier: $tier (available: $(jq -r '.tiers | keys | join(", ")' "$tiers_file"), full)"
    fi
  fi
fi

assert_inside_config() {
  # Defensive: never rm -rf outside a .claude dir or an explicit CLAUDE_CONFIG_DIR
  # CLAUDE_DIR is the resolved profile path the guard above already checked, so a target must sit inside it.
  # (A ~/.claude linked to ~/dotfiles/claude resolves there; no "/.claude" substring is required.)
  if [[ "$1" != "${CLAUDE_DIR}/"* ]]; then
    echo "❌ Refusing to rm -rf outside a .claude config dir — got: $1"
    exit 1
  fi
}

# ── Claude Code CLI ──────────────────────────────────────────────────────────
# Global npm installs are opt-in (--install-cli): the installer never adds an unpinned global CLI on its own.

if ! command -v claude &>/dev/null; then
  cc_section_header "CLAUDE CODE CLI"
  if $INSTALL_CLI; then
    echo -e "  ${M_DIM}Claude Code CLI not found. Running: npm install -g @anthropic-ai/claude-code${NC}"
    npm install -g @anthropic-ai/claude-code
    cc_status_line "✓" "Claude Code CLI installed"
  else
    cc_status_line "!" "Claude Code CLI not found. Install it from https://code.claude.com, or re-run with --install-cli" "$M_AMBER"
  fi
fi

# ── Dependencies (before any profile change) ────────────────────────────────
# The ccc CLI needs this checkout's runtime dependencies. They are installed from the lockfile (npm ci --omit=dev)
# with npm's errors shown, and a failure stops the install here, before the config dir is touched. A require of
# commander/tui.js then proves the CLI loads, with or without --skip-deps.

if ! $SKIP_DEPS && [ -f "$SCRIPT_DIR/package.json" ] && [ ! -d "$SCRIPT_DIR/node_modules" ]; then
  cc_section_header "DEPENDENCIES"
  command -v npm &>/dev/null || install_fail "npm is required to install the CLI's dependencies (or re-run with --skip-deps after installing them yourself)."
  if [ -f "$SCRIPT_DIR/package-lock.json" ]; then
    deps_cmd=(npm ci --omit=dev)
  else
    deps_cmd=(npm install --omit=dev)
  fi
  cc_status_line "►" "Installing npm dependencies: ${deps_cmd[*]}"
  if ! (cd "$SCRIPT_DIR" && "${deps_cmd[@]}" >/dev/null); then
    install_fail "${deps_cmd[*]} failed in $SCRIPT_DIR (npm's errors are above)."
  fi
  cc_status_line "✓" "Dependencies installed"
fi
if ! smoke_err="$(node -e 'require(process.argv[1])' "$SCRIPT_DIR/commander/tui.js" 2>&1 >/dev/null)"; then
  install_fail "The ccc CLI does not load (commander/tui.js): ${smoke_err%%$'\n'*}. Run: cd \"$SCRIPT_DIR\" && npm ci --omit=dev"
fi

# ── Backup ───────────────────────────────────────────────────────────────────
# Merge installs back up each file they replace, file by file, into BACKUP_DIR; the directory is created only when
# something is actually replaced. --clean backs up the whole skills/commands/hooks directories before replacing them.

BACKUP_DIR="$CLAUDE_DIR.backup.$(date +%Y%m%d%H%M%S)"

if [ -d "$CLAUDE_DIR" ] && $CLEAN; then
  cc_section_header "ARCHIVING OLD SETUP"
  mkdir -p "$BACKUP_DIR"
  for item in skills commands hooks; do
    # Clear only what this mode reinstalls; --clean --mode=config must not empty skills/commands/hooks.
    should_install "$item" || continue
    if [ -e "$CLAUDE_DIR/$item" ] || [ -L "$CLAUDE_DIR/$item" ]; then
      cp -R "$CLAUDE_DIR/$item" "$BACKUP_DIR/"
      assert_inside_config "$CLAUDE_DIR/$item"
      rm -rf "${CLAUDE_DIR:?}/$item"
      cc_status_line "✓" "$item/ archived and cleared (--clean)"
    fi
  done
fi

# ── OpenClaw Detection ──────────────────────────────────────────────────────

detect_openclaw() {
  if command -v openclaw &>/dev/null || [[ -d "$HOME/.openclaw" ]]; then
    echo "  OpenClaw detected — enabling native integration"
    export CC_OPENCLAW_ENABLED=1
  fi
}

detect_openclaw

# ── Install Components ───────────────────────────────────────────────────────
# Components are first written to a plan (group, op, source, destination); one node pass then applies the plan,
# keeps any file of the user's at a kit path (backs it up and replaces it with --replace-existing), removes entries a previous install wrote that this one no longer does (only while
# they are unchanged), and records every entry in the install manifest.

cc_section_header "INSTALLING"

PLAN="$(mktemp "${TMPDIR:-/tmp}/ccc-install-plan.XXXXXX")"
trap 'rm -f "$PLAN"' EXIT

plan_add() { printf '%s\t%s\t%s\t%s\n' "$1" "$2" "$3" "$4" >> "$PLAN"; }
plan_group() { plan_add "$1" group - -; }

# 1. Skills
if should_install "skills"; then
  plan_group skills
  if [[ "$tier" == "full" ]] || [[ ! -f "$tiers_file" ]]; then
    plan_add skills tree "$SCRIPT_DIR/skills" "skills"
  else
    # The selected tier, the tiers it includes, and the domain skills for "recommended"
    all_skills="$(
      jq -r --arg t "$tier" '.tiers[$t].skills[]?' "$tiers_file"
      for inc in $(jq -r --arg t "$tier" '.tiers[$t].includes[]?' "$tiers_file"); do
        jq -r --arg t "$inc" '.tiers[$t].skills[]?' "$tiers_file"
      done
      if [[ "$tier" == "recommended" ]]; then jq -r '.tiers["domain"].skills[]?' "$tiers_file"; fi
    )"
    while IFS= read -r skill; do
      [[ "$skill" =~ ^[a-z0-9][a-z0-9-]{0,63}$ ]] || continue
      if [[ -d "$SCRIPT_DIR/skills/$skill" ]]; then
        plan_add skills link "$SCRIPT_DIR/skills/$skill" "skills/$skill"
      fi
    done <<< "$(printf '%s\n' "$all_skills" | sort -u)"
    # _catalog.md and _tiers.json for reference
    [[ -f "$SCRIPT_DIR/skills/_catalog.md" ]] && plan_add skills copy "$SCRIPT_DIR/skills/_catalog.md" "skills/_catalog.md"
    plan_add skills copy "$tiers_file" "skills/_tiers.json"
  fi
fi

# 1b. context-mode MCP server (tool output sandboxing)
if should_install "skills"; then
  plan_group mcp
  if command -v context-mode &>/dev/null; then
    cc_status_line "✓" "context-mode already installed"
  elif $INSTALL_CLI && command -v npm &>/dev/null; then
    echo -e "  ${M_DIM}Running: npm install -g context-mode${NC}"
    npm install -g context-mode >/dev/null 2>&1 && cc_status_line "✓" "context-mode installed (tool output sandboxing)" || cc_status_line "!" "context-mode install failed (optional — install manually: npm i -g context-mode)"
  else
    cc_status_line "·" "context-mode not installed (optional: npm i -g context-mode, or re-run with --install-cli)"
  fi
  # Register the MCP server in Claude Code's global config (inside CLAUDE_CONFIG_DIR when set) only when the
  # command exists; the manifest records the key so uninstall removes it again.
  if [[ -n "${CLAUDE_CONFIG_DIR:-}" ]]; then claude_json="$CLAUDE_DIR/.claude.json"; else claude_json="$HOME/.claude.json"; fi
  if command -v context-mode &>/dev/null && [[ -f "$claude_json" ]]; then
    plan_add mcp mcp-server "$claude_json" "context-mode"
  fi
fi

# 2. Commands
if should_install "commands"; then
  plan_group commands
  plan_add commands tree "$SCRIPT_DIR/commands" "commands"
fi

# 3. Hooks (top-level scripts only; _archive/ is not installed)
if should_install "hooks"; then
  plan_group hooks
  for f in "$SCRIPT_DIR"/hooks/*.js "$SCRIPT_DIR"/hooks/*.sh; do
    [ -f "$f" ] && plan_add hooks copy "$f" "hooks/$(basename "$f")"
  done
  # Standalone hooks config (doesn't require oh-my-claudecode plugin), rendered for this config dir.
  # The applier writes hooks/hooks.json, or hooks/hooks.commander.json beside a hooks.json that is not ours.
  if [ -f "$SCRIPT_DIR/hooks/hooks-standalone.json" ]; then
    plan_add hooks hooks-config "$SCRIPT_DIR/hooks/hooks-standalone.json" "hooks/hooks.json"
  fi
fi

# 4. Lib (terminal art)
if should_install "lib"; then
  plan_group lib
  plan_add lib tree "$SCRIPT_DIR/lib" "lib"
fi

# 5. Templates
if should_install "templates"; then
  plan_group templates
  plan_add templates tree "$SCRIPT_DIR/templates" "templates"
fi

# 6. Reference docs (BIBLE.md is stamped with the version)
if should_install "docs"; then
  plan_group docs
  for doc in BIBLE.md CHEATSHEET.md SKILLS-INDEX.md; do
    if [ -f "$SCRIPT_DIR/$doc" ]; then
      if [[ "$doc" == "BIBLE.md" ]]; then
        plan_add docs stamped "$SCRIPT_DIR/$doc" "$doc"
      else
        plan_add docs copy "$SCRIPT_DIR/$doc" "$doc"
      fi
    fi
  done
fi

# 7. The ccc command: linked into CCC_BIN_DIR, else /usr/local/bin when writable, else ~/.local/bin.
# An existing ccc that is not a link to a CC Commander checkout is left alone.
CCC_BIN="${SCRIPT_DIR}/bin/ccc.js"
chmod +x "$CCC_BIN"
if [[ -n "${CCC_BIN_DIR:-}" ]]; then
  ccc_bin_dir="$CCC_BIN_DIR"
elif [[ -d /usr/local/bin ]] && [[ -w /usr/local/bin ]]; then
  ccc_bin_dir="/usr/local/bin"
else
  ccc_bin_dir="${HOME}/.local/bin"
fi
plan_group bin
plan_add bin bin-link "$CCC_BIN" "$ccc_bin_dir/ccc"

mkdir -p "$CLAUDE_DIR"

cc_status_line "►" "Applying install plan (tier: ${tier:-n/a})"
node - "$CLAUDE_DIR" "$PLAN" "$MANIFEST" "$BACKUP_DIR" "$SCRIPT_DIR" "$VERSION" "$CLEAN" "$tier" "$REPLACE_EXISTING" <<'APPLY'
'use strict';
var fs = require('fs');
var path = require('path');
var cryptoMod = require('crypto');

var argv = process.argv.slice(2);
var ROOT = path.resolve(argv[0]);
var planFile = argv[1], manifestPath = argv[2], backupDir = argv[3], srcRoot = path.resolve(argv[4]);
var version = argv[5], clean = argv[6] === 'true', tier = argv[7] || null;
var replaceExisting = argv[8] === 'true';

function lst(p) { try { return fs.lstatSync(p); } catch (_e) { return null; } }
function sha(buf) { return cryptoMod.createHash('sha256').update(buf).digest('hex'); }
function keyOf(e) { return e.abs ? 'abs:' + e.abs : (e.type === 'mcp-server' ? 'mcp:' + e.file + '#' + e.name : e.path); }
function absOf(e) { return e.abs ? e.abs : path.join(ROOT, e.path); }
function within(dir, p) { return p === dir || p.startsWith(dir + path.sep); }
function relInside(rel) {
  var abs = path.resolve(ROOT, rel);
  if (abs === ROOT || !within(ROOT, abs)) throw new Error('refusing a path outside the config dir: ' + rel);
  return path.relative(ROOT, abs);
}
function writeAtomic(abs, buf, mode) {
  var tmp = path.join(path.dirname(abs), '.' + path.basename(abs) + '.ccc-tmp-' + process.pid);
  fs.writeFileSync(tmp, buf, { mode: mode || 0o644 });
  fs.renameSync(tmp, abs);
}

// The config dir as the filesystem resolves it. Every entry the installer records or removes must resolve under it.
var REAL_ROOT = (function() { try { return fs.realpathSync(ROOT); } catch (_e) { return ROOT; } })();
// True when each existing ancestor between ROOT and abs is a real directory (no symlink, no file) and the parent
// resolves inside the config dir. A skills/ or hooks/ dir linked to shared dotfiles fails this check, so nothing
// is adopted, recorded, pruned or restored through it (audit #01).
function parentsInside(abs) {
  var relDir = path.relative(ROOT, path.dirname(abs));
  if (relDir === '..' || relDir.startsWith('..' + path.sep) || path.isAbsolute(relDir)) return false;
  var cur = ROOT, last = ROOT;
  var parts = relDir ? relDir.split(path.sep) : [];
  for (var i = 0; i < parts.length; i++) {
    cur = path.join(cur, parts[i]);
    var st = lst(cur);
    if (!st) break; // the rest is created by ensureParents as real directories
    if (st.isSymbolicLink() || !st.isDirectory()) return false;
    last = cur;
  }
  try { return within(REAL_ROOT, fs.realpathSync(last)); } catch (_e) { return false; }
}
function inRoot(e) { return !!e.abs || e.type === 'mcp-server' || parentsInside(absOf(e)); }

// Re-checked where the manifest is used, not only in the shell preflight: commander/ must be a real directory
// directly under the resolved config dir, and a manifest must name this profile (Codex #298).
function manifestHome(manifestPath, ROOT, REAL_ROOT) {
  var dir = path.dirname(path.resolve(manifestPath));
  if (path.dirname(dir) !== ROOT) return 'manifest is not in <config dir>/commander';
  var st = null; try { st = fs.lstatSync(dir); } catch (_e) { return null; }
  if (st.isSymbolicLink() || !st.isDirectory()) return dir + ' is a symlink or not a directory';
  try { if (fs.realpathSync(dir) !== path.join(REAL_ROOT, 'commander')) return dir + ' resolves outside the config dir'; } catch (_e) { return dir + ' cannot be resolved'; }
  return null;
}
function manifestOwnerOk(m, ROOT, REAL_ROOT) {
  if (!m || !m.claude_dir) return false;
  var rec = path.resolve(String(m.claude_dir)), real = rec;
  try { real = fs.realpathSync(rec); } catch (_e) { /* compare as recorded */ }
  return rec === ROOT || real === REAL_ROOT;
}
var homeErr = manifestHome(manifestPath, ROOT, REAL_ROOT);
if (homeErr) { console.error('  ✗ ' + homeErr + '. Nothing was changed.'); process.exit(1); }
var prev = { entries: [], dirs: [], backups: [] };
var prevRead = false;
try { prev = JSON.parse(fs.readFileSync(manifestPath, 'utf8')); prevRead = true; } catch (_e) { /* first install */ }
if (prevRead && !manifestOwnerOk(prev, ROOT, REAL_ROOT)) {
  console.error('  ✗ the install manifest belongs to another profile. Nothing was changed.'); process.exit(1);
}
var prevByKey = new Map((prev.entries || []).map(function(e) { return [keyOf(e), e]; }));
var dirs = new Set((prev.dirs || []).filter(function(d) { var s = lst(path.join(ROOT, d)); return s && s.isDirectory(); }));
var stats = { written: 0, unchanged: 0, replaced: 0, pruned: 0, restored: 0, keptModified: 0, notAdopted: 0, conflicts: [], keptExisting: [] };
var backupUsed = false;

// Is the entry still exactly what the installer wrote? null when it no longer exists.
function owned(e) {
  if (e.type === 'mcp-server') {
    try {
      var d = JSON.parse(fs.readFileSync(e.file, 'utf8'));
      var v = d && d.mcpServers ? d.mcpServers[e.name] : undefined;
      return v === undefined ? null : JSON.stringify(v) === JSON.stringify(e.value);
    } catch (_e) { return null; }
  }
  var st = lst(absOf(e));
  if (!st) return null;
  if (e.type === 'file') return st.isFile() && sha(fs.readFileSync(absOf(e))) === e.sha;
  if (e.type === 'symlink') return st.isSymbolicLink() && fs.readlinkSync(absOf(e)) === e.target;
  return false;
}

function backupOf(e) {
  var rel = e.abs ? path.join('_external', e.abs) : (e.type === 'mcp-server' ? path.join('_external', e.file) : e.path);
  return path.join(backupDir, rel);
}
function backup(e) {
  if (!backupDir) return null;
  var src = e.type === 'mcp-server' ? e.file : absOf(e);
  var dst = backupOf(e);
  if (!lst(dst)) {
    fs.mkdirSync(path.dirname(dst), { recursive: true });
    var st = fs.lstatSync(src);
    if (st.isSymbolicLink()) fs.symlinkSync(fs.readlinkSync(src), dst);
    else fs.copyFileSync(src, dst);
  }
  backupUsed = true;
  return dst;
}
// Put the backed-up original back over abs in one rename, so the path is never left empty.
function restoreOver(backupPath, abs) {
  var tmp = path.join(path.dirname(abs), '.' + path.basename(abs) + '.ccc-restore-' + process.pid);
  try { fs.unlinkSync(tmp); } catch (_e) { /* none */ }
  var b = fs.lstatSync(backupPath);
  if (b.isSymbolicLink()) fs.symlinkSync(fs.readlinkSync(backupPath), tmp);
  else fs.copyFileSync(backupPath, tmp);
  fs.renameSync(tmp, abs);
}
// Remove an entry the installer still owns, restoring what it replaced.
// Returns removed|restored|kept|missing|no-backup (a recorded backup is gone: the active file is kept).
function removeOwned(e) {
  var o = owned(e);
  if (o === null) return 'missing';
  if (!o) return 'kept';
  if (e.type === 'mcp-server') {
    var d = JSON.parse(fs.readFileSync(e.file, 'utf8'));
    delete d.mcpServers[e.name];
    writeAtomic(e.file, JSON.stringify(d, null, 2) + '\n', fs.statSync(e.file).mode & 0o777);
    return 'removed';
  }
  if (e.backup) {
    if (!lst(e.backup)) return 'no-backup';
    restoreOver(e.backup, absOf(e));
    return 'restored';
  }
  fs.unlinkSync(absOf(e));
  return 'removed';
}
function removeEmptyDirs() {
  Array.from(dirs).sort(function(a, b) { return b.split(path.sep).length - a.split(path.sep).length; }).forEach(function(d) {
    if (!parentsInside(path.join(ROOT, d))) { dirs.delete(d); return; } // reached through a symlink: not ours to remove
    var dst = lst(path.join(ROOT, d));
    if (dst && dst.isSymbolicLink()) { dirs.delete(d); return; }
    try { fs.rmdirSync(path.join(ROOT, d)); dirs.delete(d); } catch (_e) { /* not empty or gone */ }
    if (!lst(path.join(ROOT, d))) dirs.delete(d);
  });
}
// Create missing parent directories inside ROOT (recorded), refusing to write through a symlinked parent.
function ensureParents(abs) {
  var relDir = path.relative(ROOT, path.dirname(abs));
  if (!relDir) return true;
  var cur = ROOT;
  var parts = relDir.split(path.sep);
  for (var i = 0; i < parts.length; i++) {
    cur = path.join(cur, parts[i]);
    var st = lst(cur);
    if (!st) { fs.mkdirSync(cur); dirs.add(path.relative(ROOT, cur)); continue; }
    if (st.isSymbolicLink() || !st.isDirectory()) return false;
  }
  return true;
}

// ── Expand the plan into concrete entries ──
var groups = new Set();
var ops = new Map();
function addOp(op) { ops.set(keyOf(op), op); }
// Walk a source tree (root -> rootRel). A symlink that stays inside the tree is installed as a link to the
// installed copy (skills/marketing-pack -> ccc-marketing); one that points elsewhere in the checkout is copied.
function addTree(src, rel, root, rootRel) {
  var st = lst(src);
  if (!st || path.basename(src) === 'node_modules' || path.basename(src) === '.git') return;
  if (st.isSymbolicLink()) {
    var real;
    try { real = fs.realpathSync(src); } catch (_e) { return; } // dangling
    var realRoot = fs.realpathSync(root);
    if (within(realRoot, real) && real !== realRoot) {
      var counterpart = path.join(ROOT, rootRel, path.relative(realRoot, real));
      addOp({ group: curGroup, path: relInside(rel), type: 'symlink', target: path.relative(path.dirname(path.join(ROOT, rel)), counterpart) });
      return;
    }
    if (within(fs.realpathSync(srcRoot), real)) { addTree(real, rel, real, rel); return; }
    stats.conflicts.push(rel + ' (source link points outside the checkout; skipped)');
    return;
  }
  if (st.isDirectory()) {
    fs.readdirSync(src).sort().forEach(function(n) { addTree(path.join(src, n), path.join(rel, n), root, rootRel); });
    return;
  }
  if (st.isFile()) addOp({ group: curGroup, path: relInside(rel), type: 'file', src: src, mode: st.mode & 0o777 });
}

var curGroup = null;
fs.readFileSync(planFile, 'utf8').split('\n').filter(Boolean).forEach(function(line) {
  var f = line.split('\t');
  var group = f[0], op = f[1], a = f[2], b = f[3];
  curGroup = group;
  groups.add(group);
  if (op === 'group') return;
  if (op === 'tree') return addTree(a, b, a, b);
  if (op === 'copy') return addOp({ group: group, path: relInside(b), type: 'file', src: a, mode: fs.statSync(a).mode & 0o777 });
  if (op === 'stamped') {
    return addOp({ group: group, path: relInside(b), type: 'file', mode: 0o644,
      content: Buffer.concat([Buffer.from('<!-- CC Commander v' + version + ' -->\n'), fs.readFileSync(a)]) });
  }
  if (op === 'link') return addOp({ group: group, path: relInside(b), type: 'symlink', target: a });
  if (op === 'bin-link') return addOp({ group: group, abs: path.resolve(b), type: 'symlink', target: a });
  if (op === 'mcp-server') return addOp({ group: group, type: 'mcp-server', file: a, name: b, value: { type: 'stdio', command: b } });
  if (op === 'hooks-config') {
    // Render hook commands for this config dir: "$HOME/.claude/hooks/x.js" -> "<config dir>/hooks/x.js"
    var hooksDir = path.join(ROOT, 'hooks').replace(/[\\"$`]/g, '\\$&');
    var cfg = JSON.parse(fs.readFileSync(a, 'utf8'));
    Object.keys(cfg.hooks || {}).forEach(function(ev) {
      (cfg.hooks[ev] || []).forEach(function(m) {
        (m.hooks || []).forEach(function(h) {
          if (typeof h.command === 'string') h.command = h.command.split('$HOME/.claude/hooks/').join(hooksDir + '/');
        });
      });
    });
    var content = Buffer.from(JSON.stringify(cfg, null, 2) + '\n');
    var rel = relInside(b);
    var cur = lst(path.join(ROOT, rel));
    var pe = prevByKey.get(rel);
    if (cur && !clean && !(pe && owned(pe)) && !(cur.isFile() && sha(fs.readFileSync(path.join(ROOT, rel))) === sha(content))) {
      rel = relInside(path.join(path.dirname(b), 'hooks.commander.json')); // never overwrite the user's hooks.json
      console.log('  ! Kept your hooks/hooks.json; CC Commander\'s is in hooks/hooks.commander.json');
    }
    return addOp({ group: group, path: rel, type: 'file', content: content, mode: 0o644 });
  }
  throw new Error('unknown plan op: ' + op);
});

// ── Preflight: a link that replaces a directory the previous install wrote (a tier switch, full -> essential) ──
// When the directory also holds files of the user's, pruning would leave a skill directory without its SKILL.md
// that the link then cannot replace. Keep the previous install's copy intact and skip the link instead.
function emptiesOnPrune(dirAbs) {
  var ok = true;
  (function walk(d) {
    var names;
    try { names = fs.readdirSync(d); } catch (_e) { ok = false; return; }
    names.forEach(function(n) {
      if (!ok) return;
      var p = path.join(d, n);
      var st = lst(p);
      if (st && st.isDirectory() && !st.isSymbolicLink()) { walk(p); return; }
      var pe = prevByKey.get(path.relative(ROOT, p));
      if (!pe || !groups.has(pe.group) || ops.has(keyOf(pe)) || owned(pe) !== true) ok = false;
    });
  })(dirAbs);
  return ok;
}
var heldDirs = [];
ops.forEach(function(op, key) {
  if (op.type !== 'symlink' || op.abs) return;
  var abs = absOf(op);
  var st = lst(abs);
  if (!st || !st.isDirectory() || st.isSymbolicLink() || !parentsInside(abs)) return;
  if (emptiesOnPrune(abs)) return;
  heldDirs.push(op.path);
  ops.delete(key);
  stats.conflicts.push(op.path + ' (a directory of yours is in the way; kept the previous install\'s copy so the skill still works)');
});
function held(e) { return !e.abs && e.type !== 'mcp-server' && heldDirs.some(function(d) { return within(d, e.path); }); }

// ── Prune: entries a previous install wrote in these groups that this install no longer writes ──
(prev.entries || []).forEach(function(e) {
  if (!groups.has(e.group) || ops.has(keyOf(e)) || held(e)) return;
  // A ccc link from an earlier CCC_BIN_DIR may serve another profile, so it is never pruned, only named (Codex #298).
  if (e.abs && e.type === 'symlink' && path.basename(e.abs) === 'ccc') {
    stats.conflicts.push(e.abs + ' (the previous ccc command; kept in case another profile uses it)');
    return;
  }
  if (!inRoot(e)) { stats.conflicts.push(e.path + ' (its parent now resolves outside the config dir; left alone)'); return; }
  var r = removeOwned(e);
  if (r === 'no-backup') { stats.conflicts.push(e.path + ' (its recorded backup ' + e.backup + ' is missing; kept as is)'); return; }
  if (r === 'kept') stats.keptModified++;
  else if (r !== 'missing') stats.pruned++;
  if (r === 'restored') stats.restored++;
});
removeEmptyDirs();

// ── Apply ──
var entries = (prev.entries || []).filter(function(e) { return (!groups.has(e.group) || held(e)) && inRoot(e); });
ops.forEach(function(op) {
  var pe = prevByKey.get(keyOf(op));
  var entry = { group: op.group, type: op.type };
  if (op.abs) entry.abs = op.abs; else if (op.path) entry.path = op.path;
  var carried = pe && pe.backup ? pe.backup : undefined;

  if (op.type === 'mcp-server') {
    var d;
    try { d = JSON.parse(fs.readFileSync(op.file, 'utf8')); } catch (_e) { stats.conflicts.push(op.file + ' (not valid JSON; MCP server not added)'); return; }
    entry.file = op.file; entry.name = op.name; entry.value = op.value;
    var has = d.mcpServers && Object.prototype.hasOwnProperty.call(d.mcpServers, op.name);
    if (has) {
      if (pe && owned(pe)) { entries.push(pe); stats.unchanged++; } // ours from before; otherwise the user's, not recorded
      return;
    }
    backup(entry);
    d.mcpServers = d.mcpServers || {};
    d.mcpServers[op.name] = op.value;
    writeAtomic(op.file, JSON.stringify(d, null, 2) + '\n', fs.statSync(op.file).mode & 0o777);
    entries.push(entry); stats.written++;
    return;
  }

  var abs = absOf(op);
  var label = op.abs || op.path;
  // Check the parent chain before reading, adopting or recording anything (audit #01).
  if (!op.abs && !parentsInside(abs)) { stats.conflicts.push(label + ' (a parent is a symlink or file; left alone)'); return; }
  var st = lst(abs);
  // A matching entry is recorded only when the previous install owned it. An identical file that was already
  // there is the user's (or a shared copy); it is left in place and not recorded, so uninstall never deletes it.
  var priorOwned = !!(pe && pe.type === op.type);
  if (op.type === 'file') {
    var buf = op.content || fs.readFileSync(op.src);
    entry.sha = sha(buf);
    if (st && st.isFile() && sha(fs.readFileSync(abs)) === entry.sha) {
      if (!priorOwned) { stats.notAdopted++; return; }
      if (carried) entry.backup = carried;
      entries.push(entry); stats.unchanged++;
      return;
    }
  } else {
    entry.target = op.target;
    if (st && st.isSymbolicLink() && fs.readlinkSync(abs) === op.target) {
      // A link into this checkout is unambiguously CC Commander's, even from an install that predates the manifest.
      var intoSource = false;
      try { intoSource = within(fs.realpathSync(srcRoot), fs.realpathSync(abs)); } catch (_e) { intoSource = false; }
      // The global ccc link is shared by every profile: adopt it only when this profile's manifest already owned it,
      // so uninstalling a second profile never removes the command the first one installed (Codex #298).
      if (!priorOwned && (op.abs || !intoSource)) { stats.notAdopted++; return; }
      if (carried) entry.backup = carried;
      entries.push(entry); stats.unchanged++;
      return;
    }
  }
  if (st && st.isDirectory()) { stats.conflicts.push(label + ' (a directory of yours is in the way; left alone)'); return; }
  if (op.abs && st && !(pe && owned(pe))) {
    var t = st.isSymbolicLink() ? fs.readlinkSync(abs) : '';
    if (!/(^|\/)bin\/ccc\.js$/.test(t)) { stats.conflicts.push(label + ' (exists and is not CC Commander\'s; left alone)'); return; }
  }
  if (op.abs) fs.mkdirSync(path.dirname(abs), { recursive: true });
  else if (!ensureParents(abs)) { stats.conflicts.push(label + ' (a parent is a symlink or file; left alone)'); return; }
  if (st) {
    if (pe && owned(pe)) { if (carried) entry.backup = carried; }
    else if (!op.abs && !replaceExisting) {
      // A file of the user's (or a kit file the user edited) is kept; the previous record, if any, carries forward.
      stats.keptExisting.push(label);
      if (pe) entries.push(pe);
      return;
    }
    else { entry.backup = backup(entry); stats.replaced++; }
    fs.unlinkSync(abs);
  }
  if (op.type === 'file') writeAtomic(abs, op.content || fs.readFileSync(op.src), op.mode);
  else fs.symlinkSync(op.target, abs);
  entries.push(entry); stats.written++;
});
removeEmptyDirs();

var now = new Date().toISOString();
var backups = (prev.backups || []).slice();
if (backupUsed && backups.indexOf(backupDir) === -1) backups.push(backupDir);
var manifest = {
  schema: 1,
  tool: 'cc-commander',
  version: version,
  source: srcRoot,
  claude_dir: ROOT,
  tier: groups.has('skills') ? tier : (prev.tier || null),
  installed_at: prev.installed_at || now,
  updated_at: now,
  backups: backups,
  dirs: Array.from(dirs).sort(),
  entries: entries.map(function(e) { var o = Object.assign({}, e); delete o.src; delete o.content; delete o.mode; return o; })
    .sort(function(x, y) { return keyOf(x) < keyOf(y) ? -1 : keyOf(x) > keyOf(y) ? 1 : 0; }),
};
fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
homeErr = manifestHome(manifestPath, ROOT, REAL_ROOT);
if (homeErr) { console.error('  ✗ ' + homeErr + '; the manifest was not written.'); process.exit(1); }
writeAtomic(manifestPath, JSON.stringify(manifest, null, 2) + '\n', 0o644);

console.log('  ✓ ' + stats.written + ' written, ' + stats.unchanged + ' unchanged, ' + stats.replaced + ' replaced (backed up)' +
  (stats.pruned ? ', ' + stats.pruned + ' removed from the previous install' : '') +
  (stats.restored ? ' (' + stats.restored + ' of your originals restored)' : ''));
if (stats.notAdopted) console.log('  · ' + stats.notAdopted + ' identical file(s) already present were left as yours (not recorded for uninstall)');
if (stats.keptModified) console.log('  · ' + stats.keptModified + ' file(s) from the previous install were changed by you and kept');
if (stats.keptExisting.length) {
  console.log('  · ' + stats.keptExisting.length + ' existing file(s) of yours kept in place of CC Commander\'s (re-run with --replace-existing to back them up and replace them):');
  stats.keptExisting.slice(0, 10).forEach(function(k) { console.log('      ' + k); });
  if (stats.keptExisting.length > 10) console.log('      … and ' + (stats.keptExisting.length - 10) + ' more');
}
if (stats.conflicts.length) {
  console.log('  ! ' + stats.conflicts.length + ' entr' + (stats.conflicts.length === 1 ? 'y' : 'ies') + ' skipped:');
  stats.conflicts.slice(0, 10).forEach(function(c) { console.log('      ' + c); });
}
console.log('  ✓ Manifest: ' + manifestPath);
APPLY

if should_install "skills"; then
  skill_count=$(find -L "$CLAUDE_DIR/skills" -mindepth 1 -maxdepth 1 -type d 2>/dev/null | wc -l | tr -d ' ')
  cc_status_line "✓" "$skill_count skills installed (tier: $tier)"
fi
if should_install "commands"; then
  cmd_count=$(find "$CLAUDE_DIR/commands" -name '*.md' | wc -l | tr -d ' ')
  cc_status_line "✓" "$cmd_count commands installed"
fi
should_install "hooks" && cc_status_line "✓" "Hooks installed (standalone mode)"
should_install "lib" && cc_status_line "✓" "Terminal art library installed"
should_install "templates" && cc_status_line "✓" "Starter templates installed"
should_install "docs" && cc_status_line "✓" "BIBLE.md + CHEATSHEET.md + SKILLS-INDEX.md"
CCC_INSTALLED=""
if [ -L "$ccc_bin_dir/ccc" ] && [ "$(readlink "$ccc_bin_dir/ccc")" = "$CCC_BIN" ]; then
  CCC_INSTALLED="$ccc_bin_dir/ccc"
  cc_status_line "✓" "Linked ccc → $CCC_INSTALLED"
  case ":${PATH}:" in
    *":$ccc_bin_dir:"*) ;;
    *) echo -e "  ${M_AMBER}Add to your shell profile:${NC} ${M_WHITE}export PATH=\"$ccc_bin_dir:\$PATH\"${NC}" ;;
  esac
else
  cc_status_line "!" "ccc was not linked — run: ln -s \"$CCC_BIN\" /usr/local/bin/ccc"
fi

# 8. Config files (not recorded in the manifest: uninstall always keeps CLAUDE.md and settings.json)
if should_install "claude-md" || should_install "settings"; then
  if should_install "claude-md" && [ -f "$SCRIPT_DIR/CLAUDE.md.template" ]; then
    if [ ! -f "$CLAUDE_DIR/CLAUDE.md" ]; then
      SAFE_NAME=$(printf '%s\n' "$USER_NAME" | sed 's/[&/\]/\\&/g')
      sed "s/\[Your Name\]/$SAFE_NAME/g" "$SCRIPT_DIR/CLAUDE.md.template" > "$CLAUDE_DIR/CLAUDE.md"
      cc_status_line "✓" "CLAUDE.md created"
    else
      cc_status_line "·" "CLAUDE.md preserved (existing config kept)"
    fi
  fi
  if should_install "settings"; then
    if [ ! -f "$CLAUDE_DIR/settings.json" ] && [ -f "$SCRIPT_DIR/settings.json.template" ]; then
      # Render hook paths for this config dir, as the hooks config is: "$HOME/.claude/hooks/x.js" -> "<config dir>/hooks/x.js".
      # A guard hook is registered only when this install wrote it and it verifies: the manifest records it with the
      # shipped content hash, the installed file has that hash, and hooks/ is a real directory inside the config dir.
      # A pre-existing guard the installer declined to manage, one under a symlinked hooks/, or a guard whose
      # component was not selected (--mode=config) is reported and left inactive (Codex #302).
      # The registered guards stay wrapped in `if [ -f … ]`, so they block (exit 2) and become no-ops after uninstall.
      settings_out="$(node - "$SCRIPT_DIR/settings.json.template" "$CLAUDE_DIR" "$MANIFEST" "$SCRIPT_DIR" <<'SETTINGS'
'use strict';
var fs = require('fs'), path = require('path'), nodeCrypto = require('crypto');
var src = process.argv[2], root = path.resolve(process.argv[3]), manifestPath = process.argv[4], srcRoot = process.argv[5];
var hooksDir = path.join(root, 'hooks').replace(/[\\"$`]/g, '\\$&');
var sha = function(buf) { return nodeCrypto.createHash('sha256').update(buf).digest('hex'); };
var manifest = null;
try { manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')); } catch (_e) { manifest = null; }
function guardProblem(name) {
  var rel = 'hooks/' + name + '.js';
  var shipped; try { shipped = sha(fs.readFileSync(path.join(srcRoot, rel))); } catch (_e) { return 'not shipped in this checkout'; }
  var rec = manifest && (manifest.entries || []).find(function(e) { return e.type === 'file' && e.path === rel; });
  if (!rec) return 'not written by this install (an existing file, a skipped hooks/ dir, or the hooks component was not selected)';
  if (rec.sha !== shipped) return 'the recorded copy is not the shipped version';
  var dir = path.join(root, 'hooks'), st;
  try { st = fs.lstatSync(dir); } catch (_e) { return 'hooks/ is missing'; }
  if (st.isSymbolicLink() || !st.isDirectory()) return 'hooks/ is a symlink or not a directory';
  try { if (fs.realpathSync(dir) !== path.join(fs.realpathSync(root), 'hooks')) return 'hooks/ resolves outside the config dir'; } catch (_e) { return 'hooks/ cannot be resolved'; }
  var file = path.join(dir, name + '.js'), fst;
  try { fst = fs.lstatSync(file); } catch (_e) { return rel + ' is missing'; }
  if (!fst.isFile()) return rel + ' is not a regular file';
  if (sha(fs.readFileSync(file)) !== shipped) return rel + ' differs from the shipped version';
  return null;
}
var cfg = JSON.parse(fs.readFileSync(src, 'utf8'));
var registered = [], inactive = [];
Object.keys(cfg.hooks || {}).forEach(function(ev) {
  cfg.hooks[ev] = (cfg.hooks[ev] || []).map(function(m) {
    m.hooks = (m.hooks || []).filter(function(h) {
      if (typeof h.command !== 'string') return true;
      var g = /\$HOME\/\.claude\/hooks\/([\w-]+)\.js/.exec(h.command);
      if (g) {
        var why = guardProblem(g[1]);
        if (why) { inactive.push(g[1] + ': ' + why); return false; }
        registered.push(g[1]);
      }
      h.command = h.command.split('$HOME/.claude/hooks/').join(hooksDir + '/');
      return true;
    });
    return m;
  }).filter(function(m) { return m.hooks.length > 0; });
  if (!cfg.hooks[ev].length) delete cfg.hooks[ev];
});
// The status line script lives in this config dir's lib/, like the hooks.
if (cfg.statusLine && typeof cfg.statusLine.command === 'string') {
  cfg.statusLine.command = cfg.statusLine.command.split('$HOME/.claude/lib/').join(path.join(root, 'lib').replace(/[\\"$`]/g, '\\$&') + '/');
}
var dst = path.join(root, 'settings.json');
var tmp = path.join(root, '.settings.json.ccc-tmp-' + process.pid);
fs.writeFileSync(tmp, JSON.stringify(cfg, null, 2) + '\n', { mode: 0o644, flag: 'wx' });
fs.renameSync(tmp, dst);
process.stdout.write('registered\t' + Array.from(new Set(registered)).join(', ') + '\n');
inactive.forEach(function(i) { process.stdout.write('inactive\t' + i + '\n'); });
SETTINGS
)" || { cc_status_line "✗" "settings.json could not be written" "$M_RED"; exit 1; }
      guards_registered="$(printf '%s\n' "$settings_out" | awk -F'\t' '$1=="registered"{print $2}')"
      if [ -n "$guards_registered" ]; then
        cc_status_line "✓" "settings.json created (new install; registered: $guards_registered)"
      else
        cc_status_line "✓" "settings.json created (new install; no guard hooks registered)"
      fi
      printf '%s\n' "$settings_out" | awk -F'\t' '$1=="inactive"{print $2}' | while IFS= read -r line; do
        [ -n "$line" ] && cc_status_line "!" "Guard hook left inactive — $line"
      done
    else
      cc_status_line "·" "settings.json preserved (existing config kept)"
      cc_status_line "·" "Guard hooks are not added to an existing settings.json; to register careful-guard and confidence-gate, copy the PreToolUse entry from $SCRIPT_DIR/settings.json.template"
    fi
    # Deduplicate extraKnownMarketplaces: remove stale ccc-marketplace and
    # commander-marketplace entries (both point at the same repo as commander-hub
    # but in different source-object forms; Claude Code's reconciler treats them
    # as distinct and re-clones into temp_<timestamp> dirs on every session start).
    # Ensure only the canonical commander-hub (git-form) entry is present.
    if [ -f "$CLAUDE_DIR/settings.json" ] && command -v python3 &>/dev/null; then
      dedup_exit=0
      dedup_out=$(python3 - "$CLAUDE_DIR/settings.json" "$BACKUP_DIR" <<'DEDUP'
import json, os, shutil, sys, tempfile

p = sys.argv[1]   # the lane's settings.json (CLAUDE_CONFIG_DIR aware), not a hard-coded ~/.claude
backup_dir = sys.argv[2]
try:
    with open(p) as f:
        d = json.load(f)
except (OSError, json.JSONDecodeError) as e:
    # Unreadable or malformed: a distinct outcome (exit 3), never reported as deduplicated or clean
    print('settings.json could not be read (%s); dedup skipped' % e.__class__.__name__)
    sys.exit(3)

ekm = d.get('extraKnownMarketplaces')
if not isinstance(ekm, dict):
    sys.exit(0)

stale = ['ccc-marketplace', 'commander-marketplace']
removed = [k for k in stale if k in ekm]
if not removed:
    sys.exit(0)  # nothing to do is success; no output means no status line

for k in removed:
    del ekm[k]

# Ensure the canonical entry is present (git-form, lowercase url)
if 'commander-hub' not in ekm:
    ekm['commander-hub'] = {
        'source': {
            'source': 'git',
            'url': 'https://github.com/kevinzai/commander.git',
        }
    }

d['extraKnownMarketplaces'] = ekm

# Back up the original before changing it
os.makedirs(backup_dir, exist_ok=True)
if not os.path.exists(os.path.join(backup_dir, 'settings.json')):
    shutil.copy2(p, os.path.join(backup_dir, 'settings.json'))

# Atomic write
dir_ = os.path.dirname(p)
fd, tmp = tempfile.mkstemp(prefix='.settings-', suffix='.json.tmp', dir=dir_)
try:
    with os.fdopen(fd, 'w') as f:
        json.dump(d, f, indent=2)
    os.replace(tmp, p)
except Exception:
    try:
        os.unlink(tmp)
    except OSError:
        pass
    raise

print('deduped extraKnownMarketplaces: removed ' + ', '.join(removed))
DEDUP
      ) || dedup_exit=$?
      # Outcomes: 0 with output = changed, 0 without = nothing to do, 3 = unreadable (skipped), other = failed
      if [ $dedup_exit -eq 3 ]; then
        cc_status_line "!" "extraKnownMarketplaces dedup skipped: ${dedup_out}"
      elif [ $dedup_exit -ne 0 ]; then
        cc_status_line "!" "extraKnownMarketplaces dedup failed (settings.json left as is)"
      elif [ -n "$dedup_out" ]; then
        cc_status_line "✓" "extraKnownMarketplaces deduplicated"
      fi
    fi
  fi
  cc_status_line "✓" "Config applied for $USER_NAME"

  # Validate JSON
  if [ -f "$CLAUDE_DIR/settings.json" ]; then
    if python3 -c "import json, sys; json.load(open(sys.argv[1]))" "$CLAUDE_DIR/settings.json" 2>/dev/null; then
      cc_status_line "✓" "settings.json validated"
    else
      cc_status_line "✗" "settings.json has syntax errors — check manually"
    fi
  fi
fi

if [ -d "$BACKUP_DIR" ]; then
  cc_status_line "✓" "Replaced files backed up to: ${M_WHITE}${BACKUP_DIR}${NC}"
  echo -e "  ${M_DIM}Restore command:${NC} ${M_CYAN}cp -R \"${BACKUP_DIR}/.\" \"${CLAUDE_DIR}/\"${NC}"
else
  BACKUP_DIR=""
fi
echo ""

# ── Dashboard ───────────────────────────────────────────────────────────────

if should_install "dashboard"; then
  if [ -d "$SCRIPT_DIR/dashboard" ]; then
    cc_section_header "DASHBOARD"
    cc_status_line "►" "Dashboard available at: ${M_WHITE}${SCRIPT_DIR}/dashboard${NC}"
  fi
fi

# ── CC Commander Summary ────────────────────────────────────────────────────────────

cc_section_header "THE KEVIN Z METHOD"
cc_bible_summary

# ── Mega-Skills Overview ─────────────────────────────────────────────────────

cc_mega_skills_display
echo ""

# ── Installation Summary ─────────────────────────────────────────────────────

cc_section_header "INSTALLATION COMPLETE"

echo -e "  ${M_WHITE}User:${NC}       ${M_BRIGHT}$USER_NAME${NC}"
echo -e "  ${M_WHITE}Mode:${NC}       ${M_BRIGHT}$INSTALL_MODE${NC}"
[ -n "${skill_count:-}" ] && echo -e "  ${M_WHITE}Skills:${NC}     ${M_BRIGHT}$skill_count${NC} ${M_DIM}(including 6 Mega-Skills)${NC}"
[ -n "${cmd_count:-}" ] && echo -e "  ${M_WHITE}Commands:${NC}   ${M_BRIGHT}$cmd_count${NC}"
[ -n "${CCC_INSTALLED:-}" ] && echo -e "  ${M_WHITE}ccc:${NC}        ${M_BRIGHT}${CCC_INSTALLED}${NC}"
echo ""
echo -e "  ${M_WHITE}Launch:${NC}"
echo -e "    ${M_BRIGHT}ccc${NC}           ${M_DIM}Full interactive mode (arrow-key menus, cockpit)${NC}"
echo -e "    ${M_BRIGHT}ccc --split${NC}   ${M_DIM}Tmux split: CCC menu + Claude Code side by side${NC}"
echo -e "    ${M_BRIGHT}ccc --test${NC}    ${M_DIM}Verify installation${NC}"
echo -e "  ${M_DIM}Note: ccc --split requires tmux (brew install tmux)${NC}"
echo ""

if [ -n "$BACKUP_DIR" ]; then
  echo -e "  ${M_AMBER}Replaced files backed up:${NC} ${M_DIM}${BACKUP_DIR}${NC}"
  echo -e "  ${M_DIM}Restore: cp -R \"${BACKUP_DIR}/.\" \"${CLAUDE_DIR}/\"${NC}"
  echo ""
fi

# ── Next Steps ───────────────────────────────────────────────────────────────

cc_next_steps

# ── Farewell ─────────────────────────────────────────────────────────────────

cc_farewell
