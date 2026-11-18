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
- "CCC safety:" notes were added after review: `chaos-engineer/references/infrastructure-chaos.md` (Pumba targets a test-only pattern, not production) and `solidity-security` (attack tests run on a local Hardhat network only). The router repeats Commander's safety rules as a precedence note.
- Fixes: `kubernetes-specialist/references/service-mesh.md` no longer puts an unexpanded `istio-*` glob in PATH; `solidity-security`'s overflow test defines `attacker` in scope.

## Not done in this batch

The worker that copied these skills left counts, `commander/contract.json`, the registry, NOTICE.md, CHANGELOG and the Codex mirror alone. The PR's integration commit updates all of them; `_tiers.json` and `ccc-suggest` are unchanged.

## Second Codex pass (2026-11-18)

- `chaos-engineer`: the DNS example validates the hostname, uses no shell under sudo and removes only the line it added. The Chaos Monkey config targets staging and starts disabled; the ASG script needs an explicit `ASG_NAME` and is a dry run unless `DRY_RUN=0`; CI cleanup deletes only the experiment it applied.
- `kubernetes-specialist`: the Istio, Linkerd and Submariner installs download a pinned release and verify its checksum instead of piping a script into a shell. The Argo CD initial password is no longer printed in agent sessions.
- `gitops-workflow`: Argo CD installs from a pinned release tag; related skills point at this pack's `kubernetes-specialist`.
- `fastapi-expert`: imports `ConfigDict` (Pydantic 2), and both JWT examples refuse to start without a real `JWT_SECRET_KEY`.
- `wordpress-pro`: the example CSP uses a script nonce instead of `unsafe-inline` and `unsafe-eval`.
- `elixir-expert`: reads the local Mix project instead of querying an upstream context manager.

- The Jeffallan license reads `Copyright (c) 2025` with no holder name; that matches upstream exactly (checked against the clone at the pinned commit), so it is kept as is. Each sub-skill folder now carries its source LICENSE.txt so it can be installed on its own.
