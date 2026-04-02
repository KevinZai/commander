#!/bin/bash
# ============================================================================
# CC Commander — Split Mode
# ============================================================================
# Launches tmux with CCC menu on the left and Claude Code on the right.
# Usage: ccc --split
# ============================================================================

SESSION_NAME="ccc-split"
CCC_BIN="$(dirname "$0")/kc.js"

# Check tmux
if ! command -v tmux &>/dev/null; then
  echo "Split mode requires tmux. Install: brew install tmux"
  exit 1
fi

# Check if already in tmux
if [ -n "$TMUX" ]; then
  echo "Already in a tmux session. Use ccc normally or exit tmux first."
  exit 1
fi

# Kill existing session if present
tmux kill-session -t "$SESSION_NAME" 2>/dev/null

# Create new session with CCC on the left (35% width)
tmux new-session -d -s "$SESSION_NAME" -x "$(tput cols)" -y "$(tput lines)"

# Left pane: CCC interactive menu
tmux send-keys -t "$SESSION_NAME" "node $CCC_BIN" Enter

# Split right pane: Claude Code prompt
tmux split-window -h -t "$SESSION_NAME" -p 65

# Right pane: Claude Code
tmux send-keys -t "$SESSION_NAME" "claude --dangerously-skip-permissions" Enter

# Set pane titles
tmux select-pane -t "$SESSION_NAME:0.0" -T "CCC Menu"
tmux select-pane -t "$SESSION_NAME:0.1" -T "Claude Code"

# Style the split
tmux set-option -t "$SESSION_NAME" pane-border-style "fg=#333333"
tmux set-option -t "$SESSION_NAME" pane-active-border-style "fg=#ff6600"
tmux set-option -t "$SESSION_NAME" pane-border-format " #{pane_title} "
tmux set-option -t "$SESSION_NAME" pane-border-status top

# Status bar with CCC branding
tmux set-option -t "$SESSION_NAME" status-style "bg=#0d1117,fg=#666666"
tmux set-option -t "$SESSION_NAME" status-left "#[fg=#ff6600,bold] CCC #[fg=#666666]│ "
tmux set-option -t "$SESSION_NAME" status-right "#[fg=#00ffff]#{pane_current_command} #[fg=#666666]│ #[fg=#ff6600]%H:%M"
tmux set-option -t "$SESSION_NAME" status-left-length 20

# Simple keybindings (no Ctrl+B prefix needed)
tmux set-option -t "$SESSION_NAME" prefix None
tmux bind-key -n F1 select-pane -t "$SESSION_NAME:0.0"    # F1 = CCC menu
tmux bind-key -n F2 select-pane -t "$SESSION_NAME:0.1"    # F2 = Claude Code
tmux bind-key -n F3 resize-pane -t "$SESSION_NAME:0.0" -x 25%  # F3 = shrink menu
tmux bind-key -n F4 resize-pane -t "$SESSION_NAME:0.0" -x 45%  # F4 = expand menu
tmux bind-key -n F10 kill-session -t "$SESSION_NAME"       # F10 = quit

# Add key legend to status bar
tmux set-option -t "$SESSION_NAME" status-right "#[fg=#444444]F1:Menu F2:Claude F10:Quit #[fg=#666666]| #[fg=#ff6600]%H:%M"

# Focus on Claude Code pane (right)
tmux select-pane -t "$SESSION_NAME:0.1"

# Attach
tmux attach-session -t "$SESSION_NAME"
