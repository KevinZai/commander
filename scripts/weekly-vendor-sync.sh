#!/usr/bin/env bash
# CC Commander — weekly vendor submodule sync
#
# Pulls latest from every vendor submodule, detects new skills / hooks /
# agents / MCPs in each, runs the test matrix, reports a diff summary
# to stdout (and optionally to Discord/Slack if webhook URL set).
#
# Runs via scripts/weekly-vendor-sync.sh (manual) OR via the GitHub Action
# at .github/workflows/weekly-vendor-sync.yml (every Monday 00:00 UTC).
#
# USAGE:
#   scripts/weekly-vendor-sync.sh              # run + print report
#   scripts/weekly-vendor-sync.sh --no-tests   # skip test matrix (faster)
#   scripts/weekly-vendor-sync.sh --discord    # post to DISCORD_WEBHOOK
#   scripts/weekly-vendor-sync.sh --dry-run    # show what would change

set -euo pipefail

NO_TESTS=0
DRY_RUN=0
DISCORD=0
while [[ $# -gt 0 ]]; do
  case "$1" in
    --no-tests) NO_TESTS=1; shift ;;
    --dry-run)  DRY_RUN=1; shift ;;
    --discord)  DISCORD=1; shift ;;
    -h|--help)  grep -E '^# ?' "$0" | sed 's/^# \?//' | head -20; exit 0 ;;
    *) echo "Unknown flag: $1" >&2; exit 2 ;;
  esac
done

BOLD=$(tput bold 2>/dev/null || echo "")
RESET=$(tput sgr0 2>/dev/null || echo "")
GREEN=$(tput setaf 2 2>/dev/null || echo "")
YELLOW=$(tput setaf 3 2>/dev/null || echo "")
BLUE=$(tput setaf 4 2>/dev/null || echo "")

hdr() { echo ""; echo "${BOLD}${BLUE}── $* ──${RESET}"; }
ok()  { echo "  ${BOLD}${GREEN}✓${RESET} $*"; }
warn(){ echo "  ${BOLD}${YELLOW}⚠${RESET}  $*"; }

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

if [[ ! -f .gitmodules ]]; then
  echo "${YELLOW}No .gitmodules found. Skipping.${RESET}"
  exit 0
fi

TS=$(date -u +%Y-%m-%dT%H:%M:%SZ)
REPORT_DIR="output/dev/vendor-sync-reports"
mkdir -p "$REPORT_DIR"
REPORT="$REPORT_DIR/$(date -u +%Y-%m-%d).md"

# ----- Snapshot current state -----
hdr "1. Baseline snapshot"
BEFORE=$(git submodule status 2>&1 | awk '{print $2 ":" $1}' | sort)
echo "$BEFORE" | wc -l | xargs echo "  Vendors tracked:"

# ----- Pull latest -----
hdr "2. Pulling latest from all vendors"
if [[ $DRY_RUN -eq 1 ]]; then
  warn "DRY RUN — would run: git submodule update --remote --merge"
  echo "  Vendors that WOULD update:"
  git submodule foreach 'git fetch --quiet && diff=$(git rev-list --count HEAD..@{u} 2>/dev/null || echo 0); if [[ "$diff" -gt 0 ]]; then echo "    $name: $diff commit(s) behind"; fi' 2>/dev/null | grep -v '^Entering'
  exit 0
fi
git submodule update --remote --merge 2>&1 | grep -vE '^Entering|already up to date' | head -30

AFTER=$(git submodule status 2>&1 | awk '{print $2 ":" $1}' | sort)
DIFF=$(comm -13 <(echo "$BEFORE") <(echo "$AFTER"))
UPDATED_COUNT=$(echo "$DIFF" | grep -c '^' 2>/dev/null || echo 0)

if [[ "$UPDATED_COUNT" -eq 0 ]]; then
  ok "All vendors already up to date"
  VENDORS_UPDATED=""
else
  ok "$UPDATED_COUNT vendor(s) updated"
  VENDORS_UPDATED=$(echo "$DIFF" | awk -F: '{print $1}' | sed 's|^||')
  echo "$VENDORS_UPDATED" | sed 's/^/    /'
fi

# ----- Scan for new skills / hooks / agents -----
hdr "3. Scanning for new content in updated vendors"
NEW_SKILLS=()
NEW_HOOKS=()
NEW_AGENTS=()

while IFS= read -r vendor; do
  [[ -z "$vendor" ]] && continue
  [[ -d "$vendor" ]] || continue
  # Skills
  while IFS= read -r skill; do NEW_SKILLS+=("$skill"); done < <(find "$vendor" -maxdepth 3 -name 'SKILL.md' -newer "$REPORT" 2>/dev/null | head -20)
  # Hooks
  while IFS= read -r hook; do NEW_HOOKS+=("$hook"); done < <(find "$vendor" -maxdepth 3 -name 'hooks.json' -newer "$REPORT" 2>/dev/null | head -10)
  # Agents
  while IFS= read -r agent; do NEW_AGENTS+=("$agent"); done < <(find "$vendor" -maxdepth 3 -path '*/agents/*.md' -newer "$REPORT" 2>/dev/null | head -20)
done <<< "$VENDORS_UPDATED"

[[ ${#NEW_SKILLS[@]} -gt 0 ]] && ok "${#NEW_SKILLS[@]} new/updated skill(s) detected across vendors"
[[ ${#NEW_HOOKS[@]} -gt 0 ]] && ok "${#NEW_HOOKS[@]} new/updated hook(s) file(s)"
[[ ${#NEW_AGENTS[@]} -gt 0 ]] && ok "${#NEW_AGENTS[@]} new/updated agent(s)"

# ----- Test matrix -----
if [[ $NO_TESTS -eq 0 ]]; then
  hdr "4. Running test matrix"
  if npm test --silent 2>&1 | tail -3 | grep -qE 'pass.*fail 0'; then
    ok "npm test: all passed"
    TEST_STATUS="✅ passing"
  else
    warn "npm test: FAILED"
    TEST_STATUS="❌ failing"
  fi
  if claude plugin validate commander/cowork-plugin 2>&1 | tail -1 | grep -q 'Validation passed'; then
    ok "plugin validator: passed"
  else
    warn "plugin validator: FAILED"
    TEST_STATUS="$TEST_STATUS + validator failed"
  fi
else
  TEST_STATUS="⏭️ skipped (--no-tests)"
fi

# ----- Write report -----
hdr "5. Writing report"
{
  echo "# CC Commander — weekly vendor sync ($TS)"
  echo ""
  echo "**Vendors updated:** $UPDATED_COUNT"
  echo "**Test status:** $TEST_STATUS"
  echo ""
  if [[ -n "$VENDORS_UPDATED" ]]; then
    echo "## Updated vendors"
    echo ""
    echo "$VENDORS_UPDATED" | while read -r v; do
      cd "$REPO_ROOT/$v" 2>/dev/null && {
        latest=$(git log -1 --pretty='%h %s' 2>/dev/null | head -1)
        echo "- \`$v\` — $latest"
        cd "$REPO_ROOT"
      }
    done
    echo ""
  fi
  if [[ ${#NEW_SKILLS[@]} -gt 0 ]]; then
    echo "## New / updated skills to evaluate"
    echo ""
    printf -- "- %s\n" "${NEW_SKILLS[@]}"
    echo ""
  fi
  echo "## Next actions"
  echo ""
  echo "- Review \`$REPORT\` findings against the 6-step contribution protocol (\`docs/ECOSYSTEM.md\`)"
  echo "- If any new skill / hook / agent merits absorption → open a PR with \`ecosystem:\` label"
  echo "- If vendor versions broke anything → pin to last-good SHA via \`cd vendor/<name> && git checkout <SHA>\`"
} > "$REPORT"
ok "Report: $REPORT"

# ----- Notify (optional) -----
if [[ $DISCORD -eq 1 && -n "${DISCORD_WEBHOOK:-}" ]]; then
  hdr "6. Posting to Discord"
  MESSAGE="CC Commander weekly vendor sync complete — $UPDATED_COUNT vendors updated, tests $TEST_STATUS. Report: $REPORT"
  # Use jq or node to produce JSON-safe payload — $TEST_STATUS may contain
  # vendor-commit characters that break raw string interpolation.
  if command -v jq >/dev/null 2>&1; then
    PAYLOAD=$(jq -n --arg content "$MESSAGE" '{"content": $content}')
  else
    PAYLOAD=$(node -e 'console.log(JSON.stringify({content: process.argv[1]}))' "$MESSAGE")
  fi
  curl -s -H 'Content-Type: application/json' -d "$PAYLOAD" "$DISCORD_WEBHOOK" > /dev/null && ok "posted"
fi

echo ""
ok "Weekly sync complete. Report at: ${BOLD}$REPORT${RESET}"
