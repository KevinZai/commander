# /complete — Signal Task Completion to OpenClaw

When invoked, report task completion back to the OpenClaw orchestration system.

## Usage
`/complete [summary of what was done]`

## Steps
1. Read the current project's `tasks/todo.md` to identify completed work
2. If a Paperclip issue ID is referenced (PC-XXXX format), update it via:
   ```bash
   curl -s -X PATCH http://localhost:3110/api/issues/{issue-id} \
     -H "Content-Type: application/json" \
     -d '{"status": "done", "comment": "Completed: <summary>"}'
   ```
3. Write a completion summary to stdout
4. If running as an ACP session, the completion will be automatically detected by OpenClaw

## Notes
- This command bridges Claude Code → OpenClaw task tracking
- Always include what was changed (files, tests, deployments)
- Reference git commits when applicable
