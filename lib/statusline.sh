#!/bin/bash
# ============================================================================
# CC Commander — Status Line v3 (Theme-Aware, Time Remaining)
# ============================================================================
# Persistent footer with heat-mapped context bar, rate limit bars with
# time-remaining, session elapsed time, theme support, ClaudeSwap integration.
# Receives JSON session data on stdin from Claude Code.
#
# Install:
#   Add to ~/.claude/settings.json:
#   "statusLine": {
#     "type": "command",
#     "command": "~/.claude/lib/statusline.sh",
#     "padding": 1
#   }
# ============================================================================

# ── Colors — heat-map palette ─────────────────────────────────────────────
H1='\033[38;5;51m'   # cyan (0-30%)
H2='\033[38;5;39m'   # cyan-blue (30-50%)
H3='\033[38;5;198m'  # magenta (50-70%)
H4='\033[38;5;208m'  # orange (70-85%)
H5='\033[38;5;196m'  # red (85%+)
W='\033[38;5;255m'   # white
D='\033[38;5;240m'   # dim gray
M='\033[38;5;145m'   # mid gray
GR='\033[38;5;238m'  # dark gray
B='\033[1m'          # bold
N='\033[0m'          # reset

# ── Theme color ───────────────────────────────────────────────────────────
TC='\033[38;5;51m'   # cyan default for non-label elements
case "${CC_THEME:-${KZ_THEME:-}}" in
  oled)   TC='\033[38;5;15m'  ;;
  matrix) TC='\033[38;5;46m'  ;;
esac

# ── HSL rainbow gradient for CCC label (matches TUI menu selected item) ──
# Uses same HSL(hue, 0.9, 0.65) formula as commander/tui.js line 351-352.
# Vivid full-spectrum stops: red → yellow → green → cyan → blue → magenta.
rainbow_gradient() {
  local text="$1"
  local len=${#text}
  local ESC=$'\033'
  local out=""
  # HSL(h, 0.9, 0.65) → RGB at h=0,60,120,180,240,300 (full spectrum, no wrap)
  local -a R=(246 246  85  85  85 246)
  local -a G=( 85 246 246 246  85  85)
  local -a BI=(85  85  85 246 246 246)
  local stops=$(( ${#R[@]} - 1 ))
  for ((i=0; i<len; i++)); do
    local pos=$(( i * stops * 100 / (len > 1 ? len - 1 : 1) ))
    local seg=$(( pos / 100 ))
    [ $seg -ge $stops ] && seg=$(( stops - 1 ))
    local frac=$(( pos - seg * 100 ))
    local r=$(( R[seg] + (R[seg+1] - R[seg]) * frac / 100 ))
    local g=$(( G[seg] + (G[seg+1] - G[seg]) * frac / 100 ))
    local b=$(( BI[seg] + (BI[seg+1] - BI[seg]) * frac / 100 ))
    out+="${ESC}[1;38;2;${r};${g};${b}m${text:$i:1}"
  done
  printf '%b%b' "$out" "${N}"
}

# ── Read JSON from stdin ──────────────────────────────────────────────────
INPUT=$(cat)

if ! command -v jq &>/dev/null; then
  echo -e "${D}━━ ${TC}CC${N} ${D}━ jq required${N}"
  exit 0
fi

# ── Parse fields (single jq call for performance) ─────────────────────────
eval "$(echo "$INPUT" | jq -r '
  "CTX_PCT=\(.context_window.used_percentage // 0)",
  "MODEL_ID='\''\(.model.id // "")'\''",
  "MODEL='\''\(.model.display_name // "unknown")'\''",
  "COST=\(.cost.total_cost_usd // 0)",
  "IN_TOK=\(.context_window.total_input_tokens // 0)",
  "OUT_TOK=\(.context_window.total_output_tokens // 0)",
  "DURATION=\(.cost.total_duration_ms // 0)",
  "PROJECT='\''\(.workspace.current_dir // "?")'\''",
  "PROJECT_DIR='\''\(.workspace.project_dir // .workspace.current_dir // "")'\''",
  "AGENT='\''\(.agent.name // "")'\''",
  "RATE_5H_RESET=\(.rate_limits.five_hour.resets_at // "")",
  "RATE_7D_RESET=\(.rate_limits.seven_day.resets_at // "")",
  "RATE_5H=\(.rate_limits.five_hour.used_percentage // "")",
  "RATE_7D=\(.rate_limits.seven_day.used_percentage // "")",
  "TOOL_USE='\''\(.tool_use.name // "")'\'';"
' 2>/dev/null)"

# ── ClaudeSwap failover for rate limits ───────────────────────────────────
RATE_5H_REJECTED=0
RATE_7D_REJECTED=0
SWAP_5H_RESET=""
SWAP_7D_RESET=""

if [ -z "$RATE_5H" ] || [ -z "$RATE_7D" ]; then
  SWAP_STATE="$HOME/.config/claudeswap-state.json"
  if [ -f "$SWAP_STATE" ]; then
    ACTIVE_ACCT=$(jq -r '.accounts | to_entries | sort_by(.value.last_used) | last | .key' "$SWAP_STATE" 2>/dev/null)
    if [ -n "$ACTIVE_ACCT" ] && [ "$ACTIVE_ACCT" != "null" ]; then
      eval "$(jq -r --arg a "$ACTIVE_ACCT" '
        .accounts[$a] // {} |
        "ACCT_5H_STATUS=\(.five_hour_status // "")",
        "ACCT_7D_STATUS=\(.seven_day_status // "")",
        "ACCT_5H_UTIL=\(.five_hour_utilization // "")",
        "ACCT_7D_UTIL=\(.seven_day_utilization // "")",
        "SWAP_5H_RESET=\(.five_hour_reset // "")",
        "SWAP_7D_RESET=\(.seven_day_reset // "")"
      ' "$SWAP_STATE" 2>/dev/null)"

      # Staleness check: if reset timestamp is in the past, data is stale
      NOW_EPOCH=$(date +%s)
      IS_5H_STALE=0
      IS_7D_STALE=0
      [ -n "$SWAP_5H_RESET" ] && [ "$SWAP_5H_RESET" != "null" ] && [ "$SWAP_5H_RESET" -lt "$NOW_EPOCH" ] 2>/dev/null && IS_5H_STALE=1
      [ -n "$SWAP_7D_RESET" ] && [ "$SWAP_7D_RESET" != "null" ] && [ "$SWAP_7D_RESET" -lt "$NOW_EPOCH" ] 2>/dev/null && IS_7D_STALE=1

      if [ -z "$RATE_5H" ] && [ "$IS_5H_STALE" = "0" ]; then
        if [ "$ACCT_5H_STATUS" = "rejected" ]; then
          RATE_5H_REJECTED=1
        elif [ -n "$ACCT_5H_UTIL" ] && [ "$ACCT_5H_UTIL" != "null" ]; then
          RATE_5H=$(echo "$ACCT_5H_UTIL * 100" | bc 2>/dev/null)
        fi
      fi
      if [ -z "$RATE_7D" ] && [ "$IS_7D_STALE" = "0" ]; then
        if [ "$ACCT_7D_STATUS" = "rejected" ]; then
          RATE_7D_REJECTED=1
        elif [ -n "$ACCT_7D_UTIL" ] && [ "$ACCT_7D_UTIL" != "null" ]; then
          RATE_7D=$(echo "$ACCT_7D_UTIL * 100" | bc 2>/dev/null)
        fi
      fi
      # Use swap reset times if not from API
      [ -z "$RATE_5H_RESET" ] && RATE_5H_RESET="$SWAP_5H_RESET"
      [ -z "$RATE_7D_RESET" ] && RATE_7D_RESET="$SWAP_7D_RESET"
    fi
  fi
fi

# ── Helper: format time remaining from epoch seconds ──────────────────────
fmt_remaining() {
  local reset_epoch="$1"
  [ -z "$reset_epoch" ] && return
  local now=$(date +%s)
  # Handle epoch seconds (ClaudeSwap) vs ISO dates (Claude API)
  if [[ "$reset_epoch" =~ ^[0-9]+$ ]]; then
    local diff=$(( reset_epoch - now ))
  else
    local epoch=$(date -j -f "%Y-%m-%dT%H:%M:%S" "${reset_epoch%%.*}" +%s 2>/dev/null || date -d "$reset_epoch" +%s 2>/dev/null)
    [ -z "$epoch" ] && return
    local diff=$(( epoch - now ))
  fi
  [ "$diff" -le 0 ] && return
  local h=$(( diff / 3600 ))
  local m=$(( (diff % 3600) / 60 ))
  if [ "$h" -ge 24 ]; then
    printf '%dd%dh' $(( h / 24 )) $(( h % 24 ))
  elif [ "$h" -gt 0 ]; then
    printf '%dh%dm' "$h" "$m"
  else
    printf '%dm' "$m"
  fi
}

# ── Helper: heat-mapped mini bar ──────────────────────────────────────────
mini_bar() {
  local pct_raw="$1"
  local width="${2:-4}"
  local pct=${pct_raw%.*}; pct=${pct:-0}
  local filled=$(( pct * width / 100 ))
  [ $filled -gt $width ] && filled=$width
  local empty=$(( width - filled ))
  local color
  if [ "$pct" -ge 80 ]; then color="${H5}"
  elif [ "$pct" -ge 50 ]; then color="${H4}"
  else color='\033[38;5;77m'; fi
  local bar="${M}▐${color}"
  for ((i=0; i<filled; i++)); do bar+="█"; done
  bar+="${D}"
  for ((i=0; i<empty; i++)); do bar+="░"; done
  bar+="${M}▌${color}${pct}%${N}"
  printf '%b' "$bar"
}

# ── Context bar (10 chars wide) ───────────────────────────────────────────
CTX_INT=${CTX_PCT%.*}; CTX_INT=${CTX_INT:-0}

heat_color() {
  local pct=$1
  if [ "$pct" -ge 85 ]; then   printf '%b' "${H5}${B}"
  elif [ "$pct" -ge 70 ]; then printf '%b' "${H4}"
  elif [ "$pct" -ge 50 ]; then printf '%b' "${H3}"
  elif [ "$pct" -ge 30 ]; then printf '%b' "${H2}"
  else                         printf '%b' "${H1}"
  fi
}

CTX_W=6
ZC=$(heat_color "$CTX_INT")
CTX_FILLED=$(( CTX_INT * CTX_W / 100 ))
[ $CTX_FILLED -gt $CTX_W ] && CTX_FILLED=$CTX_W
CTX_EMPTY=$(( CTX_W - CTX_FILLED ))
CTX_BAR="${M}▐${ZC}"
for ((i=0; i<CTX_FILLED; i++)); do CTX_BAR+="█"; done
CTX_BAR+="${D}"
for ((i=0; i<CTX_EMPTY; i++)); do CTX_BAR+="░"; done
CTX_BAR+="${M}▌${ZC}${CTX_INT}%${N}"

# ── Format tokens ─────────────────────────────────────────────────────────
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

# ── Format duration ──────────────────────────────────────────────────────
DUR_SEC=$(( DURATION / 1000 ))
if [ "$DUR_SEC" -ge 86400 ]; then
  DUR_FMT="$(( DUR_SEC / 86400 ))d$(( (DUR_SEC % 86400) / 3600 ))h"
elif [ "$DUR_SEC" -ge 3600 ]; then
  DUR_FMT="$(( DUR_SEC / 3600 ))h$(( (DUR_SEC % 3600) / 60 ))m"
elif [ "$DUR_SEC" -ge 60 ]; then
  DUR_FMT="$(( DUR_SEC / 60 ))m$(( DUR_SEC % 60 ))s"
else
  DUR_FMT="${DUR_SEC}s"
fi

# ── Format cost ───────────────────────────────────────────────────────────
COST_FMT=$(printf "\$%.2f" "$COST" 2>/dev/null || echo "\$?")
COST_NUM=${COST%.*}; COST_NUM=${COST_NUM:-0}
if [ "$COST_NUM" -ge 5 ] 2>/dev/null; then COST_C="${H5}"
elif [ "$COST_NUM" -ge 2 ] 2>/dev/null; then COST_C="${H4}"
else COST_C="${W}"; fi

# ── Short model name + status emoji ───────────────────────────────────────
case "$MODEL_ID" in
  *opus*4*6*1m*|*opus*4*6*1M*) MODEL_SHORT="Op4.6-1M" ;;
  *opus*4*6*|*opus-4-6*)        MODEL_SHORT="Op4.6" ;;
  *opus*)                        MODEL_SHORT="Opus" ;;
  *sonnet*4*6*)                  MODEL_SHORT="So4.6" ;;
  *sonnet*)                      MODEL_SHORT="Sonnet" ;;
  *haiku*)                       MODEL_SHORT="Haiku" ;;
  *)                             MODEL_SHORT="$MODEL" ;;
esac

if [ -n "$TOOL_USE" ] && [ "$TOOL_USE" != "null" ]; then
  STATUS_EMOJI="⚡"
elif [ "$OUT_TOK" -ge 50000 ] 2>/dev/null; then
  STATUS_EMOJI="🔥"
else
  STATUS_EMOJI=""
fi

# ── API key hint (lane, active account or key tail) ──────────────────────
# Lane comes from the CLAUDE_CONFIG_DIR basename: ".claude-<lane>" shows
# <lane> (e.g. ~/.claude-ai1 -> ai1); unset or a plain ".claude" dir is the
# primary lane ("pri"). Any other config dir name keeps the older fallbacks
# (ClaudeSwap account, API key tail, n/a).
ccc_lane_from_config_dir() {
  local dir="${1-}" base lane
  if [ -z "$dir" ]; then printf 'pri'; return 0; fi
  while [ "${#dir}" -gt 1 ] && [ "${dir%/}" != "$dir" ]; do dir="${dir%/}"; done
  base="${dir##*/}"
  case "$base" in
    .claude) printf 'pri'; return 0 ;;
    .claude-?*)
      # Keep the hint terminal-safe: printable name characters only, max 12.
      lane=$(printf '%s' "${base#.claude-}" | LC_ALL=C tr -cd 'A-Za-z0-9._-')
      lane="${lane:0:12}"
      [ -n "$lane" ] && printf '%s' "$lane"
      return 0 ;;
  esac
  return 0
}
KEY_HINT="$(ccc_lane_from_config_dir "${CLAUDE_CONFIG_DIR:-}")"
SWAP_STATE_FILE="$HOME/.config/claudeswap-state.json"
if [ -z "$KEY_HINT" ] && [ -f "$SWAP_STATE_FILE" ]; then
  # Show active ClaudeSwap account name (short form)
  SWAP_ACTIVE=$(jq -r '.accounts | to_entries | sort_by(.value.last_used) | last | .key // empty' "$SWAP_STATE_FILE" 2>/dev/null)
  if [ -n "$SWAP_ACTIVE" ]; then
    # Shorten: "max-primary" → "pri", "max-secondary" → "sec"
    case "$SWAP_ACTIVE" in
      *primary*)   KEY_HINT="pri" ;;
      *secondary*) KEY_HINT="sec" ;;
      *)           KEY_HINT="${SWAP_ACTIVE:0:3}" ;;
    esac
  fi
fi
if [ -z "$KEY_HINT" ] && [ -n "$ANTHROPIC_API_KEY" ]; then
  KEY_HINT="${ANTHROPIC_API_KEY: -3}"
fi
[ -z "$KEY_HINT" ] && KEY_HINT="n/a"

# ── Rate limit bars with time remaining ───────────────────────────────────
RATE_STR=""
if [ "$RATE_5H_REJECTED" = "1" ]; then
  RATE_STR="⏱ ${H5}REJ${N}"
elif [ -n "$RATE_5H" ]; then
  R5=${RATE_5H%.*}; R5=${R5:-0}
  R5_REM=$(fmt_remaining "$RATE_5H_RESET")
  if [ "$R5" -ge 80 ] 2>/dev/null; then R5C="${H5}"; elif [ "$R5" -ge 50 ] 2>/dev/null; then R5C="${H4}"; else R5C="${M}"; fi
  RATE_STR="⏱ ${R5C}${R5}%${N}"
  [ -n "$R5_REM" ] && RATE_STR+="${D}[${R5_REM}]${N}"
fi

if [ "$RATE_7D_REJECTED" = "1" ]; then
  [ -n "$RATE_STR" ] && RATE_STR+=" "
  RATE_STR+="📅 ${H5}REJ${N}"
elif [ -n "$RATE_7D" ]; then
  R7=${RATE_7D%.*}; R7=${R7:-0}
  R7_REM=$(fmt_remaining "$RATE_7D_RESET")
  [ -n "$RATE_STR" ] && RATE_STR+=" "
  if [ "$R7" -ge 80 ] 2>/dev/null; then R7C="${H5}"; elif [ "$R7" -ge 50 ] 2>/dev/null; then R7C="${H4}"; else R7C="${M}"; fi
  RATE_STR+="📅 ${R7C}${R7}%${N}"
  [ -n "$R7_REM" ] && RATE_STR+="${D}[${R7_REM}]${N}"
fi

# ── CCC version ───────────────────────────────────────────────────────────
CCC_VER=""
CCC_PLUGIN_CFG_DIR="${CLAUDE_CONFIG_DIR:-$HOME/.claude}"
if [ -f "$CCC_PLUGIN_CFG_DIR/plugins/installed_plugins.json" ]; then
  CCC_PLUGIN_ENTRY=$(jq -c --arg project "$PROJECT_DIR" '
    [.plugins | to_entries[] | select(.key | test("^commander@")) | .value[] | objects] |
    (map(select(.scope == "project" and .projectPath == $project))[0] //
     map(select(.scope == "user"))[0] //
     map(select((.projectPath // $project) == $project))[0]) // empty
  ' "$CCC_PLUGIN_CFG_DIR/plugins/installed_plugins.json" 2>/dev/null)
  if [ -n "$CCC_PLUGIN_ENTRY" ]; then
    CCC_INSTALL_PATH=$(printf '%s\n' "$CCC_PLUGIN_ENTRY" | jq -r '.installPath // empty' 2>/dev/null)
    if [ -n "$CCC_INSTALL_PATH" ] && [ -f "$CCC_INSTALL_PATH/.claude-plugin/plugin.json" ]; then
      CCC_VER=$(jq -r '.version // empty' "$CCC_INSTALL_PATH/.claude-plugin/plugin.json" 2>/dev/null)
    fi
    if [ -z "$CCC_VER" ]; then
      CCC_VER=$(printf '%s\n' "$CCC_PLUGIN_ENTRY" | jq -r '.version // empty' 2>/dev/null)
    fi
  fi
fi
if [ -z "$CCC_VER" ]; then
  PKG_FILE="$HOME/clawd/projects/cc-commander/package.json"
  [ -f "$PKG_FILE" ] && CCC_VER=$(jq -r '.version // empty' "$PKG_FILE" 2>/dev/null)
fi
if [ -z "$CCC_VER" ]; then
  SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
  PKG_FILE="$(dirname "$SCRIPT_DIR")/package.json"
  [ -f "$PKG_FILE" ] && CCC_VER=$(jq -r '.version // empty' "$PKG_FILE" 2>/dev/null)
fi
CC_LABEL="CC"
[ -n "$CCC_VER" ] && CC_LABEL="CCC${CCC_VER%.0}"

# ── Extras (only if present) ──────────────────────────────────────────────
PROJ_SHORT=$(basename "$PROJECT")
SKILL_COUNT=$(ls -d "$HOME/.claude/skills"/*/ 2>/dev/null | wc -l | tr -d ' ')

LINEAR_TICKET=""
STATE_FILE="$HOME/.claude/commander/state.json"
[ -f "$STATE_FILE" ] && LINEAR_TICKET=$(jq -r '.activeSession.linearIssueIdentifier // empty' "$STATE_FILE" 2>/dev/null)

EXTRAS=""
[ -n "$LINEAR_TICKET" ] && EXTRAS+=" ${D}│${N} 📋 ${W}${LINEAR_TICKET}${N}"
[ -n "$AGENT" ] && EXTRAS+=" ${D}│${N} ⚡ ${TC}${AGENT}${N}"

# ── Superfleet segment (own flag: CCC_STATUSLINE_SF=off) ──────────────────
SF_SEG=""
SF_LIB="$(cd "$(dirname "$0")" && pwd)/statusline-superfleet.sh"
if [ "${CCC_STATUSLINE_SF:-on}" != "off" ] && [ -f "$SF_LIB" ] && { [ -n "${SF_RUN_DIR:-}" ] || [ -n "${SF_RUNS_ROOT:-}" ]; }; then
  # shellcheck source=statusline-superfleet.sh
  . "$SF_LIB"
  SF_SEG=$(ccc_sf_segment "$(printf '%s' "$INPUT" | jq -r '.session_id // empty' 2>/dev/null)")
fi

# ── Output ────────────────────────────────────────────────────────────────
OUT="${D}━━${N} $(rainbow_gradient "$CC_LABEL")"
OUT+=" ${D}│${N} ${STATUS_EMOJI}${TC}${MODEL_SHORT}${N}"
OUT+=" ${D}│${N} 🔑 ${M}${KEY_HINT}${N}"
OUT+=" ${D}│${N} 🧠 ${ZC}${CTX_INT}%${N}"
[ -n "$RATE_STR" ] && OUT+=" ${D}│${N} ${RATE_STR}"
OUT+=" ${D}│${N} 💰 ${COST_C}${COST_FMT}${N}"
OUT+=" ${D}│${N} ${TC}↑${W}${IN_FMT}${TC}↓${W}${OUT_FMT}${N}"
OUT+=" ${D}│${N} ⏰ ${D}${DUR_FMT}${N}"
[ "$SKILL_COUNT" -gt 0 ] 2>/dev/null && OUT+=" ${D}│${N} 🎯 ${M}${SKILL_COUNT}${N}"
OUT+="${EXTRAS}"
OUT+=" ${D}│${N} 📂 ${GR}${PROJ_SHORT}${N}"
[ -n "$SF_SEG" ] && OUT+=" ${D}│${N} 🚀 ${W}${SF_SEG}${N}"
echo -e "$OUT"
