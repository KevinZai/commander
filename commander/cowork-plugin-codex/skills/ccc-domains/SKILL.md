---
name: ccc-domains
description: "CCC domain router — browse and activate any of the 11 CCC skill domains. Use when the user says 'ccc domains', 'domain skills', 'show categories', 'what skills are…"
allowed-tools:
  - Read
  - Bash
  - Glob
  - Agent
  - AskUserQuestion
argument-hint: "[design | marketing | saas | testing | devops | seo | security | research | mobile | data | makeover]"
---


# /ccc-domains — alias → /ccc-learn

> **Deduplicated (v6.1).** This skill is now an alias for **/ccc-learn** — the canonical domain picker — click-first across all 11 CCC domains (and /ccc-browse for the full skill+agent catalog).
>
> Invoke /ccc-learn instead. This stub is kept so the `$ccc-domains` command still resolves and prior references do not break.

---

> ⚙️ **Fable contract:** plan before build · verifier ≠ worker · prove before alarm · loops need gates · leave durable state — `rules/fable-method.md`

> (On Codex, present these options as a numbered list and ask the user to reply with a number — AskUserQuestion is Claude-only.)
