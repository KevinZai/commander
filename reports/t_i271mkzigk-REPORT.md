Status: done — slice 1 Bible chapter MDX + docs inventory + ccc-handoff doc fix; draft PR opened (never merged)

Tier: Sonnet-class direct work, no sub-agents; scripts/greps for mechanical steps.

## CC-354 — Bible chapter MDX (slice 1)
- Result: converted the "The Kevin Z Method" chapter (BIBLE.md:117-233) to `mintlify-docs/bible/the-kevin-z-method.mdx` with frontmatter, a "rendered copy" note, and relative links (/bible, /methodology/...). Added to Methodology nav in `mintlify-docs/docs.json`. BIBLE.md unchanged (`git diff BIBLE.md` empty).
- Evidence: `mintlify broken-links` → "no broken links found in the files that parsed"; the new page parses. MDX escapes: `<4 hours` → `&lt;4 hours`, `{domain}` → `\{domain\}`. `mintlify dev` not run (would bind a port); only broken-links used.
- Next step: convert the remaining 6 chapters + appendices the same way (script in this task is a template); add a "The Kevin Z Method" sidebar group for them.

## CC-355 — Mintlify stale/broken-link inventory (read-only, nothing changed)
- Counts correct: 84 skills, 22 agents, 30 events/51 handlers match docs (hooks.json, skills/, agents/). Repo version is 8.1.0.
- `mintlify-docs/faq.mdx:89` — PRE-EXISTING MDX parse error: `title="What does \"core free forever\" actually guarantee?"` (backslash-escaped quotes in attribute). Page skipped by the link checker, so its links are unchecked. Fix: use single quotes or drop the inner quotes.
- Orphan pages (not in docs.json nav): `features/codex-compatibility.mdx`, `features/dashboard.mdx`.
- Version drift: `plugin/upgrade.mdx:147,149` pin 7.4.2 (rollback example; likely intentional — verify). Pages say "v8.0.0" (hooks-2026.mdx:3, introduction.mdx:60,134, plugin/skills.mdx:76,115, features/codex-compatibility.mdx:9,16,40) while the repo is 8.1.0; most are "introduced in" statements and correct; `plugin/install.mdx:6` already says 8.1.0. Linear AC says "4.0.0" — stale; real version is 8.1.0.
- Pro-tier refs (AC says none): introduction.mdx:114,119; faq.mdx:90; quickstart.mdx:34; compare/vs-aider.mdx:56; plugin/free-vs-pro.mdx:27,30; nav entry `plugin/free-vs-pro`. All state a hosted Pro tier is "planned later". Removing is a Kevin product decision (matches CLAUDE.md revenue model) — not changed.
- Install commands: `curl .../KevinZai/commander/main/install-remote.sh | bash` at quickstart.mdx:51,73, why-ccc.mdx:135, introduction.mdx:153,161, faq.mdx:24, features/compatibility.mdx:40, plugin/upgrade.mdx:113,139. Not executed (no installs). `introduction.mdx:160` code-fence info string "bash curl (Slash Commands Only)" looks malformed.
- No "Last updated" fields in any page, so that AC is unmeasurable as-is.
- Smallest next step: fix faq.mdx:89, then rerun `mintlify broken-links` so the rest of that page is checked.

## CC-1357 — ccc-handoff threshold / two-copy audit
- Finding: `ccc-handoff/SKILL.md` had no 70/85% thresholds and no "two durable copies" wording (grep: "two durable" appears nowhere in repo). Thresholds already live in rules/fable-method.md:61,117, rules/workflow-first.md:31-32, skills/ccc-fable/SKILL.md:98. What-not-to-retry was covered only by template `references/handoff-template.md:35-39`. The old guardrail "writes only inside ~/.claude/sessions/" conflicted with a second copy.
- Fix (small): SKILL.md now states 70%/85% thresholds, the two-copy rule (session file + `tasks/SESSION-HANDOFF-<date>.md` or tracker post, only when authorized), a guardrail to never drop "What Did NOT Work", and a reworded write guardrail. Codex mirror regenerated with `npm run build:codex` (only ccc-handoff/SKILL.md changed).
- Checks passed: audit-frontmatter, add-fable-contract --check, doc-sync, `claude plugin validate --strict`.
- Out of scope, still open in CC-1357: `hooks/context-warning.js:19-24` uses 30/15/10/5% *remaining*, not 70/85/90 used; `context-guard.js` already has 70/85/95 used. The merge of kit `context-rot-monitor.js` tiers is a hook change (needs its own PR and tests).
- Smallest next step: decide whether to merge tiers into context-warning.js or retire it in favor of context-guard.js.
