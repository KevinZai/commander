#!/usr/bin/env bash
# CC Commander — Source Diagnostic
#
# READ-ONLY. Finds every location on this machine that could be serving the
# /ccc slash command or shipping a `ccc` CLI. Prints version stamps from
# each so we can see which one is stale.
#
# Use when:
#   - `/ccc` in Claude Code/Cowork shows the wrong version (e.g. v1.0.0 instead
#     of the current v4.0.0-beta.x).
#   - You're not sure whether the plugin or a legacy CLI install is winning.
#
# This script does NOT modify anything. It only reads files and prints
# findings. To clean up what it finds, run scripts/reset-commander-install.sh
# (with the --full flag for legacy-CLI cleanup).

set -uo pipefail

BOLD=$(tput bold 2>/dev/null || echo "")
RESET=$(tput sgr0 2>/dev/null || echo "")
GREEN=$(tput setaf 2 2>/dev/null || echo "")
YELLOW=$(tput setaf 3 2>/dev/null || echo "")
RED=$(tput setaf 1 2>/dev/null || echo "")
BLUE=$(tput setaf 4 2>/dev/null || echo "")
GREY=$(tput setaf 8 2>/dev/null || echo "")

hdr()   { echo ""; echo "${BOLD}${BLUE}── $* ──${RESET}"; }
found() { echo "  ${BOLD}${GREEN}✔${RESET} $*"; }
warn()  { echo "  ${BOLD}${YELLOW}⚠${RESET}  $*"; }
note()  { echo "  ${GREY}·${RESET}  $*"; }
miss()  { echo "  ${GREY}—${RESET}  $*"; }

CLAUDE_DIR="${HOME}/.claude"
FINDINGS=0
LEGACY=0

# Extract version from a JSON file (package.json or plugin.json)
read_version() {
  local file="$1"
  [[ -f "$file" ]] || { echo ""; return; }
  node -e "try{console.log(JSON.parse(require('fs').readFileSync('$file','utf8')).version||'')}catch(e){}" 2>/dev/null || echo ""
}

echo "${BOLD}CC Commander — Source Diagnostic${RESET}"
echo "${GREY}Host: $(hostname)  ·  Date: $(date '+%Y-%m-%d %H:%M:%S')${RESET}"

# ────────────────────────────────────────────────────────────
hdr "1. Plugin installation (~/.claude/plugins/)"

if [[ ! -d "$CLAUDE_DIR/plugins" ]]; then
  miss "No plugin directory — Claude Code/Cowork has not been run, or plugins disabled."
else
  # Known marketplaces
  km="$CLAUDE_DIR/plugins/known_marketplaces.json"
  if [[ -f "$km" ]]; then
    mks=$(node -e "try{const d=require('$km');console.log(Object.keys(d).join(' '))}catch(e){}" 2>/dev/null)
    if [[ -n "$mks" ]]; then
      found "Marketplaces registered: $mks"
    else
      miss "known_marketplaces.json exists but is empty."
    fi
  fi

  # Installed plugins
  ip="$CLAUDE_DIR/plugins/installed_plugins.json"
  if [[ -f "$ip" ]]; then
    slugs=$(node -e "
    try{
      const d=require('$ip');
      const p=d.plugins||d;
      console.log(Object.keys(p).filter(k=>k.toLowerCase().includes('commander')||k.toLowerCase().includes('ccc')).join(' '));
    }catch(e){}" 2>/dev/null)
    if [[ -n "$slugs" ]]; then
      found "Commander-related plugins installed: $slugs"
      FINDINGS=$((FINDINGS + 1))
    else
      miss "No commander-related plugins in installed_plugins.json"
    fi
  fi

  # Plugin cache — where /ccc SHOULD come from
  for cache_dir in "$CLAUDE_DIR/plugins/cache"/*; do
    [[ -d "$cache_dir" ]] || continue
    for sub in "$cache_dir"/*; do
      [[ -d "$sub" ]] || continue
      for ver_dir in "$sub"/*; do
        [[ -d "$ver_dir" ]] || continue
        pj="$ver_dir/.claude-plugin/plugin.json"
        if [[ -f "$pj" ]]; then
          name=$(node -e "try{console.log(require('$pj').name||'')}catch(e){}" 2>/dev/null)
          if [[ "$name" == "commander" || "$name" == "ccc" ]]; then
            v=$(read_version "$pj")
            found "Plugin cache: $ver_dir  ${BOLD}(v$v)${RESET}"
            FINDINGS=$((FINDINGS + 1))
          fi
        fi
      done
    done
  done
fi

# ────────────────────────────────────────────────────────────
hdr "2. User-level slash commands (~/.claude/commands/)"

if [[ -d "$CLAUDE_DIR/commands" ]]; then
  # Search for anything that could match /ccc
  for f in "$CLAUDE_DIR/commands"/ccc*.md "$CLAUDE_DIR/commands"/commander*.md; do
    [[ -f "$f" ]] || continue
    warn "LEGACY user command: $f"
    LEGACY=$((LEGACY + 1))
    # Try to pull a version hint from inside
    v=$(grep -oE 'v?[0-9]+\.[0-9]+\.[0-9]+(-[a-z0-9.]+)?' "$f" 2>/dev/null | head -1)
    [[ -n "$v" ]] && note "   version hint inside: $v"
  done
  if [[ $LEGACY -eq 0 ]]; then
    miss "No ccc* or commander* user commands."
  fi
else
  miss "No ~/.claude/commands/ directory."
fi

# ────────────────────────────────────────────────────────────
hdr "3. User-level skills (~/.claude/skills/)"

if [[ -d "$CLAUDE_DIR/skills" ]]; then
  # A LEGACY standalone /ccc skill would be named exactly "ccc" (no dash).
  # Domain skills (ccc-design, ccc-marketing, etc.) are legitimate and NOT legacy.
  LEGACY_SKILL="$CLAUDE_DIR/skills/ccc"
  if [[ -d "$LEGACY_SKILL" ]]; then
    warn "LEGACY skill dir: $LEGACY_SKILL"
    LEGACY=$((LEGACY + 1))
    if [[ -f "$LEGACY_SKILL/SKILL.md" ]]; then
      v=$(grep -oE 'v?[0-9]+\.[0-9]+\.[0-9]+(-[a-z0-9.]+)?' "$LEGACY_SKILL/SKILL.md" 2>/dev/null | head -1)
      [[ -n "$v" ]] && note "   version hint inside: $v"
    fi
  else
    miss "No ~/.claude/skills/ccc/ (legacy standalone skill would live here)."
  fi

  # Also check for commander/ as a top-level skill
  COMMANDER_SKILL="$CLAUDE_DIR/skills/commander"
  if [[ -d "$COMMANDER_SKILL" ]]; then
    warn "LEGACY skill dir: $COMMANDER_SKILL"
    LEGACY=$((LEGACY + 1))
  fi

  # Count legitimate domain skills (ccc-*) — informational only, NOT legacy
  DOMAINS=0
  for d in "$CLAUDE_DIR/skills"/ccc-*; do
    [[ -d "$d" ]] && DOMAINS=$((DOMAINS + 1))
  done
  [[ $DOMAINS -gt 0 ]] && note "$DOMAINS CCC domain skills present (ccc-*) — these are legitimate, NOT legacy."
else
  miss "No ~/.claude/skills/ directory."
fi

# ────────────────────────────────────────────────────────────
hdr "4. CLI state (~/.claude/commander/)"

STATE="$CLAUDE_DIR/commander"
if [[ -d "$STATE" ]]; then
  warn "CLI state dir present: $STATE"
  LEGACY=$((LEGACY + 1))
  # Look for embedded version strings
  for f in "$STATE/package.json" "$STATE/state.json" "$STATE/branding.json"; do
    if [[ -f "$f" ]]; then
      v=$(read_version "$f")
      [[ -n "$v" ]] && note "   $f reports v$v"
    fi
  done
  note "   size: $(du -sh "$STATE" 2>/dev/null | awk '{print $1}')"
else
  miss "No ~/.claude/commander/ state dir."
fi

# ────────────────────────────────────────────────────────────
hdr "5. Global CLI binary (ccc on PATH)"

if command -v ccc >/dev/null 2>&1; then
  CCC_PATH=$(command -v ccc)
  warn "LEGACY binary: $CCC_PATH"
  LEGACY=$((LEGACY + 1))
  # Resolve symlinks
  REAL=$(readlink "$CCC_PATH" 2>/dev/null || echo "$CCC_PATH")
  note "   resolves to: $REAL"
  # Try to invoke with --version (may print junk so cap output)
  v=$(ccc --version 2>/dev/null | head -1 || echo "")
  [[ -n "$v" ]] && note "   ccc --version → $v"
else
  miss "No 'ccc' binary on PATH."
fi

# npm global package
if command -v npm >/dev/null 2>&1; then
  npm_entry=$(npm ls -g cc-commander --depth=0 2>/dev/null | grep 'cc-commander@' || echo "")
  if [[ -n "$npm_entry" ]]; then
    warn "LEGACY npm-global package: $npm_entry"
    LEGACY=$((LEGACY + 1))
    note "   uninstall with: npm uninstall -g cc-commander"
  else
    miss "No cc-commander in npm global."
  fi
fi

# ────────────────────────────────────────────────────────────
hdr "6. Other install trails"

# install-remote.sh leaves a log sometimes
for trail in "$HOME/.cc-commander" "$HOME/.ccc" "$HOME/.config/cc-commander" "/usr/local/lib/node_modules/cc-commander"; do
  if [[ -e "$trail" ]]; then
    warn "LEGACY trail: $trail"
    LEGACY=$((LEGACY + 1))
  fi
done

# Claude Desktop config that references a local MCP pointing at old code
DESKTOP_CFG="$HOME/Library/Application Support/Claude-3p/claude_desktop_config.json"
if [[ -f "$DESKTOP_CFG" ]]; then
  ref=$(grep -cE 'cc-commander|ccc-mcp|commander' "$DESKTOP_CFG" 2>/dev/null || true)
  if [[ "$ref" -gt 0 ]]; then
    note "Claude Desktop config mentions commander — $ref reference(s): $DESKTOP_CFG"
  fi
fi

# ────────────────────────────────────────────────────────────
hdr "Summary"

if [[ $LEGACY -eq 0 && $FINDINGS -gt 0 ]]; then
  echo "  ${BOLD}${GREEN}✅ Clean.${RESET} Only the plugin source is present. /ccc should serve the plugin version."
elif [[ $LEGACY -gt 0 ]]; then
  echo "  ${BOLD}${RED}⚠️  $LEGACY legacy source(s) detected.${RESET}"
  echo "  These are most likely serving /ccc with stale version data."
  echo ""
  echo "  To clean them up:"
  echo "    ${BOLD}bash scripts/reset-commander-install.sh --full${RESET}"
  echo ""
  echo "  Or preview what --full would remove without touching anything:"
  echo "    ${BOLD}bash scripts/reset-commander-install.sh --full --dry-run${RESET}"
elif [[ $FINDINGS -eq 0 ]]; then
  echo "  ${BOLD}${YELLOW}⚠️  No commander plugin or CLI found on this machine.${RESET}"
  echo "  Install the plugin:"
  echo "    /plugin marketplace add KevinZai/commander"
  echo "    /plugin install commander"
fi

echo ""
exit 0
