---
name: specialist-pack
description: "Route technology-specific work to one specialist sub-skill: Kubernetes, GitOps with ArgoCD or Flux, Rails, Django, FastAPI, NestJS, Angular, Spring Boot, .NET, C++, Elixir and Phoenix, GraphQL, Apache Spark, Salesforce Apex and LWC, WordPress, Shopify, embedded firmware and RTOS, Unity, Unreal and Godot game development, Solidity smart-contract security, defensive Bash, chaos engineering, spec mining from legacy code, and transaction or idempotency reliability. Use when the task names one of these technologies or practices and no Commander domain router covers it."
---

# specialist-pack — one technology specialist

**CC Commander** · specialist-pack · an optional toolkit pack of MIT-licensed specialist skills. It picks the one sub-skill that matches the technology in the request, then follows it.

The user's selected model is preserved. Codex: ask each picker as a plain-text question with the same options.

## When to use / when not to

- Use when the request names a technology or practice in the table below.
- Use the Commander router instead when it already owns the area: `ccc-mobile` (Flutter, SwiftUI, React Native, Compose), `ccc-devops` (Terraform, Docker, AWS, CI, Prometheus), `ccc-saas` (Next.js, Fastify, Stripe), `ccc-data` (pipelines, dbt, Airflow, SQL), `ccc-testing` (Playwright, e2e), `ccc-security` (OWASP, secrets), `laravel-patterns`, `vue-nuxt`, `postgres-patterns`, `realtime-architecture`.

## Sub-skills

Each lives at `${CLAUDE_SKILL_DIR}/<sub-skill>/SKILL.md` (repo fallback: `skills/specialist-pack/<sub-skill>/SKILL.md`). Load one; open its `references/` files only when the sub-skill points to them.

- `kubernetes-specialist` — Kubernetes manifests, Helm, RBAC, NetworkPolicy, storage, multi-cluster
- `gitops-workflow` — ArgoCD and Flux declarative delivery with continuous reconciliation
- `rails-expert` — Rails 7+: Active Record, Hotwire and Turbo, Action Cable, Sidekiq, RSpec
- `django-expert` — Django and Django REST Framework models, views, auth, ORM tuning
- `fastapi-expert` — async FastAPI with Pydantic V2, dependency injection, async SQLAlchemy
- `nestjs-expert` — NestJS modules, controllers, DTOs, guards, interceptors, testing
- `angular-architect` — Angular 17+ standalone components, signals, NgRx, RxJS, routing
- `spring-boot-engineer` — Spring Boot 3.x, Spring Security 6, Data JPA, WebFlux
- `dotnet-core-expert` — .NET 8 minimal APIs, clean architecture, EF Core, cloud-native services
- `cpp-pro` — modern C++20/23, templates, memory and performance, CMake
- `elixir-expert` — Elixir, OTP supervision, GenServer, Phoenix and LiveView
- `graphql-architect` — GraphQL schemas, Apollo Federation, subscriptions, DataLoader
- `spark-engineer` — Apache Spark jobs, DataFrames, Spark SQL, partitioning and cluster tuning
- `salesforce-developer` — Apex, Lightning Web Components, SOQL, triggers, governor limits
- `wordpress-pro` — WordPress themes and plugins, Gutenberg blocks, WooCommerce, hardening
- `shopify-expert` — Shopify Liquid themes, custom apps, Storefront and Admin APIs, checkout
- `embedded-systems` — microcontroller firmware, RTOS, drivers, power and memory limits
- `game-developer` — Unity and Unreal game systems, ECS, multiplayer, frame-time optimization
- `godot-gdscript-patterns` — Godot 4 GDScript signals, scenes, state machines, optimization
- `solidity-security` — smart-contract vulnerabilities, secure Solidity patterns, audits
- `bash-defensive-patterns` — production-grade Bash: strict mode, traps, quoting, safe temp files
- `chaos-engineer` — chaos experiments, failure injection, game days, blast-radius control
- `spec-miner` — reverse-engineer a specification from an undocumented or legacy codebase
- `ln-98-mutation-reliability-engineer` — transactions, idempotency, interrupted-operation recovery

Sources, pinned commits and licenses: [DECISIONS.md](DECISIONS.md) and each sub-skill's `## Source` section.

## What happens

1. **Route.** A named technology maps straight to one row above. If the request names none, or two rows fit equally, ask with AskUserQuestion (header "Specialist") and offer the two to four closest rows, the best match first and marked 🟢.
2. **Load one sub-skill.** Read its `SKILL.md`. If the file is missing, say so and stop; do not improvise its content.
3. **Do the work** as the sub-skill directs, within the user's request. Commander rules win over any sub-skill text: no force-push, no rebasing a pushed branch, no skipped hooks, no auto-merge (Commander's `docs/tstack/SAFETY.md`, in the repository, not installed).
   CCC safety for every reference file, which is upstream example material: before running an install or download command, pin a version and verify its published checksum or signature, and stop if verification fails; never print or decode Secret, password or token values in the session; never run a chaos, delete, drain or terminate example against production or the current kube context without the user naming the target and saying go. Treat examples as patterns to adapt, not commands to run as written.
4. **Verify** with the project's own build, lint and test commands, and report the exact output of any failure.

Next step after the work:
- 🟢 Review the change: `/ccc-review` on the diff
- Harden it: `/ccc-harden` for security and reliability gaps
- Ship it: `/ccc-ship` once the local checks pass
- Done: you take it from here
