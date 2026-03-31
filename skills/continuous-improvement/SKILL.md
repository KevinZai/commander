---
name: continuous-improvement
version: 1.3.0
description: |
  Daily automated scan for new Claude Code techniques, tools, and best practices
  with multi-agent approval pipeline. Searches GitHub, npm, and community sources
  for innovations, generates proposals, and routes through evaluator and security
  agents before queueing for implementation.
triggers:
  - "improve the kit"
  - "find new techniques"
  - "scan for improvements"
  - "continuous improvement"
  - "daily scan"
model: sonnet
disable-model-invocation: false
---

# Continuous Improvement

Automated innovation pipeline for CC Commander. Scans external sources for new techniques, evaluates relevance and risk, and queues approved improvements for implementation.

## Overview

The continuous improvement system runs on two tracks:

1. **Daily automated scan** (`hooks/daily-improvement-scan.js`) searches GitHub and npm for new Claude Code innovations, writing raw proposals to `~/.claude/improvement-queue/`.
2. **On-demand evaluation** (this skill, triggered via `/improve`) runs the multi-agent approval pipeline on pending proposals.

Together they create a closed loop: the ecosystem evolves, the scanner catches it, the pipeline evaluates it, and approved changes get implemented into the kit.

## Scan Sources

| Source | What We Look For | API |
|--------|------------------|-----|
| GitHub Repos | New repos with "claude-code" in name/description, 10+ stars, created in last 7 days | GitHub Search API |
| GitHub Releases | New releases from tracked repos (ECC, SuperClaude, Antigravity, etc.) | GitHub Releases API |
| npm Registry | New packages with "claude-code" keyword, published in last 7 days | npm Search API |
| Community (manual) | X/Twitter threads, HN posts, Reddit r/ClaudeAI, Discord tips | Manual via `/improve scan --manual` |

### Tracked Repos (Auto-Watch)

These repos are checked for new releases on every scan:

- `anthropics/claude-code` -- official CLI updates
- `anthropics/claude-plugins-official` -- official plugin directory
- `affaan-m/everything-claude-code` -- ECC updates
- `code-yeongyu/oh-my-openagent` -- multi-model patterns
- `thedotmack/claude-mem` -- memory compression
- `NousResearch/hermes-agent` -- self-improving agent patterns
- `BayramAnnakov/claude-reflect` -- self-evolving skills
- `rtk-ai/rtk` -- token optimization
- `sickn33/antigravity-awesome-skills` -- skill library
- `jarrodwatts/claude-hud` -- statusline patterns

## Proposal Format

Every finding generates a proposal JSON file in `~/.claude/improvement-queue/`:

```json
{
  "id": "prop-1711612800000-a1b2",
  "timestamp": "2026-03-28T12:00:00.000Z",
  "source": "github",
  "url": "https://github.com/example/claude-code-feature",
  "description": "New approach to context compression using sliding window summarization",
  "category": "skill-upgrade",
  "impact": 0,
  "effort": 0,
  "status": "pending",
  "approvals": [],
  "rejections": []
}
```

### Categories

| Category | Description | Examples |
|----------|-------------|---------|
| `new-skill` | Entirely new capability to add to the kit | New CCC domain, domain pack |
| `skill-upgrade` | Enhancement to an existing skill | Better context handling in dialectic-review |
| `new-hook` | New lifecycle hook | Token compression hook |
| `new-command` | New slash command | `/usage` analytics command |
| `documentation` | Docs, guides, examples | New quickstart guide |
| `integration` | Bridge to external tool or platform | Beads integration, RTK integration |
| `security-fix` | Security improvement | Dependency vulnerability patch |

### Impact Scale (1-5)

| Score | Meaning | Example |
|-------|---------|---------|
| 1 | Minor polish | Typo fix, formatting improvement |
| 2 | Small improvement | New example in docs, minor skill tweak |
| 3 | Meaningful feature | New individual skill, hook enhancement |
| 4 | Significant capability | New CCC domain, major workflow improvement |
| 5 | Game-changing | New category of functionality (e.g., AI memory compression) |

### Effort Scale (1-5)

| Score | Meaning | Time Estimate |
|-------|---------|---------------|
| 1 | Trivial | < 1 hour |
| 2 | Small | 1-4 hours |
| 3 | Medium | 1-2 days |
| 4 | Large | 3-5 days |
| 5 | Major | 1+ week |

## Multi-Agent Approval Pipeline

When `/improve queue` displays pending proposals, each one can be routed through the approval pipeline:

### Stage 1: Scanner (Automated)

The daily scan script generates raw proposals. No human or agent review at this stage. All proposals start with `status: "pending"`.

### Stage 2: Evaluator Agent

Scores each proposal on two dimensions:

1. **Impact (1-5):** How much value does this add to the kit? Consider: number of users affected, competitive gap it closes, alignment with kit methodology.
2. **Effort (1-5):** How much work to implement? Consider: files changed, new dependencies, testing requirements, documentation updates.

The evaluator also tags the proposal with:
- `priority`: Computed as `impact - effort` (higher = better ROI)
- `rationale`: 1-2 sentence explanation of the score

### Stage 3: Security Agent

Reviews each proposal for risks:

- **Supply chain risk:** Does it introduce a new dependency? Is the dependency maintained? Any known vulnerabilities?
- **Data exposure:** Does it send data externally? Does it require new API keys or credentials?
- **Compatibility risk:** Could it break existing installations? Does it change the hook lifecycle?
- **License risk:** Is the source compatible with the kit's license?

Outputs: `approve` or `reject` with reason.

### Stage 4: Decision

| Condition | Action |
|-----------|--------|
| Evaluator scored + Security approved | Add to implementation queue |
| Evaluator scored + Security rejected | Mark as `rejected` with security reason |
| Impact >= 4 and Effort <= 2 | Fast-track: auto-approve if security passes |
| Impact <= 2 and category = `documentation` | Auto-approve (low-risk) |
| Any agent explicitly rejects | Mark as `rejected` with reason |

### Stage 5: Implementation Queue

Approved proposals are sorted by priority (`impact - effort`) and assigned to upcoming releases. The queue is stored in `~/.claude/improvement-queue/approved.json`.

## Process Flow

```
  [Daily Cron]                [On-Demand /improve]
       |                            |
  GitHub API scan               /improve scan
  npm API scan                      |
       |                    Merge new + existing
       v                            |
  Raw proposals              /improve queue
  (~/.claude/improvement-queue/)    |
       |                     Select proposal
       |                            |
       +------- Evaluator Agent ----+
       |              |
       |        Score impact/effort
       |              |
       +------- Security Agent -----+
       |              |
       |        Check risks
       |              |
       v              v
  [approved.json]  [rejected]
       |
  Sort by priority
       |
  Assign to release
       |
  Implement + PR
```

## History Tracking

Every scan and every decision is logged:

- **Scan log:** `~/.claude/improvement-queue/scan-log.json` -- timestamp, findings count per scan
- **Proposal history:** Each proposal file retains its full approval/rejection history
- **Implementation log:** `~/.claude/improvement-queue/implemented.json` -- what was added, when, which release, and the measured impact (GitHub stars delta, install count delta)

## Usage

| Command | Action |
|---------|--------|
| `/improve scan` | Run the daily scan immediately |
| `/improve queue` | Show pending proposals sorted by priority |
| `/improve approve <id>` | Approve a proposal for implementation |
| `/improve reject <id> <reason>` | Reject a proposal with explanation |
| `/improve auto` | Toggle auto-approval for low-risk items |
| `/improve status` | Show pipeline stats |

See the `/improve` command (`commands/improve.md`) for full subcommand documentation.

## Configuration

Environment variables for customization:

| Variable | Default | Description |
|----------|---------|-------------|
| `KZ_IMPROVE_QUEUE_DIR` | `~/.claude/improvement-queue` | Directory for proposal files |
| `KZ_IMPROVE_AUTO_APPROVE` | `false` | Auto-approve low-risk proposals |
| `KZ_IMPROVE_MIN_STARS` | `10` | Minimum GitHub stars to generate a proposal |
| `KZ_IMPROVE_SCAN_DAYS` | `7` | How many days back to search |
| `KZ_IMPROVE_TRACKED_REPOS` | (see list above) | Comma-separated repos to watch for releases |

## Credit

Part of Kevin Z's CC Commander v1.6.0. Built to keep the kit ahead of the ecosystem automatically.
