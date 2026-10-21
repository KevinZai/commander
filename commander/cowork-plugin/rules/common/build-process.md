# Build Process

How a ticket moves from design to a merged change when several model tiers work on it, and how every run reports back. For commit and PR mechanics, see [git-workflow.md](./git-workflow.md). For when to delegate, see `rules/workflow-first.md`.

## One ticket, one branch, one PR

- Each ticket gets its own branch and its own pull request. Open the PR as a draft as soon as there is a first commit.
- Related tickets may share a session. They do not share a branch.
- Never force-push a branch that someone else may have reviewed, and never force-push the default branch.

## Role tiers

| Tier | Alias | Role on the ticket |
|---|---|---|
| Design | `fable` | Architecture, interfaces, risky trade-offs, the plan the builder follows |
| Manage and audit | `opus` | Breaks the plan into tickets, briefs builders, reviews and audits every result |
| Build | `sonnet` | Writes the code and tests against the plan |
| Mechanical | `haiku` | Renames, formatting, extraction, bulk edits with an exact spec |

The builder never audits its own work. The auditor is a different session from the builder, and it runs the checks itself instead of trusting the builder's report.

## Escalation

When a builder fails a ticket (tests stay red, the audit rejects it, or the builder is stuck), escalate in this order:

1. `sonnet` retries once with the failure evidence.
2. `sonnet` retries a second time with a narrower brief.
3. `opus` takes the ticket.
4. `fable` re-plans the ticket.
5. The human owner decides.

Each step gets the previous step's evidence: the failing command, its output, and the diff. Never skip a step silently. If a step is unavailable, say so in the report.

## GitHub post-back (mandatory)

Every run that works on a ticket ends by posting its final status on GitHub, and its report includes that comment's `github.com` URL.

1. If the ticket has a PR, post the FINAL STATUS as a comment on that PR.
2. If there is no PR yet and the run changed code, open a draft PR (when pushing is authorized for the run) and comment there.
3. For doc-only or no-code work, comment on the ticket's tracking issue.
4. Put the comment URL in the run's report. A run whose report has no `github.com` URL is not done; whoever coordinates the run sends it back once to post, and blocks it if the URL is still missing.

The FINAL STATUS comment states: what changed, the verification that actually ran and its result, what is left, and any decision needed (as two to four options, recommended option first).

## Never

- Never post secrets, tokens, internal hostnames, or private paths in a PR comment or report.
- Never mark a ticket done without the post-back URL.
- Never let the same session build and audit a change.
