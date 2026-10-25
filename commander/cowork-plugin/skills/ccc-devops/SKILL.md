---
name: ccc-devops
description: "DevOps router: CI/CD, zero-downtime deploys, Docker, AWS, Terraform, monitoring, networking, runbooks. Use to set up, harden or plan infrastructure."
allowed-tools:
  - Read
  - Glob
  - Grep
  - Bash
  - Write
  - Edit
  - Agent
  - AskUserQuestion
argument-hint: "[cicd | deploy | containers | aws | terraform | monitoring | networking | runbook | security]"
model: sonnet
effort: medium
---

# /ccc-devops — route to the DevOps specialist

**CC Commander** · /ccc-devops · one entry point that loads the matching DevOps specialist playbook for the task.

The specialist list, routing matrix and multi-step campaigns live in [references/routing.md](references/routing.md). The user's selected model is preserved; the only delegation is the optional `devops-engineer` agent in step 4.

Codex: ask the pickers as plain-text questions; run step 4 with `codex exec --json` using the specialist playbook as the instructions.

## When to use / when not to

- Use to design or change a pipeline, deploy strategy, container image, cloud architecture, IaC module, monitoring stack, network layout or incident runbook.
- Not for: a red CI run right now (`/ccc-ci`), running an actual deploy (`/ccc-deploy`), pre-launch account hardening across Vercel/GitHub/Cloudflare (`/ccc-harden`), or local service status (`/ccc-infra`).

## What happens

1. **Map the intent.** Match `$ARGUMENTS` or the user's words against the routing matrix in [references/routing.md](references/routing.md#routing-matrix). A multi-step goal ("set up monitoring end to end", "build our AWS stack") maps to a campaign in [references/routing.md](references/routing.md#campaigns). No clear intent: ask the domain picker (Decision points).

2. **Confirm constraints before infrastructure work.** Read what the repo already uses, then confirm cloud provider, toolchain and environment with the user only where the files do not answer it:
   ```bash
   ls -d .github/workflows Dockerfile docker-compose*.yml *.tf terraform k8s helm fly.toml vercel.json serverless.yml cdk.json 2>/dev/null
   ```

3. **Load the specialist.** Glob for `**/skills/ccc-devops/<specialist>/SKILL.md` (in the Commander repository it is `skills/ccc-devops/<specialist>/SKILL.md`; in an installed CLI toolkit it sits under the toolkit's `skills/` directory) and Read it. Follow that playbook for the task. If no match exists, work from the specialist's one-line scope in [references/routing.md](references/routing.md#specialists) and say the full playbook is not installed. For a campaign, load each specialist in order and finish one step before the next.

4. **Delegate the build when it is large.** For a change spanning several files or environments, ask the delegation picker. On yes, hand it to the plugin's `devops-engineer` agent with the Agent tool, `effort: "high"`, passing the intent, the constraints from step 2 and the specialist playbook path. The agent returns the change with its preview output, rollback plan and signals to watch.

5. **Verify.** Run the check the change supports and report its actual output: `terraform plan` / `terraform validate`, `docker build`, `actionlint` for workflow files, `promtool check config` / `promtool check rules`, `kubectl apply --dry-run=server`. A missing tool is reported as "not verified: <tool> absent", never as a pass.

6. **Recurring work.** For nightly scans, drift detection or scheduled reports, offer `/schedule` (a Routine) or `/loop` and explain what each run will do. A scheduled deploy changes production on every run; set it up only on the user's explicit yes.

## Decision points

Domain picker when the intent is unclear (AskUserQuestion, 2–4 options):
- 🟢 CI/CD pipeline: scaffold lint, test, build, deploy with hardened Actions
- Containers: Dockerfile, compose and image scanning
- Monitoring stack: Prometheus, Grafana, alerting, runbooks
- More: AWS, Terraform, zero-downtime deploy, networking, incident runbook (asks again)

Delegation picker for a large change:
- 🟢 Delegate to `devops-engineer`: returns change, preview and rollback plan
- Work here step by step: you review each file as it lands
- Plan only: a written plan, no files changed

## Done when

- The specialist playbook used is named (or "not installed" stated), and the delivered change lists every file it touched.
- The step 5 check ran in this turn and its output (or the absent-tool note) is in the report, with the rollback path for any infrastructure change.

## Guardrails

- Never apply to a shared or production environment (`terraform apply`, `kubectl apply`, deploys, IAM or DNS changes) without a picker and an explicit yes for that exact action.
- Never print, hardcode or commit credentials; use the provider's secret store or OIDC.
- Load one specialist at a time; do not read the whole specialist tree.
- Leave a plan, not a half-applied change, when a step fails; report the failing command and output.

## See also

- `/ccc-ci` — diagnose a failing pipeline run
- `/ccc-deploy` — run the deploy itself
- `/ccc-harden` — pre-launch hardening across hosting and account settings
- `/ccc-security` — application security lanes, including CodeQL in CI

---

> ⚙️ **Fable contract:** plan before build · verifier ≠ worker · prove before alarm · loops need gates · leave durable state — `rules/fable-method.md`
