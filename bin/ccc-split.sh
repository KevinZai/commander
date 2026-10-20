#!/bin/bash
# ============================================================================
# CC Commander — Split Mode (Pane-Based)
# ============================================================================
# CCC menu in left pane (25%). Each dispatch spawns a Claude session
# as a new pane to the right. Menu always stays visible.
#
# Navigation:
#   Ctrl+A ←/→    Switch between panes
#   Ctrl+A z      Zoom a pane (fullscreen toggle)
#   Ctrl+A q      Show pane numbers, then press number
#   Ctrl+A x      Kill current pane
#   Ctrl+A 0      Jump back to menu pane
# ============================================================================

SESSION_NAME="ccc"
CCC_BIN="$(cd "$(dirname "$0")" && pwd)/kc.js"

# Check tmux
if ! command -v tmux &>/dev/null; then
  echo "  Split mode requires tmux."
  echo "  Install: brew install tmux"
  exit 1
fi

# If already in a CCC tmux session, just run the menu
if [ "$CCC_TMUX_SESSION" = "$SESSION_NAME" ]; then
  exec node "$CCC_BIN" --simple
fi

# Reuse the existing session so open Claude panes remain available for steering.
if tmux has-session -t "$SESSION_NAME" 2>/dev/null; then
  exec tmux attach-session -t "$SESSION_NAME"
fi

# Create session — single window, menu starts in first pane
tmux new-session -d -s "$SESSION_NAME" -x "$(tput cols)" -y "$(tput lines)"

# Set env vars for the menu pane
tmux send-keys -t "$SESSION_NAME" "export CCC_TMUX_SESSION=$SESSION_NAME CCC_SIMPLE=1 CCC_PANE_MODE=1 && node $CCC_BIN" Enter

# Mark menu pane for easy targeting
tmux select-pane -t "$SESSION_NAME" -T "menu"

# Style — dark theme matching CCC branding
tmux set-option -t "$SESSION_NAME" status-style "bg=#0d1117,fg=#666666"
tmux set-option -t "$SESSION_NAME" status-left "#[fg=#ff6600,bold] CCC #[fg=#444444]│ "
tmux set-option -t "$SESSION_NAME" status-right "#[fg=#444444]^A+←→:switch ^A+z:zoom ^A+0:menu #[fg=#666666]│ #[fg=#ff6600]%H:%M"
tmux set-option -t "$SESSION_NAME" status-left-length 20
tmux set-option -t "$SESSION_NAME" status-right-length 60

# Pane borders - show pane titles
tmux set-option -t "$SESSION_NAME" pane-border-status top
tmux set-option -t "$SESSION_NAME" pane-border-format " #{pane_title} "
tmux set-option -t "$SESSION_NAME" pane-border-style "fg=#333333"
tmux set-option -t "$SESSION_NAME" pane-active-border-style "fg=#ff6600"

# Keybindings — Ctrl+A prefix (set-option -t = target session, bind/unbind = global)
tmux set-option -t "$SESSION_NAME" prefix C-a
tmux set-option -t "$SESSION_NAME" prefix2 None
tmux unbind-key C-b 2>/dev/null
tmux bind-key C-a send-prefix
tmux bind-key q confirm-before -p "Kill CCC session? (y/n)" kill-session

# Bind 0 to jump back to the menu pane (pane 0)
tmux bind-key 0 select-pane -t "$SESSION_NAME:.0"

# Mouse support
tmux set-option -t "$SESSION_NAME" mouse on

# Attach
tmux attach-session -t "$SESSION_NAME"
