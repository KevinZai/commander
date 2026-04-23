#!/bin/bash
# ============================================================================
# CC Commander — Uninstaller
# ============================================================================
# Removes kit-installed components from ~/.claude/ and optionally restores
# from a backup created by the installer.
#
# Usage:
#   ./uninstall.sh           Interactive uninstall
#   ./uninstall.sh --force   Skip confirmation prompts
# ============================================================================

set -euo pipefail

CLAUDE_DIR="$HOME/.claude"
[[ -n "${CLAUDE_DIR:-}" && "$CLAUDE_DIR" != "/" && "$CLAUDE_DIR" != "$HOME" ]] || { echo "ERROR: Invalid CLAUDE_DIR ($CLAUDE_DIR)"; exit 1; }
FORCE=false

while [[ $# -gt 0 ]]; do
  case $1 in
    --force) FORCE=true; shift ;;
    --help|-h)
      echo "Usage: ./uninstall.sh [--force]"
      echo "  --force    Skip confirmation prompts"
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
  echo "  Nothing to uninstall — ~/.claude/ does not exist."
  echo ""
  exit 0
fi

# ── Show what will be removed ────────────────────────────────────────────
echo "  The following kit components will be removed:"
echo ""

components=0
[ -d "$CLAUDE_DIR/skills" ] && echo "  · skills/" && ((components++))
[ -d "$CLAUDE_DIR/commands" ] && echo "  · commands/" && ((components++))
[ -d "$CLAUDE_DIR/hooks" ] && echo "  · hooks/" && ((components++))
[ -d "$CLAUDE_DIR/lib" ] && echo "  · lib/" && ((components++))
[ -d "$CLAUDE_DIR/templates" ] && echo "  · templates/" && ((components++))
[ -f "$CLAUDE_DIR/BIBLE.md" ] && echo "  · BIBLE.md" && ((components++))
[ -f "$CLAUDE_DIR/CHEATSHEET.md" ] && echo "  · CHEATSHEET.md" && ((components++))
[ -f "$CLAUDE_DIR/SKILLS-INDEX.md" ] && echo "  · SKILLS-INDEX.md" && ((components++))

if [ "$components" -eq 0 ]; then
  echo "  No kit components found."
  echo ""
  exit 0
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
  read -p "  Remove $components kit components? (y/N) " confirm
  if [[ "$(echo "$confirm" | tr '[:upper:]' '[:lower:]')" != "y" ]]; then
    echo ""
    echo "  Aborted. No changes made."
    echo ""
    exit 0
  fi
fi

# ── Remove kit components ────────────────────────────────────────────────
echo ""
[ -d "$CLAUDE_DIR/skills" ] && rm -rf "$CLAUDE_DIR/skills" && echo "  ✓ Removed skills/"
[ -d "$CLAUDE_DIR/commands" ] && rm -rf "$CLAUDE_DIR/commands" && echo "  ✓ Removed commands/"
[ -d "$CLAUDE_DIR/hooks" ] && rm -rf "$CLAUDE_DIR/hooks" && echo "  ✓ Removed hooks/"
[ -d "$CLAUDE_DIR/lib" ] && rm -rf "$CLAUDE_DIR/lib" && echo "  ✓ Removed lib/"
[ -d "$CLAUDE_DIR/templates" ] && rm -rf "$CLAUDE_DIR/templates" && echo "  ✓ Removed templates/"
[ -f "$CLAUDE_DIR/BIBLE.md" ] && rm "$CLAUDE_DIR/BIBLE.md" && echo "  ✓ Removed BIBLE.md"
[ -f "$CLAUDE_DIR/CHEATSHEET.md" ] && rm "$CLAUDE_DIR/CHEATSHEET.md" && echo "  ✓ Removed CHEATSHEET.md"
[ -f "$CLAUDE_DIR/SKILLS-INDEX.md" ] && rm "$CLAUDE_DIR/SKILLS-INDEX.md" && echo "  ✓ Removed SKILLS-INDEX.md"

# ── Remove ccc symlink ──────────────────────────────────────────────────
for ccc_path in /usr/local/bin/ccc "$HOME/.local/bin/ccc"; do
  if [ -L "$ccc_path" ]; then
    rm "$ccc_path" && echo "  ✓ Removed $ccc_path symlink"
  fi
done

# ── Offer restore ────────────────────────────────────────────────────────
if [ -n "$backups" ]; then
  echo ""
  latest_backup=$(echo "$backups" | tail -1)
  echo "  To restore your previous setup:"
  echo "    rm -rf ~/.claude && mv $latest_backup ~/.claude"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Uninstall complete. CLAUDE.md and settings.json preserved."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
