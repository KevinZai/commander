#!/usr/bin/env bash
# scripts/rollback.sh — CC Commander rollback helper
# Usage: bash scripts/rollback.sh --target <npm|plugin|mcp-cloud> [--version X.Y.Z] [--reason "text"] [--yes]
#
# Dry-run by default. Pass --yes to execute destructive actions.
# Requires: gh auth status (GitHub CLI) + op account list (1Password CLI)

set -euo pipefail

# ── Defaults ────────────────────────────────────────────────────────────────
TARGET=""
VERSION=""
REASON="rolled back"
DRY_RUN=true

# ── Argument parsing ─────────────────────────────────────────────────────────
while [[ $# -gt 0 ]]; do
  case "$1" in
    --target)   TARGET="$2";  shift 2 ;;
    --version)  VERSION="$2"; shift 2 ;;
    --reason)   REASON="$2";  shift 2 ;;
    --yes)      DRY_RUN=false; shift ;;
    --dry-run)  DRY_RUN=true;  shift ;;
    *)
      echo "Unknown argument: $1"
      echo "Usage: bash scripts/rollback.sh --target <npm|plugin|mcp-cloud> [--version X.Y.Z] [--reason text] [--yes]"
      exit 1
      ;;
  esac
done

# ── Validation ────────────────────────────────────────────────────────────────
if [[ -z "$TARGET" ]]; then
  echo "ERROR: --target is required (npm | plugin | mcp-cloud)"
  exit 1
fi

if [[ ! "$TARGET" =~ ^(npm|plugin|mcp-cloud)$ ]]; then
  echo "ERROR: --target must be one of: npm, plugin, mcp-cloud"
  exit 1
fi

if [[ "$TARGET" == "npm" && -z "$VERSION" ]]; then
  echo "ERROR: --version is required for npm target"
  exit 1
fi

# ── Pre-flight auth checks ────────────────────────────────────────────────────
echo ""
echo "═══════════════════════════════════════════════"
echo "  CC Commander Rollback"
echo "  Target : $TARGET"
echo "  Version: ${VERSION:-N/A}"
echo "  Reason : $REASON"
echo "  Mode   : $([ "$DRY_RUN" = true ] && echo 'DRY RUN (pass --yes to execute)' || echo 'LIVE')"
echo "═══════════════════════════════════════════════"
echo ""

if [[ "$TARGET" == "npm" ]]; then
  echo "Checking npm auth..."
  if ! npm whoami &>/dev/null; then
    echo "ERROR: Not logged in to npm. Run: npm login"
    exit 1
  fi
  NPM_USER=$(npm whoami)
  echo "npm user: $NPM_USER"
fi

if [[ "$TARGET" == "mcp-cloud" ]]; then
  echo "Checking Fly.io auth..."
  if ! fly auth whoami &>/dev/null; then
    echo "ERROR: Not authenticated to Fly.io. Run: fly auth login"
    exit 1
  fi
  FLY_USER=$(fly auth whoami)
  echo "Fly.io user: $FLY_USER"
fi

# ── GitHub CLI check (all targets) ───────────────────────────────────────────
echo "Checking GitHub CLI auth..."
if ! gh auth status &>/dev/null; then
  echo "WARNING: gh CLI not authenticated — GitHub Release updates will be skipped"
fi

echo ""

# ── Execute rollback ─────────────────────────────────────────────────────────
case "$TARGET" in

  npm)
    echo "Action: npm deprecate cc-commander@${VERSION} \"${REASON}\""
    echo ""
    if [[ "$DRY_RUN" = false ]]; then
      npm deprecate "cc-commander@${VERSION}" "$REASON"
      echo "Done. Users installing cc-commander@${VERSION} will see:"
      echo "  npm warn deprecated cc-commander@${VERSION}: ${REASON}"
      echo ""
      echo "To unpublish (only within 72h of original publish):"
      echo "  npm unpublish cc-commander@${VERSION}"
      echo "  WARNING: This breaks existing cached installs — prefer deprecate."
    else
      echo "[DRY RUN] Would run: npm deprecate cc-commander@${VERSION} \"${REASON}\""
      echo "Pass --yes to execute."
    fi
    ;;

  plugin)
    echo "Plugin rollback — no registry to modify."
    echo ""
    echo "User instructions to share in Discord / GitHub Release:"
    echo "  1. /plugin uninstall commander"
    echo "  2. Reinstall from the last good tag:"
    echo "     Settings → Plugin Marketplace → Add from GitHub → KevinZai/commander@v${VERSION:-4.0.0-beta.10}"
    echo ""
    echo "Kevin action: push hotfix tag to trigger release.yml → users re-install."
    if [[ "$DRY_RUN" = false ]]; then
      echo ""
      echo "[INFO] No destructive action taken for plugin target — instructions printed above."
    else
      echo ""
      echo "[DRY RUN] No changes made. Instructions above are the rollback procedure."
    fi
    ;;

  mcp-cloud)
    echo "Action: fly releases rollback --app cc-commander-mcp"
    echo ""
    if [[ "$DRY_RUN" = false ]]; then
      fly releases rollback --app cc-commander-mcp
      echo ""
      echo "Verifying health endpoint..."
      sleep 10
      HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://mcp.cc-commander.com/health || echo "000")
      if [[ "$HTTP_STATUS" == "200" ]]; then
        echo "Health check: 200 OK"
      else
        echo "WARNING: Health check returned HTTP $HTTP_STATUS — investigate logs"
        echo "  fly logs --app cc-commander-mcp | grep -E 'ERROR|WARN'"
      fi
    else
      echo "[DRY RUN] Would run: fly releases rollback --app cc-commander-mcp"
      echo ""
      echo "Available releases:"
      fly releases list --app cc-commander-mcp 2>/dev/null || echo "  (fly CLI not available or app not deployed)"
      echo ""
      echo "Pass --yes to execute."
    fi
    ;;
esac

echo ""
echo "Post-rollback checklist:"
echo "  [ ] Announce in Discord #announcements"
echo "  [ ] Update Linear incident issue with root-cause"
echo "  [ ] Ship hotfix if deprecation is insufficient"
echo "  See RUNBOOK.md for full procedure."
