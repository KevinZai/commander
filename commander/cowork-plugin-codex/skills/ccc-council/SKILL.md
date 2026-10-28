---
name: ccc-council
description: "Get a read-only review or feedback from delegates on three providers, with scores per round and honest reporting when one is missing. Use when the user says \"council\" or wants multi-provider feedback on a change or plan."
allowed-tools:
  - Read
  - Agent
  - Bash(command -v codex)
  - Bash(git diff *)
  - Bash(git status *)
  - AskUserQuestion
argument-hint: "[request] [--members a,b,c]"
disable-model-invocation: true
---

# $ccc-council — Three-provider read-only review

**CC Commander** · $ccc-council · delegates from three providers review in parallel and you get findings, disagreements and a score table.

> Adapted from [t3dotgg/tstack](https://github.com/t3dotgg/tstack) `skills/council/SKILL.md` at `92e38e2cf677a84a142e8df296861c588542135c`. MIT, Copyright (c) 2026 Theo Browne; see `LICENSE.txt`. Changes for CC Commander are marked "CCC safety:".

The user's session model is preserved; only the delegates use other models. Upstream also supports T3 Code orchestration; this version uses Claude Code and Codex.

## When to use / when not to

- Use for review or feedback where independent providers add signal: a diff, a plan, a design.
- Not when one reviewer is enough. The cheaper alternative is a single-provider lens debate: see `$ccc-debate` in See also.

## What happens

1. **Resolve members.** If the user's instructions name members, use those. Otherwise use one strong model from each of three providers at high reasoning effort:
   - Claude: an Agent tool subagent on `opus` or `fable`.
   - OpenAI: `codex exec -m gpt-6-astra -s read-only --output-last-message <file> "<request>"`. Check `command -v codex` first.
   - Third provider: opt-in only. Use a flagship model from a third provider the user has configured (for example a CLI they name). Do not guess a provider and do not install anything.
2. **Handle a missing member.** CCC safety: if a member is unavailable (no Codex, not signed in, no third provider configured), report which and why, then run with the members you have, labelled clearly as an incomplete council (for example "Council (2 of 3 providers: third provider not configured)"). Never substitute another model and never imply three providers reviewed.
3. **Brief the delegates.** Give each the request and relevant context (diff command, intent, out-of-scope). For review or feedback, keep delegates read-only: no edits, commits, pushes or PR comments. Start them in parallel.
4. **Collect and summarize.** Report useful findings, disagreements and recommended next steps. For a code review, ask each delegate for a score out of 10. Count each full review pass as one round; a fresh review after fixes starts a new round.
5. **Fix only when asked, in bounded rounds.** The council itself is review-only. CCC safety: change code only when the user asked for fixes as well as review (or a calling workflow such as `ccc-full-send` owns the change); otherwise report the recommendations and stop. When fixing is authorized, apply the agreed recommendations with the smallest change, run the covering checks, and request a fresh round. Stop at agreement or after three rounds (five for security, permissions, auth or data loss while a real finding stays open), and report any disagreement for the user to decide. Do not let repeated reviews cause scope creep: it is your job to fight to keep scope limited.
6. **Record results.** If the work ends in a pull request, put this section in the PR description before the model and harness line at the end. Edit the description (do not post a comment), and only when the user asked you to update the PR:

   ```markdown
   ## Council review

   Rounds: 2

   | Delegate | Round 1 | Round 2 |
   | --- | --- | --- |
   | Claude (opus) | 7/10 | 9/10 |
   | OpenAI (gpt-6-astra) | 8/10 | 10/10 |
   | Third provider | 7/10 | 9/10 |
   ```

   If a delegate gives no score, write `no score`. Do not invent one. If a member was unavailable, say so in the section. With no PR, put the same results in the final reply only.

## Decision points

- A member is unavailable: AskUserQuestion with 🟢 continue as a labelled incomplete council, name a different member, or stop. Codex fallback: request_user_input or a plain-text question.

## Done when

- Each available delegate returned a reply and a score or `no score`; the table and summary are delivered, with any missing member named.
- Any change made after agreeing was followed by a fresh round, or the user accepted stopping.

## Guardrails

- Delegates are read-only; they never edit, commit or push.
- Never substitute a model for an unavailable member and never invent a score.
- Push only per the repository's full local gate (suite and lint green on the head); never skip hooks or secret scanning.

## See also

- `$ccc-debate` — single-provider lens debate (the cheaper alternative)
- `$ccc-sol-loop` — one OpenAI reviewer in a loop
- `$ccc-review` — branch review

> ⚙️ **Fable contract:** plan before build · verifier ≠ worker · prove before alarm · loops need gates · leave durable state — `rules/fable-method.md`

> (On Codex, present these options as a numbered list and ask the user to reply with a number — AskUserQuestion is Claude-only.)
