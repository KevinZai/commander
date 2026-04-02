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

# Keybindings — Ctrl+A prefix (simpler than Ctrl+B, works on Mac)
tmux set-option -t "$SESSION_NAME" prefix C-a
tmux bind-key -t "$SESSION_NAME" C-a send-prefix

# Ctrl+A then: 1=Menu, 2=Claude, q=Quit, ←/→=resize
tmux bind-key -t "$SESSION_NAME" 1 select-pane -t "$SESSION_NAME:0.0"
tmux bind-key -t "$SESSION_NAME" 2 select-pane -t "$SESSION_NAME:0.1"
tmux bind-key -t "$SESSION_NAME" Left resize-pane -L 5
tmux bind-key -t "$SESSION_NAME" Right resize-pane -R 5
tmux bind-key -t "$SESSION_NAME" q kill-session -t "$SESSION_NAME"

# Also allow prefix-free mouse switching
tmux set-option -t "$SESSION_NAME" mouse on

# Key legend in status bar
tmux set-option -t "$SESSION_NAME" status-right "#[fg=#444444]^A+1:Menu ^A+2:Claude ^A+q:Quit #[fg=#666666]| #[fg=#ff6600]%H:%M"

# Focus on Claude Code pane (right)
tmux select-pane -t "$SESSION_NAME:0.1"

# Attach
tmux attach-session -t "$SESSION_NAME"
