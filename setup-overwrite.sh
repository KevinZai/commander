#!/bin/bash
# Claude Code Kit — OVERWRITE Update
# Replaces skills, commands, SKILLS-INDEX, CHEATSHEET, hooks.
# Pass --all to also replace CLAUDE.md and settings.json (staff template).
# Pass --kevin to use Kevin's versions instead of staff template.
#
# Flags:
#   --all       Also replace CLAUDE.md and settings.json
#   --kevin     Use Kevin's versions for --all (default: staff-template)
#   --dry-run   Preview what would change (no modifications)
#   --verify    Validate existing installation

set -e

CLAUDE_DIR="$HOME/.claude"
BACKUP_DIR="$CLAUDE_DIR.backup.$(date +%Y%m%d%H%M%S)"
REPLACE_ALL=false
USE_KEVIN=false
DRY_RUN=false
VERIFY_ONLY=false

for arg in "$@"; do
    case "$arg" in
        --all) REPLACE_ALL=true ;;
        --kevin) USE_KEVIN=true ;;
        --dry-run) DRY_RUN=true ;;
        --verify) VERIFY_ONLY=true ;;
    esac
done

# --- Verify mode (delegate to setup.sh) ---
if $VERIFY_ONLY; then
    exec ./setup.sh --verify
fi

# --- Dry-run mode ---
if $DRY_RUN; then
    echo "🔍 Dry run — previewing changes (no files will be modified)"
    echo ""
    echo "  WOULD REPLACE: skills/ ($(ls -d skills/*/ 2>/dev/null | wc -l | tr -d ' ') skills)"
    echo "  WOULD REPLACE: commands/ ($(find commands -name '*.md' 2>/dev/null | wc -l | tr -d ' ') commands)"
    echo "  WOULD REPLACE: SKILLS-INDEX.md"
    echo "  WOULD REPLACE: CHEATSHEET.md"
    [ -d "hooks" ] && echo "  WOULD REPLACE: hooks/"
    [ -d "templates" ] && echo "  WOULD COPY:    templates/"
    if $REPLACE_ALL; then
        if $USE_KEVIN; then
            echo "  WOULD REPLACE: CLAUDE.md (Kevin's version)"
            echo "  WOULD REPLACE: settings.json (Kevin's version)"
        else
            echo "  WOULD REPLACE: CLAUDE.md (staff template)"
            echo "  WOULD REPLACE: settings.json (staff template)"
        fi
    else
        echo "  SKIP:          CLAUDE.md (pass --all to replace)"
        echo "  SKIP:          settings.json (pass --all to replace)"
    fi
    [ -d "$CLAUDE_DIR" ] && echo "" && echo "  Backup would be created at: $BACKUP_DIR"
    exit 0
fi

echo "🔧 Claude Code Kit — Overwrite Update"
echo "======================================"
echo ""

# Backup
if [ -d "$CLAUDE_DIR" ]; then
    echo "📦 Backing up ~/.claude/ to $BACKUP_DIR"
    cp -r "$CLAUDE_DIR" "$BACKUP_DIR"
    echo "   (restore with: rm -rf ~/.claude && mv $BACKUP_DIR ~/.claude)"
fi

mkdir -p "$CLAUDE_DIR"

# Always overwrite: skills, commands, SKILLS-INDEX, CHEATSHEET, hooks
echo ""
echo "📂 Replacing skills..."
rm -rf "$CLAUDE_DIR/skills"
cp -r skills/ "$CLAUDE_DIR/skills/"
SKILL_COUNT=$(ls -d "$CLAUDE_DIR/skills/"*/ 2>/dev/null | wc -l | tr -d ' ')
echo "✅ Installed $SKILL_COUNT skills"

echo "📂 Replacing commands..."
rm -rf "$CLAUDE_DIR/commands"
mkdir -p "$CLAUDE_DIR/commands"
cp -r commands/ "$CLAUDE_DIR/commands/"
CMD_COUNT=$(find "$CLAUDE_DIR/commands" -name "*.md" 2>/dev/null | wc -l | tr -d ' ')
echo "✅ Installed $CMD_COUNT commands"

echo "📄 Replacing SKILLS-INDEX.md..."
cp SKILLS-INDEX.md "$CLAUDE_DIR/SKILLS-INDEX.md"
echo "✅ SKILLS-INDEX.md updated"

echo "📄 Replacing CHEATSHEET.md..."
cp CHEATSHEET.md "$CLAUDE_DIR/CHEATSHEET.md"
echo "✅ CHEATSHEET.md updated"

if [ -d "hooks" ]; then
    echo "📂 Replacing hooks..."
    cp -r hooks/ "$CLAUDE_DIR/hooks/"
    echo "✅ Hooks updated"
fi

if [ -d "templates" ]; then
    echo "📂 Copying templates..."
    mkdir -p "$CLAUDE_DIR/templates"
    cp -r templates/ "$CLAUDE_DIR/templates/"
    echo "✅ Templates updated"
fi

# Conditional: CLAUDE.md and settings.json
if $REPLACE_ALL; then
    echo ""
    if $USE_KEVIN; then
        echo "🔴 --all --kevin: replacing with Kevin's versions"
        CLAUDE_SRC="CLAUDE.md.kevin"
        SETTINGS_SRC="settings.json.kevin"
    else
        echo "🔴 --all: replacing with staff template"
        CLAUDE_SRC="CLAUDE.md.staff-template"
        SETTINGS_SRC="settings.json.staff-template"
    fi

    if [ -f "$CLAUDE_SRC" ]; then
        cp "$CLAUDE_SRC" "$CLAUDE_DIR/CLAUDE.md"
        echo "✅ CLAUDE.md replaced (from $CLAUDE_SRC)"
    fi

    if [ -f "$SETTINGS_SRC" ]; then
        cp "$SETTINGS_SRC" "$CLAUDE_DIR/settings.json"
        echo "✅ settings.json replaced (from $SETTINGS_SRC)"
        # Validate JSON
        if node -e "JSON.parse(require('fs').readFileSync('$CLAUDE_DIR/settings.json','utf8'))" 2>/dev/null; then
            echo "   ✓ JSON syntax valid"
        else
            echo "   ⚠️ JSON syntax error — check settings.json"
        fi
    fi
else
    echo ""
    echo "⏭️  Skipping CLAUDE.md and settings.json (pass --all to replace, add --kevin for Kevin's versions)"
fi

echo ""
echo "🎉 Update complete!"
echo ""
echo "Run './setup.sh --verify' to validate installation."
echo "Backup at: $BACKUP_DIR"
