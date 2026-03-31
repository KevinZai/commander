#!/bin/bash
# ============================================================================
# CC Commander — Status Line v2 (Heat-Mapped Visual Overhaul)
# ============================================================================
# Persistent footer with heat-mapped context bar, status emojis, compact layout.
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
# CC Commander palette: cyan (#00ffff), magenta (#ff0080), orange, red.
# ============================================================================

# ── Colors — CC Commander heat-map palette ──────────────────────────────────
H1='\033[38;5;51m'   # cyan (0-30%)
H2='\033[38;5;39m'   # cyan-blue (30-50%)
H3='\033[38;5;198m'  # magenta (50-70%)
H4='\033[38;5;208m'  # orange (70-85%)
H5='\033[38;5;196m'  # red (85%+)
W='\033[38;5;255m'   # white
D='\033[38;5;240m'   # dim gray
M='\033[38;5;145m'   # mid gray
C='\033[38;5;51m'    # cyan accent
MG='\033[38;5;198m'  # magenta accent
GR='\033[38;5;238m'  # dark gray
B='\033[1m'          # bold
N='\033[0m'          # reset

# ── Read JSON from stdin ────────────────────────────────────────────────────
INPUT=$(cat)

if ! command -v jq &>/dev/null; then
  echo -e "${D}━━ ${C}CC${N} ${D}━ jq required ━━━${N}"
  exit 0
fi

# ── Parse fields ────────────────────────────────────────────────────────────
CTX_PCT=$(echo "$INPUT" | jq -r '.context_window.used_percentage // 0' 2>/dev/null)
MODEL_ID=$(echo "$INPUT" | jq -r '.model.id // ""' 2>/dev/null)
MODEL=$(echo "$INPUT" | jq -r '.model.display_name // "unknown"' 2>/dev/null)
COST=$(echo "$INPUT" | jq -r '.cost.total_cost_usd // 0' 2>/dev/null)
IN_TOK=$(echo "$INPUT" | jq -r '.context_window.total_input_tokens // 0' 2>/dev/null)
OUT_TOK=$(echo "$INPUT" | jq -r '.context_window.total_output_tokens // 0' 2>/dev/null)
DURATION=$(echo "$INPUT" | jq -r '.cost.total_duration_ms // 0' 2>/dev/null)
PROJECT=$(echo "$INPUT" | jq -r '.workspace.current_dir // "?"' 2>/dev/null)
AGENT=$(echo "$INPUT" | jq -r '.agent.name // empty' 2>/dev/null)
RATE_5H_RESET=$(echo "$INPUT" | jq -r '.rate_limits.five_hour.resets_at // empty' 2>/dev/null)
RATE_7D_RESET=$(echo "$INPUT" | jq -r '.rate_limits.seven_day.resets_at // empty' 2>/dev/null)
RATE_5H=$(echo "$INPUT" | jq -r '.rate_limits.five_hour.used_percentage // empty' 2>/dev/null)
RATE_7D=$(echo "$INPUT" | jq -r '.rate_limits.seven_day.used_percentage // empty' 2>/dev/null)
TOOL_USE=$(echo "$INPUT" | jq -r '.tool_use.name // empty' 2>/dev/null)

# ── Context percentage (integer) ────────────────────────────────────────────
CTX_INT=${CTX_PCT%.*}
CTX_INT=${CTX_INT:-0}

# ── Heat-mapped context bar (10 chars wide) ─────────────────────────────────
BAR_W=10
FILLED=$(( CTX_INT * BAR_W / 100 ))
EMPTY=$(( BAR_W - FILLED ))
[ $FILLED -gt $BAR_W ] && FILLED=$BAR_W && EMPTY=0

heat_color() {
  local pct=$1
  if [ "$pct" -ge 85 ]; then   printf '%b' "${H5}${B}"
  elif [ "$pct" -ge 70 ]; then printf '%b' "${H4}"
  elif [ "$pct" -ge 50 ]; then printf '%b' "${H3}"
  elif [ "$pct" -ge 30 ]; then printf '%b' "${H2}"
  else                         printf '%b' "${H1}"
  fi
}

ZC=$(heat_color "$CTX_INT")
BAR="${M}▐${ZC}"
for ((i=0; i<FILLED; i++)); do BAR+="█"; done
BAR+="${D}"
for ((i=0; i<EMPTY; i++)); do BAR+="░"; done
BAR+="${M}▌${N}"

# ── Format tokens (compact arrows: ↑42K↓8K) ────────────────────────────────
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

# ── Format duration ─────────────────────────────────────────────────────────
DUR_SEC=$(( DURATION / 1000 ))
if [ "$DUR_SEC" -ge 3600 ]; then
  DUR_FMT="$(( DUR_SEC / 3600 ))h$(( (DUR_SEC % 3600) / 60 ))m"
elif [ "$DUR_SEC" -ge 60 ]; then
  DUR_FMT="$(( DUR_SEC / 60 ))m$(( DUR_SEC % 60 ))s"
else
  DUR_FMT="${DUR_SEC}s"
fi

# ── Format cost ─────────────────────────────────────────────────────────────
COST_FMT=$(printf "\$%.2f" "$COST" 2>/dev/null || echo "\$?")

# ── Short model name + status emoji ─────────────────────────────────────────
case "$MODEL_ID" in
  *opus*1m*|*opus*1M*)    MODEL_SHORT="Opus1M" ;;
  *opus*)                  MODEL_SHORT="Opus" ;;
  *sonnet*)                MODEL_SHORT="Sonnet" ;;
  *haiku*)                 MODEL_SHORT="Haiku" ;;
  *)                       MODEL_SHORT="$MODEL" ;;
esac

# Status emoji: tool active → lightning, high output (thinking) → fire, else brain
if [ -n "$TOOL_USE" ] && [ "$TOOL_USE" != "null" ]; then
  STATUS_EMOJI="⚡"
elif [ "$OUT_TOK" -ge 50000 ]; then
  STATUS_EMOJI="🔥"
else
  STATUS_EMOJI="🧠"
fi

# ── Rate limit countdown ───────────────────────────────────────────────────
RATE_STR=""
calc_remaining() {
  local reset_at="$1" label="$2"
  if [ -n "$reset_at" ] && [ "$reset_at" != "null" ]; then
    local now_epoch reset_epoch diff_sec
    now_epoch=$(date +%s 2>/dev/null)
    reset_epoch=$(date -j -f "%Y-%m-%dT%H:%M:%S" "${reset_at%%.*}" +%s 2>/dev/null || \
                  date -d "$reset_at" +%s 2>/dev/null)
    if [ -n "$reset_epoch" ] && [ -n "$now_epoch" ]; then
      diff_sec=$((reset_epoch - now_epoch))
      if [ "$diff_sec" -le 0 ]; then
        printf " ${H1}%s:ok${N}" "$label"
      elif [ "$diff_sec" -lt 3600 ]; then
        printf " ${H4}%s:%dm${N}" "$label" "$((diff_sec / 60))"
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
    RATE_STR+=" ${H5}5h:${R5}%${N}"
  elif [ "$R5" -ge 50 ]; then
    RATE_STR+=" ${H4}5h:${R5}%${N}"
  else
    RATE_STR+=" ${D}5h:${R5}%${N}"
  fi
fi
if [ -n "$RATE_7D" ]; then
  R7=${RATE_7D%.*}
  if [ -n "$RATE_7D_RESET" ] && [ "$RATE_7D_RESET" != "null" ]; then
    RATE_STR+="$(calc_remaining "$RATE_7D_RESET" "7d")"
  elif [ "$R7" -ge 80 ]; then
    RATE_STR+=" ${H5}7d:${R7}%${N}"
  elif [ "$R7" -ge 50 ]; then
    RATE_STR+=" ${H4}7d:${R7}%${N}"
  else
    RATE_STR+=" ${D}7d:${R7}%${N}"
  fi
fi

# ── Agent indicator ─────────────────────────────────────────────────────────
AGENT_STR=""
[ -n "$AGENT" ] && AGENT_STR=" ${MG}⚡${AGENT}${N}"

# ── API key suffix (3-tier fallback) ────────────────────────────────────────
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

# ── Project name ────────────────────────────────────────────────────────────
PROJ_SHORT=$(basename "$PROJECT")

# ── Skill count ────────────────────────────────────────────────────────────
SKILL_COUNT=$(ls -d "$HOME/.claude/skills"/*/ 2>/dev/null | wc -l | tr -d ' ')
SKILL_STR=""
[ "$SKILL_COUNT" -gt 0 ] 2>/dev/null && SKILL_STR=" ${D}│${N} ${C}🎯${W}${SKILL_COUNT}${N}"

# ── Vendor count (cc-commander projects) ───────────────────────────────────
VENDOR_COUNT=0
if [ -d "vendor" ]; then
  VENDOR_COUNT=$(ls -d vendor/*/ 2>/dev/null | wc -l | tr -d ' ')
fi
VENDOR_STR=""
[ "$VENDOR_COUNT" -gt 0 ] 2>/dev/null && VENDOR_STR=" ${D}│${N} ${MG}📦${W}${VENDOR_COUNT}${N}"

# ── Active Linear ticket (from CCC state) ──────────────────────────────────
LINEAR_TICKET=""
STATE_FILE="$HOME/.claude/commander/state.json"
if [ -f "$STATE_FILE" ]; then
  LINEAR_TICKET=$(jq -r '.activeSession.linearIssueIdentifier // empty' "$STATE_FILE" 2>/dev/null)
fi
LINEAR_STR=""
[ -n "$LINEAR_TICKET" ] && LINEAR_STR=" ${D}│${N} ${H2}📋${W}${LINEAR_TICKET}${N}"

# ── CCC version ────────────────────────────────────────────────────────────
CCC_VER=""
if command -v ccc &>/dev/null; then
  CCC_VER=$(ccc --version 2>/dev/null | grep -o '[0-9]*\.[0-9]*\.[0-9]*' | head -1)
fi
CC_LABEL="CC"
[ -n "$CCC_VER" ] && CC_LABEL="CCC${CCC_VER}"

# ── Output ──────────────────────────────────────────────────────────────────
# ━━ CCC2.0 ▐██████░░░▌62% │ 🔥Opus1M │ $2.14 │ ↑42K↓8K │ 3m12s │ 📋CC-48 │ 🎯432 │ 📦11 │ 5h:23m │ key:..a4F2x │ cc-commander
echo -e "${D}━━${N} ${C}${CC_LABEL}${N} ${BAR} ${ZC}${B}${CTX_INT}%${N} ${D}│${N} ${STATUS_EMOJI}${MG}${MODEL_SHORT}${N} ${D}│${N} ${W}${COST_FMT}${N} ${D}│${N} ${C}↑${N}${W}${IN_FMT}${N}${C}↓${N}${W}${OUT_FMT}${N} ${D}│${N} ${D}${DUR_FMT}${N}${RATE_STR}${AGENT_STR}${LINEAR_STR}${SKILL_STR}${VENDOR_STR}${KEY_STR} ${D}│${N} ${GR}${PROJ_SHORT}${N}"
