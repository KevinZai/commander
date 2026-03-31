#!/bin/bash
# ============================================================================
# CC Commander — Theme System (Shell)
# ============================================================================
# Provides theme color definitions for shell scripts.
# Source this file, then call cc_load_theme to set T_* color variables.
#
# Usage:
#   source "$(dirname "$0")/themes.sh"
#   cc_load_theme
#   echo -e "${T_PRIMARY}Hello${T_RESET}"
#
# Themes: claude (default), oled, matrix, random
# Override: CC_THEME=matrix or KZ_THEME=matrix
# ============================================================================

# ---------------------------------------------------------------------------
# Theme: Claude Anthropic (default)
# ---------------------------------------------------------------------------
_theme_claude() {
  T_PRIMARY="\033[38;5;172m"
  T_SECONDARY="\033[38;5;145m"
  T_DIM="\033[38;5;240m"
  T_ACCENT="\033[38;5;99m"
  T_SUCCESS="\033[38;5;42m"
  T_WARN="\033[38;5;214m"
  T_ERROR="\033[38;5;196m"
  T_BOLD="\033[1m"
  T_RESET="\033[0m"
}

# ---------------------------------------------------------------------------
# Theme: OLED Black
# ---------------------------------------------------------------------------
_theme_oled() {
  T_PRIMARY="\033[38;5;15m"
  T_SECONDARY="\033[38;5;245m"
  T_DIM="\033[38;5;238m"
  T_ACCENT="\033[38;5;33m"
  T_SUCCESS="\033[38;5;42m"
  T_WARN="\033[38;5;214m"
  T_ERROR="\033[38;5;196m"
  T_BOLD="\033[1m"
  T_RESET="\033[0m"
}

# ---------------------------------------------------------------------------
# Theme: Matrix (enhanced classic)
# ---------------------------------------------------------------------------
_theme_matrix() {
  T_PRIMARY="\033[38;5;46m"
  T_SECONDARY="\033[38;5;34m"
  T_DIM="\033[38;5;22m"
  T_ACCENT="\033[38;5;51m"
  T_SUCCESS="\033[38;5;46m"
  T_WARN="\033[38;5;214m"
  T_ERROR="\033[38;5;196m"
  T_BOLD="\033[1m"
  T_RESET="\033[0m"
}

# ---------------------------------------------------------------------------
# Random Palettes
# ---------------------------------------------------------------------------
_random_palettes=(cyberpunk sunset arctic coral neon)

_theme_random_cyberpunk() { T_PRIMARY="\033[38;5;206m"; T_ACCENT="\033[38;5;45m"; }
_theme_random_sunset()    { T_PRIMARY="\033[38;5;208m"; T_ACCENT="\033[38;5;93m"; }
_theme_random_arctic()    { T_PRIMARY="\033[38;5;110m"; T_ACCENT="\033[38;5;67m"; }
_theme_random_coral()     { T_PRIMARY="\033[38;5;209m"; T_ACCENT="\033[38;5;30m"; }
_theme_random_neon()      { T_PRIMARY="\033[38;5;154m"; T_ACCENT="\033[38;5;199m"; }

# ---------------------------------------------------------------------------
# Theme Loader
# ---------------------------------------------------------------------------

# Load the active theme. Checks CC_THEME, KZ_THEME, or defaults to claude.
# Sets T_PRIMARY, T_SECONDARY, T_DIM, T_ACCENT, T_SUCCESS, T_WARN, T_ERROR, T_BOLD, T_RESET.
cc_load_theme() {
  local theme_name="${CC_THEME:-${KZ_THEME:-claude}}"
  theme_name="$(echo "$theme_name" | tr '[:upper:]' '[:lower:]')"

  # Check if color is disabled
  if [[ "${CC_NO_COLOR:-${KZ_NO_COLOR:-0}}" == "1" ]] || [[ -n "${NO_COLOR:-}" ]]; then
    T_PRIMARY="" T_SECONDARY="" T_DIM="" T_ACCENT=""
    T_SUCCESS="" T_WARN="" T_ERROR="" T_BOLD="" T_RESET=""
    return
  fi

  case "$theme_name" in
    oled)   _theme_oled ;;
    matrix) _theme_matrix ;;
    random)
      _theme_claude  # Base on claude
      local idx=$(( RANDOM % ${#_random_palettes[@]} ))
      local palette="${_random_palettes[$idx]}"
      "_theme_random_${palette}" 2>/dev/null
      ;;
    *)      _theme_claude ;;
  esac
}

# Auto-load on source
cc_load_theme
