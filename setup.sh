#!/bin/bash
# CC Commander Setup Script
# Run: chmod +x setup.sh && ./setup.sh
#
# Flags:
#   --dry-run   Preview what would be installed (no changes)
#   --verify    Validate an existing installation

echo ""
echo "  ⚠️  setup.sh is DEPRECATED. Use install.sh instead:"
echo ""
echo "    ./install.sh              Interactive install"
echo "    ./install.sh --force      Skip prompts"
echo "    ./install.sh --verify     Validate install"
echo ""
read -p "  Continue anyway? (y/N) " confirm
if [[ "${confirm,,}" != "y" ]]; then
  echo "  Use: ./install.sh"
  exit 0
fi
echo ""

set -e

CLAUDE_DIR="$HOME/.claude"
BACKUP_DIR="$CLAUDE_DIR.backup.$(date +%Y%m%d%H%M%S)"
DRY_RUN=false
VERIFY_ONLY=false

for arg in "$@"; do
    case "$arg" in
        --dry-run) DRY_RUN=true ;;
        --verify) VERIFY_ONLY=true ;;
    esac
done

# --- Verify mode ---
if $VERIFY_ONLY; then
    echo "🔍 Verifying Claude Code installation..."
    ERRORS=0

    # Check Claude Code binary
    if command -v claude &>/dev/null; then
        echo "✅ Claude Code installed: $(claude --version 2>/dev/null || echo 'unknown version')"
    else
        echo "❌ Claude Code not found"; ERRORS=$((ERRORS+1))
    fi

    # Check CLAUDE.md
    if [ -f "$CLAUDE_DIR/CLAUDE.md" ]; then
        echo "✅ CLAUDE.md exists ($(wc -l < "$CLAUDE_DIR/CLAUDE.md" | tr -d ' ') lines)"
    else
        echo "❌ CLAUDE.md missing"; ERRORS=$((ERRORS+1))
    fi

    # Check settings.json (valid JSON)
    if [ -f "$CLAUDE_DIR/settings.json" ]; then
        if node -e "JSON.parse(require('fs').readFileSync('$CLAUDE_DIR/settings.json','utf8'))" 2>/dev/null; then
            echo "✅ settings.json exists and valid JSON"
        else
            echo "❌ settings.json exists but invalid JSON"; ERRORS=$((ERRORS+1))
        fi
    else
        echo "❌ settings.json missing"; ERRORS=$((ERRORS+1))
    fi

    # Check skills
    if [ -d "$CLAUDE_DIR/skills" ]; then
        SKILL_COUNT=$(ls -d "$CLAUDE_DIR/skills/"*/ 2>/dev/null | wc -l | tr -d ' ')
        echo "✅ Skills directory: $SKILL_COUNT skills"
    else
        echo "❌ Skills directory missing"; ERRORS=$((ERRORS+1))
    fi

    # Check commands
    if [ -d "$CLAUDE_DIR/commands" ]; then
        CMD_COUNT=$(find "$CLAUDE_DIR/commands" -name "*.md" 2>/dev/null | wc -l | tr -d ' ')
        echo "✅ Commands directory: $CMD_COUNT commands"
    else
        echo "❌ Commands directory missing"; ERRORS=$((ERRORS+1))
    fi

    # Check reference files
    for f in SKILLS-INDEX.md CHEATSHEET.md; do
        if [ -f "$CLAUDE_DIR/$f" ]; then
            echo "✅ $f exists"
        else
            echo "⚠️  $f missing (optional)"
        fi
    done

    # Check for placeholder tokens
    if grep -q "YOUR_GITHUB_TOKEN_HERE" "$CLAUDE_DIR/settings.json" 2>/dev/null; then
        echo "⚠️  GitHub token not configured (still placeholder in settings.json)"
    fi

    if [ $ERRORS -eq 0 ]; then
        echo ""
        echo "🎉 Installation verified — no issues found"
    else
        echo ""
        echo "❌ Found $ERRORS issue(s). Re-run setup.sh to fix."
    fi
    exit $ERRORS
fi

# --- Dry-run mode ---
if $DRY_RUN; then
    echo "🔍 Dry run — previewing changes (no files will be modified)"
    echo ""
    [ ! -f "$CLAUDE_DIR/CLAUDE.md" ] && echo "  WOULD CREATE: ~/.claude/CLAUDE.md" || echo "  SKIP (exists): ~/.claude/CLAUDE.md"
    [ ! -f "$CLAUDE_DIR/settings.json" ] && echo "  WOULD CREATE: ~/.claude/settings.json" || echo "  SKIP (exists): ~/.claude/settings.json"
    [ -d "skills" ] && echo "  WOULD COPY:   skills/ ($(ls -d skills/*/ 2>/dev/null | wc -l | tr -d ' ') skills)"
    [ -d "commands" ] && echo "  WOULD COPY:   commands/ ($(find commands -name '*.md' 2>/dev/null | wc -l | tr -d ' ') commands)"
    [ -f "SKILLS-INDEX.md" ] && echo "  WOULD COPY:   SKILLS-INDEX.md"
    [ -f "CHEATSHEET.md" ] && echo "  WOULD COPY:   CHEATSHEET.md"
    [ -d "$CLAUDE_DIR" ] && echo "" && echo "  Backup would be created at: $BACKUP_DIR"
    exit 0
fi

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
    cp CLAUDE.md.template "$CLAUDE_DIR/CLAUDE.md"
    echo "✅ Created ~/.claude/CLAUDE.md (edit to personalize)"
else
    echo "⏭️  ~/.claude/CLAUDE.md exists — skipping (compare with CLAUDE.md.template)"
fi

# Copy settings.json
if [ ! -f "$CLAUDE_DIR/settings.json" ]; then
    cp settings.json.template "$CLAUDE_DIR/settings.json"
    echo "✅ Created ~/.claude/settings.json (add your GitHub token)"
    # Validate JSON
    if node -e "JSON.parse(require('fs').readFileSync('$CLAUDE_DIR/settings.json','utf8'))" 2>/dev/null; then
        echo "   ✓ JSON syntax valid"
    else
        echo "   ⚠️ JSON syntax error — check settings.json"
    fi
else
    echo "⏭️  ~/.claude/settings.json exists — skipping (compare with settings.json.template)"
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
    CMD_COUNT=$(find "$CLAUDE_DIR/commands" -name "*.md" 2>/dev/null | wc -l | tr -d ' ')
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
echo "  5. Run './setup.sh --verify' to validate installation"
echo ""
echo "API key: export ANTHROPIC_API_KEY='your-key' (or add to ~/.zshrc)"
