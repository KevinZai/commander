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

# ── Clone or update the kit ──────────────────────────────────────────────────

INSTALL_DIR="$HOME/.cc-commander"

if [ -d "$INSTALL_DIR/.git" ]; then
  echo -e "  ${CYAN}►${NC} CC Commander already installed — pulling latest..."
  if git -C "$INSTALL_DIR" pull --recurse-submodules 2>/dev/null; then
    echo -e "  ${GREEN}✓${NC} Updated to latest"
  else
    echo -e "  ${RED}✗${NC} git pull failed. Check your internet connection."
    exit 1
  fi
else
  echo -e "  ${CYAN}►${NC} Downloading kit to ~/.cc-commander..."
  if git clone --depth 1 --recursive https://github.com/KevinZai/cc-commander.git "$INSTALL_DIR" 2>/dev/null; then
    echo -e "  ${GREEN}✓${NC} Kit downloaded"
  else
    echo -e "  ${RED}✗${NC} Failed to clone. Check your internet connection."
    exit 1
  fi
fi

# ── Run the installer ────────────────────────────────────────────────────────

echo ""
echo -e "  ${CYAN}►${NC} Launching installer..."
echo ""

cd "$INSTALL_DIR"
chmod +x install.sh
./install.sh --force

# ── Done ─────────────────────────────────────────────────────────────────────

echo ""
echo -e "  ${GREEN}✓${NC} CC Commander installed to ${WHITE}~/.cc-commander${NC}"
echo -e "  ${DIM}To update: curl -fsSL https://raw.githubusercontent.com/KevinZai/cc-commander/main/install-remote.sh | bash${NC}"
echo -e "  ${DIM}       or: cd ~/.cc-commander && git pull && ./install.sh --force${NC}"
echo ""
