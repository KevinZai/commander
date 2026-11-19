#!/bin/bash
# ============================================================================
# CC Commander — One-Line Remote Installer
# ============================================================================
# Paste this anywhere:
#   curl -fsSL https://raw.githubusercontent.com/KevinZai/commander/main/install-remote.sh | bash
#
# Or with wget:
#   wget -qO- https://raw.githubusercontent.com/KevinZai/commander/main/install-remote.sh | bash
#
# What it checks: the checkout's origin is the CC Commander repository, and
# HEAD is the exact commit of the release tag (or commit) being installed.
# It prints that commit so you can compare it with the release page. It does
# not verify a signature.
#
# Environment:
#   CCC_REF=v8.1.6        Install this tag or full commit SHA. Default: the
#                         newest vX.Y.Z release tag. A branch name is refused:
#                         a name that is not a commit must be a tag on the
#                         repository (the same rule as `ccc --update`).
#   CCC_INSTALL_DIR=DIR   Checkout location. Default: ~/.cc-commander
#   CCC_INSTALL_CLI=1     Allow `npm install -g @anthropic-ai/claude-code`
#                         when the claude command is missing.
# ============================================================================

set -euo pipefail

# Colors (off with CC_NO_COLOR=1 or NO_COLOR)
if [[ "${CC_NO_COLOR:-}" == "1" || -n "${NO_COLOR:-}" ]]; then
  GREEN=''; CYAN=''; DIM=''; WHITE=''; RED=''; AMBER=''; NC=''
else
  GREEN='\033[38;5;46m'
  CYAN='\033[38;5;51m'
  DIM='\033[38;5;22m'
  WHITE='\033[38;5;255m'
  RED='\033[38;5;196m'
  AMBER='\033[38;5;214m'
  NC='\033[0m'
fi

REPO_URL="${CCC_REPO_URL:-https://github.com/KevinZai/commander.git}"
# Default checkout path. scripts/diagnose-ccc-sources.sh reports a checkout
# here (origin = this repository) as the current CLI, and
# scripts/reset-commander-install.sh removes it only with --remove-checkout.
INSTALL_DIR="${CCC_INSTALL_DIR:-$HOME/.cc-commander}"
REF="${CCC_REF:-}"

fail() {
  echo -e "  ${RED}✗${NC} $1"
  exit 1
}

# Compare repository URLs without case, a trailing slash or a trailing .git
normalize_url() {
  printf '%s' "$1" | tr '[:upper:]' '[:lower:]' | sed -e 's#/*$##' -e 's#\.git$##'
}

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "  ${WHITE}CC Commander${NC}  ${DIM}Remote Installer${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# ── Check prerequisites ─────────────────────────────────────────────────────

# Check for git
if ! command -v git &>/dev/null; then
  fail "git not found. Install git first."
fi

# Check for node/npm (needed for Claude Code)
if ! command -v node &>/dev/null; then
  echo -e "  ${RED}✗${NC} Node.js not found. Install Node.js 20.19+ (or 22.12+) first."
  echo -e "    ${DIM}https://nodejs.org${NC}"
  exit 1
fi

if [[ -n "$REF" ]] && ! [[ "$REF" =~ ^[A-Za-z0-9][A-Za-z0-9._/-]{0,127}$ ]]; then
  fail "CCC_REF must be a tag or commit (got: $REF)"
fi

# ── Claude Code CLI ──────────────────────────────────────────────────────────
# Never installed globally without an explicit opt-in.

if command -v claude &>/dev/null; then
  echo -e "  ${GREEN}✓${NC} Claude Code CLI found"
elif [[ "${CCC_INSTALL_CLI:-}" == "1" ]]; then
  echo -e "  ${AMBER}!${NC} Claude Code CLI not found. Running: npm install -g @anthropic-ai/claude-code"
  npm install -g @anthropic-ai/claude-code
  command -v claude &>/dev/null || fail "Failed to install Claude Code CLI. Try: npm install -g @anthropic-ai/claude-code"
  echo -e "  ${GREEN}✓${NC} Claude Code CLI installed"
else
  echo -e "  ${AMBER}!${NC} Claude Code CLI not found. Install it from https://code.claude.com"
  echo -e "    ${DIM}(or re-run with CCC_INSTALL_CLI=1 to npm install it globally). Continuing with the kit.${NC}"
fi

# ── Resolve the release to install ───────────────────────────────────────────

if [[ -z "$REF" ]]; then
  REF="$(git ls-remote --tags --refs "$REPO_URL" 'v*' 2>/dev/null \
    | sed 's#.*refs/tags/##' | grep -E '^v[0-9]+\.[0-9]+\.[0-9]+$' | sort -V | tail -1 || true)"
  [[ -n "$REF" ]] || fail "Could not list release tags from $REPO_URL. Check your connection, or set CCC_REF=<tag or commit>."
fi
echo -e "  ${CYAN}►${NC} Release: ${WHITE}${REF}${NC}"

# A ref that is not a commit is resolved only as the exact tag refs/tags/<REF> on the remote (ls-remote patterns
# also match longer refs that end the same way, and a branch is mutable), peeled when annotated. `ccc --update`
# (bin/kc.js) applies the same rule. FETCH_SPEC is what gets fetched; EXPECTED_COMMIT is what it must be.
if [[ "$REF" =~ ^[0-9a-fA-F]{7,40}$ ]]; then
  FETCH_SPEC="$REF"
  EXPECTED_COMMIT=""
else
  FETCH_SPEC="refs/tags/$REF"
  remote_refs="$(git ls-remote --tags "$REPO_URL" "$FETCH_SPEC" "$FETCH_SPEC^{}" 2>/dev/null || true)"
  EXPECTED_COMMIT="$(printf '%s\n' "$remote_refs" | awk -v r="$FETCH_SPEC^{}" '$2 == r {print $1; exit}')"
  [[ -n "$EXPECTED_COMMIT" ]] || EXPECTED_COMMIT="$(printf '%s\n' "$remote_refs" | awk -v r="$FETCH_SPEC" '$2 == r {print $1; exit}')"
  [[ -n "$EXPECTED_COMMIT" ]] || fail "$REF is not a release tag on $REPO_URL (CCC_REF takes a tag or a commit, not a branch)."
fi

# ── Clone or update the kit ──────────────────────────────────────────────────

if [ -d "$INSTALL_DIR/.git" ]; then
  echo -e "  ${CYAN}►${NC} CC Commander already installed in $INSTALL_DIR — updating..."
  origin="$(git -C "$INSTALL_DIR" remote get-url origin 2>/dev/null || true)"
  if [[ "$(normalize_url "$origin")" != "$(normalize_url "$REPO_URL")" ]]; then
    fail "$INSTALL_DIR tracks '$origin', not $REPO_URL. Refusing to update it."
  fi
  if [ -n "$(git -C "$INSTALL_DIR" status --porcelain --untracked-files=no 2>/dev/null)" ]; then
    fail "$INSTALL_DIR has local changes. Commit or discard them, then re-run."
  fi
elif [ -e "$INSTALL_DIR" ]; then
  fail "$INSTALL_DIR exists and is not a git checkout. Move it aside or set CCC_INSTALL_DIR."
else
  echo -e "  ${CYAN}►${NC} Downloading kit to $INSTALL_DIR..."
  git init --quiet "$INSTALL_DIR"
  git -C "$INSTALL_DIR" remote add origin "$REPO_URL"
fi

git -C "$INSTALL_DIR" fetch --quiet --depth 1 origin "$FETCH_SPEC" 2>/dev/null \
  || fail "Could not fetch $REF from $REPO_URL. Check the tag or commit and your connection."
FETCHED="$(git -C "$INSTALL_DIR" rev-parse --verify 'FETCH_HEAD^{commit}')"
# Checked before checkout, so a mismatch leaves the working tree as it was.
if [[ -n "$EXPECTED_COMMIT" && "$FETCHED" != "$EXPECTED_COMMIT" ]]; then
  fail "Fetched $FETCHED, but refs/tags/$REF on $REPO_URL is $EXPECTED_COMMIT"
fi
git -C "$INSTALL_DIR" checkout --quiet --detach "$FETCHED"
git -C "$INSTALL_DIR" submodule update --quiet --init --recursive --depth 1 2>/dev/null \
  || echo -e "  ${AMBER}!${NC} Some vendor submodules could not be fetched; the kit still installs."

# ── Verify the checkout ──────────────────────────────────────────────────────

origin="$(git -C "$INSTALL_DIR" remote get-url origin)"
[[ "$(normalize_url "$origin")" == "$(normalize_url "$REPO_URL")" ]] || fail "Checkout origin is '$origin', expected $REPO_URL"
COMMIT="$(git -C "$INSTALL_DIR" rev-parse HEAD)"
if [[ "$REF" =~ ^[0-9a-fA-F]{7,40}$ ]]; then
  [[ "$COMMIT" == "$(printf '%s' "$REF" | tr '[:upper:]' '[:lower:]')"* ]] || fail "HEAD is $COMMIT, not the requested commit $REF"
else
  # The tag resolved above, on the remote, must be the commit that was checked out (annotated tags are peeled).
  [[ "$EXPECTED_COMMIT" == "$COMMIT" ]] || fail "HEAD is $COMMIT, but refs/tags/$REF on $REPO_URL is ${EXPECTED_COMMIT:-unknown}"
fi
for f in package.json install.sh bin/kc.js commander/engine.js; do
  [ -f "$INSTALL_DIR/$f" ] || fail "Checkout is missing $f"
done
echo -e "  ${GREEN}✓${NC} Source: ${WHITE}${origin}${NC} @ ${WHITE}${REF}${NC}"
echo -e "  ${GREEN}✓${NC} Commit: ${WHITE}${COMMIT}${NC}"
echo -e "    ${DIM}(origin and commit checked; compare the commit with the release page — no signature is verified)${NC}"

# ── Run the installer ────────────────────────────────────────────────────────

echo ""
echo -e "  ${CYAN}►${NC} Launching installer..."
echo ""

cd "$INSTALL_DIR"
chmod +x install.sh
./install.sh --force

# ── Done ─────────────────────────────────────────────────────────────────────

echo ""
echo -e "  ${GREEN}✓${NC} CC Commander ${REF} (${COMMIT:0:12}) installed to ${WHITE}${INSTALL_DIR}${NC}"
echo -e "  ${DIM}To update: ccc --update   (or re-run this script; CCC_REF=<tag> pins a release)${NC}"
echo ""
