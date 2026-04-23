#!/usr/bin/env bash
set -euo pipefail
REPO="KevinZai/commander"

# Description
gh repo edit "$REPO" --description "Claude Code Desktop plugin · 32 skills + 17 sub-agents + 8 hooks + 9 MCP · Guided AI PM for devs. Free forever."

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
  --add-topic free-forever

echo "✅ Repo metadata updated. Upload social preview image manually:"
echo "   https://github.com/$REPO/settings → Social preview → Upload docs/assets/og-image-v4.png"
