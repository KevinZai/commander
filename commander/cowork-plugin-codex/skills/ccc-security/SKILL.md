---
name: ccc-security
description: "Application security hub: built-in /security-review plus lanes for OWASP Top 10, secrets, dependency CVEs, prompt-injection defense, CodeQL CI, variant analysis and incident response. Use when asked to audit security, scan for secrets or vulnerable packages, harden an AI app, or handle a breach."
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
  - Write
  - Edit
  - Skill
  - Agent
  - AskUserQuestion
argument-hint: "[audit | owasp | secrets | deps | ai | codeql | variants | incident | baseline | release-gate]"
model: opus
effort: high
---

# $ccc-security — Find, prove, fix vulnerabilities

**CC Commander** · $ccc-security · a verified security findings report for the current repository, routed to the right specialist lane.

This skill extends Claude Code's built-in `/security-review`; it does not reimplement it. Lane commands and checklists live in [references/lanes.md](references/lanes.md). The user's selected model is preserved; the only tier routing here is the optional `fable` threat-model delegation in step 4.

## When to use / when not to

Use for: a security audit or OWASP check, secrets or credential scanning, dependency CVE and license audits, hardening an LLM-powered feature against prompt injection, wiring CodeQL into CI, hunting variants of a known bug, or running an active incident.

Not for: infrastructure and SaaS-account hardening before launch (use `$ccc-harden`), general code-quality review (use `$ccc-code-review`), or destructive-command guardrails for the session (use `$ccc-safety`).

## What happens

1. **Pick the lane.** Map `$ARGUMENTS` or the user's words to a lane with the routing matrix in [references/lanes.md](references/lanes.md#routing-matrix). If the intent is an active incident, go straight to step 7 and stop all other work. If there is no clear intent, ask the lane picker (Decision points).

2. **Run the built-in entry scan** for every lane except `incident`:
   ```
   Skill: security-review
   ```
   Keep its findings as the baseline. If the built-in `/security-review` is unavailable in this runtime (including Codex), note that and start at step 3.

3. **Run the lane.** Read the lane section of [references/lanes.md](references/lanes.md). For the full lane playbook, Glob for `**/skills/ccc-security/<lane>/SKILL.md` (in the Commander repository it is `skills/ccc-security/<lane>/SKILL.md`; in an installed CLI toolkit it sits under the toolkit's `skills/` directory) and Read it; if no match exists, use the lanes.md section alone. Run the lane's exact commands with Bash; detect the toolchain first:
   ```bash
   ls package-lock.json pnpm-lock.yaml yarn.lock requirements*.txt pyproject.toml Cargo.lock go.sum 2>/dev/null
   command -v gitleaks pip-audit cargo-audit gh codeql 2>/dev/null
   ```
   When a scanner is missing, use the fallback listed for that lane and record "tool absent" in the report. Installing a scanner needs the user's approval.

4. **Threat model when the scope warrants it.** For a full audit of a non-trivial system, delegate the threat model to the plugin's `security-auditor` agent through the Agent tool with `model: "fable"` and `effort: "high"`, passing the scope from step 1. Use the result to direct the static and dynamic passes. Codex: run the threat model through `codex exec` in a fresh context with the same scope and agent instructions.

5. **Prove before alarm.** For every Critical or High finding, confirm the code path by reading it (`path:line`) or reproducing it. Then hand the Critical/High list to a fresh-context verifier (Agent tool, `security-auditor`, prompted to refute each finding and to default to "refuted" when uncertain). On Codex, run the verifier through a separate `codex exec` so it starts in a fresh context. Keep only findings that survive; list refuted ones separately with the reason.

6. **Fix only with approval.** Offer the fix picker (Decision points). For approved fixes, edit the code, then rerun the lane command that found the issue and the project's test command (read `package.json` scripts or the repo's documented check before running it). Report the before and after output.

7. **Incident mode.** Follow the incident lane in [references/lanes.md](references/lanes.md#8-incident-response--active-security-event): triage, preserve evidence, then propose containment. Ask before each containment action; every one changes external state.

8. **Report.** Return the findings report in the shape under Done when. For CodeQL setup, include the workflow file path and the validation output.

### Campaigns

Run these lane sequences when the user picks a campaign (`baseline`, `release-gate`, or `ai`):

| Campaign | Sequence |
|---|---|
| New project baseline | `/security-review` → `secrets-scanner` → `dependency-audit` → `owasp-top-10` → `codeql-integration` |
| Pre-release gate | `security-audit` → `owasp-top-10` → `dependency-audit` → `variant-analysis` |
| AI app hardening | `prompt-injection-defense` → `security-audit` (extended for AI surfaces) → `owasp-top-10` plus the OWASP Top 10 for LLM Applications |

Standing defaults: run `secrets-scanner` and `dependency-audit` on every new project, and `owasp-top-10` before every production release.

## Decision points

Lane picker (AskUserQuestion; Codex: ask the same as a plain-text question), shown when intent is unclear:

- 🟢 **Full audit** — `/security-review` + `security-audit` + `owasp-top-10`; the broadest coverage, slowest.
- **Secrets and dependencies** — `secrets-scanner` + `dependency-audit`; fast baseline for a new repo.
- **AI app hardening** — prompt-injection campaign; for features that pass untrusted text to a model.
- **More** — opens a second picker: CodeQL CI, variant analysis, incident response, pre-release gate.

Fix picker, after verified findings:

- 🟢 **Fix Critical and High now** — edits code, then reruns the finding's check and the tests.
- **Fix one finding** — the user names it; same verification.
- **Report only** — no edits; findings stay in the report.

Secret-in-history picker, when a live credential is found in git history:

- 🟢 **Rotate first** — the user rotates the credential at its provider; history cleanup follows.
- **Report only** — record it; nothing changes.

## Done when

- The lane's commands ran and their real output (or "tool absent" plus the fallback) is in the report.
- Every reported Critical/High finding has `path:line` or a reproduction and survived the fresh-context verifier.
- For applied fixes: the originating check and the test command were rerun, and `git status --short` shows only the intended files changed.

Report shape:

```markdown
## Security report — <repo> — <lane or campaign>
Scope · tools run · tools absent
### Findings (verified)
- [CRITICAL] title — path:line — impact — fix
### Refuted candidates
- title — why refuted
### Fixes applied
- finding — files — check rerun result
### Next
- one recommended next lane
```

## Guardrails

- Never print a secret value; redact to the first four characters. Never write a found secret into a report, commit, or log.
- Dynamic tests (curl, scanners against a URL) run only against a target the user owns and names.
- Credential rotation, account disabling, IP blocking, history rewrites, force pushes, and disclosure or notification messages each need the user's authorization at that moment, asked with a picker. This skill does not push, deploy, or post.
- No `npm audit fix --force`, no package installs, and no CI workflow writes without approval.
- A grep hit is a lead, not a finding: confirm it before assigning severity (see [rules/fable-method.md](../../rules/fable-method.md)).

## See also

- `$ccc-harden` — production hardening across hosting, CI and SaaS accounts.
- `$ccc-code-review` — general code review of a diff.
- `$ccc-ci` — CI pipelines where the CodeQL workflow lands.
- `$ccc-safety` — session guardrails for destructive commands.

---

> ⚙️ **Fable contract:** plan before build · verifier ≠ worker · prove before alarm · loops need gates · leave durable state — `rules/fable-method.md`

> (On Codex, present these options as a numbered list and ask the user to reply with a number — AskUserQuestion is Claude-only.)
