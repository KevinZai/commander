#!/bin/bash
# ============================================================================
# CC Commander — Split Mode (Tabbed)
# ============================================================================
# CCC menu in tab 0. Each dispatch opens a new tab with Claude running.
# Switch tabs: Ctrl+A then n(next) / p(prev) / 0-9(by number)
# ============================================================================

SESSION_NAME="ccc"
CCC_BIN="$(cd "$(dirname "$0")" && pwd)/kc.js"

# Check tmux
if ! command -v tmux &>/dev/null; then
  echo "  Split mode requires tmux."
  echo "  Install: brew install tmux"
  exit 1
fi

# If already in tmux, just run CCC directly
if [ -n "$TMUX" ]; then
  exec node "$CCC_BIN"
fi

# Kill old session
tmux kill-session -t "$SESSION_NAME" 2>/dev/null

# Create session — first window is CCC menu
tmux new-session -d -s "$SESSION_NAME" -n "menu" -x "$(tput cols)" -y "$(tput lines)"
tmux send-keys -t "$SESSION_NAME:menu" "CCC_TMUX_SESSION=$SESSION_NAME node $CCC_BIN" Enter

# Style
tmux set-option -t "$SESSION_NAME" status-style "bg=#0d1117,fg=#666666"
tmux set-option -t "$SESSION_NAME" status-left "#[fg=#ff6600,bold] CCC #[fg=#666666]│ "
tmux set-option -t "$SESSION_NAME" status-right "#[fg=#444444]^A+n:next ^A+p:prev ^A+0:menu ^A+q:quit #[fg=#666666]│ #[fg=#ff6600]%H:%M"
tmux set-option -t "$SESSION_NAME" status-left-length 20

# Window labels show in status bar
tmux set-option -t "$SESSION_NAME" window-status-format "#[fg=#555555] #I:#W "
tmux set-option -t "$SESSION_NAME" window-status-current-format "#[fg=#ff6600,bold] #I:#W "

# Keybindings — Ctrl+A prefix
tmux set-option -t "$SESSION_NAME" prefix C-a
tmux bind-key C-a send-prefix
tmux bind-key q kill-session -t "$SESSION_NAME"
tmux set-option -t "$SESSION_NAME" mouse on

# Attach
tmux attach-session -t "$SESSION_NAME"
