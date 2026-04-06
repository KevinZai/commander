#!/bin/bash
# ============================================================================
# CC Commander — Terminal Art Library
# ============================================================================
# Source this file in any shell script for consistent Kit branding.
#   source "$(dirname "$0")/lib/terminal-art.sh"
#
# All functions respect these env vars:
#   CC_NO_COLOR=1        Disable all ANSI colors (also: KZ_NO_COLOR)
#   CC_NO_ANIMATION=1    Disable intro animation and typewriter effects (also: KZ_NO_ANIMATION)
#   CC_INTRO_DURATION=N  Override intro animation duration (seconds, default: 2) (also: KZ_RAIN_DURATION)
# ============================================================================

# ── Color Palette (256-color ANSI) ─────────────────────────────────────────

if [[ "${CC_NO_COLOR:-}" == "1" ]] || [[ "${KZ_NO_COLOR:-}" == "1" ]] || [[ ! -t 1 ]] || [[ "${TERM:-}" == "dumb" ]]; then
  # No color mode
  M_BRIGHT="" M_MID="" M_DIM="" M_FADE=""
  M_WHITE="" M_CYAN="" M_AMBER="" M_RED="" M_GRAY=""
  M_BOLD="" M_ITALIC="" M_UNDERLINE="" NC=""
  M_BG_DIM="" M_BG_DARK=""
else
  M_BRIGHT='\033[38;5;172m'   # Amber — headings, active elements
  M_MID='\033[38;5;145m'      # Gray — body text, borders
  M_DIM='\033[38;5;240m'      # Dim gray — background, shadows
  M_FADE='\033[38;5;130m'     # Dark amber — gradient transitions
  M_WHITE='\033[38;5;255m'    # #EEEEEE — key values, names
  M_CYAN='\033[38;5;99m'      # Indigo — links, references
  M_AMBER='\033[38;5;214m'    # #FFAF00 — warnings
  M_RED='\033[38;5;196m'      # #FF0000 — errors
  M_GRAY='\033[38;5;238m'     # #444444 — inactive/completed
  M_BOLD='\033[1m'
  M_ITALIC='\033[3m'
  M_UNDERLINE='\033[4m'
  NC='\033[0m'
  M_BG_DIM='\033[48;5;233m'   # Dark background for panels
  M_BG_DARK='\033[48;5;232m'  # Darker background
fi

# ── Utility ────────────────────────────────────────────────────────────────

cc_term_width() {
  local w
  w=$(tput cols 2>/dev/null || echo 80)
  echo "$w"
}
kz_term_width() { cc_term_width "$@"; }

cc_can_animate() {
  [[ "${CC_NO_ANIMATION:-}" != "1" ]] && [[ "${KZ_NO_ANIMATION:-}" != "1" ]] && [[ -t 1 ]] && [[ "${TERM:-}" != "dumb" ]] && \
  [[ -z "${CI:-}" ]] && [[ -z "${GITHUB_ACTIONS:-}" ]] && [[ -z "${JENKINS_URL:-}" ]]
}
kz_can_animate() { cc_can_animate "$@"; }

cc_repeat_char() {
  local char="$1" count="$2"
  printf '%*s' "$count" '' | tr ' ' "$char"
}
kz_repeat_char() { cc_repeat_char "$@"; }

# ── Intro Animation ──────────────────────────────────────────────────────

cc_intro_animation() {
  local duration="${1:-${CC_INTRO_DURATION:-${KZ_RAIN_DURATION:-2}}}"

  cc_can_animate || return 0

  local cols rows
  cols=$(tput cols 2>/dev/null || echo 80)
  rows=$(tput lines 2>/dev/null || echo 24)

  # Character sets
  local ascii_chars='0123456789@#$%&*+=<>?~^|/\'
  local kata_chars='アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン'

  # Test katakana support — fall back to ASCII
  local chars="$kata_chars"
  if ! printf '\xe3\x82\xa2' 2>/dev/null | grep -q 'ア' 2>/dev/null; then
    chars="$ascii_chars"
  fi
  local char_len=${#chars}

  # Drop state arrays
  declare -a drop_y drop_speed drop_active
  for ((i=0; i<cols; i++)); do
    drop_y[$i]=0
    drop_speed[$i]=$(( (RANDOM % 3) + 1 ))
    drop_active[$i]=$(( RANDOM % 3 == 0 ? 1 : 0 ))
  done

  # Save screen and hide cursor
  tput smcup 2>/dev/null
  tput civis 2>/dev/null
  printf '\033[2J\033[H'  # Clear screen

  local end_time=$(( $(date +%s) + duration ))
  local frame=0

  while [[ $(date +%s) -lt $end_time ]]; do
    for ((c=0; c<cols; c+=2)); do  # Skip every other column for performance
      # Spawn new drops
      if [[ ${drop_active[$c]} -eq 0 ]] && (( RANDOM % 8 == 0 )); then
        drop_y[$c]=0
        drop_speed[$c]=$(( (RANDOM % 3) + 1 ))
        drop_active[$c]=1
      fi

      if [[ ${drop_active[$c]} -eq 1 ]]; then
        local y=${drop_y[$c]}
        local ch_idx=$(( RANDOM % char_len ))
        local ch="${chars:$ch_idx:1}"

        # Head (bright)
        if (( y >= 0 && y < rows )); then
          printf "\033[%d;%dH${M_BRIGHT}%s${NC}" "$((y+1))" "$((c+1))" "$ch"
        fi

        # Trail (mid, 1 behind)
        if (( y-1 >= 0 && y-1 < rows )); then
          local tr_idx=$(( RANDOM % char_len ))
          printf "\033[%d;%dH${M_MID}%s${NC}" "$y" "$((c+1))" "${chars:$tr_idx:1}"
        fi

        # Fade (dim, 3 behind)
        if (( y-3 >= 0 && y-3 < rows )); then
          local fd_idx=$(( RANDOM % char_len ))
          printf "\033[%d;%dH${M_DIM}%s${NC}" "$((y-2))" "$((c+1))" "${chars:$fd_idx:1}"
        fi

        # Erase (far behind)
        if (( y-6 >= 0 && y-6 < rows )); then
          printf "\033[%d;%dH " "$((y-5))" "$((c+1))"
        fi

        # Advance
        drop_y[$c]=$(( y + ${drop_speed[$c]} ))

        # Despawn if off screen
        if (( ${drop_y[$c]} > rows + 8 )); then
          drop_active[$c]=0
        fi
      fi
    done

    sleep 0.04
    ((frame++))
  done

  # Restore screen
  tput rmcup 2>/dev/null
  tput cnorm 2>/dev/null
}
kz_matrix_rain() { cc_intro_animation "$@"; }
cc_matrix_rain() { cc_intro_animation "$@"; }

# ── ASCII Banners ──────────────────────────────────────────────────────────

cc_banner() {
  local w
  w=$(cc_term_width)

  if (( w < 55 )); then
    cc_mini_banner
    return
  fi

  echo ""
  echo -e "${M_MID}┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓${NC}"
  echo -e "${M_MID}┃${NC}                                                     ${M_MID}┃${NC}"
  echo -e "${M_MID}┃${NC}   ${M_BRIGHT}╔╗ ╦╔╗ ╦  ╔═╗${NC}                                  ${M_MID}┃${NC}"
  echo -e "${M_MID}┃${NC}   ${M_BRIGHT}╠╩╗║╠╩╗║  ║╣${NC}                                   ${M_MID}┃${NC}"
  echo -e "${M_MID}┃${NC}   ${M_BRIGHT}╚═╝╩╚═╝╩═╝╚═╝${NC}                                  ${M_MID}┃${NC}"
  echo -e "${M_MID}┃${NC}                                                     ${M_MID}┃${NC}"
  echo -e "${M_MID}┃${NC}   ${M_WHITE}CC Commander${NC}  ${M_DIM}v2.1.0${NC}                              ${M_MID}┃${NC}"
  echo -e "${M_MID}┃${NC}   ${M_DIM}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}   ${M_MID}┃${NC}"
  echo -e "${M_MID}┃${NC}   ${M_CYAN}by Kevin Z${NC}  ${M_DIM}//${NC}  ${M_WHITE}350+ Skills. One Install.${NC}     ${M_MID}┃${NC}"
  echo -e "${M_MID}┃${NC}                                                     ${M_MID}┃${NC}"
  echo -e "${M_MID}┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛${NC}"
  echo ""
}
kz_banner() { cc_banner "$@"; }

cc_mini_banner() {
  echo ""
  echo -e "${M_MID}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "  CC Commander v2.1.0${NC}  ${M_CYAN}CC Commander — by Kevin Z${NC}"
  echo -e "${M_MID}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo ""
}
kz_mini_banner() { cc_mini_banner "$@"; }

# ── Section Headers ────────────────────────────────────────────────────────

cc_section_header() {
  local title="$1"
  local w
  w=$(cc_term_width)
  local title_len=${#title}
  local pad=$(( (w - title_len - 6) / 2 ))
  (( pad < 2 )) && pad=2
  local left=$(cc_repeat_char '━' "$pad")
  local right=$(cc_repeat_char '━' "$pad")
  echo ""
  echo -e "${M_MID}${left}${NC} ${M_BRIGHT}[ ${title} ]${NC} ${M_MID}${right}${NC}"
  echo ""
}
kz_section_header() { cc_section_header "$@"; }

# ── Status Line ────────────────────────────────────────────────────────────

cc_status_line() {
  local icon="$1" msg="$2" color="${3:-}"
  local icon_color=""
  case "$icon" in
    "✓"|"done")    icon="✓"; icon_color="$M_BRIGHT" ;;
    "✗"|"error")   icon="✗"; icon_color="$M_RED" ;;
    "!"|"warn")    icon="!"; icon_color="$M_AMBER" ;;
    "►"|"active")  icon="►"; icon_color="$M_CYAN" ;;
    "·"|"info")    icon="·"; icon_color="$M_DIM" ;;
    *)             icon_color="$M_DIM" ;;
  esac
  echo -e "  ${icon_color}${icon}${NC} ${color}${msg}${NC}"
}
kz_status_line() { cc_status_line "$@"; }

# ── Progress Bar ───────────────────────────────────────────────────────────

cc_progress_bar() {
  local current="$1" total="$2" label="${3:-}"
  local bar_width=20
  local filled=$(( current * bar_width / total ))
  local empty=$(( bar_width - filled ))

  local bar_filled=$(cc_repeat_char '█' "$filled")
  local bar_empty=$(cc_repeat_char '░' "$empty")

  echo -e "  ${M_MID}▐${M_BRIGHT}${bar_filled}${M_DIM}${bar_empty}${M_MID}▌${NC}  ${M_WHITE}${current}/${total}${NC}  ${M_DIM}${label}${NC}"
}
kz_progress_bar() { cc_progress_bar "$@"; }

# ── Typewriter Effect ──────────────────────────────────────────────────────

cc_typewriter() {
  local text="$1" delay="${2:-0.015}" color="${3:-$M_DIM}"

  if ! cc_can_animate; then
    echo -e "${color}${text}${NC}"
    return
  fi

  printf "${color}"
  local i
  for (( i=0; i<${#text}; i++ )); do
    printf '%s' "${text:$i:1}"
    sleep "$delay"
  done
  printf "${NC}\n"
}
kz_typewriter() { cc_typewriter "$@"; }

# ── Kit Summary Card ─────────────────────────────────────────────────────

cc_kit_summary() {
  echo ""
  echo -e "${M_MID}┌─────────────────────────────────────────────────────┐${NC}"
  echo -e "${M_MID}│${NC}  ${M_BRIGHT}${M_BOLD}THE KEVIN Z METHOD${NC}                                  ${M_MID}│${NC}"
  echo -e "${M_MID}│${NC}                                                     ${M_MID}│${NC}"
  echo -e "${M_MID}│${NC}  ${M_WHITE}Golden Rules:${NC}                                       ${M_MID}│${NC}"
  echo -e "${M_MID}│${NC}  ${M_CYAN}1.${NC} Context is King — structure > freestyle           ${M_MID}│${NC}"
  echo -e "${M_MID}│${NC}  ${M_CYAN}2.${NC} Skills > Prompts — load, don't type               ${M_MID}│${NC}"
  echo -e "${M_MID}│${NC}  ${M_CYAN}3.${NC} Plan Before Build — evals → spec → code           ${M_MID}│${NC}"
  echo -e "${M_MID}│${NC}  ${M_CYAN}4.${NC} Verify Everything — trust but verify              ${M_MID}│${NC}"
  echo -e "${M_MID}│${NC}  ${M_CYAN}5.${NC} Learn From Mistakes — lessons.md is sacred        ${M_MID}│${NC}"
  echo -e "${M_MID}│${NC}                                                     ${M_MID}│${NC}"
  echo -e "${M_MID}│${NC}  ${M_WHITE}Build Types:${NC}                                        ${M_MID}│${NC}"
  echo -e "${M_MID}│${NC}  ${M_BRIGHT}QUICK${NC} <4h  ${M_DIM}│${NC}  ${M_BRIGHT}DEEP${NC} 1-5d  ${M_DIM}│${NC}  ${M_BRIGHT}SAAS${NC} 1-4w          ${M_MID}│${NC}"
  echo -e "${M_MID}│${NC}  ${M_BRIGHT}OVERNIGHT${NC} 6-12h autonomous                        ${M_MID}│${NC}"
  echo -e "${M_MID}│${NC}                                                     ${M_MID}│${NC}"
  echo -e "${M_MID}│${NC}  ${M_DIM}Full Guide: ~/.claude/BIBLE.md${NC}                       ${M_MID}│${NC}"
  echo -e "${M_MID}│${NC}  ${M_DIM}Cheatsheet: ~/.claude/CHEATSHEET.md${NC}                  ${M_MID}│${NC}"
  echo -e "${M_MID}└─────────────────────────────────────────────────────┘${NC}"
  echo ""
}
kz_bible_summary() { cc_kit_summary "$@"; }
cc_bible_summary() { cc_kit_summary "$@"; }

# ── Next Steps Panel ───────────────────────────────────────────────────────

cc_next_steps() {
  local mode="${1:-staff}"

  echo -e "${M_MID}┌─────────────────────────────────────────────────────┐${NC}"
  echo -e "${M_MID}│${NC}  ${M_BRIGHT}${M_BOLD}NEXT STEPS${NC}                                          ${M_MID}│${NC}"
  echo -e "${M_MID}│${NC}                                                     ${M_MID}│${NC}"
  if [[ "$mode" == "kevin" ]]; then
    echo -e "${M_MID}│${NC}  ${M_WHITE}1.${NC} ${M_CYAN}claude${NC}                                            ${M_MID}│${NC}"
    echo -e "${M_MID}│${NC}     Start Claude Code (API key already set)         ${M_MID}│${NC}"
    echo -e "${M_MID}│${NC}                                                     ${M_MID}│${NC}"
    echo -e "${M_MID}│${NC}  ${M_WHITE}2.${NC} ${M_CYAN}/init${NC}                                             ${M_MID}│${NC}"
    echo -e "${M_MID}│${NC}     Launch the CC Project Wizard                    ${M_MID}│${NC}"
    echo -e "${M_MID}│${NC}                                                     ${M_MID}│${NC}"
    echo -e "${M_MID}│${NC}  ${M_WHITE}3.${NC} ${M_CYAN}/plan${NC}                                             ${M_MID}│${NC}"
    echo -e "${M_MID}│${NC}     Spec-first planning for any feature             ${M_MID}│${NC}"
  else
    echo -e "${M_MID}│${NC}  ${M_WHITE}1.${NC} ${M_CYAN}export ANTHROPIC_API_KEY='your-key'${NC}                ${M_MID}│${NC}"
    echo -e "${M_MID}│${NC}     Set your API key (or use Claude Max)            ${M_MID}│${NC}"
    echo -e "${M_MID}│${NC}                                                     ${M_MID}│${NC}"
    echo -e "${M_MID}│${NC}  ${M_WHITE}2.${NC} ${M_CYAN}claude${NC}                                            ${M_MID}│${NC}"
    echo -e "${M_MID}│${NC}     Start Claude Code                               ${M_MID}│${NC}"
    echo -e "${M_MID}│${NC}                                                     ${M_MID}│${NC}"
    echo -e "${M_MID}│${NC}  ${M_WHITE}3.${NC} ${M_CYAN}/init${NC}                                             ${M_MID}│${NC}"
    echo -e "${M_MID}│${NC}     Launch the CC Project Wizard                    ${M_MID}│${NC}"
  fi
  echo -e "${M_MID}│${NC}                                                     ${M_MID}│${NC}"
  echo -e "${M_MID}│${NC}  ${M_DIM}450+ skills  │  80+ commands  │  11 CCC domains${NC}      ${M_MID}│${NC}"
  echo -e "${M_MID}│${NC}  ${M_DIM}37 hooks     │  3 templates  │  CC Commander${NC}    ${M_MID}│${NC}"
  echo -e "${M_MID}└─────────────────────────────────────────────────────┘${NC}"
  echo ""
}
kz_next_steps() { cc_next_steps "$@"; }

# ── Farewell ───────────────────────────────────────────────────────────────

cc_farewell() {
  echo ""
  if cc_can_animate; then
    # Cascading fade effect
    local lines=(
      "  ${M_BRIGHT}Now go build something amazing.${NC}"
      "  ${M_MID}Your code awaits.${NC}"
      ""
      "  ${M_DIM}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
      "  ${M_DIM}CC Commander — by Kevin Z  //  github.com/KevinZai/cc-commander${NC}"
      "  ${M_DIM}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    )
    for line in "${lines[@]}"; do
      echo -e "$line"
      sleep 0.15
    done
  else
    echo -e "  ${M_DIM}CC Commander — by Kevin Z  //  github.com/KevinZai/cc-commander${NC}"
  fi
  echo ""
}
kz_farewell() { cc_farewell "$@"; }

# ── Init Intro ─────────────────────────────────────────────────────────────

cc_init_intro() {
  echo ""
  echo -e "${M_MID}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "  ${M_BRIGHT}${M_BOLD}KIT INIT${NC}  ${M_DIM}//${NC}  ${M_CYAN}CHOOSE YOUR ADVENTURE${NC}"
  echo -e "${M_MID}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo ""
  echo -e "${M_MID}┌──────────────────────────────────────────────────────┐${NC}"
  echo -e "${M_MID}│${NC}                                                      ${M_MID}│${NC}"
  echo -e "${M_MID}│${NC}  ${M_WHITE}Welcome to the Kit Project Initializer.${NC}               ${M_MID}│${NC}"
  echo -e "${M_MID}│${NC}                                                      ${M_MID}│${NC}"
  echo -e "${M_MID}│${NC}  I'll ask you a series of questions to configure     ${M_MID}│${NC}"
  echo -e "${M_MID}│${NC}  your perfect development environment. Every         ${M_MID}│${NC}"
  echo -e "${M_MID}│${NC}  answer shapes your CLAUDE.md, skills, and workflow. ${M_MID}│${NC}"
  echo -e "${M_MID}│${NC}                                                      ${M_MID}│${NC}"
  echo -e "${M_MID}│${NC}  ${M_CYAN}►${NC} ${M_WHITE}Phase 1:${NC} Project Identity        ${M_DIM}(3 questions)${NC}   ${M_MID}│${NC}"
  echo -e "${M_MID}│${NC}  ${M_CYAN}►${NC} ${M_WHITE}Phase 2:${NC} Build Type              ${M_DIM}(THE question)${NC}  ${M_MID}│${NC}"
  echo -e "${M_MID}│${NC}  ${M_CYAN}►${NC} ${M_WHITE}Phase 3:${NC} Domain Deep-Dive        ${M_DIM}(2-5 questions)${NC} ${M_MID}│${NC}"
  echo -e "${M_MID}│${NC}  ${M_CYAN}►${NC} ${M_WHITE}Phase 4:${NC} Output Generation       ${M_DIM}(automatic)${NC}    ${M_MID}│${NC}"
  echo -e "${M_MID}│${NC}                                                      ${M_MID}│${NC}"
  echo -e "${M_MID}│${NC}  ${M_DIM}Estimated time: ~3 minutes${NC}                          ${M_MID}│${NC}"
  echo -e "${M_MID}│${NC}                                                      ${M_MID}│${NC}"
  echo -e "${M_MID}└──────────────────────────────────────────────────────┘${NC}"
  echo ""
}
kz_init_intro() { cc_init_intro "$@"; }

# ── Flow Display ───────────────────────────────────────────────────────────

cc_flow_display() {
  local current="$1" total="$2"
  local phases=("IDENTITY" "BUILD TYPE" "DEEP-DIVE" "GENERATE")
  local i

  echo ""
  printf "  "
  for ((i=0; i<total; i++)); do
    if (( i < current )); then
      printf "${M_BRIGHT}● ${phases[$i]}${NC}"
    elif (( i == current )); then
      printf "${M_CYAN}◉ ${phases[$i]}${NC}"
    else
      printf "${M_GRAY}○ ${phases[$i]}${NC}"
    fi
    if (( i < total - 1 )); then
      printf " ${M_DIM}→${NC} "
    fi
  done
  echo ""

  # Progress bar
  local filled=$(( (current + 1) * 100 / total ))
  cc_progress_bar "$((current + 1))" "$total" "Phase $((current + 1)) of $total"
  echo ""
}
kz_flow_display() { cc_flow_display "$@"; }

# ── Mega-Skills Summary ───────────────────────────────────────────────────

cc_mega_skills_display() {
  echo -e "${M_MID}┌─────────────────────────────────────────────────────┐${NC}"
  echo -e "${M_MID}│${NC}  ${M_BRIGHT}${M_BOLD}CC MEGA-SKILLS${NC}  ${M_DIM}Load ONE, get the entire domain${NC}    ${M_MID}│${NC}"
  echo -e "${M_MID}│${NC}                                                     ${M_MID}│${NC}"
  echo -e "${M_MID}│${NC}  ${M_CYAN}mega-seo${NC}       ${M_DIM}─${NC} ${M_WHITE}19${NC} SEO skills in one            ${M_MID}│${NC}"
  echo -e "${M_MID}│${NC}  ${M_CYAN}mega-design${NC}    ${M_DIM}─${NC} ${M_WHITE}35+${NC} design/animation skills     ${M_MID}│${NC}"
  echo -e "${M_MID}│${NC}  ${M_CYAN}mega-testing${NC}   ${M_DIM}─${NC} ${M_WHITE}15${NC} testing skills in one        ${M_MID}│${NC}"
  echo -e "${M_MID}│${NC}  ${M_CYAN}mega-marketing${NC} ${M_DIM}─${NC} ${M_WHITE}46${NC} marketing skills in one      ${M_MID}│${NC}"
  echo -e "${M_MID}│${NC}  ${M_CYAN}mega-saas${NC}      ${M_DIM}─${NC} ${M_WHITE}20${NC} SaaS building skills        ${M_MID}│${NC}"
  echo -e "${M_MID}│${NC}  ${M_CYAN}mega-devops${NC}    ${M_DIM}─${NC} ${M_WHITE}20${NC} DevOps skills in one        ${M_MID}│${NC}"
  echo -e "${M_MID}│${NC}                                                     ${M_MID}│${NC}"
  echo -e "${M_MID}└─────────────────────────────────────────────────────┘${NC}"
}
kz_mega_skills_display() { cc_mega_skills_display "$@"; }

# ── Celebrate ─────────────────────────────────────────────────────────────
cc_celebrate() {
  [ "${CC_NO_COLOR:-}" = "1" ] && return 0
  local style="${1:-random}"
  [ "$style" = "random" ] && style=$(echo -e "confetti\nfireworks\nvictory\nrocket" | sort -R | head -1)
  case "$style" in
    confetti)  echo -e "\n  ${M_BRIGHT}🎉  ✨  🎊  ✨  🎉${NC}\n  ${M_CYAN}Another one shipped.${NC}\n" ;;
    fireworks) echo -e "\n  ${M_DIM}˚ ₊ ‧${NC} ${M_BRIGHT}⁺${NC} ${M_DIM}˚ ₊${NC} ${M_BRIGHT}‧ ⁺${NC} ${M_DIM}·${NC} ${M_CYAN}✦${NC}\n  ${M_BRIGHT}BOOM.${NC} ${M_DIM}That's a wrap.${NC}\n" ;;
    victory)   echo -e "\n  ${M_MID}╔══════════════╗${NC}\n  ${M_MID}║${NC} ${M_BRIGHT}${M_BOLD} SHIPPED! 🚀 ${NC} ${M_MID}║${NC}\n  ${M_MID}╚══════════════╝${NC}\n" ;;
    rocket)    echo -e "\n  ${M_BRIGHT}🚀${NC} ${M_MID}━━━━━━━━━━━━━${NC} ${M_CYAN}LAUNCH!${NC}\n" ;;
  esac
}
kz_celebrate() { cc_celebrate "$@"; }

cc_checkmark() {
  local msg="${1:-Done}"
  if [ "${CC_NO_ANIMATION:-}" = "1" ] || [ "${CC_NO_COLOR:-}" = "1" ]; then
    echo -e "  ${M_BRIGHT}✓${NC} ${M_WHITE}${msg}${NC}"
  else
    printf "  ${M_DIM}○${NC} ${M_WHITE}${msg}${NC}"; sleep 0.3; printf "\r  ${M_BRIGHT}✓${NC} ${M_WHITE}${msg}${NC}\n"
  fi
}
kz_checkmark() { cc_checkmark "$@"; }

cc_progress_checklist() {
  for item in "$@"; do
    local prefix="${item%%:*}" text="${item#*:}"
    case "$prefix" in
      done)    echo -e "  ${M_BRIGHT}✓${NC} ${M_DIM}${text}${NC}" ;;
      current) echo -e "  ${M_CYAN}◉${NC} ${M_WHITE}${text}${NC}" ;;
      pending) echo -e "  ${M_DIM}○ ${text}${NC}" ;;
    esac
  done
}
kz_progress_checklist() { cc_progress_checklist "$@"; }

cc_streak_display() {
  local count="${1:-0}" fires="💤"
  [ "$count" -ge 7 ] && fires="🔥🔥🔥"
  [ "$count" -ge 3 ] && [ "$count" -lt 7 ] && fires="🔥🔥"
  [ "$count" -ge 1 ] && [ "$count" -lt 3 ] && fires="🔥"
  echo -e "  ${M_BRIGHT}${fires}${NC} ${M_WHITE}${count}-day streak${NC}"
}
kz_streak_display() { cc_streak_display "$@"; }

cc_random_quip() {
  local quips=("Ship it before it ships you." "That's what I call AI-powered recklessness." "Another one. DJ Khaled voice." "Veni, vidi, vibe-coded." "Your terminal called. It's impressed." "Built different. Literally." "Zero to deployed, no coffee needed." "The commit graph is modern art." "Context is milk. You're fresh." "CLAUDE.md appreciates the investment." "Speed run any%." "The keyboard didn't even feel that." "Less meetings, more shipping.")
  local idx=$((RANDOM % ${#quips[@]}))
  echo -e "  ${M_DIM}\"${quips[$idx]}\"${NC}"
}
kz_random_quip() { cc_random_quip "$@"; }

cc_mini_dashboard() {
  echo -e "  ${M_MID}┌──────────────────────────────────────────┐${NC}"
  echo -e "  ${M_MID}│${NC}  ${M_BRIGHT}${M_BOLD}SESSION STATS${NC}                             ${M_MID}│${NC}"
  for pair in "$@"; do
    local key="${pair%%:*}" val="${pair#*:}"
    printf "  ${M_MID}│${NC}  ${M_DIM}%-16s${NC} ${M_WHITE}%-23s${NC} ${M_MID}│${NC}\n" "$key" "$val"
  done
  echo -e "  ${M_MID}└──────────────────────────────────────────┘${NC}"
}
kz_mini_dashboard() { cc_mini_dashboard "$@"; }
