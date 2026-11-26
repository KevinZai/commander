# KEV-55: cheap reader subagent trial in `/ccc-deep-review`

Date: 2026-11-02. Idea: Shopify's agent setup (via an X post, figures unverified) has the frontier model plan and judge while a cheap model does the reading. Trial: one CCC flow gets a cheap, read-only reader, and token use is compared before and after.

## What changed

`commander/cowork-plugin/workflows/ccc-deep-review.workflow.js` has an opt-in `Read` phase (`args.reader: true`). One Explore agent pinned to `haiku` runs `git diff <base>...HEAD` once and returns a structured digest (per file, per hunk: new-side line range, one-line summary, changed lines verbatim, at most 30 per hunk). The four dimension reviewers get the digest in their prompt and open files only to confirm a finding's lines. Verifiers are unchanged and still check against the real diff. A failed reader falls back to the old path, and the result reports `reader: off | used | failed`.

The default stays `reader: false` because of the measurement below.

## Measurement

Sample: merge #272 (`git diff 5738f260^1...5738f260`, 27 files, +348/-78), security dimension only, run as subagents with the workflow's prompts. Tokens are the subagent totals the harness reported.

| Path | Agent | Model | Tokens |
|---|---|---|---|
| Before | reviewer reads the diff | session model | 40,957 |
| After | reader digests the diff | haiku | 61,515 |
| After | reviewer starts from the digest | session model | 37,692 |

Both reviewers returned the same two findings (one medium, one low).

Extrapolated to four dimensions (an estimate, not measured): before ≈ 164k session-model tokens; after ≈ 151k session-model + 62k haiku. That is about 8% fewer session-model tokens and about 30% more tokens overall. The reader also runs before the reviews start, which added about 68 s of wall-clock time to this sample.

## Reading

- The saving is small because the digest keeps changed lines verbatim (26 KB for this diff), so reviewers still take in most of the diff. Each reviewer's fixed cost (system prompt, tool schemas, its own reasoning) does not shrink.
- The pattern pays off when reading dominates: large diffs, or reviewers that also open many surrounding files. A small, self-contained diff like this sample is the weak case.
- One sample, one dimension. Treat these numbers as a direction, not a result.

## Next trial

Run `reader: true` and `reader: false` on two or three large diffs with all four dimensions, and record per-agent tokens. Then try a tighter digest (shorter excerpts, with line anchors so reviewers can open exactly what they need). Turn the reader on by default only if session-model tokens drop by a meaningful margin without losing findings.
