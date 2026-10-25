---
name: ccc-domains
description: "Alias for /ccc-learn: opens the domain picker to browse and load a skill domain such as design, marketing, SaaS, testing, DevOps or security. Use when the user types /ccc-domains, says 'domain skills' or 'show categories', or asks which skills exist for a field."
allowed-tools:
  - Read
  - Bash
  - Glob
  - Agent
  - Skill
  - AskUserQuestion
argument-hint: "[design | marketing | saas | testing | devops | seo | security | research | mobile | data | makeover]"
model: sonnet
effort: low
disable-model-invocation: true
---

# /ccc-domains — alias for /ccc-learn

**CC Commander** · /ccc-domains · the same domain picker as `/ccc-learn`, kept so older references keep working.

`/ccc-learn` is the canonical domain picker. This alias holds no menu of its own, so the two never drift.

## When to use / when not to

- Use when someone types `/ccc-domains` or follows an older link or doc that names it.
- Prefer `/ccc-learn` in anything new you write or suggest.
- Do not use for the full skill and agent catalog: that is `/ccc-browse`.

## What happens

1. Invoke the `ccc-learn` skill with the Skill tool, passing `$ARGUMENTS` unchanged (for example `/ccc-domains seo` becomes `ccc-learn seo`).
2. Say one line first: "`/ccc-domains` is an alias — opening `/ccc-learn`."
3. Skill tool unavailable (Codex or an older client): Read `${CLAUDE_PLUGIN_ROOT}/skills/ccc-learn/SKILL.md` and follow it from its first step with the same argument.

## Done when

- `ccc-learn` was invoked, or its SKILL.md was read and followed, in this turn with the user's argument intact.

## Guardrails

- Never render a separate domain menu here; `/ccc-learn` owns the picker and its choices in `${CLAUDE_PLUGIN_ROOT}/menus/ccc-learn.json`.
- Never state domain or skill counts here.
- This alias changes no state.

## See also

- `/ccc-learn` — the domain picker this alias opens
- `/ccc-browse` — searchable catalog of skills and agents
- `/ccc-cheatsheet` — live map of every workflow

---

> ⚙️ **Fable contract:** plan before build · verifier ≠ worker · prove before alarm · loops need gates · leave durable state — `rules/fable-method.md`
