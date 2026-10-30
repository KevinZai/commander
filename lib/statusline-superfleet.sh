#!/bin/bash
# ============================================================================
# CC Commander — Superfleet status line segment (sourced by statusline.sh)
# ============================================================================
# Prints "<lane> <batch key> <done>/<total> <current ticket> 5h:<pct>% 7d:<pct>%"
# when the session runs inside a Superfleet run dir, and nothing otherwise:
#   ai4 SF-CCC-20261024 3/7 CC-2093 5h:6% 7d:21%
#
# Run dir: $SF_RUN_DIR, or the dir under $SF_RUNS_ROOT whose SESSION_ID file
# holds this session's id. It must contain ITEMS.tsv (item, commit, state, ...).
# Batch key: "Batch key: <KEY>" in BRIEF.md, else the run dir name (max 16).
# Usage: $CCC_LANE_USAGE_FILE, else ~/.commander/lane-usage.json (Fleet writes
# it; shape {<lane>: {fetchedAt, windows[]}}, see commander/lib/lane-usage.js).
# 5h is the session window, 7d the highest weekly window (weekly, weekly:<model>).
# A reading older than 30 minutes, or no reading for the lane, shows "5h:? 7d:?".
# Read-only and offline; output is cached for 15 s per run dir in $TMPDIR.
# Opt out with CCC_STATUSLINE_SF=off.
# ============================================================================

CCC_SF_MAX_KEY=16
CCC_SF_STALE_SECS=1800
CCC_SF_CACHE_SECS=15

# Lane name from a config dir: statusline.sh's ccc_lane_from_config_dir (the
# commander/lib/lane.js rules, aliases included); "custom" for other names.
ccc_sf_lane() {
  local lane
  lane=$(ccc_lane_from_config_dir "${1-}")
  printf '%s' "${lane:-custom}"
}

# Run dir for this session (stdout), or nothing.
ccc_sf_run_dir() {
  local session_id="${1-}" d
  if [ -n "${SF_RUN_DIR:-}" ]; then
    [ -f "$SF_RUN_DIR/ITEMS.tsv" ] && printf '%s' "${SF_RUN_DIR%/}"
    return
  fi
  [ -n "${SF_RUNS_ROOT:-}" ] && [ -n "$session_id" ] || return
  for d in "${SF_RUNS_ROOT%/}"/*/; do
    d="${d%/}"
    [ -f "$d/SESSION_ID" ] && [ -f "$d/ITEMS.tsv" ] || continue
    if [ "$(tr -d '[:space:]' < "$d/SESSION_ID")" = "$session_id" ]; then
      printf '%s' "$d"; return
    fi
  done
}

# "5h:<pct>% 7d:<pct>%" for a lane from the usage file; "?" for a value that is
# stale or missing. Nothing when $CCC_LANE_USAGE_FILE is unset and the default
# file does not exist (no Fleet writer on this host).
ccc_sf_usage() {
  local lane="$1" file="${CCC_LANE_USAGE_FILE:-}" now="${2:-$(date +%s)}" out
  if [ -z "$file" ]; then
    file="${HOME:-}/.commander/lane-usage.json"
    [ -n "${HOME:-}" ] && [ -f "$file" ] || return
  fi
  [ -f "$file" ] || { printf '5h:? 7d:?'; return; }
  out=$(jq -r --arg lane "$lane" --argjson now "$now" --argjson stale "$CCC_SF_STALE_SECS" '
    def pct: if . == null then "?" else "\(floor)%" end;
    .[$lane] as $l
    | if ($l | type) != "object" then "5h:? 7d:?"
      else (($l.fetchedAt // "") | sub("\\.[0-9]+"; "") | sub("\\+00:00$"; "Z") | (try fromdateiso8601 catch null)) as $t
      | [$l.windows[]? | select(type == "object" and (.percent | type) == "number")] as $w
      | ([$w[] | select(.id == "session" or .kind == "session") | .percent][0]) as $p
      | ([$w[] | select((.id // "" | tostring | startswith("weekly")) or (.kind // "" | tostring | startswith("weekly"))) | .percent] | max) as $wk
      | if $t == null or ($now - $t) > $stale then "5h:? 7d:?"
        else "5h:\($p | pct) 7d:\($wk | pct)" end
      end' "$file" 2>/dev/null)
  printf '%s' "${out:-5h:? 7d:?}"
}

# The segment text for a run dir (uncached).
ccc_sf_render() {
  local run="$1" lane="$2" key total done current usage
  key=$(sed -n 's/^Batch key:[[:space:]]*\([^[:space:]]*\).*/\1/p' "$run/BRIEF.md" 2>/dev/null | head -1)
  key="${key%.}"
  [ -n "$key" ] || key="${run##*/}"
  [ "${#key}" -gt "$CCC_SF_MAX_KEY" ] && key="${key:0:$((CCC_SF_MAX_KEY - 1))}…"
  read -r done total current < <(awk -F'\t' '
    NR == 1 && tolower($1) == "item" { next }
    NF == 0 || $1 == "" { next }
    { total++; s = tolower($3) }
    s == "done" || s == "skipped" { done++; next }
    s == "wip" && wip == "" { wip = $1 }
    todo == "" && s != "blocked" { todo = $1 }
    END { cur = (wip != "" ? wip : todo); printf "%d %d %s\n", done, total, (cur == "" ? "-" : cur) }
  ' "$run/ITEMS.tsv")
  usage=$(ccc_sf_usage "$lane")
  printf '%s %s %s/%s' "$lane" "$key" "${done:-0}" "${total:-0}"
  [ -n "$current" ] && [ "$current" != "-" ] && printf ' %s' "$current"
  [ -n "$usage" ] && printf ' %s' "$usage"
}

# Entry point: ccc_sf_segment <session_id>
ccc_sf_segment() {
  [ "${CCC_STATUSLINE_SF:-on}" = "off" ] && return
  local run lane cache_dir cache now line stamp seg
  run=$(ccc_sf_run_dir "${1-}")
  [ -n "$run" ] || return
  lane=$(ccc_sf_lane "${CCC_CONFIG_DIR:-${CLAUDE_CONFIG_DIR:-}}")   # same precedence as commander/lib/lane.js resolveLane()
  cache_dir="${TMPDIR:-/tmp}"; cache_dir="${cache_dir%/}/ccc-sf-$(id -u)"
  cache="$cache_dir/$(printf '%s|%s' "$run" "$lane" | cksum | cut -d' ' -f1)"
  now=$(date +%s)
  # Cache line: "<epoch> <segment>" (no stat: its flags differ between BSD and GNU).
  if [ -f "$cache" ] && IFS= read -r line < "$cache"; then
    stamp="${line%% *}"
    case "$stamp" in
      ''|*[!0-9]*) ;;
      *) if [ $((now - stamp)) -lt "$CCC_SF_CACHE_SECS" ]; then printf '%s' "${line#* }"; return; fi ;;
    esac
  fi
  seg=$(ccc_sf_render "$run" "$lane")
  mkdir -p "$cache_dir" 2>/dev/null && chmod 700 "$cache_dir" 2>/dev/null && printf '%s %s\n' "$now" "$seg" > "$cache.$$" 2>/dev/null && mv -f "$cache.$$" "$cache" 2>/dev/null
  printf '%s' "$seg"
}
