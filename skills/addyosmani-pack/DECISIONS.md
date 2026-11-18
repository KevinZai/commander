# addyosmani-pack: ADD/SKIP decisions

Upstream: [addyosmani/agent-skills](https://github.com/addyosmani/agent-skills) at `39b723ceebf81474d0557c1fecd01eddab585563`, MIT (see [LICENSE.txt](LICENSE.txt)). Each of the 25 upstream skills was read and compared with Commander's plugin skills (`commander/cowork-plugin/skills/`) and toolkit skills (`skills/`). ADD means no Commander skill covers the practice; SKIP names the Commander skill that already does.

| Upstream skill | Decision | Reason |
|---|---|---|
| api-and-interface-design | ADD | Contract-level interface design (Hyrum's Law, one-version rule, additive change, idempotency keys, TS discriminated unions and branded IDs) goes beyond `skills/ccc-saas/api-design` (REST conventions) and `skills/engineering-pack/api-design-reviewer` (review). |
| browser-testing-with-devtools | ADD | Chrome DevTools MCP workflow (console, network, performance traces, isolated profile, untrusted-content rules); `skills/browse` and `skills/visual-verify` cover headless browsing and screenshot loops, not DevTools inspection. |
| ci-cd-and-automation | SKIP | Covered by `/ccc-ci` and `skills/engineering-pack/ci-cd-pipeline-builder`; its "CI as gate" framing also conflicts with SAFETY.md R3. |
| code-review-and-quality | SKIP | Covered by `/ccc-review` (and `/ccc-code-review` alias), plus `skills/requesting-code-review` and `skills/receiving-code-review`. |
| code-simplification | ADD | No Commander skill for behavior-preserving simplification of working code; reviewer agents only forbid unsafe simplification. |
| constraint-driven-development | ADD | Written quality bar (`CONSTRAINTS.md`), lifecycle wiring and a floor guard against agents lowering the bar; nothing equivalent in Commander. One "CCC safety:" note (R3). |
| context-engineering | ADD | Context hierarchy and packing discipline; `skills/context-budget`, `skills/context-mode` and `/ccc-claudemd` cover measurement, sandboxing and CLAUDE.md audit, not the practice itself. |
| debugging-and-error-recovery | SKIP | Covered by `/ccc-systematic-debugging` and `skills/systematic-debugging`. |
| deprecation-and-migration | ADD | Deprecation lifecycle (compulsory vs advisory, strangler/adapter, expand/contract, zombie code); `skills/engineering-pack/migration-architect` plans system and data migrations, not deprecation. |
| documentation-and-adrs | ADD | ADRs and doc-drift detection; `/ccc-doc-sync` only syncs Commander's own counts and versions, and `skills/doc-coauthoring` is general writing. |
| doubt-driven-development | ADD | Bounded fresh-context adversarial review of each decision during work; `/ccc-debate`, `/ccc-council` and `skills/dialectic-review` are one-shot reviews of a finished artifact. |
| frontend-ui-engineering | SKIP | Covered by `/ccc-design`, `skills/ccc-design/frontend-design`, `skills/frontend-patterns` and `skills/accessibility-compliance`. |
| git-workflow-and-versioning | ADD | Commit, versioning and changelog discipline; `skills/using-git-worktrees` and `skills/finishing-a-development-branch` cover only worktrees and branch completion. Four "CCC safety:" notes (R1, R2, R3, R4, R8). |
| idea-refine | ADD | Divergent then convergent refinement of a raw idea into a one-pager; `/ccc-brainstorm` and `skills/brainstorming` compare implementation approaches for a known goal. |
| incremental-implementation | SKIP | Covered by `/ccc-plan-exec`, `skills/executing-plans` and `skills/subagent-driven-development`. |
| interview-me | ADD | Intent-extraction interview to about 95% confidence; `skills/ccc-research/spec-interview` and `skills/spec-interviewer` collect specs, not underlying intent. |
| observability-and-instrumentation | ADD | Code-level logs, metrics, traces and telemetry verification; `skills/engineering-pack/observability-designer` and `skills/ccc-devops/performance-monitoring` cover SLO, dashboard and APM strategy. |
| performance-optimization | SKIP | Covered by `skills/engineering-pack/performance-profiler`, `skills/ccc-devops/performance-monitoring` and `skills/benchmark`. |
| planning-and-task-breakdown | SKIP | Covered by `/ccc-plan` and `skills/writing-plans`. |
| security-and-hardening | SKIP | Covered by `/ccc-security`, `/ccc-harden` and `skills/ccc-security`. |
| shipping-and-launch | SKIP | Covered by `/ccc-ship`, `/ccc-deploy-check` and `skills/canary`. |
| source-driven-development | ADD | Docs-grounded implementation with version detection and citations; no Commander equivalent. |
| spec-driven-development | SKIP | Covered by `/ccc-plan`, `skills/spec-interviewer` and `skills/evals-before-specs`. |
| test-driven-development | SKIP | Covered by `/ccc-testing` (tdd lane, `skills/ccc-testing/tdd-workflow`). |
| using-agent-skills | SKIP | Meta-skill for the upstream catalog; Commander routing is `/ccc-suggest`, `skills/using-superpowers` and this pack's router. |

Totals: 13 ADD, 12 SKIP.

## code-simplification provenance

Upstream says this skill is "inspired by" Anthropic's Code Simplifier plugin (Apache-2.0). On 2026-11-18 it was compared line by line with that agent file at anthropics/claude-plugins-official `e6143c9807a001832badb63e89d58ffe25d542ec` (`plugins/code-simplifier/agents/code-simplifier.md`). None of its 114 long lines appears there verbatim, so it is treated as Addy Osmani's own MIT text that credits the idea, and no Apache notice is required. If a later sync copies text from the plugin, add an Apache-2.0 section to NOTICE.md first.

## Second Codex pass (2026-11-18)

- `floor-guard.md` no longer echoes flagged lines from any file (only rule and file). A local run with a fake secret beside `gitleaks:allow` printed only `[silenced-checker] a.js`.
- `chrome-devtools-mcp` is pinned to `1.13.0`. `doubt-driven-development` uses a private `mktemp` prompt file removed on exit. Copying `quality-gate.mjs` now copies the full MIT text with it.
- The two upstream reference files that were not copied (`orchestration-patterns.md`, `observability-checklist.md`) are linked at the pinned commit.


## Third Codex pass (2026-11-18)

Fixed: `floor-guard` prints only rule and file for every finding, `git-workflow-and-versioning` runs its secret scan before showing the staged change (and then only `--stat`), and the `$50` example no longer trips the argument-placeholder test.

## Install-safety sweep (2026-11-18)

Every added line was checked for unpinned `npx`, package installs without exact versions, `:latest` images, download-and-execute, moving manifest URLs, dotenv loading and secrets in argv. Each hit was pinned or turned into a project-owned command:

- `browser-testing-with-devtools`: `chrome-devtools-mcp@1.13.0` is installed once as an exact dev dependency and launched with `npx --no-install`, which stops instead of fetching.
- `context-engineering` and `git-workflow-and-versioning`: the project's locked `./node_modules/.bin/tsc`. `deprecation-and-migration`: the project's own checked-in migration check instead of `npx migrate-check`.
- `constraint-driven-development`: Python tools at exact versions; Semgrep reads a checked-in ruleset, not the moving `p/default`; scanner reports go to a private temp file. The adapted floor guard keeps an MIT header and ships the license beside it.
- `git-workflow-and-versioning`: the pre-commit block is one errexit subshell: a git error, a secret-pattern match, a gitleaks finding, or failed tests, lint or typecheck all stop it.
- `doubt-driven-development`: the artifact goes only to the one reviewer the user picked (a `case` on `REVIEWER`).
- `documentation-and-adrs`: `.env` is created only when absent; the drift check reports "can't tell" when either file has no history.
- `doubt-driven-development`: the prompt file is written with the file tool, not `echo` or a heredoc, and an empty prompt stops the run.
- `code-simplification`: the Anthropic link is pinned to `e6143c98`.

## Upstream notes (logged, not fixed)

Example-quality items in upstream text, for the next sync or an upstream issue:
- `code-simplification`: one "clear" rewrite turns an object of `{ count }` records into a `Map` of numbers.
- `api-and-interface-design`: the idempotency example keys stored responses by the client key alone; scope it by tenant or user.
- `constraint-driven-development`: the guard splits `git ls-files` output on newlines (quoted non-ASCII names), and flags the shipped policy template's own prose and its own newly added file.
