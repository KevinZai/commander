---
name: ccc-improve
description: "Run the continuous-improvement pipeline: scan GitHub and npm for new Claude Code tooling, score proposals, and approve or reject them in a local queue. Use when reviewing ecosystem findings or deciding what to adopt next."
triggers:
  - "/ccc-improve"
  - "/ccc-improve scan"
  - "/ccc-improve queue"
  - "/ccc-improve approve"
  - "/ccc-improve reject"
  - "/ccc-improve auto"
  - "/ccc-improve status"
version: 1.3.0
---

# /ccc-improve — continuous improvement pipeline

**CC Commander** · /ccc-improve · a scored queue of improvement proposals with approve, reject, and history views.

Parse the subcommand from `$ARGUMENTS` and run the matching section. With no subcommand, show the dashboard.

## Routing

| Input | Section |
|---|---|
| (none) | Dashboard |
| `scan` | Scan |
| `scan --manual` | Manual proposal |
| `queue` | Queue |
| `evaluate <id>` (or "evaluate <id>" in chat) | Evaluate |
| `approve <id>` | Approve |
| `reject <id> <reason>` | Reject |
| `auto` | Toggle auto-approval |
| `status` | Full statistics |
| `implemented` | Implementation history |

## Data

Queue directory `<queue>`: `$KZ_IMPROVE_QUEUE_DIR` when set, otherwise `~/.claude/improvement-queue/`.

| File | Contents |
|---|---|
| `prop-*.json` | one proposal each; `status` is `pending`, `approved`, `rejected` or `implemented` |
| `scan-log.json` | scan history: timestamp, findings, new proposals |
| `approved.json` | implementation queue, sorted by priority (`impact - effort`) |
| `implemented.json` | shipped proposals |
| `config.json` | `{ "auto_approve": false }` |

If `<queue>` does not exist, say no scan has run yet and suggest `/ccc-improve scan`.

## Dashboard (default)

Read every `prop-*.json`, count by `status`, and read the last entry of `scan-log.json`:

```
CONTINUOUS IMPROVEMENT PIPELINE
===============================
  Pending:      <n> proposals awaiting review
  Approved:     <n> queued for implementation
  Rejected:     <n> declined
  Implemented:  <n> shipped

  Last Scan:    <timestamp> (<n> findings)
  Auto-Approve: <ON/OFF> (documentation + impact <= 2)
```

Then ask what to do next with AskUserQuestion (plain-text question where unavailable): 🟢 Review the queue · Run a scan now · Full statistics.

## Scan

1. Run the scanner, first path that exists:

   ```bash
   node ~/.claude/hooks/daily-improvement-scan.js
   # repo checkout fallback:
   node hooks/daily-improvement-scan.js
   ```

   It searches GitHub and npm for recent Claude Code tooling and writes proposals to `<queue>`. Optional env: `KZ_IMPROVE_MIN_STARS` (default 10), `KZ_IMPROVE_SCAN_DAYS` (default 7), `GITHUB_TOKEN` for higher rate limits. Never print the token. On a non-zero exit, show stderr and stop.
2. Parse the final line (`Daily scan complete: <n> new proposals (<n> total findings, <n> duplicates skipped) in <n>s`) and display:

   ```
   SCAN COMPLETE
   =============
     New proposals:      <n>
     Total findings:     <n>
     Duplicates skipped: <n>
     Duration:           <n>s
   ```

3. With zero new proposals, say "No new findings since the last scan."
4. To run it on a schedule, suggest `/schedule` (a Routine) or a system cron entry; set one up only when the user asks.

### Manual proposal (`scan --manual`)

For findings the scanner cannot reach (X threads, Discord tips, HN or Reddit discussions):

1. Ask in plain text for the source URL, what it does, and why it matters for this toolkit.
2. Write `<queue>/prop-<unix-ms>-<4 random hex>.json`:

   ```json
   {
     "id": "prop-<unix-ms>-<hex>",
     "timestamp": "<ISO now>",
     "source": "manual",
     "url": "<user-provided URL>",
     "description": "<user-provided description>",
     "category": "<inferred category>",
     "impact": 0,
     "effort": 0,
     "status": "pending",
     "approvals": [],
     "rejections": []
   }
   ```

3. Verify the file parses (`node -e "JSON.parse(require('fs').readFileSync(process.argv[1]))" <file>`), then confirm: "Manual proposal created: <id>. Run `/ccc-improve queue` to evaluate it."

## Queue

1. Read every `prop-*.json` with `status` `pending` or `approved`.
2. Group unscored pending proposals (`impact` 0) by source; sort scored ones by `impact - effort`, descending.
3. Display:

   ```
   IMPROVEMENT QUEUE
   ==================
     PENDING REVIEW (<n>)
     <id>  <source>  <category>
           <description>
           URL: <url>

     APPROVED — AWAITING IMPLEMENTATION (<n>)
     <id>  Priority: <impact-effort>  Impact: <n>/5  Effort: <n>/5
           <description>
           Category: <category>
   ```

4. Ask which pending proposal to evaluate (up to four ids as options, most recent first).

## Evaluate

1. Read the proposal file. If the id is not an exact match, try a prefix match against `prop-*.json`; if several match, list them and ask.
2. Score **impact** (1–5): how many toolkit users benefit, whether it fills a real gap in the current skills, commands or hooks, and whether it fits the existing patterns.
3. Score **effort** (1–5): files to change, new dependencies, testing needed.
4. Security assessment — answer each:
   - Does it add external dependencies?
   - Does it require new API keys or credentials?
   - Could it break existing installations?
   - Is the source license compatible with the project's license?

   Set `security_assessment` to `approve` or `reject` with notes.
5. Merge into the proposal file and verify it still parses:

   ```json
   {
     "impact": 3,
     "effort": 2,
     "evaluator_rationale": "<one or two sentences>",
     "security_assessment": "approve",
     "security_notes": "<one sentence>"
   }
   ```

6. Auto-approval: when `config.json` has `auto_approve: true` and the proposal has `category` `documentation`, `impact <= 2`, `security_assessment` `approve`, and no new dependencies, approve it with the note "Auto-approved: low-risk documentation improvement" and skip step 7.
7. Show the evaluation and ask with AskUserQuestion (plain-text question where unavailable): 🟢 Approve — added to the implementation queue · Reject — asks for a one-sentence reason · Skip — stays pending.

## Approve

1. Parse `<id>` from `$ARGUMENTS`; resolve it as in Evaluate step 1.
2. Merge into the proposal: `"status": "approved"`, `"approved_at": "<ISO now>"`, `"approvals": ["evaluator", "security"]`.
3. Add the proposal to `approved.json` (create it as `[]` if missing) and keep that array sorted by `impact - effort`, descending.
4. Verify both files parse, then confirm: "Approved: <id> — <description>. Priority: <impact-effort>. Added to the implementation queue."

## Reject

1. Parse `<id>` and `<reason>` from `$ARGUMENTS`. With no reason, ask for one sentence.
2. Merge into the proposal: `"status": "rejected"`, `"rejected_at": "<ISO now>"`, `"rejection_reason": "<reason>"`, and append `{"agent": "user", "reason": "<reason>"}` to `rejections`.
3. Verify the file parses, then confirm: "Rejected: <id> — <reason>."

## Toggle auto-approval

1. Read `config.json` (create it as `{ "auto_approve": false }` if missing).
2. Flip `auto_approve`, write it back, and re-read it to confirm the new value.
3. Display:

   ```
   AUTO-APPROVAL: <ON/OFF>

   When ON, proposals meeting all of these are auto-approved:
     - Impact score <= 2
     - Category = "documentation"
     - Security assessment = "approve"
     - No new dependencies

   All other proposals require manual review.
   ```

## Full statistics (`status`)

Read every proposal and `scan-log.json`, then compute:

```
IMPROVEMENT PIPELINE — FULL STATUS
====================================
  Pipeline Counts
    Total proposals:    <n>
    Pending review:     <n>
    Approved (queued):  <n>
    Rejected:           <n>
    Implemented:        <n>

  By Category  (pending / approved / rejected)
    new-skill, skill-upgrade, new-hook, new-command,
    documentation, integration, security-fix: <n> / <n> / <n> each

  By Source
    github, github-release, npm, manual: <n> each

  Scan History (last 7 scans)
    <date>  <findings> findings  <new> new proposals

  Auto-Approve: <ON/OFF>

  Implementation Velocity
    Proposals per week (avg):        <n>
    Implementations per week (avg):  <n>
    Avg time to implement:           <n> days
```

Velocity uses `timestamp`, `approved_at` and the implemented date; print `n/a` when there is not enough data.

## Implementation history (`implemented`)

Read `implemented.json`. If it is missing or empty, say "No improvements have been implemented yet. Run `/ccc-improve queue` to review pending proposals." Otherwise list newest first:

```
IMPLEMENTED IMPROVEMENTS
==========================
  <date>  <id>  <category>
          <description>
          Impact: <n>/5  Effort: <n>/5
          Release: <release recorded on the entry>

  Total implemented: <n>
```

## Done when

The section's output is printed from the files read this turn, and every write was followed by a successful parse of the written file.

## Guardrails

- Writes stay inside `<queue>`. Approving a proposal queues it; implementing it is a separate, explicitly requested task.
- Never delete proposal files; rejected proposals keep their record.
- Never print `GITHUB_TOKEN` or any other credential.

## See also

`/ccc-improve-commands` · `/ccc-skill-health` · `/ccc-harness-audit`
