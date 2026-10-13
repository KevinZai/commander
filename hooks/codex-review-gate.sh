#!/usr/bin/env bash
# Advisory review: show results without preventing Claude from stopping.
set -euo pipefail

# A dirty checkout alone does not mean this turn needs a second review.
# Skip only when the transcript proves the current user turn used no tools.
# Missing/unknown evidence retains the existing advisory review behavior.
if [ ! -t 0 ]; then
  hook_input=$(cat)
  if printf '%s' "$hook_input" | /usr/bin/python3 -c '
import json, pathlib, sys
try:
    event = json.load(sys.stdin)
    transcript = pathlib.Path(event["transcript_path"]).expanduser()
    final_message = event.get("last_assistant_message")
    event_has_final = event.get("hook_event_name") == "Stop" and isinstance(final_message, str) and bool(final_message.strip())
    seen_user = False
    used_tools = False
    uncertain = False
    seen_assistant = False
    with transcript.open(encoding="utf-8") as source:
        for line in source:
            if not line.strip():
                continue
            record = json.loads(line)
            if not isinstance(record, dict):
                raise ValueError("Unknown transcript record")
            if record.get("isCompactSummary"):
                uncertain = True
                continue
            kind = record.get("type")
            if kind == "attachment":
                attachment = record.get("attachment", {})
                if attachment.get("type") not in (
                    "hook_success", "hook_non_blocking_error", "hook_system_message", "hook_additional_context", "async_hook_response",
                    "environment", "model", "mcp_instructions_delta", "deferred_tools_delta", "agent_listing_delta", "skill_listing",
                    "total_tokens_reminder", "instructions", "session_context", "context_sections", "date", "prompt_snapshot"
                ):
                    uncertain = True
                continue
            if kind not in ("user", "assistant"):
                # These records contain bookkeeping, not conversation turns.
                if kind not in ("progress", "file-history-snapshot", "queue-operation", "system", "summary", "last-prompt", "atis-latch", "ai-title", "custom-title", "bridge-session", "mode"):
                    uncertain = True
                if kind == "summary" or record.get("subtype") == "compact_boundary":
                    uncertain = True
                continue
            message = record.get("message")
            if not isinstance(message, dict) or "content" not in message:
                raise ValueError("Incomplete conversation record")
            content = message["content"]
            if isinstance(content, str):
                if not content.strip():
                    raise ValueError("Empty conversation record")
                blocks = [{"type": "text", "text": content}]
            elif isinstance(content, list) and content and all(isinstance(b, dict) for b in content):
                blocks = content
            else:
                raise ValueError("Unknown content shape")
            block_types = {b.get("type") for b in blocks}
            if kind == "user":
                if "tool_result" in block_types:
                    used_tools = True
                    continue
                if record.get("isMeta"):
                    continue
                if block_types != {"text"} or not all(isinstance(b.get("text"), str) and b["text"].strip() for b in blocks):
                    raise ValueError("Unknown user turn")
                seen_user = True
                used_tools = False
                seen_assistant = False
            else:
                for block in blocks:
                    field = {"text": "text", "thinking": "thinking", "redacted_thinking": "data"}.get(block.get("type"))
                    if field and not isinstance(block.get(field), str):
                        raise ValueError("Malformed assistant content")
                seen_assistant = True
                if block_types - {"text", "thinking", "redacted_thinking"}:
                    used_tools = True
    sys.exit(0 if seen_user and (seen_assistant or event_has_final) and not used_tools and not uncertain else 1)
except (OSError, ValueError, KeyError, TypeError, AttributeError):
    sys.exit(1)
'; then
    exit 0
  fi
fi

git rev-parse --git-dir >/dev/null 2>&1 || exit 0
changes=$(git status --porcelain --untracked-files=normal)
[ -n "$changes" ] || exit 0
command -v codex >/dev/null 2>&1 || exit 0

unset OPENAI_API_KEY
if review_output=$(codex review -c 'sandbox_mode="read-only"' --uncommitted 2>&1); then
  message="[Codex review] ${review_output:-Review completed without output.}"
else
  review_status=$?
  message="[Codex review] Review failed (exit $review_status); no successful review is claimed. $review_output"
fi
printf '%s' "$message" | /usr/bin/python3 -c 'import json,sys; print(json.dumps({"systemMessage": sys.stdin.read(9000)}))'
