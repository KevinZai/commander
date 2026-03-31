---
name: multi-repo-orchestrate
description: |
  Cross-repo changes using Claude Code's --add-dir flag. Orchestrate changes across
  2+ repos simultaneously for shared dependency updates, API contract changes, and
  monorepo migration. Includes branch management, conflict resolution, and commit
  strategy across repositories.
triggers:
  - /multi-repo
  - cross repo
  - multiple repos
  - add dir
  - multi repository
  - cross repository changes
disable-model-invocation: true
---

# Multi-Repo Orchestrate

Coordinate changes across multiple repositories in a single Claude Code session using `--add-dir`. When you need to update an API server and its client library simultaneously, upgrade a shared dependency across a monorepo of repos, or migrate from multi-repo to monorepo.

## How --add-dir Works

```bash
# Add additional directories to Claude Code's context
claude --add-dir /path/to/other-repo

# Multiple repos
claude --add-dir /path/to/api-server --add-dir /path/to/client-sdk

# Short form
claude -a /path/to/repo-b -a /path/to/repo-c
```

Claude Code can read, edit, and run commands in all added directories as if they were part of the same project.

## Core Patterns

### Pattern 1: API Contract Change

Update a server API and all client consumers simultaneously.

```bash
# Start in the API server repo
cd ~/projects/api-server
claude --add-dir ~/projects/web-client --add-dir ~/projects/mobile-client
```

#### Workflow

```
1. Modify API schema in api-server/
   (new endpoint, changed response shape, deprecated field)
        |
        v
2. Update server implementation
   (handler, validation, tests)
        |
        v
3. Update web-client/
   (API client, types, components, tests)
        |
        v
4. Update mobile-client/
   (API client, types, screens, tests)
        |
        v
5. Verify all repos build and test
        |
        v
6. Commit in each repo with cross-reference
```

#### Example Prompt

```
I'm changing the /api/users endpoint to include a `displayName` field
and deprecate the `name` field.

1. In api-server: update the schema, handler, and tests
2. In web-client: update the API client type and all components using `name`
3. In mobile-client: update the API type and all screens using `name`
4. All repos should typecheck and tests should pass
```

#### Commit Strategy

```bash
# In api-server/
git commit -m "feat(api): add displayName field, deprecate name

See: web-client#branch-name, mobile-client#branch-name"

# In web-client/
git commit -m "refactor: migrate from user.name to user.displayName

Follows: api-server@abc1234"

# In mobile-client/
git commit -m "refactor: migrate from user.name to user.displayName

Follows: api-server@abc1234"
```

---

### Pattern 2: Shared Dependency Update

Upgrade a shared library across all consuming repos.

```bash
cd ~/projects/shared-ui
claude --add-dir ~/projects/app-a --add-dir ~/projects/app-b --add-dir ~/projects/app-c
```

#### Workflow

```
1. Update shared-ui/ (the library)
   - Bump version
   - Make breaking changes
   - Update exports
   - Write migration guide
        |
        v
2. Update app-a/ (first consumer)
   - Bump dependency version
   - Apply migration guide changes
   - Fix type errors
   - Update tests
        |
        v
3. Update app-b/ (second consumer)
   - Same as app-a
        |
        v
4. Update app-c/ (third consumer)
   - Same as app-a
        |
        v
5. Verify all repos
        |
        v
6. Publish shared-ui, then update lock files in consumers
```

---

### Pattern 3: Monorepo Migration

Move from multi-repo to monorepo structure.

```bash
cd ~/projects/new-monorepo
claude --add-dir ~/projects/repo-a --add-dir ~/projects/repo-b --add-dir ~/projects/repo-c
```

#### Workflow

```
1. Set up monorepo structure in new-monorepo/
   - packages/ directory
   - Root package.json with workspaces
   - Shared tsconfig, eslint, prettier configs
        |
        v
2. Copy repo-a/ → new-monorepo/packages/repo-a/
   - Preserve git history (optional: git subtree)
   - Update import paths
   - Point to workspace dependencies
        |
        v
3. Copy repo-b/ → new-monorepo/packages/repo-b/
   - Same as repo-a
   - Fix cross-package imports (now workspace refs)
        |
        v
4. Copy repo-c/ → new-monorepo/packages/repo-c/
   - Same as above
        |
        v
5. Deduplicate shared configs
   - One tsconfig.base.json
   - One .eslintrc at root
   - Shared scripts in root package.json
        |
        v
6. Verify: build all packages, run all tests
```

---

### Pattern 4: Coordinated Feature

Implement a feature that spans multiple repos.

```bash
cd ~/projects/backend
claude --add-dir ~/projects/frontend --add-dir ~/projects/shared-types
```

#### Example: Add Real-Time Notifications

```
Implement real-time notifications across the stack:

1. In shared-types/: Define NotificationEvent type and WebSocket message schema
2. In backend/: Add WebSocket endpoint, notification service, database table
3. In frontend/: Add WebSocket client, notification bell component, toast system
4. All repos use the shared type definitions
5. Write integration test that sends notification from backend and verifies in frontend
```

---

## Branch Management

### Consistent Branch Names

Use the same branch name across repos for traceability:

```bash
# All repos get the same branch
Branch: feat/add-display-name

# In each repo:
git checkout -b feat/add-display-name
```

### Coordinated PRs

Create PRs in each repo that reference each other:

```bash
# In api-server
gh pr create --title "feat(api): add displayName field" \
  --body "Part of multi-repo change. See also:
  - web-client: [PR link]
  - mobile-client: [PR link]"
```

### Merge Order

For dependent changes, merge in dependency order:

```
1. shared-types/ (no dependencies)     → merge first
2. api-server/ (depends on types)      → merge second
3. web-client/ (depends on API + types) → merge third
4. mobile-client/ (depends on API)      → merge last
```

## Conflict Resolution

### Same File in Multiple Repos

Rare but possible with shared config files:

```
If .eslintrc exists in both repos and both need changes:
  1. Make changes in repo A
  2. Make changes in repo B
  3. No conflict (different files in different repos)
```

### Dependency Version Conflicts

```
If repo-a needs library@2.0 but repo-b needs library@1.0:
  1. Check if library@2.0 is backward-compatible
  2. If yes: upgrade both
  3. If no: update repo-b first to support both, then upgrade
  4. If impossible: flag for human review
```

### Import Path Conflicts

After monorepo migration, import paths change:

```
Before: import { Button } from '@company/ui'  (npm package)
After:  import { Button } from '@company/ui'  (workspace package)

Resolution: Update all tsconfig paths to point to workspace packages
```

## Verification

After multi-repo changes, verify each repo independently:

```bash
# For each repo:
cd /path/to/repo
npm install          # Update lock file
npx tsc --noEmit     # Typecheck
npm run lint         # Lint
npm test             # Tests
npm run build        # Build
```

Then verify cross-repo integration:

```bash
# Start API server
cd api-server && npm run dev &

# Run client against live API
cd web-client && npm run test:integration
```

## Safety Guards

| Guard | Value |
|---|---|
| Max repos per session | 5 (context limit) |
| Branch policy | Always create feature branch, never commit to main |
| Commit policy | One commit per repo per logical change |
| Push policy | Push all repos before creating any PRs |
| Rollback | Revert branches in reverse merge order |
| Human gate | Merge order requires human confirmation |

## Configuration

Create `.multi-repo.json` in the primary repo:

```json
{
  "repos": [
    { "path": "~/projects/api-server", "role": "primary" },
    { "path": "~/projects/web-client", "role": "consumer" },
    { "path": "~/projects/mobile-client", "role": "consumer" }
  ],
  "branchPrefix": "feat/",
  "mergeOrder": ["api-server", "web-client", "mobile-client"],
  "verifyCommand": {
    "api-server": "npm test && npm run build",
    "web-client": "npm test && npm run build",
    "mobile-client": "npm test"
  }
}
```

## Tips

- Start with the repo that has the most foundational changes (types, schemas)
- Use `--add-dir` for read access to reference repos even if you only modify one
- Keep cross-repo PRs small and focused -- one logical change per PR set
- Always include cross-references in commit messages and PR descriptions
- Test the integration between repos, not just each repo in isolation
