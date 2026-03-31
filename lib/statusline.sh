#!/bin/bash
# ============================================================================
# CC Commander — Status Line
# ============================================================================
# Persistent footer showing context gauge, model, tokens, cost, rate limits.
# Receives JSON session data on stdin from Claude Code.
#
# Install:
#   Add to ~/.claude/settings.json:
#   "statusLine": {
#     "type": "command",
#     "command": "~/.claude/lib/statusline.sh",
#     "padding": 1
#   }
#
# Colors use CC Commander palette.
# ============================================================================

# Colors — CC Commander palette
G='\033[38;5;172m'   # amber
M='\033[38;5;145m'   # gray
D='\033[38;5;240m'   # dim gray
C='\033[38;5;99m'    # indigo
W='\033[38;5;255m'   # white
A='\033[38;5;214m'   # amber
R='\033[38;5;196m'   # red
GR='\033[38;5;238m'  # gray
B='\033[1m'          # bold
N='\033[0m'          # reset

# Read JSON from stdin
INPUT=$(cat)

# Parse fields with jq (fall back gracefully)
if ! command -v jq &>/dev/null; then
  echo -e "${D}━━ ${M}CC${N} ${D}━ jq required for status line ━━━${N}"
  exit 0
fi

# Extract values
CTX_PCT=$(echo "$INPUT" | jq -r '.context_window.used_percentage // 0' 2>/dev/null)
CTX_REM=$(echo "$INPUT" | jq -r '.context_window.remaining_percentage // 100' 2>/dev/null)
MODEL=$(echo "$INPUT" | jq -r '.model.display_name // "unknown"' 2>/dev/null)
MODEL_ID=$(echo "$INPUT" | jq -r '.model.id // ""' 2>/dev/null)
COST=$(echo "$INPUT" | jq -r '.cost.total_cost_usd // 0' 2>/dev/null)
IN_TOK=$(echo "$INPUT" | jq -r '.context_window.total_input_tokens // 0' 2>/dev/null)
OUT_TOK=$(echo "$INPUT" | jq -r '.context_window.total_output_tokens // 0' 2>/dev/null)
DURATION=$(echo "$INPUT" | jq -r '.cost.total_duration_ms // 0' 2>/dev/null)
PROJECT=$(echo "$INPUT" | jq -r '.workspace.current_dir // "?"' 2>/dev/null)
RATE_5H=$(echo "$INPUT" | jq -r '.rate_limits.five_hour.used_percentage // empty' 2>/dev/null)
RATE_7D=$(echo "$INPUT" | jq -r '.rate_limits.seven_day.used_percentage // empty' 2>/dev/null)
AGENT=$(echo "$INPUT" | jq -r '.agent.name // empty' 2>/dev/null)
ACCOUNT=$(echo "$INPUT" | jq -r '.account.email // .account.name // empty' 2>/dev/null)
RATE_5H_RESET=$(echo "$INPUT" | jq -r '.rate_limits.five_hour.resets_at // empty' 2>/dev/null)
RATE_7D_RESET=$(echo "$INPUT" | jq -r '.rate_limits.seven_day.resets_at // empty' 2>/dev/null)

# Round context percentage
CTX_INT=${CTX_PCT%.*}
CTX_INT=${CTX_INT:-0}

# Build context gauge bar (20 chars wide)
BAR_W=20
FILLED=$(( CTX_INT * BAR_W / 100 ))
EMPTY=$(( BAR_W - FILLED ))
[ $FILLED -gt $BAR_W ] && FILLED=$BAR_W && EMPTY=0

# Zone color based on usage
if [ "$CTX_INT" -ge 90 ]; then
  ZC="$R"; ZONE="DANGER"
elif [ "$CTX_INT" -ge 80 ]; then
  ZC="$R"; ZONE="RED"
elif [ "$CTX_INT" -ge 70 ]; then
  ZC="$A"; ZONE="ORANGE"
elif [ "$CTX_INT" -ge 50 ]; then
  ZC="$A"; ZONE="YELLOW"
else
  ZC="$G"; ZONE="GREEN"
fi

# Build the bar
BAR="${M}▐${ZC}"
for ((i=0; i<FILLED; i++)); do BAR+="█"; done
BAR+="${D}"
for ((i=0; i<EMPTY; i++)); do BAR+="░"; done
BAR+="${M}▌${N}"

# Format tokens (K)
fmt_k() {
  local v=$1
  if [ "$v" -ge 1000000 ]; then
    printf "%.1fM" "$(echo "scale=1; $v/1000000" | bc 2>/dev/null || echo "?")"
  elif [ "$v" -ge 1000 ]; then
    printf "%.0fK" "$(echo "scale=0; $v/1000" | bc 2>/dev/null || echo "?")"
  else
    printf "%d" "$v"
  fi
}

IN_FMT=$(fmt_k "$IN_TOK")
OUT_FMT=$(fmt_k "$OUT_TOK")

# Format duration
DUR_SEC=$(( DURATION / 1000 ))
if [ "$DUR_SEC" -ge 3600 ]; then
  DUR_FMT="$(( DUR_SEC / 3600 ))h$(( (DUR_SEC % 3600) / 60 ))m"
elif [ "$DUR_SEC" -ge 60 ]; then
  DUR_FMT="$(( DUR_SEC / 60 ))m$(( DUR_SEC % 60 ))s"
else
  DUR_FMT="${DUR_SEC}s"
fi

# Format cost
COST_FMT=$(printf "\$%.2f" "$COST" 2>/dev/null || echo "\$?")

# Short project name (last dir component)
PROJ_SHORT=$(basename "$PROJECT")

# Short model name
case "$MODEL_ID" in
  *opus*) MODEL_SHORT="Opus" ;;
  *sonnet*) MODEL_SHORT="Sonnet" ;;
  *haiku*) MODEL_SHORT="Haiku" ;;
  *) MODEL_SHORT="$MODEL" ;;
esac

# Rate limit section — show time remaining until reset (not raw %)
RATE_STR=""
calc_remaining() {
  local reset_at="$1" label="$2"
  if [ -n "$reset_at" ] && [ "$reset_at" != "null" ]; then
    local now_epoch reset_epoch diff_sec
    now_epoch=$(date +%s 2>/dev/null)
    reset_epoch=$(date -j -f "%Y-%m-%dT%H:%M:%S" "${reset_at%%.*}" +%s 2>/dev/null || date -d "$reset_at" +%s 2>/dev/null)
    if [ -n "$reset_epoch" ] && [ -n "$now_epoch" ]; then
      diff_sec=$((reset_epoch - now_epoch))
      if [ "$diff_sec" -le 0 ]; then
        printf " ${G}%s:ready${N}" "$label"
      elif [ "$diff_sec" -lt 3600 ]; then
        printf " ${A}%s:%dm${N}" "$label" "$((diff_sec / 60))"
      elif [ "$diff_sec" -lt 86400 ]; then
        printf " ${D}%s:%dh%dm${N}" "$label" "$((diff_sec / 3600))" "$(((diff_sec % 3600) / 60))"
      else
        printf " ${D}%s:%dd${N}" "$label" "$((diff_sec / 86400))"
      fi
    fi
  fi
}
if [ -n "$RATE_5H" ]; then
  R5=${RATE_5H%.*}
  if [ -n "$RATE_5H_RESET" ] && [ "$RATE_5H_RESET" != "null" ]; then
    RATE_STR+="$(calc_remaining "$RATE_5H_RESET" "5h")"
  elif [ "$R5" -ge 80 ]; then
    RATE_STR+=" ${R}5h:${R5}%${N}"
  elif [ "$R5" -ge 50 ]; then
    RATE_STR+=" ${A}5h:${R5}%${N}"
  else
    RATE_STR+=" ${D}5h:${R5}%${N}"
  fi
fi
if [ -n "$RATE_7D" ]; then
  R7=${RATE_7D%.*}
  if [ -n "$RATE_7D_RESET" ] && [ "$RATE_7D_RESET" != "null" ]; then
    RATE_STR+="$(calc_remaining "$RATE_7D_RESET" "7d")"
  elif [ "$R7" -ge 80 ]; then
    RATE_STR+=" ${R}7d:${R7}%${N}"
  elif [ "$R7" -ge 50 ]; then
    RATE_STR+=" ${A}7d:${R7}%${N}"
  else
    RATE_STR+=" ${D}7d:${R7}%${N}"
  fi
fi

# Agent indicator
AGENT_STR=""
[ -n "$AGENT" ] && AGENT_STR=" ${C}⚡${AGENT}${N}"

# Account indicator (truncated to 20 chars)
ACCT_STR=""
if [ -n "$ACCOUNT" ] && [ "$ACCOUNT" != "null" ]; then
  ACCT_SHORT="${ACCOUNT:0:20}"
  ACCT_STR=" ${GR}${ACCT_SHORT}${N}"
fi

# API key suffix (last 5 chars) — 3-tier fallback
KEY_STR=""
if [ -n "$ANTHROPIC_API_KEY" ]; then
  KEY_TAIL="${ANTHROPIC_API_KEY: -5}"
  KEY_STR=" ${D}key:${N}${M}..${KEY_TAIL}${N}"
else
  SETTINGS_FILE="$HOME/.claude/settings.json"
  if [ -f "$SETTINGS_FILE" ]; then
    API_HELPER=$(jq -r '.apiKeyHelper // empty' "$SETTINGS_FILE" 2>/dev/null)
    if [ -n "$API_HELPER" ]; then
      API_HELPER="${API_HELPER/#\~/$HOME}"
      HELPER_KEY=$(timeout 2 $API_HELPER 2>/dev/null)
      if [ -n "$HELPER_KEY" ]; then
        KEY_TAIL="${HELPER_KEY: -5}"
        KEY_STR=" ${D}key:${N}${M}..${KEY_TAIL}${N}"
      fi
    fi
  fi
fi

# ── Output ──────────────────────────────────────────────────────────────────

# Line 1: Context gauge + model + cost + key
echo -e "${D}━━${N} ${M}CC${N} ${BAR} ${ZC}${B}${CTX_INT}%${N} ${D}│${N} ${C}${MODEL_SHORT}${N} ${D}│${N} ${W}${COST_FMT}${N} ${D}│${N} ${D}in:${N}${W}${IN_FMT}${N} ${D}out:${N}${W}${OUT_FMT}${N} ${D}│${N} ${D}${DUR_FMT}${N}${RATE_STR}${AGENT_STR}${ACCT_STR}${KEY_STR} ${D}│${N} ${GR}${PROJ_SHORT}${N}"
