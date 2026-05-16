#!/bin/bash
# safe-trash.sh — symlink-aware trash wrapper
#
# Born from the 2026-05-15 incident where a fleet worker's clean-uninstall
# pass deleted the cc-commander source repo. Forensic post-mortem found the
# mechanism was NOT trash following symlinks (Apple's /usr/bin/trash on
# macOS 15 does not follow symlinks — verified empirically). The real
# mechanism was `rm -rf <symlink-to-dir>/` with a trailing slash, which on
# BSD systems follows the link and wipes the target directory's contents.
#
# This script wraps `trash` and enforces:
#   1. Path must exist (no silent-no-op on typos)
#   2. Symlink targets must resolve inside an allowlist of cache dirs, or
#      --force is required
#   3. Directories must not contain symlinks pointing outside the allowlist,
#      or --force is required (with every offending target printed)
#   4. Paths matching "cc-commander" are hard-refused without --force
#   5. Every operation (accepted or refused) is logged as JSON to
#      ~/.claude/logs/safe-trash.jsonl
#   6. Delegates to /usr/bin/trash with an absolute path (no $PATH lookup)
#
# Usage:
#   safe-trash <path>...                Audit, log, trash
#   safe-trash --force <path>...        Bypass allowlist + cc-commander guard
#   safe-trash --quiet <path>...        Suppress non-essential stdout
#   safe-trash --dry-run <path>...      Audit + log, do not invoke trash
#   safe-trash --help                   This message
#
# Exit codes:
#   0  trashed successfully (or dry-run audit clean)
#   1  refused (allowlist / cc-commander / missing path)
#   2  invocation error (bad flags, no paths, trash binary missing)
#
# Companion: agents/fleet-worker persona enforces use of THIS script in place
# of raw `trash` for any FS cleanup. See ~/.claude/sessions/2026-05-15-incident-report.md.

set -euo pipefail

TRASH_BIN="/usr/bin/trash"
LOG_DIR="${HOME}/.claude/logs"
LOG_FILE="${LOG_DIR}/safe-trash.jsonl"

# Allowlist: safe prefixes where symlink targets may resolve to without --force.
ALLOW_PREFIXES=(
  "${HOME}/Library/"
  "${HOME}/.cache/"
  "${HOME}/.npm/"
  "${HOME}/.Trash/"
  "/private/tmp/"
  "/tmp/"
  "/var/folders/"
)

FORCE=0
QUIET=0
DRY_RUN=0
PATHS=()

usage() { sed -n '1,40p' "$0" | sed 's/^# \{0,1\}//' ; }

die_usage() {
  echo "safe-trash: $1" >&2
  echo "Try: safe-trash --help" >&2
  exit 2
}

json_array() {
  # Convert remaining args into a JSON array of strings
  if [ "$#" -eq 0 ]; then
    echo '[]'
    return
  fi
  /usr/bin/env python3 -c 'import json,sys; print(json.dumps(sys.argv[1:]))' "$@"
}

resolve_target() {
  # Resolve a path to its canonical absolute form, following symlinks.
  # macOS lacks GNU `readlink -f`; use python.
  /usr/bin/env python3 -c 'import os,sys; print(os.path.realpath(sys.argv[1]))' "$1"
}

is_under_allowlist() {
  local target="$1"
  local pfx
  for pfx in "${ALLOW_PREFIXES[@]}"; do
    case "$target/" in
      "$pfx"*) return 0 ;;
    esac
  done
  return 1
}

audit_path() {
  # Echo "OK" or "VIOLATION:<reason>" for a single path. Also prints resolved
  # target on a second line (for the resolved-paths log array).
  local p="$1"
  local resolved violations=()

  if [ ! -e "$p" ] && [ ! -L "$p" ]; then
    echo "VIOLATION:does-not-exist"
    echo "$p"
    return
  fi

  # Hard guard: cc-commander
  case "$p" in
    *cc-commander*) [ "$FORCE" -eq 0 ] && violations+=("path-matches-cc-commander") ;;
  esac

  if [ -L "$p" ]; then
    resolved="$(resolve_target "$p")"
    if ! is_under_allowlist "$resolved"; then
      [ "$FORCE" -eq 0 ] && violations+=("symlink-target-outside-allowlist:${resolved}")
    fi
  elif [ -d "$p" ]; then
    resolved="$(resolve_target "$p")"
    # Scan for symlinks inside the directory; check their targets
    while IFS= read -r link; do
      local lt
      lt="$(resolve_target "$link")"
      if ! is_under_allowlist "$lt"; then
        [ "$FORCE" -eq 0 ] && violations+=("contained-symlink-target-outside-allowlist:${link}->${lt}")
      fi
    done < <(find "$p" -type l 2>/dev/null)
  else
    resolved="$(resolve_target "$p")"
  fi

  if [ "${#violations[@]}" -gt 0 ]; then
    printf 'VIOLATION:%s\n' "${violations[@]}"
  else
    echo "OK"
  fi
  echo "$resolved"
}

main() {
  local SAVED_ARGV=("$@")
  export SAVED_ARGV

  while [ "$#" -gt 0 ]; do
    case "$1" in
      --force) FORCE=1; shift ;;
      --quiet|-q) QUIET=1; shift ;;
      --dry-run|-n) DRY_RUN=1; shift ;;
      -h|--help) usage; exit 0 ;;
      --) shift; while [ "$#" -gt 0 ]; do PATHS+=("$1"); shift; done; break ;;
      -*) die_usage "unknown flag: $1" ;;
      *) PATHS+=("$1"); shift ;;
    esac
  done

  if [ "${#PATHS[@]}" -eq 0 ]; then
    die_usage "no paths supplied"
  fi

  if [ ! -x "$TRASH_BIN" ]; then
    echo "safe-trash: trash binary not found at $TRASH_BIN" >&2
    mkdir -p "$LOG_DIR" 2>/dev/null || true
    log_event "refused" 2 "trash binary missing" "[]" "[\"trash-binary-missing\"]"
    exit 2
  fi

  local all_resolved=() all_violations=() any_violation=0

  for p in "${PATHS[@]}"; do
    local out
    out="$(audit_path "$p" || true)"
    # First line is OK/VIOLATION..., last line is resolved path
    local first_line last_line
    first_line="$(printf '%s\n' "$out" | head -1)"
    last_line="$(printf '%s\n' "$out" | tail -1)"
    all_resolved+=("$last_line")
    if [ "$first_line" != "OK" ]; then
      any_violation=1
      while IFS= read -r v; do
        case "$v" in
          VIOLATION:*) all_violations+=("${v#VIOLATION:} (on $p)") ;;
        esac
      done < <(printf '%s\n' "$out" | sed -n '/^VIOLATION:/p')
    fi
  done

  local resolved_json violations_json
  resolved_json="$(json_array "${all_resolved[@]}")"
  if [ "${#all_violations[@]}" -gt 0 ]; then
    violations_json="$(json_array "${all_violations[@]}")"
  else
    violations_json="[]"
  fi

  if [ "$any_violation" -eq 1 ]; then
    echo "safe-trash: REFUSED — guard violations:" >&2
    for v in "${all_violations[@]}"; do
      echo "  · $v" >&2
    done
    echo "  Pass --force to override (logged either way)." >&2
    log_event "refused" 1 "guard violations" "$resolved_json" "$violations_json"
    exit 1
  fi

  if [ "$DRY_RUN" -eq 1 ]; then
    [ "$QUIET" -eq 0 ] && echo "safe-trash: dry-run OK — would trash ${#PATHS[@]} path(s)"
    log_event "dry-run" 0 "audit clean" "$resolved_json" "$violations_json"
    exit 0
  fi

  set +e
  "$TRASH_BIN" "${PATHS[@]}"
  local rc=$?
  set -e

  if [ "$rc" -eq 0 ]; then
    [ "$QUIET" -eq 0 ] && echo "safe-trash: trashed ${#PATHS[@]} path(s)"
    log_event "trashed" 0 "ok" "$resolved_json" "$violations_json"
    exit 0
  else
    echo "safe-trash: /usr/bin/trash exited $rc" >&2
    log_event "trash-failed" "$rc" "trash command non-zero" "$resolved_json" "$violations_json"
    exit "$rc"
  fi
}

# --- minimal one-shot logger (no SAVED_ARGV gymnastics) ------------------
log_event() {
  # action, exit_code, msg, resolved_json, violations_json
  mkdir -p "$LOG_DIR" 2>/dev/null || true
  local ts argv_json cwd_json msg_json
  ts="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  cwd_json="$(/usr/bin/env python3 -c 'import json,sys; print(json.dumps(sys.argv[1]))' "$(pwd)")"
  argv_json="$(/usr/bin/env python3 -c 'import json,sys; print(json.dumps(sys.argv[1:]))' "${SAVED_ARGV[@]:-}")"
  msg_json="$(/usr/bin/env python3 -c 'import json,sys; print(json.dumps(sys.argv[1]))' "$3")"
  printf '{"ts":"%s","cwd":%s,"argv":%s,"resolved":%s,"violations":%s,"action":"%s","exit":%s,"msg":%s}\n' \
    "$ts" "$cwd_json" "$argv_json" "$4" "$5" "$1" "$2" "$msg_json" \
    >> "$LOG_FILE"
}

main "$@"
