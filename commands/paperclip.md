# /paperclip — Paperclip Task Management

Query and update Paperclip tasks from Claude Code.

## Common Operations

### List my assigned issues
```bash
curl -s "http://localhost:3110/api/companies/{YOUR_COMPANY_ID}/issues?assigneeId=AGENT_UUID&stateType=started" | python3 -m json.tool
```

### Update issue status
```bash
curl -s -X PATCH "http://localhost:3110/api/issues/{ISSUE_ID}" \
  -H "Content-Type: application/json" \
  -d '{"status": "done"}'
```

### Add comment to issue
```bash
curl -s -X POST "http://localhost:3110/api/issues/{ISSUE_ID}/comments" \
  -H "Content-Type: application/json" \
  -d '{"body": "Completed: <summary>"}'
```

### Search issues
```bash
curl -s "http://localhost:3110/api/companies/{YOUR_COMPANY_ID}/issues?query=search+term" | python3 -m json.tool
```

## Agent UUIDs (for assignee filtering)
Check `~/your-project/agent-directory.md` for the full agent→UUID map.

## Notes
- Paperclip runs on localhost:3110, no auth required (local_trusted mode)
- Company ID: {YOUR_COMPANY_ID} (check via `/api/companies`)
- All inter-agent work should reference a Paperclip issue
