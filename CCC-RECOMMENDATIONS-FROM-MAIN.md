# CC Commander Recommendations — From Main Orchestrator Session
> Written 2026-04-04 by the main clawd Opus session. Kevin asked me to pass this along.
> Read this file and incorporate into your planning.

## Context
Kevin and I spent this session building out his full agent infrastructure. We installed and configured: CloudCLI (web CC terminal), Fleet Commander (agent PM dashboard), Synapse (observability), Composio AO (parallel agent orchestration), and connected everything via Tailscale. CCC needs to integrate with this ecosystem.

---

## NEW SKILLS/COMMANDS TO ADD (high value, unique to CCC)

### 1. `/fleet` — Fleet Commander wrapper (PAID TIER)
Wrap `fleet-commander-ai` (npm, running at :4680). Launch, monitor, message, and shut down parallel CC agent teams from inside any CC session. "Give me 5 agents on these 5 issues" → spawns worktrees, monitors PRs, detects stuck agents. **No other CC plugin does fleet orchestration from within a session.**

### 2. `/syn` or `/observe` — Synapse observability (PAID TIER)
Read from Synapse API at localhost:4682. "Show me what my agents are doing" → renders summary of active sessions, tool calls, token usage, timing. Live node graph data without leaving terminal.

### 3. `/cloudcli` — Web session bridge (FREE TIER)
Quick launch/connect to CloudCLI web UI. Open browser to configured URL, list active web sessions, create new ones. Bridge between terminal CC and web CC for mobile access.

### 4. `/ao spawn` — Composio AO wrapper (PAID TIER)
Wrap `ao` CLI (npm @composio/ao, installed globally). Spawn parallel agents across configured projects with worktree isolation. Config at `agent-orchestrator.yaml`. Supports Claude Code, Codex, Aider, OpenCode.

### 5. Enhanced `/paperclip` (FREE TIER)
Add "pick up next issue" flow: check Paperclip for Ready issues → create worktree → start working → auto-update issue status. Bridge between task management and execution. Paperclip API at localhost:3110.

### 6. `/cost` — Real-time cost tracking (PAID TIER)
Pull from Agent HQ API at localhost:3005/api/costs. Show daily/weekly/monthly burn across all sessions. Critical for users managing multiple MAX subs + ClaudeSwap.

---

## OVERLAP AUDIT — Vendor Packages vs Installed Tools

Kevin has these tools installed that may overlap with CCC vendor packages:

| Installed Tool | Overlapping CCC Skills | Recommendation |
|---------------|----------------------|----------------|
| Composio AO (`ao` CLI) | `/orchestrate`, `/dispatching-parallel-agents`, `/dmux-workflows` | Replace with thin `/ao` wrapper |
| Fleet Commander | `/ccc-spawn`, `/devfleet`, `/subagent-driven-development` | Replace with `/fleet` wrapper |
| Synapse | `/cache-monitor`, `/context-budget` | Keep CCC versions (different scope), add `/syn` |
| CloudCLI | `/ccc-teleport`, `/sessions` | Keep `/sessions`, add `/cloudcli` bridge |
| Claude Peers MCP | `/peers`, `/acpx` | Keep both (MCP = transport, skills = UX) |
| Claude Squad (not installed) | CCC multi-agent skills | No action — CCC is the alternative |

**Recommendation:** Audit the 16 vendor packages and 248+ skills. If an external tool does it better, replace the CCC skill with a thin wrapper. Keep CCC focused on what ONLY it can do: skill orchestration, instinct learning, hooks lifecycle, session intelligence.

---

## OPEN SOURCE vs PAID TIER SPLIT

**Free tier (open source):**
- Core skills: /plan, /tdd, /review, /build, /test, /ship
- Session management: /save-session, /resume-session
- Learning: /learn, /instinct-status, /lessons
- Quality: /quality-gate, /verify, /simplify
- Single-session tools only
- Basic hooks (format, typecheck, console.log detection)

**Paid tier:**
- Fleet orchestration: /fleet, /ao, /devfleet, /ccc-spawn
- Observability: /syn, /cost, /context-budget, /cache-monitor
- Multi-session: /ccc-parallel, /peers, /overnight-runner
- Advanced: /dialectic-review, /ccc-makeover, /ccc-xray
- All vendor integrations
- Advanced hooks (continuous learning, instinct system)
- Priority support + updates

**Positioning:** "Claude Code for individuals (free) → Claude Code for teams/power users (paid)"

---

## MUST-HAVES for CCC v2.0

1. **`/fleet`** — #1 feature for power users running multiple agents
2. **Cost tracking** — users NEED to see spend (`/cost` command)
3. **Vendor audit** — trim from 16 to 8-10 packages, remove dead weight
4. **Smart `/init`** — detect installed tools (AO, Fleet Commander, Synapse, Paperclip, Linear MCP) and auto-configure CCC to use them
5. **Paperclip/Linear hooks** — auto-sync task status when work starts/completes
6. **Mobile story** — document CloudCLI + Nimbalyst as the mobile access layer

---

## Kevin's Stack (for context)

| Service | Port | URL | Purpose |
|---------|------|-----|---------|
| CloudCLI | 4681 | cc.k3v80.com | Web CC terminal + multi-session |
| Fleet Commander | 4680 | fleet.k3v80.com | Agent PM dashboard |
| Synapse | 4682 | syn.k3v80.com | Agent observability |
| Agent HQ v4 | 3005 | hq.k3v80.com | Fleet health + costs |
| Composio AO | 3000 | ao.k3v80.com | Parallel agent orchestration |
| Paperclip | 3110 | pc.k3v80.com | Task dispatch |
| bolt.diy | 5173 | bolt.k3v80.com | AI web app builder |
| OpenClaw | 18789 | gateway.k3v80.com | Channel routing (Discord/Slack/TG/WA) |
| ClaudeSwap | 8082 | — | Multi-MAX subscription load balancer |
| Claude Peers | 7899 | — | Inter-session messaging |
