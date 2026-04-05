---
description: "CloudCLI — bridge to web-based Claude Code sessions for mobile access"
---

# /cloudcli — Web Session Bridge

CloudCLI web UI at localhost:4681 (your-cloudcli.example.com via Tailscale). Access Claude Code from any browser or mobile device.

## When activated:

Check if CloudCLI is running: `curl -s --max-time 2 http://localhost:4681/api/health`

If not running: "CloudCLI is not running. Start it or check port 4681."

If running, present via AskUserQuestion:

| Option | What it does |
|--------|-------------|
| Open in browser (Recommended) | Run `open https://your-cloudcli.example.com` to launch web UI |
| Show connection info | Display URL, auth token location, mobile QR code instructions |
| List web sessions | Query API for active web sessions |
| Create new web session | Start a new session via API |
| Something else | Free text |

### Connection Info Display

```
CloudCLI Web Terminal
═══════════════════════════════
URL:    https://your-cloudcli.example.com
Local:  http://localhost:4681
Auth:   Token-based (check CloudCLI config)
Mobile: Open URL on any device on your Tailnet
```

### After every action, suggest next steps via AskUserQuestion:
- Open in browser
- Check active sessions
- Back to main menu
- Something else
