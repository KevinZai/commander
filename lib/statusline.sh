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
# ── ClaudeSwap failover for rate limits ─────────────────────────────────────
if [ -z "$RATE_5H" ] || [ -z "$RATE_7D" ]; then
  SWAP_STATE="$HOME/.config/claudeswap-state.json"
  if [ -f "$SWAP_STATE" ]; then
    ACTIVE_ACCT=$(jq -r '.accounts | to_entries | sort_by(.value.last_used) | last | .key' "$SWAP_STATE" 2>/dev/null)
    if [ -n "$ACTIVE_ACCT" ] && [ "$ACTIVE_ACCT" != "null" ]; then
      [ -z "$RATE_5H" ] && RATE_5H=$(jq -r ".accounts[\"$ACTIVE_ACCT\"].five_hour_utilization * 100" "$SWAP_STATE" 2>/dev/null)
      [ -z "$RATE_7D" ] && RATE_7D=$(jq -r ".accounts[\"$ACTIVE_ACCT\"].seven_day_utilization * 100" "$SWAP_STATE" 2>/dev/null)
    fi
  fi
fi
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
BAR+="${M}▌${ZC}${CTX_INT}%${N}"

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
  *opus*4*6*1m*|*opus*4*6*1M*) MODEL_SHORT="Opus4.6-1M" ;;
  *opus*4*6*|*opus-4-6*)        MODEL_SHORT="Opus4.6" ;;
  *opus*1m*|*opus*1M*)          MODEL_SHORT="Opus1M" ;;
  *opus*)                        MODEL_SHORT="Opus" ;;
  *sonnet*4*6*)                  MODEL_SHORT="Sonnet4.6" ;;
  *sonnet*)                      MODEL_SHORT="Sonnet" ;;
  *haiku*)                       MODEL_SHORT="Haiku" ;;
  *)                             MODEL_SHORT="$MODEL" ;;
esac

# Status emoji: tool active → lightning, high output (thinking) → fire, else brain
if [ -n "$TOOL_USE" ] && [ "$TOOL_USE" != "null" ]; then
  STATUS_EMOJI="⚡"
elif [ "$OUT_TOK" -ge 50000 ]; then
  STATUS_EMOJI="🔥"
else
  STATUS_EMOJI="🧠"
fi

# ── Rate limit text removed — replaced by visual bars in output section ────

# ── Agent indicator ─────────────────────────────────────────────────────────
AGENT_STR=""
[ -n "$AGENT" ] && AGENT_STR=" ${C}⚡${AGENT}${N}"

# ── API key (compact: just icon + last 4 digits) ───────────────────────────
KEY_STR=""
SWAP_STR=""
# Tier 1: claudeswap — get last 4 chars of active key
if command -v claudeswap &>/dev/null; then
  SWAP_TAIL=$(claudeswap status 2>/dev/null | grep '◀ ACTIVE' | grep -o '\.\.\.[a-zA-Z0-9]*' | head -1 | sed 's/\.\.\.//' | tail -c 5)
  if [ -n "$SWAP_TAIL" ]; then
    KEY_STR=" \xf0\x9f\x94\x91${M}${SWAP_TAIL}${N}"
  fi
fi
# Tier 2: env var
if [ -z "$KEY_STR" ] && [ -n "$ANTHROPIC_API_KEY" ]; then
  KEY_TAIL="${ANTHROPIC_API_KEY: -4}"
  KEY_STR=" \xf0\x9f\x94\x91${M}${KEY_TAIL}${N}"
fi
# Tier 3: apiKeyHelper from settings
if [ -z "$KEY_STR" ]; then
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
if [ -z "$CCC_VER" ]; then
  SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
  PKG_FILE="$(dirname "$SCRIPT_DIR")/package.json"
  [ -f "$PKG_FILE" ] && CCC_VER=$(jq -r '.version // empty' "$PKG_FILE" 2>/dev/null)
fi
if [ -z "$CCC_VER" ]; then
  PKG_FILE="$HOME/clawd/projects/cc-commander/package.json"
  [ -f "$PKG_FILE" ] && CCC_VER=$(jq -r '.version // empty' "$PKG_FILE" 2>/dev/null)
fi
CC_LABEL="CC"
[ -n "$CCC_VER" ] && CC_LABEL="CCC${CCC_VER}"

# ── Rate limit bars (green/yellow/red, no text labels) ─────────────────────
RATE_5H_BAR=""
if [ -n "$RATE_5H" ]; then
  R5=${RATE_5H%.*}; R5=${R5:-0}
  R5_FILLED=$(( R5 * 6 / 100 )); [ $R5_FILLED -gt 6 ] && R5_FILLED=6
  R5_EMPTY=$(( 6 - R5_FILLED ))
  if [ "$R5" -ge 80 ]; then R5C="${H5}"
  elif [ "$R5" -ge 50 ]; then R5C="${H4}"
  else R5C='\033[38;5;77m'; fi
  R5_BAR="${M}▐${R5C}"
  for ((i=0; i<R5_FILLED; i++)); do R5_BAR+="█"; done
  R5_BAR+="${D}"
  for ((i=0; i<R5_EMPTY; i++)); do R5_BAR+="░"; done
  R5_BAR+="${M}▌${N}"
  RATE_5H_BAR=" ${D}│${N} ⏱️${R5_BAR}${R5C}${R5}%${N}"
fi
RATE_7D_BAR=""
if [ -n "$RATE_7D" ]; then
  R7=${RATE_7D%.*}; R7=${R7:-0}
  R7_FILLED=$(( R7 * 6 / 100 )); [ $R7_FILLED -gt 6 ] && R7_FILLED=6
  R7_EMPTY=$(( 6 - R7_FILLED ))
  if [ "$R7" -ge 80 ]; then R7C="${H5}"
  elif [ "$R7" -ge 50 ]; then R7C="${H4}"
  else R7C='\033[38;5;77m'; fi
  R7_BAR="${M}▐${R7C}"
  for ((i=0; i<R7_FILLED; i++)); do R7_BAR+="█"; done
  R7_BAR+="${D}"
  for ((i=0; i<R7_EMPTY; i++)); do R7_BAR+="░"; done
  R7_BAR+="${M}▌${N}"
  RATE_7D_BAR=" ${D}│${N} 📅${R7_BAR}${R7C}${R7}%${N}"
fi

# ── Cost color (green/yellow/red) ──────────────────────────────────────────
COST_NUM=${COST%.*}; COST_NUM=${COST_NUM:-0}
if [ "$COST_NUM" -ge 5 ] 2>/dev/null; then COST_C="${H5}"
elif [ "$COST_NUM" -ge 2 ] 2>/dev/null; then COST_C="${H4}"
else COST_C="${W}"; fi

# ── Output ──────────────────────────────────────────────────────────────────
# ━━ CCC2.1.0│🔥Opus4.6-1M│🔑gAA│🧠▐██░░▌45%│⏱️▐██░░▌6%│📅▐██░░▌34%│💰$2.34│↑640K↓694K│⏰8h0m│🎯357│📋CC-150│📂project
echo -e "${D}━━${N} ${C}${CC_LABEL}${N} ${D}│${N} ${STATUS_EMOJI}${C}${MODEL_SHORT}${N}${KEY_STR} ${D}│${N} 🧠${BAR} ${D}│${N}${RATE_5H_BAR}${RATE_7D_BAR} ${D}│${N} 💰${COST_C}${COST_FMT}${N} ${D}│${N} ${C}↑${N}${W}${IN_FMT}${N}${C}↓${N}${W}${OUT_FMT}${N} ${D}│${N} ⏰${D}${DUR_FMT}${N}${LINEAR_STR}${SKILL_STR} ${D}│${N} 📂${GR}${PROJ_SHORT}${N}"
