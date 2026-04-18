#!/usr/bin/env bash
set -euo pipefail

HEADROOM_RTK="/Users/ai/Library/Application Support/Headroom/headroom/bin/rtk"
HEADROOM_PYTHON="/Users/ai/Library/Application Support/Headroom/headroom/runtime/venv/bin/python3"

if [ ! -x "$HEADROOM_RTK" ] || [ ! -x "$HEADROOM_PYTHON" ]; then
  exit 0
fi

INPUT="$(cat)"
if [ -z "$INPUT" ]; then
  exit 0
fi

CMD="$("$HEADROOM_PYTHON" -c 'import json, sys; data = json.load(sys.stdin); cmd = data.get("tool_input", {}).get("command", ""); print(cmd if isinstance(cmd, str) else "")' <<<"$INPUT" 2>/dev/null || true)"
if [ -z "$CMD" ]; then
  exit 0
fi

REWRITTEN="$("$HEADROOM_RTK" rewrite "$CMD" 2>/dev/null || true)"
if [ -z "$REWRITTEN" ] || [ "$CMD" = "$REWRITTEN" ]; then
  exit 0
fi

HEADROOM_RTK_REWRITTEN="$REWRITTEN" "$HEADROOM_PYTHON" -c 'import json, os, sys; data = json.load(sys.stdin); tool_input = data.get("tool_input"); 
if not isinstance(tool_input, dict):
    sys.exit(0)
updated = dict(tool_input)
updated["command"] = os.environ["HEADROOM_RTK_REWRITTEN"]
json.dump({"hookSpecificOutput": {"hookEventName": "PreToolUse", "permissionDecision": "allow", "permissionDecisionReason": "Headroom RTK auto-rewrite", "updatedInput": updated}}, sys.stdout)' <<<"$INPUT" 2>/dev/null || exit 0
