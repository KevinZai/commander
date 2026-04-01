---
name: improve
description: Manage the continuous improvement pipeline -- scan, review, approve, and implement improvements to CC Commander
triggers:
  - "/improve"
  - "/improve scan"
  - "/improve queue"
  - "/improve approve"
  - "/improve reject"
  - "/improve auto"
  - "/improve status"
version: 1.3.0
---

# /improve -- Continuous Improvement Pipeline

You are the Improvement Pipeline Manager. When the user invokes `/improve`, parse the subcommand and execute the appropriate workflow. If no subcommand is given, show the status dashboard.

## Routing

- `/improve` (no args) -> Show status dashboard
- `/improve scan` -> Run improvement scan now
- `/improve scan --manual` -> Prompt user for manual findings (X, HN, Reddit, Discord)
- `/improve queue` -> Show pending proposals sorted by priority
- `/improve approve <id>` -> Approve a proposal for implementation
- `/improve reject <id> <reason>` -> Reject a proposal with reason
- `/improve auto` -> Toggle auto-approval for low-risk items
- `/improve status` -> Show full pipeline statistics
- `/improve implemented` -> Show history of implemented improvements

## Status Dashboard (default)

When `/improve` is invoked with no arguments, display:

```
CONTINUOUS IMPROVEMENT PIPELINE  //  CC Commander v2.1.0
==========================================================

  Pipeline Stats
  ---------------
  Pending:      [n] proposals awaiting review
  Approved:     [n] queued for implementation
  Rejected:     [n] declined
  Implemented:  [n] shipped

  Last Scan:    [timestamp] ([n] findings)
  Auto-Approve: [ON/OFF] (documentation + impact <= 2)

  Commands
  ---------
  /improve scan           Run scan now
  /improve queue          Review pending proposals
  /improve approve <id>   Approve a proposal
  /improve reject <id>    Reject a proposal
  /improve auto           Toggle auto-approval
  /improve status         Full statistics
```

Read proposal files from `~/.claude/improvement-queue/` to compute the stats. Each `.json` file with a `prop-` prefix is a proposal. Count by `status` field: `pending`, `approved`, `rejected`, `implemented`.

Read `~/.claude/improvement-queue/scan-log.json` for the last scan timestamp and findings count.

## [scan] Run Improvement Scan

**Steps:**

1. Run the daily improvement scanner:

```bash
node ~/.claude/hooks/daily-improvement-scan.js
```

2. Read the output to determine how many proposals were generated.

3. If proposals were generated, display:

```
SCAN COMPLETE
=============
  New proposals:  [n]
  Total findings: [n]
  Duplicates skipped: [n]
  Duration: [n]s

  Run /improve queue to review pending proposals.
```

4. If no proposals were generated: "No new innovations found since last scan. The ecosystem is quiet today."

### Manual Scan (`/improve scan --manual`)

For findings from sources the automated scanner cannot reach (X threads, Discord tips, HN discussions):

1. Ask: "Describe the finding. Include: source URL, what it does, and why it matters for the kit."

2. Parse the user's description and create a proposal:

```json
{
  "id": "prop-[timestamp]-[random]",
  "timestamp": "[now]",
  "source": "manual",
  "url": "[user-provided URL]",
  "description": "[user-provided description]",
  "category": "[inferred category]",
  "impact": 0,
  "effort": 0,
  "status": "pending",
  "approvals": [],
  "rejections": []
}
```

3. Write the proposal to `~/.claude/improvement-queue/`.

4. Confirm: "Manual proposal created: [id]. Run `/improve queue` to evaluate it."

## [queue] Show Pending Proposals

**Steps:**

1. Read all `prop-*.json` files from `~/.claude/improvement-queue/`.

2. Filter to `status: "pending"` or `status: "approved"` (not yet implemented).

3. For pending proposals (not yet scored): display them grouped by source.

4. For scored proposals: sort by priority (`impact - effort`, descending).

5. Display:

```
IMPROVEMENT QUEUE
==================

  PENDING REVIEW ([n])
  ---------------------
  [id]  [source]  [category]
        [description]
        URL: [url]

  APPROVED — AWAITING IMPLEMENTATION ([n])
  ------------------------------------------
  [id]  Priority: [impact-effort]  Impact: [n]/5  Effort: [n]/5
        [description]
        Category: [category]

  Actions:
    To evaluate a pending proposal, say: "evaluate [id]"
    To approve: /improve approve [id]
    To reject:  /improve reject [id] [reason]
```

### Evaluating a Proposal

When the user says "evaluate [id]":

1. Read the proposal file.

2. **Evaluator assessment:** Score the proposal on impact (1-5) and effort (1-5):

   - **Impact:** How many kit users would benefit? Does it close a competitive gap from the competitive scan? Does it align with The Kevin Z Method?
   - **Effort:** How many files need to change? Does it require new dependencies? How much testing is needed?

3. **Security assessment:** Check for risks:

   - Does it introduce external dependencies?
   - Does it require new API keys or credentials?
   - Could it break existing installations?
   - Is the source license compatible?

4. Update the proposal file with scores and assessment:

```json
{
  "impact": 3,
  "effort": 2,
  "evaluator_rationale": "Closes a gap identified in competitive scan. Moderate user impact.",
  "security_assessment": "approve",
  "security_notes": "No new dependencies. Read-only integration."
}
```

5. Display the evaluation and ask: "Approve, reject, or skip?"

6. **Auto-approval check:** If `impact <= 2` and `category == "documentation"` and auto-approve is enabled, automatically approve with note "Auto-approved: low-risk documentation improvement."

## [approve] Approve a Proposal

**Steps:**

1. Parse `[id]` from $ARGUMENTS (everything after "approve").

2. Read the proposal file from `~/.claude/improvement-queue/[id].json`.

3. If not found, check for partial ID match (prefix match against all `prop-*.json` files).

4. Update the proposal:

```json
{
  "status": "approved",
  "approved_at": "[now]",
  "approvals": ["evaluator", "security"]
}
```

5. Add to `~/.claude/improvement-queue/approved.json` (create if not exists — this is the implementation queue sorted by priority).

6. Confirm: "Approved: [id] — [description]. Priority: [impact-effort]. Added to implementation queue."

## [reject] Reject a Proposal

**Steps:**

1. Parse `[id]` and `[reason]` from $ARGUMENTS.

2. If no reason provided, ask: "Why is this being rejected? (1 sentence)"

3. Update the proposal:

```json
{
  "status": "rejected",
  "rejected_at": "[now]",
  "rejection_reason": "[reason]",
  "rejections": [{"agent": "user", "reason": "[reason]"}]
}
```

4. Confirm: "Rejected: [id] — [reason]"

## [auto] Toggle Auto-Approval

**Steps:**

1. Check current auto-approval state from `~/.claude/improvement-queue/config.json` (create if not exists).

2. Toggle the `auto_approve` boolean.

3. Display:

```
AUTO-APPROVAL: [ON/OFF]

When ON, proposals meeting ALL of these criteria are auto-approved:
  - Impact score <= 2
  - Category = "documentation"
  - Security assessment = "approve"
  - No new dependencies

All other proposals require manual review.
```

## [status] Full Pipeline Statistics

**Steps:**

1. Read all proposal files and the scan log.

2. Compute and display:

```
IMPROVEMENT PIPELINE — FULL STATUS
====================================

  Pipeline Counts
  ----------------
  Total proposals:    [n]
  Pending review:     [n]
  Approved (queued):  [n]
  Rejected:           [n]
  Implemented:        [n]

  By Category
  ------------
  new-skill:      [n] pending / [n] approved / [n] rejected
  skill-upgrade:  [n] pending / [n] approved / [n] rejected
  new-hook:       [n] pending / [n] approved / [n] rejected
  new-command:    [n] pending / [n] approved / [n] rejected
  documentation:  [n] pending / [n] approved / [n] rejected
  integration:    [n] pending / [n] approved / [n] rejected
  security-fix:   [n] pending / [n] approved / [n] rejected

  By Source
  ----------
  github:          [n]
  github-release:  [n]
  npm:             [n]
  manual:          [n]

  Scan History (last 7 scans)
  ----------------------------
  [date]  [findings] findings  [new] new proposals
  [date]  [findings] findings  [new] new proposals
  ...

  Auto-Approve: [ON/OFF]

  Implementation Velocity
  ------------------------
  Proposals per week (avg): [n]
  Implementations per week (avg): [n]
  Avg time to implement: [n] days
```

## [implemented] Show Implementation History

**Steps:**

1. Read `~/.claude/improvement-queue/implemented.json` (if exists).

2. Display implemented proposals in reverse chronological order:

```
IMPLEMENTED IMPROVEMENTS
==========================

  [date]  [id]  [category]
          [description]
          Impact: [n]/5  Effort: [n]/5
          Release: v[version]
  ---
  ...

  Total implemented: [n]
```

If no implementations yet: "No improvements have been implemented yet. Run `/improve queue` to review pending proposals."

Args: $ARGUMENTS
