# CC Commander Performance Baseline - 2026-04-26

Raw JSON captured during this run: `/tmp/codex-fleet/w12-baseline.json`

Environment:
- Repo: `/Users/ai/clawd/projects/cc-commander/.claude/worktrees/codex-w12-perf-bench`
- Branch: `claude/codex-w12-perf-bench`
- Node: `v22.16.0`
- Platform: `darwin arm64`
- Harness: `node scripts/perf-bench.js --out=/tmp/codex-fleet/w12-baseline.json`

Notes:
- The active `commander/cowork-plugin/hooks/hooks.json` SessionStart chain has 3 handlers, not 4. The harness measured the active registered chain.
- Hook runs used an isolated temporary `HOME` so benchmark side effects did not touch the real `~/.claude/commander` state.
- `node scripts/build-from-registry.js` rewrites `commander/core/registry.yaml`; the harness restored the original bytes after measuring it.
- Node emitted `MODULE_TYPELESS_PACKAGE_JSON` for the ESM harness and ESM hooks because the package has no `"type": "module"`. Hook timings therefore include the current reparse behavior.

## Numbers

| Bench | What Was Measured | Runs | p50 | p95 | p99 | Status |
| --- | --- | ---: | ---: | ---: | ---: | --- |
| A | Top-level hook startup, empty stdin | 20 per hook | 28.50ms | 66.70ms | 108.69ms | ok |
| A total | Sum if all 20 top-level hooks fired | derived | 614.85ms | 650.90ms | 712.23ms | derived |
| B | Active SessionStart hook chain | 20 | 85.62ms | 91.39ms | 92.29ms | ok |
| C | Plugin skill discovery and SKILL.md frontmatter parse | 50 | 1.48ms | 2.13ms | 3.95ms | ok |
| D | Bundled MCP stdio cold-start to first JSON-RPC response | 1 per server | n/a | n/a | n/a | skipped |
| E | `npm test` total wall time | 1 | 26,553.84ms | 26,553.84ms | 26,553.84ms | failed |
| F | `build-from-registry` + `audit-counts --check` | 1 | 140.70ms | 140.70ms | 140.70ms | ok |

Bench D details:
- `context7`: skipped after no JSON-RPC initialize response within 15,000ms.
- `sequential-thinking`: skipped because `@modelcontextprotocol/server-sequential-thinking` is not installed locally or globally.

Bench E details:
- Node test summary: 752 tests, 750 pass, 2 fail, 25 suites, 26,429.60ms TAP duration.
- Failing tests recorded by the benchmark run:
  - `detectSkills finds SKILL.md files in vendor packages` - `gstack should have skills, got 0`
  - `detectSkills finds .claude/skills pattern` - `rtk should have .claude/skills, got 0`
- Slowest observed test from the follow-up failure capture: `tmux mode menu actions do not crash and fail gracefully` at 18,077.1ms.

Bench F breakdown:
- `node scripts/build-from-registry.js`: 68.46ms, exit 0, registry restored.
- `node scripts/audit-counts.js --check`: 72.24ms, exit 0.

## Hook Hot Spots

Top 3 hook cold-start p99 values from Bench A:

| Rank | Hook | p50 | p95 | p99 |
| ---: | --- | ---: | ---: | ---: |
| 1 | `suggest-ticker.js` | 86.31ms | 92.77ms | 108.69ms |
| 2 | `subagent-start-tracker.js` | 29.23ms | 32.08ms | 66.70ms |
| 3 | `elicitation-logger.js` | 28.17ms | 32.71ms | 37.14ms |

Active SessionStart handler breakdown:

| Handler | p50 | p95 | p99 |
| --- | ---: | ---: | ---: |
| `session-start.js` | 28.48ms | 29.73ms | 29.79ms |
| `stale-claude-md-nudge.js` | 27.18ms | 28.36ms | 31.13ms |
| `post-compact-recovery.js` | 27.61ms | 28.76ms | 28.76ms |

W4c orchestrator comparison, measured separately against the scaffolded `session-start-orchestrator.js`:
- Orchestrator p50 31.07ms, p95 34.67ms, p99 36.68ms.
- Potential p95 savings versus active chain: about 56.72ms.

## Recommendations

1. 🟢 **Easy win: fix or stub the slow tmux menu audit path in tests** - estimated saves up to 15-18s from `npm test`; effort <1h. The test suite is the only measured cost in human time, and one test accounts for most of it.
2. 🟡 **Medium win: cache or debounce `suggest-ticker.js` project-state work** - estimated saves about 50-60ms on UserPromptSubmit paths where it fires; effort 1-4h. It is the only hook with >100ms p99 in this run.
3. 🔴 **Big bet: activate the W4c SessionStart orchestrator** - measured p95 could drop from 91.39ms to 34.67ms, saving about 56.72ms per cold SessionStart; effort/risk is invasive because it changes hook process boundaries and output aggregation.

## Not Worth It

- ⚪ **Skill discovery optimization** - p95 is 2.13ms for 51 plugin skills. This is far below any user-perception threshold.
- ⚪ **Bundle/check script optimization** - combined p95 is 140.70ms, and these only run in CI/release gates.
- ⚪ **SessionStart micro-optimizations inside individual handlers** - each active handler is about 28-30ms p50, dominated by Node process startup. Handler-level rewrites will not move the cold-start number much.
- ⚪ **Hook-wide refactors based only on Bench A total-if-all-fired** - the 650.90ms p95 sum is theoretical. All 20 top-level hook files do not fire on one lifecycle event.
- ⚪ **MCP optimization from this run** - Bench D did not produce a valid JSON-RPC response locally, so there is no measured MCP cold-start cost to optimize yet.

## Comparison

No prior perf baseline files were found in the repo before this report, so there is no baseline diff. Future runs can compare against a saved JSON baseline with:

```bash
node scripts/perf-bench.js --baseline=/path/to/baseline.json
```
