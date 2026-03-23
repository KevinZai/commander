#!/bin/bash
# Claude Code Setup Script — Kevin's Team Kit
# Run: chmod +x setup.sh && ./setup.sh

set -e

CLAUDE_DIR="$HOME/.claude"
BACKUP_DIR="$CLAUDE_DIR.backup.$(date +%Y%m%d%H%M%S)"

echo "🔧 Claude Code Team Setup"
echo "========================="
echo ""

# Check Claude Code installed
if ! command -v claude &>/dev/null; then
    echo "⚠️  Claude Code not found. Installing..."
    npm install -g @anthropic-ai/claude-code
fi

# Backup existing config
if [ -d "$CLAUDE_DIR" ]; then
    echo "📦 Backing up existing ~/.claude/ to $BACKUP_DIR"
    cp -r "$CLAUDE_DIR" "$BACKUP_DIR"
fi

mkdir -p "$CLAUDE_DIR"

# Copy CLAUDE.md
if [ ! -f "$CLAUDE_DIR/CLAUDE.md" ]; then
    cp CLAUDE.md.staff-template "$CLAUDE_DIR/CLAUDE.md"
    echo "✅ Created ~/.claude/CLAUDE.md (edit to personalize)"
else
    echo "⏭️  ~/.claude/CLAUDE.md exists — skipping (compare with CLAUDE.md.staff-template)"
fi

# Copy settings.json
if [ ! -f "$CLAUDE_DIR/settings.json" ]; then
    cp settings.json.staff-template "$CLAUDE_DIR/settings.json"
    echo "✅ Created ~/.claude/settings.json (add your GitHub token)"
else
    echo "⏭️  ~/.claude/settings.json exists — skipping (compare with settings.json.staff-template)"
fi

# Copy skills
if [ -d "skills" ]; then
    echo "📂 Copying skills..."
    cp -r skills/ "$CLAUDE_DIR/skills/"
    SKILL_COUNT=$(ls -d "$CLAUDE_DIR/skills/"*/ 2>/dev/null | wc -l | tr -d ' ')
    echo "✅ Installed $SKILL_COUNT skills"
fi

# Copy commands
if [ -d "commands" ]; then
    echo "📂 Copying commands..."
    mkdir -p "$CLAUDE_DIR/commands"
    cp -r commands/ "$CLAUDE_DIR/commands/"
    CMD_COUNT=$(ls "$CLAUDE_DIR/commands/"*.md 2>/dev/null | wc -l | tr -d ' ')
    echo "✅ Installed $CMD_COUNT commands"
fi

# Copy SKILLS-INDEX.md
if [ -f "SKILLS-INDEX.md" ]; then
    cp SKILLS-INDEX.md "$CLAUDE_DIR/SKILLS-INDEX.md"
    echo "✅ Installed SKILLS-INDEX.md"
fi

# Copy CHEATSHEET.md
if [ -f "CHEATSHEET.md" ]; then
    cp CHEATSHEET.md "$CLAUDE_DIR/CHEATSHEET.md"
    echo "✅ Installed CHEATSHEET.md"
fi

echo ""
echo "🎉 Setup complete!"
echo ""
echo "Next steps:"
echo "  1. Edit ~/.claude/CLAUDE.md — personalize for your workflow"
echo "  2. Edit ~/.claude/settings.json — add your GITHUB_TOKEN"
echo "  3. Run 'claude' to start"
echo "  4. Read CHEATSHEET.md for commands + best practices"
echo ""
echo "API key: export ANTHROPIC_API_KEY='your-key' (or add to ~/.zshrc)"
