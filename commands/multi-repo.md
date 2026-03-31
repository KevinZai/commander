---
description: Orchestrate code changes across multiple repositories simultaneously using --add-dir.
---

# Multi-Repo

Make coordinated changes across multiple repositories in a single Claude Code session. Perfect for API contract changes, shared library updates, and cross-service refactoring.

## Usage

```bash
/multi-repo                                    # Interactive setup
/multi-repo add ~/projects/other-repo          # Add a repo to current session
/multi-repo status                             # Show all repos in session
```

## Quick Start

### From the CLI

```bash
# Primary repo + additional repos
cd ~/projects/api-server
claude --add-dir ~/projects/web-client --add-dir ~/projects/mobile-app

# Short form
claude -a ~/projects/web-client -a ~/projects/mobile-app
```

### From Within a Session

```
/multi-repo add ~/projects/web-client
# Added ~/projects/web-client to session.
# You can now read, edit, and run commands in both repos.

/multi-repo add ~/projects/mobile-app
# Added ~/projects/mobile-app to session.
# 3 repos active: api-server, web-client, mobile-app
```

### Check Status

```
/multi-repo status

Active repositories:
  1. ~/projects/api-server     (primary)  branch: main     clean
  2. ~/projects/web-client     (added)    branch: main     clean
  3. ~/projects/mobile-app     (added)    branch: main     clean
```

## Common Workflows

### API Contract Change

When you modify an API endpoint and need all clients to update:

```
I'm adding a `displayName` field to the User API response and
deprecating the `name` field.

Update all three repos:
1. api-server: schema, handler, validation, tests
2. web-client: types, API client, all components using `name`
3. mobile-app: types, API service, all screens using `name`

Create a feature branch in each repo. All repos must typecheck and pass tests.
```

### Shared Type Library Update

When your shared types package gets a breaking change:

```
I'm updating @company/shared-types to v3.0.

Changes:
- UserId is now a branded type (not just string)
- Date fields use Temporal instead of Date

Update all consuming repos to work with the new types.
Run typecheck and tests in each repo.
```

### Cross-Service Feature

Implement a feature that spans backend and frontend:

```
Add real-time notifications:

1. api-server: WebSocket endpoint at /ws/notifications, notification model
2. web-client: WebSocket client hook, notification bell component, toast system
3. shared-types: NotificationEvent type definition

All repos should reference the shared types.
```

## --add-dir Details

### What Claude Code Can Do in Added Repos

| Action | Supported |
|---|---|
| Read files | Yes |
| Edit files | Yes |
| Create files | Yes |
| Run shell commands | Yes (in that repo's directory) |
| Git operations | Yes (each repo has its own git) |
| Install dependencies | Yes |
| Run tests | Yes |

### What --add-dir Does NOT Do

- Does not merge git histories
- Does not create symbolic links
- Does not share node_modules
- Does not modify the other repo's `.claude/settings.json`

### Path References

When working across repos, use absolute paths or repo-relative paths:

```
# Absolute (always works)
Read ~/projects/web-client/src/types.ts

# Relative to the added directory
In web-client, read src/types.ts
```

## Branch Strategy

### Consistent Naming

Use the same branch name across all repos:

```
All repos: feat/add-notifications

api-server:  git checkout -b feat/add-notifications
web-client:  git checkout -b feat/add-notifications
mobile-app:  git checkout -b feat/add-notifications
```

### Commit Messages

Cross-reference repos in commit messages:

```
feat(api): add notification WebSocket endpoint

Part of: feat/add-notifications
Related: web-client@feat/add-notifications, mobile-app@feat/add-notifications
```

### PR Strategy

Create linked PRs:

```
# In api-server
gh pr create --title "feat(api): notification endpoint" \
  --body "Part of notification feature. Related PRs:
  - web-client: [link]
  - mobile-app: [link]"
```

### Merge Order

For dependent changes, merge in dependency order:

```
1. shared-types (no deps)     → merge and publish
2. api-server (depends on types) → merge and deploy
3. web-client (depends on API)   → merge and deploy
4. mobile-app (depends on API)   → merge and release
```

## Verification

After making cross-repo changes:

```
/multi-repo verify

Verifying all repositories...

api-server:
  TypeScript: PASS
  Lint: PASS
  Tests: 89/89 PASS
  Build: PASS

web-client:
  TypeScript: PASS
  Lint: PASS (2 warnings)
  Tests: 142/142 PASS
  Build: PASS

mobile-app:
  TypeScript: PASS
  Lint: PASS
  Tests: 67/67 PASS
  Build: PASS

All repos verified.
```

## Limitations

| Constraint | Value |
|---|---|
| Max repos per session | 5 (context limit) |
| Repo size | Each repo adds to context; keep repos focused |
| Disk space | Each repo's full working tree is accessible |
| Git independence | Each repo has its own git; no cross-repo commits |
| Permissions | You need read/write access to all repos |

## Tips

- Start with the repo that has the most foundational changes (types, schemas, API)
- Use `--add-dir` for reference-only repos too (add a repo just to read its types)
- Keep cross-repo PRs small and atomic -- one logical change per PR set
- Run verification in each repo independently before merging
- Document the merge order in the first PR's description
- Use `/multi-repo status` frequently to track which repos have uncommitted changes
