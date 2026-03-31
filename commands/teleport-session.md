---
description: Transfer your current Claude Code session to another device (mobile, web, desktop) using teleport.
---

# Teleport Session

Move your active Claude Code session seamlessly between devices. Start a complex debugging session on your desktop, transfer it to your laptop for a meeting, or monitor progress from your phone.

## Usage

```bash
/teleport              # Generate teleport code for current session
/teleport <code>       # Resume a session from another device
/remote-control        # Enter remote-control mode (monitor from another device)
```

## How Teleport Works

### From the CLI

```bash
# Generate a teleport link/code
claude --teleport
# Output: Teleport code: ABC-123-XYZ
#         Web URL: https://claude.ai/code/teleport/ABC-123-XYZ
#         Expires in 15 minutes

# Resume on another device
claude --teleport ABC-123-XYZ
```

### From Within a Session

```
/teleport

Session teleport ready.
Code: ABC-123-XYZ
URL: https://claude.ai/code/teleport/ABC-123-XYZ
Expires: 15 minutes

Open on another device to continue this session.
Current device will become read-only once the other device connects.
```

## Use Cases

### Desktop to Laptop

You're debugging a complex issue at your desk. Need to head to a meeting but want to keep working.

```
1. /teleport on desktop → get code
2. Open terminal on laptop → claude --teleport ABC-123-XYZ
3. Full session transfers: context, files, tool permissions
4. Desktop goes read-only (can still observe)
```

### Desktop to Mobile (Web)

Monitor a long-running autonomous task from your phone.

```
1. Start autonomous task: /loop 5m babysit
2. /teleport → get URL
3. Open URL on phone browser
4. Watch progress in real-time (read-only by default)
5. Send commands if needed (switches to active mode)
```

### Pair Programming

Share your session with a colleague.

```
1. /teleport → share code with colleague
2. Colleague runs: claude --teleport ABC-123-XYZ
3. Both see the same session (one active, one observing)
4. /remote-control to switch who has control
```

## Remote Control Mode

Monitor and control a session from a secondary device.

```bash
# On the primary device (where work is happening)
/remote-control

# Output:
# Remote control enabled.
# Observer URL: https://claude.ai/code/observe/DEF-456-UVW
# Commands from observer are queued and require confirmation.
```

### Observer Capabilities

| Action | Allowed | Confirmation Needed |
|---|---|---|
| View session output | Yes | No |
| View file changes | Yes | No |
| Send chat messages | Yes | No |
| Run commands | Yes | Yes (primary confirms) |
| Edit files | Yes | Yes (primary confirms) |
| Stop the session | Yes | No |

## What Transfers

| Data | Transferred | Notes |
|---|---|---|
| Conversation history | Yes | Full context preserved |
| File system state | Yes | Via git (uncommitted changes stashed and transferred) |
| Tool permissions | Yes | Same `.claude/settings.json` |
| Environment variables | No | Must be set on target device |
| Running processes | No | Dev servers must be restarted |
| MCP connections | No | Reconnected on target device |

## Security

- Teleport codes expire after 15 minutes
- One-time use (code invalidated after first connection)
- End-to-end encrypted session data
- Only the authenticated user can teleport their own sessions
- Remote-control observers cannot access files outside the project directory

## Workflow Integration

### With /loop

```
# Start a long loop, then teleport to monitor
/loop 1h doc-updater
/teleport
# Go to phone, open URL, watch progress
```

### With /dispatch

```
# Dispatch a background task, monitor from anywhere
/dispatch "Run security scan"
/teleport
# Check from any device
```

### With Pair Sessions

```
# Developer A starts working
claude --add-dir /shared/project

# Developer A shares session
/teleport → gives code to Developer B

# Developer B joins
claude --teleport ABC-123-XYZ

# Both collaborate in the same Claude Code session
```

## Tips

- Teleport before closing your laptop lid (the session stays active on the server)
- Use remote-control mode for monitoring -- it's read-only by default, so you can't accidentally run commands
- Teleport codes are short-lived by design; generate a new one if it expires
- Environment variables and running processes don't transfer -- restart dev servers on the new device
- If the connection drops, use the same teleport code within the expiry window to reconnect
