#!/usr/bin/env bash
set -euo pipefail
REPO="KevinZai/commander"

# Description
gh repo edit "$REPO" --description "Claude Code Desktop plugin · 60 skills + 22 sub-agents + 9 hooks + 2 bundled MCP · Guided AI PM for devs. Free for now."

# Homepage
gh repo edit "$REPO" --homepage "https://kevinzai.github.io/cc-commander"

# Topics
gh repo edit "$REPO" \
  --add-topic claude-code \
  --add-topic claude-code-plugin \
  --add-topic claude-code-desktop \
  --add-topic cowork \
  --add-topic claude-agent-sdk \
  --add-topic mcp-servers \
  --add-topic ai-agents \
  --add-topic developer-tools \
  --add-topic plugin-marketplace \
  --add-topic ai-pair-programming

echo "✅ Repo metadata updated. Upload social preview image manually:"
echo "   https://github.com/$REPO/settings → Social preview → Upload docs/assets/og-image-v4.png"
