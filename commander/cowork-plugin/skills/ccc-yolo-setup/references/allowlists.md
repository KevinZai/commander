# Safe-YOLO allowlist profiles

Reference for `/ccc-yolo-setup`. Each profile adds entries to `permissions.allow`; later profiles include the earlier ones. Many of these are already auto-allowed by Claude Code; the profiles fill the gaps and add cloud read-only describes and gets. Mine your own transcripts for more with the built-in `/fewer-permission-prompts`.

## Conservative

Reads plus git and gh read-only.

```
Bash(git status:*) Bash(git log:*) Bash(git diff:*) Bash(git show:*)
Bash(gh pr view:*) Bash(gh pr list:*) Bash(gh run view:*) Bash(gh run list:*)
Bash(ls:*) Bash(grep:*) Bash(find:*) Bash(cat:*) Bash(head:*) Bash(tail:*) Bash(wc:*)
```

## Balanced (recommended)

Conservative, plus read-only cloud identity and describes, plus the repository's own test and lint scripts.

```
Bash(aws sts get-caller-identity:*) Bash(aws s3 ls:*) Bash(aws ec2 describe-instances:*)
Bash(npm test:*) Bash(npm run lint:*) Bash(npm run build:*)
```

`npm test` and `npm run …` execute the repository's own scripts. Add them only in repositories the user trusts.

## Aggressive-safe

Balanced, plus file edits scoped to the current repository using Claude Code's permission-rule path syntax (for example an `Edit` rule limited to the project's source directories). Still no deletes, deploys, force-pushes or network mutations.

## Never add, in any profile

- Interpreters and runners: `python`, `node`, `bash`, `sh`, `npx`, `bunx`, `deno` — arbitrary code execution.
- `gh api *`, `curl` with a write method, `aws` mutating verbs, `kubectl apply|delete`, `terraform apply`.
- `rm`, `git push --force`, `git reset --hard`, deploy or publish commands.
- Anything that prints secrets: `env`, `printenv`, credential helpers.

## Pair with deny rules

`Bash(cat:*)` and the other read entries can read any file, including secrets. Add matching entries to `permissions.deny` so secret files stay blocked:

```
Read(./.env) Read(./.env.*) Read(./secrets/**)
```
