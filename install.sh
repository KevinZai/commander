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
# For remote install:
#   git clone https://github.com/KevinZai/commander.git && cd commander && ./install.sh
# ============================================================================

set -euo pipefail

VERSION="$(grep '"version"' package.json | head -1 | sed 's/.*"version": *"\([^"]*\)".*/\1/')"
CLAUDE_DIR="$HOME/.claude"
[[ -n "${CLAUDE_DIR:-}" && "$CLAUDE_DIR" != "/" && "$CLAUDE_DIR" != "$HOME" ]] || { echo "ERROR: Invalid CLAUDE_DIR ($CLAUDE_DIR)"; exit 1; }
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
USER_NAME=""
DRY_RUN=false
VERIFY_ONLY=false
FORCE=false
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
    --mode=*)   INSTALL_MODE="${1#*=}"; shift ;;
    --skills=*) SKILLS_TIER="${1#*=}"; shift ;;
    --help|-h)
      cc_mini_banner
      echo "Usage: ./install.sh [flags]"
      echo ""
      echo "  --dry-run          Preview what would be installed"
      echo "  --verify           Validate an existing installation"
      echo "  --force            Skip confirmation prompts"
      echo "  --mode=MODE        Install mode: full|essentials|scripts|dashboard|config"
      echo "  --skills=TIER      Skill tier: essential (default), recommended, full, custom"
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
    ((errors++))
  fi

  # Check CLAUDE.md
  if [ -f "$CLAUDE_DIR/CLAUDE.md" ]; then
    cc_status_line "✓" "CLAUDE.md exists"
  else
    cc_status_line "✗" "CLAUDE.md missing"
    ((errors++))
  fi

  # Check settings.json
  if [ -f "$CLAUDE_DIR/settings.json" ]; then
    if python3 -c "import json; json.load(open('$CLAUDE_DIR/settings.json'))" 2>/dev/null; then
      cc_status_line "✓" "settings.json valid JSON"
    else
      cc_status_line "✗" "settings.json invalid JSON"
      ((errors++))
    fi
  else
    cc_status_line "✗" "settings.json missing"
    ((errors++))
  fi

  # Check skills
  if [ -d "$CLAUDE_DIR/skills" ]; then
    skill_count=$(find "$CLAUDE_DIR/skills" -maxdepth 1 -type d | wc -l | tr -d ' ')
    skill_count=$((skill_count - 1))
    cc_status_line "✓" "Skills directory ($skill_count skills)"
  else
    cc_status_line "✗" "Skills directory missing"
    ((errors++))
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
    ((errors++))
  fi

  # Check hooks
  if [ -f "$CLAUDE_DIR/hooks/hooks.json" ]; then
    cc_status_line "✓" "hooks.json exists"
  else
    cc_status_line "!" "hooks.json not found"
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
    cc_status_line "!" "Would backup existing ~/.claude/ first"
  fi

  echo ""
  echo -e "  ${M_AMBER}Run without --dry-run to install.${NC}"
  echo ""
  exit 0
fi

# ── Confirmation ─────────────────────────────────────────────────────────────

if ! $FORCE; then
  echo ""
  if [ -d "$CLAUDE_DIR" ]; then
    echo -e "  ${M_AMBER}This will archive your existing ~/.claude/ setup and replace it.${NC}"
    echo -e "  ${M_DIM}Your old config will be safely backed up with a restore command.${NC}"
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
  read -p "Choose [1-5, default=1]: " mode_choice
  case "$mode_choice" in
    2) INSTALL_MODE="essentials" ;;
    3) INSTALL_MODE="scripts" ;;
    4) INSTALL_MODE="dashboard" ;;
    5) INSTALL_MODE="config" ;;
    *) INSTALL_MODE="full" ;;
  esac
}

should_install() {
  local component="$1"
  case "$INSTALL_MODE" in
    full) return 0 ;;
    essentials) [[ "$component" =~ ^(skills|commands|hooks|claude-md|settings|mega-symlinks|docs)$ ]] ;;
    scripts) [[ "$component" == "lib" ]] ;;
    dashboard) [[ "$component" == "dashboard" ]] ;;
    config) [[ "$component" =~ ^(claude-md|settings)$ ]] ;;
  esac
}

select_install_mode

# ── Backup ───────────────────────────────────────────────────────────────────

if [ -d "$CLAUDE_DIR" ]; then
  cc_section_header "ARCHIVING OLD SETUP"

  BACKUP_DIR="$CLAUDE_DIR.backup.$(date +%Y%m%d%H%M%S)"

  # Inventory of existing setup
  old_skills=0; old_cmds=0; old_hooks=0
  [ -d "$CLAUDE_DIR/skills" ] && old_skills=$(find "$CLAUDE_DIR/skills" -maxdepth 1 -type d 2>/dev/null | wc -l | tr -d ' ') && old_skills=$((old_skills - 1))
  [ -d "$CLAUDE_DIR/commands" ] && old_cmds=$(find "$CLAUDE_DIR/commands" -name '*.md' 2>/dev/null | wc -l | tr -d ' ')
  [ -f "$CLAUDE_DIR/hooks/hooks.json" ] && old_hooks=1

  echo -e "  ${M_DIM}Current setup contains:${NC}"
  [ -f "$CLAUDE_DIR/CLAUDE.md" ] && cc_status_line "·" "CLAUDE.md"
  [ -f "$CLAUDE_DIR/settings.json" ] && cc_status_line "·" "settings.json"
  [ "$old_skills" -gt 0 ] && cc_status_line "·" "$old_skills skills"
  [ "$old_cmds" -gt 0 ] && cc_status_line "·" "$old_cmds commands"
  [ "$old_hooks" -eq 1 ] && cc_status_line "·" "hooks.json"
  echo ""

  cp -r "$CLAUDE_DIR" "$BACKUP_DIR"

  cc_status_line "✓" "Archived to: ${M_WHITE}${BACKUP_DIR}${NC}"
  echo ""
  echo -e "  ${M_DIM}Restore command:${NC}"
  echo -e "  ${M_CYAN}rm -rf ~/.claude && mv ${BACKUP_DIR} ~/.claude${NC}"
fi

# ── OpenClaw Detection ──────────────────────────────────────────────────────

detect_openclaw() {
  if command -v openclaw &>/dev/null || [[ -d "$HOME/.openclaw" ]]; then
    echo "  OpenClaw detected — enabling native integration"
    export CC_OPENCLAW_ENABLED=1
  fi
}

detect_openclaw

# ── Install Claude Code CLI ──────────────────────────────────────────────────

if ! command -v claude &>/dev/null; then
  cc_section_header "CLAUDE CODE CLI"
  echo -e "  ${M_DIM}Claude Code CLI not found. Installing...${NC}"
  npm install -g @anthropic-ai/claude-code
  cc_status_line "✓" "Claude Code CLI installed"
fi

# ── Install npm dependencies (if running from git clone) ────────────────────

if [ -f "$SCRIPT_DIR/package.json" ] && [ ! -d "$SCRIPT_DIR/node_modules" ]; then
  cc_section_header "DEPENDENCIES"
  cc_status_line "►" "Installing npm dependencies..."
  (cd "$SCRIPT_DIR" && npm install --production 2>/dev/null) && cc_status_line "✓" "Dependencies installed" || cc_status_line "!" "npm install failed (ccc may not work — run: cd $SCRIPT_DIR && npm install)"
fi

# ── Install Components ───────────────────────────────────────────────────────

cc_section_header "INSTALLING"

install_step=0
install_total=9

mkdir -p "$CLAUDE_DIR"

# 1. Skills
if should_install "skills"; then
  ((install_step++)) || true
  cc_progress_bar "$install_step" "$install_total" "Skills"

  # Determine skill tier (--force defaults to full for reliability)
  if $FORCE && [ -z "$SKILLS_TIER" ]; then
    tier="full"
  else
    tier="${SKILLS_TIER:-essential}"
  fi
  tiers_file="$SCRIPT_DIR/skills/_tiers.json"

  rm -rf "$CLAUDE_DIR/skills"
  mkdir -p "$CLAUDE_DIR/skills"

  if [[ "$tier" == "full" ]] || [[ ! -f "$tiers_file" ]]; then
    # Full install or no tiers file — copy everything (legacy behavior)
    cp -r "$SCRIPT_DIR/skills/"* "$CLAUDE_DIR/skills/" 2>/dev/null || true
  elif [[ "$tier" == "custom" ]]; then
    # Custom mode — interactive picker (future: for now fall back to essential)
    cc_status_line "!" "Custom skill picker not yet implemented — using essential tier"
    tier="essential"
  fi

  if [[ "$tier" != "full" ]] && [[ -f "$tiers_file" ]] && command -v jq &>/dev/null; then
    # Collect skills from the selected tier and all included tiers
    all_skills=""

    # Get skills for the selected tier
    tier_skills=$(jq -r ".tiers[\"$tier\"].skills[]?" "$tiers_file" 2>/dev/null)
    all_skills="$tier_skills"

    # Get included tiers and their skills
    includes=$(jq -r ".tiers[\"$tier\"].includes[]?" "$tiers_file" 2>/dev/null)
    for inc in $includes; do
      inc_skills=$(jq -r ".tiers[\"$inc\"].skills[]?" "$tiers_file" 2>/dev/null)
      all_skills="$all_skills"$'\n'"$inc_skills"
    done

    # Also add domain skills if tier is recommended or higher
    if [[ "$tier" == "recommended" ]]; then
      domain_skills=$(jq -r '.tiers["domain"].skills[]?' "$tiers_file" 2>/dev/null)
      all_skills="$all_skills"$'\n'"$domain_skills"
    fi

    # Deduplicate and create symlinks
    unique_skills=$(echo "$all_skills" | sort -u | grep -v '^$')
    while IFS= read -r skill; do
      if [[ -d "$SCRIPT_DIR/skills/$skill" ]]; then
        ln -sf "$SCRIPT_DIR/skills/$skill" "$CLAUDE_DIR/skills/$skill"
      fi
    done <<< "$unique_skills"

    # Copy _catalog.md and _tiers.json for reference
    [[ -f "$SCRIPT_DIR/skills/_catalog.md" ]] && cp "$SCRIPT_DIR/skills/_catalog.md" "$CLAUDE_DIR/skills/"
    [[ -f "$tiers_file" ]] && cp "$tiers_file" "$CLAUDE_DIR/skills/"
  fi

  skill_count=$(find "$CLAUDE_DIR/skills" -maxdepth 1 -type d | wc -l | tr -d ' ')
  skill_count=$((skill_count - 1))
  cc_status_line "✓" "$skill_count skills installed (tier: $tier)"
fi

# 1b. context-mode MCP server (tool output sandboxing)
if should_install "skills"; then
  ((install_step++)) || true
  cc_progress_bar "$install_step" "$install_total" "context-mode"

  if command -v context-mode &>/dev/null; then
    cc_status_line "✓" "context-mode already installed"
  else
    if command -v npm &>/dev/null; then
      npm install -g context-mode >/dev/null 2>&1 && cc_status_line "✓" "context-mode installed (tool output sandboxing)" || cc_status_line "!" "context-mode install failed (optional — install manually: npm i -g context-mode)"
    else
      cc_status_line "!" "context-mode skipped (npm not found)"
    fi
  fi

  # Add MCP server to .claude.json if not present
  claude_json="$HOME/.claude.json"
  if [[ -f "$claude_json" ]]; then
    if ! grep -q '"context-mode"' "$claude_json" 2>/dev/null; then
      node -e "
        var fs = require('fs');
        var p = process.argv[1];
        try {
          var d = JSON.parse(fs.readFileSync(p, 'utf8'));
          if (!d.mcpServers) d.mcpServers = {};
          if (!d.mcpServers['context-mode']) {
            d.mcpServers['context-mode'] = { type: 'stdio', command: 'context-mode' };
            fs.writeFileSync(p, JSON.stringify(d, null, 2));
          }
        } catch(e) {}
      " -- "$claude_json" 2>/dev/null && cc_status_line "✓" "context-mode MCP server configured" || true
    fi
  fi
fi

# 2. Commands
if should_install "commands"; then
  ((install_step++)) || true
  cc_progress_bar "$install_step" "$install_total" "Commands"
  rm -rf "$CLAUDE_DIR/commands"
  cp -r "$SCRIPT_DIR/commands/" "$CLAUDE_DIR/commands/"
  cmd_count=$(find "$CLAUDE_DIR/commands" -name '*.md' | wc -l | tr -d ' ')
  cc_status_line "✓" "$cmd_count commands installed"
fi

# 3. Hooks
if should_install "hooks"; then
  ((install_step++)) || true
  cc_progress_bar "$install_step" "$install_total" "Hooks"
  rm -rf "$CLAUDE_DIR/hooks"
  mkdir -p "$CLAUDE_DIR/hooks"
  # Copy hook scripts
  find "$SCRIPT_DIR/hooks/" -name '*.js' -o -name '*.sh' | while read f; do
    cp "$f" "$CLAUDE_DIR/hooks/" 2>/dev/null || true
  done
  # Use standalone hooks config (doesn't require oh-my-claudecode plugin)
  if [ -f "$SCRIPT_DIR/hooks/hooks-standalone.json" ]; then
    cp "$SCRIPT_DIR/hooks/hooks-standalone.json" "$CLAUDE_DIR/hooks/hooks.json"
  fi
  cc_status_line "✓" "Hooks installed (standalone mode)"
fi

# 4. Lib (terminal art)
if should_install "lib"; then
  ((install_step++)) || true
  cc_progress_bar "$install_step" "$install_total" "Libraries"
  mkdir -p "$CLAUDE_DIR/lib"
  cp -r "$SCRIPT_DIR/lib/"* "$CLAUDE_DIR/lib/" 2>/dev/null || true
  cc_status_line "✓" "Terminal art library installed"
fi

# 5. Templates
if should_install "templates"; then
  ((install_step++)) || true
  cc_progress_bar "$install_step" "$install_total" "Templates"
  mkdir -p "$CLAUDE_DIR/templates"
  cp -r "$SCRIPT_DIR/templates/"* "$CLAUDE_DIR/templates/" 2>/dev/null || true
  cc_status_line "✓" "Starter templates installed"
fi

# 6. Reference docs
if should_install "docs"; then
  ((install_step++)) || true
  cc_progress_bar "$install_step" "$install_total" "Reference docs"
  for doc in BIBLE.md CHEATSHEET.md SKILLS-INDEX.md; do
    if [ -f "$SCRIPT_DIR/$doc" ]; then
      cp "$SCRIPT_DIR/$doc" "$CLAUDE_DIR/$doc"
    fi
  done
  # Stamp version into installed BIBLE
  if [ -f "$CLAUDE_DIR/BIBLE.md" ]; then
    printf '%s\n' "<!-- CC Commander v${VERSION} | Installed $(date +%Y-%m-%d) -->" | cat - "$CLAUDE_DIR/BIBLE.md" > "$CLAUDE_DIR/BIBLE.md.tmp" && mv "$CLAUDE_DIR/BIBLE.md.tmp" "$CLAUDE_DIR/BIBLE.md"
  fi
  cc_status_line "✓" "BIBLE.md + CHEATSHEET.md + SKILLS-INDEX.md"
fi

# 7. Config files
if should_install "claude-md" || should_install "settings"; then
  ((install_step++)) || true
  cc_progress_bar "$install_step" "$install_total" "Configuration"

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
      cp "$SCRIPT_DIR/settings.json.template" "$CLAUDE_DIR/settings.json"
      cc_status_line "✓" "settings.json created (new install)"
    else
      cc_status_line "·" "settings.json preserved (existing config kept)"
    fi
  fi
  cc_status_line "✓" "Config applied for $USER_NAME"

  # Validate JSON
  if [ -f "$CLAUDE_DIR/settings.json" ]; then
    if python3 -c "import json; json.load(open('$CLAUDE_DIR/settings.json'))" 2>/dev/null; then
      cc_status_line "✓" "settings.json validated"
    else
      cc_status_line "✗" "settings.json has syntax errors — check manually"
    fi
  fi
fi

# 8. Symlinks
if should_install "mega-symlinks"; then
  ((install_step++)) || true
  cc_progress_bar "$install_step" "$install_total" "Symlinks"

  symlink_count=0

  create_symlink() {
    local target="$1"
    local link="$2"
    if [ -d "$target" ] && [ ! -e "$link" ]; then
      ln -s "$target" "$link"
      ((symlink_count++))
    fi
  }

  # Mega-SEO symlinks
  for skill in ai-seo aaio seo-optimizer seo-content-brief serp-analyzer backlink-audit search-console site-architecture analytics-conversion analytics-product bulk-page-generator content-strategy blog-engine social-integration guest-blogger; do
    create_symlink "$CLAUDE_DIR/skills/mega-seo/$skill" "$CLAUDE_DIR/skills/$skill"
  done

  # Mega-Design symlinks
  for skill in animate svg-animation motion-design interactive-visuals particle-systems generative-backgrounds canvas-design webgl-shader retro-pixel colorize theme-factory screenshots frontend-design landing-page-builder frontend-slides web-artifacts-builder design-consultation adapt arrange audit bolder clarify critique delight distill extract harden normalize onboard optimize overdrive polish quieter typeset; do
    create_symlink "$CLAUDE_DIR/skills/mega-design/$skill" "$CLAUDE_DIR/skills/$skill"
  done

  # Mega-Testing symlinks
  for skill in e2e-testing webapp-testing tdd-workflow verification-loop verification-before-completion ai-regression-testing eval-harness qa qa-only plankton-code-quality python-testing; do
    create_symlink "$CLAUDE_DIR/skills/mega-testing/$skill" "$CLAUDE_DIR/skills/$skill"
  done

  # Mega-SaaS symlinks
  for skill in api-design backend-patterns database-designer better-auth stripe-subscriptions billing-automation saas-metrics-coach signup-flow-cro paywall-upgrade-cro form-cro nextjs-app-router shadcn-ui drizzle-neon tailwind-v4 fastify-api; do
    create_symlink "$CLAUDE_DIR/skills/mega-saas/$skill" "$CLAUDE_DIR/skills/$skill"
  done

  # Mega-DevOps symlinks
  for skill in docker-development senior-devops github-actions-security github-actions-reusable-workflows aws-solution-architect aws-lambda-best-practices aws-s3-patterns aws-cloudfront-optimization aws-iam-security container-security prometheus-configuration grafana-dashboards promql-alerting infra-runbook network-engineer; do
    create_symlink "$CLAUDE_DIR/skills/mega-devops/$skill" "$CLAUDE_DIR/skills/$skill"
  done

  cc_status_line "✓" "$symlink_count backward-compatibility symlinks"
  echo ""
fi

# ── CCC Command ────────────────────────────────────────────────────────────

cc_section_header "CCC COMMAND"

CCC_BIN="${SCRIPT_DIR}/bin/ccc.js"
chmod +x "$CCC_BIN"
CCC_INSTALLED=""

if ! $DRY_RUN; then
  if [[ -d /usr/local/bin ]] && [[ -w /usr/local/bin ]]; then
    ln -sf "$CCC_BIN" /usr/local/bin/ccc
    CCC_INSTALLED="/usr/local/bin/ccc"
    cc_status_line "✓" "Linked ccc → /usr/local/bin/ccc"
  elif [[ -d "${HOME}/.local/bin" ]] || mkdir -p "${HOME}/.local/bin" 2>/dev/null; then
    ln -sf "$CCC_BIN" "${HOME}/.local/bin/ccc"
    CCC_INSTALLED="${HOME}/.local/bin/ccc"
    cc_status_line "✓" "Linked ccc → ~/.local/bin/ccc"
    if ! echo "${PATH}" | grep -q "${HOME}/.local/bin"; then
      echo -e "  ${M_AMBER}Add to your shell profile:${NC} ${M_WHITE}export PATH=\"\$HOME/.local/bin:\$PATH\"${NC}"
    fi
  else
    cc_status_line "!" "Could not create ccc symlink — run: sudo ln -sf $CCC_BIN /usr/local/bin/ccc"
  fi
else
  cc_status_line "►" "Would link ccc → /usr/local/bin/ccc"
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
[ -n "${symlink_count:-}" ] && echo -e "  ${M_WHITE}Symlinks:${NC}   ${M_BRIGHT}$symlink_count${NC}"
[ -n "${CCC_INSTALLED:-}" ] && echo -e "  ${M_WHITE}ccc:${NC}        ${M_BRIGHT}${CCC_INSTALLED}${NC}"
echo ""
echo -e "  ${M_WHITE}Launch:${NC}"
echo -e "    ${M_BRIGHT}ccc${NC}           ${M_DIM}Full interactive mode (arrow-key menus, cockpit)${NC}"
echo -e "    ${M_BRIGHT}ccc --split${NC}   ${M_DIM}Tmux split: CCC menu + Claude Code side by side${NC}"
echo -e "    ${M_BRIGHT}ccc --test${NC}    ${M_DIM}Verify installation${NC}"
echo -e "  ${M_DIM}Note: ccc --split requires tmux (brew install tmux)${NC}"
echo ""

if [ -n "$BACKUP_DIR" ]; then
  echo -e "  ${M_AMBER}Old setup archived:${NC} ${M_DIM}${BACKUP_DIR}${NC}"
  echo -e "  ${M_DIM}Restore: rm -rf ~/.claude && mv ${BACKUP_DIR} ~/.claude${NC}"
  echo ""
fi

# ── Next Steps ───────────────────────────────────────────────────────────────

cc_next_steps

# ── Farewell ─────────────────────────────────────────────────────────────────

cc_farewell
