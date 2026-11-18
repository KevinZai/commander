# specialist-pack decisions

Batch D of the MIT skill integration. 24 specialist skills cherry-picked from four MIT catalogs, each filling a technology or practice that Commander had no skill for. Gaps were checked by name and by content across `skills/` and `commander/cowork-plugin/` (agents included) before each pick.

## Sources (pinned)

| Source | Commit | License copy |
|---|---|---|
| Jeffallan/claude-skills | `67c1961b180dc92cf08983344627109e983e8f51` | `licenses/Jeffallan_claude-skills-LICENSE.txt` |
| wshobson/agents | `9c61ab243def98f72da12abd41cfcf5bcd91af9d` | `licenses/wshobson_agents-LICENSE.txt` |
| VoltAgent/awesome-claude-code-subagents | `ed74d115b7fb7026a22a4f816a8e3250f425e3b4` | `licenses/VoltAgent_awesome-claude-code-subagents-LICENSE.txt` |
| levnikolaevich/claude-code-skills | `809845957a79a8e470d97a794ab7f19fa4f246b7` | `licenses/levnikolaevich_claude-code-skills-LICENSE.txt` |

License checks: every Jeffallan skill carries `license: MIT` in its own frontmatter; the four wshobson plugins (game-development, blockchain-web3, shell-scripting, kubernetes-operations) declare `"license": "MIT"` in their `plugin.json`; the VoltAgent and levnikolaevich files carry no per-file license and fall under their repo's MIT LICENSE. The `License: GPL v2 or later` lines inside `wordpress-pro/references/` are sample WordPress plugin and theme headers that the skill teaches users to write, not the license of the skill text.

## Added

| Skill | Source | Why it is new |
|---|---|---|
| kubernetes-specialist | Jeffallan | No Kubernetes skill; `ccc-devops` covers Docker, Terraform and AWS only. Chosen over VoltAgent `kubernetes-specialist` (subagent, no references). |
| gitops-workflow | wshobson | No ArgoCD or Flux coverage anywhere. |
| rails-expert | Jeffallan | No Ruby on Rails skill. Chosen over VoltAgent `rails-expert` (subagent, no references). |
| django-expert | Jeffallan | No Django skill. |
| fastapi-expert | Jeffallan | No FastAPI skill (`ccc-saas/fastify-api` is Node). Chosen over wshobson `fastapi-templates` (smaller, template-only). |
| nestjs-expert | Jeffallan | No NestJS skill. |
| angular-architect | Jeffallan | No Angular skill. |
| spring-boot-engineer | Jeffallan | `jpa-patterns` covers persistence only; no Spring Boot app, security or WebFlux skill. |
| dotnet-core-expert | Jeffallan | Only a C# review agent exists; no .NET build skill. Chosen over wshobson `dotnet-backend-patterns` (810-line single file) for the router-friendly SKILL.md plus references. |
| cpp-pro | Jeffallan | No C++ skill. |
| elixir-expert | VoltAgent (subagent adapted) | No Elixir, OTP or Phoenix skill; no other source covers it. Adapted to a SKILL.md: `tools` and `model` keys dropped, description reworded to "Use when"; body unchanged. Not added as a plugin agent. |
| graphql-architect | Jeffallan | GraphQL only appears in passing references. |
| spark-engineer | Jeffallan | No Spark skill (`ccc-data/data-pipeline` is generic). Chosen over wshobson `spark-optimization` (tuning only). |
| salesforce-developer | Jeffallan | No Salesforce development skill. |
| wordpress-pro | Jeffallan | WordPress appears only in marketing and SEO skills; no theme or plugin development skill. Chosen over VoltAgent `wordpress-master`. |
| shopify-expert | Jeffallan | No Shopify development skill. |
| embedded-systems | Jeffallan | No firmware or RTOS skill. Chosen over VoltAgent `embedded-systems` and `iot-engineer`. |
| game-developer | Jeffallan | No game development skill (Unity, Unreal). Chosen over VoltAgent `game-developer`. |
| godot-gdscript-patterns | wshobson | Godot is not covered by `game-developer`. |
| solidity-security | wshobson | No blockchain or smart-contract skill. Chosen over VoltAgent `blockchain-developer` (security is the higher-value slice). |
| bash-defensive-patterns | wshobson | Shell scripting appears only as a shellcheck mention in `plankton-code-quality`. |
| chaos-engineer | Jeffallan | No chaos engineering or game-day skill. Chosen over VoltAgent `chaos-engineer`. |
| spec-miner | Jeffallan | No skill reverse-engineers a spec from existing code (`spec-interviewer` interviews a person). |
| ln-98-mutation-reliability-engineer | levnikolaevich | No skill for transactions, idempotency keys or interrupted-operation recovery. Self-contained; no cross-skill links. |

## Notable skips

| Candidate | Source | Overlapping Commander skill |
|---|---|---|
| flutter-expert | Jeffallan, VoltAgent | `skills/ccc-mobile/flutter` |
| swift-expert | Jeffallan, VoltAgent | `skills/ccc-mobile/swiftui` |
| react-native-expert, expo-react-native-expert | Jeffallan, VoltAgent | `skills/ccc-mobile/react-native` |
| terraform-engineer, terraform-module-library | Jeffallan, VoltAgent, wshobson | `skills/ccc-devops/terraform-patterns` |
| laravel-specialist | Jeffallan, VoltAgent | `skills/laravel-patterns`, `laravel-tdd`, `laravel-verification` |
| vue-expert, vue-expert-js | Jeffallan, VoltAgent | `skills/vue-nuxt` |
| postgres-pro, postgresql-table-design | Jeffallan, VoltAgent, wshobson | `skills/postgres-patterns` |
| rag-architect, rag-implementation | Jeffallan, wshobson | `skills/engineering-pack/rag-architect` |
| websocket-engineer | Jeffallan, VoltAgent | `skills/realtime-architecture` |
| playwright-expert, e2e-testing-patterns | Jeffallan, wshobson | `skills/ccc-testing/e2e-testing` |
| nextjs-developer, nextjs-app-router-patterns | Jeffallan, VoltAgent, wshobson | `skills/ccc-saas/nextjs-app-router` |
| the-fool | Jeffallan | `skills/dialectic-review`, `ccc-debate`, `c-level-pack/executive-mentor` (devil's advocate) |
| sre-engineer, slo-implementation | Jeffallan, wshobson | `ccc-devops/promql-alerting`, `engineering-pack/observability-designer`, `infra-runbook` |
| golang-pro, rust-engineer, python-pro, typescript-pro, kotlin-specialist, csharp-developer, java-architect | Jeffallan, VoltAgent | per-language reviewer agents in `commander/cowork-plugin/agents/` plus `python-patterns`, `coding-standards` |
| airflow-dag-patterns, dbt-transformation-patterns | wshobson | `skills/ccc-data/data-pipeline`, `data-quality` |
| grafana-dashboards, prometheus-configuration | wshobson | `skills/ccc-devops/grafana-dashboards`, `prometheus-configuration` |
| unity-ecs-patterns | wshobson | `game-developer` (added) covers Unity and ECS |
| binary-analysis-patterns, anti-reversing-techniques | wshobson | Skipped as dual-use; out of scope for a specialist pack |
| ln-2x architecture, ln-3x planning, ln-5x audit, ln-6x release suites | levnikolaevich | `ccc-plan`, `ccc-review`, `ccc-xray`, `ccc-ship`, `engineering-pack/release-manager` |
| VoltAgent meta-orchestration agents | VoltAgent | `ccc-fleet`, `ccc-orchestrate`, plugin agents |

## Edits to upstream content

- All 24: a `## Source` section appended (repo, path, pinned commit, MIT, license copy location).
- `elixir-expert`: frontmatter adapted from subagent to skill as described above.
- No upstream text conflicted with Commander's safety rules (force-push, rebasing a pushed branch, skipped hooks, auto-merge), so no "CCC safety:" replacement was needed. The router repeats those rules as a precedence note.

## Not done in this batch

Counts, `commander/contract.json` (`ecosystem_skills`), `registry.yaml`, `_tiers.json`, `ccc-suggest`, README, NOTICE.md, CHANGELOG and the Codex mirror are untouched by instruction; the integration step owns them.
