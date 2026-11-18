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

- `chaos-engineer`: the DNS example validates the hostname, uses no shell under sudo, and (since the sweep below) tags its line with a per-run ID and deletes only that line in place. The Chaos Monkey config targets staging and starts disabled; the ASG script needs an explicit `ASG_NAME` and is a dry run unless `DRY_RUN=0`; CI cleanup deletes only the experiment it applied.
- `kubernetes-specialist`: the Istio, Linkerd and Submariner installs download a pinned release and verify its checksum instead of piping a script into a shell. The Argo CD initial password is no longer printed in agent sessions.
- `gitops-workflow`: Argo CD installs from a pinned release tag; related skills point at this pack's `kubernetes-specialist`.
- `fastapi-expert`: imports `ConfigDict` (Pydantic 2), and both JWT examples refuse to start without a real `JWT_SECRET_KEY`.
- `wordpress-pro`: the example CSP uses a script nonce instead of `unsafe-inline` and `unsafe-eval`.
- `elixir-expert`: reads the local Mix project instead of querying an upstream context manager.

- The Jeffallan license reads `Copyright (c) 2025` with no holder name; that matches upstream exactly (checked against the clone at the pinned commit), so it is kept as is. Each sub-skill folder now carries its source LICENSE.txt so it can be installed on its own.

## Third Codex pass (2026-11-18)

Fixed, because an agent could run them as written:
- `kubernetes-specialist/references/service-mesh.md` and `multi-cluster.md`: each install runs in a `set -euo pipefail` subshell, so a failed download or checksum stops before extraction.
- `gitops-workflow/references/argocd-setup.md` and `kubernetes-specialist/references/gitops.md`: pinned release tag (Helm: pinned chart version), no admin password printed.
- `kubernetes-specialist/references/troubleshooting.md`: Secrets are described, never decoded or dumped.
- `wordpress-pro/references/performance-security.md`: database dumps go to a directory outside the web root, refused if inside ABSPATH; `.htaccess` is defense in depth only.
- The router adds a pack-wide "CCC safety" rule for every reference file: verify downloads, never print secrets, no destructive examples against production without the user naming the target.

## Install-safety sweep (2026-11-18)

Every added line was grepped for unpinned `npx`, package installs without exact versions, `:latest` and undigested images, download-and-execute, moving manifest URLs, remote `kubectl apply` and `helm plugin install`, dotenv loading and secrets in argv. Each hit was handled one of three ways.

Fixed (an agent would run these as written):
- `service-mesh.md` (Istio, Linkerd, including the namespace label and injection) and `multi-cluster.md` (Submariner, Cluster API): each install and every command after it run in one `set -euo pipefail` subshell that is never the left side of `&&`, so errexit holds; the verified binary is called by absolute path, never from `PATH`. Cluster API no longer uses `sudo` and checks a SHA-256.
- `helm-charts.md`: the walkthrough uses a disposable namespace, and `helm uninstall` is no longer part of it.
- `salesforce-developer/references/deployment-devops.md`: CI runs in the CLI image pinned by digest (GitHub) or by digest of the versioned tag (GitLab), not the `stable` channel; auth URLs pass through the environment and a private temp file removed on exit, never `auth.txt` in the checkout; the post-deploy script has no default org and confirms the target.
- `wordpress-pro/references/performance-security.md`: no default backup directory; the resolved destination itself must be outside both `ABSPATH` and the document root, and is set to `0700` even when it already exists. Compression keeps the SQL file unless the `.gz` was written completely.
- `chaos-engineer`: DNS cleanup deletes only its own tagged line; the ASG script terminates only when `DRY_RUN=0` exactly; the SKILL.md experiment targets `staging`.

Fenced as upstream examples: each remaining code block with a hit carries a "CCC safety: upstream example; do not run it as written" line directly above it. That covers `latest` images (the app placeholders `myapp:latest` and the debug, kubectl and exporter images), the Argo CD, Sealed Secrets, Litmus, Flagger, Kiali and Jaeger manifests, the five Helm plugins, the Rancher and Kubecost charts, Conan in CI, the Shopify and WordPress scaffolders and Lighthouse CI. Blocks that change or expose a live system (production custom-resource deletion, node drain, Pumba `SIGKILL`, Jenkins chaos job, troubleshooting rollback, restart, policy deletion and `env`, Argo prune and forced sync) carry a second marker that requires a named target and the user's go-ahead.

## Upstream notes (logged, not fixed)

These are example-quality issues in upstream reference material. The marked blocks and the router's safety rule cover running them; fix them upstream or when a sub-skill is next synced.
- `chaos-engineer/references/kubernetes-chaos.md`: the custom-resource example deletes from the current kube context and selects one resource even at 0%; the drain helper's `continue` does not skip DaemonSet pods and it reports `drained` after errors. `chaos-tools.md`: Jenkins interpolates an unrestricted duration string into YAML and waits in the wrong namespace.
- `kubernetes-specialist/references/cost-optimization.md`: the evening job scales every development deployment to zero; the morning job restores only two, to fixed counts.
- `wordpress-pro/references/plugin-architecture.md`: uninstall cleanup uses unescaped `_` in `LIKE` prefixes.
- `spring-boot-engineer/references/security.md`: refresh and access tokens share one validator.
- `godot-gdscript-patterns/references/advanced-patterns.md`: the save system uses one published encryption password.
- `solidity-security`: the example calls `deposit()`, which neither `SecureBank` version defines, and the overflow test accepts any revert.
- Missing `legacy-modernizer` references in the FastAPI, NestJS and GraphQL migration guides (GraphQL also names `federation-guide.md`; the bundled file is `federation.md`). Angle-bracket version and digest placeholders are intentional and must be filled in before running.
