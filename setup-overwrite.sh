#!/bin/bash
# Claude Code Kit — OVERWRITE Update
# Replaces skills, commands, SKILLS-INDEX, CHEATSHEET, hooks.
# Pass --all to also replace CLAUDE.md and settings.json.
#
# Usage:
#   ./setup-overwrite.sh          # update skills/commands/refs only
#   ./setup-overwrite.sh --all    # full overwrite including CLAUDE.md

set -e

CLAUDE_DIR="$HOME/.claude"
BACKUP_DIR="$CLAUDE_DIR.backup.$(date +%Y%m%d%H%M%S)"
REPLACE_ALL=false

if [[ "$1" == "--all" ]]; then
    REPLACE_ALL=true
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
CMD_COUNT=$(ls "$CLAUDE_DIR/commands/"*.md 2>/dev/null | wc -l | tr -d ' ')
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
    echo "🔴 --all flag: replacing CLAUDE.md and settings.json"

    if [ -f "CLAUDE.md.kevin" ]; then
        cp CLAUDE.md.kevin "$CLAUDE_DIR/CLAUDE.md"
        echo "✅ CLAUDE.md replaced (Kevin's version)"
    fi

    if [ -f "settings.json.kevin" ]; then
        cp settings.json.kevin "$CLAUDE_DIR/settings.json"
        echo "✅ settings.json replaced (Kevin's version)"
    fi
else
    echo ""
    echo "⏭️  Skipping CLAUDE.md and settings.json (pass --all to replace)"
    echo "   Compare yours with CLAUDE.md.kevin to see what's new."
fi

echo ""
echo "🎉 Update complete!"
echo ""
echo "New in this update:"
echo "  • delegation-templates — 7 structured subagent types"
echo "  • dialectic-review — FOR/AGAINST/Referee for decisions"
echo "  • evals-before-specs — success criteria before specs"
echo "  • corrective-framing — prompt engineering technique"
echo "  • operationalize-fixes — post-bug-fix protocol"
echo "  • overnight-runner — autonomous batch jobs"
echo "  • aaio — Agentic AI Optimization"
echo ""
echo "Backup at: $BACKUP_DIR"
