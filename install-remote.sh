#!/bin/bash
# ============================================================================
# CC Commander — One-Line Remote Installer
# ============================================================================
# Paste this anywhere:
#   curl -fsSL https://raw.githubusercontent.com/KevinZai/cc-commander/main/install-remote.sh | bash
#
# Or with wget:
#   wget -qO- https://raw.githubusercontent.com/KevinZai/cc-commander/main/install-remote.sh | bash
# ============================================================================

set -euo pipefail

# Colors
GREEN='\033[38;5;46m'
CYAN='\033[38;5;51m'
DIM='\033[38;5;22m'
WHITE='\033[38;5;255m'
RED='\033[38;5;196m'
AMBER='\033[38;5;214m'
NC='\033[0m'

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "  ${WHITE}CC Commander${NC}  ${DIM}Remote Installer${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# ── Check prerequisites ─────────────────────────────────────────────────────

# Check for git
if ! command -v git &>/dev/null; then
  echo -e "  ${RED}✗${NC} git not found. Install git first."
  exit 1
fi

# Check for node/npm (needed for Claude Code)
if ! command -v node &>/dev/null; then
  echo -e "  ${RED}✗${NC} Node.js not found. Install Node.js 18+ first."
  echo -e "    ${DIM}https://nodejs.org${NC}"
  exit 1
fi

# ── Install Claude Code if needed ────────────────────────────────────────────

if ! command -v claude &>/dev/null; then
  echo -e "  ${AMBER}!${NC} Claude Code CLI not found. Installing..."
  npm install -g @anthropic-ai/claude-code
  if command -v claude &>/dev/null; then
    echo -e "  ${GREEN}✓${NC} Claude Code CLI installed"
  else
    echo -e "  ${RED}✗${NC} Failed to install Claude Code CLI"
    echo -e "    ${DIM}Try: npm install -g @anthropic-ai/claude-code${NC}"
    exit 1
  fi
else
  echo -e "  ${GREEN}✓${NC} Claude Code CLI found"
fi

# ── Clone the kit ────────────────────────────────────────────────────────────

INSTALL_DIR="${TMPDIR:-/tmp}/cc-commander-$$"
echo -e "  ${CYAN}►${NC} Downloading kit..."

if git clone --depth 1 https://github.com/k3v80/claude-code-kit.git "$INSTALL_DIR" 2>/dev/null; then
  echo -e "  ${GREEN}✓${NC} Kit downloaded"
else
  echo -e "  ${RED}✗${NC} Failed to clone. Check your internet connection."
  exit 1
fi

# ── Run the installer ────────────────────────────────────────────────────────

echo ""
echo -e "  ${CYAN}►${NC} Launching installer..."
echo ""

cd "$INSTALL_DIR"
chmod +x install.sh
./install.sh

# ── Cleanup ──────────────────────────────────────────────────────────────────

rm -rf "$INSTALL_DIR" 2>/dev/null || true
