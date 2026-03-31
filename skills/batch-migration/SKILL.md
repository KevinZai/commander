---
name: batch-migration
description: |
  /batch recipes for large-scale code changes across many files. Patterns for
  CJS-to-ESM migration, React class-to-hooks, multi-file refactoring, dependency
  upgrades, API schema changes, and linter rule enforcement. Includes agent
  distribution, conflict resolution, and per-batch verification.
triggers:
  - /batch-migration
  - batch migrate
  - large scale refactor
  - multi-file migration
  - code migration
  - codemod
disable-model-invocation: true
---

# Batch Migration

Recipes for large-scale code changes that touch tens or hundreds of files. Each recipe distributes work across agents, handles conflicts, and verifies changes after each batch.

## How /batch Works

```bash
/batch <recipe> [options]        # Run a batch migration
/batch cjs-to-esm --dry-run     # Preview changes without writing
/batch status                    # Check running batch progress
/batch rollback                  # Revert last batch (via git)
```

## Architecture

```
  /batch recipe
       |
       v
  Discovery Phase
  (find all files to change)
       |
       v
  Plan Phase
  (group into batches of 10-20 files)
       |
       v
  Execute Phase -----> Agent 1: Batch 1 (files 1-15)
       |          +--> Agent 2: Batch 2 (files 16-30)
       |          +--> Agent 3: Batch 3 (files 31-45)
       |
       v
  Verify Phase
  (typecheck, lint, test per batch)
       |
       v
  Commit Phase
  (one commit per batch or squash all)
```

## Safety: The Batch Contract

Every batch migration follows these rules:

1. **Discovery before execution** -- always know the full scope first
2. **Dry run first** -- preview every change before writing
3. **Batch size limit** -- max 20 files per batch (prevents context overflow)
4. **Verify after each batch** -- typecheck + lint + test
5. **Rollback ready** -- each batch is a separate commit (easy to revert)
6. **Conflict resolution** -- stop on conflict, don't guess

---

## Recipe 1: CJS to ESM

Convert CommonJS `require()` / `module.exports` to ES module `import` / `export`.

### Command

```bash
/batch cjs-to-esm
/batch cjs-to-esm --dry-run           # Preview only
/batch cjs-to-esm --dir src/          # Limit scope
```

### Discovery

```
Find all .js/.ts files containing:
  - require('...')
  - module.exports
  - exports.something
```

### Transforms

| From | To |
|---|---|
| `const x = require('x')` | `import x from 'x'` |
| `const { a, b } = require('x')` | `import { a, b } from 'x'` |
| `module.exports = X` | `export default X` |
| `module.exports = { a, b }` | `export { a, b }` |
| `exports.a = X` | `export const a = X` |
| `require.resolve('x')` | `import.meta.resolve('x')` |
| `__dirname` | `import.meta.dirname` (Node 21+) or `dirname(fileURLToPath(import.meta.url))` |
| `__filename` | `import.meta.filename` (Node 21+) or `fileURLToPath(import.meta.url)` |

### Post-Migration

- Update `package.json`: add `"type": "module"`
- Update `tsconfig.json`: set `"module": "ESNext"`, `"moduleResolution": "bundler"`
- Fix dynamic imports: `require(var)` becomes `await import(var)`

### Verification

```
Per batch:
  1. npx tsc --noEmit (typecheck)
  2. npm run lint (lint)
  3. npm test (tests)
```

---

## Recipe 2: React Class to Hooks

Convert React class components to function components with hooks.

### Command

```bash
/batch class-to-hooks
/batch class-to-hooks --dir src/components/
```

### Discovery

```
Find all .tsx/.jsx files containing:
  - extends React.Component
  - extends Component
  - class.*extends.*PureComponent
```

### Transforms

| From | To |
|---|---|
| `class X extends Component` | `function X(props)` / `const X: FC<Props> =` |
| `this.state = { ... }` | `const [x, setX] = useState(...)` |
| `this.setState({ x })` | `setX(x)` |
| `componentDidMount()` | `useEffect(() => { ... }, [])` |
| `componentDidUpdate(prevProps)` | `useEffect(() => { ... }, [deps])` |
| `componentWillUnmount()` | `useEffect(() => { return () => cleanup }, [])` |
| `this.props.x` | `props.x` (or destructured) |
| `this.handleClick = this.handleClick.bind(this)` | Remove (arrow functions) |
| `static defaultProps` | Default parameter values |
| `shouldComponentUpdate` | `React.memo()` wrapper |

### Edge Cases (Human Gate)

These require manual review and are flagged, not auto-converted:
- Components using `getSnapshotBeforeUpdate`
- Components using `componentDidCatch` / error boundaries
- Components with complex `this` references beyond props/state
- Higher-order components wrapping class components

### Verification

```
Per batch:
  1. npx tsc --noEmit
  2. npm run lint
  3. npm test (especially component tests)
  4. Visual verify (if available) for UI components
```

---

## Recipe 3: Multi-File Rename

Rename a symbol (function, class, type, variable) across the entire codebase.

### Command

```bash
/batch rename --from "UserProfile" --to "AccountProfile"
/batch rename --from "getUserData" --to "fetchUserProfile" --dir src/
```

### Discovery

```
Find all files containing the symbol:
  - Import statements
  - Export statements
  - Usage in code
  - Type references
  - JSDoc comments
  - Test files
  - Documentation
```

### Transforms

- Rename in import/export statements
- Rename in usage sites
- Rename in type annotations
- Rename in string literals (only if clearly a reference, e.g., route paths)
- Rename corresponding test files (e.g., `UserProfile.test.tsx` to `AccountProfile.test.tsx`)
- Rename file if it matches the symbol name

### Conflict Resolution

If the new name already exists in a file's scope:
1. Stop the batch
2. Report the conflict with file path and line number
3. Wait for human decision

---

## Recipe 4: Dependency Upgrade (Major Version)

Upgrade a dependency across a monorepo with breaking changes.

### Command

```bash
/batch upgrade react@19
/batch upgrade next@15 --packages "apps/*"
```

### Steps

1. **Discovery**: Find all `package.json` files referencing the dependency
2. **Changelog review**: Read the upgrade guide / migration docs
3. **Update versions**: Bump version in all package.json files
4. **Install**: Run install in each package
5. **Apply codemods**: Run official codemods if available (e.g., `npx @next/codemod`)
6. **Fix breaking changes**: Apply transforms from changelog
7. **Verify**: Typecheck, lint, test per package

### Example: React 18 to 19

```
Batch 1: Update package.json files (all packages)
Batch 2: Run react-codemod (automated transforms)
Batch 3: Fix remaining type errors (manual transforms)
Batch 4: Update test utilities (testing-library)
Batch 5: Verify all packages build and test
```

---

## Recipe 5: API Schema Change

Update all consumers when an API response shape changes.

### Command

```bash
/batch api-schema --schema api/schema.ts --change "User.name -> User.displayName"
```

### Steps

1. **Discovery**: Find all files that reference the changed field
2. **Type update**: Update the schema/type definition
3. **Server update**: Update API handlers that produce the field
4. **Client update**: Update all consumers that read the field
5. **Test update**: Update fixtures, mocks, and assertions
6. **Migration**: Generate database migration if field is persisted

### Conflict Resolution

For ambiguous references (e.g., `name` is too generic):
- Use type-aware search (follow imports from the schema type)
- Flag ambiguous matches for human review
- Never rename unrelated `name` fields

---

## Recipe 6: Linter Rule Enforcement

Apply a new lint rule across the entire codebase.

### Command

```bash
/batch lint-enforce --rule "no-explicit-any"
/batch lint-enforce --rule "prefer-const" --autofix
```

### Steps

1. **Enable rule**: Add rule to `.eslintrc` / `eslint.config.js`
2. **Discovery**: Run linter to find all violations
3. **Autofix round**: Apply `--fix` for auto-fixable violations
4. **Manual round**: Fix remaining violations in batches
5. **Verify**: Run linter (zero violations), then run tests

### Common Enforcement Patterns

| Rule | Auto-Fix Rate | Manual Work |
|---|---|---|
| `prefer-const` | 100% | None |
| `no-var` | 100% | None |
| `no-explicit-any` | 0% | Type every `any` |
| `strict-boolean-expressions` | 50% | Fix truthy checks |
| `no-floating-promises` | 0% | Add await or void |
| `consistent-type-imports` | 90% | Fix edge cases |

---

## Batch Execution Strategy

### Parallel Agents

For independent files (no cross-file dependencies):

```
Agent 1: files 1-15   → verify → commit
Agent 2: files 16-30  → verify → commit
Agent 3: files 31-45  → verify → commit
```

### Sequential Batches

For dependent changes (types used by other files):

```
Batch 1: Update type definitions → verify → commit
Batch 2: Update implementations → verify → commit
Batch 3: Update tests → verify → commit
Batch 4: Update documentation → verify → commit
```

### Conflict Resolution

If two agents modify the same file:
1. Both agents stop
2. Merge the changes manually (or let the second agent rebase)
3. Verify the merged result
4. Resume

## Checkpoint Schema

```json
{
  "task": "batch-migration",
  "recipe": "cjs-to-esm",
  "status": "in-progress",
  "discovery": {
    "totalFiles": 87,
    "batches": 6,
    "filesPerBatch": 15
  },
  "progress": {
    "completedBatches": 3,
    "completedFiles": 45,
    "failedFiles": 2,
    "skippedFiles": 1
  },
  "verification": {
    "typecheck": "passing",
    "lint": "3 warnings",
    "tests": "142/142 passing"
  },
  "errors": [
    { "file": "src/legacy/parser.js", "error": "Dynamic require with variable path" },
    { "file": "src/plugins/loader.js", "error": "Circular dependency detected" }
  ]
}
```

## Anti-Patterns

- Never batch-migrate without a dry run first
- Never modify more than 20 files in a single agent context (context overflow)
- Never skip verification between batches (one bad batch cascades)
- Never force-push batch migration commits (makes rollback impossible)
- Never auto-resolve merge conflicts in batch mode (always stop and report)
