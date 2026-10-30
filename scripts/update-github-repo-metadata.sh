#!/usr/bin/env bash
set -euo pipefail
REPO="KevinZai/commander"

# Description
# Keep in step with .parity-extra.txt (scanned by scripts/check-parity.js).
gh repo edit "$REPO" --description "CC Commander · guided AI PM plugin for Claude Code · 93 skills (32 model-visible, 61 on demand) + 22 sub-agents + 30 hooks + 2 bundled MCP · the Commander Method: 12 enforceable gates · telemetry opt-in · MIT"

# Homepage
gh repo edit "$REPO" --homepage "https://commanderplugin.com"

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
