#!/usr/bin/env bash
# CC Commander v4.0.0 Beta — deploy script
# Reads ALL secrets from 1Password (no .env files, ever).
# Kevin populates op:// items before running this (see tasks/kevin-handback-checklist.md CC-311).

set -euo pipefail

WORKTREE_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$WORKTREE_ROOT"

BOLD=$(tput bold); RESET=$(tput sgr0); GREEN=$(tput setaf 2); YELLOW=$(tput setaf 3); RED=$(tput setaf 1)
info()  { echo "${BOLD}${GREEN}✅${RESET} $*"; }
warn()  { echo "${BOLD}${YELLOW}⚠️${RESET} $*"; }
err()   { echo "${BOLD}${RED}❌${RESET} $*" >&2; exit 1; }

# ─── Preflight ─────────────────────────────────────────────
command -v op    >/dev/null || err "1Password CLI (op) not found. brew install --cask 1password-cli"
command -v fly   >/dev/null || err "Fly CLI not found. brew install flyctl"
command -v vercel>/dev/null || warn "Vercel CLI missing — site deploy will be skipped. brew install vercel-cli"
op whoami        >/dev/null 2>&1 || err "Not signed in to 1Password. Run: op signin"

# Verify required OP vault items exist (see CC-311)
REQUIRED=(
  "op://Alfred/cc-commander-supabase/url"
  "op://Alfred/cc-commander-supabase/anon-key"
  "op://Alfred/cc-commander-supabase/service-role-key"
  "op://Alfred/cc-commander-resend/api-key"
  "op://Alfred/cc-commander-upstash/url"
  "op://Alfred/cc-commander-upstash/token"
  "op://Alfred/cc-commander-jwt/secret"
)
for ref in "${REQUIRED[@]}"; do
  op read "$ref" >/dev/null 2>&1 || err "OP item missing: $ref"
done
info "All ${#REQUIRED[@]} OP vault items verified"

# ─── Tests ─────────────────────────────────────────────────
info "Running test suite"
npm test --silent >/dev/null || err "npm test failed — aborting deploy"
node bin/kc.js --test >/dev/null || err "kc.js tests failed"
bash tests/smoke.sh >/dev/null || err "smoke tests failed"

# ─── Deploy hosted MCP server to Fly.io ────────────────────
info "Deploying hosted MCP server → Fly.io (cc-commander-mcp)"
cd apps/mcp-server-cloud
op run --env-file=.env.example -- fly deploy --strategy canary --app cc-commander-mcp
cd "$WORKTREE_ROOT"

# Healthcheck
info "Waiting for MCP healthcheck…"
for i in {1..30}; do
  if curl -fsS --max-time 2 https://mcp.cc-commander.com/health >/dev/null 2>&1; then
    info "MCP healthy"
    break
  fi
  sleep 2
  [ "$i" -eq 30 ] && err "MCP health check failed after 60s"
done

# ─── Deploy marketing site to Vercel ──────────────────────
if command -v vercel >/dev/null; then
  info "Deploying marketing site → Vercel"
  cd site
  vercel --prod --yes
  cd "$WORKTREE_ROOT"
else
  warn "Skipping site deploy (vercel CLI missing)"
fi

# ─── Post-deploy smoke ────────────────────────────────────
info "Running post-deploy smoke"
curl -fsS --max-time 5 https://cc-commander.com > /dev/null && info "cc-commander.com 200 OK" || warn "cc-commander.com probe failed"
curl -fsS --max-time 5 https://mcp.cc-commander.com/health > /dev/null && info "mcp.cc-commander.com/health 200 OK" || warn "mcp probe failed"

info "🚀 Deploy complete. CC Commander v4.0.0 Beta is live."
