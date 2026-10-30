# CCC best-practice audit (FLT-187), 2026-10-25

Plugin `commander/cowork-plugin/` at `458bb391` (8.1.3), checked against the current Claude Code docs. This report consolidates the read-only CCC-HQ audit (CC-2104 phase 4: code vs docs, context cost, counts, directory and security), re-verifies the findings that drive a fix, and records who owns each one. It does not repeat that work.

Legend: **[O]** re-observed for this report (reproduced, or the doc text and the code read side by side). **[C]** carried from the CCC-HQ report and not re-run here.

## Sources

| Topic | Source (retrieved 2026-10-25) |
|---|---|
| Hook events, input fields, `continue`, `decision` | https://code.claude.com/docs/en/hooks ("Elicitation input", "ElicitationResult input", common output fields) |
| Status line input JSON | https://code.claude.com/docs/en/statusline |
| Skill `model` / `effort`, listing budget | https://code.claude.com/docs/en/skills |
| Subagent fields, `memory` | https://code.claude.com/docs/en/sub-agents |
| Repo platform facts | `docs/reference/platform-facts-2026-10.md:95` (Elicitation `action` accept/decline/cancel, `content`) |

## Fixed in this change

| # | Finding | Evidence | Fix |
|---|---|---|---|
| H1 | **Status line command injection.** `lib/statusline.sh` `eval`'d jq output that wrapped statusLine strings in bare single quotes, so a `'` in `workspace.current_dir`, the model name, the agent name or `tool_use.name` ran shell code on every refresh. Numeric fields were unquoted too. | [O] `tests/statusline-injection.test.js` created `PWNED-cwd` and `PWNED-agent` files on the old script. | Every value now goes through jq `@sh` (non-scalars become `''`), in both `eval` blocks. The test now passes, and a quote in a project name still renders. |
| H2 | **Elicitation logs were always null.** `hooks/elicitation-logger.js` read `request_id`/`prompt`/`type`; `hooks/elicitation-result-handler.js` read `input.result.{matched,cancelled,action}`. The documented inputs are `mcp_server_name`, `message`, `mode`, `url`, `elicitation_id`, `requested_schema`, plus a top-level `action` and `content` on the result. `accept` was never mapped. | [O] docs "Elicitation input" / "ElicitationResult input"; the existing tests in `commander/tests/hooks-v4.test.js` only asserted `continue:true`. | Both hooks log `event`, `mcp_server_name`, `mode`, `elicitation_id` and the result `action` (`accept`/`decline`/`cancel`/`unknown`). `message`, `url`, `requested_schema` and `content` are never logged because they can carry credentials. New tests use the doc samples. |

The CC-296 commit in this batch also fixes dangling slash-command names (`/ccc-debug` in the suggest-ticker nudge, plus four BIBLE rows). A test now guards hook text and the BIBLE table.

## Owned elsewhere (not changed here, to avoid overlap)

| # | Finding | Status | Owner |
|---|---|---|---|
| M9 | `.mcp.json` runs `npx -y` with no version (`.mcp.json:5-16`) | [O] unpinned at `458bb391` | CCC-HQ worktree `ccc-2106-directory-gate` pins both servers |
| Counts | Version/handler drift in `commander/core/registry.yaml:5`, `guides/quickstart-beginner.md:22`, `docs/compat/chatgpt-work.md`, `site/components/hero.tsx` | [C] | CCC-HQ counts sweep (`site/**` triggers the prod deploy, so it is not a lane change) |
| Dir | ICON_MISSING; hook scripts in a subfolder; telemetry disclosure for the directory scan | [C] | CCC-HQ phase 7 (directory + distribution) |

## Needs Kevin's decision (product behaviour)

| # | Finding | Evidence | Options |
|---|---|---|---|
| H3 | The cost ceiling is on by default and halts every turn after 1,000 tool calls with `continue:false` (`hooks/cost-ceiling-enforcer.js:28,98`). The docs say `continue:false` "stops processing entirely". | [O] code + docs line | A: default off (recommended). B: tie it to `cost.total_cost_usd`. C: keep it, but deny via `permissionDecision` so Claude sees why |
| H4 | 72 of 84 skills pin `model:`, and every skill pins `effort:`. A skill's model and effort apply for the rest of the turn, so `/ccc-review` drops an Opus/Fable xhigh session to Sonnet/Haiku. | [C] counts; docs (skills) | A: drop the pins from router/menu skills (recommended). B: keep them |
| M10 | Telemetry is on by default and posts to a remote endpoint (`lib/telemetry.mjs:63-80`) | [C] | A: opt-in (recommended). B: keep it, and disclose it in the README |

## Follow-ups (verified enough to file, not fixed here)

- M4: the Stop hook returns `decision:'block'` for a next-step suggestion (`hooks/intent-classifier.js:331`) [O]. Use `additionalContext`.
- M6: `agents/architect.md` has `memory: project`, which grants Write/Edit despite its read-only `tools:` list [C].
- M7: all 22 agents set `persona:`, which Claude Code does not read [O count], so personas never load. `commander/lib/specialists.js` (CC-1998) already resolves agent → persona for a fix.
- M3, M8, M11, L1-L14: see the CCC-HQ report `audit-code-docs.md` (CC-2104).
