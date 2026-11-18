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
