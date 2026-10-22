---
name: ccc-ci
description: "Diagnose CI and deploy failures: pull the failing run's log, classify the cause, propose a fix, and follow runs with /loop or a Routine; optional signed-webhook push mode. Use when CI is red, a deploy failed, a prod approval waits, or the user wants pipeline events in the session."
allowed-tools:
  - Bash
  - Read
  - Grep
  - Glob
  - Edit
  - Write
  - Agent
  - AskUserQuestion
argument-hint: "[status | diagnose [run-id] | watch [run-id] | init [--port N] [--tunnel] [--rotate] | test <event>]"
model: sonnet
effort: medium
---

# /ccc-ci — CI failures, diagnosed in-session

**CC Commander** · /ccc-ci · the failing run, its classified cause and a copy-paste fix, without leaving the session.

Pull mode (default) reads runs through the provider CLI. Push mode (`init`) receives HMAC-signed webhooks on a loopback receiver the user approves; its setup lives in [references/webhook-receiver.md](references/webhook-receiver.md). The user's selected model is preserved; the only delegation is the optional `debugger` agent in step 4.

Codex: ask the pickers below as plain-text questions, and run the step 4 delegation with `codex exec --json` in a fresh context.

## When to use / when not to

- Use when a GitHub Actions run, Vercel/Fly.io/Railway deploy or test job failed, when a production approval gate is waiting, or to follow a run until it finishes.
- Not for: writing a new pipeline (`/ccc-devops`), pre-deploy readiness (`/ccc-deploy-check`), Commander's own install health (`/ccc-doctor`), or a bug with no CI context (`/ccc-systematic-debugging`).
- Skip it for projects with no CI and fully manual deploys.

## Events

| Event | Meaning | Handled in |
|---|---|---|
| `push` | New commit on a branch | step 2 (listed only) |
| `deploy_started` | Deploy job started | step 2 |
| `deploy_failed` | Deploy exited non-zero | step 3 |
| `deploy_succeeded` | Deploy completed and healthy | step 2 (duration, environment, URL) |
| `test_failed` | Test job reported failures | steps 3–4 |
| `test_succeeded` | All tests green | step 2 |
| `approval_required` | Manual production gate waiting | step 6 |

## What happens

1. **Detect the provider and access.**
   ```bash
   ls -d .github/workflows vercel.json .vercel fly.toml railway.json railway.toml .gitlab-ci.yml 2>/dev/null
   command -v gh vercel fly railway 2>/dev/null
   gh auth status 2>&1 | head -n 3
   ```
   No CI files and no provider CLI: say so and stop. `gh` present but not authenticated: tell the user to run `gh auth login` themselves; never ask for a token. If a Vercel connector is connected, its deployment and runtime-log tools replace the `vercel` CLI calls below.

2. **Status** (`status`, or no argument).
   ```bash
   gh run list --limit 10 --json databaseId,name,status,conclusion,headBranch,event,createdAt,url
   tail -n 20 ~/.claude/commander/ccc-ci-events.jsonl 2>/dev/null
   ```
   The second line returns push-mode events only when `init` was set up. Show one line per run (name, branch, conclusion, age, URL). If any run failed, go to step 3 for the newest failure; otherwise ask the next-step picker.

3. **Diagnose** (`diagnose [run-id]`, or a `deploy_failed`/`test_failed` event). Fetch the failing log, newest failure when no id is given:
   ```bash
   RUN_ID=${RUN_ID:-$(gh run list --status failure --limit 1 --json databaseId --jq '.[0].databaseId')}
   gh run view "$RUN_ID" --log-failed | tail -n 200
   ```
   Other providers: `vercel inspect <deployment-url> --logs`, `fly logs --app <app> --no-tail`, `railway logs`. Read the workflow file, `fly.toml` or `vercel.json` the log points at. Before quoting any log line, mask anything that looks like a token or key. Classify the failure:

   | Class | Signal in the log | Typical fix |
   |---|---|---|
   | Dependency | resolve/lockfile/peer errors, `ERESOLVE`, 404 on a package | pin or update the package, regenerate the lockfile |
   | Type/build | `TS\d+`, compiler errors with `path:line` | fix the cited line |
   | Test | assertion output, failing test names | step 4 |
   | OOM | `OOMKilled`, exit 137, heap out of memory | raise the memory limit or cut peak usage |
   | Config drift | missing env var, wrong secret name, changed runner image | restore the setting in the provider or workflow |
   | Timeout | job or step exceeded its limit | cache, split, or raise the limit |
   | Flaky/infra | passes on rerun, network or runner errors | rerun once (step 5), then quarantine the test |
   | Unknown | none of the above | step 4 |

   Report: run id and URL, the class, the 3–10 log lines that prove it (masked), and one copy-paste fix command or edit with `path:line`.

4. **Root cause for test and unknown failures.** Reproduce locally first: derive the failing command from the workflow step (for example `npm test -- <file>`) and run it. Then delegate to the plugin's `debugger` agent with the Agent tool, `effort: "medium"`, passing the masked failing output, the workflow step and the local result, and the instruction: "Diagnose only; do not edit files. Return ranked hypotheses, most likely first, each with the evidence for it and the minimal reproduction command." Run the top hypothesis's reproduction command yourself before calling it the root cause.

5. **Next step.** Ask the next-step picker (Decision points). On "Apply the fix", edit the files, rerun the local failing command and show its output. On "Rerun failed jobs", run:
   ```bash
   gh run rerun "$RUN_ID" --failed
   ```

6. **Approval gates** (`approval_required`). Show the run URL and what is waiting:
   ```bash
   gh api "repos/{owner}/{repo}/actions/runs/$RUN_ID/pending_deployments" --jq '.[] | {environment: .environment.name, can_approve: .current_user_can_approve}'
   ```
   Approving deploys to a protected environment; do it only after the approval picker and an explicit yes, with the environment id from the call above:
   ```bash
   gh api -X POST "repos/{owner}/{repo}/actions/runs/$RUN_ID/pending_deployments" -F "environment_ids[]=$ENV_ID" -f state=approved -f comment="approved via /ccc-ci"
   ```
   Add `id: .environment.id` to the `--jq` filter to read `ENV_ID`. For phone approval while away, point to `/ccc-nightwatch`.

7. **Watch** (`watch [run-id]`). Ask the watch picker. Follow once: `gh run watch "$RUN_ID" --exit-status` as a background Bash command (stops at the background time limit). Recurring: tell the user the command to run, `/loop 5m /ccc-ci status` for this session, or `/schedule` for a Routine that checks on a cron. Creating a Routine is the user's action or needs their yes.

8. **Push mode** (`init`, `test <event>`). Follow [references/webhook-receiver.md](references/webhook-receiver.md) step by step: port check, secret creation, receiver file, provider configuration, optional tunnel, signed test event. Every step that binds a port, exposes it publicly, or writes a provider secret asks first.

## Decision points

Next step after a diagnosis (AskUserQuestion, 2–4 options):
- 🟢 Show the fix only: nothing changes; you apply it
- Apply the fix locally: edits files, reruns the failing command here
- Rerun failed jobs: `gh run rerun --failed` starts new CI minutes
- Done

Approval gate:
- 🟢 Open the run URL: you approve in the provider UI
- Approve from here: deploys to the protected environment now
- Leave it waiting

Watch mode:
- 🟢 Follow this run once: background `gh run watch`, reports on exit
- Poll this session: `/loop 5m /ccc-ci status`
- Scheduled Routine: `/schedule`, runs without this session

Push-mode setup (`init`):
- 🟢 Loopback only: `127.0.0.1`, reachable from local tools and self-hosted runners
- Loopback plus tunnel: public URL for hosted CI; signature check is the only gate
- Cancel: stay in pull mode

## Done when

- Diagnosis: the class and the quoted log lines come from a log fetched in this turn, with the run id and URL.
- Root cause: the reproduction command ran in this turn and its output matches the hypothesis; otherwise report "not confirmed" and what was ruled out.
- Applied fix: the local failing command reran after the edit and its result is reported.
- Rerun: `gh run view "$RUN_ID" --json status,conclusion` was read after the rerun and reported (`in_progress` is a valid report).
- Push mode: the signed test event returned status 204 and appears in `~/.claude/commander/ccc-ci-events.jsonl`.

## Guardrails

- Rerunning jobs, approving a gate, binding a port, opening a tunnel, editing workflow files and setting provider secrets each need the matching picker and an explicit yes in this conversation.
- Never print, echo or commit the webhook secret or any provider token; mask secrets in quoted log lines.
- Never invent a root cause: unknown stays "unknown" until a reproduction confirms it.
- Bind the receiver to `127.0.0.1` only; a tunnel is the only public path, and it needs the signature check.
- Never post, tweet or message anyone about a run.

## See also

- `/ccc-devops` — build or harden the pipeline itself
- `/ccc-deploy-check` — readiness gate before a deploy
- `/ccc-systematic-debugging` — root-cause method used in step 4
- `/ccc-loop` — choosing between `/loop`, `/goal` and `/schedule`

---

> ⚙️ **Fable contract:** plan before build · verifier ≠ worker · prove before alarm · loops need gates · leave durable state — `rules/fable-method.md`
