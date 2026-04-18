#!/usr/bin/env bash
# Codex Review Gate — runs non-interactive code review on uncommitted changes
# Triggered as a Claude Code Stop hook
# Only runs if there are actually uncommitted changes in a git repo

set -euo pipefail

# Skip if not in a git repo
git rev-parse --git-dir >/dev/null 2>&1 || exit 0

# Skip if no uncommitted changes
if git diff --quiet HEAD 2>/dev/null && git diff --cached --quiet 2>/dev/null; then
  exit 0
fi

# Skip if codex not available
command -v codex >/dev/null 2>&1 || exit 0

# CRITICAL: Codex must use OAuth only, never API keys
# The interactive shell has a wrapper function but hooks run non-interactive
unset OPENAI_API_KEY

# Run non-interactive review on uncommitted changes
# Output goes to stderr so it appears in the hook output
codex review --uncommitted "Review for bugs, security issues, and correctness. Be concise." 2>&1 || true
